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
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const active = new Set();
  const seen = new WeakSet();
  const stage = document.querySelector('.profile-stage');
  const rtl = document.documentElement.dir === 'rtl';
  const inline = rtl ? 1 : -1;
  const ease = 'cubic-bezier(.16, 1, .3, 1)';
  const targets = [...document.querySelectorAll(
    '.track > div, .sectionhead, .group-heading, .project, .job, .principle, .stack > div, .credential-card, .community-card, .cv-item, .contact h2, .contact .actions'
  )];
  const cards = [...document.querySelectorAll('.project, .credential-card, .community-card, .cv-item')];
  const hover = new Map();
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

  function cancelHover() {
    for (const animation of hover.values()) animation.cancel();
    hover.clear();
  }

  function stop() {
    observer?.disconnect();
    for (const animation of active) animation.cancel();
    active.clear();
    cancelHover();
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
          delay: i * 75, x: i === 1 ? inline * 18 : 0, y: i === 1 ? 28 : 16,
          duration: i === 1 ? 900 : 690, opacity: i === 1 ? .62 : .48
        }));
        if (stage?.dataset.motion === 'running') {
          enter(stage, { delay: 100, y: 20, duration: 850 });
          const portrait = stage.querySelector('.profile-photo');
          // A short cinematic crop reveal stays inside the existing portrait frame.
          play(portrait, [
            { clipPath: 'inset(0 0 22% 0)', scale: '1.035' },
            { clipPath: 'inset(0 0 0 0)', scale: '1' }
          ], { duration: 950, delay: 120, fill: 'backwards' }, 'portrait');
          [...stage.querySelectorAll('.specialty-item')].forEach((node, i) => {
            enter(node, { delay: 310 + i * 90, x: (i % 2 ? -1 : 1) * 13, y: 10, duration: 760 });
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
          delay: Math.min(i, 4) * 64, x: heading || job ? inline * 12 : 0,
          y: heading ? 15 : 26, duration: heading ? 680 : 780
        });
      });
    }, { threshold: 0, rootMargin: '0px 0px -7% 0px' });
    targets.forEach(node => { if (!seen.has(node)) observer.observe(node); });
  }

  // Animate existing media and cards only: no new overlays, elements or resting styles.
  for (const card of cards) {
    const media = card.querySelector('.product-shot img, .credential-visual img, .source-preview img');
    const node = media || card;
    function move(inside) {
      if (!fine.matches || reduced.matches || document.hidden || printing) return;
      const current = getComputedStyle(node).scale;
      hover.get(card)?.cancel();
      const animation = play(node, [
        { scale: current === 'none' ? '1' : current },
        { scale: inside ? (media ? '1.016' : '1.008') : '1' }
      ], { duration: inside ? 460 : 340, fill: inside ? 'forwards' : 'none' }, 'hover');
      if (animation) {
        hover.set(card, animation);
        if (!inside) animation.addEventListener('finish', () => {
          if (hover.get(card) === animation) hover.delete(card);
        }, { once: true });
      }
    }
    card.addEventListener('pointerenter', () => move(true));
    card.addEventListener('pointerleave', () => move(false));
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
      cancelHover();
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
  fine.addEventListener('change', cancelHover);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  window.addEventListener('beforeprint', () => { printing = true; stop(); });
  window.addEventListener('afterprint', () => { printing = false; start(); });
  start();
}
initPortfolioMotion();
