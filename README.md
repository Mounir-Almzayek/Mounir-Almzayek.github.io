# Mounir Almzayek — Engineering Portfolio

**English (default):** https://mounir-almzayek.github.io/  
**Arabic:** https://mounir-almzayek.github.io/ar/

A static, responsive engineering portfolio with 18 projects across four collections, professional experience, skills and four original résumés.

## Structure

- `index.html` — canonical English source, semantic content and SEO metadata.
- `ar/index.html` — generated Arabic RTL version.
- `i18n/ar.json` and `scripts/generate-ar.mjs` — translation dictionary and static generator. Run `node scripts/generate-ar.mjs` after editing English content or translations. Technical names and terms remain in English.
- `assets/css/portfolio.css` — editorial design, responsive layout, dark mode and portrait animation.
- `assets/js/portfolio.js` — project filters, theme, image fallbacks and motion controls.
- `assets/profile/` — original locally cached portrait and source metadata.
- `assets/previews/` — original store screenshots, website captures and labeled repository previews; capture reports preserve provenance.
- `assets/social/portfolio-preview.jpg` — 1200 × 630 homepage preview for sharing.
- `tests/portfolio.mjs` — browser regression checks.
- `cv/` — legacy résumé pages retained for existing external links; the homepage uses the original Drive PDFs.

No frontend build or framework is required.

## Local development

Run `python -m http.server 8000` at the repository root and open http://localhost:8000/.

For automated checks, run `npm install --no-save --package-lock=false playwright@1.56.1`, `npx playwright install chromium`, start the HTTP server on port 8765, then run `node tests/portfolio.mjs`.

## Deployment and maintenance

GitHub Pages serves the root of `main`. Portfolio quality checks run on pull requests and relevant changes to main. Tests verify both languages at four viewport sizes, all 18 projects, local assets, internal links, original CV links, filters, theme, motion and social preview dimensions. They do not modify repository files.

Run **Generate portfolio social preview** manually on main after a meaningful homepage redesign. It captures the actual homepage and updates the Open Graph image. Old one-off capture workflows have been retired; Git history retains their implementation.

## Original résumés

- [AI Engineer (PDF)](https://drive.google.com/file/d/1L0Kv14K_9IBZGl-WItLgBzOv5r8aYgRd/view)
- [Senior Flutter Developer (PDF)](https://drive.google.com/file/d/1CwH3t3xQCmHAD_zrIDDCa_Pfjm2AVFXm/view)
- [Full Stack Developer (PDF)](https://drive.google.com/file/d/1ouUB6ya0AmSmAkgcGvieEnZ8rs05EJ7g/view)
- [Software Engineer — Comprehensive (PDF)](https://drive.google.com/file/d/1ozoNWNlehc8GAY3pSyxdtsK2wCMXKw-Q/view)

Original previews and historical capture reports are retained so previously shared image URLs remain available. Removed portfolio cards do not imply deletion of the associated repositories.
