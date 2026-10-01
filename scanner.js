document.addEventListener('DOMContentLoaded',()=>{
  const $=id=>document.getElementById(id), KEY='nbh_scan_history_v1';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=s=>String(s||'').replace(/\D/g,'');
  const validGtin=v=>{v=clean(v);if(![8,12,13,14].includes(v.length))return false;let s=0;for(let i=v.length-2,j=0;i>=0;i--,j++)s+=+v[i]*(j%2===0?3:1);return (10-s%10)%10===+v.at(-1)};
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const save=a=>localStorage.setItem(KEY,JSON.stringify(a.slice(0,50)));
  let stream=null, detector=null, running=false, torch=false, busy=false, cooldown=new Map(), devices=[], deviceIndex=-1;
  const video=$('scanVideo'), status=$('scanStatus'), result=$('scanResult'), torchBtn=$('scanTorch'), switchBtn=$('scanSwitch');
  const say=(msg,kind='neutral')=>{status.className='tool-result '+kind;status.innerHTML=msg};
  const detectorReady=async()=>{
    if(!('BarcodeDetector' in window))return false;
    try{
      let formats=['ean_13','ean_8','upc_a','upc_e','itf'];
      if(BarcodeDetector.getSupportedFormats){const s=await BarcodeDetector.getSupportedFormats();formats=formats.filter(x=>s.includes(x));}
      if(!formats.length)return false;
      detector=new BarcodeDetector({formats});return true;
    }catch{return false}
  };
  const renderHistory=()=>{
    const a=load(), box=$('scanHistory'), count=$('scanCount'); if(count)count.textContent=a.length;
    if(!a.length){box.innerHTML='<div class="empty-state"><h3>Noch kein Scan</h3><p>Erkannte Codes werden nur in diesem Browser gespeichert.</p></div>';return;}
    box.innerHTML=a.map((x,i)=>`<article class="scan-history-item"><div><span class="tag">${esc(x.format||'Barcode')}</span><h3>${esc(x.code)}</h3><p>${new Date(x.time).toLocaleString('de-DE')} ${x.valid?'<span class="mini-ok">GTIN formal gültig</span>':'<span class="mini-warn">Kennung prüfen</span>'}</p></div><div class="scan-history-actions"><button type="button" class="btn btn-light" data-copy="${i}">Kopieren</button><a class="btn btn-light" href="/produktpass.html?gtin=${encodeURIComponent(x.code)}">Produktpass</a><a class="btn btn-light" href="/angebotsvergleich.html?gtin=${encodeURIComponent(x.code)}">Vergleich</a></div></article>`).join('');
    box.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{const x=a[+b.dataset.copy];try{await navigator.clipboard.writeText(x.code);NBH?.toast?.('Code kopiert')}catch{prompt('Code kopieren:',x.code)}});
  };
  const record=(raw,format='Barcode')=>{
    const code=clean(raw)||String(raw||'').trim(); if(!code)return;
    const now=Date.now(), last=cooldown.get(code)||0; if(now-last<1800)return; cooldown.set(code,now);
    const a=load(); a.unshift({code,format,time:new Date().toISOString(),valid:validGtin(code)}); save(a); renderHistory();
    result.className='scan-result-card'; result.innerHTML=`<div><span class="live-pill">Erkannt</span><h2>${esc(code)}</h2><p>${validGtin(code)?'GTIN/EAN formal gültig.':'Code erkannt; GTIN-Prüfziffer/Länge bitte prüfen.'} · ${esc(format)}</p></div><div class="scan-result-actions"><a class="btn btn-blue" href="/produktpass.html?gtin=${encodeURIComponent(code)}">In Produktpass</a><a class="btn btn-light" href="/angebotsvergleich.html?gtin=${encodeURIComponent(code)}">In Vergleich</a><a class="btn btn-light" href="/suche.html?q=${encodeURIComponent(code)}">Suchen</a><button class="btn btn-light" type="button" id="copyLast">Kopieren</button></div>`;
    $('copyLast')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code);NBH?.toast?.('Code kopiert')}catch{prompt('Code kopieren:',code)}});
    if(navigator.vibrate)navigator.vibrate(60);
  };
  async function refreshDevices(){try{devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput'); switchBtn.hidden=devices.length<2;}catch{devices=[];switchBtn.hidden=true}}
  function stop(){running=false;torch=false;torchBtn.hidden=true;switchBtn.hidden=true;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}if(video){video.srcObject=null}say('Kamera gestoppt.','neutral');$('scanStart').hidden=false;$('scanStop').hidden=true}
  async function start(deviceId=null){
    if(!navigator.mediaDevices?.getUserMedia){say('<strong>Kamera nicht verfügbar.</strong><span>Nutze Foto-Upload oder die manuelle Eingabe.</span>','bad');return}
    const ok=await detectorReady(); if(!ok){say('<strong>Live-Erkennung wird von diesem Browser nicht bereitgestellt.</strong><span>Du kannst weiterhin ein Kamerafoto auswählen oder die Nummer manuell übernehmen.</span>','bad');return}
    stop();
    try{
      const constraints={audio:false,video:deviceId?{deviceId:{exact:deviceId}}:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}};
      stream=await navigator.mediaDevices.getUserMedia(constraints); video.srcObject=stream; video.setAttribute('playsinline',''); await video.play(); running=true; $('scanStart').hidden=true;$('scanStop').hidden=false;
      await refreshDevices();
      const track=stream.getVideoTracks()[0], caps=track.getCapabilities?.()||{}; torchBtn.hidden=!caps.torch; torchBtn.textContent='Taschenlampe';
      if(devices.length){const settings=track.getSettings?.()||{};deviceIndex=Math.max(0,devices.findIndex(d=>d.deviceId===settings.deviceId));}
      say('<strong>Live-Scanner läuft.</strong><span>Barcode ruhig in den Rahmen halten. Mehrere Codes können nacheinander erfasst werden.</span>','good'); loop();
    }catch(e){stop();const name=e?.name||'';const msg=name==='NotAllowedError'?'Kamerazugriff wurde nicht erlaubt.':name==='NotFoundError'?'Keine Kamera gefunden.':'Kamera konnte nicht gestartet werden.';say(`<strong>${msg}</strong><span>Nutze Foto-Upload oder die manuelle Eingabe.</span>`,'bad')}
  }
  async function loop(){if(!running)return;if(!busy&&video.readyState>=2){busy=true;try{const codes=await detector.detect(video);for(const c of codes||[])record(c.rawValue,c.format||'Barcode')}catch{}finally{busy=false}}setTimeout(loop,260)}
  $('scanStart')?.addEventListener('click',()=>start()); $('scanStop')?.addEventListener('click',stop);
  torchBtn?.addEventListener('click',async()=>{const track=stream?.getVideoTracks?.()[0];if(!track)return;try{torch=!torch;await track.applyConstraints({advanced:[{torch}]});torchBtn.textContent=torch?'Lampe aus':'Taschenlampe'}catch{torch=false;NBH?.toast?.('Taschenlampe nicht verfügbar')}});
  switchBtn?.addEventListener('click',async()=>{await refreshDevices();if(devices.length<2)return;deviceIndex=(deviceIndex+1)%devices.length;await start(devices[deviceIndex].deviceId)});
  $('scanPhotoBtn')?.addEventListener('click',async()=>{const f=$('scanPhoto').files?.[0];if(!f)return say('Bitte zuerst ein Foto auswählen.','bad');if(!await detectorReady())return say('<strong>Foto-Erkennung wird von diesem Browser nicht bereitgestellt.</strong><span>Nutze die manuelle Eingabe.</span>','bad');try{const bmp=await createImageBitmap(f),codes=await detector.detect(bmp);bmp.close?.();if(!codes.length)return say('Kein unterstützter Barcode im Foto erkannt.','bad');for(const c of codes)record(c.rawValue,c.format||'Barcode');say(`${codes.length} Barcode${codes.length===1?'':'s'} im Foto erkannt.`,'good')}catch{say('Foto konnte nicht ausgewertet werden.','bad')}});
  $('scanManualBtn')?.addEventListener('click',()=>{const v=$('scanManual').value.trim();if(!v)return;record(v,'Manuelle Eingabe');$('scanManual').value=''});
  $('scanClear')?.addEventListener('click',()=>{if(confirm('Lokale Scan-Historie löschen?')){localStorage.removeItem(KEY);renderHistory()}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stop()}); window.addEventListener('pagehide',stop);
  (async()=>{renderHistory();const ok=await detectorReady();say(ok?'<strong>Scanner bereit.</strong><span>„Kamera starten“ öffnet nach deiner Freigabe die Rückkamera. Alle erkannten Codes bleiben lokal im Browser.</span>':'<strong>Native Barcode-Erkennung ist hier nicht verfügbar.</strong><span>Foto-/manuelle Eingabe bleiben als Fallback sichtbar.</span>',ok?'good':'neutral')})();
});