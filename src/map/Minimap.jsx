import { useRef, useState } from "react";
import { Button } from "../components/ui.jsx";

// SVG's transform accounts for both scaling and letterboxing of a wide floor plan.
function planPoint(e) {
  const svg = e.currentTarget.querySelector("svg");
  const matrix = svg?.getScreenCTM();
  if (!matrix) return null;
  const point = svg.createSVGPoint();
  point.x = e.clientX;
  point.y = e.clientY;
  return point.matrixTransform(matrix.inverse());
}

/** An overlay: opening it never changes the stage height or shifts the page. */
export function Minimap({
  plan,
  camera,
  viewport,
  width,
  visible,
  onCenter,
  onPan,
}) {
  const [preference, setPreference] = useState(null);
  const drag = useRef(null);
  const showOverview = preference ?? (width >= 600 && plan.shapes.length > 16);

  function startDrag(e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const point = planPoint(e);
    if (!point) return;
    const inside =
      point.x >= viewport.x &&
      point.x <= viewport.right &&
      point.y >= viewport.y &&
      point.y <= viewport.bottom;
    // Preserve the grabbed point inside the viewport, rather than snapping its centre.
    drag.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      offsetX: inside ? camera.x - point.x : 0,
      offsetY: inside ? camera.y - point.y : 0,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveDrag(e) {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    e.stopPropagation();
    if (
      !gesture.moved &&
      Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) <= 3
    )
      return;
    const point = planPoint(e);
    if (!point) return;
    gesture.moved = true;
    onCenter(point.x + gesture.offsetX, point.y + gesture.offsetY);
  }
  function endDrag(e) {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    e.stopPropagation();
    // A click recentres; releasing a drag must not trigger a second jump.
    if (!gesture.moved && e.type !== "pointercancel") {
      const point = planPoint(e);
      if (point) onCenter(point.x, point.y);
    }
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function keyDown(e) {
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowRight: [1, 0],
    };
    if (directions[e.key]) {
      e.preventDefault();
      onPan(...directions[e.key]);
    }
  }
  if (!visible) return null;

  return (
    <div
      className="pw-map-overview"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button
        quiet
        aria-label={showOverview ? "Hide minimap" : "Show minimap"}
        aria-expanded={showOverview}
        onClick={() => setPreference(!showOverview)}
      >
        {showOverview ? "Minimise map" : "Minimap"}
      </Button>
      {showOverview && (
        <button
          type="button"
          className="pw-minimap-button"
          aria-label="Recentre floor plan. Drag the visible area or use arrow keys."
          onClick={(e) => {
            if (e.detail === 0) onCenter(plan.width / 2, plan.height / 2);
          }}
          onKeyDown={keyDown}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
        >
          <svg
            className="pw-minimap"
            viewBox={`0 0 ${plan.width} ${plan.height}`}
            role="img"
            aria-label="Floor overview showing the visible area"
          >
            {(plan.context || []).map((region, index) => (
              <path key={`context-${index}`} d={region.path} fillRule="evenodd" />
            ))}
            <path d={plan.outline} fillRule="evenodd" />
            {plan.shapes.map((shape) => (
              <path key={shape.spaceId} d={shape.path} fillRule="evenodd" />
            ))}
            <rect
              x={viewport.x}
              y={viewport.y}
              width={viewport.right - viewport.x}
              height={viewport.bottom - viewport.y}
              className="pw-viewport"
            />
          </svg>
        </button>
      )}
      {showOverview && <div
        className="pw-overview-arrows"
        role="group"
        aria-label="Pan floor plan"
      >
        {[
          ["←", -1, 0, "Pan left"],
          ["↑", 0, -1, "Pan up"],
          ["↓", 0, 1, "Pan down"],
          ["→", 1, 0, "Pan right"],
        ].map(([label, x, y, aria]) => (
          <Button key={aria} aria-label={aria} onClick={() => onPan(x, y)}>
            {label}
          </Button>
        ))}
      </div>}
    </div>
  );
}
