import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Shared by the hotel switcher and row actions. The portal escapes table clipping
// while staying inside the workspace so it inherits the chosen theme.
export function Menu({ label, trigger, items, className = "", align = "end" }) {
  const id = useId();
  const button = useRef(null), panel = useRef(null), initialFocus = useRef("selected");
  const [open, setOpen] = useState(false), [position, setPosition] = useState(null);
  const enabledItems = () => [...(panel.current?.querySelectorAll('[role^="menuitem"]:not(:disabled)') || [])];

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) button.current?.focus({ preventScroll: true });
  }
  function show(focus = "selected") {
    initialFocus.current = focus;
    setPosition(null);
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open || !button.current || !panel.current) return;
    const anchor = button.current.getBoundingClientRect(), menu = panel.current.getBoundingClientRect();
    const viewport = document.documentElement;
    const left = align === "start" ? anchor.left : anchor.right - menu.width;
    const top = anchor.bottom + 6 + menu.height <= viewport.clientHeight - 12
      ? anchor.bottom + 6 : Math.max(12, anchor.top - menu.height - 6);
    setPosition({ top, left: Math.max(12, Math.min(left, viewport.clientWidth - menu.width - 12)) });
    const choices = enabledItems();
    const target = initialFocus.current === "last" ? choices.at(-1)
      : initialFocus.current === "first" ? choices[0]
        : choices.find((choice) => choice.getAttribute("aria-checked") === "true") || choices[0];
    target?.focus({ preventScroll: true });
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (!button.current?.contains(e.target) && !panel.current?.contains(e.target)) setOpen(false);
    };
    const scroll = (e) => { if (!panel.current?.contains(e.target)) setOpen(false); };
    const resize = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  function navigate(e) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); return; }
    // Return to the trigger before the browser performs its normal Tab movement.
    if (e.key === "Tab") { close(true); return; }
    const choices = enabledItems(), current = choices.indexOf(document.activeElement);
    let next;
    if (e.key === "ArrowDown") next = (current + 1) % choices.length;
    if (e.key === "ArrowUp") next = (current - 1 + choices.length) % choices.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = choices.length - 1;
    if (next !== undefined) { e.preventDefault(); choices[next]?.focus(); }
  }

  return (
    <div className={`pw-menu ${className}`}>
      <button ref={button} type="button" className="pw-menu-trigger" aria-label={label}
        aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => open ? close(true) : show()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault(); show(e.key === "ArrowUp" ? "last" : "first");
          }
        }}>
        {trigger}
        <svg className="pw-menu-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="m1 1 5 5 5-5" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      {open && createPortal(
        <div ref={panel} id={id} role="menu" aria-label={label} className={`pw-menu-panel ${className}`}
          style={position || { top: 0, left: 0, opacity: 0, pointerEvents: "none" }} onKeyDown={navigate}>
          {items.map((item, index) => (
            <button key={item.id} type="button" role={item.selected === undefined ? "menuitem" : "menuitemradio"}
              aria-label={item.label} aria-checked={item.selected} tabIndex={-1} disabled={item.disabled}
              aria-describedby={item.description ? `${id}-${index}-description` : undefined}
              className={`pw-menu-item${item.separatorBefore ? " separated" : ""}${item.danger ? " danger" : ""}`}
              onClick={() => { close(true); item.onSelect(); }}>
              <span><span className="pw-menu-item-label">{item.label}</span>
                {item.description && <small id={`${id}-${index}-description`}>{item.description}</small>}</span>
              {item.selected && <span className="pw-menu-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>, document.getElementById("pillows-workspace"),
      )}
    </div>
  );
}
