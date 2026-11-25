import { amsterdamLevels, createAmsterdamSpaces } from "./amsterdam.js";

// Amsterdam spaces follow supplied drawings; inventory and other hotel layouts remain examples.
// This module has no UI or inventory-rule imports; replace fixtures with API data later.
// The fixed date makes the demo history and tests reproducible.
export const DEMO_DATE = "2026-11-05";

export const hotels = [
  { id: "ams", name: "Amsterdam", property: "Maurits at the Park" },
  { id: "ghent", name: "Ghent", property: "Grand Boutique Hotel Reylof" },
  { id: "brussels", name: "Brussels", property: "Brussels Centre" },
  { id: "zwolle", name: "Zwolle", property: "Ter Borch" },
  { id: "deventer", name: "Deventer", property: "Aan de IJssel" },
];
// These level layouts are test data, not surveyed layouts of the actual hotels.
export function hotelLevels(hotelId) {
  if (hotelId === "ams") return amsterdamLevels;
  const building = { buildingId: "main", buildingLabel: "Main hotel" };
  const main = (id) => ({
    id,
    label: `Floor ${id}`,
    shortLabel: id,
    kind: "main",
    planFamily: "main",
    ...building,
  });
  if (!["ams", "ghent", "all"].includes(hotelId)) return [main("1"), main("2")];
  const mezzanine = (id) => ({
    id: `${id}M`,
    label: `Mezzanine ${id}`,
    shortLabel: `${id}M`,
    kind: "mezzanine",
    parentId: id,
    planFamily: "mezzanine",
    ...building,
  });
  const levels = [
    {
      id: "G",
      label: "Ground floor",
      shortLabel: "G",
      kind: "main",
      planFamily: "ground",
      ...building,
    },
    main("1"),
    mezzanine("1"),
    main("2"),
    mezzanine("2"),
    main("3"),
    main("4"),
  ];
  if (["ghent", "all"].includes(hotelId))
    levels.push(
      ...[
        ["W-G", "Ground floor", "G"],
        ["W-1", "First floor", "1"],
        ["W-R", "Roof level", "R"],
      ].map(([id, label, shortLabel]) => ({
        id,
        label,
        shortLabel,
        kind: "main",
        planFamily: "wellness",
        buildingId: "wellness",
        buildingLabel: "Wellness",
      })),
    );
  if (hotelId === "all") {
    const extra = amsterdamLevels.filter((level) => !levels.some((item) => item.id === level.id));
    return [...extra, ...levels];
  }
  return levels;
}
export const suppliers = [
  {
    id: "lighting",
    name: "Example Lighting Studio",
    contact: "Example lighting team",
    email: "orders@lighting.example.invalid",
    phone: "Not recorded",
    orderNote:
      "Quote the product reference and required quantity. Demonstration contact only.",
  },
  {
    id: "furniture",
    name: "Example Furniture Atelier",
    contact: "Example furniture team",
    email: "orders@furniture.example.invalid",
    phone: "Not recorded",
    orderNote:
      "Confirm finish, dimensions and delivery date. Demonstration contact only.",
  },
  {
    id: "decorating",
    name: "Example Decorating Supply",
    contact: "Example paint team",
    email: "orders@paint.example.invalid",
    phone: "Not recorded",
    orderNote:
      "Confirm manufacturer colour code, sheen and pack size. Demonstration contact only.",
  },
  {
    id: "equipment",
    name: "Example Equipment Supply",
    contact: "Example equipment team",
    email: "orders@equipment.example.invalid",
    phone: "Not recorded",
    orderNote: "Quote the model reference. Demonstration contact only.",
  },
];
export const products = [
  {
    id: "lamp",
    name: "Bedside lamp",
    kind: "object",
    category: "Lighting",
    code: "L-01",
    description:
      "Linen shade with a brushed brass base. Example specification.",
    dimensions: "H 42 × Ø 24 cm",
    supplierId: "lighting",
    unit: "unit",
    stock: 3,
  },
  {
    id: "reading",
    name: "Reading lamp",
    kind: "object",
    category: "Lighting",
    code: "L-02",
    description: "Adjustable reading light. Example specification.",
    dimensions: "H 48 × W 20 cm",
    supplierId: "lighting",
    unit: "unit",
    stock: 2,
  },
  {
    id: "chair",
    name: "Lounge chair",
    kind: "object",
    category: "Furniture",
    code: "C-01",
    description:
      "Upholstered lounge chair in warm taupe. Example specification.",
    dimensions: "H 78 × W 72 × D 76 cm",
    supplierId: "furniture",
    unit: "unit",
    stock: 1,
  },
  {
    id: "bed",
    name: "Bed frame",
    kind: "object",
    category: "Furniture",
    code: "B-01",
    description: "Upholstered king-size bed frame. Example specification.",
    dimensions: "180 × 200 cm",
    supplierId: "furniture",
    unit: "unit",
    stock: 0,
  },
  {
    id: "wall",
    name: "Wall light",
    kind: "object",
    category: "Lighting",
    code: "W-01",
    description: "Warm diffused corridor light. Example specification.",
    dimensions: "H 28 × W 12 cm",
    supplierId: "lighting",
    unit: "unit",
    stock: 4,
  },
  {
    id: "shelf",
    name: "Storage shelving",
    kind: "object",
    category: "Equipment",
    code: "S-01",
    description: "Adjustable storage shelving. Example specification.",
    dimensions: "H 180 × W 90 × D 40 cm",
    supplierId: "equipment",
    unit: "unit",
    stock: 0,
  },
  {
    id: "locker",
    name: "Locker bank",
    kind: "object",
    category: "Equipment",
    code: "E-02",
    description:
      "Changing-area locker bank. Fictional wellness inventory example.",
    dimensions: "H 180 × W 90 × D 50 cm",
    supplierId: "equipment",
    unit: "unit",
    stock: 0,
  },
  {
    id: "bike",
    name: "Exercise bike",
    kind: "object",
    category: "Equipment",
    code: "E-03",
    description: "Indoor exercise bike. Fictional wellness inventory example.",
    dimensions: "H 150 × W 60 × D 120 cm",
    supplierId: "equipment",
    unit: "unit",
    stock: 0,
  },
  {
    id: "treatment",
    name: "Treatment bed",
    kind: "object",
    category: "Furniture",
    code: "F-02",
    description:
      "Adjustable treatment bed. Fictional wellness inventory example.",
    dimensions: "H 65 × W 80 × L 190 cm",
    supplierId: "furniture",
    unit: "unit",
    stock: 0,
  },
  {
    id: "bench",
    name: "Wellness bench",
    kind: "object",
    category: "Furniture",
    code: "F-03",
    description:
      "Wellness seating bench. Fictional wellness inventory example.",
    dimensions: "H 45 × W 180 × D 45 cm",
    supplierId: "furniture",
    unit: "unit",
    stock: 1,
  },
  {
    id: "ivory",
    name: "Warm ivory wall paint",
    kind: "finish",
    category: "Paint & finishes",
    code: "P-01",
    description:
      "Washable interior wall paint. Example specification; verify the manufacturer’s colour code.",
    dimensions: "5 L pack",
    colour: "Example IV-01",
    finish: "Matt",
    supplierId: "decorating",
    unit: "litre",
    stock: 10,
  },
  {
    id: "stone",
    name: "Soft stone wall paint",
    kind: "finish",
    category: "Paint & finishes",
    code: "P-02",
    description:
      "Interior corridor finish. Example specification; verify the manufacturer’s colour code.",
    dimensions: "5 L pack",
    colour: "Example ST-02",
    finish: "Eggshell",
    supplierId: "decorating",
    unit: "litre",
    stock: 5,
  },
  {
    id: "ceiling",
    name: "Ceiling white",
    kind: "finish",
    category: "Paint & finishes",
    code: "P-03",
    description:
      "Interior ceiling paint. Example specification; verify the manufacturer’s colour code.",
    dimensions: "10 L pack",
    colour: "Example WH-01",
    finish: "Matt",
    supplierId: "decorating",
    unit: "litre",
    stock: 10,
  },
  {
    id: "clay",
    name: "Muted clay wall paint",
    kind: "finish",
    category: "Paint & finishes",
    code: "P-04",
    description:
      "Soft clay feature-wall paint. Fictional example specification; verify the manufacturer’s colour code.",
    dimensions: "5 L pack",
    colour: "Example CL-04",
    finish: "Matt",
    supplierId: "decorating",
    unit: "litre",
    stock: 5,
  },
  {
    id: "grey",
    name: "Warm grey wall paint",
    kind: "finish",
    category: "Paint & finishes",
    code: "P-05",
    description:
      "Warm grey interior wall paint. Fictional example specification; verify the manufacturer’s colour code.",
    dimensions: "5 L pack",
    colour: "Example GR-05",
    finish: "Matt",
    supplierId: "decorating",
    unit: "litre",
    stock: 5,
  },
];

