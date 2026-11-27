import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { routes, renderSite, validateCatalogs } from './lib/render.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(resolve(root, path), 'utf8');
const templates = Object.fromEntries(await Promise.all(
  (await readdir(resolve(root, 'src/templates'))).filter(name => name.endsWith('.html'))
    .map(async name => [name.slice(0, -5), await read('src/templates/' + name)])
));
const catalogs = Object.fromEntries(await Promise.all(
  Object.keys(routes).map(async locale => [locale, JSON.parse(await read('i18n/' + locale + '.json'))])
));
validateCatalogs(catalogs);

const check = process.argv.includes('--check');
// Render both before writing either, so a missing translation cannot create a partial build.
const pages = Object.entries(routes).map(([locale, path]) => [path, renderSite(templates, catalogs[locale], locale)]);
for (const [path, html] of pages) {
  if (check) {
    if (await read(path) !== html) throw new Error(path + ' is outdated. Run node scripts/build.mjs');
  } else {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), html);
  }
  console.log((check ? 'Verified ' : 'Generated ') + path);
}
