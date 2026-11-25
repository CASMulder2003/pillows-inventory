import { createContext, useContext, useState } from "react";
import {
  hotels,
  createInitialData,
  getScope,
  aggregate,
  applyChange,
  spaceById,
  isActiveIssue,
} from "../data/inventory.js";
import { initialFilters, levelName } from "./selectors.js";
import { useNavigation } from "./useNavigation.js";
import { usePreferences } from "./usePreferences.js";

const WorkspaceContext = createContext(null);
const messages = {
  "finish-add": "Surface added. Paint and finish totals are updated.",
  finish: "Room finish updated. The previous specification is in history.",
  report: "Issue recorded. Installed quantities are unchanged.",
  ordered: "Issue marked as ordered.",
  resolve: "Issue resolved. Quantities and history are updated.",
};
function initialData() {
  const data = createInitialData();
  data.issues.find((issue) => issue.id === "initial-lamp-0").photoIds = [
    "sample-damage",
  ];
  return data;
}
function hotelsForAccess(access) {
  // Demonstration only. Django must enforce the actual account permissions later.
  return hotels.filter(
    (hotel) =>
      access === "Central oversight" ||
      (access === "Assigned hotels"
        ? ["ams", "ghent"].includes(hotel.id)
        : hotel.id === "ams"),
  );
}

// Shared state lives here because it survives moving between rooms, totals and forms.
// Draft fields belong to their forms; camera gestures belong to useMapCamera.
export function WorkspaceProvider({ children }) {
  const [data, setData] = useState(initialData);
  const [hotelId, setHotel] = useState("ams");
  const [access, setAccess] = useState("Central oversight");
  const [signedOut, setSignedOut] = useState(false);
  const [filters, setFilters] = useState(() => structuredClone(initialFilters));
  const [selected, setSelected] = useState([]);
  const [scopeIds, setScopeIds] = useState([]);
  const [view, setView] = useState("plan");
  const [sort, setSort] = useState({ key: "name", dir: 1 });
  const [selectMode, setSelectMode] = useState(false);
  const [floor, setFloor] = useState("G");
  const [planQuery, setPlanQuery] = useState("");
  const [planFocus, setPlanFocus] = useState(null);
  const [planPage, setPlanPage] = useState(0);
  const preferences = usePreferences();
  const navigation = useNavigation(hotelId);
  const { route, visit, back, resetNavigation, setNotice } = navigation;
  const allowedHotels = hotelsForAccess(access);
  const allowedHotelIds = allowedHotels.map((hotel) => hotel.id);
  const accessibleData = {
    ...data,
    spaces: data.spaces.filter((space) =>
      allowedHotelIds.includes(space.hotelId),
    ),
  };
  const hotelSpaces = getScope(accessibleData, hotelId);
  const hotelSpaceIds = hotelSpaces.map((space) => space.id);
  const hotel = allowedHotels.find((item) => item.id === hotelId);
  const totals = aggregate(data, hotelSpaceIds);
  const openIssues = data.issues.filter(
    (issue) => isActiveIssue(issue) && hotelSpaceIds.includes(issue.spaceId),
  );
  const scoped = getScope(
    accessibleData,
    hotelId,
    filters.catalogue.floor,
    scopeIds,
  );
  const scopedIds = scoped.map((space) => space.id);
  const wholeScope =
    hotelId === "all" ? "All accessible hotels" : "Entire hotel";
  const catalogueScope =
    filters.catalogue.floor === "all"
      ? wholeScope
      : levelName(hotelId, filters.catalogue.floor);
  const filter = filters[route.page] || {};
  const setFilter = (key, value) =>
    setFilters((previous) => ({
      ...previous,
      [route.page]: { ...previous[route.page], [key]: value },
    }));

  function resetHotel(id) {
    setHotel(id);
    setFloor(id === "ams" ? "G" : "1");
    setPlanPage(0);
    setSelectMode(false);
    setPlanQuery("");
    setPlanFocus(null);
    setSelected([]);
    setScopeIds([]);
    setFilters(structuredClone(initialFilters));
    resetNavigation(id);
  }
  function switchHotel(id) {
    if (
      allowedHotelIds.includes(id) ||
      (id === "all" && allowedHotels.length > 1)
    )
      resetHotel(id);
  }
  function changeAccess(nextAccess) {
    const available = hotelsForAccess(nextAccess);
    setAccess(nextAccess);
    resetHotel(
      available.some((item) => item.id === hotelId) ? hotelId : available[0].id,
    );
  }
  const openSpace = (id) => visit({ page: "space", id, tab: "contents" });
  function openProduct(id, { allSpaces = false } = {}) {
    const fromCatalogue = route.page === "catalogue" && !allSpaces;
    visit({
      page: "product",
      id,
      tab: "details",
      all: false,
      scope: fromCatalogue ? scopedIds : hotelSpaceIds,
      scoped:
        fromCatalogue &&
        (scopeIds.length > 0 || filters.catalogue.floor !== "all"),
    });
  }
  const openForm = (action, { productId, spaceIds, issueId } = {}) =>
    visit({ page: "form", action, productId, spaceIds, issueId });
  function commit(request) {
    // applyChange returns a new snapshot only after the entire request passes validation.
    setData(applyChange(data, request));
    back();
    setNotice(
      messages[request.action] ||
        "Change saved. Quantities and history are updated.",
    );
  }
  const toggle = (id) =>
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  function selectedTotals() {
    setScopeIds([...selected]);
    setFilters((previous) => ({
      ...previous,
      catalogue: { ...initialFilters.catalogue },
    }));
    visit({ page: "catalogue" });
  }
  function labelSpace(value) {
    const space = typeof value === "string" ? spaceById(data, value) : value;
    return (
      space.name +
      (hotelId === "all"
        ? " · " + hotels.find((item) => item.id === space.hotelId).name
        : "")
    );
  }
  function logout() {
    setSignedOut(true);
    resetNavigation(hotelId);
  }
  const value = {
    ...navigation,
    ...preferences,
    data,
    hotelId,
    hotel,
    access,
    changeAccess,
    signedOut,
    setSignedOut,
    logout,
    filters,
    setFilters,
    filter,
    setFilter,
    selected,
    setSelected,
    scopeIds,
    setScopeIds,
    view,
    setView,
    sort,
    setSort,
    selectMode,
    setSelectMode,
    floor,
    setFloor,
    planQuery,
    setPlanQuery,
    planFocus,
    setPlanFocus,
    planPage,
    setPlanPage,
    allowedHotels,
    accessibleData,
    hotelSpaces,
    hotelSpaceIds,
    totals,
    openIssues,
    scoped,
    scopedIds,
    wholeScope,
    catalogueScope,
    switchHotel,
    openSpace,
    openProduct,
    openForm,
    commit,
    toggle,
    selectedTotals,
    labelSpace,
  };
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value)
    throw new Error("useWorkspace must be called inside WorkspaceProvider.");
  return value;
}
