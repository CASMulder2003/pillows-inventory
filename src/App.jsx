import { WorkspaceProvider, useWorkspace } from "./app/WorkspaceContext.jsx";
import { AppShell } from "./components/AppShell.jsx";
import { Button } from "./components/ui.jsx";
import { MediaProvider } from "./media/Media.jsx";
import { Overview } from "./pages/Overview.jsx";
import { Spaces } from "./pages/Spaces.jsx";
import { Catalogue } from "./pages/Catalogue.jsx";
import { SpaceDetail } from "./pages/SpaceDetail.jsx";
import { ProductDetail } from "./pages/ProductDetail.jsx";
import { Issues } from "./pages/Issues.jsx";
import { History } from "./pages/History.jsx";
import { Suppliers } from "./pages/Suppliers.jsx";
import { Account } from "./pages/Account.jsx";
import { Settings } from "./pages/Settings.jsx";
import { ChangeForm } from "./changes/ChangeForm.jsx";
import { FinishForm } from "./changes/FinishForm.jsx";

const screens = {
  overview: Overview,
  spaces: Spaces,
  catalogue: Catalogue,
  space: SpaceDetail,
  product: ProductDetail,
  issues: Issues,
  history: History,
  suppliers: Suppliers,
  supplier: Suppliers,
  account: Account,
  settings: Settings,
  form: ChangeForm,
  finish: FinishForm,
};

function Workspace() {
  const { route, signedOut, setSignedOut, appearance } = useWorkspace();
  const Screen = screens[route.page] || Overview;
  // A new record gets a fresh form draft; changing unrelated shared state does not reset it.
  const screenKey = [
    route.page,
    route.id,
    route.issueId,
    route.productId,
    route.action,
    route.spaceId,
    route.finishId,
  ]
    .filter(Boolean)
    .join(":");
  return (
    <div
      id="pillows-workspace"
      style={{
        colorScheme: appearance === "system" ? "light dark" : appearance,
      }}
    >
      {signedOut ? (
        <div className="pw-signed-out">
          <div className="pw-brand">
            PILLOWS<small>PROPERTY CATALOGUE</small>
          </div>
          <h1>Preview session ended</h1>
          <p>Open the demo account to continue exploring the catalogue.</p>
          <Button primary onClick={() => setSignedOut(false)}>
            Open demo account
          </Button>
        </div>
      ) : (
        <AppShell>
          <Screen key={screenKey} />
        </AppShell>
      )}
    </div>
  );
}

// App only assembles providers and the current screen. Feature code lives in its own module.
export default function App() {
  return (
    <MediaProvider>
      <WorkspaceProvider>
        <Workspace />
      </WorkspaceProvider>
    </MediaProvider>
  );
}
