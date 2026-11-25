// Shared inventory rules. React components call these functions; no browser state lives here.
import { products, DEMO_DATE } from "./fixtures.js";

// Keep one public model import for screens, while separating sample data from rules.
export {
  hotels,
  hotelLevels,
  suppliers,
  products,
  createInitialData,
} from "./fixtures.js";

export const productById = (id) => products.find((p) => p.id === id);
export const spaceById = (data, id) => data.spaces.find((s) => s.id === id);
const date = DEMO_DATE;
const copy = (value) => structuredClone(value);
// An ordered replacement is still outstanding until the issue is resolved.
export const isActiveIssue = (issue) => issue.status !== "Resolved";
export const countObjects = (space) =>
  Object.values(space.items).reduce((total, quantity) => total + quantity, 0);
const unique = (values) => [...new Set(values)];
const fail = (message) => {
  throw new Error(message);
};
const integer = (value) => Number.isInteger(value) && value > 0;
const nextId = (rows, prefix) => `${prefix}-${rows.length + 1}`;
const pendingQty = (data, spaceId, productId, exceptId) =>
  data.issues
    .filter(
      (i) =>
        isActiveIssue(i) &&
        i.spaceId === spaceId &&
        i.productId === productId &&
        i.id !== exceptId,
    )
    .reduce((n, i) => n + (i.qty || 0), 0);
const used = (space, product) =>
  product.kind === "finish"
    ? space.finishes.some((f) => f.productId === product.id)
    : (space.items[product.id] || 0) > 0;

// Intersect hotel, floor and selected-room filters; never broaden a selected scope.
export function getScope(data, hotelId, floor = "all", selectedIds = []) {
  const ids = new Set(selectedIds);
  return data.spaces.filter(
    (s) =>
      (hotelId === "all" || s.hotelId === hotelId) &&
      (floor === "all" || s.floor === floor) &&
      (!ids.size || ids.has(s.id)),
  );
}

// Objects use unit counts. Finishes use surface applications and recorded area;
// a missing measurement stays unknown instead of being presented as zero.
export function aggregate(data, spaceIds) {
  const ids = new Set(spaceIds),
    scope = data.spaces.filter((s) => ids.has(s.id)),
    rows = [];
  for (const product of products) {
    const locations = scope.filter((s) => used(s, product));
    if (!locations.length) continue;
    const applications = locations.flatMap((s) =>
      s.finishes.filter((f) => f.productId === product.id),
    );
    rows.push({
      productId: product.id,
      kind: product.kind,
      quantity:
        product.kind === "object"
          ? locations.reduce((n, s) => n + (s.items[product.id] || 0), 0)
          : null,
      spaceIds: locations.map((s) => s.id),
      applications: applications.length,
      area:
        product.kind === "finish" &&
        applications.every((f) => Number.isFinite(f.area))
          ? applications.reduce((n, f) => n + f.area, 0)
          : null,
      issueCount: data.issues.filter(
        (i) =>
          isActiveIssue(i) && ids.has(i.spaceId) && i.productId === product.id,
      ).length,
    });
  }
  return rows;
}

