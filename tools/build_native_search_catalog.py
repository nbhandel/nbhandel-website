#!/usr/bin/env python3
"""Extract the EXACT 24 existing NBHandel example products, without their historical prices.

No vendor-site access, no scraping, no credentials and no new outside images.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
HOME = ROOT / 'site' / 'index.html'
OUTPUT = ROOT / 'site' / 'data' / 'search' / 'original-products.v1.json'
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
CATEGORY_ROUTES = {
    'Technik & Elektronik':'/produkte-technik-elektronik',
    'Haushalt & Wohnen':'/produkte-haushalt-wohnen',
    'Beauty & Pflege':'/produkte-beauty-pflege',
    'Sport & Freizeit':'/produkte-sport-freizeit',
    'Sammeln & Hobby':'/produkte-sammeln-hobby',
    'Büro & Papier':'/produkte-buero-papier',
    'Tierbedarf':'/produkte-tierbedarf',
}
def main():
    html = HOME.read_text(encoding='utf-8')
    match = re.search(
        r'<script id="nbh-home-v32">\s*\(function\(\)\{\s*const PRODUCTS=(\[.*?\]);',
        html, re.S)
    if not match:
        raise RuntimeError('Original source products block not found')
    original = json.loads(match.group(1))
    if len(original) != 24 or set(BRANDS) != {p['slug'] for p in original}:
        raise RuntimeError('Original products have changed – manual review required')
    catalog = []
    for item in original:
        pic = item['image']
        if not pic.startswith('/vendor/webflow/') or '..' in pic or not (ROOT / 'site' / pic[1:]).is_file():
            raise RuntimeError('Existing asset missing: ' + pic)
        credit = item.get('credit', '')
        credit_url = item.get('creditUrl', '')
        if not credit or not credit_url.startswith('https://commons.wikimedia.org/wiki/File:'):
            raise RuntimeError('Original photo credit missing: ' + item['slug'])
        catalog.append({
            'id':item['slug'], 'title':item['name'], 'category':item['cat'],
            'brand':BRANDS[item['slug']], 'model':None,'mpn':None,'gtin':None,
            'variant':None,'identityStatus':'label_only',
            'categoryRoute':CATEGORY_ROUTES[item['cat']],
            'image':pic, 'imageCredit':credit,'imageCreditUrl':credit_url,
        })
    data={
        'schema':'nbh.productfinder.v1',
        'mode':'sample',
        'activation':{'offersEnabled':False},
        'approvedMerchants':{},
        'offers':[],
        'products':catalog,
        'sourceNote':'24 existing NBHandel examples. Historical prices and merchant URLs intentionally excluded.',
    }
    OUTPUT.parent.mkdir(parents=True,exist_ok=True)
    OUTPUT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('CATALOG_READY',len(catalog),'samples',len(data['offers']),'offers')

if __name__ == '__main__':
    main()
