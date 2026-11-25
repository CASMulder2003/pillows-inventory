import lower from "./amsterdam-lower.json" with { type: "json" };
import ground from "./amsterdam-ground.json" with { type: "json" };
import upper from "./amsterdam-upper.json" with { type: "json" };
import display from "./amsterdam-display.json" with { type: "json" };

// Coordinates are traced from the supplied drawings. They are data, not UI code.
// Keep original room identifiers; floor numbering and room numbering are independent.
const order = ["B2", "LG", "G", "M", "1", "2", "3", "R"];
// Display walls are generated separately; source coordinates remain available for review.
export const amsterdamDrawings = [...lower, ...ground, ...upper]
  .map((level) => ({ ...level, ...display.levels[level.id] }))
  .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
export const amsterdamLevels = amsterdamDrawings.map((level) => ({
  id: level.id, label: level.label, shortLabel: level.shortLabel,
  kind: level.kind, parentId: level.parentId,
  buildingId: "main", buildingLabel: "Maurits at the Park",
  planFamily: "amsterdam", sourceBased: true,
}));

const palettes = [
  [["stone", "clay"], ["ivory", "grey"], ["grey", "clay"], ["ivory", "stone"]],
  [["ivory", "stone"], ["ivory", "clay"], ["grey", "stone"], ["ivory", "grey"]],
];

function noteText(record) {
  return [record.note, record.notes].flat()
    .filter((note) => typeof note === "string" && note.trim())
    .map((note) => note.trim()).join(" ");
}

// Inventory is still illustrative. Drawing floor area is never used as painted wall area.
export function createAmsterdamSpaces() {
  return amsterdamDrawings.flatMap((level) => level.spaces.map((record) => {
    const guest = record.type === "Guest room";
    const number = Number(record.name.match(/\d+/)?.[0] || 1);
    const variant = ((number % 100 - 1) % 4 + 4) % 4;
    const palette = palettes[Math.floor(number / 100) % 2][variant];
    const corridor = record.type === "Corridor";
    const living = record.id === "ams-G-living";
    const sourceNote = noteText(record);
    return {
      id: record.id, hotelId: "ams", name: record.name, floor: level.id,
      type: record.type, verified: null,
      sourceName: record.sourceName, sourceCode: record.drawingCode || null,
      sourceArea: typeof record.area === "number" ? record.area : null,
      sourceDrawing: level.sourceDrawing, sourceDate: level.sourceDate,
      sourceNote: sourceNote || null,
      description: sourceNote || "Space envelope traced from the supplied architectural drawing; confirm the current layout with the hotel team.",
      inventoryStatus: guest || corridor || living ? "sample" : "pending",
      items: guest ? { lamp: 2, chair: variant === 2 ? 2 : 1, bed: 1,
        ...(variant === 3 ? { reading: 1 } : {}) }
        : corridor ? { wall: 4 } : living ? { chair: 6, lamp: 2 } : {},
      finishes: guest ? [
        { id: "main-walls", surface: "Main walls", productId: palette[0], area: variant === 3 ? null : 24 + variant * 2 },
        { id: "feature-wall", surface: "Feature wall", productId: palette[1], area: variant === 3 ? null : 6 + variant },
      ] : corridor ? [
        { id: "walls", surface: "Walls", productId: "stone", area: null },
        { id: "ceiling", surface: "Ceiling", productId: "ceiling", area: null },
      ] : [],
    };
  }));
}

