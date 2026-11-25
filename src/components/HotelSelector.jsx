import { Menu } from "./Menu.jsx";

export function HotelSelector({ hotels, value, onChange }) {
  const hotel = hotels.find((entry) => entry.id === value);
  const items = hotels.map((entry) => ({
    id: entry.id, label: entry.name, description: entry.property,
    selected: value === entry.id, onSelect: () => { if (entry.id !== value) onChange(entry.id); },
  }));
  items.push({
    id: "all", label: "All accessible hotels", description: "Collection overview and combined catalogue",
    selected: value === "all", separatorBefore: true, onSelect: () => { if (value !== "all") onChange("all"); },
  });
  return <Menu label="Choose hotel" className="pw-hotel-selector" align="start" items={items}
    trigger={<span className="pw-hotel-selection">
      <strong>{hotel?.name || "All accessible hotels"}</strong>
      <small>{hotel?.property || "Pillows collection"}</small>
    </span>} />;
}
