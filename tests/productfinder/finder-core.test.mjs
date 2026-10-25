import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  canonicalGtin, looksLikeGtin, plain, searchProducts, provenSameProduct,
  eligibleOffers, safeApprovedLink, euros,
} from '../../site/assets/productfinder/finder-core.mjs';

const sample = JSON.parse(fs.readFileSync(
  new URL('../../site/data/productfinder/sample-catalog.v1.json', import.meta.url), 'utf8'));
const now = Date.parse('2026-10-24T20:00:00Z');
const product = {
  id: 'example-exact', title: 'Prüfartikel, Variante Schwarz',
  brand: 'Test Marke', category: 'Technik & Elektronik',
  model: 'Model X', variant: 'schwarz', gtin: '4006381333931', mpn: 'ABC-123',
};
function offer(overrides = {}) {
  return {
    id: 'offer-1', productId: product.id, merchantId: 'example',
    brand: product.brand, variant: product.variant, gtin: product.gtin, mpn: product.mpn,
    priceCents: 10000, shippingCents: 499, currency: 'EUR',
    condition: 'new', availability: 'in_stock',
    checkedAt: '2026-10-24T17:30:00Z',
    url: 'https://shop.example/item?source=feed',
    provenance: { sourceType: 'official_partner_feed', rightsApproved: true },
    ...overrides,
  };
}
function liveData(offers = [offer()]) {
  return {
    mode: 'live', activation: { offersEnabled: true },
    products: [product], offers,
    approvedMerchants: {
      example: {
        name: 'Freigegebener Testhändler',
        programApproved: true, feedAccessApproved: true,
        allowedHosts: ['shop.example'],
      },
    },
  };
}

test('sample data is the existing 24-product list, not invented live prices', () => {
  assert.equal(sample.schema, 'nbh.productfinder.v1');
  assert.equal(sample.mode, 'sample');
  assert.equal(sample.activation.offersEnabled, false);
  assert.equal(sample.products.length, 24);
  assert.equal(sample.offers.length, 0);
  assert.equal(new Set(sample.products.map(p => p.id)).size, 24);
  assert.ok(sample.products.every(p => p.gtin === null && p.mpn === null));
  assert.ok(sample.products.every(p => p.identityStatus === 'label_only'));
  assert.ok(sample.products.every(p => !('price' in p) && !('url' in p)));
  assert.equal(eligibleOffers(sample, sample.products[0], now).length, 0);
});

test('search finds name/brand across categories without invented matches', () => {
  assert.equal(searchProducts(sample.products, 'AirPods Pro 3')[0].id, 'airpods-pro-3');
  assert.equal(searchProducts(sample.products, 'Samsung Galaxy S25 Ultra')[0].id, 'galaxy-s25-ultra');
  assert.equal(searchProducts(sample.products, 'dyson')[0].id, 'dyson-v8');
  assert.equal(searchProducts(sample.products, 'Dyson', 'Technik & Elektronik').length, 0);
  assert.equal(searchProducts(sample.products, 'Dyson', 'Haushalt & Wohnen').length, 1);
  assert.equal(searchProducts(sample.products, 'ein Gerät das fehlt').length, 0);
  assert.ok(plain('MÖYU RS3 M').includes('moyu'));
});

test('GTIN-8/12/13/14 checksum accepts valid and rejects invalid', () => {
  assert.equal(canonicalGtin('4006381333931'), '04006381333931');
  assert.equal(canonicalGtin('4006381333932'), null);
  assert.equal(canonicalGtin('036000291452'), '00036000291452');
  assert.equal(canonicalGtin('96385074'), '00000096385074');
  assert.equal(canonicalGtin('GTIN xyz'), null);
  assert.equal(looksLikeGtin('4006381333932'), true);
  assert.equal(looksLikeGtin('AirPods'), false);
});

test('exact GTIN searches find matching product only', () => {
  const corpus = [product, { ...product, id: 'different', gtin: '9780306406157' }];
  assert.deepEqual(searchProducts(corpus, '4006381333931').map(p => p.id), ['example-exact']);
  assert.deepEqual(searchProducts(corpus, '4006381333932').map(p => p.id), []);
});

