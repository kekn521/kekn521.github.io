# News branch and movable atlas nodes

The user requests News as an opening-map branch and draggable nodes with physics. Keep the original blue atlas, artwork, routes, terminal background, and generated news feed. Promote the existing generated latest-news anchor into the sixth destination, with a connector and the latest headline.

Use a small scene-coordinate spring simulation: original CSS positions are rest anchors, pointer dragging pins a node, release adds bounded momentum, damping settles motion, rectangle collisions separate nodes and the central identity, and scene bounds contain travel. Connectors redraw while moving. A full rigid-body library would add unnecessary weight; unconstrained floating nodes would make destinations difficult to find. The orchestrator chooses spring anchoring and a fixed central name.

Click/tap/Enter opens pages; a movement threshold distinguishes drag from click. Mouse and touch use pointer events; Alt+arrow keys moves a focused node. Reset restores nodes and camera. Reduced motion allows direct placement without inertial animation. Stop simulation when the map is hidden, the tab is hidden, or Directory opens. No persistent storage or dependencies.
