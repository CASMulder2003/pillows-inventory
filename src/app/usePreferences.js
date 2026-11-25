import { useEffect, useState } from "react";

const key = "pillows-catalogue-appearance";
const valid = (value) => ["light", "dark", "system"].includes(value);
function readAppearance() {
  try {
    const value = localStorage.getItem(key);
    return valid(value) ? value : "system";
  } catch {
    return "system";
  }
}

// Only a display preference is saved locally; demo inventory and photos are session-only.
export function usePreferences() {
  const [appearance, setAppearance] = useState(readAppearance);
  const [density, setDensity] = useState("Compact");
  const [accent, setAccent] = useState("Restrained");
  useEffect(() => {
    try {
      localStorage.setItem(key, appearance);
    } catch {
      /* Storage may be disabled. */
    }
  }, [appearance]);
  return {
    appearance,
    changeAppearance: setAppearance,
    density,
    setDensity,
    accent,
    setAccent,
  };
}
