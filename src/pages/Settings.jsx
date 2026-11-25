import { AppearanceSettings } from "../components/Account.jsx";
import { Heading, Field, Select } from "../components/ui.jsx";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

export function Settings() {
  const {
    appearance,
    changeAppearance,
    density,
    setDensity,
    accent,
    setAccent,
    access,
    changeAccess,
  } = useWorkspace();
  return (
    <>
      <Heading title="Settings" subtitle="Personal preferences" />
      <AppearanceSettings value={appearance} onChange={changeAppearance} />
      <section className="pw-settings-section">
        <div className="pw-toolbar">
          <Field label="Table spacing">
            <Select
              label="Table spacing"
              value={density}
              onChange={setDensity}
              options={["Compact", "Comfortable"].map((value) => [
                value,
                value,
              ])}
            />
          </Field>
          <Field label="Action colour">
            <Select
              label="Action colour"
              value={accent}
              onChange={setAccent}
              options={["Restrained", "Gold"].map((value) => [value, value])}
            />
          </Field>
        </div>
        <details>
          <summary>Demo account scope</summary>
          <p className="pw-definition">
            Preview how different account scopes affect the catalogue. Real
            access permissions will be managed by the server.
          </p>
          <Field label="Preview access">
            <Select
              label="Preview access"
              value={access}
              onChange={changeAccess}
              options={[
                "Hotel team",
                "Assigned hotels",
                "Central oversight",
              ].map((value) => [value, value])}
            />
          </Field>
        </details>
      </section>
    </>
  );
}
