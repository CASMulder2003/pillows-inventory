import { useWorkspace } from "../app/WorkspaceContext.jsx";
import { Heading } from "../components/ui.jsx";

// Display only: Django will enforce account permissions when authentication is added.
export function Account() {
  const { access, allowedHotels } = useWorkspace();
  return (
    <>
      <Heading title="Account" subtitle="Your profile and hotel access" />
      <section className="pw-account-details" aria-label="Account details">
        <dl>
          <div>
            <dt>Name</dt>
            <dd>Demo account</dd>
          </div>
          <div>
            <dt>Access profile</dt>
            <dd>{access}</dd>
          </div>
          <div>
            <dt>Accessible hotels</dt>
            <dd>
              <ul>
                {allowedHotels.map((hotel) => (
                  <li key={hotel.id}>{hotel.name}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
