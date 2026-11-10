# Full-screen atlas redesign

## Audit
The original was a conventional split hero and long scrolling page. Atlas controls only changed a small text panel. Rounded cards, handwritten asides, decorative dots, generic slogans and repeated eyebrows overwhelmed the user's actual research. Google Fonts introduced a network dependency. Hash links and factual publication content are worth preserving.

Existing dials approximately 5 / 2 / 4. New dials: DESIGN_VARIANCE 9, MOTION_INTENSITY 7, VISUAL_DENSITY 4. User explicitly requested the atlas to become the whole site's navigation, so replacing the homepage information architecture is authorized.

## Design
One full-viewport pale-blue spatial directory. Ken's name anchors five destinations: Research, About, research questions, Off duty, and Say hello. Real research imagery and an illustrative coffee photograph give objects visual weight. Lines express connections between destinations, not a decorative grid. No slogan hero, small cards, handwritten captions, mock dashboards, or scroll-section stack.

Native CSS and JavaScript retain the buildless static deployment; no framework migration is necessary for this interaction. Fonts are self-hosted. UI uses text controls rather than icon families. Radius system: 3px for controls and research figures; the coffee node's ellipse is an intentional photographic crop, not a container style. Z-index: map 0, views 1, header 2, directory dialog 3/top layer.

## Navigation
The map supports bounded drag and button/keyboard zoom. Selecting a node moves the map away and brings in a full-page destination. Atlas restores the overview and focus. Escape returns to the map or dismisses the directory. Browser history, direct links, keyboard focus and reduced motion are supported. Keep #home, #research, #about, #off-duty, #contact and #questions. A directory dialog offers direct navigation without manipulating the map. Small screens use a deliberately rearranged map with all destinations reachable.

## Content
Keep verified academic facts, Vis4GS paper links, author order and public academic email. State hobbies plainly. VLA work remains a research interest, with no unpublished results claimed. Coffee image is an illustrative generated still life, not a claimed photo of Ken's own setup. Asset prompt and source are in assets/ASSETS.md.

## Theme
Pastel-blue light mode is the initial branded appearance, with a consistent dark-blue alternative and a manual control. Ink #16354b, pale blue #d7e7f0, surface #eaf2f6, blue accent #315b80. Keep one accent family and contrast throughout both modes.

## Validation
Check routes, browser back/forward, unknown hash fallback, directory focus trap, Escape, map reset and bounded zoom/pan, reduced motion, mobile layout, link/asset validity and no-JS reading. Browser tooling currently fails before navigation with a timeoutMs adapter error; attempt reconnection, then report visual QA limitation if it persists. Run DOM behavior tests and static preflight. Publish through the existing GitHub Pages workflow while retaining profile README.
