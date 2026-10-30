/* ===================== AVISOS PUSH EN ESTE CELULAR ===================== */
(function(){
  const VAPID_PUB = 'BFwnuhOOp8GfXzbzpL2NEL6744PIDF8tkD_IkymHSaBknr4oWOao38RAmoNb9Nksw2xJXrVOFxiNz4toqYpb4ys';
  const soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const instalada = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  let reg = null, regPromesa = null;
  const sesion = Date.now().toString(36);

  function log(paso, extra){
    try{ db.ref('pushLog/'+sesion).push({ paso, extra: extra ? String(extra).slice(0,300) : '', ts: Date.now(),
      perm: ('Notification' in window) ? Notification.permission : 'sin-api', soporta, instalada, ua: navigator.userAgent.slice(0,140) }); }catch(e){}
  }
  function b64ToBytes(b64){ const p='='.repeat((4-b64.length%4)%4); const s=atob((b64+p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from([...s].map(c=>c.charCodeAt(0))); }
  async function claveSub(sub){ const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub.endpoint)); return [...new Uint8Array(buf)].slice(0,12).map(b=>b.toString(16).padStart(2,'0')).join(''); }
  const conTiempo = (p, ms, nombre) => Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error('tardó demasiado: '+nombre)), ms))]);

  const box = document.createElement('div');
  box.id = 'avisosPush';
  box.style.cssText = 'display:none;margin:0 0 12px;padding:14px 16px;border-radius:14px;background:#FDEEF4;border:1.5px solid #F4CFE0;font-size:.9rem;line-height:1.4;';
  function msg(html){ box.innerHTML = html; box.style.display = 'block'; }
  function pintar(estado){
    if(estado==='ok'){ box.style.display='none'; return; }
    if(!soporta){ msg('🔔 Para recibir avisos con el celular bloqueado, abrí la app desde el ícono de Bellota en la pantalla de inicio (no desde Safari).'); return; }
    if(estado==='denegado'){ msg('🔕 Las notificaciones de Bellota están bloqueadas. Activalas en Ajustes → Notificaciones → Bellota y volvé a abrir la app.'); return; }
    msg(`<b>🔔 Avisos de pedidos nuevos</b><div style="margin:4px 0 10px;color:#6b4a5a">Activá para que te suene cada pedido de la web, aunque la app esté cerrada.</div>
      <button class="btn full" id="btnActivarPush" onclick="activarAvisosPush()">Activar avisos en este celular</button>
      <div id="pushEstado" style="margin-top:8px;font-size:.8rem;color:#6b4a5a"></div>`);
  }
  function estado(t){ const e=document.getElementById('pushEstado'); if(e) e.textContent=t; }
  function montar(){ const main=document.querySelector('main'); if(main && !document.getElementById('avisosPush')) main.insertBefore(box, main.firstChild); }

  async function guardar(sub){
    const k = await claveSub(sub);
    await conTiempo(db.ref('pushSubs/'+k).set({ sub: JSON.parse(JSON.stringify(sub)), ua: navigator.userAgent.slice(0,120), ts: Date.now() }), 10000, 'guardar');
  }

  window.activarAvisosPush = async function(){
    const b = document.getElementById('btnActivarPush'); if(b){ b.disabled = true; b.textContent = 'Activando…'; }
    log('toco-boton');
    try{
      // 1) Permiso (lo primero, para no perder el toque)
      estado('Pidiendo permiso…');
      const perm = await Notification.requestPermission();
      log('permiso', perm);
      if(perm!=='granted'){ pintar('denegado'); return; }
      // 2) Registro del service worker (ya arrancado al abrir la app)
      estado('Preparando…');
      reg = reg || await conTiempo(regPromesa || navigator.serviceWorker.register('/sw.js'), 10000, 'registro');
      if(!reg.active){ await conTiempo(navigator.serviceWorker.ready, 10000, 'sw listo'); }
      log('sw-ok', reg.active ? reg.active.state : 'sin-activo');
      // 3) Suscripción
      estado('Conectando avisos…');
      let sub = await reg.pushManager.getSubscription();
      if(!sub) sub = await conTiempo(reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: b64ToBytes(VAPID_PUB) }), 15000, 'suscripcion');
      log('suscripto', sub.endpoint.split('/')[2]);
      // 4) Guardar
      await guardar(sub);
      log('guardado');
      pintar('ok');
      fetch('/.netlify/functions/avisar',{method:'POST',body:JSON.stringify({prueba:'bellota-prueba-7731'})}).catch(()=>{});
      alert('✅ Listo. Te mandé un aviso de prueba. Desde ahora cada pedido de la web te suena en este celular.');
    }catch(e){
      log('error', (e && (e.name+': '+e.message)) || e);
      estado('❌ ' + ((e && e.message) || e));
      if(b){ b.disabled = false; b.textContent = 'Reintentar'; }
      alert('No se pudieron activar los avisos: ' + ((e && e.message) || e));
    }
  };

  async function iniciar(){
    montar();
    log('abrio-app');
    if(!soporta){ pintar('nosoporta'); return; }
    try{
      regPromesa = navigator.serviceWorker.register('/sw.js');
      reg = await regPromesa;
      const sub = await reg.pushManager.getSubscription();
      if(sub && Notification.permission==='granted'){ await guardar(sub); pintar('ok'); log('ya-suscripto'); }
      else pintar(Notification.permission==='denied'?'denegado':'pedir');
    }catch(e){ log('error-inicio', e && e.message); pintar('pedir'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
