import { useState } from "react";
import { products, productById, spaceById } from "../data/inventory.js";
import { Button, Field, Select, Status, Heading } from "../components/ui.jsx";
import { PhotoEditor, PhotoGallery } from "../media/Media.jsx";
import { dateLabel } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// Collect a change request here; the inventory model validates the whole batch before saving.
export function ChangeForm() {
  const { back, commit, data, labelSpace, route } = useWorkspace();
  const linked = route.issueId
    ? data.issues.find((i) => i.id === route.issueId)
    : null;
  const [action, setAction] = useState(route.action),
    [pid, setPid] = useState(route.productId || linked?.productId || "lamp"),
    [qty, setQty] = useState(linked?.qty || 1),
    [reason, setReason] = useState(
      linked?.reason ||
        (route.action === "add" ? "Inventory update" : "Damaged"),
    ),
    [note, setNote] = useState(""),
    [replacement, setReplacement] = useState(
      route.productId || linked?.productId || "lamp",
    ),
    [outcome, setOutcome] = useState(
      linked && productById(linked.productId).kind === "finish"
        ? "Repainted"
        : "Replaced",
    ),
    [error, setError] = useState(""),
    [photoIds, setPhotoIds] = useState([]),
    [photoBusy, setPhotoBusy] = useState(false);
  const p = productById(pid),
    ids = linked ? [linked.spaceId] : route.spaceIds || [],
    targets = ids.map((id) => spaceById(data, id)),
    needsQty = p.kind === "object" && !linked;
  const title =
    action === "ordered"
      ? "Mark issue as ordered"
      : action === "resolve"
        ? "Resolve issue"
        : action === "add"
          ? "Add inventory"
          : "Report or change inventory";
  const request = {
    action,
    productId: pid,
    spaceIds: ids,
    qty: Number(qty),
    reason,
    note,
    replacementId: replacement,
    issueId: linked?.id,
    outcome,
    photoIds,
  };
  function save() {
    try {
      if (!linked && action !== "add" && !reason)
        throw new Error("Choose a reason.");
      if (!linked && reason === "Other" && !note.trim())
        throw new Error("Add a short note for Other.");
      commit(request);
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      {
        <Heading
          title={title}
          subtitle={`${targets.length === 1 ? labelSpace(targets[0]) : targets.length + " selected spaces"} · ${p.name}`}
        />
      }
      <div className="pw-form">
        {linked && (
          <div className="pw-form-preview">
            <Status value={linked.status} />
            <p>{linked.note}</p>
            <small>
              {linked.reason} · Reported {dateLabel(linked.date)}
            </small>
            <PhotoGallery ids={linked.photoIds} />
          </div>
        )}
        {!linked && action !== "add" && (
          <Field label="Action">
            <Select
              label="Inventory action"
              value={action}
              onChange={(v) => {
                setAction(v);
                setError("");
              }}
              options={
                p.kind === "finish"
                  ? [["report", "Report a surface issue"]]
                  : [
                      ["report", "Report damage / issue"],
                      ["replace", "Replace"],
                      ["add", "Add units"],
                      ["remove", "Remove units"],
                    ]
              }
            />
          </Field>
        )}
        {action === "add" && !route.productId && (
          <Field label="Catalogue item">
            <Select
              label="Item to add"
              value={pid}
              onChange={(v) => {
                setPid(v);
                setReplacement(v);
              }}
              options={products
                .filter((p) => p.kind === "object")
                .map((p) => [p.id, p.name + " · " + p.code])}
            />
          </Field>
        )}
        {action === "resolve" && (
          <Field label="How was it resolved?">
            <Select
              label="Resolution outcome"
              value={outcome}
              onChange={setOutcome}
              options={
                p.kind === "finish"
                  ? [["Repainted", "Repainted with the recorded finish"]]
                  : [
                      ["Replaced", "Replaced"],
                      ["Repaired", "Repaired"],
                      ["Removed", "Removed without replacement"],
                    ]
              }
            />
          </Field>
        )}
        <div className="pw-form-grid">
          {needsQty && (
            <Field
              label={targets.length > 1 ? "Quantity per space" : "Quantity"}
            >
              <input
                aria-label="Quantity"
                type="number"
                min="1"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </Field>
          )}
          {!linked && (
            <Field label="Reason">
              <Select
                label="Change reason"
                value={reason}
                onChange={setReason}
                options={[
                  "Damaged",
                  "Defect",
                  "Wear and tear",
                  "Missing",
                  "Refurbishment",
                  "Inventory update",
                  "Other",
                ].map((v) => [v, v])}
              />
            </Field>
          )}
        </div>
        {(action === "replace" ||
          (action === "resolve" && outcome === "Replaced")) && (
          <Field label="Replacement model">
            <Select
              label="Replacement model"
              value={replacement}
              onChange={setReplacement}
              options={products
                .filter((p) => p.kind === "object")
                .map((p) => [
                  p.id,
                  p.id === pid
                    ? "Same model · " + p.name
                    : p.name + " · " + p.code,
                ])}
            />
          </Field>
        )}
        <Field
          label={action === "report" ? "Describe the issue" : "Note (optional)"}
        >
          <textarea
            aria-label="Change note"
            placeholder={
              action === "report"
                ? "What is wrong, and where exactly?"
                : "Optional context for the next person"
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength="240"
          />
        </Field>
        <PhotoEditor
          ids={photoIds}
          onChange={setPhotoIds}
          onBusy={setPhotoBusy}
        />
        <div className="pw-form-preview">
          <h3>Review before saving</h3>
          <details open={targets.length <= 6}>
            <summary>
              {targets.length} affected{" "}
              {targets.length === 1 ? "space" : "spaces"}
            </summary>
            <p>{targets.map((s) => labelSpace(s)).join(", ")}</p>
          </details>
          <p>
            {p.kind === "object"
              ? `${Number(qty) || 0} unit${Number(qty) === 1 ? "" : "s"} ${targets.length > 1 ? "per space · " + (Number(qty) || 0) * targets.length + " units in total" : ""}`
              : "Applies to the recorded surface finish."}
          </p>
          <p>
            {action === "report"
              ? "Creates an outstanding issue. Installed quantities stay the same."
              : action === "ordered"
                ? "Records the order status only. No purchase is sent."
                : action === "replace" ||
                    (action === "resolve" && outcome === "Replaced")
                  ? `Replaces ${p.name} with ${productById(replacement).name}.`
                  : action === "remove" ||
                      (outcome === "Removed" && action === "resolve")
                    ? "Reduces installed inventory."
                    : action === "resolve"
                      ? "Closes this issue and records the outcome."
                      : "Adds to the installed quantity."}
          </p>
          {!linked && targets.length > 1 && (
            <small>The whole batch is checked before any record changes.</small>
          )}
        </div>
        {error && (
          <div className="pw-error" role="alert">
            {error}
          </div>
        )}
        <div className="pw-actions">
          <Button primary disabled={photoBusy} onClick={save}>
            {action === "ordered"
              ? "Confirm ordered"
              : action === "resolve"
                ? "Save resolution"
                : "Save change"}
          </Button>
          <Button onClick={back}>Cancel</Button>
        </div>
      </div>
    </>
  );
}
