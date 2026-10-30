/* ===================== AVISOS PUSH EN ESTE CELULAR ===================== */
(function(){
  const VAPID_PUB = 'BFwnuhOOp8GfXzbzpL2NEL6744PIDF8tkD_IkymHSaBknr4oWOao38RAmoNb9Nksw2xJXrVOFxiNz4toqYpb4ys';
  const soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const instalada = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  let reg = null;

  function b64ToBytes(b64){ const p='='.repeat((4-b64.length%4)%4); const s=atob((b64+p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from([...s].map(c=>c.charCodeAt(0))); }
  async function claveSub(sub){ const buf=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub.endpoint)); return [...new Uint8Array(buf)].slice(0,12).map(b=>b.toString(16).padStart(2,'0')).join(''); }

  const box = document.createElement('div');
  box.id = 'avisosPush';
  box.style.cssText = 'display:none;margin:0 0 12px;padding:14px 16px;border-radius:14px;background:#FDEEF4;border:1.5px solid #F4CFE0;font-size:.9rem;line-height:1.4;';
  function pintar(estado){
    if(!soporta && !instalada){
      box.innerHTML = '🔔 Para recibir avisos de pedidos con el celular bloqueado, abrí la app desde el ícono de Bellota en la pantalla de inicio.';
      box.style.display='block'; return;
    }
    if(estado==='ok'){ box.style.display='none'; return; }
    if(estado==='denegado'){
      box.innerHTML = '🔕 Las notificaciones están bloqueadas. Activalas en Ajustes → Notificaciones → Bellota.';
      box.style.display='block'; return;
    }
    box.innerHTML = `<b>🔔 Avisos de pedidos nuevos</b><div style="margin:4px 0 10px;color:#6b4a5a">Activá para que te suene cada pedido de la web, aunque la app esté cerrada.</div>
      <button class="btn full" onclick="activarAvisosPush()">Activar avisos en este celular</button>`;
    box.style.display='block';
  }
  function montar(){
    const main = document.querySelector('main'); if(!main) return;
    main.insertBefore(box, main.firstChild);
  }

  async function guardar(sub){
    const k = await claveSub(sub);
    await db.ref('pushSubs/'+k).set({ sub: JSON.parse(JSON.stringify(sub)), ua: navigator.userAgent.slice(0,120), ts: Date.now() });
    try{ localStorage.setItem('bellotaPushOk','1'); }catch(e){}
  }

  window.activarAvisosPush = async function(){
    try{
      const perm = await Notification.requestPermission();
      if(perm!=='granted'){ pintar('denegado'); return; }
      reg = reg || await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: b64ToBytes(VAPID_PUB) });
      await guardar(sub);
      pintar('ok');
      fetch('/.netlify/functions/avisar',{method:'POST',body:JSON.stringify({prueba:'bellota-prueba-7731'})}).catch(()=>{});
      alert('✅ Listo. Te mandé un aviso de prueba. Desde ahora cada pedido de la web te suena en este celular.');
    }catch(e){ alert('No se pudieron activar los avisos: '+e.message); }
  };

  async function iniciar(){
    montar();
    if(!soporta){ pintar('nosoporta'); return; }
    try{
      reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.getSubscription();
      if(sub && Notification.permission==='granted'){ await guardar(sub); pintar('ok'); }
      else pintar(Notification.permission==='denied'?'denegado':'pedir');
    }catch(e){ pintar('pedir'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
