import { productById, spaceById, isActiveIssue } from "../data/inventory.js";
import {
  Button,
  Field,
  Select,
  Table,
  Empty,
  Status,
  Heading,
} from "../components/ui.jsx";
import { ProductRecord } from "../components/records.jsx";
import { PhotoGallery } from "../media/Media.jsx";
import { initialFilters, dateLabel } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// Reports track a problem without changing installed quantities until resolution.
export function Issues() {
  const {
    data,
    filter,
    hotelSpaceIds,
    labelSpace,
    nav,
    openForm,
    openProduct,
    openSpace,
    setFilter,
    setFilters,
  } = useWorkspace();
  const rows = data.issues.filter(
    (i) =>
      hotelSpaceIds.includes(i.spaceId) &&
      (!filter.spaceIds || filter.spaceIds.includes(i.spaceId)) &&
      (!filter.productId || filter.productId === i.productId) &&
      (filter.status === "all" || filter.status === "active"
        ? filter.status === "all" || isActiveIssue(i)
        : i.status === filter.status) &&
      `${productById(i.productId).name} ${labelSpace(i.spaceId)} ${i.reason} ${i.note}`
        .toLowerCase()
        .includes(filter.query.toLowerCase()),
  );
  return (
    <>
      {
        <Heading
          title={"Issues"}
          subtitle={"Follow a reported problem through ordering and resolution"}
        />
      }
      {filter.spaceIds && (
        <div className="pw-batch">
          <strong>Catalogue scope · {filter.spaceIds.length} spaces</strong>
          <Button
            onClick={() =>
              setFilters((x) => ({
                ...x,
                issues: {
                  ...initialFilters.issues,
                },
              }))
            }
          >
            Show all hotel issues
          </Button>
        </div>
      )}
      <div className="pw-toolbar">
        <Field label="Find an issue" className="search">
          <input
            type="search"
            placeholder="Item, space or description"
            value={filter.query}
            onChange={(e) => setFilter("query", e.target.value)}
          />
        </Field>
        <Field label="Status">
          <Select
            label="Issue status"
            value={filter.status}
            onChange={(v) => setFilter("status", v)}
            options={[
              ["active", "Outstanding"],
              ["Open", "Open"],
              ["Ordered", "Ordered"],
              ["Resolved", "Resolved"],
              ["all", "All statuses"],
            ]}
          />
        </Field>
        <Button
          quiet
          onClick={() =>
            setFilters((x) => ({
              ...x,
              issues: {
                ...initialFilters.issues,
              },
            }))
          }
        >
          Clear filters
        </Button>
      </div>
      <div className="pw-results">
        <span>{rows.length} matching issues</span>
        <span>Damage reports do not change installed quantities</span>
      </div>
      {rows.length ? (
        <Table
          label="Issues queue"
          head={["Issue", "Location", "Status", "Next action"]}
        >
          {rows.map((i) => (
            <tr key={i.id}>
              <td>
                <ProductRecord id={i.productId} onOpen={openProduct} />
                <small>
                  {i.qty ? `${i.qty} affected · ` : ""}
                  {i.reason} · {i.note}
                </small>
                <PhotoGallery ids={i.photoIds} />
              </td>
              <td>
                <Button link onClick={() => openSpace(i.spaceId)}>
                  {labelSpace(i.spaceId)}
                </Button>
                <small
                  style={{
                    display: "block",
                  }}
                >
                  {dateLabel(i.date)}
                </small>
              </td>
              <td>
                <Status value={i.status} />
                {i.outcome && (
                  <small
                    style={{
                      display: "block",
                    }}
                  >
                    {i.outcome}
                  </small>
                )}
              </td>
              <td>
                {isActiveIssue(i) ? (
                  <div className="pw-actions">
                    <Button
                      onClick={() =>
                        openForm("resolve", {
                          issueId: i.id,
                        })
                      }
                    >
                      Resolve
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
                ) : (
                  <Button
                    link
                    onClick={() => {
                      setFilters((x) => ({
                        ...x,
                        history: {
                          ...initialFilters.history,
                          query: spaceById(data, i.spaceId).name,
                        },
                      }));
                      nav("history");
                    }}
                  >
                    View history
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty
          title="No issues match"
          text="Change the status or search to view other records."
          clear={() =>
            setFilters((x) => ({
              ...x,
              issues: {
                ...initialFilters.issues,
              },
            }))
          }
        />
      )}
    </>
  );
}
