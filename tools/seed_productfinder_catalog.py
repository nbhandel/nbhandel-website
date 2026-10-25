#!/usr/bin/env python3
"""One-time, reproducible extraction of NON-COMMERCIAL sample product labels.

Source: the 24 examples already embedded in NBHandel's own current homepage.
Retail prices, merchant links, offers, GTIN and MPN are intentionally NOT copied.\nExisting local image references and original Wikimedia photo credits are retained.
This script never requests merchant websites or APIs.
"""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HOME = ROOT / 'site' / 'index.html'
OUTPUT = ROOT / 'site' / 'data' / 'productfinder' / 'sample-catalog.v1.json'

BRANDS = {
    'airpods-pro-3':'Apple', 'switch-2':'Nintendo', 'ps5-pro':'Sony',
    'meta-quest-3-512':'Meta', 'mx-master-3s':'Logitech',
    'bose-qc-ultra-earbuds':'Bose', 'galaxy-s25-plus':'Samsung',
    'galaxy-s25-ultra':'Samsung', 'macbook-air-m4':'Apple',
    'steam-deck-oled-512':'Valve', 'dji-mini-4-pro':'DJI',
    'kindle-paperwhite-5':'Amazon', 'apple-watch-ultra-2':'Apple',
    'galaxy-watch-ultra':'Samsung', 'xbox-series-x':'Microsoft',
    'iphone-16-pro':'Apple', 'ipad-pro-m4':'Apple',
    'airpods-max':'Apple', 'dyson-v8':'Dyson', 'nivea-creme':'NIVEA',
    'adidas-stan-smith':'adidas', 'moyu-rs3m':'MoYu',
    'moleskine-pocket':'Moleskine', 'kong-classic':'KONG',
}

def build():
    legacy_manifest = ROOT / 'docs' / 'productfinder-existing-image-manifest.json'
    existing = json.loads(legacy_manifest.read_text(encoding='utf-8'))['products']
    if len(existing) != 24 or {p['slug'] for p in existing} != set(BRANDS):
        raise RuntimeError('Unexpected original catalog: manual source review needed')

    products = []
    for item in existing:
        image = item.get('image', '')
        if not image.startswith('/vendor/webflow/') or '..' in image or not (ROOT / 'site' / image.lstrip('/')).is_file():
            raise RuntimeError('Missing or unapproved existing local image: ' + str(image))
        if not item.get('credit') or not str(item.get('creditUrl','')).startswith('https://commons.wikimedia.org/wiki/'):
            raise RuntimeError('Attribution missing for existing demo image: ' + item['slug'])
        products.append({
            'id': item['slug'],
            'title': item['name'],
            'brand': BRANDS[item['slug']],
            'category': item['cat'],
            'model': None,
            'variant': None,
            'gtin': None,
            'mpn': None,
            'identityStatus': 'label_only',
            'source': 'existing_nbhandel_homepage_example',
            'image': item['image'],
            'imageCredit': item['credit'],
            'imageCreditUrl': item['creditUrl'],
        })

    dataset = {
        'schema': 'nbh.productfinder.v1',
        'mode': 'sample',
        'description': '24 vorhandene NBHandel-Beispielartikel, keine bestätigten Händlerangebote',
        'activation': {'offersEnabled': False},
        'approvedMerchants': {},
        'products': products,
        'offers': [],
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'EXTRACTED {len(products)} existing product names; 0 prices, 0 links, 0 offers, 0 identifiers.')

if __name__ == '__main__':
    build()
