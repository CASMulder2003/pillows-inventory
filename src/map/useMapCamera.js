import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// View memory belongs to the browser session, never to the hotel's inventory.
const cameraMemory = new Map();

/** Keep the camera inside the plan. A view larger than the plan stays centred. */
export function clampCamera(next, plan, fit) {
  const zoom = Math.max(1, Math.min(6, next.zoom));
  const width = fit.width / zoom;
  const height = fit.height / zoom;
  return {
    zoom,
    x:
      width >= plan.width
        ? plan.width / 2
        : Math.max(width / 2, Math.min(plan.width - width / 2, next.x)),
    y:
      height >= plan.height
        ? plan.height / 2
        : Math.max(height / 2, Math.min(plan.height - height / 2, next.y)),
  };
}

/** Keep the plan coordinate under the pointer fixed while zooming. */
export function zoomAround(camera, zoom, point, fit) {
  const delta = 1 / camera.zoom - 1 / zoom;
  return {
    zoom,
    x: camera.x + (point.x - 0.5) * fit.width * delta,
    y: camera.y + (point.y - 0.5) * fit.height * delta,
  };
}

function shapeBounds(shapes) {
  return shapes.reduce(
    (bounds, shape) => ({
      left: Math.min(bounds.left, shape.bounds.x),
      top: Math.min(bounds.top, shape.bounds.y),
      right: Math.max(bounds.right, shape.bounds.x + shape.bounds.width),
      bottom: Math.max(bounds.bottom, shape.bounds.y + shape.bounds.height),
    }),
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
  );
}

// Sparse floors open on their occupied wing; the full building remains available
// by panning or zooming back to 100%. Ordinary floors retain their full-plan fit.
export function fitFloorCamera(plan, fit) {
  const full = { x: plan.width / 2, y: plan.height / 2, zoom: 1 };
  if (!plan.sourceBased || !plan.shapes.length) return full;
  const bounds = shapeBounds(plan.shapes),
    width = bounds.right - bounds.left,
    height = bounds.bottom - bounds.top;
  if (width <= 0 || height <= 0 || width * height >= plan.width * plan.height / 3)
    return full;
  const padding = Math.max(24, Math.max(width, height) * 0.08);
  return clampCamera({
    x: (bounds.left + bounds.right) / 2,
    y: (bounds.top + bounds.bottom) / 2,
    zoom: Math.min(fit.width / (width + padding * 2), fit.height / (height + padding * 2)),
  }, plan, fit);
}

/**
 * The camera uses SVG plan units; pointer gestures arrive in screen pixels.
 * All input paths end in setCamera, which applies the same zoom and pan bounds.
 * The stage height depends on plan proportions and available width, never zoom.
 */
