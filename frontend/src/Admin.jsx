import { useEffect, useState } from "react";
import { api } from "./api";

const FALLBACK_CATEGORIES = [
  { key: "panel", label: "Solar Panel" },
  { key: "inverter", label: "Inverter" },
  { key: "battery", label: "Battery" },
];

function slugify(s) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const EMPTY_PRODUCT = { category: "panel", brand: "", model_name: "", unit_value: "", unit_label: "", spec_title: "", warranty_line: "" };

// Category-specific spec fields (from the manufacturer datasheets). Each row
// becomes a spec line { label, value, unit } used to build the slide table.
const SPEC_FIELDS = {
  inverter: [
    { label: "Max. PV Input Power", unit: "Wp" },
    { label: "Max. DC Input Voltage", unit: "V" },
    { label: "Nominal DC Input Voltage", unit: "V" },
    { label: "Start-up Voltage", unit: "V" },
    { label: "MPPT Voltage Range", unit: "V" },
    { label: "Number of MPP Trackers", unit: "" },
    { label: "PV Strings per MPPT", unit: "" },
    { label: "Max. Input Current per MPPT", unit: "A" },
    { label: "Max. Short-circuit Current per MPPT", unit: "A" },
  ],
  battery: [
    { label: "Battery Type", unit: "" },
    { label: "Cell Capacity", unit: "Ah" },
    { label: "Cycle Life", unit: "" },
    { label: "Total Energy Capacity per Module", unit: "kWh" },
    { label: "Weight", unit: "kg" },
    { label: "Dimensions (W/H/D)", unit: "mm" },
    { label: "Nominal Charge/Discharge Rate", unit: "" },
    { label: "Max. Charge/Discharge Rate", unit: "" },
  ],
  panel: [
    { label: "Product Name", unit: "" },
    { label: "Max Power (Pmax)", unit: "W" },
    { label: "Open Circuit Voltage (Voc)", unit: "V" },
    { label: "Short Circuit Current (Isc)", unit: "A" },
    { label: "Max Power Voltage (Vmp)", unit: "V" },
    { label: "Max Power Current (Imp)", unit: "A" },
    { label: "Module Efficiency", unit: "%" },
    { label: "Weight", unit: "kg" },
    { label: "Dimension (W x H x Thickness)", unit: "mm" },
  ],
};

// specs rows <-> {label: value} map keyed by the field labels above
function specsToValues(specs) {
  const map = {};
  (specs || []).forEach((s) => { if (s.label) map[s.label] = s.value ?? ""; });
  return map;
}
function valuesToSpecs(category, values) {
  return (SPEC_FIELDS[category] || [])
    .map((f) => ({ label: f.label, value: (values[f.label] ?? "").trim(), unit: f.unit }))
    .filter((s) => s.value !== "");
}

