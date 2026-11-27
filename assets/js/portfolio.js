'use strict';

function initProjectFilters() {
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.project[data-tags]')];
  const groups = [...document.querySelectorAll('[data-project-group]')];
  const result = document.getElementById('filter-result');
  function filter(category) {
    let count = 0;
    cards.forEach(card => {
      card.hidden = category !== 'all' && !card.dataset.tags.split(' ').includes(category);
      if (!card.hidden) count++;
    });
    groups.forEach(group => { group.hidden = !group.querySelector('.project:not([hidden])'); });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    if (result) result.textContent = result.dataset.countLabel.replace('{count}', String(count));
  }
  buttons.forEach(button => button.addEventListener('click', () => filter(button.dataset.filter)));
  filter('all');
}

function initImageFallbacks() {
  document.querySelectorAll('img').forEach(img => {
    const fail = () => img.setAttribute('data-failed', '');
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0) fail();
  });
}

// Full-page radial wipe using real old/new snapshots (no cloned content).
function initTheme() {
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let desiredDark = false;
  let running = null;
  let busy = false;

  function setTheme(dark) {
    root.dataset.theme = dark ? 'dark' : 'light';
    button.setAttribute('aria-pressed', String(dark));
    const label = dark ? button.dataset.labelLight : button.dataset.labelDark;
    button.setAttribute('aria-label', label);
    button.title = label;
    try { localStorage.setItem('portfolio-theme', dark ? 'dark' : 'light'); } catch {}
  }

  // The button is fixed by the existing layout, so the origin is correct for
  // keyboard activation, touch, RTL, and any position of the sticky header.
  function origin() {
    const rect = button.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth, rect.left + rect.width / 2));
    const y = Math.max(0, Math.min(innerHeight, rect.top + rect.height / 2));
    const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2;
    return { x, y, radius };
  }
  function clearWipe() {
    delete root.dataset.themeTransition;
    for (const prop of ['--theme-wipe-x', '--theme-wipe-y', '--theme-wipe-radius']) root.style.removeProperty(prop);
  }
  function iconMotion() {
    if (reduced.matches || document.hidden || !button.animate) return;
    const icon = button.querySelector(desiredDark ? '.theme-sun' : '.theme-moon');
    icon?.animate([
      { transform: 'rotate(-42deg) scale(.7)', opacity: .6 },
      { transform: 'rotate(8deg) scale(1.1)', opacity: 1, offset: .7 },
      { transform: 'rotate(0deg) scale(1)', opacity: 1 }
    ], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }

  async function run() {
    if (busy || desiredDark === (root.dataset.theme === 'dark')) return;
    const dark = desiredDark;
    if (reduced.matches || document.hidden || typeof document.startViewTransition !== 'function') {
      setTheme(dark);
      iconMotion();
      return;
    }
    busy = true;
    const { x, y, radius } = origin();
    root.style.setProperty('--theme-wipe-x', x + 'px');
    root.style.setProperty('--theme-wipe-y', y + 'px');
    root.style.setProperty('--theme-wipe-radius', radius + 'px');
    root.dataset.themeTransition = dark ? 'expand' : 'contract';
    try {
      running = document.startViewTransition(() => setTheme(dark));
      // ready can reject when a transition is skipped; consume it separately.
      running.ready.catch(() => {});
      await running.finished;
    } catch {
      setTheme(dark);
    } finally {
      running = null;
      clearWipe();
      busy = false;
      // Rapid repeated clicks are coalesced into the last requested theme.
      if (desiredDark !== (root.dataset.theme === 'dark')) void run();
      else iconMotion();
    }
  }

  let saved;
  try { saved = localStorage.getItem('portfolio-theme'); } catch {}
  desiredDark = saved === 'dark';
  setTheme(desiredDark);
  button.addEventListener('click', () => {
    desiredDark = !desiredDark;
    void run();
  });
  reduced.addEventListener('change', () => { if (reduced.matches) running?.skipTransition(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) running?.skipTransition(); });
  window.addEventListener('resize', () => running?.skipTransition(), { passive: true });
  window.addEventListener('beforeprint', () => running?.skipTransition());
}

