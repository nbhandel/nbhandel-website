import {
  searchProducts, eligibleOffers, euros, looksLikeGtin,
  canonicalGtin, productIdentityLabel,
} from './finder-core.mjs';

const DATA_URL = '/data/productfinder/sample-catalog.v1.json';
const form = document.querySelector('#pf-form');
const queryInput = document.querySelector('#pf-query');
const categorySelect = document.querySelector('#pf-category');
const resultStatus = document.querySelector('#pf-status');
const results = document.querySelector('#pf-results');
const detail = document.querySelector('#pf-detail');

let dataset = null;
let displayed = [];
let selectedId = null;

function make(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = String(value);
  return node;
}

function describeCategory(cat) {
  const labels = {
    'Technik & Elektronik': 'TECH',
    'Haushalt & Wohnen': 'HOME',
    'Beauty & Pflege': 'CARE',
    'Sport & Freizeit': 'SPORT',
    'Sammeln & Hobby': 'HOBBY',
    'Büro & Papier': 'BÜRO',
    'Tierbedarf': 'TIER',
  };
  return labels[cat] || 'NB';
}

function refreshCategories(products) {
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'de'));
  for (const category of categories) {
    const option = make('option', '', category);
    option.value = category;
    categorySelect.append(option);
  }
}

function renderOffer(offer) {
  const line = make('div', 'pf-offer');
  const left = make('div');
  left.append(make('strong', '', offer.merchantName));
  left.append(make('small', '',
    'Artikel ' + euros(offer.priceCents) + ' · Versand ' + euros(offer.shippingCents) +
    ' · Stand ' + new Date(offer.checkedAt).toLocaleString('de-DE')));
  const right = make('div');
  right.append(make('strong', '', euros(offer.totalCents) + ' '));
  const anchor = make('a', '', 'Zum Händler');
  anchor.href = offer.href;
  anchor.target = '_blank';
  anchor.rel = 'sponsored noopener noreferrer';
  anchor.referrerPolicy = 'strict-origin-when-cross-origin';
  right.append(anchor);
  line.append(left, right);
  return line;
}

function showDetails(product) {
  if (!dataset) return;
  selectedId = product.id;
  detail.replaceChildren();
  detail.hidden = false;
  const header = make('div', 'pf-detail-header');
  const headingBox = make('div');
  headingBox.append(make('p', 'pf-overline', 'Artikelinformationen'));
  const heading = make('h2', '', product.title);
  heading.id = 'pf-detail-title';
  headingBox.append(heading);
  headingBox.append(make('p', '', product.category + ' · ' + (product.brand || 'Marke noch unbekannt')));
  header.append(headingBox);
  const close = make('button', 'pf-detail-close', 'Schließen ×');
  close.type = 'button';
  close.addEventListener('click', () => {
    selectedId = null;
    detail.hidden = true;
    detail.replaceChildren();
    for (const button of results.querySelectorAll('button[data-product-id]')) {
      button.setAttribute('aria-expanded', 'false');
    }
  });
  header.append(close);
  detail.append(header);

  detail.append(make('div', 'pf-note',
    'Identität: ' + productIdentityLabel(product) +
    '. Ein Beispielname allein bestätigt weder eine GTIN noch die Kompatibilität mit einem bestimmten Gerät oder Fahrzeug.'));

  if (dataset.mode === 'sample' && product.imageCredit &&
      typeof product.imageCreditUrl === 'string' &&
      product.imageCreditUrl.startsWith('https://commons.wikimedia.org/wiki/')) {
    const attribution = make('p', 'pf-image-credit', 'Bildnachweis: ' + product.imageCredit + ' · ');
    const source = make('a', '', 'Originalquelle und Lizenz');
    source.href = product.imageCreditUrl;
    source.rel = 'noopener noreferrer';
    source.target = '_blank';
    attribution.append(source);
    detail.append(attribution);
  }

  const offers = eligibleOffers(dataset, product);
  const list = make('div', 'pf-offers');
  if (!offers.length) {
    list.append(make('strong', '', 'Noch keine geprüften Händlerangebote verfügbar.'));
    list.append(make('p', '',
      'Dieses Beispiel dient zur Demonstration der Produktsuche. Wir zeigen hier weder frühere Preise als aktuelle Angebote noch nicht autorisierte Händlerlinks.'));
  } else {
    list.append(make('p', '', offers.length > 1
      ? offers.length + ' aktuelle, freigegebene Angebote für dieselbe geprüfte Produktidentität. Sortierung nach Artikelpreis plus Versand.'
      : 'Ein freigegebenes Händlerangebot. Noch kein Mehrhändler-Preisvergleich.'));
    for (const offer of offers) list.append(renderOffer(offer));
    list.append(make('p', 'pf-note',
      'Affiliate-Hinweis: Beim freiwilligen Aufruf eines entsprechend gekennzeichneten Händlerlinks kann NBHandel eine Provision erhalten.'));
  }
  detail.append(list);
  for (const button of results.querySelectorAll('button[data-product-id]')) {
    button.setAttribute('aria-expanded', button.dataset.productId === selectedId ? 'true' : 'false');
  }
  detail.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    block: 'start',
  });
}

