# Design — terminal research atlas

The homepage is a navigable terminal drawing: every visible illustration is real character data in `index.html`, not a bitmap styled as text. `docs/design.md` keeps the pre-terminal history; this file specifies the current edition.

## Palette

The system is a pale-blue atlas with a manual dark theme. Color tokens live in `styles.css` (`--bg`, `--surface`, `--ink`, `--muted`, `--accent`, `--line`, `--shadow` on `:root` and `:root[data-theme=dark]`), and `color-scheme` follows the theme. Light is the default; the choice persists in `localStorage` when available. `background.js` reads the same two-theme palette for its canvas.

## Type

One monospace stack, `--mono` in `styles.css` (`ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace`), drives body text, headings, controls, and artwork. No font files or remote scripts or stylesheets are loaded. ASCII art sizes itself in container units (`--columns` per frame) so each drawing scales to its space at one character grid.

## Line and controls

Borders are thin (1px) and square — `border-radius:0` on framed figures, zoom tools, dialogs, and the pause control. Native buttons carry the terminal marks: theme and directory buttons gain literal `[ … ]` brackets in CSS, the pause button's own label is `[ || ]`/`[ > ]`, and links end in `->`. Focus is a visible 2px outline with a wide offset.

## Artwork

The Ken Lin title is an `aria-hidden` wordmark under an accessible `h1`. The illustrations are static `pre` blocks with `role="img"` and a descriptive `aria-label`: the portrait, the orbital maps, the Vis4GS workflow and genealogy graphs plus the AI/WHY question diagram, the pour-over coffee set, and the envelope. These are diagrams and drawings, not screenshots or measurements; originals stay one click away through `[ original … ]` links in figure captions. The portrait's text derivative comes from `scripts/photo_to_ascii.py`; only the text is published.

## Ambient field

`background.js` paints an ASCII contour canvas fixed behind the map (`#ambient-canvas`, `aria-hidden`, `pointer-events:none`). Pointer movement disturbs the contours; pointer clicks inject vortices that age out over a few seconds. Texture thins around reading zones. Motion stops on the `[ || ]` pause control, on `prefers-reduced-motion: reduce` (the control reports and disables itself), when a tab is hidden, when the directory dialog is open, and off the home route. Reduced motion also removes CSS transitions site-wide.

## Layout and navigation

The home route is a spatial map: positioned destinations around a central identity, drag-to-pan, bounded zoom and pan, with pointer, keyboard, and button paths to the same view. Each destination is a real hash route rendered as a full-page view; browser history, direct links, Escape-to-home, and a modal native `<dialog>` directory all reach the same six views. The artwork reads as a single described image; the facts live in headings, notes, and caption prose so nothing depends on the drawing. Without JavaScript the atlas is a plain document with a visible directory, all views in reading order, and no hidden content. Responsive rules reflow the map and stack the page layouts at narrow widths and short viewports.

## Not in scope

No analytics, no backend, no autoplay of media, no content gated behind interaction; the original portrait photo is not published.