function initPortraitMotion() {
  const stage = document.querySelector('.profile-stage');
  const toggle = stage?.querySelector('.motion-toggle');
  if (!stage || !toggle) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = true;
  function update() {
    const active = enabled && !reduced.matches;
    stage.dataset.motion = active ? 'running' : 'paused';
    toggle.setAttribute('aria-pressed', String(active));
    toggle.querySelector('span').textContent = active ? toggle.dataset.labelOn : toggle.dataset.labelOff;
  }
  update();
  toggle.addEventListener('click', () => { enabled = !enabled; update(); });
  reduced.addEventListener('change', update);
}

function initNavigation() {
  const nav = document.querySelector('.top nav');
  const toggle = nav?.querySelector('.menu-toggle');
  const links = nav?.querySelector('.nav-primary');
  if (!nav || !toggle || !links) return;
  nav.classList.add('nav-ready');
  const mobile = window.matchMedia('(max-width: 900px)');
  function setOpen(open, focus = false) {
    toggle.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
    if (focus) toggle.focus();
  }
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  links.addEventListener('click', event => {
    if (event.target.closest('a') && mobile.matches) setOpen(false);
  });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
  });
  mobile.addEventListener('change', () => setOpen(false));
}

initTheme();
initNavigation();
initProjectFilters();
initImageFallbacks();
initPortraitMotion();
document.getElementById('print')?.addEventListener('click', () => window.print());


