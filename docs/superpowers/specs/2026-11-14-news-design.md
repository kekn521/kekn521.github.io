# News section

User intent: add research milestones (publication, acceptance) and life updates to the existing portfolio. Keep the approved atlas, Me label, terminal animation, and full-name SEO.

Approaches: inline homepage feed crowds the spatial map; a CMS adds account/backend work beyond this request. Chosen implementation judgment: a dedicated #news page reached through the Directory, no-JS directory, and a compact Latest update link below the homepage introduction. This extends the site's existing route model.

News uses chronological rows, newest first: an honest date, Research or Life category, optional kind, title, summary, optional external link. Pale blue/dark palettes, existing display/body fonts, thin separators; no new card grid. The initial entry repeats the existing Vis4GS acceptance, using only the known conference year 2026. No exact acceptance date or life event is invented; the user confirmed starting with IEEE VIS 2026.

Authoring: one news.json list. A Python standard-library generator validates dates and links, escapes text, and renders static HTML between dedicated markers in index.html. This keeps content visible without JavaScript. CI regenerates before browser tests and deployment; README explains local regeneration and future edits.

The generator supports YYYY, YYYY-MM, YYYY-MM-DD, consistent newest-first ordering, Research/Life categories, optional kind/url/linkLabel. Empty lists have a calm empty state. Invalid content fails before writing any HTML. No CMS, login, scheduling, or filters are needed for this small feed.
