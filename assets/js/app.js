/* Nur Ifran Arpon — v2 engine.
   - a live light field (raw WebGL, no library) that takes each page's colours
   - Hold Space (or hold the Menu button) for a ring of pages under the pointer, the way Spaceadom works
   - page-to-page transitions: the clicked picture grows into the next page's cover, no reloads
   - scroll scenes per page
   Works without JavaScript (plain pages and links) and respects prefers-reduced-motion. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var desk = function () { return window.innerWidth > 900; };
  var gsap = window.gsap, ST = window.ScrollTrigger;
  if (gsap && ST) gsap.registerPlugin(ST);

  /* ================= colours ================= */
  var LOOKS = {
    navy: { bg: '#050a18', bg2: '#0a1328', bg3: '#111c38', line: '#1c2748', ink: '#eef1fb', ink2: '#a6aecb', ink3: '#7e88aa', accent: '#8ea2ff', glow: '#3b5bdb' },
    black: { bg: '#0b0b0c', bg2: '#141415', bg3: '#1c1c1e', line: '#2a2a2d', ink: '#f3f3f4', ink2: '#a9a9ae', ink3: '#7d7d83', accent: '#c9d2ff', glow: '#3a3a48' }
  };
  var VARS = { bg: '--bg', bg2: '--bg-2', bg3: '--bg-3', line: '--line', ink: '--ink', ink2: '--ink-2', ink3: '--ink-3', accent: '--accent', glow: '--glow' };
  var look = function () { return root.getAttribute('data-theme') === 'black' ? 'black' : 'navy'; };
  var pagePalette = null; // set by product pages
  var current = {};       // the colours on screen right now (the field reads these)
  // colours arrive as "#3b5bdb" or, mid-tween, as "rgba(54,82,201,1)"; both must parse, or the field draws garbage (it flashed green)
  var lastRGB = {};
  function hex(h, key) {
    var v = null, m = /^rgba?\(([^)]+)\)/i.exec(h || '');
    if (m) { var p = m[1].split(',').map(parseFloat); v = [p[0] / 255, p[1] / 255, p[2] / 255]; }
    else if (/^#?[0-9a-f]{6}$/i.test(h || '')) { h = h.replace('#', ''); v = [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }
    if (!v || v.some(isNaN)) return lastRGB[key] || [0.02, 0.04, 0.09];
    lastRGB[key] = v; return v;
  }
  function target() { var p = {}, base = LOOKS[look()]; for (var k in VARS) p[k] = (pagePalette && pagePalette[k]) || (pagePalette && k === 'bg2' && pagePalette.bg3) || base[k]; return p; }
  function paint(instant) {
    var t = target();
    if (!gsap || instant || reduce) {
      for (var k in VARS) { if (pagePalette) root.style.setProperty(VARS[k], t[k]); else root.style.removeProperty(VARS[k]); current[k] = t[k]; }
      return;
    }
    var o = { duration: 1.1, ease: 'power2.out', overwrite: true };
    for (var k2 in VARS) o[VARS[k2]] = t[k2];
    o.onUpdate = function () { var cs = getComputedStyle(root); for (var k in VARS) current[k] = cs.getPropertyValue(VARS[k]).trim() || t[k]; };
    o.onComplete = function () { if (!pagePalette) for (var k in VARS) root.style.removeProperty(VARS[k]); for (var k3 in VARS) current[k3] = t[k3]; };
    gsap.to(root, o);
  }
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function setLook(v) {
    root.setAttribute('data-theme', v);
    try { localStorage.setItem('arpon-look', v); } catch (e) {}
    if (themeMeta) themeMeta.setAttribute('content', LOOKS[v].bg);
    paint();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.look'); if (!b) return;
    setLook(look() === 'navy' ? 'black' : 'navy');
  });

  /* ================= the light field ================= */
  var field = (function () {
    var cv = document.getElementById('field');
    if (!cv) return null;
    // alpha stays ON: an opaque full-screen canvas can be handed to the graphics card as a video overlay, and some
    // Windows GPUs then read its colours as YUV, which turns dark navy into bright green (seen on Nur's own laptop)
    var gl = cv.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
    if (!gl) return null;
    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = [
      'precision mediump float;',
      'uniform vec2 r;uniform float t;uniform vec2 m;uniform vec3 c0;uniform vec3 c1;uniform vec3 c2;uniform float s;',
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
      'float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
      'void main(){vec2 uv=gl_FragCoord.xy/r;vec2 q=uv;q.x*=r.x/r.y;float tt=t*.035;',
      'vec2 w=vec2(fb(q*1.3+vec2(tt,-tt*.6)),fb(q*1.3+vec2(-tt*.8,tt)+4.1));',
      'float f=fb(q*1.6+w*1.8+vec2(0.,tt*.5));',
      'vec2 mm=m;mm.x*=r.x/r.y;float d=distance(q,mm);float spot=exp(-d*d*5.5)*.55*s;',
      'float band=smoothstep(.35,.95,f)*(.55+.45*uv.y);',
      'vec3 col=c0;col=mix(col,c1,band*.42);col+=c2*spot*.35;col+=c1*spot*.25;',
      'float v=smoothstep(1.35,.25,distance(uv,vec2(.5,.62)));col*=mix(.82,1.,v);',
      'gl_FragColor=vec4(col,1.);}'
    ].join('\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {}; ['r', 't', 'm', 'c0', 'c1', 'c2', 's'].forEach(function (k) { U[k] = gl.getUniformLocation(pr, k); });
    var scale = desk() ? 0.5 : 0.35, mx = 0.7, my = 0.6, tx = 0.7, ty = 0.6, strength = fine ? 1 : 0.6, t0 = performance.now(), running = true;
    function size() { cv.width = Math.max(2, Math.round(innerWidth * scale)); cv.height = Math.max(2, Math.round(innerHeight * scale)); gl.viewport(0, 0, cv.width, cv.height); }
    size(); addEventListener('resize', size);
    addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth; ty = 1 - e.clientY / innerHeight; }, { passive: true });
    document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) requestAnimationFrame(frame); });
    function frame(now) {
      if (!running) return;
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      var c = current.bg ? current : LOOKS[look()];
      gl.uniform2f(U.r, cv.width, cv.height);
      gl.uniform1f(U.t, reduce ? 12 : (now - t0) / 1000);
      gl.uniform2f(U.m, mx, my);
      gl.uniform3fv(U.c0, hex(c.bg, 'bg')); gl.uniform3fv(U.c1, hex(c.glow || c.bg3, 'glow')); gl.uniform3fv(U.c2, hex(c.accent, 'accent'));
      gl.uniform1f(U.s, strength);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduce) requestAnimationFrame(frame);
    }
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; });
    cv.addEventListener('webglcontextrestored', function () { location.reload(); });
    requestAnimationFrame(frame);
    return { redraw: function () { if (reduce) requestAnimationFrame(frame); } };
  })();

  /* ================= smooth scroll ================= */
  var lenis = null;
  if (gsap && ST && !reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToY(y, now) { if (lenis) lenis.scrollTo(y, { immediate: !!now, duration: 1.4 }); else window.scrollTo({ top: y, behavior: now || reduce ? 'auto' : 'smooth' }); }
  function scrollToHash(h, now) { var el = h && document.querySelector(h); if (el) scrollToY(el.getBoundingClientRect().top + scrollY - (desk() ? 40 : 20), now); }

  /* ================= frame: shade under the name once you scroll, corner notes only at the top ================= */
  var frameEl = document.querySelector('.frame');
  function onScrollFrame() {
    if (!frameEl) return;
    var y = scrollY;
    frameEl.style.setProperty('--top-shade', y > 40 ? 1 : 0);
    frameEl.classList.toggle('quiet', y > innerHeight * 0.35);
  }
  addEventListener('scroll', onScrollFrame, { passive: true }); onScrollFrame();

  /* ================= clock ================= */
  var clock = document.querySelector('[data-clock]');
  function tick() {
    if (!clock) return;
    try {
      var f = new Intl.DateTimeFormat('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Australia/Melbourne', timeZoneName: 'short' }).formatToParts(new Date());
      var hh = '', mi = '', tz = '';
      f.forEach(function (p) { if (p.type === 'hour') hh = p.value; if (p.type === 'minute') mi = p.value; if (p.type === 'timeZoneName') tz = p.value; });
      clock.textContent = 'My time ' + hh + ':' + mi + ' ' + tz;
    } catch (e) { clock.textContent = ''; }
  }
  tick(); setInterval(tick, 20000);

  /* ================= email (assembled here, never in the HTML) ================= */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-email]'); if (!b) return;
    var addr = ['nurifran2005', 'gmail.com'].join('@');
    var out = document.querySelector('[data-email-out]');
    if (out) { out.textContent = ''; out.appendChild(document.createTextNode('Email: ')); var a = document.createElement('a'); a.href = 'mailto:' + addr; a.textContent = addr; out.appendChild(a); }
    window.location.href = 'mailto:' + addr + '?subject=' + encodeURIComponent('Hello from your website');
  });

  /* ================= the Space ring ================= */
  var ring = (function () {
    var el = document.getElementById('ringNav'); if (!el) return null;
    var hub = el.querySelector('.hub'), beam = el.querySelector('.beam');
    var items = [].slice.call(el.querySelectorAll('.item'));
    var hot = -1, open = false, mode = 'hold', px = innerWidth / 2, py = innerHeight / 2, R = 150;
    function place(x, y) {
      R = desk() ? 160 : Math.min(130, innerWidth * 0.32);
      var m = R + 70;
      x = Math.min(Math.max(x, m), innerWidth - m); y = Math.min(Math.max(y, m), innerHeight - m);
      el.style.setProperty('--rx', x + 'px'); el.style.setProperty('--ry', y + 'px');
      items.forEach(function (it, i) {
        var a = -Math.PI / 2 + i * (2 * Math.PI / items.length);
        it._a = a;
        var a2 = it.querySelector('a');
        a2.style.setProperty('--x', Math.cos(a) * R + 'px'); a2.style.setProperty('--y', Math.sin(a) * R + 'px');
        a2.style.setProperty('--d', (i * 0.03) + 's');
      });
      el._cx = x; el._cy = y;
    }
    function setHot(i) {
      if (i === hot) return;
      hot = i;
      items.forEach(function (it, k) { it.querySelector('a').classList.toggle('hot', k === i); });
      if (i < 0) { beam.style.width = '0'; return; }
      var a = items[i]._a;
      beam.style.width = (R - 40) + 'px'; beam.style.transform = 'rotate(' + a + 'rad)';
    }
    function show(x, y, how) {
      mode = how; place(x, y); el.classList.add('open'); open = true; setHot(-1);
      el.setAttribute('aria-hidden', 'false');
      if (how === 'click') { var f = el.querySelector('.item a'); if (f) f.focus({ preventScroll: true }); }
    }
    function hide() { el.classList.remove('open'); open = false; setHot(-1); el.setAttribute('aria-hidden', 'true'); }
    function pick(x, y) {
      var dx = x - el._cx, dy = y - el._cy;
      if (Math.hypot(dx, dy) < 44) { setHot(-1); return; }
      var ang = Math.atan2(dy, dx), best = -1, bd = 9;
      items.forEach(function (it, i) { var d = Math.abs(Math.atan2(Math.sin(ang - it._a), Math.cos(ang - it._a))); if (d < bd) { bd = d; best = i; } });
      setHot(best);
    }
    function go() { var i = hot; hide(); if (i >= 0) navigate(items[i].querySelector('a').getAttribute('href')); }
    addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; if (open && mode !== 'click') pick(px, py); }, { passive: true });

    // keyboard: hold Space opens it under the pointer; a quick tap still scrolls the page
    var timer = null, held = false;
    function typing(t) { return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
    addEventListener('keydown', function (e) {
      if (e.code !== 'Space' || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest && e.target.closest('button, a') && !open) return; // let Space press buttons
      e.preventDefault();
      if (e.repeat) return;
      held = false;
      timer = setTimeout(function () { held = true; show(px, py, 'hold'); }, 200);
    });
    addEventListener('keyup', function (e) {
      if (e.code !== 'Space' || typing(e.target)) return;
      if (timer) { clearTimeout(timer); timer = null; }
      if (held) { held = false; go(); return; }
      if (!open && !(e.target.closest && e.target.closest('button, a')) && !(!e.shiftKey && pullNudge && pullNudge())) scrollToY(scrollY + innerHeight * (e.shiftKey ? -0.8 : 0.8));
    });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) hide(); });

    // the Menu button: tap = ring you can click; press and hold = drag to an item and let go
    document.querySelectorAll('[data-ring]').forEach(function (b) {
      var lp = null, dragging = false;
      b.addEventListener('pointerdown', function (e) {
        dragging = false;
        lp = setTimeout(function () { dragging = true; show(innerWidth / 2, innerHeight / 2, 'drag'); b.setPointerCapture && b.setPointerCapture(e.pointerId); }, 260);
      });
      b.addEventListener('pointermove', function (e) { if (dragging) pick(e.clientX, e.clientY); });
      b.addEventListener('pointerup', function (e) {
        clearTimeout(lp);
        if (dragging) { dragging = false; go(); e.preventDefault(); return; }
        if (open) hide(); else show(innerWidth / 2, innerHeight / 2, 'click');
      });
      b.addEventListener('pointercancel', function () { clearTimeout(lp); dragging = false; });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); show(innerWidth / 2, innerHeight / 2, 'click'); } });
    });
    el.querySelector('.veil').addEventListener('click', hide);
    var cl = el.querySelector('.close'); if (cl) cl.addEventListener('click', hide);
    el.querySelectorAll('.item a').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); var h = a.getAttribute('href'); hide(); navigate(h); }); });
    return { hide: hide };
  })();

  /* ================= page transitions ================= */
  var busy = false;
  function sameSite(u) { try { var x = new URL(u, location.href); return x.origin === location.origin; } catch (e) { return false; } }
  function samePage(u) { var x = new URL(u, location.href); return x.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, ''); }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download') || a.closest('#ringNav')) return;
    var href = a.getAttribute('href');
    if (!href || href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
    if (!sameSite(href)) return;
    e.preventDefault();
    var img = flipImg(a);
    navigate(href, img);
  });
  window.addEventListener('popstate', function () { load(location.href, null, false); });

  function navigate(href, fromImg) {
    var u = new URL(href, location.href);
    if (samePage(u.href)) { if (u.hash) { scrollToHash(u.hash); history.replaceState(null, '', u.hash); } else scrollToY(0); return; }
    load(u.href, fromImg, true);
  }

  function load(url, fromImg, push) {
    if (busy) return; busy = true;
    if (ring) ring.hide();
    var ghost = null, wipe = null;
    var fetching = fetch(url, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
    var out;
    if (!gsap || reduce) out = Promise.resolve();
    else if (fromImg) {
      var r0 = fromImg.getBoundingClientRect();
      ghost = document.createElement('div'); ghost.className = 'flip-ghost';
      ghost.style.cssText = 'left:' + r0.left + 'px;top:' + r0.top + 'px;width:' + r0.width + 'px;height:' + r0.height + 'px';
      var gi = new Image(); gi.src = fromImg.currentSrc || fromImg.src; gi.alt = ''; ghost.appendChild(gi);
      document.body.appendChild(ghost);
      out = new Promise(function (res) {
        gsap.to('main', { opacity: 0, duration: 0.35, ease: 'power1.out' });
        gsap.to(ghost, { left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: 0, duration: 0.8, ease: 'expo.inOut', onComplete: res });
      });
    } else {
      wipe = document.createElement('div'); wipe.className = 'wipe'; document.body.appendChild(wipe);
      out = new Promise(function (res) { gsap.to(wipe, { yPercent: -100, duration: 0.6, ease: 'expo.inOut', onComplete: res }); });
    }
    Promise.all([fetching, out]).then(function (v) {
      var doc = new DOMParser().parseFromString(v[0], 'text/html');
      var nm = doc.querySelector('main'); if (!nm) throw new Error('no main');
      document.title = doc.title;
      ['description'].forEach(function (n) { var a = document.querySelector('meta[name="' + n + '"]'), b = doc.querySelector('meta[name="' + n + '"]'); if (a && b) a.setAttribute('content', b.getAttribute('content')); });
      var ca = document.querySelector('link[rel="canonical"]'), cb = doc.querySelector('link[rel="canonical"]'); if (ca && cb) ca.href = cb.href;
      teardown();
      document.querySelector('main').replaceWith(nm);
      document.body.setAttribute('data-page', doc.body.getAttribute('data-page') || '');
      var pal = doc.body.getAttribute('data-palette'); document.body.setAttribute('data-palette', pal || '');
      document.body.setAttribute('style', doc.body.getAttribute('style') || '');
      if (push) history.pushState(null, '', url);
      window.scrollTo(0, 0); if (lenis) lenis.scrollTo(0, { immediate: true });
      setPalette(); paint();
      init(true);
      var hash = new URL(url).hash;
      return new Promise(function (res) {
        if (ghost) {
          var tgt = document.querySelector('[data-hero-media]');
          gsap.set('main', { opacity: 1 });
          if (tgt) {
            var r1 = tgt.getBoundingClientRect();
            gsap.set(tgt, { opacity: 0 });
            gsap.to(ghost, { left: r1.left, top: r1.top, width: r1.width, height: r1.height, borderRadius: 22, duration: 0.9, ease: 'expo.inOut', onComplete: function () { gsap.set(tgt, { opacity: 1 }); ghost.remove(); res(); } });
          } else gsap.to(ghost, { opacity: 0, duration: 0.5, onComplete: function () { ghost.remove(); res(); } });
        } else if (wipe) {
          gsap.to(wipe, { yPercent: -200, duration: 0.7, ease: 'expo.inOut', onComplete: function () { wipe.remove(); res(); } });
        } else res();
      }).then(function () { busy = false; if (hash) setTimeout(function () { scrollToHash(hash); }, 60); });
    }).catch(function () { location.href = url; });
  }
  function flipImg(a) {
    var c = [].slice.call(a.querySelectorAll('[data-flip] img, img[data-flip]'));
    if (a.hasAttribute('data-flip')) c = c.concat([].slice.call(a.querySelectorAll('img')));
    for (var i = 0; i < c.length; i++) { var r = c[i].getBoundingClientRect(); if (r.width > 20 && r.bottom > 0 && r.top < innerHeight) return c[i]; }
    if (a.hasAttribute('data-flip-src')) { var hv = document.querySelector('.hover-img'); var h = hv && hv.querySelector('img.on'); if (h && parseFloat(getComputedStyle(hv).opacity) > 0.3) return h; }
    return null;
  }

  /* ================= per-page scenes ================= */
  var cleanups = [];
  function teardown() { if (ST) ST.getAll().forEach(function (s) { s.kill(); }); cleanups.forEach(function (f) { try { f(); } catch (e) {} }); cleanups = []; }
  function setPalette() { var p = document.body.getAttribute('data-palette'); try { pagePalette = p ? JSON.parse(p) : null; } catch (e) { pagePalette = null; } }

  function splitWords(el) {
    var parts = el.textContent.trim().split(/\s+/), out = [];
    el.textContent = '';
    parts.forEach(function (w, i) { var s = document.createElement('span'); s.className = 'w'; s.textContent = w; el.appendChild(s); if (i < parts.length - 1) el.appendChild(document.createTextNode(' ')); out.push(s); });
    return out;
  }
  function splitChars(el) {
    var t = el.textContent; el.textContent = '';
    var out = [];
    for (var i = 0; i < t.length; i++) { var s = document.createElement('span'); s.className = 'ch'; s.textContent = t[i] === ' ' ? ' ' : t[i]; el.appendChild(s); out.push(s); }
    return out;
  }

  function common(fromSwap) {
    // reveals
    if (!gsap || !ST) { document.querySelectorAll('.rv').forEach(function (e) { e.style.opacity = 1; e.style.transform = 'none'; }); return; }
    if (reduce) gsap.set('.rv', { opacity: 1, y: 0 });
    else ST.batch('.rv', { start: 'top 90%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.07 }); } });
    // words that light up as you read
    document.querySelectorAll('[data-words]').forEach(function (p) {
      var ws = splitWords(p);
      if (reduce) { ws.forEach(function (w) { w.classList.add('on'); }); return; }
      ST.create({ trigger: p, start: 'top 82%', end: 'bottom 50%', scrub: true, onUpdate: function (s) { var k = Math.round(s.progress * ws.length); ws.forEach(function (w, i) { w.classList.toggle('on', i < k); }); } });
    });
    // big name letters
    document.querySelectorAll('[data-chars]').forEach(function (h) {
      var cs = [];
      h.querySelectorAll('.ln > span').forEach(function (l) { cs = cs.concat(splitChars(l)); });
      if (reduce) return;
      gsap.from(cs, { yPercent: 115, rotate: 6, duration: 1.3, ease: 'expo.out', stagger: 0.035, delay: fromSwap ? 0.25 : (document.querySelector('.loader') ? 1.9 : 0.2) });
      if (fine) {
        var onMove = function (e) {
          cs.forEach(function (c) {
            var r = c.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.hypot(dx, dy);
            var k = Math.max(0, 1 - d / 260);
            gsap.to(c, { y: -k * 26, duration: 0.5, ease: 'power3.out', overwrite: 'auto' }); c.classList.toggle('hot', k > 0.35);
          });
        };
        addEventListener('pointermove', onMove, { passive: true });
        cleanups.push(function () { removeEventListener('pointermove', onMove); });
      }
    });
    // the photo: a mosaic of my work flips, tile by tile, into me
    document.querySelectorAll('.photo[data-front]').forEach(function (f) {
      if (reduce) return;
      var img = f.querySelector('img');
      var front = f.getAttribute('data-front');
      var cols = desk() ? 8 : 6, rows = Math.round(cols * 1.25);
      var grid = document.createElement('div'); grid.className = 'flip-grid';
      grid.style.setProperty('--cols', cols); grid.style.setProperty('--rows', rows);
      var tiles = [], size = (cols * 100) + '% ' + (rows * 100) + '%';
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var t = document.createElement('span'); t.className = 'flip';
        var pos = (c / (cols - 1) * 100) + '% ' + (r / (rows - 1) * 100) + '%';
        t.innerHTML = '<i class="f" style="background-image:url(' + front + ');background-size:' + size + ';background-position:' + pos + '"></i><i class="b" style="background-image:url(' + img.getAttribute('src') + ');background-size:' + size + ';background-position:' + pos + '"></i>';
        t._d = Math.hypot(c - (cols - 1) / 2, r - (rows - 1) * 0.35);
        tiles.push(t); grid.appendChild(t);
      }
      [[0, 'tl'], [cols - 1, 'tr'], [(rows - 1) * cols, 'bl'], [rows * cols - 1, 'br']].forEach(function (k) { tiles[k[0]].classList.add(k[1]); });
      var maxD = Math.max.apply(null, tiles.map(function (t) { return t._d; }));
      f.appendChild(grid); f.classList.add('tiled');
      var tl = gsap.timeline({ scrollTrigger: { trigger: f, start: 'top 85%', end: 'top 25%', scrub: 0.9 } });
      tiles.forEach(function (t) {
        var at = (t._d / maxD) * 0.55;
        tl.fromTo(t, { rotateY: 0, z: 0 }, { rotateY: 180, duration: 0.45, ease: 'power2.inOut' }, at).to(t, { z: 80, duration: 0.22, ease: 'power1.out', yoyo: true, repeat: 1 }, at);
      });
      tl.to(img, { opacity: 1, duration: 0.04, ease: 'none' }, 1.0).to(grid, { opacity: 0, duration: 0.04, ease: 'none' }, 1.02);
    });
    // magnetic buttons
    if (fine && !reduce) document.querySelectorAll('.btn, .pill-btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.16, y: (e.clientY - r.top - r.height / 2) * 0.28, duration: 0.4, ease: 'power3.out' }); });
      b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.45)' }); });
    });
  }

  function home() {
    // work index: list with a picture that follows the pointer, or a 3D ring
    var list = document.querySelector('.wlist'), hv = document.querySelector('.hover-img'), wr = document.querySelector('.wring');
    if (list && hv && fine && gsap && !reduce) {
      var qx = gsap.quickTo(hv, 'x', { duration: 0.6, ease: 'power3' }), qy = gsap.quickTo(hv, 'y', { duration: 0.6, ease: 'power3' });
      var imgs = hv.querySelectorAll('img');
      var mv = function (e) { qx(e.clientX); qy(e.clientY); };
      addEventListener('pointermove', mv, { passive: true });
      cleanups.push(function () { removeEventListener('pointermove', mv); gsap.set(hv, { opacity: 0 }); });
      // the picture follows whatever row is under the pointer RIGHT NOW: scrolling moves rows out from under a
      // still mouse without any pointerleave, so it is re-checked on scroll too (it used to hang on screen)
      var rows = [].slice.call(list.querySelectorAll('.wrow')), shown = -1, lx = -1, ly = -1;
      function sync() {
        var el = lx < 0 || list.classList.contains('hidden') ? null : document.elementFromPoint(lx, ly);
        var row = el && el.closest ? el.closest('.wrow') : null, i = row ? rows.indexOf(row) : -1;
        if (i === shown) return;
        shown = i;
        if (i < 0) { gsap.to(hv, { opacity: 0, scale: 0.85, duration: 0.3, overwrite: 'auto' }); return; }
        imgs.forEach(function (im, k) { im.classList.toggle('on', k === i); });
        gsap.to(hv, { opacity: 1, scale: 1, rotate: (i % 2 ? 3 : -3), duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
      }
      var pm = function (e) { lx = e.clientX; ly = e.clientY; sync(); };
      var out = function () { lx = -1; sync(); };
      addEventListener('pointermove', pm, { passive: true });
      addEventListener('scroll', sync, { passive: true });
      document.documentElement.addEventListener('pointerleave', out);
      cleanups.push(function () { removeEventListener('pointermove', pm); removeEventListener('scroll', sync); document.documentElement.removeEventListener('pointerleave', out); });
    }
    var vb = document.querySelectorAll('.views button');
    vb.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-view');
        vb.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        list.classList.toggle('hidden', v !== 'list'); wr.classList.toggle('active', v === 'ring');
        try { sessionStorage.setItem('arpon-view', v); } catch (e) {}
        if (v === 'ring') ringScene(); ST && ST.refresh();
      });
    });
    var saved = null; try { saved = sessionStorage.getItem('arpon-view'); } catch (e) {}
    if (saved === 'ring') { var rb = document.querySelector('.views [data-view="ring"]'); if (rb) rb.click(); }

    var ringBuilt = false;
    function ringScene() {
      if (ringBuilt || !wr) return; ringBuilt = true;
      var cam = wr.querySelector('.cam'), rg = wr.querySelector('.rg'), cvs = [].slice.call(wr.querySelectorAll('.cv'));
      var n = cvs.length, step = 360 / n, rot = 0, vel = 0, cw = 0, R = 0, down = false, lx = 0, moved = 0;
      function lay() {
        cw = desk() ? Math.min(340, innerWidth * 0.22) : Math.min(220, innerWidth * 0.52);
        R = Math.round(cw * 1.1 / (2 * Math.tan(Math.PI / n)));
        cvs.forEach(function (c, i) { c.style.setProperty('--cw', cw + 'px'); c.style.transform = 'rotateY(' + (i * step) + 'deg) translateZ(' + R + 'px)'; });
      }
      lay(); addEventListener('resize', lay);
      var spin = reduce ? 0 : 6;
      var tk = function (t, dt) { if (!down) { rot -= spin * dt / 1000; rot += vel; vel *= 0.94; } cam.style.transform = 'translateZ(' + (-R * 1.15) + 'px) rotateX(-8deg)'; rg.style.transform = 'rotateY(' + rot + 'deg)'; };
      gsap.ticker.add(tk); cleanups.push(function () { gsap.ticker.remove(tk); removeEventListener('resize', lay); });
      wr.addEventListener('pointerdown', function (e) { down = true; lx = e.clientX; moved = 0; });
      addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - lx; lx = e.clientX; moved += Math.abs(dx); rot += dx * 0.25; vel = dx * 0.08; });
      addEventListener('pointerup', function () { down = false; });
      cvs.forEach(function (c) { c.addEventListener('click', function (e) { if (moved > 8) { e.preventDefault(); e.stopPropagation(); } }, true); });
    }
    // the hero recedes as you scroll on
    if (gsap && ST && !reduce) {
      gsap.to('.hero h1', { yPercent: -18, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
  }

  function project() {
    // the film: pinned frames that change with captions as you scroll
    document.querySelectorAll('.film').forEach(function (fm) {
      var frames = [].slice.call(fm.querySelectorAll('.film-frames img'));
      var caps = [].slice.call(fm.querySelectorAll('.cap'));
      var dots = [].slice.call(fm.querySelectorAll('.film-dots b'));
      var n = Math.max(frames.length, caps.length);
      if (!gsap || !ST || reduce || !desk() || n < 2) return;
      fm.style.height = (100 + n * 70) + 'vh';
      var tl = gsap.timeline({ scrollTrigger: { trigger: fm, start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
      tl.fromTo(fm.querySelector('.film-frames'), { scale: 0.86, rotateX: 10, transformPerspective: 1400 }, { scale: 1, rotateX: 0, duration: 0.6, ease: 'power2.out' }, 0);
      for (var i = 1; i < n; i++) {
        var at = i;
        if (frames[i]) tl.fromTo(frames[i], { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.25, ease: 'power1.inOut' }, at - 0.15);
        if (frames[i - 1]) tl.to(frames[i - 1], { opacity: 0, duration: 0.25 }, at - 0.15);
        if (caps[i]) tl.fromTo(caps[i], { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25 }, at - 0.1);
        if (caps[i - 1]) tl.to(caps[i - 1], { opacity: 0, y: -30, duration: 0.2 }, at - 0.2);
      }
      dots.forEach(function (d, i) { tl.fromTo(d, { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'none' }, i); });
      tl.to({}, { duration: 0.4 });
    });
    if (gsap && ST && !reduce) {
      var cv = document.querySelector('.p-cover img');
      if (cv) gsap.to(cv, { yPercent: 12, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.p-hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
  }

  function journey() {
    var tl = document.querySelector('.tl'), track = tl && tl.querySelector('.tl-track'), bar = tl && tl.querySelector('.tl-progress');
    if (!tl || !gsap || !ST || reduce) return;
    var mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', function () {
      tl.classList.add('horizontal');
      var dist = function () { return Math.max(0, track.scrollWidth - innerWidth + 140); };
      tl.style.setProperty('--tl-h', 'calc(100vh + ' + dist() + 'px)');
      var tw = gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: tl, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true, onUpdate: function (s) { if (bar) bar.style.width = s.progress * 100 + '%'; } } });
      return function () { tl.classList.remove('horizontal'); tl.style.removeProperty('--tl-h'); gsap.set(track, { clearProps: 'x' }); tw.kill(); };
    });
    cleanups.push(function () { mm.revert(); });
  }

  // keep scrolling: once you have reached the very bottom and stopped, scrolling on pulls the next page in
  var pullEl = null, pullNudge = null;
  function pullNext() {
    pullNudge = null;
    var nx = document.querySelector('main .next[href]');
    if (!nx) return;
    if (!pullEl) {
      pullEl = document.createElement('div'); pullEl.className = 'pull'; pullEl.setAttribute('aria-hidden', 'true');
      pullEl.innerHTML = '<span class="mono"></span><i><b></b></i>';
      document.body.appendChild(pullEl);
    }
    var fill = pullEl.querySelector('b'), nimg = nx.querySelector('.nimg');
    pullEl.querySelector('span').textContent = 'Keep scrolling · ' + (nx.querySelector('.nt') || nx).textContent.replace(/→/g, '').trim();
    var p = 0, armed = false, lastWheel = 0, lastIn = 0, raf = 0, gone = false, ty = null, tArmed = false;
    function atEnd() { return scrollY + innerHeight >= document.documentElement.scrollHeight - 4; }
    function draw() {
      fill.style.transform = 'scaleX(' + p + ')';
      pullEl.classList.toggle('on', atEnd() || p > 0);
      if (nimg && !reduce) { nimg.style.transition = 'transform .25s ease-out'; nimg.style.transform = p > 0 ? 'scale(' + (1 + p * 0.2) + ') rotate(' + (-4 * p) + 'deg)' : ''; }
    }
    function decay() {
      if (raf) return;
      raf = requestAnimationFrame(function step() {
        raf = 0; if (gone) return;
        if (performance.now() - lastIn > 450 && p > 0) { p = Math.max(0, p - 0.035); draw(); }
        if (p > 0) raf = requestAnimationFrame(step);
      });
    }
    function add(d) {
      if (gone || busy) return;
      p = Math.max(0, Math.min(1, p + d)); lastIn = performance.now(); draw(); decay();
      if (p >= 1) { gone = true; navigate(nx.getAttribute('href'), flipImg(nx)); }
    }
    var wh = function (e) {
      var now = performance.now(), dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1), quiet = now - lastWheel > 220;
      lastWheel = now;
      if (!atEnd()) { armed = false; return; }
      if (!armed) { if (!quiet) return; armed = true; }   // the fling that brought you here does not count
      add(dy > 0 ? Math.min(dy, 140) / 420 : dy / 200);   // at least three wheel notches, however hard the flick
    };
    var sc = function () { if (!atEnd()) { armed = false; if (p) { p = 0; } } draw(); };
    var ts = function (e) { ty = e.touches[0].clientY; tArmed = atEnd(); };
    var tm = function (e) { if (ty === null || !tArmed) return; var y = e.touches[0].clientY, d = ty - y; ty = y; add(d > 0 ? d / 170 : d / 120); };
    var te = function () { ty = null; };
    var kd = function (e) { if (/^(ArrowDown|PageDown|End)$/.test(e.key) && atEnd() && !(e.target.closest && e.target.closest('input, textarea, select'))) add(0.34); };
    pullNudge = function () { if (!atEnd()) return false; add(0.34); return true; };
    addEventListener('wheel', wh, { passive: true });
    addEventListener('scroll', sc, { passive: true });
    addEventListener('touchstart', ts, { passive: true });
    addEventListener('touchmove', tm, { passive: true });
    addEventListener('touchend', te, { passive: true });
    addEventListener('keydown', kd);
    draw();
    cleanups.push(function () {
      gone = true; pullNudge = null;
      removeEventListener('wheel', wh); removeEventListener('scroll', sc); removeEventListener('touchstart', ts);
      removeEventListener('touchmove', tm); removeEventListener('touchend', te); removeEventListener('keydown', kd);
      pullEl.classList.remove('on'); fill.style.transform = 'scaleX(0)';
    });
  }

  function init(fromSwap) {
    var page = document.body.getAttribute('data-page');
    common(fromSwap);
    pullNext();
    if (page === 'home') home();
    if (page === 'project') project();
    if (page === 'journey') journey();
    if (ST) { ST.refresh(); setTimeout(function () { ST.refresh(); }, 400); }
    if (field) field.redraw();
  }

  /* ================= first load ================= */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  setPalette(); paint(true);
  var loader = document.querySelector('.loader');
  var seen = false; try { seen = sessionStorage.getItem('arpon-seen') === '1'; sessionStorage.setItem('arpon-seen', '1'); } catch (e) {}
  if (loader && (seen || reduce || !gsap)) { loader.remove(); loader = null; }
  if (loader) {
    var cnt = loader.querySelector('.count'), bar = loader.querySelector('.bar'), ln = loader.querySelector('.lname');
    var chs = splitChars(ln);
    var o = { v: 0 };
    gsap.timeline({ onComplete: function () { loader.remove(); } })
      .from(chs, { yPercent: 120, duration: 0.9, ease: 'expo.out', stagger: 0.03 }, 0)
      .to(o, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: function () { var k = Math.round(o.v); cnt.textContent = String(k).padStart(3, '0'); bar.style.width = k + '%'; } }, 0)
      .to(chs, { yPercent: -120, duration: 0.6, ease: 'expo.in', stagger: 0.015 }, 1.45)
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: 'expo.inOut' }, 1.75);
  }
  init(false);
  if (location.hash) setTimeout(function () { scrollToHash(location.hash, true); }, 100);
  addEventListener('load', function () { if (ST) ST.refresh(); });
  window.__tick = function (n) { if (gsap) for (var i = 0; i < (n || 60); i++) gsap.ticker.tick(); };
})();
