import { useState } from "react";
import { hotelLevels } from "../data/inventory.js";
import { buildFloorPlan } from "./geometry.js";
import { Button } from "../components/ui.jsx";
import { useMapCamera } from "./useMapCamera.js";
import { Minimap } from "./Minimap.jsx";

function spaceCategory(space) {
  if (space.type === "Guest room") return "guest";
  if (space.type === "Corridor") return "circulation";
  if (space.type === "Service") return "service";
  if (space.type === "Outdoor" || space.type === "Outdoor space") return "outdoor";
  return "public";
}

// Keep labels within their room at the current scale. Small spaces retain their
// accessible name and hover title even when their visible label needs more zoom.
function roomLabel(shape, space, font, zoom, sourceBased) {
  const label = shape.shortLabel || space.name.replace(/^Room\s+/i, "");
  if (!sourceBased) return [label];
  if (space.type === "Corridor" && zoom < 1.8) return [];
  const bounds = shape.bounds;
  const availableWidth = Math.max(0, 2 * Math.min(
    shape.x - bounds.x,
    bounds.x + bounds.width - shape.x,
  ) - font * 0.4);
  const availableHeight = Math.max(0, 2 * Math.min(
    shape.y - bounds.y,
    bounds.y + bounds.height - shape.y,
  ) - font * 0.3);
  const characters = Math.floor(availableWidth / (font * 0.56));
  const maxLines = Math.min(2, Math.floor(availableHeight / (font * 1.15)));
  if (characters < 3 || maxLines < 1) return [];

  const lines = [];
  for (const part of shape.labelLines || [label]) {
    for (const word of part.split(/\s+/)) {
      if (word.length > characters) return [];
      const last = lines.length - 1;
      if (last >= 0 && `${lines[last]} ${word}`.length <= characters)
        lines[last] += ` ${word}`;
      else lines.push(word);
    }
  }
  return lines.length <= maxLines ? lines : [];
}

