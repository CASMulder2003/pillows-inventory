import { useLayoutEffect, useState } from "react";

// Local navigation keeps the return path and product scope without a router dependency.
export function useNavigation(hotelId) {
  const [route, setRoute] = useState({ page: "overview" });
  const [trail, setTrail] = useState([]);
  const [notice, setNotice] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [scrollRequest, setScrollRequest] = useState(null);
  useLayoutEffect(() => {
    if (!scrollRequest) return;
    window.scrollTo({ top: scrollRequest.top, behavior: "instant" });
    document.querySelector(".pw-main h1")?.focus({ preventScroll: true });
  }, [scrollRequest]);
  // Tab/filter changes use setRoute directly; only navigation moves the page.
  function navigate(next) {
    setRoute(next);
    setScrollRequest({ top: next.scrollY || 0 });
  }
  function clearTransient() {
    setNotice("");
    setGlobalQuery("");
  }
  function nav(page) {
    navigate({
      page: page === "spaces" && hotelId === "all" ? "catalogue" : page,
    });
    setTrail([]);
    clearTransient();
  }
  function visit(next) {
    setTrail((previous) => [...previous, { ...route, scrollY: window.scrollY }]);
    navigate(next);
    clearTransient();
  }
  function back() {
    navigate(
      trail.at(-1) || { page: "overview" },
    );
    setTrail((previous) => previous.slice(0, -1));
    clearTransient();
  }
  function resetNavigation() {
    navigate({ page: "overview" });
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
