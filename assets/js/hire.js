/* The "Start a project" brief builder. No backend: it composes an email and opens it with mailto:.
   The address lives in ONE place, data/site.json -> contact.email, and is assembled here in JavaScript
   so it never sits in the HTML for scrapers. If the address fails to load, Send stays switched off. */
(() => {
  'use strict';
  const form = document.getElementById('brief-form');
  if (!form) return;
  const $ = (s, c = form) => c.querySelector(s);
  const $$ = (s, c = form) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const steps = $$('.step');
  const stage = $('.brief__stage');
  const bars = $$('.brief__progress span');
  const back = $('[data-back]');
  const next = $('[data-next]');
  const send = $('[data-send]');
  const copyBtn = $('[data-copy]');
  const copied = $('[data-copied]');
  const pendingNote = $('[data-pending]');
  const desc = $('#f-desc');
  const count = $('[data-count]');
  let current = 0;
  let address = '';
  const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const isReal = (a) => typeof a === 'string' && EMAIL_RX.test(a);

  // options can be edited in data/site.json -> hire.budgets / hire.timelines
  const rebuild = (key, name, list) => {
    const box = $(`[data-opts="${key}"]`);
    if (!box || !Array.isArray(list) || !list.length) return;
    box.replaceChildren(...list.map((label, i) => {
      const d = document.createElement('div'); d.className = 'opt';
      const inp = document.createElement('input'); inp.type = 'radio'; inp.name = name; inp.id = `${name}-${i}`; inp.value = label;
      const lab = document.createElement('label'); lab.htmlFor = inp.id; lab.textContent = label;
      d.append(inp, lab); return d;
    }));
  };

  const applyData = (data) => {
    address = data && data.contact ? String(data.contact.email || '').trim() : '';
    if (data && data.hire) { rebuild('budgets', 'budget', data.hire.budgets); rebuild('timelines', 'timeline', data.hire.timelines); }
    paintSend();
    paintDirect();
  };

  const val = (name) => { const el = form.elements[name]; return el ? String(el.value || '').trim() : ''; };
  const checked = (name) => { const el = form.querySelector(`input[name="${name}"]:checked`); return el ? el.value : ''; };
  const showErr = (key, on) => {
    const e = $(`[data-err="${key}"]`); if (e) e.hidden = !on;
    const input = form.elements[key];
    if (input && input.setAttribute && input.tagName) input.setAttribute('aria-invalid', on ? 'true' : 'false');
    return !on;
  };

  const validate = (i) => {
    if (i === 0) return showErr('type', !checked('type'));
    if (i === 1) { const a = showErr('budget', !checked('budget')); const b = showErr('timeline', !checked('timeline')); return a && b; }
    if (i === 2) return showErr('desc', val('desc').length < 20);
    if (i === 3) { const a = showErr('name', !val('name')); const b = showErr('email', !EMAIL_RX.test(val('email'))); return a && b; }
    return true;
  };

  const compose = () => {
    const where = val('where'), org = val('org');
    const subject = `Project brief: ${checked('type') || 'New project'} for ${val('name') || 'a new client'}`;
    const lines = [
      'Hello SpaceZ,', '',
      'Here is my project brief.', '',
      'THE PROJECT',
      `Type: ${checked('type')}`,
      `Budget: ${checked('budget')}`,
      `Timing: ${checked('timeline')}`, '',
      'ABOUT IT',
      val('desc'), '',
      'ABOUT ME',
      `Name: ${val('name')}`,
      `Email: ${val('email')}`
    ];
    if (where) lines.push(`Based in: ${where}`);
    if (org) lines.push(`Company or website: ${org}`);
    lines.push('', 'Sent with the brief builder on nur-arpon.github.io');
    return { subject, body: lines.join('\n') };
  };

  function paintSend() {
    const real = isReal(address);
    if (pendingNote) pendingNote.hidden = real;
    const to = $('[data-mail-to]');
    if (to) to.textContent = real ? `SpaceZ <${address}>` : 'SpaceZ';
    if (!send) return;
    if (real) {
      const { subject, body } = compose();
      send.href = `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, '\r\n'))}`;
      send.removeAttribute('aria-disabled');
      send.querySelector('span').firstChild.textContent = 'Open in my email app ';
    } else {
      send.removeAttribute('href');
      send.setAttribute('aria-disabled', 'true');
      send.querySelector('span').firstChild.textContent = 'Open in my email app ';
    }
  }

  // the plain address line under the form, built from parts so it is not in the page source
  const directLink = document.querySelector('[data-email]');
  const directCopy = document.querySelector('[data-copy-email]');
  const directDone = document.querySelector('[data-email-copied]');
  function paintDirect() {
    if (!directLink) return;
    if (!isReal(address)) { directLink.closest('.direct').hidden = true; return; }
    const at = address.indexOf('@');
    directLink.replaceChildren(document.createTextNode(address.slice(0, at)), document.createTextNode('@'), document.createTextNode(address.slice(at + 1)));
    directLink.href = 'mai' + 'lto:' + address;
    directLink.closest('.direct').hidden = false;
    if (directCopy) directCopy.hidden = false;
  }
  if (directCopy) directCopy.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(address); ok = true; } catch (e) { ok = false; }
    if (directDone) { directDone.textContent = ok ? 'Copied.' : 'Select the address to copy it.'; setTimeout(() => { directDone.textContent = ''; }, 3000); }
  });

  const fillReview = () => {
    const { subject, body } = compose();
    $('[data-mail-subject]').textContent = subject;
    $('[data-mail-body]').textContent = body;
    paintSend();
  };

  const go = (to, dir) => {
    if (to === current || to < 0 || to >= steps.length) return;
    const from = steps[current];
    const target = steps[to];
    const h0 = stage.offsetHeight;
    if (to === steps.length - 1) fillReview();
    from.hidden = true;
    target.hidden = false;
    target.dataset.anim = reduce.matches ? '' : (dir > 0 ? 'in' : 'in-back');
    if (!reduce.matches) {
      const h1 = stage.offsetHeight;
      stage.style.height = h0 + 'px';
      void stage.offsetHeight;
      stage.style.height = h1 + 'px';
      const done = () => { stage.style.height = ''; stage.removeEventListener('transitionend', done); };
      stage.addEventListener('transitionend', done);
      setTimeout(done, 700);
    }
    current = to;
    bars.forEach((b, i) => b.classList.toggle('done', i <= current));
    const c = form.querySelector('[data-step-count]'); if (c) c.textContent = `Step ${current + 1} of ${steps.length}`;
    const n = form.querySelector('[data-step-name]'); if (n) n.textContent = target.dataset.name || '';
    back.hidden = current === 0;
    next.hidden = current === steps.length - 1;
    const first = target.querySelector('input:not([type="hidden"]), textarea, [data-send]');
    const r = form.getBoundingClientRect();
    if (r.top < 0) form.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
    if (first && to !== steps.length - 1) setTimeout(() => first.focus({ preventScroll: true }), 60);
    else { const q = target.querySelector('.q'); if (q) { q.tabIndex = -1; q.focus({ preventScroll: true }); } }
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (current < steps.length - 1) {
      if (validate(current)) go(current + 1, 1);
      else { const bad = form.querySelector('[aria-invalid="true"], .step:not([hidden]) input'); if (bad && bad.focus) bad.focus(); }
    }
  });
  back.addEventListener('click', () => go(current - 1, -1));

  // choosing a project type moves on by itself (a small, satisfying step)
  form.addEventListener('change', e => {
    if (e.target.name === 'type') { showErr('type', false); setTimeout(() => { if (current === 0) go(1, 1); }, 260); }
    if (e.target.name === 'budget') showErr('budget', false);
    if (e.target.name === 'timeline') showErr('timeline', false);
  });

  // the "so far" panel beside the form on wide screens
  const sofar = (key, text, fallback) => {
    const dd = document.querySelector(`[data-sofar="${key}"]`); if (!dd) return;
    dd.textContent = text || fallback; dd.classList.toggle('set', !!text);
  };
  const paintSofar = () => {
    sofar('type', checked('type'), 'Not chosen yet');
    sofar('budget', checked('budget'), 'Not chosen yet');
    sofar('timeline', checked('timeline'), 'Not chosen yet');
    const d = val('desc'); sofar('desc', d ? (d.length > 90 ? d.slice(0, 90) + '...' : d) : '', 'Not written yet');
    sofar('name', val('name') ? val('name') + (val('email') ? ' (' + val('email') + ')' : '') : '', 'Not added yet');
  };
  form.addEventListener('input', paintSofar);
  form.addEventListener('change', paintSofar);

  const updateCount = () => { if (count) count.textContent = `${desc.value.length} / 3000`; };
  if (desc) {
    desc.addEventListener('input', () => { updateCount(); if (desc.value.trim().length >= 20) showErr('desc', false); });
    $$('[data-prompt]').forEach(b => b.addEventListener('click', () => {
      const add = b.dataset.prompt;
      const v = desc.value;
      desc.value = v + (v && !v.endsWith('\n') ? '\n' : '') + add;
      desc.focus(); desc.setSelectionRange(desc.value.length, desc.value.length); updateCount();
    }));
  }

  if (send) send.addEventListener('click', e => { if (send.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const { subject, body } = compose();
    const text = `Subject: ${subject}\n\n${body}`;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (err) {
      const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select(); try { ok = document.execCommand('copy'); } catch (e2) { ok = false; } t.remove();
    }
    if (copied) { copied.textContent = ok ? 'Copied. Paste it anywhere.' : 'Could not copy. Select the text above instead.'; setTimeout(() => { copied.textContent = ''; }, 4000); }
  });

  paintSend();
  if (window.SPACEZ) applyData(window.SPACEZ);
  document.addEventListener('spacez:data', e => applyData(e.detail));
  (window.SPACEZ_FX && window.SPACEZ_FX.dataReady ? window.SPACEZ_FX.dataReady : Promise.resolve(null)).then(d => { if (!d) applyData(null); });
})();
