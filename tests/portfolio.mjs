import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, access } from 'node:fs/promises';

const origin = 'http://127.0.0.1:8765';
const html = await readFile('index.html', 'utf8');
for (const match of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) await access(match[1]);
const browser = await chromium.launch();
try {
  for (const locale of ['en', 'ar']) for (const width of [390, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + (locale === 'ar' ? '/ar/' : '/'), { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    assert.equal(await page.locator('html').evaluate(node => getComputedStyle(node).direction), locale === 'ar' ? 'rtl' : 'ltr');
    assert.equal(await page.locator('.language-toggle').getAttribute('href'), locale === 'ar' ? '/' : '/ar/');
    assert.ok(await page.locator('.language-toggle').isVisible());
    const photo = page.locator('.profile-photo');
    await photo.evaluate(img => img.decode());
    const box = await photo.boundingBox();
    assert.ok(box && box.width >= (width === 1440 ? 375 : 210), 'Portrait width at ' + width);
    assert.equal(await photo.evaluate(img => getComputedStyle(img).filter), 'none');
    assert.equal(await page.locator('.project').count(), 18);
    assert.equal(await page.locator('.project-group').count(), 4);
    const columns = async group => page.locator('[data-project-group="' + group + '"] .group-grid').evaluate(grid => getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length);
    assert.equal(await columns('apps'), width <= 560 ? 1 : 2);
    assert.equal(await columns('engineering'), width <= 560 ? 1 : width <= 850 ? 2 : 3);
    assert.equal(await page.locator('.project figure').count(), 18);
    assert.equal(await page.locator('[data-project-group="archive"]').count(), 0);
    assert.equal(await page.locator('#resumes a[href*="drive.google.com/file/d/"]').count(), 4);
    assert.equal(await page.locator('[data-store-gallery="bin-taleb"] img').count(), 3);
    assert.equal(await page.locator('[data-store-gallery="zaker"] img').count(), 3);
    assert.equal(await page.locator('[data-visitors-preview] a').getAttribute('href'), 'https://visitors-rs.com/');
    assert.ok(await page.locator('a[href*="com.rs4it.qomel.visitors"]').count());
    assert.equal(await page.locator('[data-project-group="apps"] .project h3').first().innerText(), 'Zaker');
    for (const img of await page.locator('img[src*="assets/"]').all()) {
      await img.evaluate(async image => { image.loading = 'eager'; await image.decode(); });
    }
    const duplicates = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    });
    assert.deepEqual(duplicates, []);
    const missing = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(id => id !== '#' && !document.getElementById(id.slice(1))));
    assert.deepEqual(missing, []);
    await page.locator('[data-filter="published"]').click();
    assert.equal(await page.locator('.project:not([hidden])').count(), 5);
    await page.locator('[data-filter="ai"]').click();
    assert.ok(await page.locator('.project:not([hidden])').count() > 0);
    await page.locator('[data-filter="all"]').click();
    assert.equal(await page.locator('.project:not([hidden])').count(), 18);
    const signal = page.locator('.signal-runner');
    const strip = page.locator('.specialty-float');
    assert.equal(await strip.locator('.specialty-item').count(), 3);
    assert.equal(await page.locator('.profile-orbit, .orbit-label, .portrait-halo').count(), 0);
    assert.equal(await signal.evaluate(node => getComputedStyle(node).animationName), 'engineering-signal');
    const initial = await signal.evaluate(node => getComputedStyle(node).transform);
    await page.waitForTimeout(400);
    assert.notEqual(await signal.evaluate(node => getComputedStyle(node).transform), initial);
    await page.locator('.motion-toggle').click();
    assert.equal(await signal.evaluate(node => getComputedStyle(node).animationPlayState), 'paused');
    await page.locator('.motion-toggle').click();
    assert.equal(await signal.evaluate(node => getComputedStyle(node).animationPlayState), 'running');
    await photo.scrollIntoViewIfNeeded();
    const documentBounds = () => photo.evaluate(node => {
      const b = node.getBoundingClientRect();
      return [b.x + scrollX, b.y + scrollY, b.width, b.height];
    });
    const photoBefore = await documentBounds();
    await photo.hover();
    await page.waitForTimeout(400);
    const photoAfter = await documentBounds();
    assert.ok(photoAfter.every((value, i) => Math.abs(value - photoBefore[i]) < 1), 'Portrait remains fixed in document coordinates');
    const bounds = await strip.locator('.specialty-item').evaluateAll(nodes => nodes.map(node => {const r=node.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
    const portrait = await photo.boundingBox();
    assert.ok(bounds[0].right <= bounds[1].x && Math.abs(bounds[0].y-bounds[1].y)<1, 'Top specialty cards aligned without overlap');
    assert.ok(bounds.every(card => card.bottom <= portrait.y || card.y >= portrait.y+portrait.height), 'Cards must stay outside the portrait');
    assert.match(await page.locator('#filter-result').innerText(), locale === 'ar' ? /مشاريع/ : /selected projects/i);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: '/tmp/portfolio-' + locale + '-' + width + '-light.png', animations: 'disabled' });
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('#theme-toggle').innerText(), locale === 'ar' ? 'الوضع الفاتح' : 'Light mode');
    await page.screenshot({ path: '/tmp/portfolio-' + locale + '-' + width + '-dark.png', animations: 'disabled' });
    assert.deepEqual(errors, []);
    console.log('Passed: ' + locale + ' ' + width + 'px, projects, images, links, filters, themes and motion');
    await page.close();
  }
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('.signal-runner').evaluate(p => getComputedStyle(p).animationName), 'none');
  assert.equal(await page.locator('.motion-toggle').isVisible(), false);
  assert.equal(await page.locator('meta[property="og:image"]').count(), 1);
  const url = await page.locator('meta[property="og:image"]').getAttribute('content');
  const image = await page.evaluate(async path => {
    const img = new Image(); img.src = path; await img.decode(); return [img.naturalWidth, img.naturalHeight];
  }, new URL(url).pathname);
  assert.deepEqual(image, [1200, 630]);
  console.log('Passed: reduced motion and Open Graph image');
} finally {
  await browser.close();
}
