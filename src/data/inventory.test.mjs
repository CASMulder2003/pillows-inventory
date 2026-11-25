import test from "node:test";
import assert from "node:assert/strict";
import { buildFloorPlan } from "../map/geometry.js";
import { amsterdamDrawings } from "./amsterdam.js";
import {
  createInitialData,
  getScope,
  aggregate,
  applyChange,
  spaceById,
  products,
  hotelLevels,
} from "./inventory.js";

test("hotel and selected-space scope stay isolated; objects and finishes use distinct measures", () => {
  const data = createInitialData();
  assert.equal(getScope(data, "ams").filter((space) => space.type === "Guest room").length, 88);
  assert.equal(getScope(data, "ams", "1").filter((space) => space.type === "Guest room").length, 15);
  assert.deepEqual(
    getScope(data, "ams", "all", ["ams-101", "ghent-101"]).map((s) => s.id),
    ["ams-101"],
  );
  const totals = aggregate(data, ["ams-101", "ams-103"]);
  assert.equal(totals.find((r) => r.productId === "lamp").quantity, 4);
  assert.equal(
    totals
      .filter((r) => r.kind === "object")
      .reduce((n, r) => n + r.quantity, 0),
    9,
  );
  const paint = totals.find((r) => r.productId === "ivory");
  assert.equal(paint.quantity, null);
  assert.equal(paint.applications, 1);
  assert.equal(paint.area, 24);
  assert.equal(
    aggregate(data, ["ams-104"]).find((r) => r.productId === "ivory").area,
    null,
  );
});
test("reporting damage adds history and an issue without changing installed quantities", () => {
  const data = createInitialData(),
    snapshot = JSON.stringify(data);
  const changed = applyChange(data, {
    action: "report",
    spaceIds: ["ams-102"],
    productId: "lamp",
    qty: 1,
    reason: "Damaged",
    note: "Broken shade",
  });
  assert.deepEqual(changed.spaces, data.spaces);
  assert.equal(changed.issues.length, data.issues.length + 1);
  assert.equal(changed.history[0].type, "Issue reported");
  assert.equal(JSON.stringify(data), snapshot);
  assert.deepEqual(changed.issues.at(-1).photoIds, []);
  assert.deepEqual(changed.history[0].photoIds, []);
  assert.throws(
    () =>
      applyChange(changed, {
        action: "report",
        spaceIds: ["ams-102"],
        productId: "lamp",
        qty: 2,
        reason: "Damaged",
        note: "Another shade",
      }),
    /unreported/,
  );
});
test("a failing bulk operation is atomic", () => {
  const data = createInitialData(),
    snapshot = JSON.stringify(data);
  assert.throws(
    () =>
      applyChange(data, {
        action: "remove",
        spaceIds: ["ams-103", "ams-102"],
        productId: "chair",
        qty: 2,
        reason: "Refurbishment",
      }),
    /fewer/,
  );
  assert.equal(JSON.stringify(data), snapshot);
});
test("bulk replacement switches model in both rooms and leaves other hotels unchanged", () => {
  const data = createInitialData();
  const result = applyChange(data, {
    action: "replace",
    spaceIds: ["ams-102", "ams-103"],
    productId: "lamp",
    qty: 1,
    replacementId: "reading",
    reason: "Refurbishment",
  });
  for (const id of ["ams-102", "ams-103"]) {
    assert.equal(spaceById(result, id).items.lamp, 1);
    assert.equal(spaceById(result, id).items.reading, 1);
  }
  assert.deepEqual(getScope(result, "ghent"), getScope(data, "ghent"));
  assert.equal(result.history.length, data.history.length + 2);
  assert.equal(
    aggregate(result, ["ams-102", "ams-103"])
      .filter((r) => r.kind === "object")
      .reduce((n, r) => n + r.quantity, 0),
    9,
  );
});
test("ordering is idempotent and resolving an issue logs exactly once", () => {
  const data = createInitialData(),
    issueId = "initial-lamp-0";
  const ordered = applyChange(data, { action: "ordered", issueId });
  const again = applyChange(ordered, { action: "ordered", issueId });
  assert.equal(again.history.length, ordered.history.length);
  const resolved = applyChange(ordered, {
    action: "resolve",
    issueId,
    outcome: "Replaced",
  });
  assert.equal(spaceById(resolved, "ams-101").items.lamp, 2);
  assert.equal(
    resolved.issues.find((i) => i.id === issueId).status,
    "Resolved",
  );
  assert.equal(resolved.history[0].type, "Replaced");
  assert.equal(resolved.history[0].reason, "Damaged");
  assert.throws(
    () =>
      applyChange(resolved, {
        action: "resolve",
        issueId,
        outcome: "Replaced",
      }),
    /already resolved/,
  );
});
test("linked replacement changes model, and repainting keeps finish specification and stock separate", () => {
  const data = createInitialData();
  const replaced = applyChange(data, {
    action: "resolve",
    issueId: "initial-lamp-0",
    outcome: "Replaced",
    replacementId: "reading",
  });
  assert.equal(spaceById(replaced, "ams-101").items.lamp, 1);
  assert.equal(spaceById(replaced, "ams-101").items.reading, 1);
  const painted = applyChange(data, {
    action: "resolve",
    issueId: "initial-paint-0",
    outcome: "Repainted",
  });
  assert.deepEqual(painted.spaces, data.spaces);
  assert.equal(painted.history[0].qty, null);
  assert.equal(painted.history[0].type, "Repainted");
  assert.throws(
    () =>
      applyChange(data, {
        action: "resolve",
        issueId: "initial-paint-0",
        outcome: "Replaced",
      }),
    /appropriate/,
  );
});
test("removing a unit cannot orphan unresolved reported quantities", () => {
  const data = createInitialData();
  assert.throws(
    () =>
      applyChange(data, {
        action: "remove",
        spaceIds: ["ams-101"],
        productId: "lamp",
        qty: 2,
        reason: "Refurbishment",
      }),
    /Resolve the reported/,
  );
  const removed = applyChange(data, {
    action: "resolve",
    issueId: "initial-lamp-0",
    outcome: "Removed",
  });
  assert.equal(spaceById(removed, "ams-101").items.lamp, 1);
  assert.equal(
    removed.issues.find((i) => i.id === "initial-lamp-0").status,
    "Resolved",
  );
});
test("unlinked replacements cannot consume quantities reserved by an unresolved issue", () => {
  const data = createInitialData(),
    snapshot = JSON.stringify(data);
  for (const replacementId of ["lamp", "reading"]) {
    assert.throws(
      () =>
        applyChange(data, {
          action: "replace",
          spaceIds: ["ams-102", "ams-101"],
          productId: "lamp",
          qty: 2,
          replacementId,
          reason: "Refurbishment",
        }),
      /existing issues/,
    );
    assert.equal(JSON.stringify(data), snapshot);
  }
  const unreported = applyChange(data, {
    action: "replace",
    spaceIds: ["ams-101"],
    productId: "lamp",
    qty: 1,
    replacementId: "lamp",
    reason: "Refurbishment",
  });
  assert.equal(spaceById(unreported, "ams-101").items.lamp, 2);
  assert.equal(
    unreported.issues.find((i) => i.id === "initial-lamp-0").status,
    "Open",
  );
  const resolved = applyChange(unreported, {
    action: "resolve",
    issueId: "initial-lamp-0",
    outcome: "Replaced",
  });
  assert.equal(
    resolved.issues.find((i) => i.id === "initial-lamp-0").status,
    "Resolved",
  );
  assert.equal(spaceById(resolved, "ams-101").items.lamp, 2);
});
test("guest-room paint pairs vary by room and floor, with stable application IDs and distinct totals", () => {
  const data = createInitialData(),
    rooms = getScope(data, "ams").filter((s) => s.type === "Guest room");
  assert.ok(rooms.every((s) => s.finishes.length === 2));
  assert.ok(
    rooms.every(
      (s) =>
        s.finishes.map((f) => f.id).join(",") === "main-walls,feature-wall",
    ),
  );
  assert.ok(
    rooms.every(
      (s) =>
        s.finishes.map((f) => f.surface).join(",") ===
        "Main walls,Feature wall",
    ),
  );
  assert.ok(
    rooms.every((s) => new Set(s.finishes.map((f) => f.productId)).size === 2),
  );
  assert.ok(
    new Set(rooms.map((s) => s.finishes.map((f) => f.productId).join(",")))
      .size > 3,
  );
  assert.notDeepEqual(
    spaceById(data, "ams-101").finishes.map((f) => f.productId),
    spaceById(data, "ams-201").finishes.map((f) => f.productId),
  );
  assert.ok(
    spaceById(data, "ams-202").finishes.some((f) => f.productId === "ivory"),
  );
  const paints = aggregate(data, ["ams-101", "ams-102"]).filter(
    (r) => r.kind === "finish",
  );
  assert.equal(paints.length, 3);
  assert.equal(
    paints.reduce((n, r) => n + r.applications, 0),
    4,
  );
  assert.equal(paints.find((r) => r.productId === "ivory").area, 50);
  assert.deepEqual(paints.find((r) => r.productId === "ivory").spaceIds, [
    "ams-101",
    "ams-102",
  ]);
});
test("editing one applied finish preserves the catalogue, other surfaces and other rooms", () => {
  const data = createInitialData(),
    before = JSON.stringify(data),
    catalogue = JSON.stringify(products);
  const result = applyChange(data, {
    action: "finish",
    spaceIds: ["ams-101"],
    finishId: "feature-wall",
    productId: "clay",
    area: 7.5,
    note: "Changed during room refresh.",
  });
  const edited = spaceById(result, "ams-101");
  assert.deepEqual(edited.finishes[0], spaceById(data, "ams-101").finishes[0]);
  assert.deepEqual(edited.finishes[1], {
    id: "feature-wall",
    surface: "Feature wall",
    productId: "clay",
    area: 7.5,
  });
  assert.deepEqual(
    result.spaces.filter((s) => s.id !== "ams-101"),
    data.spaces.filter((s) => s.id !== "ams-101"),
  );
  assert.equal(JSON.stringify(data), before);
  assert.equal(JSON.stringify(products), catalogue);
  assert.equal(result.history[0].previousProductId, "stone");
  assert.equal(result.history[0].newProductId, "clay");
  assert.equal(result.history[0].surface, "Feature wall");
  assert.equal(result.history[0].previousArea, 6);
  assert.equal(result.history[0].area, 7.5);
  assert.equal(
    aggregate(result, ["ams-101"]).find((r) => r.productId === "clay").area,
    7.5,
  );
  assert.equal(
    aggregate(result, ["ams-101"]).find((r) => r.productId === "stone"),
    undefined,
  );
});
test("finish edits validate scope and area atomically, and preserve active issue references", () => {
  const data = createInitialData(),
    before = JSON.stringify(data);
  const request = {
    action: "finish",
    spaceIds: ["ams-101"],
    finishId: "feature-wall",
    productId: "clay",
    area: 6,
    note: "",
  };
  for (const area of [-1, Infinity, NaN, "6", undefined])
    assert.throws(
      () => applyChange(data, { ...request, area }),
      /surface area/,
    );
  assert.throws(
    () => applyChange(data, { ...request, spaceIds: ["ams-101", "ams-102"] }),
    /exactly one/,
  );
  assert.throws(
    () => applyChange(data, { ...request, finishId: "missing" }),
    /existing applied finish/,
  );
  assert.throws(
    () => applyChange(data, { ...request, productId: "lamp" }),
    /paint or finish/,
  );
  assert.throws(
    () =>
      applyChange(data, {
        ...request,
        spaceIds: ["ams-c1"],
        finishId: "walls",
      }),
    /Resolve the existing issue/,
  );
  assert.equal(JSON.stringify(data), before);
  const areaOnly = applyChange(data, {
    action: "finish",
    spaceIds: ["ams-c1"],
    finishId: "walls",
    productId: "stone",
    area: 0,
    note: "Measured surface updated.",
  });
  assert.equal(spaceById(areaOnly, "ams-c1").finishes[0].area, 0);
  assert.equal(
    areaOnly.issues.find((i) => i.id === "initial-paint-0").status,
    "Open",
  );
  const unknown = applyChange(data, { ...request, area: null });
  assert.equal(spaceById(unknown, "ams-101").finishes[1].area, null);
});
test("illustrative hotels retain independently scoped mezzanines and ground spaces", () => {
  const data = createInitialData();
  for (const hotel of ["ghent"]) {
    const levels = hotelLevels(hotel),
      all = getScope(data, hotel),
      guests = all.filter((s) => s.type === "Guest room");
    assert.equal(guests.length, 80);
    assert.equal(all.length, hotel === "ghent" ? 103 : 97);
    assert.deepEqual(
      levels.filter((l) => l.buildingId === "main").map((l) => l.id),
      ["G", "1", "1M", "2", "2M", "3", "4"],
    );
    assert.equal(new Set(all.map((s) => s.id)).size, all.length);
    assert.deepEqual(
      levels.filter((l) => l.kind === "mezzanine").map((l) => l.parentId),
      ["1", "2"],
    );
    for (const floor of ["1", "2", "3", "4"])
      assert.equal(
        getScope(data, hotel, floor).filter((s) => s.type === "Guest room")
          .length,
        18,
      );
    for (const floor of ["1M", "2M"]) {
      const mid = getScope(data, hotel, floor);
      assert.equal(mid.filter((s) => s.type === "Guest room").length, 4);
      assert.equal(mid.length, 6);
      assert.ok(mid.every((s) => s.floor === floor));
      assert.equal(
        aggregate(
          data,
          mid.map((s) => s.id),
        )
          .filter((r) => r.kind === "object")
          .reduce((n, r) => n + r.quantity, 0),
        23,
      );
    }
    assert.equal(
      getScope(data, hotel, "G").filter((s) => s.type === "Public space")
        .length,
      3,
    );
    assert.ok(spaceById(data, `${hotel}-101`));
    assert.ok(spaceById(data, `${hotel}-202`));
    assert.ok(spaceById(data, `${hotel}-1M01`));
    assert.equal(
      aggregate(
        data,
        all.map((s) => s.id),
      )
        .filter((r) => r.kind === "object")
        .reduce((n, r) => n + r.quantity, 0),
      hotel === "ghent" ? 479 : 437,
    );
  }
  for (const hotel of ["brussels", "zwolle", "deventer"]) {
    assert.equal(
      getScope(data, hotel).filter((s) => s.type === "Guest room").length,
      8,
    );
    assert.deepEqual(
      hotelLevels(hotel).map((l) => l.id),
      ["1", "2"],
    );
  }
  assert.equal(
    getScope(data, "ghent", "1M", ["ghent-101", "ghent-1M01", "ams-201"]).length,
    1,
  );
});
test("separate wellness building levels never merge with similarly named main-hotel floors", () => {
  const data = createInitialData(),
    levels = hotelLevels("ghent"),
    wellness = levels.filter((l) => l.buildingId === "wellness");
  assert.deepEqual(
    wellness.map((l) => l.id),
    ["W-G", "W-1", "W-R"],
  );
  assert.deepEqual(
    wellness.map((l) => l.label),
    ["Ground floor", "First floor", "Roof level"],
  );
  assert.ok(
    wellness.every(
      (l) => l.buildingLabel === "Wellness" && l.planFamily === "wellness",
    ),
  );
  for (const hotel of ["brussels", "zwolle", "deventer"])
    assert.ok(
      hotelLevels(hotel).every(
        (l) => l.buildingId === "main" && l.buildingLabel === "Main hotel",
      ),
    );
  const main = getScope(data, "ghent", "1"),
    first = getScope(data, "ghent", "W-1");
  assert.equal(main.length, 20);
  assert.equal(first.length, 2);
  assert.deepEqual(
    first.map((s) => s.name),
    ["Fitness", "Treatment room"],
  );
  assert.ok(
    first.every(
      (s) => s.type === "Public space" && !main.some((m) => m.id === s.id),
    ),
  );
  assert.equal(
    aggregate(
      data,
      first.map((s) => s.id),
    )
      .filter((r) => r.kind === "object")
      .reduce((n, r) => n + r.quantity, 0),
    11,
  );
  assert.equal(
    getScope(data, "ghent", "W-1", ["ghent-101", "ghent-W-1-fitness"]).length,
    1,
  );
  assert.equal(getScope(data, "ams", "W-1").length, 0);
  assert.equal(
    getScope(data, "ghent").filter((s) => s.type === "Guest room").length,
    80,
  );
  assert.equal(
    new Set(hotelLevels("all").map((l) => l.id)).size,
    hotelLevels("all").length,
  );
});
test("optional report photo references are deduplicated and copied without changing inventory", () => {
  const data = createInitialData(),
    photoIds = ["photo-shade", "photo-closeup", "photo-shade"];
  const result = applyChange(data, {
    action: "report",
    spaceIds: ["ams-102", "ams-103"],
    productId: "lamp",
    qty: 1,
    reason: "Damaged",
    note: "Broken shade",
    photoIds,
  });
  assert.deepEqual(result.spaces, data.spaces);
  const issues = result.issues.slice(data.issues.length),
    history = result.history.slice(0, 2);
  for (const record of [...issues, ...history])
    assert.deepEqual(record.photoIds, ["photo-shade", "photo-closeup"]);
  photoIds.push("later-upload");
  assert.deepEqual(issues[0].photoIds, ["photo-shade", "photo-closeup"]);
  assert.notStrictEqual(issues[0].photoIds, issues[1].photoIds);
  assert.notStrictEqual(issues[0].photoIds, history[1].photoIds);
  assert.equal(data.issues.length, 15);
  assert.equal(data.history.length, 15);
});
test("resolution photos stay separate from original issue evidence and remain optional", () => {
  const reported = applyChange(createInitialData(), {
    action: "report",
    spaceIds: ["ams-102"],
    productId: "lamp",
    qty: 1,
    note: "Broken shade",
    photoIds: ["before"],
  });
  const issue = reported.issues.at(-1),
    snapshot = JSON.stringify(reported);
  const resolved = applyChange(reported, {
    action: "resolve",
    issueId: issue.id,
    outcome: "Replaced",
    photoIds: ["after"],
  });
  assert.equal(resolved.issues.at(-1).status, "Resolved");
  assert.deepEqual(resolved.issues.at(-1).photoIds, ["before"]);
  assert.deepEqual(resolved.history[0].photoIds, ["after"]);
  assert.deepEqual(resolved.history[1].photoIds, ["before"]);
  assert.equal(JSON.stringify(reported), snapshot);
  const noPhotos = applyChange(reported, {
    action: "resolve",
    issueId: issue.id,
    outcome: "Repaired",
  });
  assert.deepEqual(noPhotos.history[0].photoIds, []);
  assert.deepEqual(noPhotos.issues.at(-1).photoIds, ["before"]);
});
test("replacement and applied finish edits retain optional photo references in history", () => {
  const data = createInitialData(),
    photoIds = ["ref-one", "ref-two", "ref-three"];
  const replaced = applyChange(data, {
    action: "replace",
    spaceIds: ["ams-102"],
    productId: "lamp",
    replacementId: "reading",
    qty: 1,
    photoIds,
  });
  assert.deepEqual(replaced.history[0].photoIds, photoIds);
  assert.equal(spaceById(replaced, "ams-102").items.reading, 1);
  const painted = applyChange(data, {
    action: "finish",
    spaceIds: ["ams-102"],
    finishId: "feature-wall",
    productId: "grey",
    area: null,
    photoIds,
  });
  assert.deepEqual(painted.history[0].photoIds, photoIds);
  assert.equal(painted.history[0].surface, "Feature wall");
  photoIds[0] = "changed";
  assert.equal(replaced.history[0].photoIds[0], "ref-one");
  assert.equal(painted.history[0].photoIds[0], "ref-one");
});
test("invalid photo references reject the entire change before any data is altered", () => {
  const data = createInitialData(),
    snapshot = JSON.stringify(data);
  const requests = [
    {
      action: "report",
      spaceIds: ["ams-102", "ams-103"],
      productId: "lamp",
      qty: 1,
      note: "Broken shade",
    },
    {
      action: "finish",
      spaceIds: ["ams-102"],
      finishId: "feature-wall",
      productId: "grey",
      area: null,
    },
    { action: "ordered", issueId: "initial-chair-0" },
  ];
  for (const photoIds of [
    null,
    "photo",
    {},
    [""],
    ["  "],
    ["photo", 3],
    ["a", "b", "c", "d"],
    Array(1),
  ]) {
    for (const request of requests)
      assert.throws(
        () => applyChange(data, { ...request, photoIds }),
        /photo references/,
      );
    assert.equal(JSON.stringify(data), snapshot);
  }
});

