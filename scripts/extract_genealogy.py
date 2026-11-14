#!/usr/bin/env python3
"""Extract a complete descendant family from a Vis4GS genealogy event log.

Usage:
    python3 scripts/extract_genealogy.py SOURCE OUTPUT --root 3125

Reads SOURCE (genealogy JSON with an `event_log`), selects the family rooted
at --root (the root plus all of its complete descendants via parentIds,
including pruned ones), and writes a compact JSON excerpt to OUTPUT.

Validation: rejects a missing root, cycles, non create/clone ops inside the
family, and any family node whose parentIds are not all inside the family.
Nodes are sorted by id for deterministic output.
"""

import argparse
import json
from collections import deque


def fail(msg):
    raise SystemExit(f"extract_genealogy: {msg}")


def load_events(source_path):
    with open(source_path) as f:
        data = json.load(f)
    if "event_log" not in data or not isinstance(data["event_log"], list):
        fail("source JSON has no 'event_log' list")
    events = {}       # id -> {birth, op, parentIds} for non-prune events
    pruned_at = {}    # id -> iteration of first prune event
    for ev in data["event_log"]:
        op = ev.get("op")
        ev_id = ev.get("id")
        if ev_id is None or op is None:
            fail(f"malformed event: {ev!r}")
        if op == "prune":
            pruned_at.setdefault(ev_id, ev.get("iteration"))
            continue
        if ev_id in events:
            fail(f"duplicate event id {ev_id}")
        parents = ev.get("parentIds")
        if not isinstance(parents, list):
            fail(f"event {ev_id} has no parentIds list")
        events[ev_id] = {
            "birth": ev.get("iteration"),
            "op": op,
            "parentIds": list(parents),
        }
    return data, events, pruned_at


def select_family(events, root_id):
    if root_id not in events:
        fail(f"root id {root_id} not found in event log")

    if events[root_id]["op"] != "create" or events[root_id]["parentIds"]:
        fail("root must be an initial Gaussian with no parents")

    # Index all birth events, including splits. Reject any selected split
    # below rather than silently omitting descendants.
    children = {}
    for ev_id, ev in events.items():
        for p in ev["parentIds"]:
            children.setdefault(p, []).append(ev_id)

    # BFS from root: the complete descendant closure, pruned nodes included.
    family = {root_id}
    queue = deque([root_id])
    while queue:
        cur = queue.popleft()
        for child in sorted(children.get(cur, ())):
            if child not in family:
                family.add(child)
                queue.append(child)

    # Every family node's parentIds must lie inside the family, and every
    # family node other than the root must be a clone.
    for ev_id in family:
        ev = events[ev_id]
        if ev_id != root_id:
            if ev["op"] != "clone":
                fail(
                    f"family node {ev_id} has op {ev['op']!r}, "
                    "expected create/clone"
                )
        missing = [p for p in ev["parentIds"] if p not in family]
        if missing:
            fail(f"node {ev_id} has parents outside the family: {missing}")

    # Cycle check: following single parent pointers upward must reach the root.
    for ev_id in family:
        if ev_id == root_id:
            continue
        seen = set()
        cur = ev_id
        while cur != root_id:
            if cur in seen:
                fail(f"cycle detected reaching root {root_id}")
            seen.add(cur)
            parents = events[cur]["parentIds"]
            if len(parents) != 1:
                fail(f"cycle detected reaching root {root_id}")
            cur = parents[0]

    return family


def main():
    ap = argparse.ArgumentParser(
        description="Extract a descendant family from a genealogy event log."
    )
    ap.add_argument("source")
    ap.add_argument("output")
    ap.add_argument("--root", type=int, required=True)
    args = ap.parse_args()

    data, events, pruned_at = load_events(args.source)
    family = select_family(events, args.root)

    nodes = []
    for ev_id in sorted(family):
        ev = events[ev_id]
        if ev["op"] not in ("create", "clone"):
            fail(f"root/family node {ev_id} has op {ev['op']!r}")
        nodes.append({
            "id": ev_id,
            "birth": ev["birth"],
            "operation": ev["op"],
            "parentIds": ev["parentIds"],
            "prunedAt": pruned_at.get(ev_id),
        })

    result = {
        "scene": "Bonsai",
        "snapshotIteration": data["iteration"],
        "rootId": args.root,
        "nodes": nodes,
    }
    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)
        f.write("\n")
    print(f"wrote {args.output}: {len(nodes)} nodes under root {args.root}")


if __name__ == "__main__":
    main()
