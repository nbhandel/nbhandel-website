/** Compact, browsable product examples from the EXISTING NBHandel sample catalog.
 * No prices, feed requests, analytics, cookies, or external image hotlinking.
 */
const track = document.querySelector('#nbl-gallery-track');
const prev = document.querySelector('#nbl-gallery-prev');
const next = document.querySelector('#nbl-gallery-next');
if (track && prev && next) {
  const stop = message => {
    track.replaceChildren();
    const p = document.createElement('p');
    p.className = 'nbl-gallery-fallback';
    p.textContent = message;
    track.append(p);
    prev.disabled = next.disabled = true;
  };
  const safePhoto = path =>
    typeof path === 'string' && /^\/vendor\/webflow\/[a-z0-9%/._-]+\.(webp|jpe?g|png)$/i.test(path)
      && !path.includes('..');
  const safeCredit = path =>
    typeof path === 'string' && path.startsWith('https://commons.wikimedia.org/wiki/File:')
      && !/[\s"<>]/.test(path);
  const updateControls = () => {
    prev.disabled = track.scrollLeft <= 4;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  const shift = sign => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollBy({
      left: sign * Math.max(220, Math.round(track.clientWidth * 0.8)),
      behavior: reduced ? 'instant' : 'smooth',
    });
  };
  prev.addEventListener('click', () => shift(-1));
  next.addEventListener('click', () => shift(1));
  track.addEventListener('scroll', updateControls, { passive: true });
  window.addEventListener('resize', updateControls);

  try {
    const response = await fetch('/data/productfinder/sample-catalog.v1.json', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error('Sample file unavailable');
    const dataset = await response.json();
    if (dataset.schema !== 'nbh.productfinder.v1' ||
        dataset.mode !== 'sample' || dataset.activation?.offersEnabled !== false ||
        !Array.isArray(dataset.products) || dataset.products.length !== 24 ||
        !Array.isArray(dataset.offers) || dataset.offers.length) {
      throw new Error('Unreviewed source contents');
    }
    const products = dataset.products.filter(p =>
      p && typeof p.title === 'string' && typeof p.id === 'string' &&
      safePhoto(p.image) && safeCredit(p.imageCreditUrl) && p.imageCredit);
    if (products.length !== 24) throw new Error('Incomplete product image attribution');

    // Balanced editorial order across the EXISTING categories, no invented SKU.
    const ids = [
      'airpods-pro-3', 'dyson-v8', 'nivea-creme', 'switch-2',
      'kong-classic', 'adidas-stan-smith', 'moyu-rs3m', 'moleskine-pocket',
      'galaxy-s25-ultra', 'ps5-pro', 'mx-master-3s', 'meta-quest-3-512',
    ];
    const byId = new Map(products.map(p => [p.id, p]));
    const sorted = [...ids.map(id => byId.get(id)).filter(Boolean),
      ...products.filter(p => !ids.includes(p.id))];
    track.replaceChildren();
    for (const product of sorted) {
      const card = document.createElement('article');
      card.className = 'nbl-gallery-item';
      card.setAttribute('role', 'listitem');

      const link = document.createElement('a');
      link.className = 'nbl-gallery-main';
      link.href = '/produktfinder?q=' + encodeURIComponent(product.title);

      const visual = document.createElement('span');
      visual.className = 'nbl-gallery-photo';
      const image = document.createElement('img');
      image.src = product.image;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = 'Beispielbild: ' + product.title;
      visual.append(image);

      const info = document.createElement('span');
      info.className = 'nbl-gallery-copy';
      const category = document.createElement('small');
      category.textContent = product.category;
      const title = document.createElement('strong');
      title.textContent = product.title;
      const action = document.createElement('em');
      action.textContent = 'Im Produktfinder ansehen →';
      info.append(category, title, action);
      link.append(visual, info);
      card.append(link);

      const attribution = document.createElement('div');
      attribution.className = 'nbl-gallery-credit';
      attribution.append(document.createTextNode('Bild: ' + product.imageCredit + ' · '));
      const credit = document.createElement('a');
      credit.href = product.imageCreditUrl;
      credit.textContent = 'Quelle';
      credit.target = '_blank';
      credit.rel = 'noopener noreferrer';
      attribution.append(credit);
      card.append(attribution);
      track.append(card);
    }
    requestAnimationFrame(updateControls);
  } catch {
    stop('Die Beispielprodukte können gerade nicht geladen werden. Der Produktfinder und die Kaufwerkzeuge bleiben über die Navigation erreichbar.');
  }
}