test("Amsterdam follows the eight supplied levels and preserves real room numbering", () => {
  const data = createInitialData();
  assert.deepEqual(hotelLevels("ams").map((level) => level.id), ["B2", "LG", "G", "M", "1", "2", "3", "R"]);
  const counts = Object.fromEntries(hotelLevels("ams").map((level) => [level.id,
    getScope(data, "ams", level.id).filter((space) => space.type === "Guest room").length]));
  assert.deepEqual(counts, { B2: 0, LG: 13, G: 27, M: 7, 1: 15, 2: 23, 3: 3, R: 0 });
  assert.equal(spaceById(data, "ams-101").floor, "G");
  assert.equal(spaceById(data, "ams-201").floor, "M");
  assert.equal(spaceById(data, "ams-301").floor, "1");
  assert.equal(spaceById(data, "ams-401").floor, "2");
  assert.ok(!data.spaces.some((space) => ["ams-013", "ams-113", "ams-313", "ams-413", "ams-418"].includes(space.id)));
  const spaces = getScope(data, "ams");
  assert.equal(new Set(spaces.map((space) => space.id)).size, spaces.length);
  assert.ok(spaces.every((space) => space.sourceDrawing && !space.verified));
  assert.equal(spaceById(data, "ams-101").sourceArea, 24.8);
  assert.equal(spaceById(data, "ams-101").inventoryStatus, "sample");
});


