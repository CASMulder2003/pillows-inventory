import { useEffect, useState, useSyncExternalStore } from "react";

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

// Observe the device setting so System follows changes without reloading.
function subscribeDeviceTheme(notify) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}
function readDeviceTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Only a display preference is saved locally; demo inventory and photos are session-only.
export function usePreferences() {
  const [appearance, setAppearance] = useState(readAppearance);
  const deviceTheme = useSyncExternalStore(subscribeDeviceTheme, readDeviceTheme, () => "light");
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
    resolvedAppearance: appearance === "system" ? deviceTheme : appearance,
    changeAppearance: setAppearance,
    density,
    setDensity,
    accent,
    setAccent,
  };
}
