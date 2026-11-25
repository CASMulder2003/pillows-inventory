import { products, suppliers } from "../data/inventory.js";
import { Heading } from "../components/ui.jsx";
import { ProductRecord } from "../components/records.jsx";
import { useWorkspace } from "../app/WorkspaceContext.jsx";

// A supplier record is shared by every product that orders from that contact.
export function Suppliers() {
  const { openProduct, route } = useWorkspace();
  const rows =
    route.page === "supplier"
      ? suppliers.filter((s) => s.id === route.id)
      : suppliers;
  return (
    <>
      {
        <Heading
          title={route.page === "supplier" ? rows[0].name : "Suppliers"}
          subtitle={"Shared ordering details for catalogue items"}
        />
      }
      {rows.map((s) => (
        <section className="pw-subsection" key={s.id}>
          <div className="pw-sectionbar">
            <h2>{s.name}</h2>
            <span className="pw-status">Example contact</span>
          </div>
          <div className="pw-detail-grid">
            <div className="pw-contact">
              <h3>{s.contact}</h3>
              <p>{s.email}</p>
              <p>Phone · {s.phone}</p>
              <p>{s.orderNote}</p>
            </div>
            <div>
              {products
                .filter((p) => p.supplierId === s.id)
                .map((p) => (
                  <div className="pw-finish-line" key={p.id}>
                    <ProductRecord id={p.id} onOpen={openProduct} />
                  </div>
                ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
