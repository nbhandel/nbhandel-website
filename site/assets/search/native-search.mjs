/**
 * Product search ON the existing /produkte page, in its original v49 layout.
 * Pure dataset, no merchant scraping, no analytics, no hidden clicks.
 */
import {searchProducts,looksLikeGtin,canonicalGtin,eligibleOffers,euros,productIdentityLabel} from './finder-core.mjs';

const SOURCE='/data/search/original-products.v1.json';
const SAFE_CATEGORIES=new Set([
  '/produkte-technik-elektronik','/produkte-haushalt-wohnen',
  '/produkte-beauty-pflege','/produkte-sport-freizeit',
  '/produkte-sammeln-hobby','/produkte-buero-papier','/produkte-tierbedarf',
]);
const FEATURED=['airpods-pro-3','dyson-v8','nivea-creme','moyu-rs3m',
  'kong-classic','moleskine-pocket','adidas-stan-smith','switch-2'];
const node=(tag,cls,text)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(text!==undefined)e.textContent=String(text);
  return e;
};
const validExistingAsset=s=>typeof s==='string' &&
  /^\/vendor\/webflow\/[a-z0-9%_./-]+\.(webp|jpe?g|png)$/i.test(s) && !s.includes('..');
const validCreditUrl=s=>typeof s==='string' && s.startsWith('https://commons.wikimedia.org/wiki/File:') &&
  !/[\s"'<>]/.test(s);

async function init(){
  const root=document.querySelector('#nbh61Catalog');
  if(!root||root.dataset.bound)return false;
  root.dataset.bound='yes';
  const form=document.querySelector('#nbh61SearchForm');
  const query=document.querySelector('#nbh61Query');
  const category=root.querySelector('#nbh61Category');
  const status=root.querySelector('#nbh61Status');
  const results=root.querySelector('#nbh61Results');
  const detail=root.querySelector('#nbh61Details');
  const showall=root.querySelector('#nbh61ShowAll');
  let data=null,shown=[],expanded=null,showAll=false;

  function closeDetail(){
    expanded=null;
    detail.hidden=true;
    detail.replaceChildren();
    for(const button of results.querySelectorAll('button[data-product-id]')){
      button.setAttribute('aria-expanded','false');
    }
  }
  function drawDetail(product){
    if(!data)return;
    expanded=product.id;
    detail.replaceChildren();
    detail.hidden=false;
    const top=node('div','nbh61-detail-top');
    const group=node('div');
    const head=node('h3','',product.title);
    head.id='nbh61DetailTitle';
    group.append(head,node('p','',product.category+' · '+product.brand));
    const close=node('button','', 'Schließen ×');
    close.type='button';
    close.addEventListener('click',closeDetail);
    top.append(group,close);
    detail.append(top);
    detail.append(node('p','',
      'Produktidentität: '+productIdentityLabel(product)+'. Die passende Ausführung und Kompatibilität müssen vor einem Kauf bestätigt werden.'));

    const offers=eligibleOffers(data,product);
    if(!offers.length){
      detail.append(node('p','',
        'Für dieses Beispiel sind derzeit keine freigegebenen aktuellen Händlerangebote hinterlegt. Hier werden keine früheren Preise als Livepreise verwendet.'));
    } else {
      detail.append(node('p','',
        offers.length===1?'Ein bestätigtes Angebot. Noch kein Mehrhändler-Preisvergleich.':
          offers.length+' bestätigte Angebote, nach Artikelpreis plus Versand sortiert.'));
      for(const offer of offers){
        const group=node('p','');
        group.append(node('strong','',offer.merchantName+' · '+euros(offer.totalCents)+' Gesamtpreis · '));
        const a=node('a','', 'Zum Händler');
        a.href=offer.href;
        a.target='_blank';
        a.rel='sponsored noopener noreferrer';
        group.append(a);
        detail.append(group);
      }
    }
    const links=node('div','nbh61-detail-links');
    if(SAFE_CATEGORIES.has(product.categoryRoute)){
      const a=node('a','', 'Zur Produktwelt →');
      a.href=product.categoryRoute;
      links.append(a);
    }
    const pass=node('a','', 'Produktpass öffnen →');
    pass.href='/produktpass';
    links.append(pass);
    if(validCreditUrl(product.imageCreditUrl)){
      const credit=node('p','nbh61-photo-credit','Beispielbild: '+product.imageCredit+' · ');
      const a=node('a','', 'Bildquelle und Lizenz');
      a.href=product.imageCreditUrl;
      a.target='_blank';
      a.rel='noopener noreferrer';
      credit.append(a);
      detail.append(credit);
    }
    detail.append(links);
    for(const button of results.querySelectorAll('button[data-product-id]')){
      button.setAttribute('aria-expanded',button.dataset.productId===product.id?'true':'false');
    }
    detail.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function createProduct(product){
    const card=node('article','nbh61-result');
    const media=node('div','nbh61-result-visual');
    if(validExistingAsset(product.image)){
      const img=node('img');
      img.src=product.image;
      img.alt='Beispielbild: '+product.title;
      img.loading='lazy';
      img.decoding='async';
      media.append(img);
    }
    media.append(node('span','nbh61-result-label','Beispielartikel'));
    const copy=node('div','nbh61-result-copy');
    copy.append(node('span','nbh61-result-category',product.category));
    copy.append(node('h3','',product.title));
    const button=node('button','nbh61-result-cta','Produkt ansehen →');
    button.type='button';
    button.dataset.productId=product.id;
    button.setAttribute('aria-controls','nbh61Details');
    button.setAttribute('aria-expanded',expanded===product.id?'true':'false');
    copy.append(button);
    card.append(media,copy);
    return card;
  }
  function render(){
    if(!data)return;
    const q=query.value.trim().slice(0,120);
    results.replaceChildren();
    if(looksLikeGtin(q) && !canonicalGtin(q)){
      closeDetail();
      status.textContent='Ungültige GTIN-Prüfziffer';
      results.append(node('div','nbh61-empty','Diese GTIN hat keine gültige Prüfziffer. Bitte prüfe die Ziffernfolge.'));
      return;
    }
    let matches=searchProducts(data.products,q,category.value,80);
    if(!q&&!category.value&&!showAll){
      const positions=new Map(FEATURED.map((x,i)=>[x,i]));
      matches=matches.filter(p=>positions.has(p.id)).sort((a,b)=>positions.get(a.id)-positions.get(b.id));
      status.textContent='8 ausgewählte Beispielartikel von 24 vorhandenen';
    } else {
      status.textContent=matches.length+' '+(matches.length===1?'Beispielartikel':'Beispielartikel')+' gefunden · keine bestätigten Live-Angebote';
    }
    shown=matches;
    if(!matches.length){
      results.append(node('div','nbh61-empty','Noch kein passender Artikel im Beispielbestand. Das bedeutet nicht, dass das Produkt am Markt nicht verfügbar ist.'));
    }else {
      for(const product of matches)results.append(createProduct(product));
    }
    const keepExpanded=expanded && matches.find(p=>p.id===expanded);
    if(!keepExpanded)closeDetail();
    showall.textContent=showAll?'Weniger Beispiele anzeigen ↑':'Alle 24 Beispiele anzeigen ↓';
  }
  results.addEventListener('click',event=>{
    const btn=event.target.closest('button[data-product-id]');
    if(!btn)return;
    const product=shown.find(p=>p.id===btn.dataset.productId);
    if(product)drawDetail(product);
  });
  const params=new URLSearchParams(location.search);
  query.value=(params.get('q')||'').slice(0,120);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    showAll=true;
    render();
    const u=new URL(location.href);
    u.search='';
    if(query.value.trim())u.searchParams.set('q',query.value.trim().slice(0,120));
    if(category.value)u.searchParams.set('category',category.value);
    history.replaceState(null,'',u.pathname+u.search);
  });
  query.addEventListener('input',()=>{showAll=true;render()});
  category.addEventListener('change',()=>{showAll=true;render()});
  showall.addEventListener('click',()=>{showAll=!showAll;render()});
  window.addEventListener('popstate',()=>{
    const p=new URLSearchParams(location.search);
    query.value=(p.get('q')||'').slice(0,120);
    category.value=(p.get('category')||'');
    showAll=Boolean(query.value||category.value);
    render();
  });

  try{
    const response=await fetch(SOURCE,{credentials:'same-origin',cache:'no-store'});
    if(!response.ok)throw new Error('catalog unavailable');
    const payload=await response.json();
    if(payload.schema!=='nbh.productfinder.v1' || payload.mode!=='sample' ||
       payload.activation?.offersEnabled!==false || !Array.isArray(payload.products) ||
       payload.products.length!==24 || !Array.isArray(payload.offers)||payload.offers.length){
      throw new Error('unapproved public source');
    }
    if(!payload.products.every(x=>x&&x.id&&x.title&&x.category&&
        SAFE_CATEGORIES.has(x.categoryRoute)&&validExistingAsset(x.image)&&validCreditUrl(x.imageCreditUrl))){
      throw new Error('invalid image or category reference');
    }
    data=payload;
    for(const label of [...new Set(data.products.map(p=>p.category))].sort((a,b)=>a.localeCompare(b,'de'))){
      const option=node('option','',label);option.value=label;category.append(option);
    }
    const initialCategory=params.get('category')||'';
    if([...category.options].some(x=>x.value===initialCategory))category.value=initialCategory;
    showAll=Boolean(query.value||category.value);
    render();
    const chosen=params.get('product');
    const product=chosen&&data.products.find(p=>p.id===chosen);
    if(product&&searchProducts(data.products,query.value,category.value).some(x=>x.id===product.id)){
      drawDetail(product);
    }
  }catch{
    results.replaceChildren(node('div','nbh61-empty',
      'Der Beispielkatalog kann derzeit nicht geladen werden. Die Kategorien und Kaufwerkzeuge darunter bleiben nutzbar.'));
    status.textContent='Produktsuche vorübergehend nicht verfügbar';
  }
  return true;
}
if(!await init()){
  const observer=new MutationObserver(()=>{
    if(document.querySelector('#nbh61Catalog')){
      observer.disconnect();
      init();
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
}
