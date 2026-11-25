import {
  getScope,
  aggregate,
  isActiveIssue,
  countObjects,
} from "../data/inventory.js";
import { Button, Table, Empty, Heading } from "../components/ui.jsx";
import { IssueCard, HistoryTable } from "../components/records.jsx";
import { FloorPlan } from "../map/FloorPlan.jsx";
import { initialFilters } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// Hotel and collection summaries reuse the same inventory totals as the catalogue.
function CollectionOverview() {
  const { accessibleData, allowedHotels, data, nav, switchHotel } =
    useWorkspace();
  return (
    <>
      {
        <Heading
          title={"Collection overview"}
          subtitle={`Inventory across ${allowedHotels.length} accessible hotel portals`}
          actions={
            <Button primary onClick={() => nav("catalogue")}>
              Combined catalogue
            </Button>
          }
        />
      }
      <Table
        label="Hotels overview"
        head={[
          "Hotel",
          {
            label: "Example objects",
            className: "num",
          },
          {
            label: "Example finishes",
            className: "num",
          },
          {
            label: "Open issues",
            className: "num",
          },
          "Portal",
        ]}
      >
        {allowedHotels.map((h) => {
          const spaces = getScope(accessibleData, h.id),
            ids = spaces.map((s) => s.id),
            rows = aggregate(data, ids);
          return (
            <tr key={h.id}>
              <td>
                <strong>{h.name}</strong>
                <small
                  style={{
                    display: "block",
                  }}
                >
                  {h.property}
                </small>
              </td>
              <td className="num">
                {spaces.reduce((n, s) => n + countObjects(s), 0)}
              </td>
              <td className="num">
                {rows.filter((r) => r.kind === "finish").length}
              </td>
              <td className="num">
                {
                  data.issues.filter(
                    (i) => ids.includes(i.spaceId) && isActiveIssue(i),
                  ).length
                }
              </td>
              <td>
                <Button onClick={() => switchHotel(h.id)}>Open hotel</Button>
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
export function Overview() {
  const {
    data,
    floor,
    hotelId,
    hotelSpaceIds,
    hotelSpaces,
    nav,
    openIssues,
    openSpace,
    planFocus,
    planPage,
    planQuery,
    setFilters,
    setFloor,
    setPlanFocus,
    setPlanPage,
    setPlanQuery,
    setScopeIds,
    setView,
    totals,
  } = useWorkspace();
  if (hotelId === "all") return <CollectionOverview />;
  const unverified = hotelSpaces.filter((s) => !s.verified);
  return (
    <>
      {
        <Heading
          title={"Property overview"}
          subtitle={null}
          actions={
            <Button primary onClick={() => nav("catalogue")}>
              Browse catalogue
            </Button>
          }
        />
      }
      <div className="pw-summary">
        <Button
          onClick={() => {
            setScopeIds([]);
            setFilters((x) => ({
              ...x,
              catalogue: {
                ...initialFilters.catalogue,
                kind: "object",
              },
            }));
            nav("catalogue");
          }}
        >
          <span className="pw-number">
            {hotelSpaces.reduce((n, s) => n + countObjects(s), 0)}
          </span>
          <span>{hotelId === "ams" ? "Example installed objects" : "Installed objects"}</span>
        </Button>
        <Button
          onClick={() => {
            setScopeIds([]);
            setFilters((x) => ({
              ...x,
              catalogue: {
                ...initialFilters.catalogue,
                kind: "finish",
              },
            }));
            nav("catalogue");
          }}
        >
          <span className="pw-number">
            {totals.filter((r) => r.kind === "finish").length}
          </span>
          <span>{hotelId === "ams" ? "Example finish specifications" : "Finish specifications"}</span>
        </Button>
        <Button
          onClick={() => {
            setFilters((x) => ({
              ...x,
              issues: {
                ...initialFilters.issues,
              },
            }));
            nav("issues");
          }}
        >
          <span className="pw-number">{openIssues.length}</span>
          <span>
            Outstanding issues
            <small>
              {openIssues.filter((i) => i.status === "Ordered").length}{" "}
              replacement ordered
            </small>
          </span>
        </Button>
      </div>
      <div className="pw-overview">
        <section>
          <div className="pw-sectionbar">
            <h2>Explore the property</h2>
            <Button
              link
              onClick={() => {
                setView("plan");
                nav("spaces");
              }}
            >
              Full plan / space list →
            </Button>
          </div>
          <FloorPlan
            page={planPage}
            onPage={setPlanPage}
            query={planQuery}
            onQuery={setPlanQuery}
            focusId={planFocus}
            onFocus={setPlanFocus}
            data={data}
            hotelId={hotelId}
            floor={floor}
            onFloor={setFloor}
            openSpace={openSpace}
            compact
          />
        </section>
        <section>
          <div className="pw-sectionbar">
            <h2>Needs attention</h2>
            <Button
              link
              onClick={() => {
                setFilters((x) => ({
                  ...x,
                  issues: {
                    ...initialFilters.issues,
                  },
                }));
                nav("issues");
              }}
            >
              View all →
            </Button>
          </div>
          {openIssues.slice(0, 3).map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
          {!openIssues.length && (
            <Empty
              title="Everything is up to date"
              text="No outstanding issues in this hotel."
            />
          )}
        </section>
      </div>
      <section className="pw-subsection">
        <div className="pw-sectionbar">
          <h2>Recent activity</h2>
          <Button link onClick={() => nav("history")}>
            Full history →
          </Button>
        </div>
        {
          <HistoryTable
            rows={data.history
              .filter((e) => hotelSpaceIds.includes(e.spaceId))
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 3)}
          />
        }
      </section>
      <div className="pw-results">
        <span>{unverified.length} spaces have not yet been verified.</span>
        <Button
          link
          onClick={() => {
            setFilters((x) => ({
              ...x,
              spaces: {
                ...initialFilters.spaces,
                type: "unverified",
              },
            }));
            nav("spaces");
          }}
        >
          Review incomplete records →
        </Button>
      </div>
    </>
  );
}