// Read absolute SVG coordinates independently of the geometry adapter. Curve
// control points are checked too, so their conservative hull cannot be clipped.
function svgVertices(path) {
  assert.equal(typeof path, "string");
  assert.ok(path.startsWith("M"), "a drawable path starts with a move");
  const segments = [...path.matchAll(/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/g)];
  assert.equal(segments.map((part) => part[0]).join(""), path);
  const vertices = [];
  const sizes = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  let x = 0, y = 0;
  for (const [, command, body] of segments) {
    const numbers = body.trim() ? body.trim().split(/[ ,]+/).map(Number) : [];
    assert.ok(numbers.every(Number.isFinite), `finite ${command} coordinates`);
    const size = sizes[command];
    assert.ok(size ? numbers.length > 0 && numbers.length % size === 0 : numbers.length === 0);
    if (command === "H" || command === "V") {
      for (const value of numbers) {
        if (command === "H") x = value; else y = value;
        vertices.push([x, y]);
      }
    } else if (command === "A") {
      for (let i = 0; i < numbers.length; i += size)
        vertices.push([numbers[i + 5], numbers[i + 6]]);
      [x, y] = vertices.at(-1);
    } else {
      for (let i = 0; i < numbers.length; i += 2) {
        x = numbers[i]; y = numbers[i + 1];
        vertices.push([x, y]);
      }
    }
  }
  return vertices;
}