test('same product only if identifiers are proven; names are insufficient', () => {
  assert.equal(provenSameProduct(product, offer()), true);
  assert.equal(provenSameProduct(product, offer({ gtin: '9780306406157' })), false);
  assert.equal(provenSameProduct(product, offer({ gtin: null })), false);
  assert.equal(provenSameProduct(product, offer({ variant: 'weiß' })), false);
  assert.equal(provenSameProduct(product, offer({ brand: 'Anderer Hersteller' })), false);
  const noGtin = { ...product, gtin: null };
  assert.equal(provenSameProduct(noGtin, offer({ gtin: null })), true);
  assert.equal(provenSameProduct(noGtin, offer({ gtin: null, variant: null })), false);
  assert.equal(provenSameProduct(noGtin, offer({ gtin: null, mpn: 'ABC-999' })), false);
  assert.equal(provenSameProduct({ ...noGtin, mpn: null }, offer({ gtin: null })), false);
});

test('strict merchant URLs prevent unapproved hosts and unsafe schemes', () => {
  assert.equal(safeApprovedLink('https://shop.example/p?a=1', ['shop.example']), 'https://shop.example/p?a=1');
  assert.equal(safeApprovedLink('https://shop.example.evil.tld', ['shop.example']), null);
  assert.equal(safeApprovedLink('https://example/shop', ['shop.example']), null);
  assert.equal(safeApprovedLink('http://shop.example/item', ['shop.example']), null);
  assert.equal(safeApprovedLink('javascript:alert(1)', ['shop.example']), null);
  assert.equal(safeApprovedLink('https://user:pw@shop.example/item', ['shop.example']), null);
  assert.equal(safeApprovedLink('https://shop.example:8443/item', ['shop.example']), null);
  assert.equal(safeApprovedLink('https://shop.example/item#track', ['shop.example']), null);
});

test('demo state and unknown merchants can never show affiliate offers', () => {
  const d = liveData();
  assert.equal(eligibleOffers({ ...d, mode: 'sample' }, product, now).length, 0);
  assert.equal(eligibleOffers({ ...d, activation: { offersEnabled: false } }, product, now).length, 0);
  assert.equal(eligibleOffers({ ...d, approvedMerchants: {} }, product, now).length, 0);
  assert.equal(eligibleOffers({
    ...d, approvedMerchants: {
      example: { name:'Shop', programApproved:true, feedAccessApproved:false, allowedHosts:['shop.example'] },
    },
  }, product, now).length, 0);
});

test('missing consented feed rights, price fields or availability blocks offers', () => {
  const bad = [
    offer({ provenance: { sourceType: 'scraped_website', rightsApproved: true } }),
    offer({ provenance: { sourceType: 'official_partner_feed', rightsApproved: false } }),
    offer({ shippingCents: null }),
    offer({ shippingCents: -1 }),
    offer({ priceCents: 0 }),
    offer({ priceCents: 9.5 }),
    offer({ availability: 'unknown' }),
    offer({ availability: 'out_of_stock' }),
    offer({ currency: 'USD' }),
    offer({ condition: 'used' }),
    offer({ checkedAt: '2026-10-20T00:00:00Z' }),
    offer({ checkedAt: '2026-10-25T00:00:00Z' }),
    offer({ url: 'https://evil.example/item' }),
    offer({ productId: 'wrong-id' }),
    offer({ gtin: '4006381333932' }),
  ];
  assert.equal(eligibleOffers(liveData(bad), product, now).length, 0);
});

test('only current fully approved offers are sorted by total incl shipping', () => {
  const a = offer({ id: 'a', priceCents: 9000, shippingCents: 1500 });
  const b = offer({ id: 'b', priceCents: 10000, shippingCents: 0 });
  const c = offer({ id: 'c', priceCents: 8500, shippingCents: 2000 });
  const result = eligibleOffers(liveData([a,b,c]), product, now);
  assert.deepEqual(result.map(x => x.id), ['b', 'a', 'c']);
  assert.equal(result[0].totalCents, 10000);
  assert.equal(euros(result[0].totalCents), '100,00\u00a0€');
});

test('sample catalog includes only its prior credited images, not merchant offers', () => {
  const text = JSON.stringify(sample);
  assert.equal(/priceCents|shippingCents|deepLink/.test(text), false);
  assert.equal(sample.offers.length, 0);
  assert.ok(sample.products.every(p => p.image?.startsWith('/vendor/webflow/')));
  assert.ok(sample.products.every(p => p.imageCredit && p.imageCreditUrl?.startsWith('https://commons.wikimedia.org/wiki/')));
  assert.ok(sample.products.every(p => !('url' in p) && !('priceCents' in p)));
});