function renderProduct(product) {
  const card = make('article', 'pf-card');
  const approvedSampleImage = dataset.mode === 'sample' && typeof product.image === 'string' &&
    product.image.startsWith('/vendor/webflow/') && !product.image.includes('..') &&
    /\.(?:webp|jpe?g|png)$/i.test(product.image);
  const top = make('div', approvedSampleImage ? 'pf-card-media' : 'pf-card-top');
  if (approvedSampleImage) {
    const img = make('img');
    img.src = product.image;
    img.alt = 'Beispielbild: ' + product.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    top.append(img);
    top.append(make('span', 'pf-card-image-label', 'Beispielartikel'));
  } else {
    top.append(make('span', 'pf-card-icon', describeCategory(product.category)));
    top.append(make('span', 'pf-card-badge', dataset.mode === 'sample' ? 'Beispielartikel' : 'Artikel'));
  }
  card.append(top);

  const body = make('div', 'pf-card-body');
  body.append(make('p', 'pf-card-category', product.category));
  body.append(make('h3', '', product.title));
  body.append(make('p', 'pf-card-identity', productIdentityLabel(product)));

  const bottom = make('div', 'pf-card-bottom');
  const offers = eligibleOffers(dataset, product);
  bottom.append(make('span', '', offers.length
    ? (offers.length === 1 ? '1 geprüftes Angebot' : offers.length + ' geprüfte Angebote')
    : 'Keine Live-Angebote'));
  const button = make('button', '', 'Details ansehen →');
  button.type = 'button';
  button.dataset.productId = product.id;
  button.setAttribute('aria-expanded', product.id === selectedId ? 'true' : 'false');
  button.setAttribute('aria-controls', 'pf-detail');
  bottom.append(button);
  body.append(bottom);
  card.append(body);
  return card;
}

function render() {
  if (!dataset) return;
  const q = queryInput.value.trim();
  if (looksLikeGtin(q) && !canonicalGtin(q)) {
    results.replaceChildren();
    resultStatus.textContent = 'Die eingegebene GTIN hat keine gültige Prüfziffer.';
    const empty = make('div', 'pf-empty');
    empty.append(make('strong', '', 'GTIN formal ungültig'));
    empty.append(make('p', '', 'Bitte prüfe die Ziffernfolge. Eine fehlerhafte Produktnummer wird nicht einem ähnlichen Artikel zugeordnet.'));
    results.append(empty);
    detail.hidden = true;
    return;
  }

  displayed = searchProducts(dataset.products, q, categorySelect.value, 60);
  const name = dataset.mode === 'sample' ? 'Beispielartikel' : 'Produkte';
  resultStatus.textContent = displayed.length
    ? displayed.length + ' ' + name + ' gefunden.' + (dataset.mode === 'sample' ? ' Keine bestätigten Live-Angebote.' : '')
    : 'Keine passenden Artikel im aktuellen Beispielbestand.';
  results.replaceChildren();
  if (!displayed.length) {
    const empty = make('div', 'pf-empty');
    empty.append(make('strong', '', 'Noch kein passender Eintrag'));
    empty.append(make('p', '',
      'Unser Beispielkatalog ist noch klein. Das bedeutet nicht, dass das gesuchte Produkt am Markt nicht verfügbar ist.'));
    results.append(empty);
  } else {
    for (const product of displayed) results.append(renderProduct(product));
  }
  if (!displayed.some(p => p.id === selectedId)) {
    selectedId = null;
    detail.hidden = true;
    detail.replaceChildren();
  }
}

results.addEventListener('click', event => {
  const button = event.target.closest('button[data-product-id]');
  if (!button || !dataset) return;
  const product = displayed.find(item => item.id === button.dataset.productId);
  if (product) showDetails(product);
});

form.addEventListener('submit', event => {
  event.preventDefault();
  render();
  const params = new URLSearchParams();
  if (queryInput.value.trim()) params.set('q', queryInput.value.trim());
  if (categorySelect.value) params.set('category', categorySelect.value);
  window.history.replaceState(null, '', window.location.pathname + (params.size ? '?' + params.toString() : ''));
});

categorySelect.addEventListener('change', render);
queryInput.addEventListener('input', render);

async function start() {
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error('catalog request failed');
    const payload = await response.json();
    if (payload.schema !== 'nbh.productfinder.v1' ||
        !Array.isArray(payload.products) || !Array.isArray(payload.offers) ||
        !payload.products.length) throw new Error('invalid catalog');
    if (payload.mode !== 'sample') throw new Error('unexpected live catalog in preview');
    dataset = payload;
    refreshCategories(dataset.products);
    const params = new URLSearchParams(window.location.search);
    queryInput.value = String(params.get('q') || '').slice(0, 120);
    if ([...categorySelect.options].some(option => option.value === params.get('category'))) {
      categorySelect.value = params.get('category') || '';
    }
    render();
  } catch {
    resultStatus.textContent = 'Der Beispielkatalog konnte nicht geladen werden.';
    const empty = make('div', 'pf-empty');
    empty.append(make('strong', '', 'Produktsuche vorübergehend nicht verfügbar.'));
    empty.append(make('p', '', 'Bitte lade die Seite neu. Vorhandene NBHandel-Rechner und der manuelle Angebotsvergleich bleiben separat erreichbar.'));
    results.replaceChildren(empty);
  }
}

start();
