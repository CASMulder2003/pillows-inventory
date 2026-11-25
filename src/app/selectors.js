import { hotelLevels, suppliers } from "../data/inventory.js";

export const initialFilters = {
  spaces: { query: "", floor: "all", type: "all" },
  catalogue: { query: "", floor: "all", kind: "all", category: "all" },
  issues: { query: "", status: "active" },
  history: { query: "", reason: "all", mode: "changes" },
};
export const names = {
  overview: "Overview",
  spaces: "Spaces",
  catalogue: "Catalogue",
  issues: "Issues",
  suppliers: "Suppliers",
  history: "History",
  account: "Account",
  settings: "Settings",
};

export function levelName(hotelId, floor) {
  const levels = hotelLevels(hotelId);
  const level = levels.find((item) => item.id === floor);
  if (!level) return floor;
  const hasMultipleBuildings = levels.some(
    (item) => item.buildingId !== level.buildingId,
  );
  return `${hasMultipleBuildings ? level.buildingLabel + " · " : ""}${level.label}`;
}
export const dateLabel = (date) =>
  new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

// Search uses the same product fields in the header and catalogue.
export function productMatches(product, query) {
  const supplier = suppliers.find((item) => item.id === product.supplierId);
  return `${product.name} ${product.code} ${product.colour || ""} ${supplier?.name || ""}`
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}