function insideFrame([x, y], plan, label) {
  assert.ok(Number.isFinite(x) && Number.isFinite(y), `${label}: finite point`);
  assert.ok(x >= -0.01 && x <= plan.width + 0.01, `${label}: horizontal containment`);
  assert.ok(y >= -0.01 && y <= plan.height + 0.01, `${label}: vertical containment`);
}

test("Amsterdam geometry covers all eight source levels without duplicate or foreign spaces", () => {
  const data = createInitialData();
  const snapshot = JSON.stringify({ data, amsterdamDrawings });
  const mappedIds = [];
  assert.equal(amsterdamDrawings.length, 8);
  for (const level of hotelLevels("ams")) {
    const drawing = amsterdamDrawings.find((drawing) => drawing.id === level.id);
    const spaces = getScope(data, "ams", level.id);
    const plan = buildFloorPlan(spaces, level, "ams");
    const expected = drawing.spaces.map((record) => record.id).sort();
    assert.deepEqual(spaces.map((space) => space.id).sort(), expected);
    assert.deepEqual(plan.shapes.map((shape) => shape.spaceId).sort(), expected);
    assert.equal(new Set(plan.shapes.map((shape) => shape.spaceId)).size, expected.length);
    assert.equal(plan.sourceBased, true);
    assert.equal(plan.source.drawing, drawing.sourceDrawing);
    assert.equal(plan.source.date, drawing.sourceDate);
    mappedIds.push(...plan.shapes.map((shape) => shape.spaceId));
    const subset = spaces.filter((_, index) => index % 2 === 0);
    const filtered = buildFloorPlan([...subset, getScope(data, "ghent")[0]], level, "ams");
    assert.deepEqual(filtered.shapes.map((shape) => shape.spaceId).sort(), subset.map((space) => space.id).sort());
    assert.equal(filtered.width, plan.width);
    assert.equal(filtered.height, plan.height);
  }
  assert.equal(new Set(mappedIds).size, mappedIds.length);
  assert.equal(JSON.stringify({ data, amsterdamDrawings }), snapshot);
});

