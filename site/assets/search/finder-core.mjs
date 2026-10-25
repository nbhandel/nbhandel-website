/**
 * NBHandel Produktfinder – pure, independently testable search / offer policy.
 * No network requests, tracking, affiliate clicks or browser storage.
 */
const IDENTIFIER_LENGTHS = new Set([8, 12, 13, 14]);
export const OFFER_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function plain(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-DE').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function compact(value) {
  return plain(value).replace(/\s/g, '');
}

function digitsOnly(value) {
  const raw = String(value ?? '').trim();
  if (!raw || !/^[0-9\s-]+$/.test(raw)) return null;
  return raw.replace(/[\s-]/g, '');
}

export function looksLikeGtin(value) {
  const digits = digitsOnly(value);
  return digits !== null && IDENTIFIER_LENGTHS.has(digits.length);
}

export function canonicalGtin(value) {
  const digits = digitsOnly(value);
  if (!digits || !IDENTIFIER_LENGTHS.has(digits.length)) return null;
  let sum = 0;
  for (let index = digits.length - 2, weight = 3; index >= 0; index--, weight = weight === 3 ? 1 : 3) {
    sum += Number(digits[index]) * weight;
  }
  const check = (10 - (sum % 10)) % 10;
  if (check !== Number(digits[digits.length - 1])) return null;
  return digits.padStart(14, '0');
}

function canonicalVariant(value) {
  return plain(value);
}

function compatibleBrandOrVariant(product, offer) {
  if (product.brand && offer.brand && plain(product.brand) !== plain(offer.brand)) return false;
  if (product.variant && offer.variant && canonicalVariant(product.variant) !== canonicalVariant(offer.variant)) return false;
  return true;
}

/**
 * A marketing title, category or product ID is NEVER sufficient to prove an offer match.
 * Exact valid GTIN wins if no brand/variant conflict; otherwise full brand+MPN+variant.
 */
export function provenSameProduct(product, offer) {
  if (!product || !offer || !compatibleBrandOrVariant(product, offer)) return false;
  const productGtin = product.gtin ? canonicalGtin(product.gtin) : null;
  const offerGtin = offer.gtin ? canonicalGtin(offer.gtin) : null;
  if (product.gtin && !productGtin) return false;
  if (offer.gtin && !offerGtin) return false;
  if (productGtin || offerGtin) return Boolean(productGtin && offerGtin && productGtin === offerGtin);

  // Without exact GTIN, require brand AND MPN AND variant on BOTH sides.
  // This deliberately excludes broad part-family or model-family matches.
  return Boolean(product.brand && offer.brand && product.mpn && offer.mpn &&
    product.variant && offer.variant &&
    plain(product.brand) === plain(offer.brand) &&
    compact(product.mpn) === compact(offer.mpn) &&
    canonicalVariant(product.variant) === canonicalVariant(offer.variant));
}

export function searchProducts(products, query, category = '', limit = 30) {
  if (!Array.isArray(products)) return [];
  const q = String(query ?? '').trim().slice(0, 120);
  const categoryKey = plain(category);
  const exactGtin = canonicalGtin(q);
  const queryTerms = plain(q).split(' ').filter(Boolean);
  const queryCompact = compact(q);
  const results = [];

  for (const product of products) {
    if (!product || typeof product.id !== 'string' || !product.title) continue;
    if (categoryKey && plain(product.category) !== categoryKey) continue;
    const title = plain(product.title);
    const model = plain(product.model);
    const brand = plain(product.brand);
    const variant = plain(product.variant);
    const mpn = compact(product.mpn);
    const gtin = canonicalGtin(product.gtin);
    const haystack = [title, model, brand, variant, plain(product.category), plain(product.mpn)].join(' ');

    let score = 0;
    if (q) {
      // Numeric lookup must be an exact, checksum-valid product number.
      if (looksLikeGtin(q)) {
        if (!exactGtin || !gtin || gtin !== exactGtin) continue;
        score = 1000;
      } else {
        if (!queryTerms.length || !queryTerms.every(term => haystack.includes(term))) {
          if (!mpn || !queryCompact || !mpn.includes(queryCompact)) continue;
        }
        if (title === plain(q)) score += 150;
        if (title.includes(plain(q))) score += 70;
        if (model === plain(q)) score += 130;
        if (brand === plain(q)) score += 40;
        if (mpn && mpn === queryCompact) score += 250;
        if (mpn && queryCompact && mpn.includes(queryCompact)) score += 90;
        score += queryTerms.reduce((n, term) => n + (title.includes(term) ? 10 : 3), 0);
      }
    }
    results.push({ product, score });
  }
  return results.sort((a, b) => b.score - a.score ||
    String(a.product.title).localeCompare(String(b.product.title), 'de'))
    .slice(0, Math.max(0, Math.min(200, Math.trunc(limit) || 30)))
    .map(result => result.product);
}

export function safeApprovedLink(raw, allowedHosts) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        url.hash || !Array.isArray(allowedHosts) || !allowedHosts.length) return null;
    const hostname = url.hostname.toLowerCase();
    const allowed = allowedHosts.some(value => {
      const host = String(value).toLowerCase();
      return host && hostname === host; // exact merchant/approved tracking host only
    });
    if (!allowed) return null;
    return url.href;
  } catch {
    return null;
  }
}

function eligibleOffer(offer, product, dataset, now) {
  if (!offer || !product || offer.productId !== product.id) return null;
  const merchant = dataset.approvedMerchants?.[offer.merchantId];
  if (!merchant || merchant.programApproved !== true || merchant.feedAccessApproved !== true) return null;
  if (offer.provenance?.sourceType !== 'official_partner_feed' ||
      offer.provenance?.rightsApproved !== true) return null;
  if (offer.currency !== 'EUR' || offer.availability !== 'in_stock' ||
      offer.condition !== 'new') return null;
  if (!Number.isSafeInteger(offer.priceCents) || offer.priceCents <= 0 ||
      !Number.isSafeInteger(offer.shippingCents) || offer.shippingCents < 0) return null;
  if (!provenSameProduct(product, offer)) return null;
  const checkedAt = Date.parse(offer.checkedAt || '');
  if (!Number.isFinite(checkedAt) || checkedAt > now || now - checkedAt > OFFER_MAX_AGE_MS) return null;
  const href = safeApprovedLink(offer.url, merchant.allowedHosts);
  if (!href) return null;
  const totalCents = offer.priceCents + offer.shippingCents;
  if (!Number.isSafeInteger(totalCents)) return null;
  return { ...offer, merchantName: String(merchant.name), href, totalCents };
}

/**
 * Nothing is shown until both the entire dataset and the individual source
 * are explicitly approved for real consumer display.
 */
export function eligibleOffers(dataset, product, now = Date.now()) {
  if (!dataset || dataset.mode !== 'live' || dataset.activation?.offersEnabled !== true ||
      !product || !Array.isArray(dataset.offers)) return [];
  return dataset.offers.map(offer => eligibleOffer(offer, product, dataset, now))
    .filter(Boolean)
    .sort((a, b) => a.totalCents - b.totalCents ||
      a.merchantName.localeCompare(b.merchantName, 'de'));
}

export function productIdentityLabel(product) {
  const gtin = canonicalGtin(product.gtin);
  if (gtin) return 'GTIN formal geprüft';
  if (product.brand && product.mpn && product.variant) return 'Marke / MPN / Variante hinterlegt';
  return 'Produktidentität noch nicht vollständig belegt';
}

export function euros(cents) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
