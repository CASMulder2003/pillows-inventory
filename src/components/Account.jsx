import { Menu } from "./Menu.jsx";

export function AccountMenu({ onAccount, onSettings, onLogout }) {
  return <div className="pw-account">
    <Menu label="Account menu" className="pw-account-menu" trigger={
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="9" r="3" />
          <path d="M5.6 19.7a6.5 6.5 0 0 1 12.8 0" />
        </svg>
    } items={[
      { id: "account", label: "Account", onSelect: onAccount },
      { id: "settings", label: "Settings", onSelect: onSettings },
      { id: "logout", label: "Log out", separatorBefore: true, onSelect: onLogout },
    ]} />
  </div>;
}

const appearanceOptions = [
  {
    id: "light",
    label: "Light",
    description: "Always use a light appearance.",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    id: "dark",
    label: "Dark",
    description: "Always use a dark appearance.",
    icon: <path d="M20.5 13A8.5 8.5 0 0 1 11 3.5a6.5 6.5 0 0 0 9.5 9.5Z" />,
  },
  {
    id: "system",
    label: "Device default",
    description: "Automatically follows your device's light or dark appearance.",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M12 17v4m-4 0h8" />
      </>
    ),
  },
];

export function AppearanceSettings({ value: appearance, onChange }) {
  const selectedOption = appearanceOptions.find((option) => option.id === appearance);

  return (
    <section className="pw-settings-section">
      <fieldset className="pw-appearance">
        <legend>Appearance</legend>
        <p>Choose how the catalogue looks on your device.</p>

        <div className="pw-theme-options">
          {appearanceOptions.map((option) => (
            <label key={option.id} className="pw-theme-option">
              <input
                type="radio"
                name="appearance"
                value={option.id}
                checked={appearance === option.id}
                onChange={() => onChange(option.id)}
              />
              <span className="pw-theme-choice">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  {option.icon}
                </svg>
                <span>{option.label}</span>
              </span>
            </label>
          ))}
        </div>

        <p className="pw-appearance-note" role="status">
          {selectedOption.description}
        </p>
      </fieldset>
    </section>
  );
}