test("Amsterdam plan coordinates include the full architectural context", () => {
  const data = createInitialData();
  for (const level of hotelLevels("ams")) {
    const plan = buildFloorPlan(getScope(data, "ams", level.id), level, "ams");
    assert.ok(Number.isFinite(plan.width) && plan.width > 0);
    assert.ok(Number.isFinite(plan.height) && plan.height > 0);
    for (const point of svgVertices(plan.outline)) insideFrame(point, plan, `${level.id} outline`);
    for (const shape of plan.shapes) {
      const { x, y, width, height } = shape.bounds;
      assert.ok([x, y, width, height].every(Number.isFinite));
      assert.ok(width > 0 && height > 0, `${shape.spaceId}: non-empty bounds`);
      insideFrame([x, y], plan, shape.spaceId);
      insideFrame([x + width, y + height], plan, shape.spaceId);
      insideFrame([shape.x, shape.y], plan, `${shape.spaceId} label`);
      for (const point of svgVertices(shape.path)) insideFrame(point, plan, shape.spaceId);
    }
    for (const region of plan.context) {
      // Open exterior areas can have a label without an invented enclosing boundary.
      for (const point of region.path ? svgVertices(region.path) : []) insideFrame(point, plan, `${level.id} ${region.kind}`);
      assert.ok(region.path || region.label, "context must contain geometry or a label");
      if (region.x != null || region.y != null) insideFrame([region.x, region.y], plan, `${level.id} context label`);
    }
  }
});

