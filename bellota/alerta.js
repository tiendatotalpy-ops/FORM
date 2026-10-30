/* ===================== ALERTA DE PEDIDO NUEVO (web) ===================== */
(function(){
  const inicio = Date.now();
  const vistos = new Set();
  const cola = [];
  let audioCtx = null;
  const tituloOriginal = document.title;
  let parpadeo = null;

  const css = document.createElement('style');
  css.textContent = `
  #alertaPedido{position:fixed;inset:0;background:rgba(50,15,55,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:18px;}
  #alertaPedido[hidden]{display:none;}
  #alertaPedido .ap-box{background:#fff;border-radius:18px;max-width:420px;width:100%;padding:22px 20px 18px;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:apIn .25s ease;border-top:6px solid #D9578C;}
  @keyframes apIn{from{transform:scale(.92);opacity:0}to{transform:none;opacity:1}}
  #alertaPedido .ap-tag{display:inline-block;background:#FDEEF4;color:#C2477E;font-weight:800;font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;padding:4px 10px;border-radius:999px;}
  #alertaPedido h2{margin:10px 0 2px;font-size:1.35rem;}
  #alertaPedido .ap-sub{font-size:.85rem;color:#777;margin-top:2px;}
  #alertaPedido .ap-items{margin:12px 0 6px;font-size:.92rem;line-height:1.55;background:#FAF5FB;border-radius:10px;padding:10px 12px;}
  #alertaPedido .ap-total{font-size:1.25rem;font-weight:800;margin:8px 0 14px;color:#64287A;}
  #alertaPedido .ap-btns{display:flex;gap:8px;flex-wrap:wrap;}
  #alertaPedido .ap-btns > *{flex:1;min-width:110px;text-align:center;text-decoration:none;}
  #alertaPedido .ap-mas{font-size:.78rem;color:#C2477E;font-weight:700;margin-top:10px;text-align:center;}`;
  document.head.appendChild(css);

  const div = document.createElement('div');
  div.id = 'alertaPedido'; div.hidden = true;
  div.addEventListener('click', e=>{ if(e.target===div) cerrar(false); });
  document.body.appendChild(div);

  const esc = t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  // El navegador solo deja sonar y notificar después de un toque en la página
  function desbloquear(){
    try{ if(!audioCtx){ const C = window.AudioContext||window.webkitAudioContext; if(C) audioCtx = new C(); } if(audioCtx && audioCtx.state==='suspended') audioCtx.resume(); }catch(e){}
    try{ if('Notification' in window && Notification.permission==='default') Notification.requestPermission(); }catch(e){}
  }
  document.addEventListener('click', desbloquear);
  document.addEventListener('touchstart', desbloquear, {passive:true});

  function sonar(){
    try{
      if(!audioCtx){ const C = window.AudioContext||window.webkitAudioContext; if(C) audioCtx = new C(); }
      const c = audioCtx; if(!c) return;
      [0,0.22,0.44,0.9,1.12,1.34].forEach((t,i)=>{
        const o=c.createOscillator(), g=c.createGain();
        o.type='sine'; o.frequency.value = i%3===2 ? 1320 : 990;
        g.gain.setValueAtTime(0.0001, c.currentTime+t);
        g.gain.exponentialRampToValueAtTime(0.5, c.currentTime+t+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime+t+0.18);
        o.connect(g); g.connect(c.destination); o.start(c.currentTime+t); o.stop(c.currentTime+t+0.2);
      });
    }catch(e){}
    try{ navigator.vibrate && navigator.vibrate([400,150,400]); }catch(e){}
  }

  function avisoSistema(p){
    try{
      if(!('Notification' in window) || Notification.permission!=='granted') return;
      const n = new Notification('🛍 Pedido nuevo — Bellota', { body: `${p.cliente||'Cliente'} · ${gs(p.total)}`, tag:'pedido-bellota', renotify:true, requireInteraction:true });
      n.onclick = ()=>{ window.focus(); n.close(); };
    }catch(e){}
  }

  function titulo(on){
    clearInterval(parpadeo); parpadeo = null; document.title = tituloOriginal;
    if(on){ let x=false; parpadeo = setInterval(()=>{ x=!x; document.title = x ? '🔔 PEDIDO NUEVO' : tituloOriginal; }, 900); }
  }

  function mostrar(){
    if(!cola.length){ div.hidden = true; titulo(false); return; }
    const {id, p} = cola[0];
    const items = (p.productos||[]).map(l=>`• ${esc(l.cantidad)} × ${esc(typeof etiquetaLinea==='function' ? etiquetaLinea(l) : l.nombre)}`).join('<br>');
    const hora = new Date(p.fechaRegistro||p.timestamp||Date.now()).toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit',timeZone:'America/Asuncion'});
    const wa = p.telefono && typeof whatsappBusinessLink==='function'
      ? whatsappBusinessLink(p.telefono, 'Hola '+(p.cliente||'')+'! Te escribimos de Bellota 🧣 por tu pedido.') : '';
    div.innerHTML = `<div class="ap-box">
      <span class="ap-tag">🔔 Pedido nuevo de la web · ${hora}</span>
      <h2>${esc(p.cliente||'Sin nombre')}</h2>
      <div class="ap-sub">${p.telefono?'📱 '+esc(p.telefono):''}${p.plusCode?' · 📍 '+esc(p.plusCode):''}</div>
      ${p.observaciones?`<div class="ap-sub">📝 ${esc(p.observaciones)}</div>`:''}
      <div class="ap-items">${items||'—'}</div>
      <div class="ap-total">${gs(p.total)}</div>
      <div class="ap-btns">
        <button class="btn" onclick="cerrarAlertaPedido(true)">Ver pedido</button>
        ${wa?`<a class="btn secondary" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>`:''}
        <button class="btn ghost" onclick="cerrarAlertaPedido(false)">Cerrar</button>
      </div>
      ${cola.length>1?`<div class="ap-mas">+${cola.length-1} pedido(s) nuevo(s) más</div>`:''}
    </div>`;
    div.hidden = false;
  }

  function cerrar(ver){
    const item = cola.shift();
    div.hidden = true;
    if(ver && item){
      try{ goTab('pedidos'); if(typeof setPedidoTab==='function') setPedidoTab('pendientes'); verPedido(item.id); }catch(e){}
    }
    if(cola.length) setTimeout(mostrar, 150); else titulo(false);
  }
  window.cerrarAlertaPedido = cerrar;

  function nuevo(id, p){
    cola.push({id, p});
    sonar(); avisoSistema(p); titulo(true);
    mostrar();
  }
  window.__alertaPedidoPrueba = p=>nuevo('prueba', p);

  db.ref('pedidos').limitToLast(25).on('child_added', s=>{
    if(vistos.has(s.key)) return; vistos.add(s.key);
    const p = s.val()||{};
    if(p.origen!=='web') return;
    if((p.fechaRegistro||p.timestamp||0) < inicio - 5000) return;
    nuevo(s.key, p);
  });
})();