const round = (n) => Math.round(n * 100) / 100;
function ringPath(points, dx, dy) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${round(x + dx)} ${round(y + dy)}`).join("") + "Z";
}
// Source outlines use absolute SVG commands. Translate them with the room polygons.
function translatePath(path, dx, dy) {
  let command = "", index = 0;
  return (path || "").replace(/[a-zA-Z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/g, (token) => {
    if (/^[a-zA-Z]$/.test(token)) { command = token; index = 0; return token; }
    const i = index++;
    let offset = 0;
    if (command === "H") offset = dx;
    else if (command === "V") offset = dy;
    else if (command === "A") offset = i % 7 === 5 ? dx : i % 7 === 6 ? dy : 0;
    else if (/[MLCQST]/.test(command)) offset = i % 2 ? dy : dx;
    return String(round(Number(token) + offset));
  });
}

// Include the whole architectural context in the camera frame. Bezier control
// points give a conservative bound without needing a geometry dependency.
function pathPoints(path = "") {
  const tokens = path.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || [];
  if (tokens.join("") !== path.replace(/[,\s]/g, ""))
    throw new Error("Invalid architectural outline path.");
  const sizes = { M: 2, L: 2, H: 1, V: 1, Q: 4, C: 6, S: 4, T: 2, Z: 0 };
  const points = [];
  let x = 0, y = 0, start = [0, 0], index = 0, previous = "", control = null;
  while (index < tokens.length) {
    const command = tokens[index++];
    const size = sizes[command];
    if (size === undefined) throw new Error(`Unsupported architectural path command: ${command}`);
    const values = [];
    while (index < tokens.length && !/^[a-zA-Z]$/.test(tokens[index]))
      values.push(Number(tokens[index++]));
    if (values.some((value) => !Number.isFinite(value)) ||
        (size ? !values.length || values.length % size !== 0 : values.length))
      throw new Error("Invalid architectural path coordinates.");
    if (command === "Z") { [x, y] = start; previous = command; control = null; continue; }
    if (command === "H" || command === "V") {
      for (const value of values) {
        if (command === "H") x = value; else y = value;
        points.push([x, y]);
      }
      previous = command; control = null;
    } else {
      for (let offset = 0; offset < values.length; offset += size) {
        const segment = values.slice(offset, offset + size);
        const smooth = command === "S" && /[CS]/.test(previous) ||
          command === "T" && /[QT]/.test(previous);
        const reflected = smooth && control ? [2 * x - control[0], 2 * y - control[1]] : [x, y];
        if (command === "S" || command === "T") points.push(reflected);
        for (let i = 0; i < segment.length; i += 2) points.push([segment[i], segment[i + 1]]);
        [x, y] = segment.slice(-2);
        if (command === "M" && offset === 0) start = segment.slice(0, 2);
        control = command === "C" ? segment.slice(2, 4)
          : command === "Q" || command === "S" ? segment.slice(0, 2)
          : command === "T" ? reflected : null;
        previous = command;
      }
    }
  }
  return points;
}

export function buildAmsterdamPlan(spaces, levelId) {
  const drawing = amsterdamDrawings.find((level) => level.id === levelId);
  if (!drawing) return null;
  const records = drawing.spaces.filter((record) => spaces.some((space) => space.id === record.id));
  const points = [
    ...drawing.spaces.flatMap((record) => [record.points, ...(record.holes || [])].flat()),
    ...pathPoints(drawing.displayOutline || drawing.outline),
    ...(drawing.context || []).flatMap((region) => [
      ...(region.points
        ? [region.points, ...(region.holes || [])].flat()
        : pathPoints(region.path)),
      ...(Number.isFinite(region.x) && Number.isFinite(region.y) ? [[region.x, region.y]] : []),
    ]),
  ];
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const left = Math.min(...xs) - 32, top = Math.min(...ys) - 32;
  const right = Math.max(...xs) + 32, bottom = Math.max(...ys) + 32;
  const dx = -left, dy = -top;
  const shapes = records.map((record) => {
    const x = record.points.map(([x]) => x), y = record.points.map(([, y]) => y);
    const bounds = { x: Math.min(...x) + dx, y: Math.min(...y) + dy,
      width: Math.max(...x) - Math.min(...x), height: Math.max(...y) - Math.min(...y) };
    const anchor = record.label || [(Math.min(...x) + Math.max(...x)) / 2, (Math.min(...y) + Math.max(...y)) / 2];
    return {
      spaceId: record.id, shortLabel: record.shortLabel || record.name,
      labelLines: record.labelLines,
      x: anchor[0] + dx, y: anchor[1] + dy, bounds,
      path: [record.points, ...(drawing.displayHoles?.[record.id] || record.holes || [])].map((ring) => ringPath(ring, dx, dy)).join(""),
    };
  });
  return {
    width: right - left, height: bottom - top, shapes, labels: [],
    outline: translatePath(drawing.displayOutline || drawing.outline, dx, dy), sourceBased: true,
    source: { drawing: drawing.sourceDrawing, date: drawing.sourceDate, file: drawing.sourceFile },
    sourceNote: [drawing.geometryNote || drawing.geometryStatus, noteText(drawing)].filter(Boolean).join(" "),
    context: (drawing.context || []).map((region) => ({
      ...region,
      path: region.points
        ? [region.points, ...(region.holes || [])].map((ring) => ringPath(ring, dx, dy)).join("")
        : translatePath(region.path, dx, dy),
      x: region.x == null ? undefined : region.x + dx,
      y: region.y == null ? undefined : region.y + dy,
    })),
  };
}
