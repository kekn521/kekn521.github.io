# Map Physics Implementation Plan

**Goal:** Give News a visible branch and make all six destinations draggable with settling physics.
**Architecture:** Generated News anchor remains the single preview source. app.js owns an internal scene-coordinate simulation; CSS retains responsive rest positions and rotations.
**Tech Stack:** Vanilla JavaScript, Pointer Events, requestAnimationFrame, CSS translate, Python news generator, Playwright.
**Spec:** docs/superpowers/specs/2026-11-14-map-physics-design.md

- [x] Promote News anchor and add connector, accessible help, cache versions; delegate mechanical edits and README to Qwen.
- [x] Implement spring, damping, bounded momentum, collisions, click suppression, reset and lifecycle handling in app.js; style six rest positions.
- [x] Add interaction verification: drag every node, path follows, no unintended route/pan, inertia settles, zoom coordinates, reset, keyboard, touch, cancellation and reduced motion.
- [x] Review Qwen edits; run generator checks, browser regression suite, and visual review at desktop/mobile/landscape.
- [ ] Publish through existing repository workflow and verify live assets and interaction.

Review focus: click after drag, high-speed flick bounds, touch cancellation, hidden-tab/Directory suspension, and narrow layouts. Preserve keyboard/native link navigation and no-JS content.
