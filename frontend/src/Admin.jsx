import { useEffect, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "./api";
import { auth } from "./firebaseClient";
import { ToastProvider, useToast } from "./Toast";
import { LoadingBlock, SkeletonRows, FadeIn } from "./Loading";
import {
  IconEdit, IconTrash, IconSearch, IconBuilding, IconBranch, IconMessage, IconSparkle,
  IconMail, IconRefresh, IconWarranty, IconPlus, IconSave, IconLogout,
} from "./icons";

function sendInviteEmail(email) {
  return sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/`,
    handleCodeInApp: true,
  });
}

const FALLBACK_CATEGORIES = [
  { key: "panel", label: "Solar Panel" },
  { key: "inverter", label: "Inverter" },
  { key: "battery", label: "Battery" },
  { key: "gateway", label: "Gateway" },
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
  gateway: [
    { label: "Model", unit: "" },
    { label: "Rated Power", unit: "W" },
    { label: "Communication Interface", unit: "" },
    { label: "Supported Protocols", unit: "" },
    { label: "Operating Temperature", unit: "°C" },
    { label: "Dimensions (W/H/D)", unit: "mm" },
    { label: "Weight", unit: "kg" },
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

function CategoryModal({ token, categories, products, onClose, onChanged }) {
  const [newCat, setNewCat] = useState("");
  const [error, setError] = useState(null);

  async function addCategory() {
    const label = newCat.trim();
    const key = slugify(label);
    if (!label || !key) return;
    if (categories.some((c) => c.key === key)) { setError("That category already exists."); return; }
    setError(null);
    const next = [...categories, { key, label }];
    await api.putBoilerplate(token, "product_categories", next);
    onChanged(next);
    setNewCat("");
  }

  async function removeCategory(key) {
    if (products.some((p) => p.category === key)) {
      setError("Remove or reassign products in this category first.");
      return;
    }
    if (!confirm("Remove this category?")) return;
    setError(null);
    const next = categories.filter((c) => c.key !== key);
    await api.putBoilerplate(token, "product_categories", next);
    onChanged(next);
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Manage Categories</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="cat-add">
            <input value={newCat} placeholder="New category name (e.g. Switch)" onChange={(e) => setNewCat(e.target.value)}
                   onKeyDown={(e) => e.key === "Enter" && addCategory()} autoFocus />
            <button onClick={addCategory}>Add</button>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="cat-chips">
            {categories.map((c) => (
              <span key={c.key} className="cat-chip">
                {c.label} ({products.filter((p) => p.category === c.key).length})
                <button title="Remove" onClick={() => removeCategory(c.key)}>×</button>
              </span>
            ))}
            {categories.length === 0 && <p className="hint">No categories yet.</p>}
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

function ProductsTab({ token }) {
  const toast = useToast();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [filterCat, setFilterCat] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [modal, setModal] = useState(null); // null | initial-form-object
  const [manageCats, setManageCats] = useState(false);

  async function refresh() { setProducts(await api.listProductsAll()); }
  async function loadCats() {
    try {
      const c = await api.getBoilerplate("product_categories");
      if (Array.isArray(c) && c.length) setCategories(c);
    } catch { /* keep fallback */ }
  }
  useEffect(() => { refresh(); loadCats(); }, []);

  const labelOf = (key) => (categories.find((c) => c.key === key)?.label) || key;

  function runSearch() { setSearchQuery(searchInput.trim()); }

  function openAdd() { setModal({ ...EMPTY_PRODUCT, category: filterCat || categories[0]?.key }); }
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
    try {
      await api.deleteProduct(token, id);
      toast.success("Product deleted.");
      refresh();
    } catch (err) {
      toast.error(String(err));
    }
  }

  const q = searchQuery.toLowerCase();
  const rows = (products || []).filter((p) => {
    if (filterCat && p.category !== filterCat) return false;
    if (!q) return true;
    return [p.brand, p.model_name, p.spec_title].some((v) => (v || "").toLowerCase().includes(q));
  });

  return (
    <FadeIn>
    <div className="admin-card catalog-card">
      <div className="catalog-head">
        <div className="catalog-filters">
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>{c.label} ({(products || []).filter((p) => p.category === c.key).length})</option>
            ))}
          </select>
          <div className="search-input-wrap">
            <IconSearch className="search-input-icon" />
            <input
              className="catalog-search"
              placeholder="Search brand, model, spec title…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
          </div>
          <button className="btn btn-ghost" onClick={runSearch}>Search</button>
        </div>
        <div className="catalog-actions">
          <button className="btn btn-ghost" onClick={() => setManageCats(true)}>Manage Categories</button>
          <button className="btn btn-primary" onClick={openAdd}><IconPlus className="btn-icon" />Add Product</button>
        </div>
      </div>

      {products === null ? (
        <SkeletonRows rows={5} />
      ) : (
      <div className="table-scroll">
      <table className="catalog-table">
        <thead>
          <tr>
            <th>Image</th><th>Brand</th><th>Model</th><th>Rating</th><th>Specs</th><th>Warranty</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={7} className="empty-row">No products match{filterCat ? ` in ${labelOf(filterCat)}` : ""}{q ? ` for "${searchQuery}"` : ""}.</td></tr>
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
                <button className="btn-icon-ghost" title="Edit" onClick={() => openEdit(p)}><IconEdit /></button>
                <button className="btn-icon-danger" title="Delete" onClick={() => remove(p.id)}><IconTrash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}

      {modal && (
        <ProductModal
          token={token}
          initial={modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}

      {manageCats && (
        <CategoryModal
          token={token}
          categories={categories}
          products={products || []}
          onClose={() => setManageCats(false)}
          onChanged={(next) => {
            setCategories(next);
            if (filterCat && !next.some((c) => c.key === filterCat)) setFilterCat("");
          }}
        />
      )}
    </div>
    </FadeIn>
  );
}

function ProposalsTab({ onEditClient }) {
  const toast = useToast();
  const [projects, setProjects] = useState(null);

  async function refresh() { setProjects(await api.listProjects()); }
  useEffect(() => { refresh(); }, []);

  async function regenerate(id) {
    try {
      await api.exportProject(id);
      toast.success("PPTX regenerated and downloaded.");
    } catch (err) {
      toast.error(String(err));
    }
  }
  async function remove(id) {
    if (!confirm("Delete this proposal?")) return;
    try {
      await api.deleteProject(id);
      toast.success("Proposal deleted.");
      refresh();
    } catch (err) {
      toast.error(String(err));
    }
  }

  return (
    <FadeIn>
    <div className="admin-card">
      <h3>Proposals & History {projects && `(${projects.length})`}</h3>
      {projects === null ? (
        <SkeletonRows rows={5} />
      ) : (
      <div className="table-scroll">
      <table className="clients-table">
        <thead>
          <tr><th>#</th><th>Client</th><th>Proposal Name</th><th>Site</th><th>Status</th><th>Updated</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {projects.length === 0 && <tr><td colSpan={7} className="empty-row">No proposals yet.</td></tr>}
          {projects.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.client_name || "—"}</td>
              <td>{p.name}</td>
              <td>{p.data?.site_name || "—"}</td>
              <td><span className={`status-pill status-${p.status}`}>{p.status}</span></td>
              <td>{p.updated_at ? new Date(p.updated_at).toLocaleString() : "—"}</td>
              <td className="row-actions">
                <button className="btn-icon-ghost" title="Edit" onClick={() => onEditClient(p.id)}><IconEdit /></button>
                <button className="btn-icon-ghost" title="Regenerate PPTX" onClick={() => regenerate(p.id)}><IconRefresh /></button>
                <button className="btn-icon-danger" title="Delete" onClick={() => remove(p.id)}><IconTrash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </div>
    </FadeIn>
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
  const toast = useToast();
  const [clients, setClients] = useState(null);
  const [modal, setModal] = useState(null);

  async function refresh() { setClients(await api.listClients()); }
  useEffect(() => { refresh(); }, []);

  async function remove(id) {
    if (!confirm("Delete this client? (Only allowed if they have no proposals.)")) return;
    try {
      await api.deleteClient(id);
      toast.success("Client deleted.");
      refresh();
    } catch (err) {
      toast.error(String(err));
    }
  }

  return (
    <FadeIn>
    <div className="admin-card">
      <div className="catalog-head">
        <h3>Clients {clients && `(${clients.length})`}</h3>
        <button className="btn btn-primary" onClick={() => setModal(EMPTY_CLIENT)}><IconPlus className="btn-icon" />Add Client</button>
      </div>
      {clients === null ? (
        <SkeletonRows rows={5} />
      ) : (
      <div className="table-scroll">
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
                <button className="btn-icon-ghost" title="Edit" onClick={() => setModal(c)}><IconEdit /></button>
                <button className="btn-icon-danger" title="Delete" onClick={() => remove(c.id)}><IconTrash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
      {modal && (
        <ClientModal initial={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); toast.success(modal.id ? "Client updated." : "Client added."); }} />
      )}
    </div>
    </FadeIn>
  );
}

const LOG_ACTION_LABELS = {
  login: "Logged in",
  logout: "Logged out",
  "client.create": "Created client",
  "client.update": "Updated client",
  "client.delete": "Deleted client",
  "product.create": "Added product",
  "product.update": "Updated product",
  "product.delete": "Deleted product",
  "user.create": "Created user",
  "user.update": "Updated user",
  "user.delete": "Deleted user",
};

function LogsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listLogs().then(setRows).finally(() => setLoading(false));
  }, []);

  return (
    <FadeIn>
    <div className="admin-card">
      <div className="catalog-head">
        <h3>System Logs {rows.length > 0 && `(${rows.length})`}</h3>
      </div>
      {loading ? (
        <SkeletonRows rows={6} />
      ) : (
      <div className="table-scroll">
      <table className="clients-table">
        <thead>
          <tr><th>When</th><th>User</th><th>Action</th><th>Detail</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="empty-row">No activity recorded yet.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
              <td>{r.actor_email || "—"}</td>
              <td>{LOG_ACTION_LABELS[r.action] || r.action}</td>
              <td>{r.detail || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
    </div>
    </FadeIn>
  );
}

const EMPTY_USER = { email: "", name: "", role: "staff", password: "" };

function UserModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState(false);
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
        onSaved();
      } else {
        const email = form.email.trim().toLowerCase();
        await api.createUser({ email, name: form.name, role: form.role });
        try {
          await sendInviteEmail(email);
        } catch {
          // account was created either way -- admin can hit "Resend Invite" later
        }
        setInvited(true);
        setBusy(false);
      }
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  if (invited) {
    return (
      <div className="modal-overlay" onMouseDown={onClose}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="modal-head">
            <h3>Invite sent</h3>
            <button type="button" className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p className="hint">An invite email was sent to <strong>{form.email}</strong>. They'll set their own password and can then sign in.</p>
          </div>
          <div className="modal-foot">
            <button onClick={onSaved}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="modal-head">
          <h3>{editingId ? "Edit User" : "Invite User"}</h3>
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
            <>
              <label><span>Active</span>
                <select value={form.is_active === false ? "no" : "yes"} onChange={(e) => set("is_active", e.target.value === "yes")}>
                  <option value="yes">Active</option>
                  <option value="no">Disabled</option>
                </select>
              </label>
              <label><span>New password (leave blank to keep current)</span>
                <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
              </label>
            </>
          )}
          {!editingId && <p className="hint">They'll get an email to set their own password — no need to type one here.</p>}
          {error && <p className="error">{error}</p>}
        </div>
        <div className="modal-foot">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy || (!editingId && !form.email.trim())}>
            {busy ? "Saving…" : editingId ? "Save changes" : "Send invite"}
          </button>
        </div>
      </form>
    </div>
  );
}

function UsersTab({ currentEmail }) {
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [modal, setModal] = useState(null);

  async function refresh() { setUsers(await api.listUsers()); }
  useEffect(() => { refresh(); }, []);

  async function remove(id) {
    if (!confirm("Delete this user?")) return;
    try {
      await api.deleteUser(id);
      toast.success("User deleted.");
      refresh();
    } catch (err) {
      toast.error(String(err));
    }
  }

  async function resendInvite(email) {
    try {
      await sendInviteEmail(email);
      toast.success(`Invite/reset link resent to ${email}.`);
    } catch (err) {
      toast.error(String(err));
    }
  }

  return (
    <FadeIn>
    <div className="admin-card">
      <div className="catalog-head">
        <h3>Staff & Admin Accounts {users && `(${users.length})`}</h3>
        <button className="btn btn-primary" onClick={() => setModal(EMPTY_USER)}><IconPlus className="btn-icon" />Invite User</button>
      </div>
      {users === null ? (
        <SkeletonRows rows={4} />
      ) : (
      <div className="table-scroll">
      <table className="clients-table">
        <thead>
          <tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr>
        </thead>
        <tbody>
          {users.length === 0 && <tr><td colSpan={6} className="empty-row">No users yet.</td></tr>}
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.name || "—"}</td>
              <td><span className={`role-pill role-${u.role}`}>{u.role}</span></td>
              <td><span className={`status-pill ${u.is_active ? "status-active" : "status-disabled"}`}>{u.is_active ? "Active" : "Disabled"}</span></td>
              <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}</td>
              <td className="row-actions">
                <button className="btn-icon-ghost" title="Edit" onClick={() => setModal({ ...u, password: "" })}><IconEdit /></button>
                <button className="btn-icon-ghost" title={u.last_login_at ? "Reset password" : "Resend invite"} onClick={() => resendInvite(u.email)}><IconMail /></button>
                <button className="btn-icon-danger" title="Delete" disabled={u.email === currentEmail} onClick={() => remove(u.id)}><IconTrash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      )}
      {modal && (
        <UserModal initial={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
    </div>
    </FadeIn>
  );
}

function DashboardTab({ onGoTo }) {
  const [products, setProducts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [exportStats, setExportStats] = useState({ total: 0, by_month: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.listProductsAll().then(setProducts),
      api.listProjects().then(setProjects),
      api.listClients().then(setClients),
      api.getBoilerplate("export_stats").then((s) => setExportStats(s || { total: 0, by_month: {} })),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="admin-card"><LoadingBlock label="Loading dashboard…" /></div>;
  }

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
    <FadeIn>
    <div>
      <div className="stat-grid">
        {stats.map((s, i) => (
          <motion.button
            key={s.label}
            className={`stat-card accent-${s.accent}`}
            onClick={() => onGoTo(s.to)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </motion.button>
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
          <div className="table-scroll">
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
          </div>
        )}
      </div>
    </div>
    </FadeIn>
  );
}

function WarrantyTemplatesCard({ token }) {
  const toast = useToast();
  const [templates, setTemplates] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getBoilerplate("warranty_templates").then((t) => setTemplates(t || [])).catch(() => setTemplates([]));
  }, []);

  function addTemplate() {
    setTemplates((t) => [
      ...(t || []),
      { id: `template_${Date.now().toString(36)}`, name: `New Warranty`, years: "", info: "" },
    ]);
  }
  function updateTemplate(i, patch) {
    setTemplates((t) => t.map((tpl, idx) => (idx === i ? { ...tpl, ...patch } : tpl)));
  }
  function removeTemplate(i) {
    if (!confirm("Delete this warranty template?")) return;
    setTemplates((t) => t.filter((_, idx) => idx !== i));
  }
  async function save() {
    setSaving(true);
    try {
      await api.putBoilerplate(token, "warranty_templates", templates);
      toast.success("Zarni's Warranty templates saved.");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-card settings-card">
      <div className="settings-card-head">
        <span className="settings-card-icon warranty"><IconWarranty /></span>
        <div>
          <h3>Zarni's Warranty</h3>
          <p className="hint">Named warranty templates — staff choose one per proposal in the Warranty step.</p>
        </div>
      </div>

      {templates === null ? (
        <SkeletonRows rows={2} />
      ) : (
        <>
          {templates.length > 0 && (
            <div className="warranty-summary">
              <span className="warranty-summary-label">Currently saved</span>
              <div className="warranty-summary-chips">
                {templates.map((tpl) => (
                  <span key={tpl.id} className="warranty-chip">
                    <IconWarranty className="warranty-chip-icon" />
                    {tpl.name || "Untitled"}{tpl.years ? ` · ${tpl.years} yrs` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {templates.map((tpl, i) => (
              <motion.div
                key={tpl.id}
                className="warranty-block"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="warranty-block-row">
                  <label className="grow"><span>Warranty name</span>
                    <input value={tpl.name} onChange={(e) => updateTemplate(i, { name: e.target.value })} placeholder="e.g. Standard Warranty" />
                  </label>
                  <label className="years-field"><span>Years</span>
                    <input type="number" min="0" value={tpl.years ?? ""} onChange={(e) => updateTemplate(i, { years: e.target.value })} placeholder="5" />
                  </label>
                  <button type="button" className="btn-icon-danger" title="Delete template" onClick={() => removeTemplate(i)}>
                    <IconTrash />
                  </button>
                </div>
                <label><span>Warranty info</span>
                  <textarea rows={4} value={tpl.info || ""} placeholder="What's covered, replacement terms, exclusions…"
                           onChange={(e) => updateTemplate(i, { info: e.target.value })} />
                </label>
              </motion.div>
            ))}
          </AnimatePresence>

          {templates.length === 0 && <p className="hint">No warranty templates yet — add one below.</p>}

          <div className="settings-card-actions">
            <button type="button" className="btn btn-ghost" onClick={addTemplate}><IconPlus className="btn-icon" />Add Warranty</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              <IconSave className="btn-icon" />{saving ? "Saving…" : "Save Warranty Templates"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AiPromptModal({ token, prompt, onClose, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(prompt);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.putBoilerplate(token, "slide19_prompt_template", value);
      toast.success("AI prompt saved.");
      onSaved(value);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal ai-prompt-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3><IconSparkle className="modal-title-icon" />Edit AI Prompt</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="hint">Placeholders like {"{site_name}"}, {"{total_solar_kwp}"}, {"{panel_qty}"} are filled in automatically from each project.</p>
          <textarea rows={12} value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            <IconSave className="btn-icon" />{saving ? "Saving…" : "Save Prompt"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ token }) {
  const toast = useToast();
  const [company, setCompany] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [intro, setIntro] = useState("");
  const [thankYou, setThankYou] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingIntro, setSavingIntro] = useState(false);
  const [savingThankYou, setSavingThankYou] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    api.getBoilerplate("company_info").then(setCompany).catch(() => {});
    api.getBoilerplate("slide19_prompt_template").then((p) => setPrompt(typeof p === "string" ? p : "")).catch(() => {});
    api.getBoilerplate("introduction_message").then((m) => setIntro(typeof m === "string" ? m : "")).catch(() => {});
    api.getBoilerplate("thank_you_message").then((m) => setThankYou(typeof m === "string" ? m : "")).catch(() => {});
  }, []);

  function setBranch(i, k, v) {
    setCompany((c) => {
      const branches = [...(c.branches || [])];
      branches[i] = { ...branches[i], [k]: v };
      return { ...c, branches };
    });
  }
  function addBranch() {
    setCompany((c) => ({ ...c, branches: [...(c.branches || []), { address: "", phone: "" }] }));
  }
  function removeBranch(i) {
    setCompany((c) => ({ ...c, branches: (c.branches || []).filter((_, idx) => idx !== i) }));
  }

  async function saveCompany() {
    setSavingCompany(true);
    try {
      await api.putBoilerplate(token, "company_info", company);
      toast.success("Company info & branches saved.");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSavingCompany(false);
    }
  }
  async function saveIntro() {
    setSavingIntro(true);
    try {
      await api.putBoilerplate(token, "introduction_message", intro);
      toast.success("Introduction message saved — used on every client's Introduction slide.");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSavingIntro(false);
    }
  }
  async function saveThankYou() {
    setSavingThankYou(true);
    try {
      await api.putBoilerplate(token, "thank_you_message", thankYou);
      toast.success("Thank You message saved — shown on the final slide of every deck.");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSavingThankYou(false);
    }
  }

  if (!company) {
    return (
      <div className="admin-card">
        <LoadingBlock label="Loading settings…" />
      </div>
    );
  }
  const branches = company.branches || [];

  return (
    <FadeIn>
      <div className="settings-grid">
        <div className="admin-card settings-card">
          <div className="settings-card-head">
            <span className="settings-card-icon company"><IconBuilding /></span>
            <div>
              <h3>Company Info & Branches</h3>
              <p className="hint">Shown on the cover and company slides for every proposal.</p>
            </div>
          </div>
          <div className="field-grid">
            <label><span>Company name</span><input value={company.company_name || ""} onChange={(e) => setCompany({ ...company, company_name: e.target.value })} /></label>
            <label><span>Contact number</span><input value={company.contact || ""} onChange={(e) => setCompany({ ...company, contact: e.target.value })} /></label>
            <label className="field-wide"><span>Website</span><input value={company.website || ""} onChange={(e) => setCompany({ ...company, website: e.target.value })} /></label>
          </div>

          <div className="branches-head">
            <span className="branches-label"><IconBranch className="inline-icon" />Branches</span>
          </div>
          <AnimatePresence initial={false}>
            {branches.map((b, i) => (
              <motion.div
                key={i}
                className="branch-block"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="warranty-block-row">
                  <label className="grow"><span>Address</span><input value={b.address || ""} onChange={(e) => setBranch(i, "address", e.target.value)} /></label>
                  <label className="years-field"><span>Phone</span><input value={b.phone || ""} onChange={(e) => setBranch(i, "phone", e.target.value)} /></label>
                  <button type="button" className="btn-icon-danger" title="Remove branch" onClick={() => removeBranch(i)}>
                    <IconTrash />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {branches.length === 0 && <p className="hint">No branches yet.</p>}

          <div className="settings-card-actions">
            <button type="button" className="btn btn-ghost" onClick={addBranch}><IconPlus className="btn-icon" />Add Branch</button>
            <button type="button" className="btn btn-primary" onClick={saveCompany} disabled={savingCompany}>
              <IconSave className="btn-icon" />{savingCompany ? "Saving…" : "Save Company Info"}
            </button>
          </div>
        </div>

        <div className="admin-card settings-card">
          <div className="settings-card-head">
            <span className="settings-card-icon intro"><IconMessage /></span>
            <div>
              <h3>Introduction Message</h3>
              <p className="hint">Set once — used on the Introduction slide for every client's deck.</p>
            </div>
          </div>
          <textarea rows={6} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Why choose us, key benefits…" />
          <div className="settings-card-actions">
            <button type="button" className="btn btn-primary" onClick={saveIntro} disabled={savingIntro}>
              <IconSave className="btn-icon" />{savingIntro ? "Saving…" : "Save Introduction"}
            </button>
          </div>
        </div>

        <WarrantyTemplatesCard token={token} />

        <div className="admin-card settings-card">
          <div className="settings-card-head">
            <span className="settings-card-icon thankyou"><IconMail /></span>
            <div>
              <h3>Thank You Message</h3>
              <p className="hint">Shown on the final slide of every generated deck.</p>
            </div>
          </div>
          <textarea rows={6} value={thankYou} onChange={(e) => setThankYou(e.target.value)} placeholder="Closing note shown to every client…" />
          <div className="settings-card-actions">
            <button type="button" className="btn btn-primary" onClick={saveThankYou} disabled={savingThankYou}>
              <IconSave className="btn-icon" />{savingThankYou ? "Saving…" : "Save Thank You Message"}
            </button>
          </div>
        </div>

        <div className="admin-card settings-card">
          <div className="settings-card-head">
            <span className="settings-card-icon advanced"><IconSparkle /></span>
            <div>
              <h3>Advanced</h3>
              <p className="hint">The AI image prompt used to auto-generate a slide illustration.</p>
            </div>
          </div>
          <div className="settings-card-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setShowAiModal(true)}>
              <IconSparkle className="btn-icon" />Edit AI Prompt
            </button>
          </div>
        </div>
      </div>

      {showAiModal && (
        <AiPromptModal
          token={token}
          prompt={prompt}
          onClose={() => setShowAiModal(false)}
          onSaved={(v) => { setPrompt(v); setShowAiModal(false); }}
        />
      )}
    </FadeIn>
  );
}

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "products", label: "Products", icon: "products" },
  { key: "clients", label: "Clients", icon: "clients" },
  { key: "proposals", label: "Proposals", icon: "proposals" },
  { key: "users", label: "Users", icon: "users" },
  { key: "logs", label: "System Logs", icon: "logs" },
  { key: "settings", label: "Settings", icon: "settings" },
];

const ICON_PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  products: (
    <>
      <path d="M3 7.5 12 3l9 4.5-9 4.5-9-4.5Z" />
      <path d="M3 7.5V16l9 4.5 9-4.5V7.5" />
      <path d="M12 12v8.5" />
    </>
  ),
  clients: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.75 20a6.25 6.25 0 0 1 12.5 0" />
      <path d="M16 4.5a3.25 3.25 0 0 1 0 6.5" />
      <path d="M15 14a6.2 6.2 0 0 1 6.25 6" />
    </>
  ),
  proposals: (
    <>
      <path d="M6.5 2.75h8.25L19 7v13.25a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z" />
      <path d="M14.5 2.75V7H19" />
      <path d="M8.25 12h7.5M8.25 15.5h7.5M8.25 8.5h3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7.5" r="3.25" />
      <path d="M2.75 20a6.25 6.25 0 0 1 12.5 0" />
      <path d="M18 8.5v4M20 10.5h-4" />
      <path d="M15.5 20a5.2 5.2 0 0 1 5-3.75" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.75v2.4M12 18.85v2.4M4.93 4.93l1.7 1.7M17.37 17.37l1.7 1.7M2.75 12h2.4M18.85 12h2.4M4.93 19.07l1.7-1.7M17.37 6.63l1.7-1.7" />
    </>
  ),
  logs: (
    <>
      <path d="M5 3.75h11L20 8v12.25a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1Z" />
      <path d="M16 3.75V8h4" />
      <path d="M7.5 12h9M7.5 15.5h9M7.5 18.5h5.5" />
    </>
  ),
  collapse: (
    <>
      <path d="M15 4.5 8 12l7 7.5" />
    </>
  ),
};

function NavIcon({ name }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[name]}
    </svg>
  );
}

const PAGE_TITLES = {
  dashboard: "Dashboard",
  products: "Product Catalog",
  clients: "Clients",
  proposals: "Proposals & History",
  users: "Staff & Admin Accounts",
  logs: "System Logs",
  settings: "Settings",
};

function AdminShell({ onEditClient, onExit, onLogout, currentEmail, userName, tab, onTabChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const setTab = onTabChange;

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-brand">
          <img src="/zarni-logo.png" alt="Zarni" />
          <span>Zarni Admin</span>
          <button className="sidebar-collapse-btn" title="Collapse sidebar" onClick={() => setCollapsed(true)}>
            <NavIcon name="collapse" />
          </button>
        </div>
        {collapsed && (
          <button className="sidebar-collapse-btn" style={{ marginBottom: "0.75rem" }} title="Expand sidebar" onClick={() => setCollapsed(false)}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 4.5 16 12l-7 7.5" />
            </svg>
          </button>
        )}
        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <button key={n.key} className={tab === n.key ? "active" : ""} onClick={() => setTab(n.key)} title={n.label}>
              <NavIcon name={n.icon} /> <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="sidebar-link" onClick={onExit} title="Proposal Form"><span>← Proposal Form</span></button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <h2>{PAGE_TITLES[tab]}</h2>
          <div className="admin-topbar-actions">
            <span className="admin-user-chip">{userName}</span>
            <button className="icon-btn" title="Log out" onClick={onLogout}><IconLogout /></button>
          </div>
        </header>
        <div className="admin-content">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "dashboard" && <DashboardTab onGoTo={setTab} />}
            {tab === "products" && <ProductsTab />}
            {tab === "clients" && <ClientsTab />}
            {tab === "proposals" && <ProposalsTab onEditClient={onEditClient} />}
            {tab === "users" && <UsersTab currentEmail={currentEmail} />}
            {tab === "logs" && <LogsTab />}
            {tab === "settings" && <SettingsTab />}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function Admin(props) {
  return (
    <ToastProvider>
      <AdminShell {...props} />
    </ToastProvider>
  );
}
