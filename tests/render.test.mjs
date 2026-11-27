import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, renderSite, validateCatalogs } from '../scripts/lib/render.mjs';

test('renders the same shared template with explicit language, route and direction', () => {
  const templates = {
    page: '<html lang="{{@lang}}"{{@direction}}><a href="{{@otherRoute}}">{{@otherCode}}</a>{{>intro}}</html>',
    intro: '<h1>{{t.intro.heading}}</h1>',
  };
  assert.equal(renderSite(templates, {'intro.heading': 'Engineering'}, 'en'),
    '<html lang="en"><a href="/ar/">AR</a><h1>Engineering</h1></html>');
  assert.equal(renderSite(templates, {'intro.heading': 'الهندسة'}, 'ar'),
    '<html lang="ar" dir="rtl"><a href="/">EN</a><h1>الهندسة</h1></html>');
});

test('escapes translated content for HTML text and attributes', () => {
  assert.equal(escapeHtml('<a title="AI & RAG">'), '&lt;a title=&quot;AI &amp; RAG&quot;&gt;');
  assert.equal(renderSite({page: '<p>{{t.title}}</p>'}, {title: '<script>'}, 'en'), '<p>&lt;script&gt;</p>');
});

test('requires matching and nonempty catalogs', () => {
  assert.doesNotThrow(() => validateCatalogs({en: {name: 'Portfolio'}, ar: {name: 'معرض الأعمال'}}));
  assert.throws(() => validateCatalogs({en: {name: 'Portfolio'}, ar: {}}), /Translation keys/);
  assert.throws(() => validateCatalogs({en: {name: 'Portfolio'}, ar: {name: ''}}), /Invalid translation/);
});

test('fails rather than falling back silently on missing, unused or malformed messages', () => {
  assert.throws(() => renderSite({page: '{{t.title}}'}, {}, 'ar'), /Missing translation/);
  assert.throws(() => renderSite({page: 'static'}, {title: 'Unused'}, 'en'), /Unused messages/);
  assert.throws(() => renderSite({page: '{{bad token}}'}, {}, 'en'), /Unresolved template token/);
  assert.throws(() => renderSite({page: '{{@missing}}'}, {}, 'en'), /Unknown locale setting/);
});

test('rejects unknown, cyclic and unused partials', () => {
  assert.throws(() => renderSite({page: '{{>missing}}'}, {}, 'en'), /Unknown template/);
  assert.throws(() => renderSite({page: '{{>a}}', a: '{{>page}}'}, {}, 'en'), /Circular template/);
  assert.throws(() => renderSite({page: 'static', orphan: 'unused'}, {}, 'en'), /Unused templates/);
  assert.throws(() => renderSite({page: 'static'}, {}, 'fr'), /Unsupported locale/);
});

test('renders matching asset fingerprints and Arabic-only font stylesheet', () => {
  const templates = {page: '{{@fontLink}}<link href="portfolio.css?v={{@cssVersion}}"><script src="portfolio.js?v={{@jsVersion}}"></script>'};
  const versions = {css:'111111111111',js:'222222222222',fonts:'333333333333'};
  const en = renderSite(templates, {}, 'en', versions);
  const ar = renderSite(templates, {}, 'ar', versions);
  assert.match(en, /portfolio\.css\?v=111111111111/);
  assert.match(ar, /portfolio\.js\?v=222222222222/);
  assert.match(ar, /arabic-fonts\.css\?v=333333333333/);
  assert.doesNotMatch(en, /arabic-fonts/);
});
