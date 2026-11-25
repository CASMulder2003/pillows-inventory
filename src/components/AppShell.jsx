import { productMatches } from "../app/selectors.js";
import { HotelSelector } from "./HotelSelector.jsx";
import { AccountMenu } from "../components/Account.jsx";
import { products } from "../data/inventory.js";
import { Button, Icon } from "../components/ui.jsx";
import { levelName, names } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// The shared shell owns hotel switching, global search and navigation for every screen.
export function AppShell({ children }) {
  const {
    accent,
    active,
    allowedHotels,
    back,
    density,
    globalQuery,
    hotel,
    hotelId,
    hotelSpaces,
    labelSpace,
    logout,
    nav,
    notice,
    openIssues,
    openProduct,
    openSpace,
    route,
    setGlobalQuery,
    setNotice,
    switchHotel,
    totals,
    trail,
    visit,
  } = useWorkspace();
  const q = globalQuery.trim().toLowerCase(),
    searchSpaces = q
      ? hotelSpaces.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 4)
      : [],
    searchProducts = q
      ? products
          .filter(
            (p) =>
              totals.some((row) => row.productId === p.id) &&
              productMatches(p, q),
          )
          .slice(0, 4)
      : [];
  return (
    <div
      className={`pw-shell ${density === "Compact" ? "pw-compact" : ""} ${accent === "Gold" ? "pw-gold-actions" : ""}`}
    >
      <header className="pw-header">
        <div className="pw-brand">
          PILLOWS<small>PROPERTY CATALOGUE</small>
        </div>
        <div className="pw-hotel">
          {allowedHotels.length > 1 ? (
            <HotelSelector hotels={allowedHotels} value={hotelId} onChange={switchHotel} />
          ) : (
            <>
              <strong>{hotel?.property}</strong>
              <small>{hotel?.name} · Hotel team</small>
            </>
          )}
        </div>
        <div className="pw-inline-search" onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setGlobalQuery("");
        }}>
          <Icon name="search" />
          <input
            type="search"
            aria-label="Search hotel"
            aria-expanded={Boolean(q)}
            aria-controls={q ? "pw-search-results" : undefined}
            placeholder="Search rooms, items, paint…"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setGlobalQuery("");
              if (e.key === "Enter") {
                if (searchSpaces[0]) openSpace(searchSpaces[0].id);
                else if (searchProducts[0]) openProduct(searchProducts[0].id, { allSpaces: true });
              }
            }}
          />
          {q && (
            <div id="pw-search-results" className="pw-search-results" aria-label="Search results">
              {searchSpaces.map((s) => (
                <Button key={s.id} onClick={() => openSpace(s.id)}>
                  {labelSpace(s)}
                  <small>
                    {levelName(s.hotelId, s.floor)} · {s.type}
                  </small>
                </Button>
              ))}
              {searchProducts.map((p) => (
                <Button key={p.id} onClick={() => openProduct(p.id, { allSpaces: true })}>
                  {p.name}
                  <small>
                    {p.code} · {p.category}
                  </small>
                </Button>
              ))}
              {!searchSpaces.length && !searchProducts.length && (
                <small>No matching records.</small>
              )}
              <Button quiet onClick={() => setGlobalQuery("")}>
                Close search
              </Button>
            </div>
          )}
        </div>
        <AccountMenu
          onAccount={() => {
            if (route.page !== "account")
              visit({
                page: "account",
              });
          }}
          onSettings={() => {
            if (route.page !== "settings")
              visit({
                page: "settings",
              });
          }}
          onLogout={logout}
        />
      </header>
      <nav className="pw-nav" aria-label="Hotel navigation">
        {(hotelId === "all"
          ? ["overview", "catalogue", "issues", "history"]
          : ["overview", "spaces", "catalogue", "issues", "history"]
        ).map((page) => (
          <Button
            key={page}
            className={page === "issues" && openIssues.length ? "has-issues" : ""}
            aria-current={active === page ? "page" : undefined}
            onClick={() => nav(page)}
          >
            <Icon name={page} /><span>{names[page]}</span>
            {page === "issues" && openIssues.length > 0 && (
              <span className="pw-count">{openIssues.length}</span>
            )}
          </Button>
        ))}
      </nav>
      <main className="pw-main">
        {trail.length > 0 && (
          <div className="pw-crumb">
            <Button link onClick={back}>
              Back to{" "}
              {names[trail.at(-1)?.page] ||
                (trail.at(-1)?.page === "space"
                  ? "space"
                  : trail.at(-1)?.page === "product"
                    ? "item"
                    : "previous view")}
            </Button>
            <span>/</span>
            <span>{hotel?.name || "All accessible hotels"}</span>
          </div>
        )}
        {notice && (
          <div className="pw-notice" role="status">
            <span>{notice}</span>
            <Button onClick={() => setNotice("")}>Dismiss</Button>
          </div>
        )}
        {children}
      </main>
      <footer className="pw-footer">
        <span>Pillows · Property catalogue</span>
        <details className="pw-preview-details">
          <summary>About this preview</summary>
          <p>Amsterdam uses the supplied floor plans. Other hotel maps and all inventory are illustrative. Changes and photos stay in this session.</p>
        </details>
      </footer>
    </div>
  );
}
