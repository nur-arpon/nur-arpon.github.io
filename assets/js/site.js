/* Nur Ifran Arpon — portfolio behaviour.
   Works without GSAP (plain page), and respects prefers-reduced-motion (no smooth scroll, no pinning, no auto-spin). */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var isDesk = function () { return window.innerWidth > 900; };
  var VARS = ['bg', 'bg2', 'bg3', 'line', 'ink', 'ink2', 'ink3', 'accent'];
  var CSSVAR = { bg: '--bg', bg2: '--bg-2', bg3: '--bg-3', line: '--line', ink: '--ink', ink2: '--ink-2', ink3: '--ink-3', accent: '--accent' };
  var THEMES = {
    black: { bg: '#0e0e0f', bg2: '#161617', bg3: '#1d1d1f', line: '#2c2c2e', ink: '#f2f2f4', ink2: '#a8a8ad', ink3: '#7c7c82', accent: '#9db0ff' },
    navy: { bg: '#070b17', bg2: '#0d1326', bg3: '#131b33', line: '#222b48', ink: '#eef1fb', ink2: '#a3aac4', ink3: '#8189a8', accent: '#7d97ff' }
  };
  var theme = function () { return root.getAttribute('data-theme') === 'navy' ? 'navy' : 'black'; };

  /* ---------- look switch (black / navy) ---------- */
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('arpon-look', t); } catch (e) {}
    if (themeMeta) themeMeta.setAttribute('content', THEMES[t].bg);
    if (!activeChapter) paint(null, true);
  }
  document.querySelectorAll('.theme-switch').forEach(function (b) {
    b.addEventListener('click', function () { setTheme(theme() === 'black' ? 'navy' : 'black'); });
  });

  /* ---------- page repaint for project chapters ---------- */
  var activeChapter = null;
  function paint(palette, instant) {
    var target = palette || THEMES[theme()];
    if (!window.gsap || reduce || instant) {
      if (palette) VARS.forEach(function (k) { root.style.setProperty(CSSVAR[k], target[k] || target.bg3); });
      else VARS.forEach(function (k) { root.style.removeProperty(CSSVAR[k]); });
      return;
    }
    var props = { duration: 0.9, ease: 'power2.out', overwrite: true };
    VARS.forEach(function (k) { props[CSSVAR[k]] = target[k] || target.bg3; });
    if (!palette) props.onComplete = function () { if (!activeChapter) VARS.forEach(function (k) { root.style.removeProperty(CSSVAR[k]); }); };
    window.gsap.to(root, props);
  }

  /* ---------- header + mobile menu ---------- */
  var header = document.getElementById('header');
  var lastY = 0;
  function onScrollHeader(y) {
    header.classList.toggle('scrolled', y > 20);
    var down = y > lastY && y > 400;
    if (!root.classList.contains('menu-open')) header.classList.toggle('hidden', down);
    lastY = y;
  }
  var menuBtn = document.querySelector('.menu-btn');
  function closeMenu() { root.classList.remove('menu-open'); if (menuBtn) { menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open the menu'); } }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = !root.classList.contains('menu-open');
      root.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
      header.classList.remove('hidden');
    });
    document.querySelectorAll('#sheet a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------- email, assembled here so it is not in the HTML ---------- */
  var mailAddr = function () { return ['nurifran2005', 'gmail.com'].join('@'); };
  document.querySelectorAll('[data-email-btn]').forEach(function (b) {
    b.addEventListener('click', function () {
      var out = document.querySelector('[data-email-out]');
      if (out) {
        out.hidden = false; out.textContent = 'My email: ';
        var a = document.createElement('a'); a.href = 'mailto:' + mailAddr(); a.textContent = mailAddr(); a.style.color = 'var(--ink)';
        out.appendChild(a);
      }
      window.location.href = 'mailto:' + mailAddr() + '?subject=' + encodeURIComponent('Hello from your website');
    });
  });
  document.querySelectorAll('[data-email]').forEach(function (b) {
    b.addEventListener('click', function () {
      var addr = mailAddr();
      var a = document.createElement('a');
      a.href = 'mailto:' + addr; a.textContent = addr; a.style.color = 'var(--ink)';
      b.replaceWith(a);
    });
  });

  /* ---------- statement words ---------- */
  var words = [];
  document.querySelectorAll('[data-words]').forEach(function (p) {
    var parts = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    parts.forEach(function (w, i) {
      var s = document.createElement('span'); s.className = 'w'; s.textContent = w;
      p.appendChild(s); if (i < parts.length - 1) p.appendChild(document.createTextNode(' '));
      words.push(s);
    });
  });

  /* ---------- without GSAP: show everything, still repaint chapters ---------- */
  if (!window.gsap || !window.ScrollTrigger) {
    document.querySelectorAll('.rv').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
    words.forEach(function (w) { w.classList.add('on'); });
    window.addEventListener('scroll', function () { onScrollHeader(window.scrollY); }, { passive: true });
    return;
  }
  if ('scrollRestoration' in history && !location.hash) { history.scrollRestoration = 'manual'; window.scrollTo(0, 0); }
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', function (e) { ST.update(); onScrollHeader(e.scroll); });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    window.addEventListener('scroll', function () { onScrollHeader(window.scrollY); }, { passive: true });
  }
  function goTo(target) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY;
    if (el.classList.contains('chapter') && isDesk() && !reduce) y += window.innerHeight * 0.2;
    if (lenis) lenis.scrollTo(y, { duration: 1.6 }); else window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  document.querySelectorAll('a[href^="#"], a[href^="./#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').replace('./', '');
      if (id.length < 2 || !document.querySelector(id)) return;
      e.preventDefault(); goTo(id);
      history.replaceState(null, '', id);
    });
  });

  /* ---------- hero: the revolving ring ---------- */
  var ring = document.getElementById('ring');
  var cam = document.getElementById('orbitCam');
  if (ring && cam) {
    var cards = [].slice.call(ring.querySelectorAll('.card3d'));
    var n = cards.length, step = 360 / n;
    var R = 0, cw = 0, rot = 0, vel = 0, spin = reduce ? 0 : 7, steering = null;
    var flyZ = 0, tilt = -11, baseX = 0, baseY = 0;
    function layout() {
      var w = window.innerWidth, h = window.innerHeight;
      cw = isDesk() ? Math.min(420, Math.max(290, w * 0.25)) : (w < 600 ? Math.min(230, w * 0.52) : Math.min(340, w * 0.4));
      R = Math.round((cw * 1.05) / (2 * Math.tan(Math.PI / n)));
      baseX = isDesk() ? w * 0.24 : 0;
      baseY = isDesk() ? h * 0.02 : 0;
      cards.forEach(function (c, i) {
        c.style.setProperty('--cw', cw + 'px');
        c.style.transform = 'rotateY(' + (i * step) + 'deg) translateZ(' + R + 'px)';
      });
    }
    function render() {
      cam.style.transform = 'translate3d(' + baseX + 'px,' + baseY + 'px,' + (-R * 1.0 + flyZ) + 'px) rotateX(' + tilt + 'deg)';
      ring.style.transform = 'rotateY(' + rot + 'deg)';
    }
    layout(); render();
    window.addEventListener('resize', function () { layout(); render(); });

    gsap.ticker.add(function (t, dt) {
      var s = dt / 1000;
      if (steering === null) { rot -= spin * s; rot += vel; vel *= 0.94; }
      render();
    });

    // drag to spin
    var pin = document.querySelector('.hero-pin');
    var down = false, sx = 0, lx = 0, moved = 0;
    pin.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button !== 0) return; down = true; sx = lx = e.clientX; moved = 0; });
    window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - lx; lx = e.clientX; moved = Math.abs(e.clientX - sx); if (moved > 6) { vel = dx * 0.12; steering = null; } });
    window.addEventListener('pointerup', function () { down = false; });
    if (finePointer && !reduce) {
      pin.addEventListener('pointermove', function (e) { var k = e.clientY / window.innerHeight - 0.5; tilt += ((-11 - k * 6) - tilt) * 0.08; });
    }

    // tap one: everything spins to it, then we fly to its chapter
    cards.forEach(function (c, i) {
      c.addEventListener('click', function (e) {
        if (moved > 6) { e.preventDefault(); return; }
        var target = -i * step;
        var d = ((target - rot) % 360 + 540) % 360 - 180;
        var o = { r: rot };
        steering = gsap.to(o, { r: rot + d, duration: reduce ? 0 : 0.9, ease: 'power3.inOut', onUpdate: function () { rot = o.r; }, onComplete: function () { steering = null; goTo(c.getAttribute('data-go')); } });
      });
    });

    // scrolling: the camera flies forward through the ring, the name lifts away
    if (!reduce) {
      var copy = document.querySelector('.hero-copy');
      var hint = document.querySelector('.hero-hint');
      var shade = document.querySelector('.orbit-shade');
      var fly = { z: 0 };
      gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 } })
        .to(copy, { y: -120, opacity: 0, ease: 'power1.in', duration: 0.45 }, 0)
        .to(hint, { opacity: 0, duration: 0.1 }, 0)
        .to(fly, { z: 1, duration: 1, ease: 'power2.in', onUpdate: function () { flyZ = fly.z * (R * 2.3 + 400); } }, 0)
        .to(shade, { opacity: 0, duration: 0.5 }, 0.2)
        .to('.orbit', { opacity: 0, duration: 0.25 }, 0.75);
      // the name comes in line by line
      gsap.from('.hero h1 .line > span', { yPercent: 110, duration: 1.2, ease: 'power4.out', stagger: 0.09, delay: 0.1 });
      gsap.from(['.hero-kicker', '.hero-lede', '.hero-actions'], { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.45 });
      gsap.from('.orbit', { opacity: 0, duration: 1.6, ease: 'power2.out', delay: 0.2 });
    }
  }

  /* ---------- statement words light up ---------- */
  if (words.length) {
    if (reduce) words.forEach(function (w) { w.classList.add('on'); });
    else ST.create({
      trigger: '.statement p', start: 'top 80%', end: 'bottom 45%', scrub: true,
      onUpdate: function (s) { var k = Math.round(s.progress * words.length); words.forEach(function (w, i) { w.classList.toggle('on', i < k); }); }
    });
  }

  /* ---------- simple reveals ---------- */
  if (reduce) gsap.set('.rv', { opacity: 1, y: 0 });
  else ST.batch('.rv', { start: 'top 88%', once: true, onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }); } });

  /* ---------- the photo: a mosaic of my work flips, tile by tile, into me ---------- */
  document.querySelectorAll('.reveal-photo').forEach(function (f) {
    var img = f.querySelector('img');
    if (reduce) return;
    var front = f.getAttribute('data-front') || 'assets/img/work/spaceadom-arc.webp';
    var cols = isDesk() ? 8 : 6, rows = Math.round(cols * 1.25);
    var grid = document.createElement('div');
    grid.className = 'flip-grid';
    grid.style.setProperty('--cols', cols); grid.style.setProperty('--rows', rows);
    var tiles = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var t = document.createElement('span'); t.className = 'flip';
      var pos = (cols > 1 ? c / (cols - 1) * 100 : 0) + '% ' + (rows > 1 ? r / (rows - 1) * 100 : 0) + '%';
      var size = (cols * 100) + '% ' + (rows * 100) + '%';
      t.innerHTML = '<i class="f" style="background-image:url(' + front + ');background-size:' + size + ';background-position:' + pos + '"></i>' +
                    '<i class="b" style="background-image:url(' + img.getAttribute('src') + ');background-size:' + size + ';background-position:' + pos + '"></i>';
      t._d = Math.hypot(c - (cols - 1) / 2, (r - (rows - 1) * 0.35));
      tiles.push(t); grid.appendChild(t);
    }
    [[0, 'tl'], [cols - 1, 'tr'], [(rows - 1) * cols, 'bl'], [rows * cols - 1, 'br']].forEach(function (k) { tiles[k[0]].classList.add(k[1]); });
    var maxD = Math.max.apply(null, tiles.map(function (t) { return t._d; }));
    f.appendChild(grid); f.classList.add('tiled');
    var tl = gsap.timeline({ scrollTrigger: { trigger: f, start: 'top 85%', end: 'top 30%', scrub: 0.9 } });
    tiles.forEach(function (t) {
      var at = (t._d / maxD) * 0.55;
      tl.fromTo(t, { rotateY: 0, z: 0 }, { rotateY: 180, duration: 0.45, ease: 'power2.inOut' }, at)
        .to(t, { z: 70, duration: 0.22, ease: 'power1.out', yoyo: true, repeat: 1 }, at);
    });
    // once every tile has turned, swap the mosaic for the real photo so no seams remain
    tl.to(img, { opacity: 1, duration: 0.04, ease: 'none' }, 1.0).to(grid, { opacity: 0, duration: 0.04, ease: 'none' }, 1.02);
  });

  /* ---------- project chapters ---------- */
  var mm = gsap.matchMedia();
  document.querySelectorAll('.chapter').forEach(function (ch) {
    var pal = {};
    try { pal = JSON.parse(ch.getAttribute('data-palette') || '{}'); } catch (e) {}
    pal.bg2 = pal.bg2 || pal.bg3;
    ST.create({
      trigger: ch, start: 'top 50%', end: 'bottom 50%',
      onToggle: function (s) {
        if (s.isActive) { activeChapter = ch; paint(pal); }
        else if (activeChapter === ch) { activeChapter = null; paint(null); }
      }
    });
  });
  if (!reduce) {
    mm.add('(min-width: 901px)', function () {
      document.querySelectorAll('.chapter').forEach(function (ch) {
        var media = ch.querySelector('[data-grow]');
        var copy = ch.querySelector('.chapter-copy');
        var slides = [].slice.call(ch.querySelectorAll('.slide'));
        var tl = gsap.timeline({ scrollTrigger: { trigger: ch, start: 'top top', end: 'bottom bottom', scrub: 0.7 } });
        tl.fromTo(media, { scale: 0.62, rotateX: 14, y: 80, transformPerspective: 1200 }, { scale: 1, rotateX: 0, y: 0, ease: 'power2.out', duration: 0.32 }, 0)
          .fromTo(copy.children, { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.025, duration: 0.18, ease: 'power2.out' }, 0.04);
        if (slides.length > 1) {
          var span = 0.55 / (slides.length - 1);
          slides.forEach(function (s, i) {
            if (i === 0) return;
            var at = 0.36 + (i - 1) * span;
            tl.fromTo(s, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: span * 0.22, ease: 'none' }, at)
              .to(slides[i - 1], { opacity: 0, duration: span * 0.22, ease: 'none' }, at);
          });
        } else {
          tl.to(media, { scale: 1.04, duration: 0.5, ease: 'none' }, 0.4);
        }
        tl.to(media, { y: -40, duration: 0.12, ease: 'none' }, 0.88);
      });
    });
    mm.add('(max-width: 900px)', function () {
      document.querySelectorAll('.chapter [data-grow]').forEach(function (m) {
        gsap.fromTo(m, { scale: 0.86, opacity: 0.4 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: m, start: 'top 95%', end: 'top 40%', scrub: true } });
      });
      // phones have no pinning, so the extra pictures take turns on their own
      document.querySelectorAll('.chapter .media').forEach(function (m) {
        var s = m.querySelectorAll('.slide'); if (s.length < 2) return;
        var k = 0;
        setInterval(function () { var prev = s[k]; k = (k + 1) % s.length; gsap.to(prev, { opacity: 0, duration: 0.8 }); gsap.to(s[k], { opacity: 1, duration: 0.8 }); }, 3200);
      });
    });

    /* ---------- timeline: sideways on wide screens ---------- */
    var tl = document.getElementById('timeline'), track = document.getElementById('tlTrack'), bar = document.getElementById('tlProgress');
    if (tl && track) {
      mm.add('(min-width: 901px)', function () {
        tl.classList.add('horizontal');
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth + 120); };
        tl.style.setProperty('--tl-h', 'calc(100vh + ' + dist() + 'px)');
        var tw = gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: tl, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true, onUpdate: function (s) { bar.style.width = (s.progress * 100) + '%'; }, onRefreshInit: function () { tl.style.setProperty('--tl-h', 'calc(100vh + ' + dist() + 'px)'); } } });
        return function () { tl.classList.remove('horizontal'); tl.style.removeProperty('--tl-h'); gsap.set(track, { clearProps: 'x' }); tw.kill(); };
      });
    }

    /* ---------- buttons lean towards the mouse ---------- */
    if (finePointer) {
      document.querySelectorAll('.hero-actions .btn, .btn-whatsapp').forEach(function (b) {
        b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); gsap.to(b, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.4, ease: 'power3.out' }); });
        b.addEventListener('pointerleave', function () { gsap.to(b, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }); });
      });
    }
  }

  window.addEventListener('load', function () { ST.refresh(); });
  // test hook: lets an automated check advance time when the page is in a hidden tab
  window.__tick = function (frames) { for (var i = 0; i < (frames || 60); i++) gsap.ticker.tick(); };
})();
