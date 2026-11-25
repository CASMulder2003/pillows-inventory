import { productMatches } from "../app/selectors.js";
import {
  hotelLevels,
  suppliers,
  productById,
  aggregate,
} from "../data/inventory.js";
import {
  Button,
  Field,
  Select,
  Table,
  Empty,
  Heading,
} from "../components/ui.jsx";
import { ProductRecord, ScopeSummary } from "../components/records.jsx";
import { initialFilters, levelName } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// Scope controls where totals are counted; search controls which products are shown.
export function Catalogue() {
  const {
    allowedHotels,
    catalogueScope,
    data,
    filter,
    hotelId,
    nav,
    openProduct,
    scopeIds,
    scoped,
    scopedIds,
    setFilter,
    setFilters,
    visit,
  } = useWorkspace();
  const rows = aggregate(data, scopedIds).filter((r) => {
    const p = productById(r.productId),
      supplier = suppliers.find((s) => s.id === p.supplierId);
    return (
      (filter.kind === "all" || r.kind === filter.kind) &&
      (filter.category === "all" || p.category === filter.category) &&
      productMatches(p, filter.query)
    );
  });
  const units = rows
    .filter((r) => r.kind === "object")
    .reduce((n, r) => n + r.quantity, 0);
  return (
    <>
      {
        <Heading
          title={hotelId === "all" ? "Collection catalogue" : "Catalogue"}
          subtitle={
            hotelId === "all"
              ? `Combined quantities across ${allowedHotels.length} accessible hotel portals`
              : null
          }
          actions={
            <Button
              onClick={() =>
                visit({
                  page: "suppliers",
                })
              }
            >
              Supplier directory
            </Button>
          }
        />
      }
      {<ScopeSummary />}
      <div className="pw-toolbar">
        <Field label="Search the catalogue" className="search">
          <input
            type="search"
            placeholder="Item, paint code, reference or supplier"
            value={filter.query}
            onChange={(e) => setFilter("query", e.target.value)}
          />
        </Field>
        <Field label="Show">
          <Select
            label="Catalogue type"
            value={filter.kind}
            onChange={(v) => setFilter("kind", v)}
            options={[
              ["all", "Objects & finishes"],
              ["object", "Objects"],
              ["finish", "Paint & finishes"],
            ]}
          />
        </Field>
        <Field label="Floor">
          <Select
            label="Catalogue floor"
            value={filter.floor}
            onChange={(v) => setFilter("floor", v)}
            options={[
              ["all", "All levels"],
              ...hotelLevels(hotelId).map((l) => [
                l.id,
                levelName(hotelId, l.id),
              ]),
            ]}
          />
        </Field>
        <Button
          quiet
          onClick={() =>
            setFilters((x) => ({
              ...x,
              catalogue: {
                ...initialFilters.catalogue,
              },
            }))
          }
        >
          Clear filters
        </Button>
      </div>
      <div className="pw-results">
        <span>
          {scoped.length} spaces
          {filter.kind !== "finish" ? " · " + units + " installed objects" : ""}
          {filter.kind !== "object"
            ? " · " +
              rows.filter((r) => r.kind === "finish").length +
              " finish specifications"
            : ""}
        </span>
        <span>{scopeIds.length ? "Selected spaces" : catalogueScope}</span>
      </div>
      {rows.length ? (
        <Table
          label="Catalogue totals"
          head={[
            "Item / specification",
            {
              label: "Quantity / use",
              className: "num",
            },
            {
              label: "Spaces",
              className: "num",
            },
            {
              label: "Supplier",
              className: "optional",
            },
            {
              label: "Issues",
              className: "num",
            },
          ]}
        >
          {rows.map((r) => {
            const p = productById(r.productId);
            return (
              <tr key={p.id}>
                <td>
                  <ProductRecord id={p.id} onOpen={openProduct} />
                </td>
                <td className="num">
                  {r.kind === "object"
                    ? `${r.quantity} units`
                    : `${r.applications} surfaces`}
                  {r.kind === "finish" && (
                    <small
                      style={{
                        display: "block",
                      }}
                    >
                      {r.area === null ? "Area incomplete" : r.area + " m²"}
                    </small>
                  )}
                </td>
                <td className="num">{r.spaceIds.length}</td>
                <td className="optional">
                  <Button
                    link
                    onClick={() =>
                      visit({
                        page: "supplier",
                        id: p.supplierId,
                      })
                    }
                  >
                    {suppliers.find((s) => s.id === p.supplierId).name}
                  </Button>
                </td>
                <td className="num">
                  {r.issueCount > 0 ? (
                    <Button
                      link
                      onClick={() => {
                        setFilters((x) => ({
                          ...x,
                          issues: {
                            ...initialFilters.issues,
                            query: p.name,
                            productId: p.id,
                            spaceIds: scopedIds,
                          },
                        }));
                        nav("issues");
                      }}
                    >
                      {r.issueCount} open
                    </Button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Empty
          clear={() =>
            setFilters((x) => ({
              ...x,
              catalogue: {
                ...initialFilters.catalogue,
              },
            }))
          }
        />
      )}
      <p className="pw-definition">
        Installed objects exclude spare stock. Finishes are counted by surfaces
        and recorded area; paint stock is measured separately in litres.
      </p>
    </>
  );
}