function ProductModal({ token, initial, onClose, onSaved, categories }) {
  const [form, setForm] = useState(initial);
  const [specValues, setSpecValues] = useState(initial.specValues || {});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const editingId = initial.id || null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function setSpec(label, v) { setSpecValues((s) => ({ ...s, [label]: v })); }

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
      specs: valuesToSpecs(form.category, specValues),
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

  const specFields = SPEC_FIELDS[form.category] || [];
  const labelOf = (key) => (categories.find((c) => c.key === key)?.label) || key;

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
                {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            <label><span>Brand</span><input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></label>
          </div>
          <label><span>Model name</span><input value={form.model_name} onChange={(e) => set("model_name", e.target.value)} /></label>
          <div className="row">
            <label><span>Rating value (for form auto-fill)</span><input type="number" value={form.unit_value} onChange={(e) => set("unit_value", e.target.value)} /></label>
            <label><span>Unit (W/kW/kWh)</span><input value={form.unit_label} onChange={(e) => set("unit_label", e.target.value)} /></label>
          </div>
          <label><span>Spec table title (shown on slides 14-16)</span>
            <input value={form.spec_title} onChange={(e) => set("spec_title", e.target.value)} placeholder="e.g. Sigen 60kW HYB Inverter" />
          </label>

          {specFields.length > 0 && (
            <div className="spec-section">
              <h4>{labelOf(form.category)} Specifications</h4>
              {specFields.map((f) => (
                <label key={f.label} className="spec-field">
                  <span>{f.label}{f.unit ? ` (${f.unit})` : ""}</span>
                  <input value={specValues[f.label] ?? ""} onChange={(e) => setSpec(f.label, e.target.value)} />
                </label>
              ))}
            </div>
          )}

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
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [activeCat, setActiveCat] = useState("panel");
  const [modal, setModal] = useState(null); // null | initial-form-object
  const [manageCats, setManageCats] = useState(false);
  const [newCat, setNewCat] = useState("");

  async function refresh() { setProducts(await api.listProductsAll()); }
  async function loadCats() {
    try {
      const c = await api.getBoilerplate("product_categories");
      if (Array.isArray(c) && c.length) setCategories(c);
    } catch { /* keep fallback */ }
  }
  useEffect(() => { refresh(); loadCats(); }, []);

  const labelOf = (key) => (categories.find((c) => c.key === key)?.label) || key;

  async function addCategory() {
    const label = newCat.trim();
    const key = slugify(label);
    if (!label || !key || categories.some((c) => c.key === key)) { setNewCat(""); return; }
    const next = [...categories, { key, label }];
    await api.putBoilerplate(token, "product_categories", next);
    setCategories(next);
    setNewCat("");
  }
  async function removeCategory(key) {
    if (products.some((p) => p.category === key)) {
      alert("Remove or reassign products in this category first.");
      return;
    }
    if (!confirm("Remove this category?")) return;
    const next = categories.filter((c) => c.key !== key);
    await api.putBoilerplate(token, "product_categories", next);
    setCategories(next);
    if (activeCat === key) setActiveCat(next[0]?.key || "");
  }

  function openAdd() { setModal({ ...EMPTY_PRODUCT, category: activeCat || categories[0]?.key }); }
  function openEdit(p) {
    setModal({
      id: p.id,
      category: p.category,
      brand: p.brand || "",
      model_name: p.model_name || "",
      unit_value: p.unit_value ?? "",
      unit_label: p.unit_label || "",
      spec_title: p.spec_title || "",
      specValues: specsToValues(p.specs),
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
          {categories.map((c) => (
            <button key={c.key} className={activeCat === c.key ? "active" : ""} onClick={() => setActiveCat(c.key)}>
              {c.label} ({products.filter((p) => p.category === c.key).length})
            </button>
          ))}
        </div>
        <div className="catalog-actions">
          <button className="ghost-btn" onClick={() => setManageCats((v) => !v)}>Manage Categories</button>
          <button className="add-product-btn" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      {manageCats && (
        <div className="cat-manager">
          <div className="cat-add">
            <input value={newCat} placeholder="New category name (e.g. Switch)" onChange={(e) => setNewCat(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && addCategory()} />
            <button onClick={addCategory}>Add</button>
          </div>
          <div className="cat-chips">
            {categories.map((c) => (
              <span key={c.key} className="cat-chip">
                {c.label}
                <button title="Remove" onClick={() => removeCategory(c.key)}>×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <table className="catalog-table">
        <thead>
          <tr>
            <th>Image</th><th>Brand</th><th>Model</th><th>Rating</th><th>Specs</th><th>Warranty</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} className="empty-row">No {labelOf(activeCat)} products yet. Click “Add Product”.</td></tr>
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
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
    </div>
  );
}

function ProposalsTab({ onEditClient }) {
  const [projects, setProjects] = useState([]);

  async function refresh() { setProjects(await api.listProjects()); }
  useEffect(() => { refresh(); }, []);

  async function regenerate(id) {
    await api.exportProject(id);
  }
  async function remove(id) {
    if (!confirm("Delete this proposal?")) return;
    await api.deleteProject(id);
    refresh();
  }

  return (
    <div className="admin-card">
      <h3>Proposals & History ({projects.length})</h3>
      <table className="clients-table">
        <thead>
          <tr><th>#</th><th>Client</th><th>Proposal Name</th><th>Site</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.client_name || "—"}</td>
              <td>{p.name}</td>
              <td>{p.data?.site_name || "—"}</td>
              <td>{p.status}</td>
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

const EMPTY_CLIENT = { name: "", phone: "", email: "", organization: "", address: "", notes: "" };

function ClientModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const editingId = initial.id || null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const body = { name: form.name, phone: form.phone, email: form.email, organization: form.organization, address: form.address, notes: form.notes };
      if (editingId) await api.updateClient(editingId, body);
      else await api.createClient(body);
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
          <h3>{editingId ? "Edit Client" : "Add Client"}</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label><span>Name *</span><input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus /></label>
          <div className="row">
            <label><span>Phone</span><input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></label>
            <label><span>Email</span><input value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></label>
          </div>
          <label><span>Organization</span><input value={form.organization || ""} onChange={(e) => set("organization", e.target.value)} /></label>
          <label><span>Address</span><input value={form.address || ""} onChange={(e) => set("address", e.target.value)} /></label>
          <label><span>Notes</span><textarea rows={3} value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} /></label>
          {error && <p className="error">{error}</p>}
        </div>
        <div className="modal-foot">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy || !form.name.trim()}>{busy ? "Saving…" : editingId ? "Save changes" : "Add client"}</button>
        </div>
      </form>
    </div>
  );
}

function ClientsTab() {
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(null);

  async function refresh() { setClients(await api.listClients()); }
  useEffect(() => { refresh(); }, []);

  async function remove(id) {
    if (!confirm("Delete this client? (Only allowed if they have no proposals.)")) return;
    try {
      await api.deleteClient(id);
      refresh();
    } catch (err) {
      alert(String(err));
    }
  }

  return (
    <div className="admin-card">
      <div className="catalog-head">
        <h3>Clients ({clients.length})</h3>
        <button className="add-product-btn" onClick={() => setModal(EMPTY_CLIENT)}>+ Add Client</button>
      </div>
      <table className="clients-table">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Email</th><th>Organization</th><th>Proposals</th><th></th></tr>
        </thead>
        <tbody>
          {clients.length === 0 && <tr><td colSpan={6} className="empty-row">No clients yet.</td></tr>}
          {clients.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.phone || "—"}</td>
              <td>{c.email || "—"}</td>
              <td>{c.organization || "—"}</td>
              <td>{c.project_count}</td>
              <td className="row-actions">
                <button onClick={() => setModal(c)}>Edit</button>
                <button className="danger" onClick={() => remove(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && (
        <ClientModal initial={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
    </div>
  );
}

const EMPTY_USER = { email: "", name: "", role: "staff", password: "" };

function UserModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const editingId = initial.id || null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (editingId) {
        const body = { name: form.name, role: form.role, is_active: form.is_active };
        if (form.password) body.password = form.password;
        await api.updateUser(editingId, body);
      } else {
        await api.createUser({ email: form.email, name: form.name, role: form.role, password: form.password });
      }
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
          <h3>{editingId ? "Edit User" : "Add User"}</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <label><span>Email {editingId ? "" : "*"}</span>
            <input value={form.email} disabled={!!editingId} onChange={(e) => set("email", e.target.value)} />
          </label>
          <label><span>Name</span><input value={form.name || ""} onChange={(e) => set("name", e.target.value)} /></label>
          <label><span>Role</span>
            <select value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {editingId && (
            <label><span>Active</span>
              <select value={form.is_active === false ? "no" : "yes"} onChange={(e) => set("is_active", e.target.value === "yes")}>
                <option value="yes">Active</option>
                <option value="no">Disabled</option>
              </select>
            </label>
          )}
          <label><span>{editingId ? "New password (leave blank to keep current)" : "Password *"}</span>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
        </div>
        <div className="modal-foot">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy || (!editingId && (!form.email.trim() || !form.password))}>
            {busy ? "Saving…" : editingId ? "Save changes" : "Add user"}
          </button>
        </div>
      </form>
    </div>
  );
}

function UsersTab({ currentEmail }) {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);

  async function refresh() { setUsers(await api.listUsers()); }
  useEffect(() => { refresh(); }, []);

  async function remove(id) {
    if (!confirm("Delete this user?")) return;
    try {
      await api.deleteUser(id);
      refresh();
    } catch (err) {
      alert(String(err));
    }
  }

  return (
    <div className="admin-card">
      <div className="catalog-head">
        <h3>Staff & Admin Accounts ({users.length})</h3>
        <button className="add-product-btn" onClick={() => setModal(EMPTY_USER)}>+ Add User</button>
      </div>
      <table className="clients-table">
        <thead>
          <tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.name || "—"}</td>
              <td>{u.role}</td>
              <td>{u.is_active ? "Active" : "Disabled"}</td>
              <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}</td>
              <td className="row-actions">
                <button onClick={() => setModal({ ...u, password: "" })}>Edit</button>
                <button className="danger" disabled={u.email === currentEmail} onClick={() => remove(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {modal && (
        <UserModal initial={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
    </div>
  );
}

function DashboardTab({ onGoTo }) {
  const [products, setProducts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [exportStats, setExportStats] = useState({ total: 0, by_month: {} });

  useEffect(() => {
    api.listProductsAll().then(setProducts).catch(() => {});
    api.listProjects().then(setProjects).catch(() => {});
    api.listClients().then(setClients).catch(() => {});
    api.getBoilerplate("export_stats").then((s) => setExportStats(s || { total: 0, by_month: {} })).catch(() => {});
  }, []);

  const count = (cat) => products.filter((p) => p.category === cat).length;
  const recent = [...projects]
    .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))
    .slice(0, 5);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const exportsThisMonth = (exportStats.by_month || {})[thisMonth] || 0;

  const stats = [
    { label: "Total Clients", value: clients.length, accent: "blue", to: "clients" },
    { label: "Total Proposals", value: projects.length, accent: "gold", to: "proposals" },
    { label: "Exports (Total)", value: exportStats.total || 0, accent: "red", to: "proposals" },
    { label: "Exports This Month", value: exportsThisMonth, accent: "blue", to: "proposals" },
  ];

  const cats = [
    { key: "panel", label: "Solar Panels", color: "var(--brand-gold)" },
    { key: "inverter", label: "Inverters", color: "var(--brand-blue)" },
    { key: "battery", label: "Batteries", color: "var(--brand-red)" },
  ];
  const maxCat = Math.max(1, ...cats.map((c) => count(c.key)));

  const months = Object.keys(exportStats.by_month || {}).sort().slice(-6);
  const maxMonth = Math.max(1, ...months.map((m) => exportStats.by_month[m]));

  // Clients created per month (from created_at)
  const clientsByMonth = {};
  projects.forEach((p) => {
    const d = p.created_at || p.updated_at;
    if (d) {
      const m = new Date(d).toISOString().slice(0, 7);
      clientsByMonth[m] = (clientsByMonth[m] || 0) + 1;
    }
  });
  const clientMonths = Object.keys(clientsByMonth).sort().slice(-6);
  const maxClientMonth = Math.max(1, ...clientMonths.map((m) => clientsByMonth[m]));

  return (
    <div>
      <div className="stat-grid">
        {stats.map((s) => (
          <button key={s.label} className={`stat-card accent-${s.accent}`} onClick={() => onGoTo(s.to)}>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="widget-grid">
        <div className="admin-card">
          <h3>Products by Category</h3>
          {cats.map((c) => (
            <div key={c.key} className="bar-row">
              <span className="bar-label">{c.label}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(count(c.key) / maxCat) * 100}%`, background: c.color }} />
              </div>
              <span className="bar-value">{count(c.key)}</span>
            </div>
          ))}
        </div>

        <div className="admin-card">
          <h3>Proposals by Month</h3>
          {clientMonths.length === 0 ? (
            <p className="hint">No clients yet.</p>
          ) : (
            <div className="col-chart">
              {clientMonths.map((m) => (
                <div key={m} className="col-item">
                  <div className="col-bar gold" style={{ height: `${(clientsByMonth[m] / maxClientMonth) * 100}%` }} title={`${clientsByMonth[m]} clients`} />
                  <span className="col-label">{m.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-card">
          <h3>Exports by Month</h3>
          {months.length === 0 ? (
            <p className="hint">No exports yet.</p>
          ) : (
            <div className="col-chart">
              {months.map((m) => (
                <div key={m} className="col-item">
                  <div className="col-bar" style={{ height: `${(exportStats.by_month[m] / maxMonth) * 100}%` }} title={`${exportStats.by_month[m]} exports`} />
                  <span className="col-label">{m.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: "1.25rem" }}>
        <h3>Recent Clients</h3>
        {recent.length === 0 ? (
          <p className="hint">No clients yet.</p>
        ) : (
          <table className="clients-table">
            <thead><tr><th>#</th><th>Name</th><th>Site</th><th>Updated</th></tr></thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td><td>{p.name}</td><td>{p.data?.site_name || "—"}</td>
                  <td>{p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ token }) {
  const [company, setCompany] = useState(null);
  const [warranty, setWarranty] = useState("");
  const [prompt, setPrompt] = useState("");
  const [closing, setClosing] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    api.getBoilerplate("company_info").then(setCompany).catch(() => {});
    api.getBoilerplate("warranty_lines").then((l) => setWarranty((l || []).join("\n"))).catch(() => {});
    api.getBoilerplate("slide19_prompt_template").then((p) => setPrompt(typeof p === "string" ? p : "")).catch(() => {});
    api.getBoilerplate("closing_statement").then((c) => setClosing(typeof c === "string" ? c : "")).catch(() => {});
  }, []);

  function setBranch(i, k, v) {
    setCompany((c) => {
      const branches = [...(c.branches || [{}, {}])];
      branches[i] = { ...branches[i], [k]: v };
      return { ...c, branches };
    });
  }

  async function saveCompany() {
    await api.putBoilerplate(token, "company_info", company);
    flash("Company info saved — appears on slide 2 (Company/Branches).");
  }
  async function saveWarranty() {
    await api.putBoilerplate(token, "warranty_lines", warranty.split("\n").map((s) => s.trim()).filter(Boolean));
    flash("Warranty defaults saved — used on slide 22 when no product warranty is selected.");
  }
  async function savePrompt() {
    await api.putBoilerplate(token, "slide19_prompt_template", prompt);
    flash("Slide-19 AI prompt saved.");
  }
  async function saveClosing() {
    await api.putBoilerplate(token, "closing_statement", closing);
    flash("Zarni Electronics Service info saved — appears on slide 25.");
  }
  function flash(msg) { setStatus(msg); setTimeout(() => setStatus(""), 4000); }

  if (!company) return <div className="admin-card"><p className="hint">Loading settings…</p></div>;
  const branches = company.branches || [{}, {}];

  return (
    <div className="settings-grid">
      {status && <div className="settings-status">{status}</div>}

      <div className="admin-card">
        <h3>Company Info (Slide 2)</h3>
        <label><span>Company name</span><input value={company.company_name || ""} onChange={(e) => setCompany({ ...company, company_name: e.target.value })} /></label>
        <label><span>Contact number (Slide 1)</span><input value={company.contact || ""} onChange={(e) => setCompany({ ...company, contact: e.target.value })} /></label>
        <label><span>Website</span><input value={company.website || ""} onChange={(e) => setCompany({ ...company, website: e.target.value })} /></label>
        {[0, 1].map((i) => (
          <div key={i} className="branch-block">
            <h4>Branch {i + 1}</h4>
            <label><span>Address</span><input value={branches[i]?.address || ""} onChange={(e) => setBranch(i, "address", e.target.value)} /></label>
            <label><span>Phone</span><input value={branches[i]?.phone || ""} onChange={(e) => setBranch(i, "phone", e.target.value)} /></label>
          </div>
        ))}
        <div className="row"><button onClick={saveCompany}>Save Company Info</button></div>
      </div>

      <div className="admin-card">
        <h3>Default Warranty Lines (Slide 22)</h3>
        <p className="hint">Used when a proposal has no catalog products with warranty. One line each.</p>
        <textarea rows={5} value={warranty} onChange={(e) => setWarranty(e.target.value)} />
        <div className="row"><button onClick={saveWarranty}>Save Warranty</button></div>
      </div>

      <div className="admin-card">
        <h3>Slide-19 AI Prompt Template</h3>
        <p className="hint">Placeholders like {"{site_name}"}, {"{total_solar_kwp}"}, {"{panel_qty}"} are filled from the project.</p>
        <textarea rows={10} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <div className="row"><button onClick={savePrompt}>Save Prompt</button></div>
      </div>

      <div className="admin-card">
        <h3>Zarni Electronics Service Info (Slide 25)</h3>
        <p className="hint">Fixed FYI text shown to every client. One line per point.</p>
        <textarea rows={6} value={closing} onChange={(e) => setClosing(e.target.value)} />
        <div className="row"><button onClick={saveClosing}>Save Service Info</button></div>
      </div>

      <div className="admin-card">
        <h3>Backend Settings (read-only)</h3>
        <div className="settings-block"><h4>Admin/Staff accounts</h4><p className="hint">Manage via the Users tab.</p></div>
        <div className="settings-block"><h4>AI Provider</h4><p className="hint">Set <code>IMAGE_GEN_PROVIDER</code> / <code>IMAGE_GEN_API_KEY</code> env vars to enable slide-19 generation.</p></div>
      </div>
    </div>
  );
}

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "▦" },
  { key: "products", label: "Products", icon: "▢" },
  { key: "clients", label: "Clients", icon: "☺" },
  { key: "proposals", label: "Proposals", icon: "▤" },
  { key: "users", label: "Users", icon: "◈" },
  { key: "settings", label: "Settings", icon: "⚙" },
];

const PAGE_TITLES = {
  dashboard: "Dashboard",
  products: "Product Catalog",
  clients: "Clients",
  proposals: "Proposals & History",
  users: "Staff & Admin Accounts",
  settings: "Settings",
};

export default function Admin({ onEditClient, onExit, onLogout, currentEmail, userName }) {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <img src="/zarni-logo.png" alt="Zarni" />
          <span>Zarni Admin</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <button key={n.key} className={tab === n.key ? "active" : ""} onClick={() => setTab(n.key)}>
              <span className="nav-icon">{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="sidebar-link" onClick={onExit}>← Proposal Form</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <h2>{PAGE_TITLES[tab]}</h2>
          <div className="admin-topbar-actions">
            <span className="admin-user-chip">{userName}</span>
            <button className="icon-btn" title="Log out" onClick={onLogout}>⏻</button>
          </div>
        </header>
        <div className="admin-content">
          {tab === "dashboard" && <DashboardTab onGoTo={setTab} />}
          {tab === "products" && <ProductsTab />}
          {tab === "clients" && <ClientsTab />}
          {tab === "proposals" && <ProposalsTab onEditClient={onEditClient} />}
          {tab === "users" && <UsersTab currentEmail={currentEmail} />}
          {tab === "settings" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}