test("courtyard and lift-core holes keep their source geometry after translation", () => {
  const data = createInitialData();
  let holesChecked = 0;
  for (const drawing of amsterdamDrawings) {
    const plan = buildFloorPlan(getScope(data, "ams", drawing.id), drawing.id, "ams");
    const records = drawing.spaces.map((record) => [record, plan.shapes.find((shape) => shape.spaceId === record.id)]);
    records.push(...(drawing.context || []).map((record, index) => [record, plan.context[index]]));
    for (const [record, shape] of records.filter(([record]) => record.holes?.length)) {
      const sourceRings = [record.points, ...record.holes];
      const rings = shape.path.split(/(?=M)/).filter(Boolean).map(svgVertices);
      assert.equal(rings.length, sourceRings.length);
      assert.equal((shape.path.match(/Z/g) || []).length, sourceRings.length);
      for (let ring = 0; ring < rings.length; ring++) {
        assert.equal(rings[ring].length, sourceRings[ring].length);
        for (let point = 0; point < rings[ring].length; point++) {
          for (let axis = 0; axis < 2; axis++) {
            const sourceOffset = sourceRings[ring][point][axis] - record.points[0][axis];
            const renderedOffset = rings[ring][point][axis] - rings[0][0][axis];
            assert.ok(Math.abs(sourceOffset - renderedOffset) < 0.02, "all rings share the same translation");
          }
        }
      }
      holesChecked += record.holes.length;
    }
  }
  assert.ok(holesChecked >= 9, "the supplied plans contain real holes to exercise");
});

