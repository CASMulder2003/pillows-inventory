import { productMatches } from "../app/selectors.js";
import { AccountMenu } from "../components/Account.jsx";
import { products, suppliers } from "../data/inventory.js";
import { Button, Select } from "../components/ui.jsx";
import { levelName, names } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// The shared shell owns hotel switching, global search and navigation for every screen.
export function AppShell({ children }) {
  const {
    accent,
    access,
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
      className={`${density === "Compact" ? "pw-compact" : ""} ${accent === "Gold" ? "pw-gold-actions" : ""}`}
    >
      <header className="pw-header">
        <div className="pw-brand">
          PILLOWS<small>PROPERTY CATALOGUE</small>
        </div>
        <div className="pw-hotel">
          {allowedHotels.length > 1 ? (
            <Select
              label="Hotel portal"
              value={hotelId}
              onChange={switchHotel}
              options={[
                ...allowedHotels.map((h) => [h.id, h.name]),
                ["all", "All accessible hotels"],
              ]}
            />
          ) : (
            <>
              <strong>{hotel?.property}</strong>
              <small>{hotel?.name} · Hotel team</small>
            </>
          )}
        </div>
        <div className="pw-inline-search">
          <input
            type="search"
            aria-label="Search hotel"
            placeholder="Search rooms, items, paint…"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setGlobalQuery("");
            }}
          />
          {q && (
            <div className="pw-search-results" aria-label="Search results">
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
            aria-current={active === page ? "page" : undefined}
            onClick={() => nav(page)}
          >
            {names[page]}
            {page === "issues" && openIssues.length > 0 && (
              <span className="pw-count">{openIssues.length}</span>
            )}
          </Button>
        ))}
      </nav>
      <main className="pw-main">
        <aside className="pw-source-note" aria-label="Prototype data status">
          <strong>{hotelId === "ams" ? "Amsterdam · Plan review" : "Catalogue preview"}</strong>
          <span>{hotelId === "ams"
            ? "Spaces follow the supplied drawings. Inventory, finishes and issue records are examples pending the hotel’s material list."
            : hotelId === "all"
              ? "Amsterdam spaces follow supplied drawings. Other hotel layouts and all inventory are illustrative."
              : "This hotel’s layout and inventory are illustrative. Amsterdam is the first property being mapped from drawings."}</span>
        </aside>
        {trail.length > 0 && (
          <div className="pw-crumb">
            <Button link onClick={back}>
              ← Back to{" "}
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
        <span className="pw-preview-label">
          {hotelId === "ams" ? "Drawing-based spaces · Sample inventory" : hotelId === "all" ? "Mixed layout sources · Sample inventory" : "Illustrative layouts · Sample inventory"}
        </span>
        <span>
          {hotelId === "ams" ? `${hotelSpaces.filter((space) => space.type === "Guest room").length} rooms on supplied plans · ` : hotelId === "ghent" ? "80 guest-room test · " : ""}
          English · {access}
        </span>
        <span>Preview only · Changes and photos stay in this session</span>
      </footer>
    </div>
  );
}
