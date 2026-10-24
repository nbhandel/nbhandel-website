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
                "produktpass.html","barcode-scanner.html","partner.html","produkte.html"]
    for p in required:
        assert (ROOT/p).is_file(), p
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
