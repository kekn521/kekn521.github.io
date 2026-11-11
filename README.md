# Ken Lin's research atlas

Static personal research website at https://kekn521.github.io/.

## Navigation

The full-screen atlas is the homepage and directory. Its five destinations open full-page views: Projects, About, Research direction, Off duty, and Say hello. Projects opens a shared index with separate Research and Projects sections. Research contains Vis4GS, with a link to its detail page. Projects contains Waystation, The Legend of ChunYi (I2P-FinalProject), MedAgentCV, and Auto Schedule Maker. The Home link and Escape return to the overview. Browser back/forward and direct hash links work. The Directory dialog provides a keyboard-friendly alternative to spatial navigation.

Drag empty map space to pan. Plus/minus controls zoom; Reset view restores the overview. With the map focused, arrow keys pan, +/- zoom, and 0 resets. Zoom and pan are bounded. Browser pinch zoom is retained. All content remains visible as a normal document when JavaScript is disabled.

The default is the user's pastel-blue light palette. A manual dark theme persists locally. Reduced motion makes navigation transitions immediate. The terminal edition sets all text in system monospace fonts and loads nothing remotely; no remote fonts, scripts, or analytics are required. The terminal background uses animated ASCII contours with pointer and click responses. A pause control and reduced-motion preferences stop background movement; it also pauses while reading a destination, opening the directory, or hiding the tab.

The portrait, orbital maps, research diagrams, pour-over coffee, and envelope are static ASCII text in `index.html`, announced through `role="img"` labels. The ASCII Ken Lin title has an accessible heading name. The portrait is a deterministic text derivative (`assets/ken-ascii.txt`) generated from a photo Ken supplied via `scripts/photo_to_ascii.py`; only that text derivative is published and the original photo is not part of the site. The ASCII research diagrams are illustrative, and the original research figures stay accessible through links in each figure's caption. See `DESIGN.md` for the design specification.

## Files and local preview

- `index.html`: factual content and accessible route links.
- `styles.css`: atlas composition, full-page views, responsive variants, and themes.
- `app.js`: hash routing, history, focus, directory dialog, camera controls, and theme.
- `background.js`: terminal canvas animation and its motion controls.
- `background.css`: background layering and pause control.
- `scripts/photo_to_ascii.py`: regenerates the ASCII portrait text from a supplied photo; text output only.
- `assets/`: the ASCII portrait text, CV PDF and favicon, plus archived originals — the optimized research figures and Waystation screenshot linked from captions, the earlier illustrative coffee image, and fonts and licenses.
- `tests/browser.cjs`: browser checks and screenshots.

Open `index.html` directly, or run `python3 -m http.server 4173 --bind 127.0.0.1`. The website itself needs no install or build. For automated tests, run `npm install`, `npx playwright install chromium`, and `npm test`.

## Deployment and review

GitHub Pages uses GitHub Actions. The workflow runs browser checks first. Only successful runs on `main` deploy. The `design/full-screen-atlas` branch runs tests and saves screenshots without deploying. Screenshots are attached as `portfolio-browser-review` for seven days.

The deployment stages only `index.html`, `styles.css`, `app.js`, `background.js`, `background.css`, `.nojekyll`, and `assets/`. This repository hosts the root domain. The separate `kekn521` repository remains the GitHub profile repository.

## Content maintenance

Academic standing is time-sensitive. The contact email is kekn521@gmail.com, as supplied by Ken. LinkedIn is https://www.linkedin.com/in/ken521/. The CV downloads the original PDF from `assets/Kai_Yuan_Lin_Research_CV.pdf`. Replace that file when updating the CV; the Drive original retains its existing sharing settings. The paper entry identifies first authorship without inventing individual contributions. Current research interests make no claim of completed VLA findings. The displayed coffee artwork is authored ASCII, not a photograph; the earlier AI-generated coffee image is archived in `assets/` and not shown. See `assets/ASSETS.md` for asset sources, licenses, and the portrait derivation.

Public research source: https://arxiv.org/html/2606.26985v2.
