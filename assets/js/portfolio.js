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
    if (node.contains(document.activeElement)) return;
    play(node, [
      { opacity, translate: x + 'px ' + y + 'px' },
      { opacity: 1, translate: '0 0' }
    ], { duration, delay, fill: 'backwards' });
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
      }
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
      if (node.contains(event.target)) { releasePending(node); seen.add(node); }
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
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); else start(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  window.addEventListener('beforeprint', () => { printing = true; stop(); });
  window.addEventListener('afterprint', () => { printing = false; start(); });
  start();
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


// Decorative ambient engineering field, isolated behind the landing hero.
function initHeroAmbient() {
  const hero = document.querySelector('.hero');
  if (!hero || !window.requestAnimationFrame || !window.IntersectionObserver ||
      !window.ResizeObserver) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-ambient';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  hero.prepend(canvas);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const precise = matchMedia('(hover: hover) and (pointer: fine)');
  const stage = hero.querySelector('.profile-stage');
  const root = document.documentElement;
  let width = 0, height = 0, ratio = 1, frame = 0, last = 0, elapsed = 0;
  let visible = false, printing = false, dark = root.dataset.theme === 'dark';
  let pointerX = .5, pointerY = .5, targetX = .5, targetY = .5;
  let pointerStrength = 0, targetStrength = 0;
  const nodes = [];
  const links = [];
  // Fixed seed keeps the composition stable across resize and both languages.
  let seed = 8197;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 29; i++) {
    nodes.push({
      x: .035 + random() * .93, y: .06 + random() * .88,
      phase: random() * Math.PI * 2, speed: .12 + random() * .19,
      depth: .45 + random() * .8, radius: .7 + random() * 1.3
    });
  }
  for (let i = 0; i < nodes.length; i++) {
    const nearest = nodes.map((n, j) => ({
      j, d: Math.hypot(n.x - nodes[i].x, (n.y - nodes[i].y) * .65)
    })).filter(n => n.j !== i && n.d < .25).sort((a, b) => a.d - b.d).slice(0, 2);
    for (const n of nearest) {
      if (!links.some(link => (link.a === i && link.b === n.j) || (link.a === n.j && link.b === i))) {
        links.push({ a: i, b: n.j, phase: random(), pulse: random() < .48, bend: random() > .5 });
      }
    }
  }
  const canRun = () => visible && !printing && !document.hidden && !reduce.matches &&
    stage?.dataset.motion !== 'paused' && width > 0 && height > 0;

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w === width && h === height && dpr === ratio) return;
    width = w; height = h; ratio = dpr;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
    reconcile();
  }

  function draw() {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    if (printing) return;
    const ink = dark ? '171,201,187' : '71,105,94';
    const neutral = dark ? '225,229,223' : '55,66,61';
    const rgb = (color, alpha) => 'rgba(' + color + ',' + alpha.toFixed(4) + ')';
    const compact = width < 620;
    const count = compact ? 18 : nodes.length;
    const t = elapsed / 1000;
    const rtl = root.dir === 'rtl';
    const field = nodes.slice(0, count).map(n => {
      const baseX = (rtl ? 1 - n.x : n.x) * width;
      const baseY = n.y * height;
      const dx = (pointerX * width - baseX), dy = (pointerY * height - baseY);
      const influence = Math.max(0, 1 - Math.hypot(dx, dy) / 210) * pointerStrength;
      return {
        x: baseX + Math.sin(t * n.speed + n.phase) * 15 * n.depth + dx * influence * .075,
        y: baseY + Math.cos(t * n.speed * .8 + n.phase) * 11 * n.depth + dy * influence * .075,
        influence, n
      };
    });
    // Fine network connections and moving signal packets along their paths.
    ctx.lineWidth = .75;
    for (const link of links) {
      if (link.a >= count || link.b >= count) continue;
      const a = field[link.a], b = field[link.b];
      const pulse = (Math.sin(t * .8 + link.phase * 6.28) + 1) * .5;
      const strength = Math.max(a.influence, b.influence);
      const alpha = (dark ? .11 : .095) + pulse * .035 + strength * .10;
      const mid = link.bend ? { x: a.x, y: b.y } : { x: b.x, y: a.y };
      ctx.strokeStyle = rgb(ink, alpha);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      // Mix direct links and right-angle traces to resemble a subtle circuit.
      if (link.bend) ctx.lineTo(mid.x, mid.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (link.pulse) {
        const p = (t * .12 + link.phase) % 1;
        let x, y;
        if (link.bend) {
          const first = Math.abs(mid.y - a.y);
          const total = first + Math.abs(b.x - mid.x);
          const dist = p * total;
          if (dist < first) { x = a.x; y = a.y + (mid.y - a.y) * dist / (first || 1); }
          else { x = mid.x + (b.x - mid.x) * (dist - first) / (total - first || 1); y = b.y; }
        } else { x = a.x + (b.x - a.x) * p; y = a.y + (b.y - a.y) * p; }
        ctx.fillStyle = rgb(ink, (dark ? .28 : .23) * Math.sin(Math.PI * p));
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Drifting junctions, small rings and restrained cursor interaction.
    for (let i = 0; i < field.length; i++) {
      const { x, y, n, influence } = field[i];
      const breathing = .5 + .5 * Math.sin(t * .9 + n.phase);
      ctx.fillStyle = rgb(neutral, .12 + breathing * .12 + influence * .12);
      ctx.beginPath(); ctx.arc(x, y, n.radius, 0, Math.PI * 2); ctx.fill();
      if (i % 4 === 0) {
        ctx.strokeStyle = rgb(ink, .07 + breathing * .06 + influence * .09);
        ctx.beginPath(); ctx.arc(x, y, 5 + breathing * 4, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // Fade the field at its edges and behind the text, without overlaying the content.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    const vertical = ctx.createLinearGradient(0, 0, 0, height);
    vertical.addColorStop(0, 'rgba(0,0,0,0)');
    vertical.addColorStop(.12, 'rgba(0,0,0,1)');
    vertical.addColorStop(.83, 'rgba(0,0,0,1)');
    vertical.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vertical; ctx.fillRect(0, 0, width, height);
    const horizontal = ctx.createLinearGradient(0, 0, width, 0);
    horizontal.addColorStop(0, 'rgba(0,0,0,.22)');
    horizontal.addColorStop(.08, 'rgba(0,0,0,.84)');
    horizontal.addColorStop(.92, 'rgba(0,0,0,.84)');
    horizontal.addColorStop(1, 'rgba(0,0,0,.22)');
    ctx.fillStyle = horizontal; ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function tick(now) {
    frame = 0;
    if (!canRun()) { last = 0; return; }
    if (!last || now - last >= 32) {
      const dt = last ? Math.min(now - last, 64) : 33;
      last = now; elapsed += dt;
      const blend = 1 - Math.exp(-dt / 170);
      pointerX += (targetX - pointerX) * blend;
      pointerY += (targetY - pointerY) * blend;
      pointerStrength += (targetStrength - pointerStrength) * blend;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function reconcile() {
    if (canRun()) {
      canvas.dataset.ambientState = 'running';
      if (!frame) { last = 0; frame = requestAnimationFrame(tick); }
    } else {
      if (frame) cancelAnimationFrame(frame);
      frame = 0; last = 0;
      canvas.dataset.ambientState = 'paused';
      if (reduce.matches) { elapsed = 0; targetStrength = pointerStrength = 0; draw(); }
    }
  }

  hero.addEventListener('pointermove', event => {
    if (!canRun() || !precise.matches || event.pointerType !== 'mouse') return;
    const rect = hero.getBoundingClientRect();
    targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    targetStrength = 1;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { targetStrength = 0; });
  hero.addEventListener('pointercancel', () => { targetStrength = 0; });
  const visibility = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    reconcile();
  });
  visibility.observe(hero);
  const layout = new ResizeObserver(resize);
  layout.observe(hero);
  const theme = new MutationObserver(() => {
    dark = root.dataset.theme === 'dark';
    draw();
  });
  theme.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  stage?.querySelector('.motion-toggle')?.addEventListener('click', reconcile);
  reduce.addEventListener('change', reconcile);
  precise.addEventListener('change', () => { targetStrength = 0; });
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('beforeprint', () => { printing = true; reconcile(); });
  window.addEventListener('afterprint', () => { printing = false; draw(); reconcile(); });
  resize();
}
initHeroAmbient();
