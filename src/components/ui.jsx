import React, { useEffect, useRef, useState } from "react";
export const Button = ({
  children,
  onClick,
  primary = false,
  quiet = false,
  link = false,
  ...props
}) => (
  <button
    type="button"
    className={`${primary ? "primary" : quiet ? "quiet" : link ? "link" : ""}`}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);
export const Field = ({ label, children, className = "" }) => (
  <label className={`field ${className}`}>
    <span>{label}</span>
    {children}
  </label>
);
export const Select = ({ value, onChange, label, options }) => (
  <select
    aria-label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    {options.map(([id, name]) => (
      <option key={id} value={id}>
        {name}
      </option>
    ))}
  </select>
);

export function Table({ head, children, label }) {
  const rows = React.Children.toArray(children),
    [page, setPage] = useState(0),
    size = 12,
    max = Math.max(1, Math.ceil(rows.length / size)),
    current = Math.min(page, max - 1);
  useEffect(() => setPage(0), [label, rows.length, rows[0]?.key]);
  return (
    <>
      <div className="pw-table-wrap">
        <table className="pw-table" aria-label={label}>
          <thead>
            <tr>
              {head.map((h, i) => (
                <th
                  key={i}
                  className={typeof h === "object" ? h.className : ""}
                  scope="col"
                >
                  {typeof h === "object" ? h.label : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows.slice(current * size, (current + 1) * size)}</tbody>
        </table>
      </div>
      {max > 1 && (
        <div className="pw-results pw-table-pagination">
          <span>
            {current * size + 1}–{Math.min((current + 1) * size, rows.length)}{" "}
            of {rows.length}
          </span>
          <div className="pw-actions">
            <Button disabled={!current} onClick={() => setPage(current - 1)}>
              Previous
            </Button>
            <Button
              disabled={current === max - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
export function Checkbox({ checked, mixed = false, label, onChange }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}
export function Empty({
  title = "No matching records",
  text = "Try a different search or clear the filters.",
  clear,
}) {
  return (
    <div className="pw-empty">
      <h3>{title}</h3>
      <p>{text}</p>
      {clear && <Button onClick={clear}>Clear filters</Button>}
    </div>
  );
}
export function Status({ value }) {
  return <span className={`pw-status ${value.toLowerCase()}`}>{value}</span>;
}

export function Heading({ title, subtitle, actions }) {
  return (
    <div className="pw-heading">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="pw-muted">{subtitle}</p>}
      </div>
      {actions && <div className="pw-actions">{actions}</div>}
    </div>
  );
}
