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


// Progressive enhancement: no hidden content, layout changes, or runtime dependencies.
function initPortfolioMotion() {
  if (!Element.prototype.animate || !window.IntersectionObserver) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const active = new Set();
  const seen = new WeakSet();
  const stage = document.querySelector('.profile-stage');
  const ease = 'cubic-bezier(.16, 1, .3, 1)';
  const revealTargets = [...document.querySelectorAll(
    '.track > div, .sectionhead, .group-heading, .project, .job, .principle, .stack > div, .credential-card, .community-card, .cv-item, .contact h2, .contact .actions'
  )];
  let introPlayed = false;
  let observer;

  function play(node, frames, options, kind = 'reveal') {
    if (reduced.matches || document.hidden || !node) return;
    const animation = node.animate(frames, { easing: ease, ...options });
    animation.id = 'portfolio-motion-' + kind;
    active.add(animation);
    const cleanup = () => active.delete(animation);
    animation.addEventListener('finish', cleanup, { once: true });
    animation.addEventListener('cancel', cleanup, { once: true });
    return animation;
  }
  function cancelAll() {
    observer?.disconnect();
    for (const animation of active) animation.cancel();
    active.clear();
  }
  function enter(node, delay = 0, distance = 18, duration = 640) {
    if (!node || seen.has(node)) return;
    seen.add(node);
    play(node, [
      { opacity: .38, translate: '0 ' + distance + 'px' },
      { opacity: 1, translate: '0 0' }
    ], { duration, delay, fill: 'backwards' });
  }

  function start() {
    if (reduced.matches) return;
    if (!introPlayed) {
      introPlayed = true;
      const hero = document.querySelector('.hero');
      // Animate full Arabic text blocks rather than splitting connected letters.
      if (hero && hero.getBoundingClientRect().bottom > 0 && window.scrollY < 120) {
        [...hero.querySelectorAll('.hero-copy > *')].forEach((node, i) => enter(node, i * 65, 18, 680));
        if (stage?.dataset.motion === 'running') {
          enter(stage, 120, 16, 760);
          [...stage.querySelectorAll('.specialty-item')].forEach((node, i) => enter(node, 220 + i * 65, 10, 620));
        }
      }
    }
    observer?.disconnect();
    observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting && !entry.target.closest('[hidden]'));
      visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      visible.forEach((entry, i) => {
        observer.unobserve(entry.target);
        enter(entry.target, Math.min(i, 4) * 48, 20, 620);
      });
    }, { threshold: 0.08 });
    revealTargets.forEach(node => { if (!seen.has(node)) observer.observe(node); });
  }

  // Local hover feedback on precise pointers, not on touch screens.
  const hover = new WeakMap();
  for (const card of document.querySelectorAll('.project, .credential-card, .community-card, .cv-item')) {
    const move = (inside) => {
      if (!fine.matches || reduced.matches) return;
      const current = getComputedStyle(card).scale;
      hover.get(card)?.cancel();
      const animation = play(card, [
        { scale: current === 'none' ? '1' : current },
        { scale: inside ? '1.012' : '1' }
      ], { duration: inside ? 340 : 250, fill: inside ? 'forwards' : 'none' }, 'hover');
      if (animation) hover.set(card, animation);
    };
    card.addEventListener('pointerenter', () => move(true));
    card.addEventListener('pointerleave', () => move(false));
  }
  // A filter change animates the newly presented cards without hiding any content.
  for (const button of document.querySelectorAll('[data-filter]')) {
    button.addEventListener('click', () => {
      if (reduced.matches) return;
      const visible = [...document.querySelectorAll('.project:not([hidden])')].filter(card => {
        const bounds = card.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < window.innerHeight;
      });
      visible.forEach((card, i) => {
        if (!seen.has(card)) return; // IntersectionObserver handles first appearance.
        for (const animation of card.getAnimations()) {
          if (animation.id === 'portfolio-motion-reveal' || animation.id === 'portfolio-motion-filter') animation.cancel();
        }
        play(card, [{ opacity: .65, translate: '0 8px' }, { opacity: 1, translate: '0 0' }],
          { duration: 350, delay: Math.min(i, 4) * 35, fill: 'backwards' }, 'filter');
      });
    });
  }
  stage?.querySelector('.motion-toggle')?.addEventListener('click', () => {
    if (stage.dataset.motion === 'paused') {
      for (const animation of active) {
        if (stage.contains(animation.effect?.target)) animation.cancel();
      }
    }
  });
  const resetHover = () => {
    document.querySelectorAll('.project, .credential-card, .community-card, .cv-item').forEach(card => hover.get(card)?.cancel());
  };
  reduced.addEventListener('change', () => {
    if (reduced.matches) { cancelAll(); resetHover(); }
    else start();
  });
  fine.addEventListener('change', resetHover);
  window.addEventListener('beforeprint', () => { cancelAll(); resetHover(); });
  window.addEventListener('afterprint', start);
  start();
}
initPortfolioMotion();
