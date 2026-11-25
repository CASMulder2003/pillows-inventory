import {
  hotels,
  productById,
  spaceById,
  isActiveIssue,
  countObjects,
} from "../data/inventory.js";
import { Button, Table, Heading } from "../components/ui.jsx";
import {
  ProductRecord,
  InventoryActions,
  IssueCard,
  HistoryTable,
} from "../components/records.jsx";
import { levelName, dateLabel } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// Each room owns its finish applications, even when products are shared.
export function SpaceDetail() {
  const { data, labelSpace, openForm, openProduct, route, setRoute, visit } =
    useWorkspace();
  const s = spaceById(data, route.id),
    issues = data.issues.filter((i) => i.spaceId === s.id && isActiveIssue(i));
  return (
    <div className="pw-space-detail">
      <Heading
        title={s.name}
        subtitle={`${s.type} · ${levelName(s.hotelId, s.floor)} · ${hotels.find((h) => h.id === s.hotelId).name}`}
      />
      <div className="pw-room-header-meta">
        <div className="pw-room-counts">
          <span><b>{countObjects(s)}</b> objects</span>
          <span><b>{s.finishes.length}</b> applied finishes</span>
          <span className={issues.length ? "has-issues" : ""}><b>{issues.length}</b> outstanding {issues.length === 1 ? "issue" : "issues"}</span>
        </div>
        <details className="pw-room-details">
          <summary>Space details</summary>
          <div className="pw-room-details-content">
            <p>{s.verified ? `Verified ${dateLabel(s.verified)}` : "Inventory not yet verified"}</p>
            {s.sourceDrawing && <>
              <p>
                <strong>{s.sourceCode ? `Drawing space ${s.sourceCode}` : "Drawing-based space"}</strong>
                {s.sourceArea != null && ` · Drawing area ${s.sourceArea.toLocaleString("en-GB")} m²`}
                {` · ${s.sourceDrawing}`}
              </p>
              {s.sourceNote && <p>{s.sourceNote}</p>}
              <p>{s.inventoryStatus === "sample" ? "Example inventory — specifications still to be supplied." : "Inventory awaiting the hotel’s material list."}</p>
            </>}
          </div>
        </details>
      </div>
      <div className="pw-tabs">
        <Button
          aria-pressed={route.tab !== "history"}
          onClick={() =>
            setRoute((r) => ({
              ...r,
              tab: "contents",
            }))
          }
        >
          Contents & finishes
        </Button>
        <Button
          aria-pressed={route.tab === "history"}
          onClick={() =>
            setRoute((r) => ({
              ...r,
              tab: "history",
            }))
          }
        >
          Space history
        </Button>
      </div>
      {route.tab === "history" ? (
        <HistoryTable rows={data.history.filter((e) => e.spaceId === s.id)} />
      ) : (
        <div className="pw-room-layout">
          <section className="pw-room-panel pw-room-contents">
            <div className="pw-sectionbar">
              <h2>Current contents</h2>
              <Button onClick={() => openForm("add", { spaceIds: [s.id] })}>Add item</Button>
            </div>
            {countObjects(s) > 0 ? <Table
              label={`${labelSpace(s)} contents`}
              head={[
                "Item",
                {
                  label: "Qty",
                  className: "num",
                },
                { label: "Update", className: "action-col" },
              ]}
            >
              {Object.entries(s.items)
                .filter(([, n]) => n > 0)
                .map(([id, n]) => (
                  <tr key={id}>
                    <td>
                      <ProductRecord id={id} onOpen={openProduct} />
                    </td>
                    <td className="num"><span className="pw-room-quantity">{n}</span></td>
                    <td className="action-col">
                      <InventoryActions productId={id} spaceIds={[s.id]} />
                    </td>
                  </tr>
                ))}
            </Table> : <p className="pw-definition">No items recorded yet.</p>}
          </section>
          <section className="pw-room-panel pw-room-finishes">
            <div className="pw-sectionbar">
              <h2>Paint & finishes</h2>
              <Button onClick={() => visit({ page: "finish", spaceId: s.id })}>
                Add paint / finish
              </Button>
            </div>
            {!s.finishes.length && (
              <p className="pw-definition">No surfaces recorded yet. Add the paint or finish used on each surface.</p>
            )}
            {s.finishes.map((finish) => {
              const p = productById(finish.productId);
              return (
                <div className="pw-surface" key={finish.id}>
                  <div className="pw-surface-heading">
                    <h3>{finish.surface}</h3>
                    <Button
                      link
                      aria-label={`Edit ${finish.surface.toLowerCase()}`}
                      onClick={() =>
                        visit({
                          page: "finish",
                          spaceId: s.id,
                          finishId: finish.id,
                        })
                      }
                    >
                      Edit
                    </Button>
                  </div>
                  <ProductRecord id={p.id} onOpen={openProduct} />
                  <div className="pw-surface-meta">
                    <span>
                      {p.finish} ·{" "}
                      {finish.area === null
                        ? "Area not recorded"
                        : finish.area + " m²"}
                    </span>
                    <Button
                      link
                      aria-label={`Report issue with ${finish.surface.toLowerCase()}`}
                      onClick={() =>
                        openForm("report", {
                          productId: p.id,
                          spaceIds: [s.id],
                        })
                      }
                    >
                      Report issue
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
          <section className="pw-room-panel pw-room-issues">
            <div className="pw-sectionbar">
              <h2>Outstanding issues</h2>
              <span className="pw-muted">{issues.length} {issues.length === 1 ? "issue" : "issues"}</span>
            </div>
            <div className="pw-room-issue-list">
              {issues.length ? (
                issues.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))
              ) : (
                <p className="pw-definition">No issues reported.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