// Return fresh objects for each session or test so one change cannot leak into another.
export function createInitialData() {
  const pairs = {
    1: [
      ["ivory", "stone"],
      ["ivory", "clay"],
      ["grey", "stone"],
      ["ivory", "grey"],
    ],
    2: [
      ["stone", "clay"],
      ["ivory", "grey"],
      ["grey", "clay"],
      ["ivory", "stone"],
    ],
  };
  const wallFinishes = (wall = "stone", area = null) => [
    { id: "walls", surface: "Walls", productId: wall, area },
    {
      id: "ceiling",
      surface: "Ceiling",
      productId: "ceiling",
      area: area === null ? null : 8,
    },
  ];
  const spaces = hotels.flatMap((h) =>
    h.id === "ams" ? createAmsterdamSpaces() : hotelLevels(h.id).flatMap((level) => {
      const floor = level.id,
        large = ["ams", "ghent"].includes(h.id);
      if (level.buildingId === "wellness") {
        const layouts = {
          "W-G": [
            {
              slug: "reception",
              name: "Reception & changing",
              items: { chair: 2, locker: 4, bench: 2, wall: 3 },
              paint: "ivory",
            },
            {
              slug: "pool",
              name: "Pool",
              items: { chair: 4, wall: 6, shelf: 1 },
              paint: "grey",
            },
          ],
          "W-1": [
            {
              slug: "fitness",
              name: "Fitness",
              items: { bike: 3, wall: 4, shelf: 1 },
              paint: "stone",
            },
            {
              slug: "treatment",
              name: "Treatment room",
              items: { treatment: 1, shelf: 1, reading: 1 },
              paint: "clay",
            },
          ],
          "W-R": [
            {
              slug: "sauna",
              name: "Sauna",
              items: { bench: 3, wall: 2 },
              paint: "stone",
            },
            {
              slug: "hammam",
              name: "Hammam",
              items: { bench: 2, wall: 2 },
              paint: "grey",
            },
          ],
        };
        return layouts[floor].map(({ slug, name, items, paint }) => ({
          id: `${h.id}-${floor}-${slug}`,
          hotelId: h.id,
          name,
          floor,
          type: "Public space",
          verified: null,
          items,
          finishes: wallFinishes(paint).map((f) => ({
            ...f,
            surface:
              floor === "W-R"
                ? `Entrance ${f.surface.toLowerCase()}`
                : f.surface,
          })),
        }));
      }
      if (floor === "G")
        return [
          {
            id: `${h.id}-G-lobby`,
            hotelId: h.id,
            name: "Lobby",
            floor,
            type: "Public space",
            verified: "2026-10-30",
            items: { chair: 6, lamp: 2 },
            finishes: wallFinishes("ivory", 48),
          },
          {
            id: `${h.id}-G-restaurant`,
            hotelId: h.id,
            name: "Restaurant",
            floor,
            type: "Public space",
            verified: "2026-10-30",
            items: { chair: 12, wall: 4 },
            finishes: wallFinishes("clay", 64),
          },
          {
            id: `${h.id}-G-meeting`,
            hotelId: h.id,
            name: "Meeting room",
            floor,
            type: "Public space",
            verified: null,
            items: { chair: 8, reading: 2 },
            finishes: wallFinishes("grey", null),
          },
          {
            id: `${h.id}-cG`,
            hotelId: h.id,
            name: "Ground-floor corridor",
            floor,
            type: "Corridor",
            verified: "2026-10-30",
            items: { wall: 4 },
            finishes: wallFinishes(),
          },
          {
            id: `${h.id}-storeG`,
            hotelId: h.id,
            name: "Housekeeping store",
            floor,
            type: "Service",
            verified: "2026-10-30",
            items: { shelf: 3 },
            finishes: wallFinishes("stone", 18),
          },
        ];
      const count = large && level.kind === "main" ? 18 : 4;
      const rooms = Array.from({ length: count }, (_, index) => {
        const n = index + 1,
          variant = (index % 4) + 1,
          number = `${floor}${String(n).padStart(2, "0")}`,
          palette = pairs[parseInt(floor, 10) % 2 ? "1" : "2"],
          pair = palette[(index + (level.kind === "mezzanine" ? 1 : 0)) % 4];
        return {
          id: `${h.id}-${number}`,
          hotelId: h.id,
          name: `Room ${number}`,
          floor,
          type: "Guest room",
          verified: variant === 4 ? null : "2026-10-30",
          items: {
            lamp: 2,
            chair: variant === 3 ? 2 : 1,
            bed: 1,
            ...(variant === 4 ? { reading: 1 } : {}),
          },
          finishes: [
            {
              id: "main-walls",
              surface: "Main walls",
              productId: pair[0],
              area: variant === 4 ? null : 22 + variant * 2,
            },
            {
              id: "feature-wall",
              surface: "Feature wall",
              productId: pair[1],
              area: variant === 4 ? null : 5 + variant,
            },
          ],
        };
      });
      return [
        ...rooms,
        {
          id: `${h.id}-c${floor}`,
          hotelId: h.id,
          name: `Corridor · ${level.label}`,
          floor,
          type: "Corridor",
          verified: "2026-10-30",
          items: {
            wall:
              level.kind === "mezzanine" ? 3 : parseInt(floor, 10) % 2 ? 6 : 5,
          },
          finishes: wallFinishes(),
        },
        {
          id: `${h.id}-store${floor}`,
          hotelId: h.id,
          name: `Linen store · ${level.label}`,
          floor,
          type: "Service",
          verified: "2026-10-30",
          items: { shelf: 2 },
          finishes: wallFinishes("stone", 14),
        },
      ];
    }),
  );
  const issues = hotels.flatMap((h, i) => [
    {
      id: `initial-lamp-${i}`,
      spaceId: `${h.id}-101`,
      productId: "lamp",
      qty: 1,
      reason: "Damaged",
      note: "Shade cracked near the seam.",
      status: "Open",
      date: "2026-11-03",
    },
    {
      id: `initial-paint-${i}`,
      spaceId: `${h.id}-c1`,
      productId: "stone",
      qty: null,
      reason: "Wear and tear",
      note: "Scuffed wall near the lift.",
      status: "Open",
      date: "2026-11-02",
    },
    {
      id: `initial-chair-${i}`,
      spaceId: `${h.id}-203`,
      productId: "chair",
      qty: 1,
      reason: "Defect",
      note: "Loose joint. Replacement ordered.",
      status: "Ordered",
      date: "2026-10-30",
    },
  ]);
  const history = hotels.flatMap((h, i) => [
    {
      id: `past-lamp-${i}`,
      spaceId: `${h.id}-102`,
      productId: "lamp",
      qty: 1,
      type: "Replaced",
      reason: "Damaged",
      note: "Shade damaged.",
      date: "2026-10-28",
      actor: "Hotel team",
    },
    {
      id: `past-chair-${i}`,
      spaceId: `${h.id}-201`,
      productId: "chair",
      qty: 1,
      type: "Replaced",
      reason: "Wear and tear",
      note: "Fabric worn.",
      date: "2026-10-14",
      actor: "Hotel team",
    },
    {
      id: `past-paint-${i}`,
      spaceId: `${h.id}-202`,
      productId: "ivory",
      qty: null,
      type: "Repainted",
      reason: "Refurbishment",
      note: "Room refresh.",
      date: "2026-09-18",
      actor: "Hotel team",
    },
  ]);
  return { spaces, issues, history };
}
