import { products, productById } from "../data/inventory.js";
import {
  Button,
  Field,
  Select,
  Table,
  Empty,
  Heading,
} from "../components/ui.jsx";
import { ProductRecord, HistoryTable } from "../components/records.jsx";
import { initialFilters } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// Show recorded changes and replacement counts without treating counts as failure rates.
export function History() {
  const {
    data,
    filter,
    hotelSpaceIds,
    labelSpace,
    openProduct,
    setFilter,
    setFilters,
    totals,
  } = useWorkspace();
  const rows = data.history.filter(
    (e) =>
      hotelSpaceIds.includes(e.spaceId) &&
      (filter.reason === "all" || e.reason === filter.reason) &&
      `${productById(e.productId).name} ${labelSpace(e.spaceId)} ${e.note}`
        .toLowerCase()
        .includes(filter.query.toLowerCase()),
  );
  const replaced = products
    .map((p) => ({
      p,
      count: rows
        .filter((e) => e.productId === p.id && e.type === "Replaced")
        .reduce((n, e) => n + (e.qty || 0), 0),
    }))
    .filter((x) => x.count)
    .sort((a, b) => b.count - a.count);
  return (
    <>
      {
        <Heading
          title={"History"}
          subtitle={"Recorded changes and replacement patterns"}
        />
      }
      <div className="pw-toolbar">
        <Field label="Find a change" className="search">
          <input
            type="search"
            value={filter.query}
            placeholder="Item, space or note"
            onChange={(e) => setFilter("query", e.target.value)}
          />
        </Field>
        <Field label="Reason">
          <Select
            label="History reason"
            value={filter.reason}
            onChange={(v) => setFilter("reason", v)}
            options={[
              "all",
              "Damaged",
              "Defect",
              "Wear and tear",
              "Missing",
              "Refurbishment",
              "Other",
            ].map((x) => [x, x === "all" ? "All reasons" : x])}
          />
        </Field>
        <div className="pw-view-switch">
          <Button
            aria-pressed={filter.mode === "changes"}
            onClick={() => setFilter("mode", "changes")}
          >
            All changes
          </Button>
          <Button
            aria-pressed={filter.mode === "replaced"}
            onClick={() => setFilter("mode", "replaced")}
          >
            Most replaced
          </Button>
        </div>
      </div>
      <div className="pw-results">
        <span>{rows.length} matching changes · All recorded dates</span>
        <Button
          link
          onClick={() =>
            setFilters((x) => ({
              ...x,
              history: {
                ...initialFilters.history,
              },
            }))
          }
        >
          Clear filters
        </Button>
      </div>
      {filter.mode === "changes" ? (
        <HistoryTable rows={rows} />
      ) : replaced.length ? (
        <Table
          label="Most replaced items"
          head={[
            "Item",
            {
              label: "Units replaced",
              className: "num",
            },
            {
              label: "Installed now",
              className: "num",
            },
          ]}
        >
          {replaced.map(({ p, count }) => (
            <tr key={p.id}>
              <td>
                <ProductRecord id={p.id} onOpen={openProduct} />
              </td>
              <td className="num">{count}</td>
              <td className="num">
                {totals.find((r) => r.productId === p.id)?.quantity || 0}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty
          title="No replacements match"
          text="Try another reason or search."
        />
      )}
      <p className="pw-definition">
        Replacement counts are not failure rates. Use the reason and
        installation history to distinguish damage, wear and refurbishment.
      </p>
    </>
  );
}
