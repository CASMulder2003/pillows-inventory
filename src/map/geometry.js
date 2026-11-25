import { buildAmsterdamPlan } from "../data/amsterdam.js";

// Demonstration geometry only: these are test fixtures, not surveyed Pillows plans.
// Pass the spaces for one building/level. Every input space receives one shape.
const boxPath = (x, y, w, h, corner = "") => {
  const r = x + w,
    b = y + h,
    c = Math.min(28, w / 5, h / 4);
  if (corner === "ends")
    return `M${x + c} ${y}H${r - c}Q${r} ${y} ${r} ${y + c}V${b}H${x}V${y + c}Z`;
  if (corner === "cut-nw") return `M${x + c} ${y}H${r}V${b}H${x}V${y + c}Z`;
  if (corner === "cut-sw")
    return `M${x} ${y}H${r}V${b}H${x + c}L${x} ${b - c}Z`;
  if (corner === "round-nw")
    return `M${x + c} ${y}H${r}V${b}H${x}V${y + c}Q${x} ${y} ${x + c} ${y}Z`;
  if (corner === "round-ne")
    return `M${x} ${y}H${r - c}Q${r} ${y} ${r} ${y + c}V${b}H${x}Z`;
  if (corner === "round-se")
    return `M${x} ${y}H${r}V${b - c}Q${r} ${b} ${r - c} ${b}H${x}Z`;
  return `M${x} ${y}H${r}V${b}H${x}Z`;
};

export function buildFloorPlan(spaces, level, hotelId) {
  if (hotelId === "ams") return buildAmsterdamPlan(spaces, typeof level === "object" ? level.id : String(level));
  const shapes = [],
    labels = [];
  const guests = spaces.filter((s) => s.type === "Guest room");
  const corridor = spaces.find((s) => s.type === "Corridor");
  const store = spaces.find((s) => s.type === "Service");
  const areas = spaces.filter(
    (s) => s.type !== "Corridor" && s.type !== "Service",
  );
  const id = String(typeof level === "object" ? level.id : level);
  const family =
    typeof level === "object" ? level.planFamily || level.kind : null;
  let width, height, outline;
  const add = (space, x, y, w, h, corner = "", path = null, anchor = null) => {
    if (!space) return;
    shapes.push({
      spaceId: space.id,
      path: path || boxPath(x, y, w, h, corner),
      x: anchor?.x ?? x + w / 2,
      y: anchor?.y ?? y + h / 2,
      bounds: { x, y, width: w, height: h },
      shortLabel:
        space.type === "Guest room"
          ? space.name.replace(/^Room\s+/i, "")
          : space.type === "Corridor"
            ? "Corridor"
            : space.type === "Service"
              ? "Store"
              : space.name,
    });
  };
  const strip = (rows, x, y, w, h, vertical = false, first = "", last = "") => {
    const gap = 6,
      size =
        ((vertical ? h : w) - gap * (rows.length - 1)) /
        Math.max(1, rows.length);
    rows.forEach((s, i) =>
      add(
        s,
        x + (vertical ? 0 : i * (size + gap)),
        y + (vertical ? i * (size + gap) : 0),
        vertical ? w : size,
        vertical ? size : h,
        rows.length === 1 && first && last
          ? "ends"
          : i === 0
            ? first
            : i === rows.length - 1
              ? last
              : "",
      ),
    );
  };

  if (hotelId === "deventer") {
    // A deliberately long building exercises fit, zoom, pan and the minimap.
    width = 1500;
    height = 400;
    outline = "M40 50H1432Q1460 50 1460 78V360H1210V306H40Z";
    strip(areas, 40, 50, 1420, 190, false, "cut-nw", "round-ne");
    add(corridor, 40, 246, 1420, 60);
    add(store, 1210, 312, 250, 48);
  } else if (family === "ground" || id === "G") {
    width = 1000;
    height = 600;
    outline = "M68 40H932Q960 40 960 68V320H700V560H40V68Q40 40 68 40Z";
    add(areas[0], 40, 40, 300, 220, "round-nw");
    add(areas[1], 346, 40, 614, 220, "round-ne");
    add(areas[2], 40, 326, 490, 234, "cut-sw");
    add(corridor, 40, 266, 920, 54);
    add(store, 536, 326, 164, 234);
  } else if (family === "mezzanine" || /M$/i.test(id)) {
    width = 800;
    height = 600;
    outline = "M68 40H732Q760 40 760 68V275H480V430H310V560H40V68Z";
    const split = Math.ceil(areas.length / 2);
    strip(areas.slice(0, split), 40, 40, 720, 179, false, "cut-nw", "round-ne");
    strip(areas.slice(split), 40, 281, 214, 279, true, "", "cut-sw");
    add(
      corridor,
      40,
      225,
      720,
      335,
      "",
      "M40 225H760V275H310V560H260V275H40Z",
      { x: 505, y: 250 },
    );
    add(store, 316, 281, 164, 149);
    labels.push({ text: "Open below", x: 545, y: 480 });
  } else if (guests.length >= 10) {
    width = 1200;
    height = 850;
    outline = "M68 40H1132Q1160 40 1160 68V800H900V280H480V410H300V800H40V68Z";
    const top = Math.ceil(guests.length / 3),
      left = Math.ceil((guests.length - top) / 2);
    strip(guests.slice(0, top), 40, 40, 1120, 174, false, "cut-nw", "round-ne");
    strip(guests.slice(top, top + left), 40, 286, 199, 514, true, "", "cut-sw");
    strip(guests.slice(top + left), 961, 286, 199, 514, true, "", "round-se");
    add(
      corridor,
      40,
      220,
      1120,
      580,
      "",
      "M40 220H1160V280H955V800H900V280H300V800H245V280H40Z",
      { x: 600, y: 250 },
    );
    add(store, 306, 286, 174, 124);
    labels.push({ text: "Courtyard", x: 600, y: 535 });
  } else {
    // Small hotels and independent two-space wellness levels share a compact plan.
    width = 760;
    height = 500;
    outline = "M40 40H692Q720 40 720 68V460H40Z";
    const split = Math.ceil(areas.length / 2);
    strip(areas.slice(0, split), 40, 40, 680, 165, false, "cut-nw", "round-ne");
    strip(areas.slice(split), 40, 281, store ? 550 : 680, 179, false, "cut-sw");
    add(corridor, 40, 211, 680, 64);
    add(store, 596, 281, 124, 179);
  }

  // Unusual additional spaces remain reachable instead of silently disappearing.
  const placed = new Set(shapes.map((s) => s.spaceId));
  const extras = spaces.filter((s) => !placed.has(s.id));
  const columns = Math.max(1, Math.floor((width - 80) / 220)),
    start = height;
  extras.forEach((s, i) => {
    const x = 40 + (i % columns) * 220,
      y = start + Math.floor(i / columns) * 130;
    add(s, x, y, 210, 110);
    outline += boxPath(x, y, 210, 110);
  });
  if (extras.length)
    height = start + Math.ceil(extras.length / columns) * 130 + 20;
  return { width, height, outline, shapes, labels };
}
