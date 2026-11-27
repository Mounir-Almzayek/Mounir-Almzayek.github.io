import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFile, access } from 'node:fs/promises';

const origin = 'http://127.0.0.1:8765';
const html = await readFile('index.html', 'utf8');
for (const match of html.matchAll(/(?:src|href)="(assets\/[^"]+)"/g)) await access(match[1].split('?')[0]);
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
    const versions = await page.locator('link[href*="portfolio.css"],script[src*="portfolio.js"],link[href*="arabic-fonts.css"]').evaluateAll(nodes => nodes.map(node => new URL(node.href || node.src).searchParams.get('v')));
    assert.equal(versions.length, locale === 'ar' ? 3 : 2);
    assert.ok(versions.every(version => /^[a-f0-9]{12}$/.test(version)), 'Versioned CSS, JS and local fonts');
    const nav = page.locator('.top nav');
    const theme = page.locator('#theme-toggle');
    const menu = page.locator('.menu-toggle');
    const navPrimary = page.locator('.nav-primary');
    assert.equal(await page.locator('.language-toggle').innerText(), locale === 'ar' ? 'EN' : 'AR');
    assert.equal(await theme.innerText(), '');
    assert.equal(await theme.getAttribute('aria-label'), locale === 'ar' ? 'الوضع الداكن' : 'Dark mode');
    assert.ok(await theme.locator('.theme-moon').isVisible());
    assert.equal(await theme.locator('.theme-sun').isVisible(), false);
    assert.ok((await nav.boundingBox()).height <= 64, 'Compact header');
    assert.equal(await navPrimary.locator('a.pill').count(), 1);
    if (width <= 900) {
      assert.ok(await menu.isVisible());
      assert.equal(await navPrimary.isVisible(), false);
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      assert.ok(await navPrimary.isVisible());
      assert.equal(await navPrimary.locator('a:visible').count(), 6);
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      assert.equal(await navPrimary.isVisible(), false);
      await menu.click();
      await navPrimary.locator('a[href="#work"]').click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      await page.evaluate(() => scrollTo(0,0));
    } else {
      assert.equal(await menu.isVisible(), false);
      assert.equal(await navPrimary.locator('a:visible').count(), 6);
      const boxes = await navPrimary.locator('a').evaluateAll(links => links.map(link => link.getBoundingClientRect().toJSON()).sort((a,b) => a.x-b.x));
      assert.ok(boxes.slice(1).every((box,i) => box.x - boxes[i].right >= 12), 'Desktop links have visual separation');
    }
    if (locale === 'ar') {
      await page.evaluate(() => document.fonts.ready);
      assert.match(await page.locator('.hero h1').evaluate(node => getComputedStyle(node).fontFamily), /IBM Plex Sans Arabic/);
      assert.match(await page.locator('.projectbody p').first().evaluate(node => getComputedStyle(node).fontFamily), /IBM Plex Sans Arabic/);
      const faces = await page.evaluate(async () => {
        const loaded = await Promise.all([400,600,700].map(weight => document.fonts.load(weight+' 20px "IBM Plex Sans Arabic"', 'منير المزيك')));
        return loaded.map(items => items.some(face => face.status === 'loaded' && face.family.includes('IBM Plex Sans Arabic')));
      });
      assert.deepEqual(faces, [true,true,true], 'Local Arabic font faces loaded');
    } else {
      assert.equal(await page.locator('link[href*="arabic-fonts.css"]').count(), 0);
    }
    assert.equal(await page.locator('.hero h1 span').evaluate(node => getComputedStyle(node).fontStyle), 'normal');
    if (locale === 'ar') {
      const inconsistent = await page.evaluate(() => [...document.body.querySelectorAll('*')].filter(node => [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim())).filter(node => {
        const style = getComputedStyle(node);
        return !style.fontFamily.includes('IBM Plex Sans Arabic') || style.fontStyle !== 'normal';
      }).map(node => node.tagName + ' ' + node.className));
      assert.deepEqual(inconsistent, [], 'All Arabic-route text uses the unified upright typeface');
    }
    const photo = page.locator('.profile-photo');
    await photo.evaluate(img => img.decode());
    const box = await photo.boundingBox();
    assert.ok(box && box.width >= (width === 1440 ? 375 : 210), 'Portrait width at ' + width);
    assert.equal(await photo.evaluate(img => getComputedStyle(img).filter), 'none');
    assert.equal(await page.locator('#experience [data-role]').count(), 6);
    assert.equal(await page.locator('#certifications [data-cert]').count(), 8);
    assert.equal(await page.locator('.credential-visual').count(), 8);
    assert.equal(await navPrimary.locator('a[href="#certifications"]').count(), 1);
    assert.equal(await navPrimary.locator('a[href="#volunteering"]').count(), 1);
    assert.ok(await page.locator('.credential-original').count() >= 6);
    for (const img of await page.locator('.credential-original').all()) {
      const size = await img.evaluate(async node => { await node.decode(); return node.naturalWidth / node.naturalHeight; });
      assert.ok(size > 1.15 && size < 1.5, 'Certificate preview is cropped to the paper, not the surrounding webpage');
    }
    assert.equal(await page.locator('.credential-actions').count(), 8);
    assert.equal(await page.locator('#experience .brand-mark').count(), 6);
    assert.equal(await page.locator('#volunteering .brand-mark').count(), 4);
    for (const img of await page.locator('.brand-mark img, .credential-original').all()) {
      await img.evaluate(async node => { node.loading='eager'; await node.decode(); });
    }
    assert.equal(await page.locator('#volunteering [data-volunteer]').count(), 4);
    assert.equal(await page.locator('.credential-code').count(), 7);
    assert.equal(await page.locator('.app-shot .store-gallery img[src*="/cropped/"]').count(), 15);
    assert.equal(await page.locator('.project').count(), 18);
    assert.equal(await page.locator('.project-group').count(), 4);
    assert.deepEqual(await page.locator('[data-project-group="engineering"] .project h3').allTextContents(), [
      'E-commerce Backend Engine', 'M.O.U.N.I.R', 'RS4IT MCP Hub', 'Resume Analyst AI',
      'Arabic Quran ASR', 'AutoContent AI', 'Advanced Neural Network Framework'
    ]);
    assert.equal(await page.locator('#filter-result').getAttribute('data-count-label'), locale === 'ar' ? '{count} مشاريع مختارة' : '{count} selected projects');
    assert.equal(await page.locator('.motion-toggle').getAttribute('data-label-off'), locale === 'ar' ? 'الحركة متوقفة' : 'Motion off');
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
    assert.ok(await strip.locator('.specialty-item').evaluateAll(items => items.every(item => {
      const style = getComputedStyle(item);
      return style.position === 'absolute' && parseFloat(style.borderRadius) >= 5 && parseFloat(style.borderTopWidth) >= 1 && item.scrollWidth <= item.clientWidth + 1;
    })), 'Three distinct, rounded specialty cards');
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
    const panel = await page.locator('.profile-panel').boundingBox();
    assert.ok(bounds[0].x < panel.x && bounds[1].right > panel.x+panel.width && bounds[2].y > portrait.y+portrait.height, 'Cards protrude around the portrait as in reference');
    assert.notEqual(await page.locator('.profile-image-frame').evaluate(node => getComputedStyle(node, '::before').backgroundImage), 'none');
    assert.match(await page.locator('#filter-result').innerText(), locale === 'ar' ? /مشاريع/ : /selected projects/i);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: '/tmp/portfolio-' + locale + '-' + width + '-light.png', animations: 'disabled' });
    await page.locator('#theme-toggle').click();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('#theme-toggle').getAttribute('aria-label'), locale === 'ar' ? 'الوضع الفاتح' : 'Light mode');
    assert.ok(await theme.locator('.theme-sun').isVisible());
    assert.equal(await theme.locator('.theme-moon').isVisible(), false);
    await page.screenshot({ path: '/tmp/portfolio-' + locale + '-' + width + '-dark.png', animations: 'disabled' });
    assert.deepEqual(errors, []);
    console.log('Passed: ' + locale + ' ' + width + 'px, projects, images, links, filters, themes and motion');
    await page.close();
  }
  const bilingual = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await bilingual.goto(origin, { waitUntil: 'domcontentloaded' });
  const readProjects = () => bilingual.locator('.project').evaluateAll(cards => cards.map(card => ({
    name: card.querySelector('h3').textContent,
    tags: card.dataset.tags,
    links: [...card.querySelectorAll('a[href]')].map(link => link.href),
    images: [...card.querySelectorAll('img')].map(img => img.src),
  })));
  const englishProjects = await readProjects();
  await bilingual.locator('#theme-toggle').click();
  await bilingual.locator('.language-toggle').click();
  await bilingual.waitForURL(origin + '/ar/');
  assert.equal(await bilingual.locator('html').getAttribute('lang'), 'ar');
  assert.equal(await bilingual.locator('html').getAttribute('data-theme'), 'dark');
  assert.deepEqual(await readProjects(), englishProjects, 'Both locales share project structure, order, links and images');
  await bilingual.locator('.language-toggle').click();
  await bilingual.waitForURL(origin + '/');
  assert.equal(await bilingual.locator('html').getAttribute('lang'), 'en');
  assert.equal(await bilingual.locator('html').getAttribute('data-theme'), 'dark');
  await bilingual.close();
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
