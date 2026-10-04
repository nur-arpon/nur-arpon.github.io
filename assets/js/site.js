/* SpaceZ site script. Vanilla, no dependencies. Every effect checks reduced motion and pointer type. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: fine */ } }
  };

  /* ---------- Theme ---------- */
  const themeMeta = $('meta[name="theme-color"]');
  const applyTheme = (t) => {
    root.setAttribute('data-theme', t);
    if (themeMeta) themeMeta.setAttribute('content', t === 'light' ? '#f3f2ec' : '#07080a');
    $$('.theme-btn').forEach(b => {
      b.setAttribute('aria-label', t === 'light' ? 'Switch to dark mode' : 'Switch to light mode');
    });
  };
  applyTheme(root.getAttribute('data-theme') || 'dark');
  $$('.theme-btn').forEach(b => b.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    const go = () => { applyTheme(next); store.set('spacez-theme', next); };
    if (document.startViewTransition && !reduce.matches) document.startViewTransition(go); else go();
  }));
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    if (!store.get('spacez-theme')) applyTheme(e.matches ? 'light' : 'dark');
  });

  /* ---------- Header + menu ---------- */
  const header = $('.site-header');
  const onScrollHeader = () => header && header.classList.toggle('is-scrolled', scrollY > 8);
  onScrollHeader();
  addEventListener('scroll', onScrollHeader, { passive: true });

  const menu = $('#menu');
  const menuBtn = $('.menu-btn');
  if (menu && menuBtn) {
    const closeBtn = $('.menu-close', menu);
    const open = () => {
      menu.classList.add('is-open'); menu.removeAttribute('inert'); menu.setAttribute('aria-hidden', 'false');
      menuBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
      setTimeout(() => closeBtn && closeBtn.focus(), 50);
    };
    const close = () => {
      menu.classList.remove('is-open'); menu.setAttribute('inert', ''); menu.setAttribute('aria-hidden', 'true');
      menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; menuBtn.focus();
    };
    menuBtn.addEventListener('click', open);
    closeBtn && closeBtn.addEventListener('click', close);
    $$('a', menu).forEach(a => a.addEventListener('click', () => { document.body.style.overflow = ''; }));
    addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('is-open')) close(); });
  }

  /* ---------- Split headlines + reveal ---------- */
  $$('.split').forEach(el => {
    let i = 0;
    const wrap = (node) => {
      const w = document.createElement('span'); w.className = 'w';
      const inner = document.createElement('span'); inner.style.setProperty('--i', i++);
      w.appendChild(inner); inner.appendChild(node); return w;
    };
    Array.from(el.childNodes).forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(' '));
          else frag.appendChild(wrap(document.createTextNode(part)));
        });
        el.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        el.replaceChild(wrap(n.cloneNode(true)), n);
      }
    });
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal, .split').forEach(el => io.observe(el));

  /* ---------- Data (site.json) ---------- */
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const dataReady = fetch(root.dataset.base ? root.dataset.base + 'data/site.json' : 'data/site.json', { cache: 'no-cache' })
    .then(r => (r.ok ? r.json() : null)).catch(() => null);
  dataReady.then(data => {
    if (!data) return;
    window.SPACEZ = data;
    $$('[data-status]').forEach(el => {
      const s = get(data.projects || {}, el.dataset.status);
      if (s && s.label) { el.textContent = s.label; el.dataset.state = s.state || ''; }
    });
    $$('[data-href]').forEach(el => { const v = get(data, el.dataset.href); if (v) el.href = v; });
    // optional photos: only appear when data/site.json "photos" has entries
    const photos = Array.isArray(data.photos) ? data.photos.filter(p => p && p.src) : [];
    $$('[data-photo]').forEach(slot => {
      const p = photos[Number(slot.dataset.photo)] || photos[0];
      if (!p) return;
      const img = new Image();
      img.src = p.src; img.alt = p.alt || 'Nur Ifran Arpon';
      if (p.width) img.width = p.width; if (p.height) img.height = p.height;
      img.decoding = 'async';
      const target = $('.photo-slot__img', slot) || slot;
      target.replaceChildren(img);
      slot.hidden = false;
      slot.closest('[data-photo-host]')?.classList.add('has-photo');
    });
    document.dispatchEvent(new CustomEvent('spacez:data', { detail: data }));
  });

  /* ---------- Magnetic buttons ---------- */
  const magnets = $$('.magnetic');
  if (magnets.length && finePointer.matches && !reduce.matches) {
    let mx = -1e4, my = -1e4, raf = 0;
    const tick = () => {
      raf = 0;
      magnets.forEach(el => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = mx - cx, dy = my - cy;
        const reach = Math.max(r.width, r.height) * 0.5 + 60;
        const d = Math.hypot(dx, dy);
        if (d < reach) {
          const f = 1 - d / reach;
          el.style.setProperty('--bx', (dx * 0.35 * f).toFixed(2) + 'px');
          el.style.setProperty('--by', (dy * 0.45 * f).toFixed(2) + 'px');
        } else if (el.style.getPropertyValue('--bx')) {
          el.style.removeProperty('--bx'); el.style.removeProperty('--by');
        }
      });
    };
    addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    document.addEventListener('pointerleave', () => { mx = my = -1e4; if (!raf) raf = requestAnimationFrame(tick); });
  }

  /* ---------- Tilt + spotlight ---------- */
  if (finePointer.matches) {
    $$('[data-tilt]').forEach(el => {
      const max = Number(el.dataset.tilt) || 6;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        if (!reduce.matches) {
          el.style.setProperty('--ry', ((px - 0.5) * max * 2).toFixed(2) + 'deg');
          el.style.setProperty('--rx', ((0.5 - py) * max * 2).toFixed(2) + 'deg');
        }
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
    $$('.tile').forEach(el => el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }));
  }

  /* ---------- Drag rail with momentum ---------- */
  $$('[data-rail]').forEach(rail => {
    const bar = rail.parentElement.querySelector('.rail-progress');
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const frac = max > 0 ? (rail.scrollLeft + rail.clientWidth) / rail.scrollWidth : 1;
      if (bar) bar.style.setProperty('--rp', frac.toFixed(3));
    };
    rail.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
    const step = () => { const c = rail.firstElementChild; return c ? c.getBoundingClientRect().width + 24 : 400; };
    const scope = rail.closest('section') || document;
    $$('[data-rail-prev]', scope).forEach(b => b.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: reduce.matches ? 'auto' : 'smooth' })));
    $$('[data-rail-next]', scope).forEach(b => b.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: reduce.matches ? 'auto' : 'smooth' })));

    let down = false, startX = 0, startLeft = 0, lastX = 0, lastT = 0, vel = 0, moved = 0, coast = 0;
    rail.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = 0; startX = lastX = e.clientX; startLeft = rail.scrollLeft; lastT = performance.now(); vel = 0;
      cancelAnimationFrame(coast);
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) rail.classList.add('is-dragging');
      rail.scrollLeft = startLeft - dx;
      const now = performance.now();
      vel = (e.clientX - lastX) / Math.max(1, now - lastT);
      lastX = e.clientX; lastT = now;
    });
    const end = () => {
      if (!down) return;
      down = false;
      if (reduce.matches || Math.abs(vel) < 0.05) { rail.classList.remove('is-dragging'); return; }
      let v = vel * 16;
      const glide = () => {
        rail.scrollLeft -= v; v *= 0.94;
        if (Math.abs(v) > 0.4) coast = requestAnimationFrame(glide);
        else rail.classList.remove('is-dragging');
      };
      coast = requestAnimationFrame(glide);
    };
    addEventListener('pointerup', end);
    rail.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    rail.addEventListener('dragstart', e => e.preventDefault());
  });

  /* ---------- Scroll-linked effects (one rAF loop) ---------- */
  const scrollFx = [];
  const runScrollFx = () => { const vh = innerHeight; scrollFx.forEach(fn => fn(vh)); };
  let sfRaf = 0;
  const queueFx = () => { if (!sfRaf) sfRaf = requestAnimationFrame(() => { sfRaf = 0; runScrollFx(); }); };
  addEventListener('scroll', queueFx, { passive: true });
  addEventListener('resize', queueFx);

  // statement that lights up word by word
  $$('.scrub').forEach(el => {
    const words = [];
    const walk = (node, hl) => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'sw' + (hl ? ' hl' : ''); s.textContent = part;
            words.push(s); frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n, hl || n.classList.contains('hl'));
      });
    };
    walk(el, false);
    if (reduce.matches) { words.forEach(w => w.classList.add('on')); return; }
    scrollFx.push(vh => {
      const r = el.getBoundingClientRect();
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    });
  });

  // timeline that draws itself
  $$('.tl-wrap').forEach(wrap => {
    const line = $('.tl__line', wrap);
    const items = $$('.tl-item', wrap);
    scrollFx.push(vh => {
      const r = wrap.getBoundingClientRect();
      const mark = vh * 0.62;
      const tp = clamp((mark - r.top) / r.height);
      if (line) line.style.setProperty('--tp', reduce.matches ? 1 : tp.toFixed(4));
      items.forEach(it => {
        const d = $('.tl-dot', it).getBoundingClientRect();
        it.classList.toggle('is-lit', reduce.matches || d.top < mark);
      });
    });
  });

  // process bar on the hire page
  $$('.process').forEach(list => {
    const bar = $('.process__bar', list.parentElement);
    const steps = $$('li', list);
    scrollFx.push(vh => {
      const r = list.getBoundingClientRect();
      const pp = clamp((vh * 0.8 - r.top) / (vh * 0.5));
      if (bar) bar.style.setProperty('--pp', reduce.matches ? 1 : pp.toFixed(4));
      steps.forEach((s, i) => s.classList.toggle('is-lit', reduce.matches || pp >= (i / steps.length) + 0.02));
    });
  });

  /* ---------- Filters (work + timeline) ---------- */
  $$('[data-filter-group]').forEach(group => {
    const target = document.getElementById(group.dataset.filterGroup);
    if (!target) return;
    const btns = $$('[data-filter]', group);
    btns.forEach(b => b.addEventListener('click', () => {
      const f = b.dataset.filter;
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $$('[data-cat]', target).forEach(el => {
        const show = f === 'all' || el.dataset.cat.split(' ').includes(f);
        el.classList.toggle('is-filtered', !show);
      });
      queueFx();
    }));
  });

  /* ---------- FAQ: smooth open/close ---------- */
  $$('.faq details').forEach(d => {
    const sum = $('summary', d), ans = $('.ans', d);
    if (!sum || !ans) return;
    sum.addEventListener('click', e => {
      if (reduce.matches) return;
      e.preventDefault();
      if (d.open) {
        const a = ans.animate([{ height: ans.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.65,0,.35,1)' });
        a.onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = ans.offsetHeight;
        ans.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    });
  });

  /* ---------- Clocks (hire page) ---------- */
  const clocks = $$('[data-clock]');
  if (clocks.length) {
    const fmt = (tz) => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', timeZone: tz || undefined });
    const paint = () => clocks.forEach(c => {
      const tz = c.dataset.clock === 'local' ? undefined : c.dataset.clock;
      const b = $('b', c); if (b) b.textContent = fmt(tz).format(new Date());
    });
    paint(); setInterval(paint, 15000);
    const you = $('[data-clock="local"] span');
    try { if (you) you.textContent = 'You · ' + Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' '); } catch (e) { /* keep default label */ }
  }

  $$('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });

  window.SPACEZ_FX = { queueFx, scrollFx, dataReady, reduce, finePointer, clamp, lerp };
  runScrollFx();
})();