// Hotel-specific data supplies the shapes; the same camera and controls serve every plan.
export function FloorPlan({
  data,
  hotelId,
  floor,
  onFloor,
  openSpace,
  selected = [],
  selectMode = false,
  onSelect,
  compact = false,
  query = "",
  onQuery,
  focusId,
  onFocus,
  page = 0,
  onPage,
}) {
  const currentHotel = hotelId === "all" ? "ams" : hotelId;
  const levels = hotelLevels(currentHotel),
    level = levels.find((l) => l.id === floor) || levels[0];
  const spaces = data.spaces.filter((s) => s.hotelId === currentHotel),
    floorSpaces = spaces.filter((s) => s.floor === level.id);
  const plan = buildFloorPlan(floorSpaces, level, currentHotel);
  const [hideList, setHideList] = useState(false);
  const cameraKey = `${currentHotel}/${level.buildingId}/${level.id}/${compact ? "compact" : "full"}`;
  const {
    stageRef,
    drawingRef,
    camera,
    view,
    viewport,
    clipped,
    width,
    height,
    font,
    pan,
    centerAt,
    zoomBy,
    fit,
    fitSelection,
    focusShape,
    rememberView,
    canActivateSpace,
    stageEvents,
  } = useMapCamera({ plan, memoryKey: cameraKey, compact, focusId });
  const q = query.trim().toLowerCase();
  const levelFor = (s) => levels.find((l) => l.id === s.floor);
  const labelFor = (s) => {
    const l = levelFor(s);
    return l ? `${l.buildingLabel} · ${l.label}` : s.floor;
  };
  const matches = q
    ? spaces.filter((s) =>
        q
          .split(/\s+/)
          .every((word) =>
            `${s.name} ${s.type} ${labelFor(s)}`.toLowerCase().includes(word),
          ),
      )
    : floorSpaces;
  const pageSize = compact ? 6 : 8;
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize)),
    safePage = Math.min(page, pageCount - 1),
    shown = matches.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const showList = !!q || (!compact && !hideList);
  const buildings = [
    ...new Map(levels.map((l) => [l.buildingId, l.buildingLabel])).entries(),
  ];
  const currentBuilding = level.buildingId;
  const floorGroups = [];
  for (const l of levels.filter((l) => l.buildingId === currentBuilding)) {
    const group = l.parentId && floorGroups.find((g) => g[0].id === l.parentId);
    if (group) group.push(l);
    else floorGroups.push([l]);
  }
  function openRoom(id) {
    rememberView();
    openSpace(id);
  }
  function reveal(space) {
    onFloor(space.floor);
    onFocus(space.id);
    if (space.floor === level.id) focusShape(space.id);
  }
  function changeFloor(id) {
    onFloor(id);
    onFocus(null);
    onPage(0);
  }
  function clear() {
    onQuery("");
    onFocus(null);
    onPage(0);
  }
  const onCurrent = selected.filter((id) =>
    floorSpaces.some((s) => s.id === id),
  ).length;
  return (
    <div
      className={`pw-plan ${compact ? "is-compact" : ""} ${plan.sourceBased ? "is-source-plan" : ""} ${!compact && showList ? "pw-plan-expanded" : ""} ${q ? "has-query" : ""}`}
    >
      <div className="pw-plan-toolbar pw-map-controls">
        <div className="pw-plan-level-heading">
          <strong>{level.label}</strong>
          <span>
            {buildings.length > 1 ? `${level.buildingLabel} · ` : ""}
            {plan.sourceBased ? "Architectural floor plan" : "Illustrative layout"}
          </span>
        </div>
        <div className="pw-plan-search">
          <input
            type="search"
            aria-label="Search floor plan"
            placeholder="Find a room or space · all levels"
            value={query}
            onChange={(e) => {
              onQuery(e.target.value);
              onFocus(null);
              onPage(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") clear();
              if (e.key === "Enter" && matches.length === 1) reveal(matches[0]);
            }}
          />
          {q && (
            <Button quiet onClick={clear}>
              Clear
            </Button>
          )}
        </div>
        <div className="pw-actions pw-zoom">
          <Button
            aria-label="Zoom out"
            disabled={camera.zoom <= 1}
            onClick={() => zoomBy(1 / 1.4)}
          >
            −
          </Button>
          <span className="pw-muted">{Math.round(camera.zoom * 100)}%</span>
          <Button
            aria-label="Zoom in"
            disabled={camera.zoom >= 6}
            onClick={() => zoomBy(1.4)}
          >
            +
          </Button>
          <Button onClick={fit}>Fit floor</Button>
          {onCurrent > 0 && (
            <Button onClick={() => fitSelection(selected)}>
              Fit selection
            </Button>
          )}
          {!compact && !q && (
            <Button onClick={() => setHideList((x) => !x)}>
              {hideList ? "Show list" : "Hide list"}
            </Button>
          )}
        </div>
        {buildings.length > 1 && (
          <div
            className="pw-buildings"
            role="group"
            aria-label="Choose a building"
          >
            {buildings.map(([id, label]) => (
              <Button
                key={id}
                aria-pressed={currentBuilding === id}
                onClick={() =>
                  changeFloor(levels.find((l) => l.buildingId === id).id)
                }
              >
                {label}
              </Button>
            ))}
          </div>
        )}
        <div
          className="pw-floor-buttons pw-floor-strip"
          role="group"
          aria-label="Choose a floor"
        >
          {floorGroups.map((group) => (
            <div className="pw-level-pair" key={group[0].id}>
              {group.map((l) => (
                <Button
                  key={l.id}
                  aria-label={l.label}
                  title={l.label}
                  aria-pressed={level.id === l.id}
                  onClick={() => changeFloor(l.id)}
                >
                  {l.shortLabel}
                </Button>
              ))}
            </div>
          ))}
        </div>
      </div>
      {showList && (
        <div className="pw-plan-results">
          <small role="status">
            {q
              ? matches.length
                ? `${matches.length} matching ${matches.length === 1 ? "space" : "spaces"}`
                : "No matching spaces. Try a room number or “corridor”."
              : "Spaces on this level"}
          </small>
          {shown.map((s) => (
            <div
              className={
                focusId === s.id ? "pw-plan-result located" : "pw-plan-result"
              }
              key={s.id}
            >
              <Button
                quiet
                aria-label={`Show ${s.name} on plan`}
                onClick={() => reveal(s)}
              >
                <strong>{s.name}</strong>
                <small>
                  {q
                    ? labelFor(s)
                    : focusId === s.id
                      ? "Shown on plan"
                      : "Show on plan"}
                </small>
              </Button>
              <Button
                link
                aria-label={`Open ${s.name} record`}
                onClick={() => openRoom(s.id)}
              >
                Open
              </Button>
            </div>
          ))}
          {pageCount > 1 && (
            <div className="pw-map-pagination">
              <small>
                {safePage * pageSize + 1}–
                {Math.min((safePage + 1) * pageSize, matches.length)} of{" "}
                {matches.length}
              </small>
              <div className="pw-actions">
                <Button
                  aria-label="Previous spaces"
                  disabled={safePage === 0}
                  onClick={() => onPage(safePage - 1)}
                >
                  Previous
                </Button>
                <Button
                  aria-label="Next spaces"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => onPage(safePage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      <div
        ref={stageRef}
        className={`pw-plan-stage ${clipped ? "is-pannable" : ""}`}
        style={{ touchAction: clipped ? "none" : "pan-y" }}
        {...stageEvents}
      >
        <svg
          ref={drawingRef}
          style={{ height }}
          viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
          role="group"
          aria-label={`${level.buildingLabel}, ${level.label}. ${plan.sourceBased ? "Simplified from the supplied architectural floor plan." : "Illustrative test layout."} Clickable spaces.`}
        >
          <title>{`${level.label} · ${level.buildingLabel}`}</title>
          <desc>
            {plan.sourceBased
              ? "Room boundaries follow the supplied architectural drawing. Construction details are omitted. Open a space to view its catalogue."
              : "Illustrative room shapes for testing the catalogue."}
          </desc>
          <g className="pw-plan-context" aria-hidden="true">
            {(plan.context || []).map((context, index) => (
              <g key={index}>
                <path
                  d={context.path}
                  fillRule="evenodd"
                  className={`pw-plan-context-${context.kind}`}
                />
                {context.label && Number.isFinite(context.x) && Number.isFinite(context.y) && (
                  <text x={context.x} y={context.y} fontSize={font * 0.9}>
                    {context.label}
                  </text>
                )}
              </g>
            ))}
          </g>
          <path d={plan.outline} className="pw-plan-wall" fillRule="evenodd" />
          {plan.shapes.map((g) => {
            const s = floorSpaces.find((s) => s.id === g.spaceId);
            if (!s) return null;
            const issue = data.issues.some(
              (i) => i.status !== "Resolved" && i.spaceId === s.id,
            );
            const labelFont = plan.sourceBased ? font * 0.9 : font;
            const lines = roomLabel(g, s, labelFont, camera.zoom, plan.sourceBased);
            return (
              <a
                key={s.id}
                href={"#" + s.id}
                onClick={(e) => {
                  e.preventDefault();
                  if (canActivateSpace())
                    (selectMode ? onSelect : openRoom)(s.id);
                }}
                aria-label={`${selectMode ? "Select" : "Open"} ${s.name} on plan${selected.includes(s.id) ? ", selected" : ""}`}
                className="pw-plan-space"
              >
                <title>{`${s.name} · ${s.type}${issue ? " · Outstanding issue" : ""}`}</title>
                <path
                  d={g.path}
                  fillRule="evenodd"
                  className={`pw-plan-room ${plan.sourceBased ? `pw-plan-room-${spaceCategory(s)}` : ""} ${selected.includes(s.id) ? "selected" : ""} ${focusId === s.id ? "located" : q && matches.some((m) => m.id === s.id) ? "matched" : ""}`}
                />
                {lines.length > 0 && (
                  <text
                    className={`pw-plan-label ${s.type === "Guest room" ? "pw-plan-room-number" : ""}`}
                    x={g.x}
                    y={g.y - ((lines.length - 1) * labelFont * 1.15) / 2}
                    fontSize={labelFont}
                    dominantBaseline="central"
                    aria-hidden="true"
                  >
                    {lines.map((line, index) => (
                      <tspan key={index} x={g.x} dy={index ? labelFont * 1.15 : 0}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                )}
                {issue && (
                  <text
                    className="pw-plan-label pw-plan-alert"
                    x={g.x + font * 2}
                    y={g.y - font * 1.2}
                    fontSize={font}
                    aria-hidden="true"
                  >
                    !
                  </text>
                )}
              </a>
            );
          })}
          {camera.zoom < 1.8 &&
            (plan.labels || []).map((l, i) => (
              <text
                key={i}
                className="pw-plan-label pw-landmark"
                x={l.x}
                y={l.y}
                fontSize={font}
              >
                {l.text}
              </text>
            ))}
        </svg>
        <Minimap
          plan={plan}
          camera={camera}
          viewport={viewport}
          width={width}
          visible={clipped}
          onCenter={centerAt}
          onPan={pan}
        />
      </div>
      <div className="pw-plan-caption">
        {plan.sourceBased && (
          <div className="pw-plan-colour-key" aria-label="Space colours">
            {[["guest", "Guest rooms"], ["public", "Shared spaces"], ["circulation", "Circulation"], ["service", "Service"], ["outdoor", "Outdoor"]].map(([kind, label]) => (
              <span key={kind}><i className={`pw-plan-key-${kind}`} aria-hidden="true" />{label}</span>
            ))}
          </div>
        )}
        <span title={plan.sourceNote}>
          {plan.sourceBased
            ? `Source: ${plan.source?.drawing || "supplied architectural plan"}${plan.source?.date ? ` · ${plan.source.date}` : ""}`
            : "Illustrative test layout"}
        </span>
        <span>! Outstanding issue</span>
        {focusId && <span>Dashed outline · found space</span>}
        {selected.length > 0 && <span>Gold fill · selected</span>}
        <span className="pw-map-hint">{clipped ? "Drag to pan · " : ""}Ctrl + scroll to zoom</span>
      </div>
    </div>
  );
}