test("map labels preserve guest room numbers and leading zeroes across real levels", () => {
  const data = createInitialData();
  const expected = { LG: ["001", "014"], G: ["101", "128"], M: ["201", "207"],
    1: ["301", "316"], 2: ["401", "425"], 3: ["501", "503"] };
  for (const [floor, labels] of Object.entries(expected)) {
    const spaces = getScope(data, "ams", floor);
    const plan = buildFloorPlan(spaces, floor, "ams");
    for (const label of labels) {
      assert.equal(spaces.find((space) => space.id === `ams-${label}`).name, `Room ${label}`);
      assert.equal(plan.shapes.find((shape) => shape.spaceId === `ams-${label}`).shortLabel, label);
    }
    for (const space of spaces.filter((space) => space.type === "Guest room"))
      assert.equal(plan.shapes.find((shape) => shape.spaceId === space.id).shortLabel, space.name.replace(/^Room\s+/, ""));
  }
});

test("source notes remain distinct from the generic description and sample inventory", () => {
  const data = createInitialData();
  assert.match(spaceById(data, "ams-306").sourceNote, /Not Enclosed/);
  assert.match(spaceById(data, "ams-417").sourceNote, /418 is absent/);
  assert.equal(spaceById(data, "ams-101").sourceNote, null);
  const plan = buildFloorPlan(getScope(data, "ams", "3"), "3", "ams");
  assert.match(plan.sourceNote, /unbounded storage annotation/);
  assert.match(plan.sourceNote, /Historic-wing roof surfaces/);
});


test("adding the first finish records one surface, preserves source metadata and appears in totals and history", () => {
  const data = createInitialData(), before = JSON.stringify(data);
  const spaceId = "ams-G-entrance";
  assert.equal(spaceById(data, spaceId).finishes.length, 0);
  const request = {
    action: "finish-add", spaceIds: [spaceId], surface: "  Main   walls  ",
    productId: "ivory", area: null, note: "  Recorded during inspection.  ",
    photoIds: ["finish-photo"],
  };
  const result = applyChange(data, request), room = spaceById(result, spaceId);
  assert.deepEqual(room.finishes, [
    { id: "finish-1", surface: "Main walls", productId: "ivory", area: null },
  ]);
  assert.deepEqual({ ...room, finishes: [] }, spaceById(data, spaceId));
  assert.deepEqual(result.spaces.filter((s) => s.id !== spaceId), data.spaces.filter((s) => s.id !== spaceId));
  assert.deepEqual(result.issues, data.issues);
  assert.equal(JSON.stringify(data), before);
  const entry = result.history[0];
  assert.equal(entry.type, "Finish added");
  assert.equal(entry.productId, "ivory");
  assert.equal(entry.previousProductId, null);
  assert.equal(entry.previousArea, null);
  assert.equal(entry.newProductId, "ivory");
  assert.equal(entry.finishId, room.finishes[0].id);
  assert.equal(entry.surface, "Main walls");
  assert.equal(entry.note, "Recorded during inspection.");
  assert.deepEqual(entry.photoIds, ["finish-photo"]);
  const second = applyChange(result, { ...request, surface: "Ceiling", area: 12.5 });
  const finishes = spaceById(second, spaceId).finishes;
  assert.equal(new Set(finishes.map((f) => f.id)).size, 2);
  const totals = aggregate(second, [spaceId]).find((r) => r.productId === "ivory");
  assert.equal(totals.applications, 2);
  assert.equal(totals.spaceIds.length, 1);
  assert.equal(totals.area, null);
  const edited = applyChange(second, {
    action: "finish", spaceIds: [spaceId], finishId: finishes[0].id,
    productId: "ivory", area: 20,
  });
  assert.equal(aggregate(edited, [spaceId]).find((r) => r.productId === "ivory").area, 32.5);
  assert.equal(edited.history[0].type, "Finish updated");
});

