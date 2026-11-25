import { hotelLevels, isActiveIssue, countObjects } from "../data/inventory.js";
import {
  Button,
  Field,
  Select,
  Table,
  Checkbox,
  Empty,
  Status,
  Heading,
} from "../components/ui.jsx";
import { FloorPlan } from "../map/FloorPlan.jsx";
import { initialFilters, levelName } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// List and plan are two views of the same spaces and selection.
export function Spaces() {
  const {
    data,
    filter,
    floor,
    hotelId,
    hotelSpaces,
    labelSpace,
    openSpace,
    planFocus,
    planPage,
    planQuery,
    selectMode,
    selected,
    selectedTotals,
    setFilter,
    setFilters,
    setFloor,
    setPlanFocus,
    setPlanPage,
    setPlanQuery,
    setSelectMode,
    setSelected,
    setSort,
    setView,
    sort,
    toggle,
    view,
  } = useWorkspace();
  const visible = hotelSpaces
    .filter(
      (s) =>
        (filter.floor === "all" || s.floor === filter.floor) &&
        (filter.type === "all" ||
          (filter.type === "unverified"
            ? !s.verified
            : s.type === filter.type)) &&
        s.name.toLowerCase().includes(filter.query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        sort.dir *
        (sort.key === "quantity"
          ? countObjects(a) - countObjects(b)
          : a.name.localeCompare(b.name, undefined, {
              numeric: true,
            })),
    );
  // Carry the location/search context between two views of the same inventory.
  function changeView(next) {
    if (next === view) return;
    if (next === "plan") {
      if (filter.floor !== "all") setFloor(filter.floor);
      setPlanQuery(filter.query);
      setPlanFocus(null);
      setPlanPage(0);
    } else {
      setFilters((previous) => ({ ...previous, spaces: {
        ...previous.spaces, floor: planQuery.trim() ? "all" : floor, query: planQuery,
      } }));
    }
    setView(next);
  }
  const all =
    visible.length > 0 && visible.every((s) => selected.includes(s.id));
  return (
    <>
      {
        <Heading
          title={"Spaces"}
          subtitle={null}
          actions={
            <div className="pw-actions">
              <div className="pw-view-switch">
                <Button
                  aria-pressed={view === "list"}
                  onClick={() => changeView("list")}
                >
                  List
                </Button>
                <Button
                  aria-pressed={view === "plan"}
                  onClick={() => changeView("plan")}
                >
                  Floor plan
                </Button>
              </div>
              {view === "plan" && (
                <Button
                  aria-pressed={selectMode}
                  onClick={() => setSelectMode((x) => !x)}
                >
                  {selectMode ? "Done selecting" : "Select multiple spaces"}
                </Button>
              )}
            </div>
          }
        />
      }
      {selected.length > 0 && (
        <div className="pw-batch">
          <strong>
            {selected.length} {selected.length === 1 ? "space" : "spaces"}{" "}
            selected
          </strong>
          <Button primary onClick={selectedTotals}>
            View combined totals
          </Button>
          <Button onClick={() => setSelected([])}>Clear selection</Button>
        </div>
      )}
      {view === "list" ? (
        <>
          <div className="pw-toolbar">
            <Field label="Find a space" className="search">
              <input
                type="search"
                value={filter.query}
                placeholder="Room number or space name"
                onChange={(e) => setFilter("query", e.target.value)}
              />
            </Field>
            <Field label="Floor">
              <Select
                label="Space floor"
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
            <Field label="Space type">
              <Select
                label="Space type"
                value={filter.type}
                onChange={(v) => setFilter("type", v)}
                options={[
                  ["all", "All types"],
                  ["Guest room", "Guest rooms"],
                  ["Corridor", "Corridors"],
                  ["Service", "Service spaces"],
                  ["Public space", "Public spaces"],
                  ["Outdoor", "Outdoor and roof zones"],
                  ["unverified", "Not verified"],
                ]}
              />
            </Field>
            <Button
              quiet
              onClick={() =>
                setFilters((x) => ({
                  ...x,
                  spaces: {
                    ...initialFilters.spaces,
                  },
                }))
              }
            >
              Clear filters
            </Button>
          </div>
          <div className="pw-results">
            <span>{visible.length} matching spaces</span>
            <span>Open a name · Select checkboxes for combined totals</span>
          </div>
          {visible.length ? (
            <Table
              label="Spaces"
              head={[
                {
                  label: (
                    <Checkbox
                      label="Select all matching spaces"
                      checked={all}
                      mixed={
                        !all && visible.some((s) => selected.includes(s.id))
                      }
                      onChange={(value) =>
                        setSelected(
                          value
                            ? [
                                ...new Set([
                                  ...selected,
                                  ...visible.map((s) => s.id),
                                ]),
                              ]
                            : selected.filter(
                                (id) => !visible.some((s) => s.id === id),
                              ),
                        )
                      }
                    />
                  ),
                  className: "select-col",
                },
                {
                  label: (
                    <Button
                      onClick={() =>
                        setSort((s) => ({
                          key: "name",
                          dir: s.key === "name" ? -s.dir : 1,
                        }))
                      }
                    >
                      Space ↕
                    </Button>
                  ),
                },
                "Floor",
                {
                  label: (
                    <Button
                      onClick={() =>
                        setSort((s) => ({
                          key: "quantity",
                          dir: s.key === "quantity" ? -s.dir : -1,
                        }))
                      }
                    >
                      Objects ↕
                    </Button>
                  ),
                  className: "num",
                },
                {
                  label: "Finishes",
                  className: "num",
                },
                {
                  label: "Condition",
                  className: "optional",
                },
              ]}
            >
              {visible.map((s) => {
                const n = data.issues.filter(
                  (i) => isActiveIssue(i) && i.spaceId === s.id,
                ).length;
                return (
                  <tr
                    key={s.id}
                    className={`pw-clickable-row ${selected.includes(s.id) ? "selected" : ""}`}
                    onClick={(e) => {
                      if (!e.target.closest("button, a, input, select, .select-col")) openSpace(s.id);
                    }}
                  >
                    <td className="select-col">
                      <Checkbox
                        label={`Select ${labelSpace(s)}`}
                        checked={selected.includes(s.id)}
                        onChange={() => toggle(s.id)}
                      />
                    </td>
                    <td>
                      <Button link onClick={() => openSpace(s.id)}>
                        {labelSpace(s)}
                      </Button>
                      <small
                        style={{
                          display: "block",
                        }}
                      >
                        {s.type}
                      </small>
                    </td>
                    <td>{levelName(s.hotelId, s.floor)}</td>
                    <td className="num">{countObjects(s)}</td>
                    <td className="num">{s.finishes.length}</td>
                    <td className="optional">
                      {n ? (
                        <Status value="Open" />
                      ) : !s.verified ? (
                        <Status value="Unknown" />
                      ) : (
                        <span className="pw-muted">No issues reported</span>
                      )}
                      {n > 0 && (
                        <small>
                          {" "}
                          {n} issue{n === 1 ? "" : "s"}
                        </small>
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
                  spaces: {
                    ...initialFilters.spaces,
                  },
                }))
              }
            />
          )}
        </>
      ) : (
        <>
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
            selected={selected}
            selectMode={selectMode}
            onSelect={toggle}
          />
          <p className="pw-definition">
            {selectMode
              ? "Select room shapes, then view their combined catalogue totals."
              : "Click a room to open its record."}
          </p>
        </>
      )}
    </>
  );
}
