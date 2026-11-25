import { getScope, aggregate, isActiveIssue, countObjects, hotelLevels } from "../data/inventory.js";
import { Button, Empty, Heading } from "../components/ui.jsx";
import { IssueCard, HistoryTable } from "../components/records.jsx";
import { FloorPlan } from "../map/FloorPlan.jsx";
import { buildFloorPlan } from "../map/geometry.js";
import { initialFilters } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// Summary links reset the destination filters, so their numbers always match
// the catalogue or issue list they open.
function useOverviewActions() {
  const { nav, setScopeIds, setFilters, setView } = useWorkspace();
  return {
    catalogue(kind = "all") {
      setScopeIds([]);
      setFilters((previous) => ({
        ...previous, catalogue: { ...initialFilters.catalogue, kind },
      }));
      nav("catalogue");
    },
    issues() {
      setFilters((previous) => ({ ...previous, issues: { ...initialFilters.issues } }));
      nav("issues");
    },
    spaces(view = "plan", type = "all") {
      setView(view);
      setFilters((previous) => ({ ...previous, spaces: { ...initialFilters.spaces, type } }));
      nav("spaces");
    },
  };
}

function SummaryMetric({ value, label, detail, onClick, attention = false }) {
  return (
    <button type="button" className={`pw-dashboard-metric${attention ? " attention" : ""}`} onClick={onClick}>
      <span className="pw-metric-label">{label}</span>
      <strong className="pw-metric-value">{value.toLocaleString("en-GB")}</strong>
      <span className="pw-metric-detail">{detail}</span>
    </button>
  );
}

// Use the same geometry as the full map; thumbnails add no competing controls.
function HotelPlanThumbnail({ hotelId, spaces }) {
  const levels = hotelLevels(hotelId);
  const level = levels.find((item) => item.id === "G") || levels[0];
  const plan = buildFloorPlan(spaces.filter((space) => space.floor === level.id), level, hotelId);
  return (
    <svg className="pw-hotel-plan-preview" viewBox={`0 0 ${plan.width} ${plan.height}`}
      aria-hidden="true" focusable="false">
      {(plan.context || []).map((region, index) =>
        <path key={index} className="pw-preview-context" d={region.path} fillRule="evenodd" />)}
      <path className="pw-preview-outline" d={plan.outline} fillRule="evenodd" />
      {plan.shapes.map((shape) => <path key={shape.spaceId} d={shape.path} fillRule="evenodd" />)}
    </svg>
  );
}

