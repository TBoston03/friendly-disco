/* Shared JS for menu, theme, device toggle, headline, and cursor
   Loaded with defer so DOM is available. */
(function() {
  const root = document.documentElement;

  /* ---------- Menu (open/close + keyboard nav) ---------- */
  const btn = document.getElementById('menuButton');
  const dropdown = document.getElementById('menuDropdown');
  const topLeft = document.getElementById('topLeftMenu');

  function setMenuItemDelays(open) {
    const items = Array.from(dropdown.querySelectorAll('.dropdown-item'));
    items.forEach((it, i) => {
      const delay = open ? i * 60 : (items.length - 1 - i) * 60;
      it.style.animationDelay = delay + 'ms';
    });
  }

  function closeMenu() {
    if (!dropdown.classList.contains('show')) return;
    const items = Array.from(dropdown.querySelectorAll('.dropdown-item'));
    dropdown.classList.add('closing');
    topLeft && topLeft.classList.add('closing');
    setMenuItemDelays(false);
    const total = ((items.length - 1) * 60) + 420 + 60;
    setTimeout(() => {
      dropdown.classList.remove('show');
      dropdown.classList.remove('closing');
      topLeft && topLeft.classList.remove('closing');
      items.forEach(it => it.style.animationDelay = '');
      btn && btn.setAttribute('aria-expanded', 'false');
    }, total);
  }

  function openMenu() {
    if (!dropdown) return;
    dropdown.classList.remove('closing');
    topLeft && topLeft.classList.remove('closing');
    setMenuItemDelays(true);
    dropdown.classList.add('show');
    requestAnimationFrame(() => btn && btn.setAttribute('aria-expanded', 'true'));
  }

  if (btn) {
    btn.addEventListener('click', (e) => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) closeMenu(); else openMenu();
    });
  }

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!topLeft) return;
    if (!topLeft.contains(e.target)) closeMenu();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // Keyboard navigation for dropdown
  if (dropdown) {
    dropdown.addEventListener('keydown', (e) => {
      const items = Array.from(dropdown.querySelectorAll('.dropdown-item'));
      const active = document.activeElement;
      const idx = items.indexOf(active);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[Math.min(items.length - 1, Math.max(0, idx + 1))] || items[0];
        next && next.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = items[Math.max(0, idx - 1)] || items[items.length - 1];
        prev && prev.focus();
      } else if (e.key === 'Home') {
        e.preventDefault(); items[0] && items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault(); items[items.length - 1] && items[items.length - 1].focus();
      }
    });
  }

  /* ---------- Theme toggle with reveal animation ---------- */
  const themeToggle = document.getElementById('themeToggle');

  function updateThemeButtonTarget() {
    if (!themeToggle) return;
    const isDark = root.classList.contains('dark-theme');
    themeToggle.classList.toggle('target-dark', !isDark);
    themeToggle.classList.toggle('target-light', isDark);
  }

  function applyTheme(name) {
    if (name === 'dark') root.classList.add('dark-theme'); else root.classList.remove('dark-theme');
    try { localStorage.setItem('theme', name); } catch (e) {}
    updateThemeButtonTarget();
  }

  // reveal animation that expands a circle and then applies the theme
  function revealTheme(nextTheme, cx, cy) {
    const overlay = document.createElement('div');
    overlay.className = 'theme-reveal-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = 20000;
    const colors = { light: '#f4f4f4', dark: '#0b1116' };
    overlay.style.background = colors[nextTheme] || colors.light;
    overlay.style.clipPath = `circle(0px at ${cx}px ${cy}px)`;
    overlay.style.transition = 'clip-path 560ms cubic-bezier(.2,.9,.25,1)';
    document.body.appendChild(overlay);
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const distX = Math.max(cx, vw - cx);
    const distY = Math.max(cy, vh - cy);
    const radius = Math.hypot(distX, distY) + 20;
    requestAnimationFrame(() => { overlay.style.clipPath = `circle(${radius}px at ${cx}px ${cy}px)`; });
    const onEnd = () => {
      overlay.removeEventListener('transitionend', onEnd);
      applyTheme(nextTheme);
      overlay.style.transition = 'opacity 220ms ease';
      overlay.style.opacity = '0';
      setTimeout(() => { try { document.body.removeChild(overlay); } catch (e) {} }, 260);
    };
    overlay.addEventListener('transitionend', onEnd);
  }

  // initialize theme
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') applyTheme(saved);
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) applyTheme('dark');
    else applyTheme('light');
  } catch (e) { applyTheme('light'); }

  if (themeToggle) {
    let suppressClick = false;
    themeToggle.addEventListener('click', (e) => {
      if (suppressClick) return;
      const rect = themeToggle.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const next = root.classList.contains('dark-theme') ? 'light' : 'dark';
      closeMenu();
      revealTheme(next, cx, cy);
    });

    if (window.PointerEvent) {
      let pointerHeld = false;
      themeToggle.addEventListener('pointerdown', (e) => { e.preventDefault(); pointerHeld = true; themeToggle.classList.remove('released'); themeToggle.classList.add('pressed'); suppressClick = true; });
      document.addEventListener('pointerup', (e) => {
        if (!pointerHeld) return; pointerHeld = false; themeToggle.classList.remove('pressed'); themeToggle.classList.add('released');
        const rect = themeToggle.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const next = root.classList.contains('dark-theme') ? 'light' : 'dark';
        closeMenu(); revealTheme(next, cx, cy);
        const onAnimEnd = () => { themeToggle.removeEventListener('animationend', onAnimEnd); themeToggle.classList.remove('released'); setTimeout(() => { suppressClick = false; }, 50); };
        themeToggle.addEventListener('animationend', onAnimEnd);
      });
      themeToggle.addEventListener('pointercancel', () => { themeToggle.classList.remove('pressed'); suppressClick = false; });
    }
  }
  // Device toggle removed — no-op placeholder left intentionally.

  /* ---------- Headline per-letter animation ---------- */
  (function() {
    const h1 = document.querySelector('header h1');
    if (!h1) return;
    const text = h1.textContent.trim(); h1.textContent = '';
    const wrapper = document.createElement('span'); wrapper.className = 'headline';
    for (let i=0;i<text.length;i++){ const ch = text[i]; const span = document.createElement('span'); span.className='char'; span.textContent = ch===' ' ? '\u00A0' : ch; wrapper.appendChild(span); }
    h1.appendChild(wrapper);
    wrapper.addEventListener('pointermove', (e)=>{ const target = e.target; if (!target.classList || !target.classList.contains('char')) return; target.classList.remove('drop'); target.classList.add('rise'); clearTimeout(target._riseTimer); target._riseTimer = setTimeout(()=>target.classList.remove('rise'),300); });
    wrapper.addEventListener('pointerleave', ()=>{ const chars = Array.from(wrapper.querySelectorAll('.char')); chars.forEach((ch,i)=>{ clearTimeout(ch._dropTimer); ch._dropTimer = setTimeout(()=>{ ch.classList.remove('rise'); ch.classList.add('drop'); ch.addEventListener('animationend', function cleanup(){ ch.classList.remove('drop'); ch.removeEventListener('animationend', cleanup); }); }, i*18); }); });
  })();

  /* ---------- Custom cursor ---------- */
  (function() {
    const cursor = document.createElement('div'); cursor.className='custom-cursor hidden'; document.body.appendChild(cursor);
    let tx=-100, ty=-100, x=tx, y=ty, raf=null, visible=false; const LERP = 0.18;
    function loop(){ x += (tx-x)*LERP; y += (ty-y)*LERP; cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`; raf = requestAnimationFrame(loop); }
    function onPointerMove(e){
      // Show the custom cursor everywhere except when typing into editable fields
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) cursor.classList.add('hidden');
      else cursor.classList.remove('hidden');
      tx = e.clientX; ty = e.clientY;
      if (!visible){ visible=true; if (!raf) loop(); }
    }
    function onPointerDown(){ cursor.classList.add('shrink'); }
    function onPointerUp(){ cursor.classList.remove('shrink'); }
    function onBlur(){ cursor.classList.add('hidden'); } function onFocus(){ cursor.classList.remove('hidden'); }
    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) { document.addEventListener('pointermove', onPointerMove, { passive:true }); document.addEventListener('pointerdown', onPointerDown, { passive:true }); document.addEventListener('pointerup', onPointerUp, { passive:true }); window.addEventListener('blur', onBlur); window.addEventListener('focus', onFocus); } else { cursor.classList.add('hidden'); }
  })();

  // Expose closeMenu for other controls
  window._friendlyDisco = { closeMenu };

})();

/* ---------- Projects: expandable details toggle ---------- */
(function(){
  // Find all project view-details buttons and wire up toggle behavior
  const buttons = Array.from(document.querySelectorAll('.project .view-details'));
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const project = btn.closest('.project');
      if (!project) return;
      const details = project.querySelector('.project-details');
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        // collapse
        btn.setAttribute('aria-expanded','false');
        details.setAttribute('aria-hidden','true');
        // animate collapse by resetting max-height
        details.style.maxHeight = '0px';
      } else {
        // expand
        btn.setAttribute('aria-expanded','true');
        details.setAttribute('aria-hidden','false');
        // set max-height to scrollHeight to animate open
        details.style.maxHeight = details.scrollHeight + 'px';
        // in case images load after expansion, recompute maxHeight so the container grows to fit
        const imgs = details.querySelectorAll('img');
        imgs.forEach(img => {
          if (!img.complete) {
            const onload = () => { details.style.maxHeight = details.scrollHeight + 'px'; img.removeEventListener('load', onload); };
            img.addEventListener('load', onload);
          }
        });
        // also nudge after a short delay to catch layout changes
        setTimeout(() => { details.style.maxHeight = details.scrollHeight + 'px'; }, 120);
      }
    });
  });
})();

/* ---------- Landing-local dot canvas to ensure splash has dots even when global canvas is behind landing background ---------- */
(function(){
  const landing = document.getElementById('landing');
  if (!landing) return;
  // create a canvas inside landing to draw dots above the landing background
  let lcanvas = document.getElementById('landingDotCanvas');
  if (!lcanvas) {
    lcanvas = document.createElement('canvas');
    lcanvas.id = 'landingDotCanvas';
    lcanvas.className = 'dot-canvas-inner';
    lcanvas.setAttribute('aria-hidden','true');
    landing.insertBefore(lcanvas, landing.firstChild);
  }
  const ctx = lcanvas.getContext && lcanvas.getContext('2d');
  if (!ctx) return;

  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let w = 0, h = 0;
  const DOT_COUNT = 60;
  const PROXIMITY = 500;
  const DOTS = [];

  function rand(min,max){ return Math.random()*(max-min)+min; }

  function resize(){
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = landing.getBoundingClientRect();
    w = Math.max(0, Math.floor(rect.width));
    h = Math.max(0, Math.floor(rect.height));
    lcanvas.style.width = w + 'px'; lcanvas.style.height = h + 'px';
    lcanvas.width = Math.floor(w * dpr); lcanvas.height = Math.floor(h * dpr);
    if (DOTS.length === 0){
      for (let i=0;i<DOT_COUNT;i++) DOTS.push({ x: Math.random()*lcanvas.width, y: Math.random()*lcanvas.height, r: rand(0.8,3.2)*dpr, phase: Math.random()*Math.PI*2, speed: rand(0.2,0.9), amp: rand(6,18)*dpr });
    } else { DOTS.forEach(d => { d.x = Math.random()*lcanvas.width; d.y = Math.random()*lcanvas.height; }); }
  }

  let mouse = { x:-99999, y:-99999 };
  landing.addEventListener('pointermove', (e) => {
    const rect = lcanvas.getBoundingClientRect(); mouse.x = (e.clientX - rect.left) * dpr; mouse.y = (e.clientY - rect.top) * dpr;
  }, { passive:true });
  landing.addEventListener('pointerleave', () => { mouse.x = -99999; mouse.y = -99999; });
  landing.addEventListener('touchstart', (e) => { const t = e.touches && e.touches[0]; if (!t) return; const rect = lcanvas.getBoundingClientRect(); mouse.x = (t.clientX - rect.left) * dpr; mouse.y = (t.clientY - rect.top) * dpr; }, { passive:true });

  function parseColorToRgb(str){
    str = (str||'').trim(); if (!str) return [68,131,188]; if (str[0]==='#'){ let hex=str.slice(1); if (hex.length===3) hex=hex.split('').map(c=>c+c).join(''); const num=parseInt(hex,16); return [(num>>16)&255,(num>>8)&255,num&255]; } const m = str.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i); if (m) return [parseInt(m[1],10),parseInt(m[2],10),parseInt(m[3],10)]; return [68,131,188];
  }

  function draw(time){
    ctx.clearRect(0,0,lcanvas.width,lcanvas.height);
    const t = (time||0)/1000; const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#4483bc'; const baseRgb = parseColorToRgb(accent);
    for (let i=0;i<DOTS.length;i++){ const d=DOTS[i]; const ox=Math.sin(t*d.speed + d.phase)*d.amp; const oy=Math.cos(t*d.speed*1.12 + d.phase*1.3)*(d.amp*0.6); const px=d.x+ox; const py=d.y+oy; const dx=px-mouse.x; const dy=py-mouse.y; const dist=Math.hypot(dx,dy); const prox=PROXIMITY*dpr; let tprox=0; if (mouse.x>-9000 && dist<prox) tprox = Math.max(0,1 - (dist/prox)); const intensity = Math.pow(tprox,1.6); if (intensity>0.006){ const brightness = 0.25 + 0.75 * intensity; const blended = [ Math.round(baseRgb[0] * brightness + 255 * (1 - brightness)), Math.round(baseRgb[1] * brightness + 255 * (1 - brightness)), Math.round(baseRgb[2] * brightness + 255 * (1 - brightness)) ]; const alpha = Math.min(1, 0.12 + 0.88 * intensity); const size = d.r * (0.6 + intensity * 1.4); ctx.beginPath(); ctx.fillStyle = `rgba(${blended[0]},${blended[1]},${blended[2]},${alpha.toFixed(3)})`; ctx.arc(px, py, size, 0, Math.PI*2); ctx.fill(); }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive:true });
  resize(); requestAnimationFrame(draw);

})();
/* ---------- Header reveal on scroll past hero ---------- */
(function(){
  const root = document.documentElement;
  const header = document.querySelector('header');
  const landing = document.getElementById('landing');
  if (!header) return;
  // ensure there's a spacer element directly after the header to push content smoothly
  let spacer = document.querySelector('.header-spacer');
  if (!spacer) {
    spacer = document.createElement('div');
    spacer.className = 'header-spacer';
    header.parentNode.insertBefore(spacer, header.nextSibling);
  }
  // If there's no landing (this is a subpage like about.html), show the header immediately
  if (!landing) { root.classList.add('show-header'); spacer.classList.add('is-active'); spacer.style.height = header.offsetHeight + 'px'; return; }

  // Use IntersectionObserver on the landing section to drive a smooth, scroll-linked header reveal.
  // As landing leaves the viewport, we compute a progress value (0..1) and set header transform and spacer height.
  const thresholds = Array.from({length:101}, (_,i) => i/100);
  let currentProgress = 0;
  // initialize header offscreen by header height
  header.style.transform = `translateY(${- (header.offsetHeight || 72)}px)`;
  // prepare header h1 sizing interpolation (full -> compact)
  const headerH1 = header.querySelector('h1');
  const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const fullH1Size = 2.5 * rootFont; // matches CSS `header h1 { font-size:2.5rem; }`
  const compactH1Size = 1.1 * rootFont; // matches CSS `html.show-header header h1 { font-size:1.1rem; }`
  const io = new IntersectionObserver((entries) => {
    const e = entries[0];
    const ratio = e.intersectionRatio; // 1 when fully visible, 0 when not visible
    // progress: 0 when landing fully visible, 1 when landing gone
    const progress = Math.min(1, Math.max(0, 1 - ratio));
    currentProgress = progress;
    // translate header from -headerHeight (hidden) to 0
    const h = header.offsetHeight || 72;
    const ty = (1 - progress) * -h;
    header.style.transform = `translateY(${ty}px)`;
    // interpolate header h1 font-size smoothly between full and compact
    if (headerH1) {
      const size = fullH1Size * (1 - progress) + compactH1Size * progress;
      headerH1.style.fontSize = `${size}px`;
    }
    // spacer height matches header reveal
    spacer.style.height = `${Math.round(h * progress)}px`;
    // toggle show-header class at extremes for any style hooks
    if (progress > 0.98) root.classList.add('show-header'); else root.classList.remove('show-header');
  }, { threshold: thresholds });

  io.observe(landing);
  // ensure spacer/header stay correct on resize
  window.addEventListener('resize', () => {
    const h = header.offsetHeight || 72;
    header.style.transform = `translateY(${(1 - currentProgress) * -h}px)`;
    spacer.style.height = `${Math.round(h * currentProgress)}px`;
  }, { passive: true });
  
})();


/* ---------- Global background dot field (site-wide) ---------- */
(function(){
  // Create or reuse a single canvas that covers the viewport
  const existing = document.getElementById('bgDotCanvas') || document.getElementById('dotCanvas');
  let canvas = existing;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'bgDotCanvas';
    canvas.className = 'bg-dot-canvas';
    canvas.setAttribute('aria-hidden','true');
    document.body.insertBefore(canvas, document.body.firstChild);
  } else {
    canvas.id = 'bgDotCanvas';
    canvas.classList.add('bg-dot-canvas');
  }
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let w = 0, h = 0;
  const DOT_COUNT = 80;
  const PROXIMITY = 500; // pixels
  const DOTS = [];

  function rand(min,max){ return Math.random()*(max-min)+min; }

  function resize(){
    dpr = Math.max(1, window.devicePixelRatio || 1);
    w = Math.max(0, Math.floor(window.innerWidth));
    h = Math.max(0, Math.floor(window.innerHeight));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    if (DOTS.length === 0) {
      for (let i=0;i<DOT_COUNT;i++){
        DOTS.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, r: rand(0.8,3.2)*dpr, phase: Math.random()*Math.PI*2, speed: rand(0.2,0.9), amp: rand(6,18)*dpr });
      }
    } else {
      DOTS.forEach(d => { d.x = Math.random()*canvas.width; d.y = Math.random()*canvas.height; });
    }
  }

  let mouse = { x:-99999, y:-99999 };
  document.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr;
  }, { passive:true });
  document.addEventListener('pointerleave', () => { mouse.x = -99999; mouse.y = -99999; });
  document.addEventListener('touchstart', (e) => {
    const t = e.touches && e.touches[0]; if (!t) return; mouse.x = t.clientX * dpr; mouse.y = t.clientY * dpr;
  }, { passive:true });

  // color parser
  function parseColorToRgb(str){
    str = (str||'').trim();
    if (!str) return [68,131,188];
    if (str[0] === '#'){
      let hex = str.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
      const num = parseInt(hex,16);
      return [(num>>16)&255, (num>>8)&255, num&255];
    }
    const m = str.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return [parseInt(m[1],10), parseInt(m[2],10), parseInt(m[3],10)];
    return [68,131,188];
  }

  // animation loop
  function draw(time){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const t = (time || 0) / 1000;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#4483bc';
    const baseRgb = parseColorToRgb(accent);
    for (let i=0;i<DOTS.length;i++){
      const d = DOTS[i];
      const ox = Math.sin(t * d.speed + d.phase) * d.amp;
      const oy = Math.cos(t * d.speed * 1.12 + d.phase * 1.3) * (d.amp * 0.6);
      const px = d.x + ox;
      const py = d.y + oy;
      const dx = px - mouse.x; const dy = py - mouse.y;
      const dist = Math.hypot(dx, dy);
      const prox = PROXIMITY * dpr;
      let tprox = 0;
      if (mouse.x > -9000 && dist < prox) tprox = Math.max(0, 1 - (dist / prox));
      const intensity = Math.pow(tprox, 1.6);
      if (intensity > 0.006){
        const brightness = 0.25 + 0.75 * intensity;
        const blended = [
          Math.round(baseRgb[0] * brightness + 255 * (1 - brightness)),
          Math.round(baseRgb[1] * brightness + 255 * (1 - brightness)),
          Math.round(baseRgb[2] * brightness + 255 * (1 - brightness))
        ];
        const alpha = Math.min(1, 0.12 + 0.88 * intensity);
        const size = d.r * (0.6 + intensity * 1.4);
        ctx.beginPath(); ctx.fillStyle = `rgba(${blended[0]},${blended[1]},${blended[2]},${alpha.toFixed(3)})`;
        ctx.arc(px, py, size, 0, Math.PI*2); ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize, { passive:true });
  resize();
  requestAnimationFrame(draw);

})();

/* ---------- Page navigation animations (slide between pages) ---------- */
(function(){
  const root = document.documentElement;
  // On load: if navigation flag set, run enter animation
  const navAnim = sessionStorage.getItem('nav-anim');
  if (navAnim) {
    if (navAnim === 'enter-from-right') root.classList.add('anim-enter-from-right');
    if (navAnim === 'enter-from-left') root.classList.add('anim-enter-from-left');
    // trigger active state to animate to place
    requestAnimationFrame(() => {
      root.classList.add('anim-enter-active');
      root.classList.remove('anim-enter-from-right');
      root.classList.remove('anim-enter-from-left');
    });
    // cleanup after animation
    setTimeout(() => { root.classList.remove('anim-enter-active'); sessionStorage.removeItem('nav-anim'); }, 520);
  }

  // Intercept internal link clicks for animated transitions
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    // ignore anchors and external links and downloads
    if (href.startsWith('#') || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return; // external
    // only animate for internal html pages (index.html, about.html or root)
    const toAbout = url.pathname.endsWith('about.html');
    const toIndex = url.pathname.endsWith('index.html') || url.pathname === '/';
    if (!toAbout && !toIndex) return;
    e.preventDefault();
    // set enter animation for destination
    if (toAbout) sessionStorage.setItem('nav-anim', 'enter-from-right'); else sessionStorage.setItem('nav-anim', 'enter-from-left');
    // run exit animation on current page
    if (toAbout) root.classList.add('anim-exit-left'); else root.classList.add('anim-exit-right');
    setTimeout(() => { window.location.href = url.href; }, 420);
  });

  // Back button handler (on about.html)
  const backBtn = document.getElementById('backButton');
  if (backBtn) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sessionStorage.setItem('nav-anim', 'enter-from-left');
      root.classList.add('anim-exit-right');
      setTimeout(() => { window.location.href = 'index.html'; }, 420);
    });
  }

})();
