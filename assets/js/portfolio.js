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

function initTheme() {
  const button = document.getElementById('theme-toggle');
  if (!button) return;
  function setTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    button.setAttribute('aria-pressed', String(dark));
    const label = dark ? button.dataset.labelLight : button.dataset.labelDark;
    button.setAttribute('aria-label', label);
    button.title = label;
    // Keep the icon-only button intact; never replace its SVG children with text.
    try { localStorage.setItem('portfolio-theme', dark ? 'dark' : 'light'); } catch {}
  }
  let saved;
  try { saved = localStorage.getItem('portfolio-theme'); } catch {}
  setTheme(saved === 'dark');
  button.addEventListener('click', () => setTheme(document.documentElement.dataset.theme !== 'dark'));
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
  if (!Element.prototype.animate || !window.IntersectionObserver) return;
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
  let observer;
  let printing = false;

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

  function stop() {
    observer?.disconnect();
    for (const animation of active) animation.cancel();
    active.clear();
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
        [...(copy?.children || [])].forEach((node, i) => enter(node, {
          delay: i * 115, x: i === 1 ? inline * 25 : 0, y: i === 1 ? 42 : 26,
          duration: i === 1 ? 1250 : 920, opacity: i === 1 ? .18 : .22
        }));
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
    observer?.disconnect();
    observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting && !entry.target.closest('[hidden]'));
      visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top ||
        -inline * (a.boundingClientRect.left - b.boundingClientRect.left));
      visible.forEach((entry, i) => {
        observer.unobserve(entry.target);
        const node = entry.target;
        const heading = node.matches('.sectionhead, .group-heading');
        const job = node.matches('.job');
        enter(node, {
          delay: Math.min(i, 4) * 100, x: heading || job ? inline * 20 : 0,
          y: heading ? 25 : 38, duration: heading ? 880 : 1050, opacity: .18
        });
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    targets.forEach(node => { if (!seen.has(node)) observer.observe(node); });
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
          const depth = [18, 24, 30][index] || 20;
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
