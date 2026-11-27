# Mounir Almzayek — Engineering Portfolio

English-first, responsive personal portfolio for AI systems, mobile and backend engineering.

**Live site:** https://mounir-almzayek.github.io/

## Design and development

Warm monochrome editorial design with a technical square grid, serif headings, grayscale GitHub avatar, color project imagery, light/dark modes, responsive project cards, filters, accessible keyboard focus and reduced-motion support.

Run `python -m http.server 8000` from the repository root and open http://localhost:8000/. The static site requires no build tools.

## Projects and real previews

The site presents 13 projects. Product images link to their public product websites or official store listings. Projects without a verified public demo link to source code where available. Architecture diagrams are conceptual, not screenshots. Tebyan and Liqaa have real browser screenshots committed under `assets/previews/`; capture results are recorded in `assets/previews/report.json`.

## Original résumés

- [AI Engineer (PDF)](https://drive.google.com/file/d/1L0Kv14K_9IBZGl-WItLgBzOv5r8aYgRd/view)
- [Senior Flutter Developer (PDF)](https://drive.google.com/file/d/1CwH3t3xQCmHAD_zrIDDCa_Pfjm2AVFXm/view)
- [Full Stack Developer (PDF)](https://drive.google.com/file/d/1ouUB6ya0AmSmAkgcGvieEnZ8rs05EJ7g/view)
- [Software Engineer — Comprehensive (PDF)](https://drive.google.com/file/d/1ozoNWNlehc8GAY3pSyxdtsK2wCMXKw-Q/view)

The homepage links directly to the original Drive files for viewing and downloading, without creating replacement CVs. All four were verified to have anyone-reader access. Legacy HTML résumé pages remain for compatibility but are no longer linked from the homepage.

## Verification and deployment

GitHub Pages deploys from `main` / root. The **Capture portfolio previews and smoke test** workflow captures live previews using Playwright, verifies the layout at 1440px and 390px, checks filters, dark mode, original CV links and JavaScript errors, and commits the captured assets after successful tests. Its verification artifact contains the browser screenshots and capture report.

A GitHub Actions bot commit may not itself trigger branch-based Pages deployment; verify a subsequent Pages run after refreshing preview assets. No private project source or live application data are embedded.

A sitemap and robots.txt support search discovery.
