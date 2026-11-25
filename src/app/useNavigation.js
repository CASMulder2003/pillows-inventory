import { useLayoutEffect, useRef, useState } from "react";

const historyKey = "pillowsCatalogue";
const overview = () => ({ route: { page: "overview" }, trail: [] });

// Browser and in-app Back share the same entries. Keeping the URL unchanged also
// makes these views safe on GitHub Pages, which has no server-side route fallback.
export function useNavigation(hotelId, { snapshot, restoreSnapshot, canRestoreSnapshot }) {
  const [location, setLocation] = useState(overview);
  const [notice, setNotice] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [scrollRequest, setScrollRequest] = useState(null);
  const current = useRef(location), context = useRef(null);
  const session = useRef(crypto.randomUUID()), returnNotice = useRef("");
  current.current = location;
  context.current = { snapshot, restoreSnapshot, canRestoreSnapshot };
  const { route, trail } = location;

  function write(next, { replace = false, view = context.current.snapshot, index } = {}) {
    const previous = window.history.state?.[historyKey];
    const entry = {
      ...next, snapshot: view, session: session.current,
      index: index ?? (previous?.session === session.current
        ? previous.index + (replace ? 0 : 1) : 0),
    };
    window.history[replace ? "replaceState" : "pushState"](
      { ...window.history.state, [historyKey]: entry }, "",
    );
  }
  function display(next, message = "") {
    current.current = next;
    setLocation(next);
    setScrollRequest({ top: next.route.scrollY || 0 });
    setNotice(message);
    setGlobalQuery("");
  }

  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    write(current.current, { replace: true, index: 0 });
    function restore(e) {
      const entry = e.state?.[historyKey];
      if (entry?.session === session.current && context.current.canRestoreSnapshot(entry.snapshot)) {
        context.current.restoreSnapshot(entry.snapshot);
        display({ route: entry.route, trail: entry.trail }, returnNotice.current);
      } else {
        // A reload, sign-out or account-scope change starts a new navigation session.
        // Old entries must not reopen records from a previously accessible hotel.
        const next = overview();
        write(next, { replace: true, index: 0 });
        display(next);
      }
      returnNotice.current = "";
    }
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  // Filters, selection and detail tabs update their current entry, rather than
  // creating an extra Back step for each keystroke or checkbox.
  useLayoutEffect(() => {
    write(location, { replace: true });
  }, [location, snapshot]);
  useLayoutEffect(() => {
    if (!scrollRequest) return;
    window.scrollTo({ top: scrollRequest.top, behavior: "instant" });
    document.querySelector(".pw-main h1")?.focus({ preventScroll: true });
  }, [scrollRequest]);

  function navigate(next, nextTrail, view = context.current.snapshot) {
    write({ ...current.current, route: { ...current.current.route, scrollY: window.scrollY } }, { replace: true });
    const destination = { route: next, trail: nextTrail };
    write(destination, { view });
    display(destination);
  }
  function nav(page) {
    const destination = page === "spaces" && hotelId === "all" ? "catalogue" : page;
    if (route.page === destination && !trail.length) return;
    navigate({ page: destination }, []);
  }
  function visit(next) {
    navigate(next, [...trail, { ...route, scrollY: window.scrollY }]);
  }
  function setRoute(update) {
    const next = { ...current.current, route: typeof update === "function" ? update(current.current.route) : update };
    current.current = next;
    setLocation(next);
  }
  function back(options = {}) {
    returnNotice.current = typeof options.notice === "string" ? options.notice : "";
    const entry = window.history.state?.[historyKey];
    if (entry?.session === session.current && entry.index > 0) window.history.back();
    else {
      const next = overview();
      write(next, { replace: true, index: 0 });
      display(next, returnNotice.current);
      returnNotice.current = "";
    }
  }
  function resetNavigation(view = context.current.snapshot, { invalidate = false } = {}) {
    if (invalidate) {
      session.current = crypto.randomUUID();
      const next = overview();
      write(next, { replace: true, view, index: 0 });
      display(next);
    } else navigate({ page: "overview" }, [], view);
  }
  const section = (page) => ({
    space: "spaces", finish: "spaces", product: "catalogue",
    supplier: "catalogue", suppliers: "catalogue",
  })[page] || page;
  const activePage = section(route.page === "form" ? trail.at(-1)?.page : route.page);
  const active = hotelId === "all" && activePage === "spaces" ? "catalogue" : activePage;
  return { route, setRoute, trail, notice, setNotice, globalQuery, setGlobalQuery,
    nav, visit, back, resetNavigation, active };
}
