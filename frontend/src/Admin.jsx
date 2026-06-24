import { useEffect, useState } from "react";
import { api } from "./api";

const TOKEN_KEY = "zarni_admin_token";
const CATEGORIES = ["panel", "inverter", "battery"];

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState("admin@zarni.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await api.login(email, password);
      localStorage.setItem(TOKEN_KEY, token);
      onLoggedIn(token);
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-login" onSubmit={submit}>
      <h2>Admin Login</h2>
      <label>
        <span>Email</span>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        <span>Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="hint">Demo account: admin@zarni.com / demo1234</p>
    </form>
  );
}

const EMPTY_PRODUCT = { category: "panel", brand: "", model_name: "", unit_value: "", unit_label: "", spec_title: "", specs: "", warranty_line: "" };

// specs textarea: one line per row, "Label | Value | Unit"
function specsToText(specs) {
  return (specs || [])
    .map((s) => [s.label || "", s.value || "", s.unit || ""].join(" | ").replace(/( \| )+$/g, ""))
    .join("\n");
}
function textToSpecs(text) {
  return (text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = "", value = "", unit = ""] = line.split("|").map((s) => s.trim());
      return { label, value, unit };
    })
    .filter((s) => s.label);
}

const CATEGORY_LABELS = { panel: "Solar Panel", inverter: "Inverter", battery: "Battery" };

function ProductModal({ token, initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const editingId = initial.id || null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body = {
      category: form.category,
      brand: form.brand,
      model_name: form.model_name,
      unit_value: form.unit_value === "" ? null : Number(form.unit_value),
      unit_label: form.unit_label,
      spec_title: form.spec_title,
      specs: textToSpecs(form.specs),
      warranty_line: form.warranty_line,
    };
    try {
      const saved = editingId
        ? await api.updateProduct(token, editingId, body)
        : await api.createProduct(token, body);
      if (form._imageFile) await api.uploadProductImage(token, saved.id, form._imageFile);
      onSaved();
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="modal-head">
          <h3>{editingId ? "Edit Product" : "Add Product"}</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="row">
            <label><span>Category</span>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </label>
            <label><span>Brand</span><input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></label>
          </div>
          <label><span>Model name</span><input value={form.model_name} onChange={(e) => set("model_name", e.target.value)} /></label>
          <div className="row">
            <label><span>Rating value</span><input type="number" value={form.unit_value} onChange={(e) => set("unit_value", e.target.value)} /></label>
            <label><span>Unit (W/kW/kWh)</span><input value={form.unit_label} onChange={(e) => set("unit_label", e.target.value)} /></label>
          </div>
          <label><span>Spec table title (shown on slides 14-16)</span>
            <input value={form.spec_title} onChange={(e) => set("spec_title", e.target.value)} placeholder="e.g. Sigen 60kW HYB Inverter" />
          </label>
          <label><span>Specifications — one row per line as: Label | Value | Unit</span>
            <textarea rows={6} value={form.specs} onChange={(e) => set("specs", e.target.value)} placeholder={"Max PV Input | 120000 | Wp\nMPPT Trackers | 5 |\nPhases | 3 |"} />
          </label>
          <label><span>Warranty line</span><input value={form.warranty_line} onChange={(e) => set("warranty_line", e.target.value)} /></label>
          <label><span>Product image</span>
            <input type="file" accept="image/*" onChange={(e) => set("_imageFile", e.target.files[0])} />
          </label>
          {error && <p className="error">{error}</p>}
        </div>
        <div className="modal-foot">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add product"}</button>
        </div>
      </form>
    </div>
  );
}

function ProductsTab({ token }) {
  const [products, setProducts] = useState([]);
  const [activeCat, setActiveCat] = useState("panel");
  const [modal, setModal] = useState(null); // null | initial-form-object

  async function refresh() { setProducts(await api.listProductsAll()); }
  useEffect(() => { refresh(); }, []);

  function openAdd() { setModal({ ...EMPTY_PRODUCT, category: activeCat }); }
  function openEdit(p) {
    setModal({
      id: p.id,
      category: p.category,
      brand: p.brand || "",
      model_name: p.model_name || "",
      unit_value: p.unit_value ?? "",
      unit_label: p.unit_label || "",
      spec_title: p.spec_title || "",
      specs: specsToText(p.specs),
      warranty_line: p.warranty_line || "",
    });
  }

  async function remove(id) {
    if (!confirm("Delete this product?")) return;
    await api.deleteProduct(token, id);
    refresh();
  }

  const rows = products.filter((p) => p.category === activeCat);

  return (
    <div className="admin-card catalog-card">
      <div className="catalog-head">
        <div className="catalog-tabs">
          {CATEGORIES.map((c) => (
            <button key={c} className={activeCat === c ? "active" : ""} onClick={() => setActiveCat(c)}>
              {CATEGORY_LABELS[c]} ({products.filter((p) => p.category === c).length})
            </button>
          ))}
        </div>
        <button className="add-product-btn" onClick={openAdd}>+ Add Product</button>
      </div>

      <table className="catalog-table">
        <thead>
          <tr>
            <th>Image</th><th>Brand</th><th>Model</th><th>Rating</th><th>Specs</th><th>Warranty</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} className="empty-row">No {CATEGORY_LABELS[activeCat]} products yet. Click “Add Product”.</td></tr>
          )}
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{p.image_url ? <img className="cat-thumb" src={api.fileUrl(p.image_url)} alt="" /> : <span className="no-thumb">—</span>}</td>
              <td>{p.brand}</td>
              <td>{p.model_name}</td>
              <td>{p.unit_value ? `${p.unit_value} ${p.unit_label || ""}` : "—"}</td>
              <td>{(p.specs || []).length} rows</td>
              <td>{p.warranty_line || "—"}</td>
              <td className="row-actions">
                <button onClick={() => openEdit(p)}>Edit</button>
                <button className="danger" onClick={() => remove(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <ProductModal
          token={token}
          initial={modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
    </div>
  );
}

function ClientsTab({ onEditClient }) {
  const [projects, setProjects] = useState([]);

  async function refresh() { setProjects(await api.listProjects()); }
  useEffect(() => { refresh(); }, []);

  async function regenerate(id) {
    await api.exportProject(id);
  }
  async function remove(id) {
    if (!confirm("Delete this client/proposal?")) return;
    await api.deleteProject(id);
    refresh();
  }

  return (
    <div className="admin-card">
      <h3>Clients & History ({projects.length})</h3>
      <table className="clients-table">
        <thead>
          <tr><th>#</th><th>Name</th><th>Site</th><th>Updated</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.data?.site_name || "—"}</td>
              <td>{p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}</td>
              <td className="row">
                <button onClick={() => onEditClient(p.id)}>Edit</button>
                <button onClick={() => regenerate(p.id)}>Regenerate PPTX</button>
                <button onClick={() => remove(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Admin({ onEditClient }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [tab, setTab] = useState("products");

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  if (!token) return <Login onLoggedIn={setToken} />;

  return (
    <div className="admin">
      <div className="admin-tabs">
        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Products</button>
        <button className={tab === "clients" ? "active" : ""} onClick={() => setTab("clients")}>Clients & History</button>
        <button className="logout" onClick={logout}>Log out</button>
      </div>
      {tab === "products" ? <ProductsTab token={token} /> : <ClientsTab onEditClient={onEditClient} />}
    </div>
  );
}
