import { chromium } from 'playwright';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';

const dir = 'assets/previews/websites';
const manifest = 'assets/previews/website-captures.json';
const targets = [
  { key:'zaker', url:'https://zaker.misbar.education/', expected:/zaker|ذاكر/i },
  { key:'saudi-cup', url:'https://www.jcsa.sa/en/saudi-cup/', expected:/saudi cup|كأس السعودية/i },
  { key:'bin-taleb', url:'https://bin-taleb-8jor.vercel.app/ar', expected:/bin taleb|بن طالب/i },
  { key:'swimmer', url:'https://www.swimmer.sa/en', expected:/swimmer|سويمر/i },
  { key:'swimmer-craftsman', url:'https://www.swimmer.sa/en', expected:/swimmer|سويمر/i },
];
await mkdir(dir, { recursive:true });
let previous = [];
try { previous = JSON.parse(await readFile(manifest, 'utf8')); } catch {}
const report = [];
const browser = await chromium.launch({ headless:true });
try {
  for (const item of targets) {
    const page = await browser.newPage({ viewport:{ width:1440, height:900 }, deviceScaleFactor:1, reducedMotion:'reduce' });
    const path = dir + '/' + item.key + '.jpg';
    const temporary = path + '.tmp';
    try {
      const response = await page.goto(item.url, { waitUntil:'domcontentloaded', timeout:40000 });
      if (!response?.ok()) throw Error('HTTP ' + response?.status());
      await page.waitForFunction(expected => {
        const text = (document.title + ' ' + (document.body?.innerText || '')).slice(0, 18000);
        return new RegExp(expected, 'i').test(text) &&
          !/^(access denied|just a moment|attention required|403 forbidden|502 bad gateway)/i.test(document.title) &&
          (document.body?.innerText || '').trim().length > 40;
      }, item.expected.source, { timeout:18000 });
      await page.evaluate(async () => {
        await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2200))]);
      });
      await page.waitForTimeout(1800);
      const final = new URL(page.url());
      const expectedHost = new URL(item.url).hostname.replace(/^www\./, '');
      if (final.hostname.replace(/^www\./, '') !== expectedHost) throw Error('Unexpected redirect');
      await page.screenshot({ path:temporary, type:'jpeg', quality:84, animations:'disabled', fullPage:false });
      await rename(temporary, path);
      report.push({ key:item.key, url:item.url, finalUrl:page.url(), path, status:'captured', title:await page.title() });
      console.log('Captured', item.key, path);
    } catch (error) {
      await rm(temporary, { force:true });
      const old = previous.find(entry => entry.key === item.key && entry.status === 'captured');
      report.push(old || { key:item.key, url:item.url, status:'unavailable', reason:String(error).slice(0,240) });
      console.warn('Skipped', item.key, String(error).slice(0,240));
    } finally { await page.close(); }
  }
} finally { await browser.close(); }
await writeFile(manifest, JSON.stringify(report,null,2) + '\n');