// Validate every affected space before changing a cloned snapshot. Callers can
// display validation errors without leaving a batch update partially applied.
export function applyChange(data, request) {
  const {
    action,
    productId,
    reason = "",
    note = "",
    replacementId,
    photoIds: providedPhotos = [],
  } = request;
  const supported = [
    "report",
    "replace",
    "add",
    "remove",
    "ordered",
    "resolve",
    "finish",
    "finish-add",
  ];
  if (!supported.includes(action)) fail("Choose a supported action.");
  if (
    !Array.isArray(providedPhotos) ||
    providedPhotos.length > 3 ||
    Array.from(providedPhotos).some(
      (id) => typeof id !== "string" || !id.trim(),
    )
  )
    fail("Choose up to three valid photo references.");
  const photoIds = unique(providedPhotos);
  const linked = request.issueId
    ? data.issues.find((i) => i.id === request.issueId)
    : null;
  if (["ordered", "resolve"].includes(action)) {
    if (!linked) fail("Choose an existing issue.");
    if (linked.status === "Resolved") fail("This issue is already resolved.");
    if (action === "ordered" && linked.status === "Ordered") return copy(data);
  }
  const product = productById(linked ? linked.productId : productId);
  if (!product) fail("Choose a catalogue item.");
  const ids = linked ? [linked.spaceId] : unique(request.spaceIds || []);
  if (!ids.length) fail("Choose at least one space.");
  const targets = ids.map((id) => spaceById(data, id));
  if (targets.some((s) => !s)) fail("A selected space no longer exists.");
  if (action === "finish" || action === "finish-add") {
    const adding = action === "finish-add";
    if (!Array.isArray(request.spaceIds) || request.spaceIds.length !== 1)
      fail("Choose exactly one space for a finish record.");
    if (product.kind !== "finish")
      fail("Choose a paint or finish specification.");
    const s = targets[0],
      applied = adding ? null : s.finishes.find((f) => f.id === request.finishId),
      area = request.area,
      surface = typeof request.surface === "string"
        ? request.surface.trim().replace(/\s+/g, " ") : "";
    if (!adding && !applied) fail("Choose an existing applied finish.");
    if (adding) {
      if (!surface || surface.length > 80)
        fail("Name the surface using 1 to 80 characters.");
      // Distinct surfaces can share paint; a duplicate surface would double-count it.
      if (s.finishes.some((f) => f.surface.trim().replace(/\s+/g, " ").toLowerCase() === surface.toLowerCase()))
        fail("This surface is already recorded. Edit its existing finish instead.");
    }
    if (
      area !== null &&
      !(typeof area === "number" && Number.isFinite(area) && area >= 0)
    )
      fail("Enter a surface area of zero or more, or leave it unrecorded.");
    if (typeof note !== "string") fail("Enter a text note.");
    // An issue refers to a room and product, so do not orphan it by changing
    // the last surface using that product while its issue is still open.
    const retainsOld = s.finishes.some(
      (f) => applied && f.id !== applied.id && f.productId === applied.productId,
    );
    if (
      !adding && applied.productId !== product.id &&
      !retainsOld &&
      data.issues.some(
        (i) =>
          isActiveIssue(i) &&
          i.spaceId === s.id &&
          i.productId === applied.productId,
      )
    )
      fail(
        `Resolve the existing issue for this finish in ${s.name} before changing its specification.`,
      );
    const result = copy(data),
      finishes = spaceById(result, s.id).finishes,
      finishId = adding ? nextId(finishes, "finish") : applied.id;
    if (adding) finishes.push({ id: finishId, surface, productId: product.id, area });
    else {
      const updated = finishes.find((f) => f.id === finishId);
      updated.productId = product.id;
      updated.area = area;
    }
    result.history.unshift({
      id: nextId(result.history, "change"),
      spaceId: s.id,
      productId: applied?.productId || product.id,
      previousProductId: applied?.productId || null,
      newProductId: product.id,
      replacementId: product.id,
      finishId,
      surface: applied?.surface || surface,
      previousArea: applied?.area ?? null,
      area,
      qty: null,
      type: adding ? "Finish added" : "Finish updated",
      reason: reason || (adding ? "Inventory update" : "Finish specification update"),
      note: note.trim(),
      photoIds: [...photoIds],
      date,
      actor: "Demo user",
    });
    return result;
  }
  const qty =
    product.kind === "finish" ? null : linked ? linked.qty : request.qty;
  if (product.kind === "object" && !integer(qty))
    fail("Enter a whole quantity of at least one.");
  if (
    ["replace", "add", "remove"].includes(action) &&
    product.kind !== "object"
  )
    fail("Use the finish record to update an applied finish.");
  if (action !== "add" && targets.some((s) => !used(s, product)))
    fail("This item is not recorded in every selected space.");
  if (action === "report" && !note.trim()) fail("Describe the issue.");
  if (action === "report")
    for (const s of targets) {
      if (
        product.kind === "object" &&
        qty + pendingQty(data, s.id, product.id) > (s.items[product.id] || 0)
      )
        fail(
          `The affected quantity in ${s.name} exceeds the unreported items.`,
        );
      if (
        product.kind === "finish" &&
        data.issues.some(
          (i) =>
            isActiveIssue(i) &&
            i.spaceId === s.id &&
            i.productId === product.id,
        )
      )
        fail(`There is already an open issue for this finish in ${s.name}.`);
    }
  const outcome = action === "resolve" ? request.outcome : null;
  if (
    action === "resolve" &&
    !["Repaired", "Replaced", "Repainted", "Removed"].includes(outcome)
  )
    fail("Choose how the issue was resolved.");
  if (
    action === "resolve" &&
    ((product.kind === "finish" && outcome !== "Repainted") ||
      (product.kind === "object" && outcome === "Repainted"))
  )
    fail("Choose an outcome appropriate to this item.");
  const replacement = productById(replacementId || product.id);
  const replacing = action === "replace" || outcome === "Replaced";
  if (replacing && (!replacement || replacement.kind !== "object"))
    fail("Choose an object as the replacement.");
  // A like-for-like replacement changes history, not the installed unit total.
  const reduces =
    action === "remove" ||
    outcome === "Removed" ||
    (replacing && replacement.id !== product.id);
  if (
    action === "replace" ||
    action === "remove" ||
    (action === "resolve" && product.kind === "object")
  )
    for (const s of targets) {
      if (qty > (s.items[product.id] || 0))
        fail(`There are fewer recorded items than the quantity in ${s.name}.`);
      if (
        (s.items[product.id] || 0) - qty <
        pendingQty(data, s.id, product.id, linked?.id)
      )
        fail(
          `Resolve the reported items in ${s.name} through their existing issues first.`,
        );
    }
  // All validation has passed. Reporting damage records evidence but does not
  // remove installed objects; quantities change only through an inventory action.
  const result = copy(data);
  const log = (s, type, extra = {}) =>
    result.history.unshift({
      id: nextId(result.history, "change"),
      spaceId: s.id,
      productId: product.id,
      qty,
      type,
      reason: linked?.reason || reason || "Inventory update",
      note: note.trim() || linked?.note || "",
      photoIds: [...photoIds],
      date,
      actor: "Demo user",
      ...extra,
    });
  for (const original of targets) {
    const s = spaceById(result, original.id);
    if (action === "report") {
      result.issues.push({
        id: nextId(result.issues, "issue"),
        spaceId: s.id,
        productId: product.id,
        qty,
        reason: reason || "Damaged",
        note: note.trim(),
        photoIds: [...photoIds],
        status: "Open",
        date,
      });
      log(s, "Issue reported");
    } else if (action === "ordered") {
      result.issues.find((i) => i.id === linked.id).status = "Ordered";
      log(s, "Ordered");
    } else {
      if (action === "add")
        s.items[product.id] = (s.items[product.id] || 0) + qty;
      if (reduces) s.items[product.id] -= qty;
      if (replacing && replacement.id !== product.id)
        s.items[replacement.id] = (s.items[replacement.id] || 0) + qty;
      if (action === "resolve") {
        const issue = result.issues.find((i) => i.id === linked.id);
        issue.status = "Resolved";
        issue.outcome = outcome;
        issue.resolvedDate = date;
      }
      log(
        s,
        outcome ||
          { replace: "Replaced", add: "Added", remove: "Removed" }[action],
        replacing ? { replacementId: replacement.id } : {},
      );
    }
  }
  return result;
}