function CollectionOverview() {
  const { accessibleData, allowedHotels, data, switchHotel, totals, openIssues } = useWorkspace();
  const actions = useOverviewActions();
  const properties = allowedHotels.map((hotel) => {
    const spaces = getScope(accessibleData, hotel.id);
    const ids = new Set(spaces.map((space) => space.id));
    return {
      ...hotel,
      spaces,
      objects: spaces.reduce((total, space) => total + countObjects(space), 0),
      finishes: aggregate(data, [...ids]).filter((row) => row.kind === "finish").length,
      issues: data.issues.filter((issue) => ids.has(issue.spaceId) && isActiveIssue(issue)).length,
    };
  });
  return (
    <div className="pw-dashboard">
      <Heading title="Your hotels" subtitle="A shared catalogue. A clear view of every property."
        actions={<Button onClick={() => actions.catalogue()}>Combined catalogue</Button>} />
      <div className="pw-dashboard-metrics" aria-label="Collection totals">
        <SummaryMetric value={properties.reduce((total, hotel) => total + hotel.objects, 0)} label="Installed objects" detail="Across all accessible hotels" onClick={() => actions.catalogue("object")} />
        <SummaryMetric value={totals.filter((row) => row.kind === "finish").length} label="Finish specifications" detail="Paint, materials and finishes" onClick={() => actions.catalogue("finish")} />
        <SummaryMetric value={openIssues.length} label="Outstanding issues" detail="Review repairs and replacements" attention={openIssues.length > 0} onClick={actions.issues} />
      </div>
      <div className="pw-sectionbar pw-collection-heading">
        <h2>Choose a property</h2>
        <span>{allowedHotels.length} hotels</span>
      </div>
      <div className="pw-hotel-cards">
        {properties.map((hotel) => (
          <button type="button" className="pw-hotel-card" key={hotel.id}
            aria-label={`Open ${hotel.name}`} onClick={() => switchHotel(hotel.id)}>
            <span className="pw-hotel-card-header">
              <span className="pw-hotel-card-name">
                <span className="pw-hotel-card-city">{hotel.name}</span>
                <span className="pw-hotel-card-property">{hotel.property}</span>
              </span>
              <HotelPlanThumbnail hotelId={hotel.id} spaces={hotel.spaces} />
            </span>
            <span className="pw-hotel-card-totals">
              <span><strong>{hotel.objects.toLocaleString("en-GB")}</strong> objects</span>
              <span><strong>{hotel.finishes}</strong> finishes</span>
              <span className={hotel.issues ? "has-issues" : ""}><strong>{hotel.issues}</strong> open issues</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function Overview() {
  const {
    data, floor, hotel, hotelId, hotelSpaceIds, hotelSpaces, nav, openIssues,
    openSpace, planFocus, planPage, planQuery, setFloor, setPlanFocus,
    setPlanPage, setPlanQuery, totals,
  } = useWorkspace();
  const actions = useOverviewActions();
  if (hotelId === "all") return <CollectionOverview />;
  const unverified = hotelSpaces.filter((space) => !space.verified).length;
  const ordered = openIssues.filter((issue) => issue.status === "Ordered").length;
  return (
    <div className="pw-dashboard">
      <Heading title={hotel.property} subtitle={`${hotel.name} · Property overview`}
        actions={<Button onClick={() => actions.spaces("list")}>Space list</Button>} />
      <div className="pw-dashboard-metrics" aria-label="Hotel totals">
        <SummaryMetric value={hotelSpaces.reduce((total, space) => total + countObjects(space), 0)}
          label="Installed objects" detail="See quantities and where they are used" onClick={() => actions.catalogue("object")} />
        <SummaryMetric value={totals.filter((row) => row.kind === "finish").length}
          label="Finish specifications" detail="Paint, materials and finishes" onClick={() => actions.catalogue("finish")} />
        <SummaryMetric value={openIssues.length} label="Outstanding issues"
          detail={ordered ? `${ordered} replacement${ordered === 1 ? "" : "s"} ordered` : "Review repairs and replacements"}
          attention={openIssues.length > 0} onClick={actions.issues} />
      </div>
      <div className="pw-dashboard-grid">
        <section className="pw-dashboard-plan" aria-label="Explore the property">
          <div className="pw-sectionbar">
            <h2>Explore the property</h2>
            <Button link onClick={() => actions.spaces()}>All spaces</Button>
          </div>
          <FloorPlan page={planPage} onPage={setPlanPage} query={planQuery} onQuery={setPlanQuery}
            focusId={planFocus} onFocus={setPlanFocus} data={data} hotelId={hotelId}
            floor={floor} onFloor={setFloor} openSpace={openSpace} compact />
        </section>
        <section className="pw-dashboard-attention" aria-label="Needs attention">
          <div className="pw-sectionbar">
            <h2>Needs attention</h2>
            <Button link onClick={actions.issues}>View all</Button>
          </div>
          {openIssues.slice(0, 3).map((issue) => <IssueCard key={issue.id} issue={issue} />)}
          {!openIssues.length && <Empty title="All clear" text="No outstanding issues in this hotel." />}
        </section>
      </div>
      <section className="pw-dashboard-history">
        <div className="pw-sectionbar">
          <h2>Recent activity</h2>
          <Button link onClick={() => nav("history")}>Full history</Button>
        </div>
        <HistoryTable rows={data.history.filter((entry) => hotelSpaceIds.includes(entry.spaceId))
          .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)} />
      </section>
      {unverified > 0 && <div className="pw-record-review">
        <span><strong>{unverified} spaces</strong> still need an inventory check.</span>
        <Button link onClick={() => actions.spaces("list", "unverified")}>Review records</Button>
      </div>}
    </div>
  );
}
