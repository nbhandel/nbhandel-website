#!/usr/bin/env python3
"""ONE-TIME: freeze the existing public NBHandel website as GitHub-owned files.

Read-only network access to the current public website and its own Webflow CDN.
No account credentials, Tradedoubler access, tracking, affiliate links or writes to production.
This script is NOT part of the production deployment workflow.
"""
from __future__ import annotations

import concurrent.futures
import base64
import hashlib
import html
import json
import os
from pathlib import Path
import re
import shutil
import sys
import time
from urllib.parse import urljoin, urlsplit, unquote
from urllib.request import Request, urlopen
from xml.etree import ElementTree

ORIGIN = "https://nbhandel.de"
CDN = "https://cdn.prod.website-files.com/"
OUT = Path("site")
TOKEN = re.compile(r'https://cdn\.prod\.website-files\.com/[^\s"\'<>),]+', re.I)
CSS_URL = re.compile(r'url\(\s*[\'"]?([^\'")]+)', re.I)
AGENT = "NBHandel-Public-Site-Migration/1.0"
MAX_FILE_BYTES = 32 * 1024 * 1024
MAX_TOTAL_BYTES = 200 * 1024 * 1024


def fetch(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": AGENT, "Accept": "*/*"})
    with urlopen(request, timeout=55) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status}: {url}")
        content = response.read(MAX_FILE_BYTES + 1)
        if len(content) > MAX_FILE_BYTES:
            raise RuntimeError(f"File exceeds cap: {url}")
        return content


def routes_from_sitemap() -> list[str]:
    """Use actual PUBLIC published paths, not a possibly stale deployment list."""
    sitemap = ElementTree.fromstring(fetch(ORIGIN + "/sitemap.xml"))
    paths = []
    for element in sitemap.iter():
        if not element.tag.endswith("loc") or not element.text:
            continue
        parsed = urlsplit(element.text.strip())
        if parsed.scheme != "https" or parsed.netloc != "nbhandel.de":
            raise RuntimeError("Unexpected host in sitemap")
        route = parsed.path.strip("/")
        if not re.fullmatch(r"[a-z0-9-]*", route):
            raise RuntimeError("Unexpected route path in sitemap: " + route)
        paths.append(route)
    if len(paths) < 58 or "" not in paths or len(set(paths)) != len(paths):
        raise RuntimeError(f"Incomplete published sitemap: {len(paths)}")
    return paths


def safe_local_asset_path(url: str) -> Path:
    split = urlsplit(url)
    if split.scheme != "https" or split.netloc != "cdn.prod.website-files.com":
        raise RuntimeError("Invalid CDN host")
    path = unquote(split.path).lstrip("/")
    parts = Path(path).parts
    if not parts or ".." in parts or any(part in (".", "") for part in parts):
        raise RuntimeError("Unsafe CDN path")
    return OUT / "vendor" / "webflow" / Path(*parts)


def cdn_urls(text: str) -> set[str]:
    result = set()
    for raw in TOKEN.findall(html.unescape(text)):
        candidate = raw.rstrip(";").rstrip("\\")
        split = urlsplit(candidate)
        if split.netloc == "cdn.prod.website-files.com":
            result.add(CDN + split.path.lstrip("/"))
    return result


def rewrite_owned_urls(text: str) -> str:
    return text.replace(CDN, "/vendor/webflow/").replace("//cdn.prod.website-files.com/", "/vendor/webflow/")


def save(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)



def refresh_integrity_tags() -> int:
    """After mirroring and rewriting local CSS/JS, recompute SRI for each local file."""
    tag_re = re.compile(r'<(?:link|script)\b[^>]*>', re.I | re.S)
    location_re = re.compile(r'\b(?:src|href)=(["\'])(/vendor/webflow/[^"\']+)\1', re.I)
    integrity_re = re.compile(r'\bintegrity=(["\'])(sha(?:256|384|512)-[^"\']+)\1', re.I)
    replaced = 0
    for page in OUT.glob("*.html"):
        html_content = page.read_text(encoding="utf-8")
        def patch(match):
            nonlocal replaced
            tag = match.group(0)
            loc = location_re.search(tag)
            integ = integrity_re.search(tag)
            if not loc or not integ:
                return tag
            asset = OUT / unquote(urlsplit(loc.group(2)).path.lstrip("/"))
            if not asset.is_file():
                raise RuntimeError(f"SRI target missing: {asset}")
            algorithm = integ.group(2).split("-")[0].lower()
            digest = base64.b64encode(hashlib.new(algorithm, asset.read_bytes()).digest()).decode("ascii")
            new_integrity = algorithm + "-" + digest
            replaced += 1
            return tag[:integ.start(2)] + new_integrity + tag[integ.end(2):]
        patched = tag_re.sub(patch, html_content)
        page.write_text(patched, encoding="utf-8")
    return replaced


def main() -> None:
    routes = routes_from_sitemap()
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    # Use the existing publicly served version as the authoritative baseline.
    # Webflow is not contacted for HTML and will not be used by future deployments.
    def one_route(route: str):
        address = ORIGIN + ("/" + route if route else "/")
        content = fetch(address)
        txt = content.decode("utf-8")
        if "<html" not in txt.lower() or "<head" not in txt.lower():
            raise RuntimeError(f"Not HTML: {address}")
        if '404' in re.search(r"<title[^>]*>(.*?)</title>", txt, re.I | re.S).group(1):
            raise RuntimeError(f"Unexpected 404: {address}")
        dest = OUT / ("index.html" if not route else route + ".html")
        save(dest, rewrite_owned_urls(txt).encode("utf-8"))
        return (route, len(content), cdn_urls(txt))

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        pages = list(pool.map(one_route, routes))
    discovered = set()
    for _, _, links in pages:
        discovered.update(links)

    # Additional public support files needed for the existing site.
    static_paths = [
        "favicon.ico", "favicon-32.png", "favicon-48.png",
        "favicon-192.png", "favicon-512.png",
        "apple-touch-icon.png", "apple-touch-icon-precomposed.png",
        "robots.txt", "sitemap.xml",
    ]
    for path in static_paths:
        save(OUT / path, fetch(ORIGIN + "/" + path))
    save(OUT / "CNAME", b"nbhandel.de\n")
    save(OUT / ".nojekyll", b"")
    save(OUT / ".well-known" / "security.txt", fetch(ORIGIN + "/.well-known/security.txt"))

    def one_asset(url: str):
        binary = fetch(url)
        dest = safe_local_asset_path(url)
        if dest.suffix.lower() in (".css", ".js", ".svg"):
            try:
                source = binary.decode("utf-8")
            except UnicodeDecodeError:
                source = ""
            if source:
                if dest.suffix.lower() == ".css":
                    # Resolve relative CSS font/image URLs against their original CDN URL.
                    for source_url in CSS_URL.findall(source):
                        address = urljoin(url, html.unescape(source_url).strip())
                        if urlsplit(address).netloc == "cdn.prod.website-files.com":
                            discovered.add(CDN + urlsplit(address).path.lstrip("/"))
                binary = rewrite_owned_urls(source).encode("utf-8")
        save(dest, binary)
        return (url, len(binary))

    completed = set()
    asset_sizes = {}
    while discovered - completed:
        todo = sorted(discovered - completed)
        if len(todo) > 1300:
            raise RuntimeError("Too many assets discovered")
        # Thread workers only use reads/fetches; paths are independent after dedupe.
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            for url, size in pool.map(one_asset, todo):
                completed.add(url)
                asset_sizes[url] = size
        if sum(asset_sizes.values()) > MAX_TOTAL_BYTES:
            raise RuntimeError("Asset total exceeds cap")

    sri_updated = refresh_integrity_tags()
    if sri_updated < len(routes):
        raise RuntimeError(f"Unexpectedly few local stylesheet SRI tags: {sri_updated}")

    # Ensure that every owned-CDN URL rewritten in source points to a real file.
    missing = []
    owned_refs = 0
    for file in OUT.rglob("*"):
        if file.suffix.lower() not in (".html", ".css", ".js") or not file.is_file():
            continue
        body = file.read_text(encoding="utf-8")
        for urlpath in set(re.findall(r'/vendor/webflow/[^\s"\'<>),]+', body)):
            rel = urlpath.split("?")[0].split("#")[0].rstrip(chr(92))
            owned_refs += 1
            decoded = unquote(rel.lstrip("/"))
            if not (OUT / decoded).is_file():
                missing.append((str(file), rel))
    if missing:
        print("UNRESOLVED_ASSETS", missing[:15], file=sys.stderr)
        raise RuntimeError(f"{len(missing)} unresolved local CDN URLs")

    source_files = sorted(p for p in OUT.rglob("*") if p.is_file())
    manifest = {
        "migration": "NBHandel GitHub-owned public site baseline",
        "source": ORIGIN,
        "route_count": len(routes),
        "route_names": routes,
        "external_cdn_assets_mirrored": len(asset_sizes),
        "files": len(source_files),
        "bytes": sum(p.stat().st_size for p in source_files),
        "owned_asset_reference_checks": owned_refs,
        "local_subresource_integrity_tags_recomputed": sri_updated,
        "verified_no_broken_owned_assets": True,
        "index_sha256": hashlib.sha256((OUT / "index.html").read_bytes()).hexdigest(),
        "index_note": "Webflow-origin design frozen from existing PUBLIC nbhandel.de; no website redesign",
        "data_note": "No supplier feed, advertiser API data, credentials or tracking enabled",
        "dependency_note": "Some existing third-party scripts, fonts, media and product images remain externally loaded and require separate review",
    }
    save(Path("docs") / "github-live-source-manifest.json", (json.dumps(manifest, ensure_ascii=False, indent=2)+"\n").encode("utf-8"))
    print("SNAPSHOT_PASS " + json.dumps({k:v for k,v in manifest.items() if k not in ("route_names",)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