test("new finishes validate surface names, products, scope and area without changing existing records", () => {
  const data = createInitialData(), before = JSON.stringify(data);
  const request = {
    action: "finish-add", spaceIds: ["ams-101"], surface: "Ceiling",
    productId: "ivory", area: null,
  };
  for (const surface of ["", "   ", null, 42, "x".repeat(81)])
    assert.throws(() => applyChange(data, { ...request, surface }), /Name the surface/);
  for (const surface of ["Main walls", "  MAIN    WALLS  "])
    assert.throws(() => applyChange(data, { ...request, surface }), /already recorded/);
  for (const area of [-1, Infinity, NaN, "12", undefined])
    assert.throws(() => applyChange(data, { ...request, area }), /surface area/);
  assert.throws(() => applyChange(data, { ...request, productId: "lamp" }), /paint or finish/);
  assert.throws(() => applyChange(data, { ...request, spaceIds: ["ams-101", "ams-102"] }), /exactly one/);
  assert.throws(() => applyChange(data, { ...request, note: 42 }), /text note/);
  assert.equal(JSON.stringify(data), before);
  const zero = applyChange(data, { ...request, area: 0 });
  assert.equal(spaceById(zero, "ams-101").finishes.at(-1).area, 0);
});

test("traced space boundaries do not cross, overlap or use touching hole edges", () => {
  const cross = ([ax, ay], [bx, by], [cx, cy]) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const onEdge = (p, a, b) => Math.abs(cross(a, b, p)) < 1e-8 &&
    p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
  const edges = (ring) => ring.map((a, i) => [a, ring[(i + 1) % ring.length]]);
  const crosses = ([a, b], [c, d]) => cross(a, b, c) * cross(a, b, d) < 0 &&
    cross(c, d, a) * cross(c, d, b) < 0;
  const meets = (a, b) => crosses(a, b) || a.some((p) => onEdge(p, ...b)) || b.some((p) => onEdge(p, ...a));
  const boundary = (p, ring) => edges(ring).some(([a, b]) => onEdge(p, a, b));
  const insideRing = ([x, y], ring) => {
    let inside = false;
    for (const [[ax, ay], [bx, by]] of edges(ring))
      if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    return inside;
  };
  const rings = (space) => [space.points, ...(space.holes || [])];
  const inside = (p, space) => !rings(space).some((ring) => boundary(p, ring)) &&
    insideRing(p, space.points) && !(space.holes || []).some((ring) => insideRing(p, ring));
  for (const drawing of amsterdamDrawings) {
    for (const space of drawing.spaces) {
      for (const ring of rings(space)) {
        const segments = edges(ring);
        for (let i = 0; i < segments.length; i++) {
          assert.notDeepEqual(...segments[i], `${space.id} has a zero-length edge`);
          for (let j = i + 2; j < segments.length; j++) {
            if (i === 0 && j === segments.length - 1) continue;
            assert.ok(!meets(segments[i], segments[j]), `${space.id} has a self-intersecting boundary`);
          }
        }
      }
      for (const hole of space.holes || []) {
        assert.ok(insideRing(hole[0], space.points), `${space.id} has a hole outside its boundary`);
        assert.ok(!edges(hole).some((a) => edges(space.points).some((b) => meets(a, b))),
          `${space.id} has a touching hole; an edge cut-out must be part of its outer ring`);
      }
    }
    for (let i = 0; i < drawing.spaces.length; i++) {
      const a = drawing.spaces[i];
      for (const b of drawing.spaces.slice(i + 1)) {
        const aEdges = rings(a).flatMap(edges), bEdges = rings(b).flatMap(edges);
        assert.ok(!aEdges.some((ea) => bEdges.some((eb) => crosses(ea, eb))) &&
          !a.points.some((p) => inside(p, b)) && !b.points.some((p) => inside(p, a)),
        `${a.id} and ${b.id} overlap`);
      }
    }
  }
});
