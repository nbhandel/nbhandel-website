document.addEventListener('DOMContentLoaded',()=>{
const KEY='nbh_compare_v2',$=x=>document.getElementById(x),
eur=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}),
esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
n=v=>{const x=parseFloat(v);return Number.isFinite(x)?x:0};
let rows=2;

function load(){
  try{
    const u=new URLSearchParams(location.search).get('p');
    if(u){
      const d=JSON.parse(decodeURIComponent(escape(atob(u.replace(/-/g,'+').replace(/_/g,'/')))));
      localStorage.setItem(KEY,JSON.stringify(d));
      history.replaceState(null,'','/angebotsvergleich.html');
    }
    return JSON.parse(localStorage.getItem(KEY)||'{}');
  }catch{return{}}
}

function row(x={},i=0){
return `<article class="simple-offer-card">
  <div class="simple-offer-head"><span>Angebot ${i+1}</span></div>
  <div class="simple-offer-basic">
    <label>Händler
      <input class="c-shop" value="${esc(x.shop||'')}" placeholder="z. B. Shop A">
    </label>
    <label>Artikelpreis
      <div class="simple-money"><input class="c-price" type="number" min="0" step="0.01" value="${x.price||''}" placeholder="0,00"><span>€</span></div>
    </label>
    <label>Versand
      <div class="simple-money"><input class="c-ship" type="number" min="0" step="0.01" value="${x.ship||0}"><span>€</span></div>
    </label>
  </div>
  <details class="simple-details offer-details">
    <summary>Erweiterte Angaben</summary>
    <div class="simple-detail-grid offer-detail-grid">
      <label>Weitere Pflichtkosten
        <div class="simple-money"><input class="c-extra" type="number" min="0" step="0.01" value="${x.extra||0}"><span>€</span></div>
      </label>
      <label>Menge
        <input class="c-qty" type="number" min="1" step="1" value="${x.qty||1}">
      </label>
      <label>Zustand
        <select class="c-condition">${['Neu','B-Ware','Refurbished','Gebraucht','Unklar'].map(v=>`<option ${x.condition===v?'selected':''}>${v}</option>`).join('')}</select>
      </label>
      <label>Lieferzeit
        <input class="c-delivery" value="${esc(x.delivery||'')}" placeholder="z. B. 2–3 Tage">
      </label>
      <label class="wide-simple-label">Notiz
        <input class="c-note" value="${esc(x.note||'')}" placeholder="optional">
      </label>
    </div>
  </details>
</article>`;
}

function data(){
 return{
  project:$('cmpProject').value.trim(),
  product:$('cmpProduct').value.trim(),
  gtin:$('cmpGtin').value.replace(/\D/g,''),
  offers:[...document.querySelectorAll('#cmpRows .simple-offer-card')].map(r=>({
    shop:r.querySelector('.c-shop').value.trim(),
    price:n(r.querySelector('.c-price').value),
    ship:n(r.querySelector('.c-ship').value),
    extra:n(r.querySelector('.c-extra').value),
    qty:Math.max(1,Math.floor(n(r.querySelector('.c-qty').value)||1)),
    condition:r.querySelector('.c-condition').value,
    delivery:r.querySelector('.c-delivery').value.trim(),
    note:r.querySelector('.c-note').value.trim()
  }))
 }
}

function build(){
 const d=load();
 const qGtin=new URLSearchParams(location.search).get('gtin');
 if(qGtin&&!d.gtin){d.gtin=qGtin.replace(/\D/g,'');history.replaceState(null,'','/angebotsvergleich.html')}
 $('cmpProject').value=d.project||'Mein Angebotsvergleich';
 $('cmpProduct').value=d.product||'';
 $('cmpGtin').value=d.gtin||'';
 rows=Math.max(2,Math.min(6,(d.offers||[]).length||2));
 $('cmpRows').innerHTML=Array.from({length:rows},(_,i)=>row((d.offers||[])[i],i)).join('');
 calc(false);
}

function calc(store=true){
 const d=data();
 const a=d.offers.filter(x=>x.price>0).map(x=>({...x,total:x.price*x.qty+x.ship+x.extra,per:(x.price*x.qty+x.ship+x.extra)/x.qty}));
 if(store)localStorage.setItem(KEY,JSON.stringify(d));
 if(a.length<2){
   $('cmpResult').innerHTML='<div class="simple-result-hint">Bitte trage bei mindestens zwei Angeboten einen Artikelpreis ein.</div>';
   return;
 }
 a.sort((x,y)=>x.total-y.total);
 const cond=new Set(a.map(x=>x.condition));
 $('cmpResult').innerHTML=`<div class="simple-compare-result">
   <div class="simple-winner">
     <small>Günstigster Gesamtpreis</small>
     <h3>${esc(a[0].shop||'Angebot 1')}</h3>
     <strong>${eur.format(a[0].total)}</strong>
     <span>${eur.format(a[0].per)} pro Stück</span>
   </div>
   <div class="simple-ranking">
     ${a.map((x,i)=>`<article>
       <span class="simple-rank">${i+1}</span>
       <div><b>${esc(x.shop||'Angebot')}</b><small>${esc(x.condition)}${x.delivery?' · '+esc(x.delivery):''}</small></div>
       <strong>${eur.format(x.total)}</strong>
     </article>`).join('')}
   </div>
   ${cond.size>1?'<div class="simple-warning">Hinweis: Die Zustände unterscheiden sich. Die Preise sind deshalb nicht vollständig gleichwertig.</div>':''}
 </div>`;
}

$('cmpCalc').onclick=()=>calc(true);
$('cmpAdd').onclick=()=>{
 if(rows>=6)return;
 rows++;
 $('cmpRows').insertAdjacentHTML('beforeend',row({},rows-1));
 if(rows>=6)$('cmpAdd').disabled=true;
};
$('cmpReset').onclick=()=>{
 if(confirm('Lokales Vergleichsprojekt löschen?')){
   localStorage.removeItem(KEY);location.reload();
 }
};
$('cmpCsv').onclick=()=>{
 const d=data(),
 R=[['Projekt','Produkt','GTIN'],[d.project,d.product,d.gtin],[],['Händler','Preis','Versand','Pflichtkosten','Menge','Zustand','Lieferzeit','Notiz']]
 .concat(d.offers.map(x=>[x.shop,x.price,x.ship,x.extra,x.qty,x.condition,x.delivery,x.note]));
 const csv=R.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n'),
 a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 a.download='nbhandel-angebotsvergleich.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(a.href),500);
};
$('cmpShare').onclick=async()=>{
 const raw=unescape(encodeURIComponent(JSON.stringify(data()))),
 p=btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),
 u=location.origin+'/angebotsvergleich.html?p='+encodeURIComponent(p);
 try{await navigator.clipboard.writeText(u);NBH?.toast?.('Share-Link kopiert')}
 catch{prompt('Link kopieren:',u)}
};
build();
});