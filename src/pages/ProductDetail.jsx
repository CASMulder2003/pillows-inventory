import {
  hotels,
  suppliers,
  productById,
  spaceById,
  aggregate,
} from "../data/inventory.js";
import { Button, Table, Empty, Heading } from "../components/ui.jsx";
import { HistoryTable, InventoryActions } from "../components/records.jsx";
import { ProductPhotos } from "../media/Media.jsx";
import { levelName } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// Product specifications are shared; quantities are calculated for the current scope.
export function ProductDetail() {
  const {
    allowedHotels,
    data,
    hotelId,
    hotelSpaceIds,
    labelSpace,
    openForm,
    openSpace,
    route,
    setRoute,
    trail,
    visit,
    wholeScope,
  } = useWorkspace();
  const p = productById(route.id),
    supplier = suppliers.find((s) => s.id === p.supplierId),
    ids = (route.all ? hotelSpaceIds : route.scope || hotelSpaceIds).filter(
      (id) => hotelSpaceIds.includes(id),
    ),
    row = aggregate(data, ids).find((r) => r.productId === p.id),
    locs = data.spaces.filter((s) => row?.spaceIds.includes(s.id)),
    displayLocs = route.locationHotel
      ? locs.filter((s) => s.hotelId === route.locationHotel)
      : locs,
    fromRoom =
      trail.at(-1)?.page === "space" ? spaceById(data, trail.at(-1).id) : null;
  return (
    <>
      {
        <Heading
          title={p.name}
          subtitle={`${p.code} · ${p.category}${fromRoom ? ` · From ${fromRoom.name}${p.kind === "object" ? ` (${fromRoom.items[p.id] || 0} installed)` : ""}` : ""}`}
          actions={
            <Button
              onClick={() =>
                visit({
                  page: "supplier",
                  id: p.supplierId,
                })
              }
            >
              Supplier details
            </Button>
          }
        />
      }
      {route.scoped && (
        <div className="pw-batch">
          <strong>
            {route.all ? wholeScope : "Catalogue scope"} · {locs.length}{" "}
            locations
          </strong>
          <Button
            onClick={() =>
              setRoute((r) => ({
                ...r,
                all: !r.all,
              }))
            }
          >
            {route.all
              ? "Use selected spaces"
              : hotelId === "all"
                ? "Show all accessible hotels"
                : "Show entire hotel"}
          </Button>
        </div>
      )}
      <div className="pw-room-metrics">
        <span>
          <b>
            {p.kind === "object" ? row?.quantity || 0 : row?.applications || 0}
          </b>
          {p.kind === "object" ? "installed units" : "applied surfaces"}
        </span>
        <span>
          <b>{locs.length}</b> spaces
        </span>
        <span>
          <b>{row?.issueCount || 0}</b> open issues
        </span>
        <span>
          {route.scoped && !route.all ? "Current catalogue scope" : wholeScope}
        </span>
      </div>
      <div className="pw-tabs">
        {[
          ["details", "Specification & ordering"],
          ["locations", "Locations"],
          ["history", "Item history"],
        ].map(([tab, label]) => (
          <Button
            key={tab}
            aria-pressed={route.tab === tab}
            onClick={() =>
              setRoute((r) => ({
                ...r,
                tab,
              }))
            }
          >
            {label}
          </Button>
        ))}
      </div>
      {route.tab === "details" ? (
        <div className="pw-detail-grid">
          <section>
            <div className="pw-sectionbar">
              <h2>
                {p.kind === "finish"
                  ? "Finish specification"
                  : "Product specification"}
              </h2>
            </div>
            <div className="pw-product-sheet">
              <ProductPhotos key={p.id} product={p} />
              <div>
                <p className="pw-product-description">{p.description}</p>
                <dl className="pw-specs">
                  <dt>Reference</dt>
                  <dd>{p.code}</dd>
                  <dt>{p.kind === "finish" ? "Pack size" : "Dimensions"}</dt>
                  <dd>{p.dimensions}</dd>
                  {p.kind === "finish" && (
                    <>
                      <dt>Colour reference</dt>
                      <dd>{p.colour}</dd>
                      <dt>Finish</dt>
                      <dd>{p.finish}</dd>
                      <dt>Recorded area</dt>
                      <dd>
                        {row?.area === null
                          ? "Incomplete — measure before estimating paint"
                          : `${row?.area || 0} m²`}
                      </dd>
                    </>
                  )}
                  <dt>Technical sheet</dt>
                  <dd>Not yet recorded</dd>
                </dl>
                <p className="pw-definition">
                  Illustrative products and photographs.
                </p>
              </div>
            </div>
          </section>
          <aside className="pw-contact">
            <h3>Ordering contact</h3>
            <p>{supplier.name}</p>
            <p>{supplier.contact}</p>
            <p>{supplier.email}</p>
            <p>{supplier.orderNote}</p>
            <Button
              onClick={() =>
                setRoute((r) => ({
                  ...r,
                  tab: "locations",
                  locationHotel: null,
                }))
              }
            >
              View all locations
            </Button>
            <p className="pw-definition">
              Supplier details are shared across linked items.
            </p>
          </aside>
        </div>
      ) : route.tab === "locations" ? (
        <>
          {hotelId === "all" && (
            <Table
              label="Item totals by hotel"
              head={[
                "Hotel",
                {
                  label:
                    p.kind === "object"
                      ? "Installed units"
                      : "Applied surfaces",
                  className: "num",
                },
                {
                  label: "Spaces",
                  className: "num",
                },
                "Locations",
              ]}
            >
              {allowedHotels.map((h) => {
                const inHotel = locs.filter((s) => s.hotelId === h.id),
                  total = aggregate(
                    data,
                    inHotel.map((s) => s.id),
                  ).find((row) => row.productId === p.id);
                return (
                  <tr
                    key={h.id}
                    className={route.locationHotel === h.id ? "selected" : ""}
                  >
                    <td>{h.name}</td>
                    <td className="num">
                      {p.kind === "object"
                        ? total?.quantity || 0
                        : total?.applications || 0}
                    </td>
                    <td className="num">{inHotel.length}</td>
                    <td>
                      <Button
                        aria-pressed={route.locationHotel === h.id}
                        onClick={() =>
                          setRoute((r) => ({
                            ...r,
                            locationHotel:
                              r.locationHotel === h.id ? null : h.id,
                          }))
                        }
                      >
                        View spaces
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
          {route.locationHotel && (
            <div className="pw-batch">
              <strong>
                {hotels.find((h) => h.id === route.locationHotel).name} ·{" "}
                {displayLocs.length} spaces
              </strong>
              <Button
                onClick={() =>
                  setRoute((r) => ({
                    ...r,
                    locationHotel: null,
                  }))
                }
              >
                Show all accessible hotels
              </Button>
            </div>
          )}
          <div className="pw-sectionbar">
            <h2>
              {p.kind === "finish"
                ? "Surfaces using this finish"
                : "Where this item is installed"}
            </h2>
            {p.kind === "object" && displayLocs.length > 0 && (
              <Button
                primary
                onClick={() =>
                  openForm("replace", {
                    productId: p.id,
                    spaceIds: displayLocs.map((s) => s.id),
                  })
                }
              >
                Record replacement in {displayLocs.length} {displayLocs.length === 1 ? "space" : "spaces"}
              </Button>
            )}
          </div>
          {displayLocs.length ? (
            <Table
              label="Item locations"
              head={[
                "Space",
                "Floor",
                {
                  label: p.kind === "object" ? "Quantity" : "Surface / area",
                  className: "num",
                },
                { label: "Action", className: "action-col" },
              ]}
            >
              {displayLocs.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Button link onClick={() => openSpace(s.id)}>
                      {labelSpace(s)}
                    </Button>
                    {hotelId === "all" && (
                      <small
                        style={{
                          display: "block",
                        }}
                      >
                        {hotels.find((h) => h.id === s.hotelId).name}
                      </small>
                    )}
                  </td>
                  <td>{levelName(s.hotelId, s.floor)}</td>
                  <td className="num">
                    {p.kind === "object"
                      ? s.items[p.id]
                      : s.finishes
                          .filter((f) => f.productId === p.id)
                          .map(
                            (f) =>
                              `${f.surface} · ${f.area === null ? "area unknown" : f.area + " m²"}`,
                          )
                          .join(", ")}
                  </td>
                  <td className="action-col">
                    <InventoryActions productId={p.id} spaceIds={[s.id]} />
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <Empty
              title="No locations in this scope"
              text="This item is not installed in the selected spaces."
            />
          )}
        </>
      ) : (
        <HistoryTable
          rows={data.history.filter(
            (e) =>
              (e.productId === p.id || e.replacementId === p.id) &&
              ids.includes(e.spaceId),
          )}
        />
      )}
    </>
  );
}
