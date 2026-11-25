import React, { createContext, useContext, useRef, useState } from "react";
import { Button } from "../components/ui.jsx";
import samplePhotos from "./sample-photos.json";

const MediaContext = createContext(null);
const defaultProductPhotos = { lamp: ["sample-lamp"], chair: ["sample-chair"] };

export function MediaProvider({ children }) {
  const [photos, setPhotos] = useState(samplePhotos),
    [productPhotos, setProductPhotos] = useState(defaultProductPhotos);
  const addPhotos = (records) =>
    setPhotos((previous) => ({
      ...previous,
      ...Object.fromEntries(records.map((record) => [record.id, record])),
    }));
  return (
    <MediaContext.Provider
      value={{ photos, productPhotos, addPhotos, setProductPhotos }}
    >
      {children}
    </MediaContext.Provider>
  );
}

export function ProductThumb({ product }) {
  const { photos, productPhotos } = useContext(MediaContext),
    photo = photos[productPhotos[product.id]?.[0]];
  return (
    <span aria-hidden="true" className={"pw-thumb " + product.id}>
      {photo ? (
        <img src={photo.src} alt="" loading="lazy" />
      ) : product.kind === "finish" ? (
        ""
      ) : (
        <span className="pw-no-photo">No photo</span>
      )}
    </span>
  );
}

export function PhotoGallery({ ids = [], large = false }) {
  const { photos } = useContext(MediaContext),
    [open, setOpen] = useState(null);
  if (!ids.length) return null;
  const expanded = photos[open];
  return (
    <div className={"pw-photo-gallery " + (large ? "large" : "")}>
      <div className="pw-photo-strip">
        {ids.map((id, index) => {
          const photo = photos[id];
          return photo ? (
            <button
              key={id}
              type="button"
              className="pw-photo-button"
              aria-label={`Open photo ${index + 1}: ${photo.name}`}
              aria-expanded={open === id}
              onClick={() => setOpen(open === id ? null : id)}
            >
              <img src={photo.src} alt={photo.name} loading="lazy" />
            </button>
          ) : (
            <span key={id} className="pw-photo-unavailable">
              Photo from a previous preview session
            </span>
          );
        })}
      </div>
      {expanded && (
        <div className="pw-photo-expanded">
          <div className="pw-sectionbar">
            <span>{expanded.name}</span>
            <Button onClick={() => setOpen(null)}>Close photo</Button>
          </div>
          <img src={expanded.src} alt={expanded.name} />
        </div>
      )}
    </div>
  );
}

// Local demo previews only. A future backend will store originals separately from display copies.
async function readPhoto(file) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPG, PNG or WebP photo. HEIC is not supported in this preview.",
    );
  if (file.size > 12 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 12 MB.");
  const src = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("This photo could not be read. Try choosing it again."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const value = new Image();
    value.onload = () => resolve(value);
    value.onerror = () =>
      reject(
        new Error(
          "This file could not be opened as a photo. Try another image.",
        ),
      );
    value.src = src;
  });
  if (
    !image.naturalWidth ||
    image.naturalWidth * image.naturalHeight > 60000000
  )
    throw new Error(
      "This image is too large to preview. Choose a smaller copy.",
    );
  const scale = Math.min(
    1,
    1600 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    id: `local-${crypto.randomUUID()}`,
    name: file.name,
    src: canvas.toDataURL("image/jpeg", 0.88),
  };
}

export function PhotoEditor({ ids, onChange, onBusy = () => {} }) {
  const { photos, addPhotos } = useContext(MediaContext),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    input = useRef();
  async function attach(e) {
    const files = [...e.target.files];
    e.target.value = "";
    setError("");
    if (!files.length) return;
    if (ids.length + files.length > 3) {
      setError("Keep up to 3 photos. Remove one before adding more.");
      return;
    }
    setBusy(true);
    onBusy(true);
    try {
      const records = await Promise.all(files.map(readPhoto));
      addPhotos(records);
      onChange([...ids, ...records.map((record) => record.id)]);
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <div className="pw-photo-editor">
      <div className="pw-sectionbar">
        <h3>
          Photos <small>(optional)</small>
        </h3>
        <span>{ids.length} / 3</span>
      </div>
      <div className="pw-photo-attachments">
        {ids.map((id, index) => (
          <div key={id}>
            {photos[id] ? (
              <img src={photos[id].src} alt={photos[id].name} />
            ) : (
              <span>Preview photo unavailable</span>
            )}
            <Button
              quiet
              disabled={busy}
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => onChange(ids.filter((value) => value !== id))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <label className="pw-upload-label">
        Add photos
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-label="Add optional photos"
          disabled={busy || ids.length === 3}
          onChange={attach}
        />
      </label>
      <small className="pw-muted">
        JPG, PNG or WebP · Up to 12 MB each. No cropping needed.
      </small>
      {busy && <p role="status">Preparing photo previews…</p>}
      {error && (
        <div className="pw-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export function ProductPhotos({ product }) {
  const { productPhotos, setProductPhotos } = useContext(MediaContext),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState([]),
    [busy, setBusy] = useState(false);
  const ids = productPhotos[product.id] || [];
  return (
    <div className="pw-product-photos">
      {editing ? (
        <>
          <PhotoEditor ids={draft} onChange={setDraft} onBusy={setBusy} />
          <div className="pw-actions">
            <Button
              primary
              disabled={busy}
              onClick={() => {
                setProductPhotos((value) => ({
                  ...value,
                  [product.id]: draft,
                }));
                setEditing(false);
              }}
            >
              Save photos
            </Button>
            <Button disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          {ids.length ? (
            <PhotoGallery ids={ids} large />
          ) : product.kind === "finish" ? (
            <div
              className={"pw-colour-sample pw-thumb " + product.id}
              aria-label={"Illustrative colour sample: " + product.colour}
            />
          ) : (
            <div className="pw-image-empty">No photo added</div>
          )}
          <Button
            link
            onClick={() => {
              setDraft([...ids]);
              setEditing(true);
            }}
          >
            {ids.length ? "Manage photos" : "Add photos"}
          </Button>
          <small>
            {product.kind === "finish"
              ? "Screen colours are indicative. Use the colour reference when ordering."
              : ids.length
                ? "Open a photo to see the complete image."
                : "A photo is optional."}
          </small>
        </>
      )}
    </div>
  );
}