// Native motion choreography: all content and resting styles remain unchanged.
function initPortfolioMotion() {
  if (!Element.prototype.animate || !window.requestAnimationFrame) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Set();
  const seen = new WeakSet();
  const stage = document.querySelector('.profile-stage');
  const rtl = document.documentElement.dir === 'rtl';
  const inline = rtl ? 1 : -1;
  const ease = 'cubic-bezier(.19, 1, .22, 1)';
  const targets = [...document.querySelectorAll(
    '.track > div, .sectionhead, .group-heading, .project, .job, .principle, .stack > div, .credential-card, .community-card, .cv-item, .contact h2, .contact .actions'
  )];
  let introPlayed = false;
  let printing = false;
  let scrollFrame = 0;
  let layoutObserver;
  const pending = new Map();
  const typing = new Map();

  // Deliberately sparse emphasis: evidence and recruiter-relevant differentiators.
  const recruiterTerms = [
    ['.hero-role', 'AI & Software Engineer', 'مهندس ذكاء اصطناعي وبرمجيات'],
    ['.hero .lede', 'reliable mobile products', 'تطبيقات جوال موثوقة'],
    ['[data-project-group="apps"] .group-heading h3', 'Published mobile applications', 'تطبيقات الجوال المنشورة'],
    ['.projectbody > p', 'constrained hardware', 'محدودية موارد الأجهزة'],
    ['.projectbody > h3', 'The Saudi Cup', 'The Saudi Cup'],
    ['[data-role="aram"] .role-details li', 'ERP and payment workflows', 'عمليات ERP والدفع'],
    ['[data-role="ovaluate"] h3', 'Generative AI Engineer', 'Generative AI Engineer'],
    ['[data-role="rs4it-ai"] h3', 'LLM Agents & Automation', 'LLM Agents & Automation'],
    ['[data-role="rs4it-flutter"] .role-details li', '6+ production Flutter applications', 'أكثر من 6 تطبيقات Flutter إنتاجية'],
    ['[data-role="rs4it-flutter"] .role-details li', 'architecture standards', 'معايير المعمارية'],
    ['#contact h2', 'that matters.', 'يصنع فرقاً.']
  ];
  const localeIndex = document.documentElement.lang === 'ar' ? 2 : 1;
  // Wrap only the existing text node, after typing finishes. No duplicate text,
  // no change to accessible names, and no broad keyword matching across the site.
  const highlights = recruiterTerms.flatMap(rule => [...document.querySelectorAll(rule[0])]
    .filter(node => node.textContent.includes(rule[localeIndex]))
    .map(node => ({ node, phrase: rule[localeIndex], done: false })));
  function highlightWithin(scope, animate = true) {
    for (const item of highlights) {
      if (item.done || !scope.contains(item.node) || item.node.closest('[data-motion-typing]')) continue;
      const part = [...item.node.childNodes].find(child =>
        child.nodeType === Node.TEXT_NODE && child.data.includes(item.phrase));
      if (!part) continue;
      const offset = part.data.indexOf(item.phrase);
      const range = document.createRange();
      range.setStart(part, offset);
      range.setEnd(part, offset + item.phrase.length);
      const mark = document.createElement('span');
      mark.className = 'recruiter-underline';
      mark.dataset.underlineDirection = /[\u0600-\u06ff]/.test(item.phrase) ? 'rtl' : 'ltr';
      if (animate && !reduced.matches && !printing && !document.hidden) mark.classList.add('draw-underline');
      range.surroundContents(mark);
      item.done = true;
    }
  }

  function play(node, frames, options, kind = 'reveal') {
    if (!node || reduced.matches || document.hidden || printing) return;
    const animation = node.animate(frames, { easing: ease, ...options });
    animation.id = 'portfolio-motion-' + kind;
    active.add(animation);
    const cleanup = () => active.delete(animation);
    animation.addEventListener('finish', cleanup, { once: true });
    animation.addEventListener('cancel', cleanup, { once: true });
    return animation;
  }

  function releasePending(node) {
    if (!pending.has(node)) return;
    node.style.opacity = pending.get(node);
    pending.delete(node);
    delete node.dataset.motionPending;
  }

  function stop() {
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    layoutObserver?.disconnect();
    for (const node of [...pending.keys()]) releasePending(node);
    for (const finish of [...typing.values()]) finish();
    for (const animation of active) animation.cancel();
    active.clear();
  }

  // Keep the original sentence and its geometry; the aria-hidden overlay types
  // grapheme clusters, including Arabic combining marks, without changing layout.
  function typeText(node, { delay = 0, duration = 1000 } = {}) {
    if (!node || reduced.matches || printing || document.hidden || typing.has(node) ||
        node.childElementCount || !node.textContent.trim()) return;
    const original = node.textContent;
    const locale = document.documentElement.lang || 'en';
    const units = typeof Intl.Segmenter === 'function'
      ? Array.from(new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(original), part => part.segment)
      : Array.from(original);
    const position = node.style.position;
    const reserve = document.createElement('span');
    reserve.style.opacity = '0';
    const overlay = document.createElement('span');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.dataset.typingOverlay = '';
    Object.assign(overlay.style, {
      position: 'absolute', inset: '0', pointerEvents: 'none', userSelect: 'none'
    });
    const written = document.createTextNode('');
    const caret = document.createElement('span');
    caret.setAttribute('aria-hidden', 'true');
    Object.assign(caret.style, {
      display: 'inline-block', width: '0', height: '.85em',
      borderInlineStart: '2px solid currentColor', verticalAlign: '-.06em',
      marginInlineStart: '3px'
    });
    overlay.append(written, caret);
    if (getComputedStyle(node).position === 'static') node.style.position = 'relative';
    // Keep the original Text nodes, rather than replacing the permanent content.
    while (node.firstChild) reserve.appendChild(node.firstChild);
     node.append(reserve, overlay);
    node.dataset.motionTyping = '';
    let frame = 0;
    let started = null;
    let lastCount = -1;
    const finish = () => {
      if (frame) cancelAnimationFrame(frame);
      blink.cancel();
      overlay.remove();
      while (reserve.firstChild) node.insertBefore(reserve.firstChild, reserve);
      reserve.remove();
      node.style.position = position;
      delete node.dataset.motionTyping;
      typing.delete(node);
      highlightWithin(node);
    };
    const blink = caret.animate([{ opacity: 1 }, { opacity: 0, offset: .55 }, { opacity: 1 }],
      { duration: 720, iterations: Infinity, easing: 'steps(1, end)' });
    typing.set(node, finish);
    function tick(now) {
      if (started === null) started = now;
      const elapsed = now - started - delay;
      if (elapsed >= duration + 400) { finish(); return; }
      const count = Math.max(0, Math.min(units.length, Math.floor(Math.max(0, elapsed) / duration * units.length)));
      if (count !== lastCount) {
        written.data = units.slice(0, count).join('');
        lastCount = count;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }

  // Pre-stage elements below the trigger so they cannot flash into view first.
  // Use pixels derived from viewport HEIGHT: percentage IO margins use width.
  // A scroll/resize batch reads geometry first and only then applies animation.
  function scan() {
    scrollFrame = 0;
    if (reduced.matches || printing || document.hidden) return;
    const height = window.innerHeight;
    const line = height * .75;
    const atBottom = window.scrollY + height >= document.documentElement.scrollHeight - 4;
    const ready = [];
    const waiting = [];
    for (const node of targets) {
      if (seen.has(node) || node.closest('[hidden]')) continue;
      const rect = node.getBoundingClientRect();
      if (rect.bottom <= 0 || node.contains(document.activeElement)) {
        releasePending(node);
        seen.add(node);
        highlightWithin(node, false);
      } else if (rect.top <= line || (atBottom && rect.top < height)) {
        ready.push({ node, rect });
      } else if (!pending.has(node)) {
        waiting.push(node);
      }
    }
    for (const node of waiting) {
      pending.set(node, node.style.opacity);
      node.style.opacity = '0';
      node.dataset.motionPending = '';
    }
    ready.sort((a, b) => a.rect.top - b.rect.top || -inline * (a.rect.left - b.rect.left));
    ready.forEach(({ node }, i) => {
      releasePending(node);
      const heading = node.matches('.sectionhead, .group-heading');
      const job = node.matches('.job');
      const delay = Math.min(i, 3) * 95;
      enter(node, {
        delay, x: heading || job ? inline * 20 : 0,
        y: heading ? 26 : 40, duration: heading ? 850 : 1050, opacity: 0
      });
      if (node.matches('.sectionhead')) {
        const title = node.querySelector('h2');
        typeText(title, { delay: delay + 180, duration: Math.min(1200, Math.max(430, (title?.textContent.length || 0) * 28)) });
      }
    });
  }

  function scheduleScan() {
    if (!scrollFrame && !reduced.matches && !printing && !document.hidden) scrollFrame = requestAnimationFrame(scan);
  }

  function cancelFor(node, kinds) {
    if (!node) return;
    for (const animation of node.getAnimations()) {
      if (kinds.some(kind => animation.id === 'portfolio-motion-' + kind)) animation.cancel();
    }
  }

  function enter(node, { delay = 0, x = 0, y = 24, duration = 740, opacity = .42 } = {}) {
    if (!node || seen.has(node)) return;
    seen.add(node);
    // Never animate away content which already has keyboard focus.
    if (node.contains(document.activeElement)) { highlightWithin(node, false); return; }
    const reveal = play(node, [
      { opacity, translate: x + 'px ' + y + 'px' },
      { opacity: 1, translate: '0 0' }
    ], { duration, delay, fill: 'backwards' });
    if (reveal) {
      reveal.addEventListener('finish', () => highlightWithin(node), { once: true });
      reveal.addEventListener('cancel', () => highlightWithin(node, false), { once: true });
    } else highlightWithin(node, false);
  }

  function start() {
    if (reduced.matches || document.hidden || printing) return;
    if (!introPlayed) {
      introPlayed = true;
      const hero = document.querySelector('.hero');
      if (hero && hero.getBoundingClientRect().bottom > 0 && scrollY < 120) {
        // Arabic shaping remains intact; animate whole lines, never individual glyphs.
        const copy = hero.querySelector('.hero-copy');
        [...(copy?.children || [])].forEach((node, i) => {
          if (node.matches('.hero-role, .lede')) return;
          enter(node, {
            delay: i * 115, x: i === 1 ? inline * 25 : 0, y: i === 1 ? 42 : 26,
            duration: i === 1 ? 1250 : 920, opacity: i === 1 ? .18 : .22
          });
        });
        typeText(copy?.querySelector('.hero-role'), { delay: 400, duration: 800 });
        typeText(copy?.querySelector('.lede'), { delay: 1300, duration: 2100 });
        if (stage?.dataset.motion === 'running') {
          enter(stage, { delay: 160, y: 35, duration: 1120, opacity: .28 });
          const portrait = stage.querySelector('.profile-photo');
          // A short cinematic crop reveal stays inside the existing portrait frame.
          play(portrait, [
            { clipPath: 'inset(0 0 60% 0)', scale: '1.10' },
            { clipPath: 'inset(0 0 0 0)', scale: '1' }
          ], { duration: 1320, delay: 180, fill: 'backwards' }, 'portrait');
          [...stage.querySelectorAll('.specialty-item')].forEach((node, i) => {
            enter(node, { delay: 440 + i * 130, x: (i % 2 ? -1 : 1) * 22, y: 18, duration: 920, opacity: .2 });
          });
        }
      } else if (hero) highlightWithin(hero, false);
    }
    scan();
    if (typeof ResizeObserver === 'function') {
      layoutObserver ||= new ResizeObserver(scheduleScan);
      const main = document.querySelector('main');
      if (main) layoutObserver.observe(main);
    }
  }

  // Lightweight tactile feedback for real interactions, including touch.
  for (const control of document.querySelectorAll('.hero .actions .pill, .hero-social a, .project-links a, .credential-actions .pill, .filters button, .nav-tools button')) {
    control.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      cancelFor(control, ['press']);
      play(control, [{ scale: '1' }, { scale: '.965', offset: .35 }, { scale: '1' }],
        { duration: 300 }, 'press');
    });
  }

  // Filter changes replay only the already-seen cards in the viewport.
  for (const button of document.querySelectorAll('[data-filter]')) {
    button.addEventListener('click', () => {
      if (reduced.matches) return;
      scheduleScan();
      const visible = [...document.querySelectorAll('.project:not([hidden])')].filter(card => {
        const bounds = card.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < innerHeight;
      });
      visible.forEach((card, i) => {
        if (!seen.has(card)) return;
        cancelFor(card, ['reveal', 'filter']);
        play(card, [{ opacity: .5, translate: '0 12px' }, { opacity: 1, translate: '0 0' }],
          { duration: 520, delay: Math.min(i, 4) * 48, fill: 'backwards' }, 'filter');
      });
    });
  }

  // Preserve usability during rapid keyboard navigation, printing and preference changes.
  document.addEventListener('focusin', event => {
    for (const node of [...pending.keys()]) {
      if (node.contains(event.target)) { releasePending(node); seen.add(node); highlightWithin(node, false); }
    }
    for (const [node, finish] of typing) if (node.contains(event.target)) finish();
    for (const animation of active) {
      const node = animation.effect?.target;
      if (node?.contains(event.target)) animation.cancel();
    }
  });
  stage?.querySelector('.motion-toggle')?.addEventListener('click', () => {
    if (stage.dataset.motion === 'paused') {
      for (const animation of active) {
        if (stage.contains(animation.effect?.target)) animation.cancel();
      }
    }
  });
  window.addEventListener('scroll', scheduleScan, { passive: true });
  window.addEventListener('resize', scheduleScan, { passive: true });
  window.addEventListener('hashchange', scheduleScan);
  reduced.addEventListener('change', () => { if (reduced.matches) { stop(); highlightWithin(document, false); } else start(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  window.addEventListener('beforeprint', () => { printing = true; stop(); });
  window.addEventListener('afterprint', () => { printing = false; start(); });
  if (reduced.matches) highlightWithin(document, false);
  else start();
}
initPortfolioMotion();

// Cursor-driven depth, with a damped return to the exact original design.
// Stable pointer surfaces; only their existing descendants move.
function initInteractiveDepth() {
  if (!window.requestAnimationFrame || !window.matchMedia) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const precise = matchMedia('(hover: hover) and (pointer: fine)');
  const compact = matchMedia('(max-width: 620px)');
  const stage = document.querySelector('.profile-stage');
  const hero = document.querySelector('.hero');
  const surfaces = new Map();
  let frame = 0;
  let last = 0;
  let printing = false;

  const enabled = () => precise.matches && !reduce.matches && !document.hidden && !printing;
  const clamp = n => Math.max(-1, Math.min(1, n));
  const transform = (x, y, rx, ry, scale = 1) =>
    'perspective(850px) translate3d(' + x.toFixed(3) + 'px,' + y.toFixed(3) +
    'px,0) rotateX(' + rx.toFixed(3) + 'deg) rotateY(' + ry.toFixed(3) + 'deg) scale(' + scale.toFixed(4) + ')';

  function attach(surface, layers, allowed = () => true) {
    if (!surface || !layers.length) return;
    const state = {
      surface, layers: layers.filter(layer => layer.node).map(layer => ({
        ...layer, original: layer.node.style.transform
      })),
      allowed, x: 0, y: 0, strength: 0, tx: 0, ty: 0, ts: 0, rect: null
    };
    if (!state.layers.length) return;
    surfaces.set(surface, state);
    function move(event) {
      if (!enabled() || !allowed() || event.pointerType !== 'mouse' || surface.closest('[hidden]')) return;
      // The hit surface is never transformed by this particular effect.
      state.rect ||= surface.getBoundingClientRect();
      const r = state.rect;
      if (r.width < 1 || r.height < 1) return;
      state.tx = clamp((event.clientX - r.left) / r.width * 2 - 1);
      state.ty = clamp((event.clientY - r.top) / r.height * 2 - 1);
      state.ts = 1;
      kick();
    }
    surface.addEventListener('pointerenter', event => { state.rect = null; move(event); });
    surface.addEventListener('pointermove', move, { passive: true });
    surface.addEventListener('pointerleave', () => release(state));
    surface.addEventListener('pointercancel', () => release(state));
  }

  function restore(state) {
    for (const layer of state.layers) layer.node.style.transform = layer.original;
    state.x = state.y = state.strength = state.tx = state.ty = state.ts = 0;
    state.rect = null;
  }
  function release(state) {
    state.tx = state.ty = state.ts = 0;
    state.rect = null;
    if (state.strength > 0) kick();
  }
  function kick() {
    if (!frame && enabled()) { last = 0; frame = requestAnimationFrame(tick); }
  }
  function tick(now) {
    frame = 0;
    if (!enabled()) { reset(); return; }
    const dt = last ? Math.min(now - last, 40) : 16.7;
    last = now;
    const blend = 1 - Math.exp(-dt / 85);
    let moving = false;
    for (const state of surfaces.values()) {
      if (!state.allowed() || state.surface.closest('[hidden]')) { if (state.strength || state.ts) restore(state); continue; }
      if (!state.strength && !state.ts) continue;
      state.x += (state.tx - state.x) * blend;
      state.y += (state.ty - state.y) * blend;
      state.strength += (state.ts - state.strength) * blend;
      const unsettled = Math.abs(state.x - state.tx) + Math.abs(state.y - state.ty) + Math.abs(state.strength - state.ts) > .003;
      if (!state.ts && !unsettled) { restore(state); continue; }
      for (const layer of state.layers) {
        layer.node.style.transform = layer.draw(state.x, state.y, state.strength);
      }
      moving ||= unsettled;
    }
    if (moving) frame = requestAnimationFrame(tick);
  }
  function reset() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; last = 0;
    for (const state of surfaces.values()) if (state.strength || state.ts) restore(state);
  }

  // The existing hero becomes a reactive multi-layer scene, not a static hover.
  if (hero && stage) {
    const panel = stage.querySelector('.profile-panel');
    const portrait = stage.querySelector('.profile-photo');
    const badges = [...stage.querySelectorAll('.specialty-item')];
    attach(hero, [
      { node: panel, draw: (x, y, t) => transform(x * 9, y * 8, -y * 7, x * 8, 1 + t * .012) },
      { node: portrait, draw: (x, y, t) => transform(x * -12, y * -10, 0, 0, 1 + t * .10) },
      ...badges.map((node, index) => ({
        node, draw: (x, y, t) => {
          const depth = ([18, 24, 30][index] || 20) * (compact.matches ? .4 : 1);
          return transform(x * depth, y * depth * .65, -y * 3, x * 4, 1 + t * .018);
        }
      }))
    ], () => stage.dataset.motion === 'running');
    stage.querySelector('.motion-toggle')?.addEventListener('click', () => {
      if (stage.dataset.motion === 'paused') {
        const state = surfaces.get(hero);
        if (state) restore(state);
      }
    });
  }
  // Project imagery tracks the pointer inside its existing clipped preview.
  // Text and links remain in their original hitboxes and never drift.
  for (const card of document.querySelectorAll('.project, .credential-card, .community-card, .cv-item')) {
    const previews = [...card.querySelectorAll('.product-shot img, .credential-visual img, .source-preview img')];
    const heading = card.querySelector('h3');
    const layers = previews.map(node => ({
      node, draw: (x, y, t) => transform(x * 10, y * 7, -y * 4, x * 5, 1 + t * .065)
    }));
    if (heading) layers.push({ node: heading, draw: (x, y, t) => transform(x * 5, y * 3, 0, 0, 1) });
    attach(card, layers);
  }
  // Magnetic movement applies to the hero action group, not each hitbox.
  const actions = hero?.querySelector('.actions');
  if (actions) attach(actions, [...actions.querySelectorAll('.pill')].map(node => ({
    node, draw: (x, y, t) => transform(x * 7, y * 5, 0, 0, 1 + t * .025)
  })));

  // A real scroll releases pointer state; no ongoing work when resting/offscreen.
  window.addEventListener('scroll', () => {
    for (const state of surfaces.values()) if (state.ts) release(state);
  }, { passive: true });
  window.addEventListener('resize', reset);
  window.addEventListener('blur', reset);
  reduce.addEventListener('change', reset);
  precise.addEventListener('change', reset);
  document.addEventListener('visibilitychange', reset);
  document.addEventListener('focusin', reset);
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', reset));
  window.addEventListener('beforeprint', () => { printing = true; reset(); });
  window.addEventListener('afterprint', () => { printing = false; });
}
initInteractiveDepth();


// One living lattice replaces the static CSS grid across the whole page.
// Coordinates follow the document; only the visible viewport is rasterized.
function initPageGrid() {
  if (!window.requestAnimationFrame || !window.matchMedia) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'page-grid';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  const root = document.documentElement;
  const body = document.body;
  const stage = document.querySelector('.profile-stage');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const precise = matchMedia('(hover: hover) and (pointer: fine)');
  const STEP = 40;
  let width = 0, height = 0, dpr = 1, frame = 0, last = 0, elapsed = 0;
  let printing = false, dark = root.dataset.theme === 'dark';
  let px = 0, py = 0, tx = 0, ty = 0, influence = 0, targetInfluence = 0;
  const points = [];
  body.prepend(canvas);
  const enabled = () => !reduce.matches && !printing && stage?.dataset.motion !== 'paused';
  const running = () => enabled() && !document.hidden && width > 0 && height > 0;
  const mod = (value, divisor) => ((value % divisor) + divisor) % divisor;

  function resize() {
    const w = root.clientWidth, h = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w <= 0 || h <= 0) return;
    if (w !== width || h !== height || ratio !== dpr) {
      width = w; height = h; dpr = ratio;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    reconcile();
  }

  function draw() {
    if (!width || !height || !enabled()) return;
    ctx.clearRect(0, 0, width, height);
    const mobile = width < 640;
    const radius = mobile ? 150 : 240;
    const t = elapsed / 1000;
    const scroll = window.scrollY || 0;
    const firstRow = Math.floor(scroll / STEP) - 1;
    const rowCount = Math.ceil(height / STEP) + 4;
    const colCount = Math.ceil(width / STEP) + 3;
    // Shared vertices guarantee that every crossing, line and particle agrees.
    const vertex = (row, col) => points[row * colCount + col];
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        const x = (col - 1) * STEP;
        const y = (firstRow + row) * STEP - scroll;
        const dx = x - px, dy = y - py;
        const distance = Math.hypot(dx, dy);
        const falloff = Math.max(0, 1 - distance / radius);
        const smooth = falloff * falloff * (3 - 2 * falloff);
        // Local elastic wave, never a loose collection of independent sticks.
        const ripple = influence * smooth * (5 + 8 * Math.sin(distance / 32 - t * 3.0));
        const divisor = Math.max(18, distance);
        const index = row * colCount + col;
        const point = points[index] || (points[index] = {});
        point.x = x + dx / divisor * ripple;
        point.y = y + dy / divisor * ripple;
      }
    }

    ctx.lineWidth = .85;
    ctx.strokeStyle = dark ? 'rgba(245,244,239,.072)' : 'rgba(25,25,25,.071)';
    ctx.beginPath();
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < colCount; col++) {
        const point = vertex(row, col);
        if (col === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
    }
    for (let col = 0; col < colCount; col++) {
      for (let row = 0; row < rowCount; row++) {
        const point = vertex(row, col);
        if (row === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
    }
    ctx.stroke();
    if (influence > .015) {
      const glow = ctx.createRadialGradient(px, py, 0, px, py, radius);
      const tint = dark ? '171,201,187' : '71,105,94';
      glow.addColorStop(0, 'rgba(' + tint + ',' + (.14 * influence).toFixed(4) + ')');
      glow.addColorStop(.55, 'rgba(' + tint + ',' + (.07 * influence).toFixed(4) + ')');
      glow.addColorStop(1, 'rgba(' + tint + ',0)');
      ctx.strokeStyle = glow;
      ctx.stroke();
    }

    function dot(a, b, fraction, phase) {
      if (!a || !b) return;
      // Interpolation along the actual deformed segment, not a parallel path.
      const x = a.x + (b.x - a.x) * fraction;
      const y = a.y + (b.y - a.y) * fraction;
      const pulse = .65 + .35 * Math.sin(t * .9 + phase);
      const rgb = dark ? '171,201,187' : '71,105,94';
      ctx.fillStyle = 'rgba(' + rgb + ',' + ((dark ? .43 : .34) * pulse).toFixed(4) + ')';
      ctx.beginPath(); ctx.arc(x, y, mobile ? 1.65 : 2, 0, Math.PI * 2); ctx.fill();
    }
    // Sparse packets run along actual horizontal and vertical grid edges.
    // Document-anchored rows remain consistent during scrolling.
    const spacing = mobile ? 21 : 18;
    for (let row = 0; row < rowCount; row++) {
      const worldRow = firstRow + row;
      if (mod(worldRow, mobile ? 7 : 5) !== 2) continue;
      const phase = mod(worldRow * 7.137, spacing);
      const speed = mod(worldRow, 2) ? .48 : -.48;
      const cell = mod(phase + t * speed, spacing);
      for (let x = cell - spacing; x < colCount; x += spacing) {
        const col = Math.floor(x) + 1;
        if (col < 0 || col + 1 >= colCount) continue;
        dot(vertex(row, col), vertex(row, col + 1), x - Math.floor(x), phase);
      }
    }
    for (let col = 1; col < colCount - 1; col++) {
      const worldCol = col - 1;
      if (mod(worldCol, mobile ? 6 : 7) !== 3) continue;
      const phase = mod(worldCol * 3.73, spacing);
      const speed = mod(worldCol, 2) ? .36 : -.36;
      const start = firstRow + mod(phase + t * speed - firstRow, spacing);
      for (let y = start; y < firstRow + rowCount - 1; y += spacing) {
        const row = Math.floor(y) - firstRow;
        if (row < 0 || row + 1 >= rowCount) continue;
        dot(vertex(row, col), vertex(row + 1, col), y - Math.floor(y), phase);
      }
    }
  }

  function tick(now) {
    frame = 0;
    if (!running()) { last = 0; return; }
    if (!last || now - last >= 32) {
      const dt = last ? Math.min(now - last, 70) : 33;
      last = now; elapsed += dt;
      const blend = 1 - Math.exp(-dt / 110);
      px += (tx - px) * blend;
      py += (ty - py) * blend;
      influence += (targetInfluence - influence) * blend;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function reconcile() {
    // Static CSS grid is the fallback for accessibility, print or pause.
    const active = enabled() && width > 0 && height > 0;
    canvas.hidden = !active;
    if (active) body.dataset.liveGrid = '';
    else delete body.dataset.liveGrid;
    if (running()) {
      canvas.dataset.ambientState = 'running';
      draw();
      if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
    } else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; last = 0;
      canvas.dataset.ambientState = 'paused';
      if (!active) influence = targetInfluence = 0;
    }
  }

  window.addEventListener('pointermove', event => {
    if (!running() || !precise.matches || event.pointerType !== 'mouse') return;
    if (targetInfluence === 0 && influence < .01) { px = event.clientX; py = event.clientY; }
    tx = event.clientX; ty = event.clientY; targetInfluence = 1;
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) targetInfluence = 0; });
  window.addEventListener('pointercancel', () => { targetInfluence = 0; });
  window.addEventListener('blur', () => { targetInfluence = 0; });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('scroll', () => { if (running()) draw(); }, { passive: true });
  reduce.addEventListener('change', reconcile);
  precise.addEventListener('change', () => { targetInfluence = 0; });
  document.addEventListener('visibilitychange', reconcile);
  stage?.querySelector('.motion-toggle')?.addEventListener('click', reconcile);
  if (window.MutationObserver) {
    const theme = new MutationObserver(() => {
      dark = root.dataset.theme === 'dark';
      if (enabled()) draw();
    });
    theme.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  window.addEventListener('beforeprint', () => { printing = true; reconcile(); });
  window.addEventListener('afterprint', () => { printing = false; reconcile(); });
  resize();
}
initPageGrid();
