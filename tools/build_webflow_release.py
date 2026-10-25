#!/usr/bin/env python3
"""Prepare the EXISTING NBHandel Webflow design for free GitHub Pages hosting.

Webflow remains the visual editor and staging preview. This produces _site/
without changing the tracked site/ recovery baseline or publishing anything.
Reuse the verified 2026-10-24 asset-mirroring/SRI implementation.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from urllib.request import Request, urlopen
import hashlib
import html
import json
import re
import shutil

import import_live_snapshot as assets

ROOT = Path(__file__).resolve().parents[1]
BACKUP = ROOT / "site"
OUTPUT = ROOT / "_site"
MANIFEST = ROOT / "docs" / "github-live-source-manifest.json"
WEBFLOW = "https://nbhandel-16b9f2.webflow.io"
SITE_ID = "6abedad969a74cbc62fc1fbe"
ESSENTIAL = (
    'data-nbh-header="v60"',
    "nbh60SearchInput",
    "nbh60SearchResults",
    "nbh-tools-v44",
)
assets.OUT = OUTPUT  # existing helper functions operate ONLY on the generated copy


def get_page(route: str) -> tuple[str, str, set[str]]:
    address = WEBFLOW + ("/" + route if route else "/")
    req = Request(address, headers={"User-Agent": "NBHandel-Webflow-Release/1.0"})
    with urlopen(req, timeout=45) as response:
        data = response.read(3_000_001)
        if response.status != 200 or len(data) > 3_000_000:
            raise RuntimeError(f"Invalid Webflow response: {address}")
    source = data.decode("utf-8")
    if f'data-wf-site="{SITE_ID}"' not in source:
        raise RuntimeError(f"Unexpected Webflow site: {address}")
    if "<head" not in source.lower() or "<body" not in source.lower():
        raise RuntimeError(f"Invalid HTML structure: {address}")

    name = "index.html" if not route else route + ".html"
    previous = (BACKUP / name).read_text(encoding="utf-8")
    for marker in ESSENTIAL:
        if marker in previous and marker not in source:
            raise RuntimeError(f"Existing feature removed from {name}: {marker}")

    found_assets = assets.cdn_urls(source)
    generated = source.replace(WEBFLOW, "https://nbhandel.de")
    generated = generated.replace('lang="en"', 'lang="de"')
    generated = generated.replace('data-wf-status="1"', 'data-wf-status="0"')
    generated = assets.rewrite_owned_urls(generated)

    generated = re.sub(
        r'<link\b(?=[^>]*\brel=["\']canonical["\'])[^>]*>',
        "", generated, flags=re.I,
    )
    generated = re.sub(
        r'<meta\b(?=[^>]*\bproperty=["\']og:url["\'])[^>]*>',
        "", generated, flags=re.I,
    )
    canonical = "https://nbhandel.de" + ("/" + route if route else "/")
    metadata = (
        f'<link rel="canonical" href="{canonical}">'
        f'<meta property="og:url" content="{canonical}">'
    )
    if generated.count("</head>") != 1:
        raise RuntimeError(f"Unexpected head structure: {name}")
    generated = generated.replace("</head>", metadata + "</head>", 1)
    if generated.count('rel="canonical"') != 1:
        raise RuntimeError(f"Duplicate canonical: {name}")
    if WEBFLOW in generated:
        raise RuntimeError(f"Webflow staging URL not normalized: {name}")

    (OUTPUT / name).write_text(generated, encoding="utf-8")
    return (route, generated, found_assets)


def import_new_assets(discovered: set[str]) -> int:
    """Keep existing local assets, fetch only new Webflow design resources."""
    done = set()
    new_count = 0
    while discovered - done:
        todo = sorted(discovered - done)
        if len(discovered) > 1300:
            raise RuntimeError("Unexpectedly many Webflow assets")

        def one(url: str):
            path = assets.safe_local_asset_path(url)
            if path.exists():
                return (url, None, set())
            content = assets.fetch(url)
            extras: set[str] = set()
            if path.suffix.lower() in (".css", ".js", ".svg"):
                try:
                    source = content.decode("utf-8")
                except UnicodeDecodeError:
                    source = ""
                if source:
                    if path.suffix.lower() == ".css":
                        for reference in assets.CSS_URL.findall(source):
                            absolute = urljoin(url, html.unescape(reference).strip())
                            if urlsplit(absolute).netloc == "cdn.prod.website-files.com":
                                extras.add(assets.CDN + urlsplit(absolute).path.lstrip("/"))
                    extras.update(assets.cdn_urls(source))
                    content = assets.rewrite_owned_urls(source).encode("utf-8")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            return (url, len(content), extras)

        with ThreadPoolExecutor(max_workers=6) as pool:
            for url, size, extras in pool.map(one, todo):
                if size is not None:
                    new_count += 1
                done.add(url)
                discovered.update(extras)
    return new_count


def verify_owned_assets() -> int:
    seen = 0
    for path in OUTPUT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in (".html", ".css", ".js"):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for reference in set(re.findall(r'/vendor/webflow/[^\s"\'<>),]+', text)):
            cleaned = reference.split("?")[0].split("#")[0].rstrip("\\")
            target = OUTPUT / unquote(cleaned.lstrip("/"))
            if not target.is_file():
                raise RuntimeError(f"Missing Webflow asset: {path.name} → {cleaned}")
            seen += 1
    return seen


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    routes = manifest["route_names"]
    if len(routes) != 58 or len(set(routes)) != 58 or "" not in routes:
        raise RuntimeError("58 approved website paths required")
    if not BACKUP.is_dir():
        raise RuntimeError("GitHub production recovery baseline missing")
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    shutil.copytree(BACKUP, OUTPUT)

    with ThreadPoolExecutor(max_workers=6) as pool:
        pages = list(pool.map(get_page, routes))

    found = set()
    for _, _, urls in pages:
        found.update(urls)
    added = import_new_assets(found)
    integrity = assets.refresh_integrity_tags()
    if integrity < len(routes):
        raise RuntimeError("Too few Webflow asset integrity tags")
    references = verify_owned_assets()

    print(json.dumps({
        "result": "PREPARED_NOT_PUBLISHED",
        "webflow_pages": len(pages),
        "assets_added": added,
        "integrity_tags_verified": integrity,
        "owned_asset_references_verified": references,
        "backup_source_unchanged": True,
        "staging_url": WEBFLOW,
        "out": "_site/",
        "index_sha256": hashlib.sha256((OUTPUT/"index.html").read_bytes()).hexdigest(),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
