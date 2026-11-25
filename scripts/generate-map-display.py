#!/usr/bin/env python3
"""Precompute consistent display walls; source traces and areas stay untouched.

Development only: python -m pip install Shapely==2.1.2
Run from the repository: python scripts/generate-map-display.py [--check]
"""
import argparse
import hashlib
import json
from pathlib import Path
import re

from shapely.geometry import GeometryCollection, Polygon
from shapely.ops import unary_union

DATA = Path(__file__).resolve().parents[1] / "src" / "data"
SOURCES = [DATA / f"amsterdam-{part}.json" for part in ("lower", "ground", "upper")]
TARGET = DATA / "amsterdam-display.json"
WALL = 6  # Drawing-coordinate units, not screen pixels or measured wall thickness.
CLOSE = 8  # Close traced partition gaps up to 16 units before offsetting the exterior.


def polygons(geometry):
    if geometry.geom_type == "Polygon":
        return [geometry]
    return [p for g in getattr(geometry, "geoms", []) for p in polygons(g)]


def svg_polygon(path):
    """Read the absolute M/L/H/V/Q/Z commands used by these source outlines."""
    tokens = re.findall(r"[MLHVQZ]|-?(?:\d*\.)?\d+", path)
    if "".join(tokens) != re.sub(r"[\s,]", "", path):
        raise ValueError("Unsupported source path; extend the parser before regenerating")
    rings, ring, index = [], [], 0
    x = y = 0
    while index < len(tokens):
        command = tokens[index]
        index += 1
        if command == "Z":
            rings.append(Polygon(ring))
            ring = []
            continue
        size = {"M": 2, "L": 2, "H": 1, "V": 1, "Q": 4}[command]
        values = list(map(float, tokens[index:index + size]))
        index += size
        if command in ("M", "L"):
            x, y = values
        elif command == "H":
            x = values[0]
        elif command == "V":
            y = values[0]
        else:
            cx, cy, end_x, end_y = values
            for step in range(1, 25):
                t = step / 24
                ring.append(((1-t)**2*x + 2*(1-t)*t*cx + t*t*end_x,
                             (1-t)**2*y + 2*(1-t)*t*cy + t*t*end_y))
            x, y = end_x, end_y
            continue
        ring.append((x, y))
    result = GeometryCollection()
    for polygon in rings:
        result = result.symmetric_difference(polygon)
    return result


def coordinates(ring):
    return [[round(x, 2), round(y, 2)] for x, y in list(ring.coords)[:-1]]


def outline_path(geometry):
    return "".join("M" + "L".join(f"{x:g} {y:g}" for x, y in coordinates(ring)) + "Z"
                   for polygon in polygons(geometry.normalize())
                   for ring in [polygon.exterior, *polygon.interiors])


def display_geometry(level):
    source = svg_polygon(level["outline"])
    spaces = [(s, Polygon(s["points"], s.get("holes", []))) for s in level["spaces"]]
    material = [polygon for _, polygon in spaces]
    for region in level.get("context", []):
        if region.get("kind") != "roof":
            continue
        roof = (Polygon(region["points"], region.get("holes", [])) if "points" in region
                else svg_polygon(region.get("path", "")))
        # A lower roof can extend beyond this floor. Ignore clipped lines/thin
        # strips, which otherwise create spurs around the mezzanine perimeter.
        if not roof.is_valid:
            roof = roof.buffer(0)
        material.extend(p for p in polygons(roof.intersection(source))
                        if not p.buffer(-WALL).is_empty)
    footprint = unary_union(material).buffer(CLOSE, join_style="mitre")
    footprint = footprint.buffer(-CLOSE, join_style="mitre").buffer(WALL, join_style="mitre")
    # Partition gaps and shafts are internal walls, not extra exterior loops.
    # Keep explicit courtyard holes in the source building outline, if present.
    exterior = unary_union([Polygon(p.exterior) for p in polygons(footprint)])
    courtyards = [Polygon(h) for p in polygons(source) for h in p.interiors]
    if courtyards:
        exterior = exterior.difference(unary_union(courtyards))
    if not exterior.is_valid or not exterior.covers(unary_union(material)):
        raise ValueError(f"Invalid display envelope on floor {level['id']}")

    display_holes = {}
    for space, _ in spaces:
        holes, changed = [], False
        for ring in space.get("holes", []):
            hole = Polygon(ring)
            children = [p for other, p in spaces if other["id"] != space["id"] and hole.covers(p)]
            replacement = unary_union(children).buffer(WALL, join_style="mitre") if children else hole
            # Edge-adjacent shafts share a wall with the corridor. Enlarging
            # those holes could sever the corridor, so retain their source ring.
            if children and replacement.geom_type == "Polygon" and Polygon(space["points"]).contains(replacement):
                holes.append(coordinates(replacement.normalize().exterior))
                changed = True
            else:
                holes.append(ring)
        if changed:
            display_holes[space["id"]] = holes
    return {"displayOutline": outline_path(exterior), "displayHoles": display_holes}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if generated data is stale")
    args = parser.parse_args()
    source_bytes = [path.read_bytes() for path in SOURCES]
    levels = [level for content in source_bytes for level in json.loads(content)]
    output = {
        "sourceHash": hashlib.sha256(b"".join(source_bytes)).hexdigest(),
        "levels": {level["id"]: display_geometry(level) for level in levels},
    }
    text = json.dumps(output, indent=2) + "\n"
    if args.check:
        if not TARGET.exists() or TARGET.read_text() != text:
            raise SystemExit("Display geometry is stale; run python scripts/generate-map-display.py")
        print("Display geometry is current for all eight floors.")
    else:
        TARGET.write_text(text, encoding="utf-8", newline="\n")
        print(f"Updated {TARGET.name} for {len(levels)} floors.")


if __name__ == "__main__":
    main()
