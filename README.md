# Nur Ifran Arpon

The personal website of Nur Ifran Arpon: https://nur-arpon.github.io/

Plain HTML, CSS and JavaScript on GitHub Pages, no build step to view it.

- `tools/pages/*.html` hold each page's content; `python tools/build.py` wraps them in the shared frame (header, Space ring menu, loader, footer) and writes the pages at the root.
- `assets/js/app.js`: the light field (raw WebGL), hold-Space ring navigation, page-to-page transitions, and the scroll scenes. GSAP, ScrollTrigger and Lenis are in `assets/js/vendor`.
- Product pages carry their own colours in the `palette` line of their page file.
- `work.html` and `hire.html` are redirects kept so old links still work.

Fonts: Inter, JetBrains Mono, Outfit and Fraunces, under the SIL Open Font License (`assets/fonts`).

© 2026 Nur Ifran Arpon. Apps published as SpaceZ.
