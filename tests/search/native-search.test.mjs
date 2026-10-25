import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canonicalGtin, looksLikeGtin, searchProducts, eligibleOffers, provenSameProduct} from '../../site/assets/search/finder-core.mjs';

const data=JSON.parse(fs.readFileSync(
  new URL('../../site/data/search/original-products.v1.json',import.meta.url),'utf8'));
const product={
  id:'source-sku',title:'Produkt Test mit genauer Variante',brand:'Testmarke',
  category:'Technik & Elektronik',model:'X1',mpn:'X-123',
  variant:'Graphit',gtin:'4006381333931'
};
const offer={
  id:'one',productId:'source-sku',merchantId:'seller',
  brand:'Testmarke',variant:'Graphit',mpn:'X-123',gtin:'4006381333931',
  priceCents:13900,shippingCents:400,currency:'EUR',condition:'new',
  availability:'in_stock',checkedAt:'2026-10-25T00:00:00Z',
  url:'https://shop.example/item',
  provenance:{sourceType:'official_partner_feed',rightsApproved:true}
};

test('Catalog reuses 24 original examples, excludes prices, partner links and GTIN inventions',()=>{
  assert.equal(data.schema,'nbh.productfinder.v1');
  assert.equal(data.mode,'sample');
  assert.equal(data.activation.offersEnabled,false);
  assert.equal(data.products.length,24);
  assert.equal(data.offers.length,0);
  assert.equal(new Set(data.products.map(p=>p.id)).size,24);
  for(const p of data.products){
    assert.ok(p.title&&p.brand&&p.category&&p.categoryRoute);
    assert.equal(p.gtin,null);
    assert.equal(p.mpn,null);
    assert.ok(!('price' in p) && !('sources' in p) && !('url' in p));
    assert.match(p.image,/^\/vendor\/webflow\//);
    assert.match(p.imageCreditUrl,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  }
});

test('Full-text catalog search works independently of historic price availability',()=>{
  assert.deepEqual(searchProducts(data.products,'Dyson').map(p=>p.id),['dyson-v8']);
  assert.equal(searchProducts(data.products,'AirPods').length,2);
  assert.deepEqual(searchProducts(data.products,'MoYu').map(p=>p.id),['moyu-rs3m']);
  assert.equal(searchProducts(data.products,'Dyson','Technik & Elektronik').length,0);
  assert.equal(searchProducts(data.products,'Dyson','Haushalt & Wohnen').length,1);
  assert.equal(searchProducts(data.products,'unbekannte 999').length,0);
});

test('GTIN validation is checksum-based, no fuzzy product substitution',()=>{
  assert.equal(canonicalGtin('4006381333931'),'04006381333931');
  assert.equal(canonicalGtin('4006381333932'),null);
  assert.equal(looksLikeGtin('4006381333932'),true);
  assert.equal(searchProducts(data.products,'4006381333931').length,0);
});

test('Current data can never expose any live merchant offer',()=>{
  assert.equal(eligibleOffers(data,data.products[0]).length,0);
  const spoof={...data,offers:[offer]};
  assert.equal(eligibleOffers(spoof,data.products[0]).length,0);
  assert.equal(eligibleOffers({...spoof,mode:'live'},data.products[0]).length,0);
});

test('Identity matching requires valid GTIN or full brand, MPN, variant',()=>{
  assert.equal(provenSameProduct(product,offer),true);
  assert.equal(provenSameProduct(product,{...offer,gtin:'9780306406157'}),false);
  assert.equal(provenSameProduct(product,{...offer,variant:'Silber'}),false);
  assert.equal(provenSameProduct({...product,gtin:null},{...offer,gtin:null}),true);
  assert.equal(provenSameProduct({...product,gtin:null,variant:null},{...offer,gtin:null}),false);
});

test('Original homepage composition and all product-category pages are preserved',()=>{
  const home=fs.readFileSync(new URL('../../site/index.html',import.meta.url),'utf8');
  const category=fs.readFileSync(new URL('../../site/produkte.html',import.meta.url),'utf8');
  assert.ok(home.includes('Handel.<br><em>Daten.</em><br>Entscheidungen.'));
  assert.ok(home.includes('nbh59-carousel'));
  assert.ok(home.includes('nbh34-hero'));
  assert.ok(home.includes('nbh60ProductSearch'));
  assert.ok(home.includes('/produkte?q='));
  assert.ok(home.includes("fetch('/data/search/original-products.v1.json'"));
  assert.ok(home.includes("catalogReady=false,catalogError=false"));
  assert.ok(!home.includes('Keine aktuellen Preise als Live'));

  assert.ok(home.includes('videos.pexels.com/video-files/6031880'));
  assert.ok(category.includes('nbh49-products-hero'));
  assert.ok(category.includes('nbh49-products-grid'));
  assert.ok(category.includes('nbh61Catalog'));
  assert.ok(category.includes('nbh61SearchForm'));
  assert.ok(category.includes('native-search.mjs'));
  assert.ok(!category.includes('nbl-hero'));
});
