import { useState } from "react";
import { products, productById, spaceById } from "../data/inventory.js";
import { Button, Field, Select, Heading } from "../components/ui.jsx";
import { PhotoEditor } from "../media/Media.jsx";
import { levelName } from "../app/selectors.js";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// Add or edit one applied surface; an unknown area stays null.
export function FinishForm() {
  const { back, commit, data, route } = useWorkspace();
  const space = spaceById(data, route.spaceId),
    finish = space.finishes.find((f) => f.id === route.finishId),
    adding = !route.finishId;
  const [productId, setProduct] = useState(finish?.productId || products.find((p) => p.kind === "finish").id),
    [surface, setSurface] = useState(finish?.surface || ""),
    [area, setArea] = useState(finish?.area ?? ""),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [photoIds, setPhotoIds] = useState([]),
    [photoBusy, setPhotoBusy] = useState(false);
  const old = finish && productById(finish.productId),
    chosen = productById(productId);
  function save() {
    try {
      commit({
        action: adding ? "finish-add" : "finish",
        spaceIds: [space.id],
        finishId: finish?.id,
        surface,
        productId,
        area: area === "" ? null : Number(area),
        note,
        photoIds,
      });
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      {
        <Heading
          title={adding ? "Add paint / finish" : `Edit ${finish.surface.toLowerCase()}`}
          subtitle={`${space.name} · ${levelName(space.hotelId, space.floor)}`}
        />
      }
      <div className="pw-form">
        {adding && (
          <Field label="Surface">
            <input
              aria-label="Surface name"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              placeholder="For example, main walls, ceiling or door frames"
              maxLength="80"
              required
            />
          </Field>
        )}
        <Field label="Paint / finish specification">
          <Select
            label="Applied paint"
            value={productId}
            onChange={setProduct}
            options={products
              .filter((p) => p.kind === "finish")
              .map((p) => [p.id, `${p.name} · ${p.colour} · ${p.finish}`])}
          />
        </Field>
        <Field label="Recorded surface area (m², optional)">
          <input
            aria-label="Surface area"
            type="number"
            min="0"
            step="0.1"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </Field>
        <Field label="Note (optional)">
          <textarea
            aria-label="Finish note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="For example, corrected the colour reference after checking the room."
            maxLength="240"
          />
        </Field>
        <PhotoEditor
          ids={photoIds}
          onChange={setPhotoIds}
          onBusy={setPhotoBusy}
        />
        <div className="pw-form-preview">
          <h3>
            {space.name}{surface.trim() ? ` · ${surface.trim()}` : ""}
          </h3>
          <p>
            {old && old.id !== productId ? `${old.name} → ` : ""}{chosen.name}
          </p>
          <p>{area === "" ? "Area not recorded" : `${area} m²`}</p>
          <small>
            {adding
              ? "Adds this surface to the space. Existing surfaces stay unchanged."
              : "Updates this surface only. The previous specification stays in history."}
          </small>
        </div>
        {error && (
          <div className="pw-error" role="alert">
            {error}
          </div>
        )}
        <div className="pw-actions">
          <Button primary disabled={photoBusy} onClick={save}>
            {adding ? "Add finish" : "Save finish"}
          </Button>
          <Button onClick={back}>Cancel</Button>
        </div>
      </div>
    </>
  );
}
