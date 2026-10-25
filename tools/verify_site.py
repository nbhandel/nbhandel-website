#!/usr/bin/env python3
"""Offline release checks for GitHub-owned NBHandel static source (no live requests)."""
from __future__ import annotations

import base64
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "site")
MANIFEST = Path("docs/github-live-source-manifest.json")
TAG = re.compile(r"<(?:link|script)\b[^>]*>", re.I | re.S)
LOCATION = re.compile(r'\b(?:src|href)=(["\'])(/vendor/webflow/[^"\']+)\1', re.I)
INTEGRITY = re.compile(r'\bintegrity=(["\'])(sha(?:256|384|512)-[^"\']+)\1', re.I)
LOCAL_RES = re.compile(r'/vendor/webflow/[^\s"\'<>),]+')

def local_file(url: str) -> Path:
    path = unquote(urlsplit(url).path.lstrip("/"))
    if ".." in Path(path).parts:
        raise RuntimeError("Path traversal in site resource")
    return ROOT / path

def main() -> None:
    assert ROOT.is_dir(), f"Not found: {ROOT}"
    assert MANIFEST.is_file(), "Migration source manifest missing"
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    routes = manifest["route_names"]
    assert len(routes) >= 58 and "" in routes
    assert (ROOT / "CNAME").read_text().strip() == "nbhandel.de"
    required = ["index.html","impressum.html","datenschutz.html",
                "transparenz.html","angebotsvergleich.html",
                "produktpass.html","barcode-scanner.html","partner.html","produkte.html","produktfinder.html"]
    for p in required:
        assert (ROOT/p).is_file(), p
    finder_html = (ROOT / "produktfinder.html").read_text(encoding="utf-8")
    assert 'name="robots" content="noindex,nofollow"' in finder_html, "Productfinder must remain noindex until released"
    finder_data = json.loads((ROOT / "data/productfinder/sample-catalog.v1.json").read_text(encoding="utf-8"))
    assert finder_data["mode"] == "sample"
    assert finder_data["activation"]["offersEnabled"] is False
    assert len(finder_data["products"]) == 24 and not finder_data["offers"]
    assert all(p.get("image", "").startswith("/vendor/webflow/") for p in finder_data["products"])
    assert all(p.get("imageCreditUrl", "").startswith("https://commons.wikimedia.org/wiki/") for p in finder_data["products"])
    # The home and category landing are real semantic source files now, NOT
    # Webflow text with a newer JavaScript-built layer inserted over it.
    for route in ("index", "produkte"):
        page = (ROOT / (route + ".html")).read_text(encoding="utf-8")
        assert page.count("<main") == 1 and page.count("</main>") == 1, route
        assert '<form' in page and 'action="/produktfinder"' in page, route
        assert 'assets/productfinder/commerce-pages.css' in page, route
        assert 'nbh-desktop-v34-guard-js' not in page, route
        assert 'nbh-functions-v40-js' not in page, route
        assert 'nbh59-carousel' not in page, route
        assert 'Webflow. https://webflow.com' not in page, route
        assert not re.search(r"\d{2,5},\d{2}\s*€", page), "stale example prices in " + route
    for route in ("index", "produkte", "produktfinder"):
        page = (ROOT / (route + ".html")).read_text(encoding="utf-8")
        for ref in re.findall(r'\b(?:src|href)="([^"]+)"', page):
            if not ref.startswith("/") or ref.startswith("//"):
                continue
            short = urlsplit(ref).path.lstrip("/")
            if not short:
                continue
            path = ROOT / unquote(short)
            assert path.is_file() or (ROOT / (unquote(short) + ".html")).is_file(), f"Missing {ref} on {route}"

    media = json.loads(Path("docs/restored-existing-videos.json").read_text(encoding="utf-8"))
    assert media["schema"] == "nbh.media.story.v1"
    assert set(media["clips"]) == {"buyer", "partner", "scanner", "comparison", "tools", "method"}
    home = (ROOT / "index.html").read_text(encoding="utf-8")
    categories = (ROOT / "produkte.html").read_text(encoding="utf-8")
    assert home.count('<video class="nbl-film-video"') == 6
    assert categories.count('<video class="nbl-film-video"') == 1
    assert "/assets/productfinder/story-motion.mjs" in home
    assert "/assets/productfinder/featured-gallery.mjs" in home
    for key, clip in media["clips"].items():
        for ref, hash_key in [("src","sha256"), ("webm_src","webm_sha256"), ("poster","poster_sha256")]:
            loc = clip[ref]
            assert loc.startswith("/media/story/") and ".." not in loc
            file = ROOT / loc.lstrip("/")
            assert file.is_file(), loc
            assert hashlib.sha256(file.read_bytes()).hexdigest() == clip[hash_key], loc
        assert f'data-src="/media/story/{key}.mp4"' in home
        assert f'data-webm="/media/story/{key}.webm"' in home
    for page in (home, categories):
        assert "https://videos.pexels.com" not in page
        assert "https://www.pexels.com/download/video/" not in page

    found_assets, sri_checked = 0, 0
    for route in routes:
        filepath = ROOT / ("index.html" if not route else route + ".html")
        assert filepath.is_file() and filepath.stat().st_size > 900, str(filepath)
        content = filepath.read_text(encoding="utf-8")
        assert "<html" in content.lower(), str(filepath)
        assert 'https://nbhandel-16b9f2.webflow.io/' not in content, str(filepath)
        for path in set(LOCAL_RES.findall(content)):
            normalized = path.split("?")[0].split("#")[0].rstrip(chr(92))
            target = local_file(normalized)
            if not target.is_file():
                raise RuntimeError(f"Missing local asset {target} in {filepath}")
            found_assets += 1
        for tag in TAG.findall(content):
            url = LOCATION.search(tag)
            sri = INTEGRITY.search(tag)
            if url and sri:
                data = local_file(url.group(2)).read_bytes()
                algorithm, expected = sri.group(2).split("-", 1)
                actual = base64.b64encode(hashlib.new(algorithm, data).digest()).decode("ascii")
                if actual != expected:
                    raise RuntimeError(f"SRI mismatch: {url.group(2)} in {filepath}")
                sri_checked += 1

    assert sri_checked >= len(routes), "Missing subresource integrity checks"
    assert found_assets > 50, "Unusually few local asset checks"
    assert (ROOT/"vendor/webflow").is_dir(), "Static vendor files missing"
    assert (ROOT/"sitemap.xml").is_file()
    assert (ROOT/"robots.txt").is_file()
    assert (ROOT/".nojekyll").exists()
    print(json.dumps({"result":"PASS",
      "page_routes":len(routes),
      "file_count":len([p for p in ROOT.rglob("*") if p.is_file()]),
      "owned_asset_references_ok":found_assets,
      "subresource_integrity_checks":sri_checked,
      "canonical_domain":"nbhandel.de",
      "deploy_input":"git checkout site/ (no Webflow fetch)",
      "affiliate_tracking_added":False
    },ensure_ascii=False))

if __name__=="__main__":
    main()
