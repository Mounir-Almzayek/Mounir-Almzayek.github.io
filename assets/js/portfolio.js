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
    if (result) result.textContent = count + ' selected projects';
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
    button.textContent = dark ? 'Light mode' : 'Dark mode';
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
    toggle.querySelector('span').textContent = active ? 'Motion on' : 'Motion off';
  }
  update();
  toggle.addEventListener('click', () => { enabled = !enabled; update(); });
  reduced.addEventListener('change', update);
  if (window.matchMedia('(pointer: fine)').matches) {
    let frame = 0;
    stage.addEventListener('pointermove', event => {
      if (stage.dataset.motion !== 'running') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (stage.dataset.motion !== 'running') return;
        const bounds = stage.getBoundingClientRect();
        stage.style.setProperty('--pointer-x', ((event.clientX - bounds.left) / bounds.width - .5) * 7 + 'px');
        stage.style.setProperty('--pointer-y', ((event.clientY - bounds.top) / bounds.height - .5) * 7 + 'px');
      });
    }, { passive: true });
    stage.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      stage.style.removeProperty('--pointer-x');
      stage.style.removeProperty('--pointer-y');
    });
  }
}

initTheme();
initProjectFilters();
initImageFallbacks();
initPortraitMotion();
document.getElementById('print')?.addEventListener('click', () => window.print());
