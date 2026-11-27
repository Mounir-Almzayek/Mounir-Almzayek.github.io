# Mounir Almzayek — Engineering Portfolio

**English (default):** https://mounir-almzayek.github.io/  
**Arabic:** https://mounir-almzayek.github.io/ar/

A static, responsive engineering portfolio with 18 projects across four collections, professional experience, skills and four original résumés.

## Architecture

The English homepage and Arabic route are **generated outputs**, not independently maintained pages. Both are rendered at build time from the same HTML templates and separate locale catalogs.

```text
src/templates/
  page.html           Shared document layout and SEO
  header.html         Navigation and language controls
  intro.html          Hero, portrait and specialties
  work.html           Project collection layout and ordering
  products.html       Selected products
  apps.html           Published mobile applications
  professional.html   Professional and field systems
  engineering.html    AI and engineering lab
  about.html          Experience, approach and toolkit
  resumes.html        Original résumé links
  contact.html        Contact and footer
i18n/
  en.json             English content
  ar.json             Arabic content
scripts/
  build.mjs           Build/check both pages
  lib/render.mjs      Locale config, safe rendering, validation
assets/
  css/                Shared design and Arabic web fonts
  js/portfolio.js     Shared, language-neutral interactions
  profile/            Original portrait
  previews/           Authentic project previews and provenance
  social/             Open Graph preview
tests/
  render.test.mjs     Template/translation unit tests
  portfolio.mjs       Browser regression tests
index.html            Generated English homepage
ar/index.html         Generated Arabic homepage
```

Both routes share identical project structure, links, ordering, styles and behavior. Arabic applies RTL and IBM Plex Sans Arabic; technical terms and product names remain shared where appropriate. English remains the default. Locale-specific UI labels, including theme, motion and project counters, are rendered into data attributes instead of duplicated in browser JavaScript.

## Editing and local development

- Edit the relevant template in `src/templates/` to change layout, project order, links or assets.
- Edit the same stable message key in `i18n/en.json` and `i18n/ar.json` to change localized copy. Common repeated labels live under `common.*`; project-specific copy under `projects.*`.
- Run the build, then commit the source files and both generated HTML pages together. Do not edit generated HTML manually.

```sh
node scripts/build.mjs
node scripts/build.mjs --check
node --test tests/render.test.mjs
python -m http.server 8000
```

Open http://localhost:8000/ or http://localhost:8000/ar/. No frontend framework, bundler or production Node server is needed.

For browser checks, run `npm install --no-save --package-lock=false playwright@1.56.1`, `npx playwright install chromium`, start the HTTP server on port 8765, then run `node tests/portfolio.mjs`.

## Deployment and maintenance

GitHub Pages serves the committed static output from `main`. The CI workflow checks locale-key parity, missing/unused messages, HTML escaping, template cycles, and exact synchronization of both generated pages before running browser regression tests. The check mode never rewrites files.

Browser tests cover both languages at four viewport sizes, project order and links, local assets, original CVs, filters, navigation, theme persistence, motion and social preview dimensions.

Run **Generate portfolio social preview** manually on main after a meaningful homepage redesign. It captures the actual homepage without modifying translation source files. Historical preview assets and legacy `cv/` URLs are retained for existing external links; the homepage uses the original Drive PDFs.

## Original résumés

- [AI Engineer (PDF)](https://drive.google.com/file/d/1L0Kv14K_9IBZGl-WItLgBzOv5r8aYgRd/view)
- [Senior Flutter Developer (PDF)](https://drive.google.com/file/d/1CwH3t3xQCmHAD_zrIDDCa_Pfjm2AVFXm/view)
- [Full Stack Developer (PDF)](https://drive.google.com/file/d/1ouUB6ya0AmSmAkgcGvieEnZ8rs05EJ7g/view)
- [Software Engineer — Comprehensive (PDF)](https://drive.google.com/file/d/1ozoNWNlehc8GAY3pSyxdtsK2wCMXKw-Q/view)

Original previews and historical capture reports are retained so previously shared image URLs remain available. Removed portfolio cards do not imply deletion of the associated repositories.
