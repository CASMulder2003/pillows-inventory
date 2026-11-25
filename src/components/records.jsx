import { productById, spaceById } from "../data/inventory.js";
import { Button, Table, Empty, Status } from "../components/ui.jsx";
import { PhotoGallery, ProductThumb } from "../media/Media.jsx";
import { dateLabel } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// Shared record displays keep item names, issue actions and history consistent across screens.
export function ProductRecord({ id, onOpen, subtitle = true }) {
  const p = productById(id);
  return (
    <div className="pw-record">
      <ProductThumb product={p} />
      <div>
        <Button link onClick={() => onOpen(id)}>
          {p.name}
        </Button>
        {subtitle && (
          <small>
            {p.code} · {p.kind === "finish" ? p.colour : p.category}
          </small>
        )}
      </div>
    </div>
  );
}
export function IssueCard({ issue: i }) {
  const { data, labelSpace, openForm, openProduct, openSpace } = useWorkspace();
  const s = spaceById(data, i.spaceId);
  return (
    <div className="pw-issue-row" key={i.id}>
      <div className="pw-rowtitle">
        <Button link onClick={() => openProduct(i.productId)}>
          {productById(i.productId).name}
        </Button>
        <Status value={i.status} />
      </div>
      <p>
        <Button link onClick={() => openSpace(s.id)}>
          {labelSpace(s)}
        </Button>{" "}
        · {i.qty ? `${i.qty} affected · ` : ""}
        {i.reason}
      </p>
      <p>{i.note}</p>
      <PhotoGallery ids={i.photoIds} />
      <div className="pw-actions">
        <Button
          onClick={() =>
            openForm("resolve", {
              issueId: i.id,
            })
          }
        >
          Resolve issue
        </Button>
        {i.status === "Open" && (
          <Button
            quiet
            onClick={() =>
              openForm("ordered", {
                issueId: i.id,
              })
            }
          >
            Mark ordered
          </Button>
        )}
      </div>
    </div>
  );
}
export function HistoryTable({ rows }) {
  const { labelSpace, openProduct, openSpace } = useWorkspace();
  return rows.length ? (
    <Table
      label="Change history"
      head={[
        "Date",
        "Change",
        "Space",
        {
          label: "Reason / recorded by",
          className: "optional",
        },
      ]}
    >
      {rows.map((e) => (
        <tr key={e.id}>
          <td>{dateLabel(e.date)}</td>
          <td>
            <Button link onClick={() => openProduct(e.productId)}>
              {e.type} {e.qty ? `${e.qty} × ` : ""}
              {productById(e.productId).name}
            </Button>
            {e.replacementId && e.replacementId !== e.productId && (
              <small className="pw-muted">
                {" "}
                → {productById(e.replacementId).name}
              </small>
            )}
            <small
              style={{
                display: "block",
              }}
            >
              {e.surface && `${e.surface} · `}
              {e.note || (e.surface ? "Specification updated" : "")}
            </small>
            <PhotoGallery ids={e.photoIds} />
          </td>
          <td>
            <Button link onClick={() => openSpace(e.spaceId)}>
              {labelSpace(e.spaceId)}
            </Button>
          </td>
          <td className="optional">
            {e.reason}
            <small
              style={{
                display: "block",
              }}
            >
              {e.actor}
            </small>
          </td>
        </tr>
      ))}
    </Table>
  ) : (
    <Empty
      title="No history yet"
      text="Changes to this record will appear here."
    />
  );
}
export function ScopeSummary() {
  const { data, scopeIds, setFilters, setScopeIds, wholeScope } =
    useWorkspace();
  return scopeIds.length ? (
    <div className="pw-batch">
      <strong>
        {scopeIds.length} selected spaces ·{" "}
        {scopeIds
          .slice(0, 3)
          .map((id) => spaceById(data, id)?.name)
          .join(", ") +
          (scopeIds.length > 3 ? ` + ${scopeIds.length - 3} more` : "")}
      </strong>
      <Button
        onClick={() => {
          setScopeIds([]);
          setFilters((x) => ({
            ...x,
            catalogue: {
              ...x.catalogue,
              floor: "all",
            },
          }));
        }}
      >
        {wholeScope}
      </Button>
    </div>
  ) : null;
}
