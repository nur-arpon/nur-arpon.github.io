/* Home hero: the orbit. Project icons circle the SpaceZ core on tilted rings.
   Scroll opens the system up (the tilt flattens and the labels appear), the pointer leans it, a drag spins it.
   Positions are 2D projections written as transforms only, so it stays at 60 fps. */
(() => {
  'use strict';
  const orbit = document.querySelector('[data-orbit]');
  if (!orbit) return;
  const hero = orbit.closest('.hero');
  const fx = window.SPACEZ_FX || {};
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 900px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  const RINGS = [0.30, 0.40, 0.49];            // radius as a fraction of the box
  const SPEED = [0.00012, 0.00012, 0.00012];  // radians per ms; one speed so the icons keep their spacing
  const ellipses = Array.from(orbit.querySelectorAll('ellipse[data-ring]'));
  const sats = Array.from(orbit.querySelectorAll('.sat')).map(el => ({
    el, ring: Number(el.dataset.ring) || 0, a0: (Number(el.dataset.angle) || 0) * Math.PI / 180
  }));

  let size = 0, sizeH = 0, k = 1, p = 0, leanX = 0, leanY = 0, tLeanX = 0, tLeanY = 0, spin = 0, spinV = 0, last = performance.now(), running = false, visible = true;

  const svg = orbit.querySelector('svg.rings');
  const measure = () => {
    size = orbit.clientWidth; sizeH = orbit.clientHeight || size;
    k = size / sizeH > 1.2 ? 0.86 : 1;                      // the wide phone layout keeps icons inside the box
    if (svg) svg.setAttribute('viewBox', `0 0 100 ${(100 * sizeH / size).toFixed(2)}`);
    ellipses.forEach(e => e.setAttribute('cy', (50 * sizeH / size).toFixed(2)));
  };
  const pinned = () => hero && wide.matches && !reduce.matches;
  const setPinned = () => { if (hero) hero.classList.toggle('hero--pinned', pinned()); };

  const layout = (t) => {
    const c = size / 2, cy = sizeH / 2;
    const tilt = lerp(58, 20, p) + leanY * 8;                // degrees from flat-on
    const cosT = Math.cos(tilt * Math.PI / 180);
    ellipses.forEach(e => {
      const R = RINGS[Number(e.dataset.ring)] * 100 * k;
      e.setAttribute('rx', R.toFixed(2));
      e.setAttribute('ry', (R * cosT).toFixed(2));
    });
    sats.forEach(s => {
      const R = RINGS[s.ring] * size * k;
      const th = s.a0 + (reduce.matches ? 0 : t * SPEED[s.ring]) + spin + leanX * 0.35;
      const x = c + R * Math.cos(th);
      const y = cy + R * Math.sin(th) * cosT;
      const depth = Math.sin(th);                            // +1 front, -1 back
      const sc = lerp(0.78, 1.06, (depth + 1) / 2) * lerp(1, 1.08, p);
      s.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
      s.el.style.zIndex = depth > -0.05 ? 6 : 2;
      s.el.style.opacity = (0.55 + 0.45 * (depth + 1) / 2).toFixed(2);
    });
    orbit.classList.toggle('show-labels', p > 0.45);
  };

  const frame = (now) => {
    const dt = Math.min(64, now - last); last = now;
    leanX += (tLeanX - leanX) * 0.06; leanY += (tLeanY - leanY) * 0.06;
    spin += spinV * dt; spinV *= Math.pow(0.996, dt);
    layout(now);
    if (running) requestAnimationFrame(frame);
  };
  const start = () => { if (running || reduce.matches || !visible) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
  const stop = () => { running = false; };

  // scroll progress through the pinned hero
  const onScroll = (vh) => {
    if (!pinned()) { if (p !== 0) { p = 0; hero && hero.style.setProperty('--p', 0); } return; }
    const r = hero.getBoundingClientRect();
    p = clamp(-r.top / Math.max(1, r.height - vh));
    hero.style.setProperty('--p', p.toFixed(4));
    if (!running) layout(performance.now());
  };
  if (fx.scrollFx) fx.scrollFx.push(onScroll);

  // pointer lean (fine pointers only)
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    addEventListener('pointermove', e => {
      tLeanX = (e.clientX / innerWidth - 0.5) * 2;
      tLeanY = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // drag to spin (mouse, pen and touch; vertical touch still scrolls thanks to touch-action: pan-y)
  let dragging = false, lastX = 0, moved = 0;
  orbit.addEventListener('pointerdown', e => {
    if (reduce.matches) return;
    dragging = true; moved = 0; lastX = e.clientX; spinV = 0;
  });
  addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx);
    spin += dx * 0.006; spinV = dx * 0.00035;
    if (!running) layout(performance.now());
  }, { passive: true });
  addEventListener('pointerup', () => { dragging = false; });
  orbit.addEventListener('click', e => { if (moved > 8) { e.preventDefault(); moved = 0; } }, true);

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(orbit);
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });

  const init = () => { measure(); setPinned(); orbit.classList.add('is-js'); layout(performance.now()); if (fx.queueFx) fx.queueFx(); start(); };
  addEventListener('resize', () => { measure(); setPinned(); layout(performance.now()); });
  wide.addEventListener('change', setPinned);
  reduce.addEventListener('change', () => { setPinned(); reduce.matches ? stop() : start(); });

  // the optional photo: when site.json has one, it takes the core and the monogram becomes a badge
  document.addEventListener('spacez:data', () => layout(performance.now()));
  init();
})();