export function useMapCamera({ plan, memoryKey, compact, focusId }) {
  const cached = cameraMemory.get(memoryKey);
  const [width, setWidth] = useState(() => cached?.width || 600);
  const [windowHeight, setWindowHeight] = useState(() =>
    typeof window === "undefined" ? 900 : window.innerHeight,
  );
  const stageRef = useRef(null);
  const drawingRef = useRef(null);
  const drag = useRef(null);
  const lastDrag = useRef(0);
  const priorContext = useRef({
    key: memoryKey,
    focusId: cached?.focusId ?? null,
  });

  const naturalHeight = (width * plan.height) / plan.width;
  const sourceLimit = Math.max(
    compact ? 280 : 320,
    Math.min(compact ? 420 : 640, windowHeight - 230),
  );
  const height = plan.sourceBased
    ? Math.min(sourceLimit, Math.max(width < 500 ? 300 : 380, naturalHeight))
    : compact
      ? Math.max(160, Math.min(330, naturalHeight))
      : Math.max(width < 400 ? 200 : 260, Math.min(440, naturalHeight));
  const fitWidth = Math.max(plan.width, (plan.height * width) / height);
  const fitHeight = (fitWidth * height) / width;
  const fitSize = useMemo(
    () => ({ width: fitWidth, height: fitHeight }),
    [fitWidth, fitHeight],
  );
  const planSize = useMemo(
    () => ({ width: plan.width, height: plan.height }),
    [plan.width, plan.height],
  );
  const fitted = fitFloorCamera(plan, fitSize);
  const initialCamera = useMemo(() => fitted, [fitted.x, fitted.y, fitted.zoom]);
  const [viewState, setViewState] = useState(() => ({
    key: memoryKey,
    camera: cached?.camera || initialCamera,
  }));
  const camera =
    viewState.key === memoryKey
      ? viewState.camera
      : cached?.camera || initialCamera;
  const setCamera = useCallback(
    (update) => {
      setViewState((previous) => {
        const current =
          previous.key === memoryKey
            ? previous.camera
            : cameraMemory.get(memoryKey)?.camera || initialCamera;
        const next = clampCamera(
          typeof update === "function" ? update(current) : update,
          planSize,
          fitSize,
        );
        return previous.key === memoryKey &&
          current.x === next.x &&
          current.y === next.y &&
          current.zoom === next.zoom
          ? previous
          : { key: memoryKey, camera: next };
      });
    },
    [memoryKey, initialCamera, planSize, fitSize],
  );
  const view = {
    width: fitWidth / camera.zoom,
    height: fitHeight / camera.zoom,
    x: camera.x - fitWidth / camera.zoom / 2,
    y: camera.y - fitHeight / camera.zoom / 2,
  };
  const bounds = plan.sourceBased
    ? { left: 0, top: 0, right: plan.width, bottom: plan.height }
    : shapeBounds(plan.shapes);
  const clipped =
    plan.shapes.length > 0 &&
    (view.x > bounds.left + 0.5 ||
      view.y > bounds.top + 0.5 ||
      view.x + view.width < bounds.right - 0.5 ||
      view.y + view.height < bounds.bottom - 0.5);
  const viewport = {
    x: Math.max(0, view.x),
    y: Math.max(0, view.y),
    right: Math.min(plan.width, view.x + view.width),
    bottom: Math.min(plan.height, view.y + view.height),
  };

  const focusBounds = useCallback(
    (bounds) => {
      const zoom = Math.min(
        fitWidth / (bounds.width * 2),
        fitHeight / (bounds.height * 2),
      );
      setCamera({
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
        zoom,
      });
    },
    [fitWidth, fitHeight, setCamera],
  );
  function focusShape(spaceId) {
    const shape = plan.shapes.find((shape) => shape.spaceId === spaceId);
    if (shape) focusBounds(shape.bounds);
  }
  function fitSelection(ids) {
    const shapes = plan.shapes.filter((shape) => ids.includes(shape.spaceId));
    if (!shapes.length) return;
    const bounds = shapeBounds(shapes);
    focusBounds({
      x: bounds.left,
      y: bounds.top,
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
    });
  }
  function pan(dx, dy) {
    setCamera((current) => ({
      ...current,
      x: current.x + ((dx * fitWidth) / current.zoom) * 0.22,
      y: current.y + ((dy * fitHeight) / current.zoom) * 0.22,
    }));
  }
  function centerAt(x, y) {
    setCamera((current) => ({ ...current, x, y }));
  }
  function zoomBy(factor) {
    setCamera((current) => ({ ...current, zoom: current.zoom * factor }));
  }
  function fit() {
    setCamera(initialCamera);
  }
  function rememberView() {
    cameraMemory.set(memoryKey, { camera, width, focusId });
  }

  function startDrag(e) {
    if (clipped && e.button === 0) {
      drag.current = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        start: camera,
        moved: false,
      };
    }
  }
  function moveDrag(e) {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== e.pointerId) return;
    // A mouse can leave the stage before crossing the drag threshold. Ignore a
    // later re-entry after its button was released outside the stage.
    if (e.pointerType === "mouse" && !(e.buttons & 1)) {
      stopDrag(e);
      return;
    }
    const dx = e.clientX - gesture.x;
    const dy = e.clientY - gesture.y;
    if (Math.hypot(dx, dy) <= 6 && !gesture.moved) return;
    if (!gesture.moved) e.currentTarget.setPointerCapture(e.pointerId);
    gesture.moved = true;
    setCamera({
      ...gesture.start,
      x: gesture.start.x - (dx * fitWidth) / (width * gesture.start.zoom),
      y: gesture.start.y - (dy * fitHeight) / (height * gesture.start.zoom),
    });
  }
  function stopDrag(e) {
    if (drag.current?.moved) lastDrag.current = Date.now();
    drag.current = null;
    if (e?.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function keyDown(e) {
    // Room links keep their native Enter behaviour; shortcuts belong to the stage.
    if (e.target !== e.currentTarget) return;
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (directions[e.key]) pan(...directions[e.key]);
    else if (e.key === "+" || e.key === "=") zoomBy(1.4);
    else if (e.key === "-") zoomBy(1 / 1.4);
    else if (e.key === "Escape" || e.key === "0") fit();
    else return;
    e.preventDefault();
  }
  // A pointer-up following a pan must not also open the room underneath it.
  function canActivateSpace() {
    return Date.now() - lastDrag.current > 350;
  }

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(stageRef.current);
    const resize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);
  useEffect(() => {
    const previous = priorContext.current;
    priorContext.current = { key: memoryKey, focusId };
    if (
      focusId &&
      (previous.key !== memoryKey || previous.focusId !== focusId)
    ) {
      const found = plan.shapes.find((shape) => shape.spaceId === focusId);
      if (found) focusBounds(found.bounds);
    }
  }, [memoryKey, focusId, plan.shapes, focusBounds]);
  useEffect(() => setCamera((current) => current), [setCamera]);
  useEffect(() => {
    if (viewState.key === memoryKey)
      cameraMemory.set(memoryKey, { camera: viewState.camera, width, focusId });
  }, [viewState, memoryKey, width, focusId]);
  useEffect(() => {
    const element = drawingRef.current;
    const wheel = (e) => {
      // Normal scrolling remains page scrolling. Zoom is an explicit Ctrl gesture.
      if (!e.ctrlKey || !e.deltaY || !e.cancelable) return;
      e.preventDefault();
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const delta =
        e.deltaY *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1);
      const point = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
      setCamera((current) => {
        const zoom = Math.max(
          1,
          Math.min(
            6,
            current.zoom *
              Math.exp(-Math.max(-300, Math.min(300, delta)) * 0.0025),
          ),
        );
        return zoomAround(current, zoom, point, fitSize);
      });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [setCamera, fitSize]);

  return {
    stageRef,
    drawingRef,
    camera,
    view,
    viewport,
    clipped,
    width,
    height,
    font: ((width < 400 ? 12 : 14) * view.width) / width,
    pan,
    centerAt,
    zoomBy,
    fit,
    fitSelection,
    focusShape,
    rememberView,
    canActivateSpace,
    stageEvents: {
      onPointerDown: startDrag,
      onPointerMove: moveDrag,
      onPointerUp: stopDrag,
      onPointerCancel: stopDrag,
      onPointerLeave: (e) => { if (!drag.current?.moved) stopDrag(e); },
      onLostPointerCapture: stopDrag,
      onKeyDown: keyDown,
    },
  };
}
