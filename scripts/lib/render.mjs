const LOCALES = Object.freeze({
  en: {
    lang: 'en', direction: '', route: '/',
    otherRoute: '/ar/', otherLang: 'ar', otherCode: 'AR',
    assetPrefix: '', fontLink: '', technicalAttrs: '',
  },
  ar: {
    lang: 'ar', direction: ' dir="rtl"', route: '/ar/',
    otherRoute: '/', otherLang: 'en', otherCode: 'EN',
    assetPrefix: '/',
    fontLink: '<link rel="stylesheet" href="/assets/css/arabic-fonts.css">\n',
    technicalAttrs: ' class="technical-list" dir="ltr"',
  },
});

export const routes = Object.freeze({ en: 'index.html', ar: 'ar/index.html' });

export function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function validateCatalogs(catalogs) {
  const keys = Object.keys(catalogs.en).sort();
  for (const locale of Object.keys(routes)) {
    const messages = catalogs[locale];
    if (!messages || JSON.stringify(Object.keys(messages).sort()) !== JSON.stringify(keys)) {
      throw new Error('Translation keys do not match for ' + locale);
    }
    for (const [key, value] of Object.entries(messages)) {
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error('Invalid translation (' + locale + '): ' + key);
      }
    }
  }
}

export function renderSite(templates, messages, locale) {
  if (!Object.hasOwn(LOCALES, locale)) throw new Error('Unsupported locale: ' + locale);
  const config = LOCALES[locale];
  const usedMessages = new Set();
  const usedTemplates = new Set();

  function expand(name, stack = []) {
    if (stack.includes(name)) throw new Error('Circular template include: ' + [...stack, name].join(' -> '));
    if (!Object.hasOwn(templates, name)) throw new Error('Unknown template: ' + name);
    usedTemplates.add(name);

    return templates[name].replace(/\{\{(>|@|t\.)([a-zA-Z0-9_.-]+)\}\}/g, (_, type, key) => {
      if (type === '>') return expand(key, [...stack, name]);
      if (type === '@') {
        if (!Object.hasOwn(config, key)) throw new Error('Unknown locale setting: ' + key);
        return config[key]; // Only trusted structural constants from LOCALES.
      }
      if (!Object.hasOwn(messages, key) || typeof messages[key] !== 'string' || !messages[key].trim()) {
        throw new Error('Missing translation (' + locale + '): ' + key);
      }
      usedMessages.add(key);
      return escapeHtml(messages[key]);
    });
  }

  const html = expand('page');
  if (/\{\{|\}\}/.test(html)) throw new Error('Unresolved template token');
  const unused = Object.keys(messages).filter(key => !usedMessages.has(key));
  if (unused.length) throw new Error('Unused messages (' + locale + '): ' + unused.join(', '));
  const orphaned = Object.keys(templates).filter(name => !usedTemplates.has(name));
  if (orphaned.length) throw new Error('Unused templates: ' + orphaned.join(', '));
  return html;
}
