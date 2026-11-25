import { useState } from "react";

// Local navigation keeps the return path and product scope without a router dependency.
export function useNavigation(hotelId) {
  const [route, setRoute] = useState({ page: "overview" });
  const [trail, setTrail] = useState([]);
  const [notice, setNotice] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  function clearTransient() {
    setNotice("");
    setGlobalQuery("");
  }
  function nav(page) {
    setRoute({
      page: page === "spaces" && hotelId === "all" ? "catalogue" : page,
    });
    setTrail([]);
    clearTransient();
  }
  function visit(next) {
    setTrail((previous) => [...previous, route]);
    setRoute(next);
    clearTransient();
  }
  function back() {
    setRoute(
      trail.at(-1) || { page: hotelId === "all" ? "catalogue" : "overview" },
    );
    setTrail((previous) => previous.slice(0, -1));
    clearTransient();
  }
  function resetNavigation(nextHotelId) {
    setRoute({ page: nextHotelId === "all" ? "catalogue" : "overview" });
    setTrail([]);
    clearTransient();
  }
  const section = (page) =>
    ({
      space: "spaces",
      finish: "spaces",
      product: "catalogue",
      supplier: "catalogue",
      suppliers: "catalogue",
    })[page] || page;
  const activePage = section(
    route.page === "form" ? trail.at(-1)?.page : route.page,
  );
  const active =
    hotelId === "all" && activePage === "spaces" ? "catalogue" : activePage;
  return {
    route,
    setRoute,
    trail,
    notice,
    setNotice,
    globalQuery,
    setGlobalQuery,
    nav,
    visit,
    back,
    resetNavigation,
    active,
  };
}
