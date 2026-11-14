# Ken Lin's research atlas

Static personal research website at https://kekn521.github.io/.

## Navigation

The full-screen atlas is the homepage and directory. Its six destinations open full-page views: News, Projects, About, Research direction, Off duty, and Say hello. Projects opens a shared index with separate Research and Projects sections. Research contains Vis4GS, with a link to its detail page. Projects contains Waystation, The Legend of ChunYi (I2P-FinalProject), MedAgentCV, and Auto Schedule Maker. The News node also shows the latest entry title, and News is reachable through the News entry in both the Directory dialog and the no-JavaScript directory. The Home link and Escape return to the overview; Returning from News restores focus to the News node when that node opened the page. Browser back/forward and direct hash links work. The Directory dialog provides a keyboard-friendly alternative to spatial navigation.

Drag a destination node with mouse or touch to move it; nodes stay where you drop them in empty space. Other nodes ease toward clear nearby positions on contact. Dropping onto another node’s original spot exchanges positions when they fit; tight spaces keep the last clear arrangement instead of trapping overlapping objects. There is no pull toward the starting layout or free-flight momentum after release. Click or press Enter to open a destination. Drag empty map space to pan. Plus/minus controls zoom; Reset view restores the initial node layout and the overview camera. With the map focused, arrow keys pan, +/- zoom, and 0 resets; with a node focused, Alt + arrow keys move that node. Zoom and pan are bounded. Browser pinch zoom is retained. Reduced motion resolves collisions directly without animation. All content remains visible as a normal document when JavaScript is disabled.

The default is the user's pastel-blue light palette. A manual dark theme persists locally. Reduced motion makes navigation transitions immediate. Typography is self-hosted; no remote fonts or analytics are required. The terminal background uses animated ASCII contours with pointer and click responses, and runs in all sections, subtly behind reading text where masked quiet areas keep prose legible. The atlas and page pause controls share one paused state; reduced-motion preferences stop background movement, and it also pauses while the directory dialog is open or the tab is hidden. The six opening-map destinations each carry a custom inline SVG line-art symbol: a code window, a profile, a visual analytics diagram, a pour-over coffee, an envelope, and a newspaper.

## Files and local preview

- `index.html`: factual content and accessible route links, including the generated News blocks between `NEWS_ENTRIES`/`LATEST_NEWS` markers.
- `news.json`: the single source list for News entries.
- `scripts/build_news.py`: validates `news.json` and renders it into the marked regions of `index.html` (standard library only).
- `styles.css`: atlas composition, full-page views, responsive variants, and themes.
- `app.js`: hash routing, history, focus, directory dialog, camera controls, and theme.
- `background.js`: terminal canvas animation and its motion controls.
- `explore.js`: timeline filters and the real reconstruction comparison.
- `background.css`: background layering and pause control.
- `assets/`: optimized research figures, illustrative coffee still life, fonts and licenses.
- `tests/browser.cjs`: browser checks and screenshots.

Open `index.html` directly, or run `python3 -m http.server 4173 --bind 127.0.0.1`. The website itself needs no install or build; after editing `news.json`, run `python3 scripts/build_news.py` before local preview so the HTML matches (pass `--check` to detect stale HTML without writing). For automated tests, run `npm install`, `npx playwright install chromium`, and `npm test`. The News generator has its own standard-library unit tests: `python3 -m unittest discover -s tests -p 'test_news.py'`.

## Deployment and review

GitHub Pages uses GitHub Actions. The workflow regenerates the News HTML before both verification and deployment, so `news.json`, the scripts, and the test suite stay repository-only while the generated `index.html` is what gets deployed. The workflow runs browser checks first. Only successful runs on `main` deploy. The `design/full-screen-atlas` branch runs tests and saves screenshots without deploying. Screenshots are attached as `portfolio-browser-review` for seven days.

The deployment stages only `index.html`, `styles.css`, `app.js`, `background.js`, `background.css`, `explore.js`, `robots.txt`, `sitemap.xml`, `.nojekyll`, and `assets/`. This repository hosts the root domain. The separate `kekn521` repository remains the GitHub profile repository.

## Search discovery

The homepage title and Open Graph tags lead with the full name "Kai-Yuan Lin (Ken Lin)", and the full name is also shown next to "Ken Lin" in the on-page intro, so search results can match either name. A Person JSON-LD block repeats only factual metadata already on the page (name, alternate names, affiliation, GitHub and LinkedIn links). The canonical URL points at the site root, `robots.txt` allows all crawlers and references `sitemap.xml`, and the sitemap lists only the root URL because every section is reached through hash navigation on the single page. Search Console verification and any indexing request are separate account-side steps and have not been done; none of these changes make ranking promises.

## Content maintenance

Academic standing is time-sensitive. The contact email is kekn521@gmail.com, as supplied by Ken. LinkedIn is https://www.linkedin.com/in/ken521/. The CV downloads the original PDF from `assets/Kai_Yuan_Lin_Research_CV.pdf`. Replace that file when updating the CV; the Drive original retains its existing sharing settings. The paper entry identifies first authorship without inventing individual contributions. Current research interests make no claim of completed VLA findings. Coffee imagery is illustrative, not a personal photograph. See `assets/ASSETS.md` for the generation prompt, asset sources, and licenses.

Public research source: https://arxiv.org/html/2606.26985v2.

### News maintenance

News is an explorable personal timeline at `#news`: entries render into per-year groups (newest year first) with All/Research/Life filters, all driven by `news.json`. New dated items automatically join the correct year group on the next regeneration — no page edits needed. With JavaScript disabled all entries remain visible, and partial dates stay partial: a year-only or year-month entry is shown as such rather than stretched to a fake exact date.

Edit `news.json` only; never hand-edit the generated blocks in `index.html`. Each entry uses: `date` (`YYYY`, `YYYY-MM`, or `YYYY-MM-DD`), `category` (`Research` or `Life`), optional `kind`, `title`, `summary`, and optional `url`/`linkLabel`. Text is plain text (HTML is escaped) and `url` must be an absolute HTTP(S) link. Entries are sorted newest-first; entries with equal dates keep their input order. Regenerate with `python3 scripts/build_news.py` before local preview; `--check` fails if the committed HTML is stale. CI regenerates the HTML during verification and deployment, so a push of `news.json` is enough. The 2026-06-25 preprint entry's date is verified against the primary arXiv submission history for https://arxiv.org/abs/2606.26985v1. The acceptance entry carries the year-only date 2026 because the known conference year is 2026 and an exact acceptance date was not supplied. The 2022 IPTH enrollment, 2023 transfer to Computer Science and 2026 ISA master’s enrollment were supplied directly by the author, with year precision. Future entries and date refinements can be supplied to the assistant or edited directly in this file; no news items are invented.

## Research playground

The Vis4GS detail page compares real reconstruction outputs at iterations 500 and 30,000, sourced from the author's `presentation_assets/evo2_clean.png`. The browser shows two corresponding crops from that unmodified source image. A draggable divider and native keyboard-accessible range reveal one output over the other; Early, Compare and Late presets choose 0%, 50% and 100%. Look closer magnifies the lower center by 2×. The reveal is a comparison of two saved outputs, not an interpolation of training states. No synthetic scene, simulated Gaussian properties, or causal lineage claims are presented. Without JavaScript the original side-by-side comparison remains visible. Research direction links directly to this section.
