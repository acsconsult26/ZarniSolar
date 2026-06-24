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

function ProductsTab({ token }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);

  async function refresh() {
    setProducts(await api.listProductsAll());
  }
  useEffect(() => { refresh(); }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
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

  function reset() { setEditingId(null); setForm(EMPTY_PRODUCT); }

  async function save(e) {
    e.preventDefault();
    setError(null);
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
      if (editingId) await api.updateProduct(token, editingId, body);
      else await api.createProduct(token, body);
      reset();
      refresh();
    } catch (err) {
      setError(String(err));
    }
  }

  async function remove(id) {
    if (!confirm("Delete this product?")) return;
    await api.deleteProduct(token, id);
    if (editingId === id) reset();
    refresh();
  }

  async function uploadImage(id, file) {
    if (!file) return;
    await api.uploadProductImage(token, id, file);
    refresh();
  }

  return (
    <div className="admin-grid">
      <form className="admin-card" onSubmit={save}>
        <h3>{editingId ? `Edit product #${editingId}` : "Add product"}</h3>
        <label><span>Category</span>
          <select value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label><span>Brand</span><input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></label>
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
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button type="submit">{editingId ? "Save changes" : "Add product"}</button>
          {editingId && <button type="button" onClick={reset}>Cancel</button>}
        </div>
      </form>

      <div className="admin-card">
        <h3>Catalog ({products.length})</h3>
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <h4 className="cat-head">{cat}</h4>
            {products.filter((p) => p.category === cat).map((p) => (
              <div key={p.id} className="product-row">
                {p.image_url && <img src={api.fileUrl(p.image_url)} alt="" />}
                <div className="product-meta">
                  <strong>{p.brand} {p.model_name}</strong>
                  <span>{p.unit_value ? `${p.unit_value} ${p.unit_label || ""}` : ""}</span>
                </div>
                <div className="product-actions">
                  <button onClick={() => startEdit(p)}>Edit</button>
                  <label className="img-btn">Image<input type="file" accept="image/*" onChange={(e) => uploadImage(p.id, e.target.files[0])} /></label>
                  <button onClick={() => remove(p.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
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
