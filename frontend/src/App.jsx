import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebaseClient";
import API_BASE, { api, ensureFreshToken } from "./api";
import { SECTIONS, perUnitCost, roiCompute, paybackRows } from "./fields";
import RichText from "./RichText";
import Admin from "./Admin";
import Login from "./Login";
import "./App.css";

function ProductSelect({ field, value, onChange }) {
  const [options, setOptions] = useState([]);
  useEffect(() => {
    api.listProductsAll().then((all) => setOptions(all.filter((p) => p.category === field.category))).catch(() => {});
  }, [field.category]);
  return (
    <label className="field">
      <span className="field-label">{field.label}</span>
      {field.help && <small className="field-help">{field.help}</small>}
      <select value={value ?? ""} onChange={(e) => onChange(field.name, e.target.value ? Number(e.target.value) : "")}>
        <option value="">— none —</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>{p.brand} {p.model_name}</option>
        ))}
      </select>
    </label>
  );
}

function Field({ field, value, onChange }) {
  if (field.type === "product-select") {
    return <ProductSelect field={field} value={value} onChange={onChange} />;
  }
  if (field.type === "richtext") {
    return (
      <div className="field field-wide">
        <span className="field-label">{field.label}{field.required ? " *" : ""}</span>
        {field.help && <small className="field-help">{field.help}</small>}
        <RichText value={value} onChange={(html) => onChange(field.name, html)} placeholder={field.help} />
      </div>
    );
  }
  if (field.type === "daterange") {
    return <DateRangeField field={field} value={value} onChange={onChange} />;
  }
  if (field.type === "checkbox") {
    return (
      <label className="field toggle-row">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(field.name, e.target.checked)} />
        <span className="field-label">{field.label}</span>
      </label>
    );
  }
  if (field.type === "textarea") {
    return (
      <label className="field field-wide">
        <span className="field-label">{field.label}{field.required ? " *" : ""}</span>
        {field.help && <small className="field-help">{field.help}</small>}
        <textarea rows={6} value={value ?? ""} onChange={(e) => onChange(field.name, e.target.value)} />
      </label>
    );
  }
  return (
    <label className="field">
      <span className="field-label">{field.label}{field.required ? " *" : ""}</span>
      {field.help && <small className="field-help">{field.help}</small>}
      <input type={field.type} value={value ?? ""} onChange={(e) => onChange(field.name, e.target.value)} />
    </label>
  );
}

function formatDateShort(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, ".");
}

function DateRangeField({ field, value, onChange }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function emit(nextFrom, nextTo) {
    onChange(field.name, [formatDateShort(nextFrom), formatDateShort(nextTo)].filter(Boolean).join(" – "));
  }

  return (
    <div className="field">
      <span className="field-label">{field.label}{field.required ? " *" : ""}</span>
      {field.help && <small className="field-help">{field.help}</small>}
      <div className="daterange-row">
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); emit(e.target.value, to); }} />
        <span>to</span>
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); emit(from, e.target.value); }} />
      </div>
      {value && <small className="field-help">{value}</small>}
    </div>
  );
}

function ImageUpload({ image, projectId, onUploaded, currentUrl }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(currentUrl);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file || !projectId) return;
    setBusy(true);
    try {
      const result = await api.uploadField(projectId, image.name, file);
      setPreview(api.fileUrl(result.url));
      onUploaded(image.name, result.url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="image-upload">
      <span>{image.label}</span>
      {preview && <img src={preview} alt={image.label} />}
      <input type="file" accept="image/*" onChange={handleFile} disabled={busy} />
    </div>
  );
}

function ExcelAnalyze({ config, projectId, data, setField }) {
  const [status, setStatus] = useState(null); // null | 'processing' | 'done' | 'error'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const avg = data[config.avgField];
  const peak = data[config.peakField];

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file || !projectId) return;
    setStatus("processing");
    setError(null);
    setResult(null);
    try {
      const r = await api.analyzeConsumption(projectId, file);
      setResult(r);
      setStatus("done");
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  }

  function confirm() {
    if (!result) return;
    setField(config.avgField, result.average_units);
    setField(config.peakField, result.peak_units);
  }

  return (
    <div className="excel-analyze">
      <h3>Consumption Excel (hourly units)</h3>
      <p className="hint">Upload an Excel file of hourly consumption. It is analyzed for average &amp; peak units. Review, then confirm to include in the slide.</p>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
      {status === "processing" && <p className="processing">Processing calculation…</p>}
      {status === "error" && <p className="error">{error}</p>}
      {status === "done" && result && (
        <div className="excel-result">
          <div className="excel-figs">
            <span><strong>Average:</strong> {result.average_units} units</span>
            <span><strong>Peak:</strong> {result.peak_units} units</span>
            <span className="muted">({result.sample_count} rows{result.column ? `, "${result.column}"` : ""})</span>
          </div>
          <button type="button" className="confirm-btn" onClick={confirm}>✓ Correct — use these values</button>
        </div>
      )}
      {(avg != null && avg !== "") && (
        <p className="excel-confirmed">In slide → Average {avg} units · Peak {peak} units</p>
      )}
    </div>
  );
}

function PowerAnalyzer({ config, projectId, data, uploads, setField, setUploads }) {
  const fieldKey = config.field;
  const statsKey = `${fieldKey}_stats`;
  const chartField = `${fieldKey}_chart`;
  const [status, setStatus] = useState(data[statsKey] ? "done" : "idle"); // idle | uploading | analyzing | done | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const stats = data[statsKey];
  const chartUrl = api.fileUrl(uploads[chartField]);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file || !projectId) return;
    setStatus("uploading");
    setProgress(0);
    setError(null);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const result = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/projects/${projectId}/analyze-power-log?field=${encodeURIComponent(fieldKey)}`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.upload.onload = () => setStatus("analyzing");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error("Bad response from server")); }
          } else {
            reject(new Error(`${xhr.status}: ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        const fd = new FormData();
        fd.append("file", file);
        xhr.send(fd);
      });
      setField(statsKey, result.stats);
      setUploads((u) => ({ ...u, [chartField]: result.chart_url }));
      setStatus("done");
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  }

  const stat = (label, avgKey, peakKey, unit = "") => (
    <div className="pa-stat">
      <span className="pa-stat-label">{label}</span>
      <span className="pa-stat-value">
        Avg {stats?.[avgKey] ?? "—"}{stats?.[avgKey] != null ? unit : ""}
        {" · "}
        Peak {stats?.[peakKey] ?? "—"}{stats?.[peakKey] != null ? unit : ""}
      </span>
    </div>
  );

  return (
    <div className="power-analyzer">
      <h3>Power Analyzer Log (CSV/Excel)</h3>
      <p className="hint">Upload the analyzer's trend-log export. It's analyzed for kW / PF / THD summary stats and an hourly load chart — both used on the slide.</p>
      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} disabled={status === "uploading" || status === "analyzing"} />

      {status === "uploading" && (
        <div className="pa-progress">
          <div className="pa-progress-bar"><div className="pa-progress-fill" style={{ width: `${progress}%` }} /></div>
          <span>Uploading… {progress}%</span>
        </div>
      )}
      {status === "analyzing" && (
        <div className="pa-progress">
          <div className="pa-progress-bar indeterminate"><div className="pa-progress-fill" /></div>
          <span>Analyzing…</span>
        </div>
      )}
      {status === "error" && <p className="error">{error}</p>}

      {status === "done" && stats && (
        <div className="pa-result">
          <div className="pa-stats-grid">
            {stat("kW", "avg_kw", "peak_kw", " kW")}
            {stat("PF", "avg_pf", "peak_pf")}
            {stat("THD (Voltage)", "avg_thd_voltage", "peak_thd_voltage", "%")}
            {stat("THD (Current)", "avg_thd_current", "peak_thd_current", "%")}
          </div>
          {chartUrl && (
            <div className="pa-chart-preview">
              <span className="pa-chart-label">Hourly Load Chart (used on the slide)</span>
              <img src={chartUrl} alt="Hourly load chart" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SystemOptions({ data, setField }) {
  const [catalog, setCatalog] = useState([]);
  useEffect(() => { api.listProductsAll().then(setCatalog).catch(() => setCatalog([])); }, []);

  const options = data.system_options || [];
  const update = (next) => setField("system_options", next);

  function addOption() {
    if (options.length >= 4) return;
    update([...options, { title: `Option ${options.length + 1}`, capex: "", items: [] }]);
  }
  function removeOption(i) { update(options.filter((_, idx) => idx !== i)); }
  function setOption(i, patch) { update(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o))); }

  function addItem(i) {
    const o = options[i];
    setOption(i, { items: [...(o.items || []), { name: "", qty: 1, unit: "Nos" }] });
  }
  function setItem(i, j, patch) {
    const o = options[i];
    setOption(i, { items: o.items.map((it, idx) => (idx === j ? { ...it, ...patch } : it)) });
  }
  function removeItem(i, j) {
    const o = options[i];
    setOption(i, { items: o.items.filter((_, idx) => idx !== j) });
  }
  function pickProduct(i, j, productId) {
    const p = catalog.find((x) => String(x.id) === String(productId));
    if (!p) { setItem(i, j, { name: "" }); return; }
    const rating = p.unit_value ? ` ${p.unit_value}${p.unit_label || ""}` : "";
    setItem(i, j, { name: `${p.brand}${rating} ${p.model_name}`.replace(/\s+/g, " ").trim() });
  }

  return (
    <div className="sysopts">
      <div className="sysopts-grid">
        {options.map((o, i) => (
          <div key={i} className="option-card">
            <div className="option-head">
              <input className="option-title" value={o.title || ""} placeholder={`Option ${i + 1}`}
                     onChange={(e) => setOption(i, { title: e.target.value })} />
              <button className="remove-x" onClick={() => removeOption(i)}>×</button>
            </div>
            {(o.items || []).map((it, j) => (
              <div key={j} className="option-item">
                <div className="option-item-row">
                  <select value="" onChange={(e) => { pickProduct(i, j, e.target.value); e.target.value = ""; }}>
                    <option value="">{it.name ? "↺ change product" : "Pick product…"}</option>
                    {catalog.map((p) => (
                      <option key={p.id} value={p.id}>{p.brand} {p.model_name}</option>
                    ))}
                  </select>
                  <button type="button" className="remove-x" onClick={() => removeItem(i, j)}>×</button>
                </div>
                <div className="option-item-row">
                  <input className="item-name" value={it.name || ""} placeholder="item name"
                         onChange={(e) => setItem(i, j, { name: e.target.value })} />
                  <input className="item-qty" type="number" value={it.qty ?? ""} placeholder="qty"
                         onChange={(e) => setItem(i, j, { qty: e.target.value })} />
                  <input className="item-unit" value={it.unit || ""} placeholder="unit"
                         onChange={(e) => setItem(i, j, { unit: e.target.value })} />
                </div>
              </div>
            ))}
            <button className="add-item-btn" onClick={() => addItem(i)}>+ Add item</button>
            <label className="capex-field">
              <span>Est. CAPEX (MMK)</span>
              <input type="number" value={o.capex ?? ""} onChange={(e) => setOption(i, { capex: e.target.value })} />
            </label>
            <div className="usage-fields">
              <label className="capex-field">
                <span>Grid units/day (chart)</span>
                <input type="number" value={o.grid_units ?? ""} onChange={(e) => setOption(i, { grid_units: e.target.value })} />
              </label>
              <label className="capex-field">
                <span>Solar units/day (chart)</span>
                <input type="number" value={o.solar_units ?? ""} onChange={(e) => setOption(i, { solar_units: e.target.value })} />
              </label>
            </div>
            <div className="spec-mini">Payback / spec (Slide 17)</div>
            <div className="usage-fields">
              <label className="capex-field"><span>Solar count</span>
                <input type="number" value={o.solar_count ?? ""} onChange={(e) => setOption(i, { solar_count: e.target.value })} /></label>
              <label className="capex-field"><span>Inverter (kW)</span>
                <input type="number" value={o.inverter_power ?? ""} onChange={(e) => setOption(i, { inverter_power: e.target.value })} /></label>
            </div>
            <div className="usage-fields">
              <label className="capex-field"><span>Battery (kWh)</span>
                <input type="number" value={o.battery_capacity ?? ""} onChange={(e) => setOption(i, { battery_capacity: e.target.value })} /></label>
              <label className="capex-field"><span>Backup (Hrs)</span>
                <input type="number" value={o.backup_hours ?? ""} onChange={(e) => setOption(i, { backup_hours: e.target.value })} /></label>
              <label className="capex-field"><span>Payback (Yrs)</span>
                <input type="number" value={o.payback_years ?? ""} onChange={(e) => setOption(i, { payback_years: e.target.value })} /></label>
            </div>
          </div>
        ))}
      </div>
      {options.length < 4 && <button className="add-option-btn" onClick={addOption}>+ Add Option ({options.length}/4)</button>}
      {catalog.length === 0 && <p className="hint">No catalog products yet — add products in Admin → Products first.</p>}
      <label className="baseline-field">
        <span>Daily Usage Units (chart baseline — Slide 16)</span>
        <input type="number" value={data.chart_daily_usage ?? ""} placeholder="e.g. 900"
               onChange={(e) => setField("chart_daily_usage", e.target.value)} />
      </label>
    </div>
  );
}

function ClientPicker({ onPicked }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", organization: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { api.listClients().then(setClients).catch(() => {}); }, []);

  const filtered = clients.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  async function pickExisting(client) {
    setBusy(true);
    setError(null);
    try {
      const p = await api.createProject({ name: `${client.name} Proposal`, data: {}, client_id: client.id });
      onPicked(p, client);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function createAndPick(e) {
    e.preventDefault();
    if (!newClient.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const client = await api.createClient(newClient);
      await pickExisting(client);
    } catch (err) {
      setError(String(err));
      setBusy(false);
    }
  }

  return (
    <section className="form-section client-picker">
      <h2>Start a New Proposal</h2>
      <p className="section-note">Pick the client this proposal is for, or add a new one.</p>

      {!showNew && (
        <>
          <input
            className="project-name"
            style={{ maxWidth: "100%", marginBottom: "0.9rem" }}
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <table className="clients-table">
            <thead><tr><th>Name</th><th>Phone</th><th>Organization</th><th>Proposals</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="empty-row">No clients found.</td></tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.organization || "—"}</td>
                  <td>{c.project_count}</td>
                  <td><button disabled={busy} onClick={() => pickExisting(c)}>Use this client</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-option-btn" style={{ marginTop: "1rem" }} onClick={() => setShowNew(true)}>
            + New Client
          </button>
        </>
      )}

      {showNew && (
        <form onSubmit={createAndPick} className="field-grid" style={{ marginTop: "0.5rem" }}>
          <label className="field">
            <span className="field-label">Client / Company Name *</span>
            <input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Phone</span>
            <input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Organization</span>
            <input value={newClient.organization} onChange={(e) => setNewClient({ ...newClient, organization: e.target.value })} />
          </label>
          <div className="field field-wide export-actions">
            <button type="button" onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" className="primary" disabled={busy || !newClient.name.trim()}>
              {busy ? "Creating…" : "Create Client & Continue"}
            </button>
          </div>
        </form>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  );
}

function ProposalForm({ initialProject, onExitToPicker }) {
  const [projectId, setProjectId] = useState(initialProject?.id ?? null);
  const [clientName, setClientName] = useState(initialProject?.client_name ?? null);
  const [name, setName] = useState(initialProject?.name ?? "Untitled Project");
  const [data, setData] = useState(initialProject?.data ?? {});
  const [uploads, setUploads] = useState(initialProject?.uploads ?? {});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState(null);
  const view = "form";

  // Debounced auto-save
  useEffect(() => {
    if (!projectId || view !== "form") return;
    const t = setTimeout(() => api.updateProject(projectId, { name, data }).catch(() => {}), 700);
    return () => clearTimeout(t);
  }, [name, data, projectId, view]);

  function setField(fieldName, value) {
    setData((d) => ({ ...d, [fieldName]: value }));
  }

  // Carry the Electricity Bill numbers (total EPC units + derived unit cost)
  // into the ROI / Payback steps as defaults, so the same figures don't need
  // to be retyped -- only fills fields the user hasn't already set.
  useEffect(() => {
    const unitCost = perUnitCost(data);
    setData((d) => {
      const patch = {};
      if ((d.roi_total_epc_units === undefined || d.roi_total_epc_units === "") && d.total_epc_units) {
        patch.roi_total_epc_units = d.total_epc_units;
      }
      if ((d.roi_avg_unit_cost === undefined || d.roi_avg_unit_cost === "") && unitCost) {
        patch.roi_avg_unit_cost = unitCost;
      }
      if ((d.payback_unit_cost === undefined || d.payback_unit_cost === "") && unitCost) {
        patch.payback_unit_cost = unitCost;
      }
      return Object.keys(patch).length ? { ...d, ...patch } : d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.total_epc_units, data.total_epc_cost]);

  async function saveDraft() {
    if (!projectId) return;
    setSaving(true);
    try {
      await api.updateProject(projectId, { name, data });
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (!projectId) return;
    setExportError(null);
    setExportBusy(true);
    try {
      await saveDraft();
      await api.exportProject(projectId);
    } catch (e) {
      setExportError(String(e));
    } finally {
      setExportBusy(false);
    }
  }

  const section = SECTIONS[step];
  const sectionEnabled = !section?.optionalToggle || !!data[section.optionalToggle];
  const totalSteps = SECTIONS.length + 1;
  const isReview = step === SECTIONS.length;
  const currentTitle = isReview ? "Review & Export" : section.title;
  const pct = Math.round(((step + 1) / totalSteps) * 100);
  const remainingTitles = isReview
    ? []
    : SECTIONS.slice(step + 1).map((s) => s.title).concat(["Review & Export"]);

  return (
    <div className="app">
      <div className="wizard-meta-row">
        {clientName && <span className="client-badge">{clientName}</span>}
        <input className="project-name" value={name} onChange={(e) => setName(e.target.value)} />
        {projectId && <span className="project-id">#{projectId}</span>}
        <button className="new-project-btn" onClick={onExitToPicker}>+ New</button>
      </div>

      <div className="wizard-progress">
        <div className="wizard-progress-top">
          <span className="wizard-step-label">Step {step + 1} of {totalSteps}</span>
          <span className="wizard-step-title">{currentTitle}</span>
        </div>
        <div className="wizard-progress-bar">
          <div className="wizard-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        {remainingTitles.length > 0 && (
          <div className="wizard-remaining">
            <span className="wizard-remaining-count">
              {remainingTitles.length} step{remainingTitles.length === 1 ? "" : "s"} left:
            </span>
            <span className="wizard-remaining-list">{remainingTitles.join(" · ")}</span>
          </div>
        )}
        <select className="wizard-jump" value={step} onChange={(e) => setStep(Number(e.target.value))}>
          {SECTIONS.map((s, i) => (
            <option key={s.key} value={i}>{i + 1}. {s.title}</option>
          ))}
          <option value={SECTIONS.length}>{totalSteps}. Review &amp; Export</option>
        </select>
      </div>

      <main className="wizard-body">
        {step < SECTIONS.length && (
          <section className="form-section">
            <h2>{section.title}</h2>
            {section.note && <p className="section-note">{section.note}</p>}

            {section.optionalToggle && (
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={!!data[section.optionalToggle]}
                  onChange={(e) => setField(section.optionalToggle, e.target.checked)}
                />
                <span>Include these slides (only if the client has other metered buildings)</span>
              </label>
            )}

            {section.systemOptions && <SystemOptions data={data} setField={setField} />}

            {sectionEnabled && !section.systemOptions && (
              <>
                <div className="field-grid">
                  {section.fields.map((f) => (
                    <Field key={f.name} field={f} value={data[f.name]} onChange={setField} />
                  ))}
                </div>

                {section.perUnit && (
                  <div className="totals">
                    <h3>Per-Unit Cost (AUTO)</h3>
                    <p className="per-unit">{perUnitCost(data).toLocaleString()} MMK / unit</p>
                    <p className="hint">= Total EPC Cost ÷ Total EPC Units. Shown on slide 6.</p>
                  </div>
                )}

                {section.roiCalc && (() => {
                  const r = roiCompute(data);
                  const mmk = (n) => Math.round(n).toLocaleString();
                  return (
                    <div className="totals">
                      <h3>ROI Calculation (live)</h3>
                      <p className="hint">EPC : Solar = <strong>{r.ratio}</strong> ({r.epcPct}% : {r.solarPct}%)</p>
                      <ul>
                        <li>EPC-only — annual: {mmk(r.annualEpc)} MMK · {r.years} yr: <strong>{mmk(r.totalEpc)} MMK</strong></li>
                        <li>Solar — annual: {mmk(r.annualSolar)} MMK · {r.years} yr: <strong>{mmk(r.totalSolar)} MMK</strong></li>
                        <li>Savings over {r.years} yr: <strong>{mmk(r.savings)} MMK</strong></li>
                      </ul>
                    </div>
                  );
                })()}

                {section.paybackTable && (() => {
                  const pb = paybackRows(data);
                  const mmk = (v) => Math.round(v).toLocaleString();
                  if (pb.columns.length === 0) return <p className="hint">Add options in the System Options step first.</p>;
                  return (
                    <div className="payback-preview">
                      <h3>Live Preview — Slide 17</h3>
                      <div className="pb-scroll">
                        <table className="pb-table">
                          <tbody>
                            <tr><th>Options</th>{pb.columns.map((c, k) => <th key={k}>{c.title}</th>)}</tr>
                            <tr><td>System</td>{pb.columns.map((c, k) => <td key={k}>{c.system}</td>)}</tr>
                            <tr><td>CAPEX (MMK)</td>{pb.columns.map((c, k) => <td key={k}>{mmk(c.capex)}</td>)}</tr>
                            <tr><td>EPC / Month</td>{pb.columns.map((_, k) => <td key={k}>{mmk(pb.epcMonth)} Units</td>)}</tr>
                            <tr><td>EPC / Year (MMK)</td>{pb.columns.map((_, k) => <td key={k}>{mmk(pb.epcYear)}</td>)}</tr>
                            <tr><td>Solar / Month</td>{pb.columns.map((c, k) => <td key={k}>{mmk(c.solarMonth)} Units</td>)}</tr>
                            <tr><td>Solar / Year</td>{pb.columns.map((c, k) => <td key={k}>{mmk(c.solarYear)} Units</td>)}</tr>
                            <tr><td>Payback Period</td>{pb.columns.map((c, k) => <td key={k}>{c.payback} Years</td>)}</tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {section.excelAnalyze && (
                  <ExcelAnalyze config={section.excelAnalyze} projectId={projectId} data={data} setField={setField} />
                )}

                {section.powerAnalyzer && (
                  <PowerAnalyzer config={section.powerAnalyzer} projectId={projectId} data={data} uploads={uploads}
                                setField={setField} setUploads={setUploads} />
                )}

                {section.images && (
                  <>
                    <h3>Photos</h3>
                    <div className="image-grid">
                      {section.images.map((img) => (
                        <ImageUpload
                          key={img.name}
                          image={img}
                          projectId={projectId}
                          currentUrl={api.fileUrl(uploads[img.name])}
                          onUploaded={(fieldName, url) => setUploads((u) => ({ ...u, [fieldName]: url }))}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {step === SECTIONS.length && (
          <section className="form-section">
            <h2>Review &amp; Export</h2>
            <p className="hint">The proposal deck is generated as a dark-themed PowerPoint (slides 1–12). More sections coming soon.</p>
            <div className="export-actions">
              <button onClick={saveDraft} disabled={saving}>{saving ? "Saving..." : "Save Draft"}</button>
              <button className="primary" onClick={handleExport} disabled={exportBusy}>
                {exportBusy ? "Exporting..." : "Export PPTX"}
              </button>
            </div>
            {exportError && <p className="error">{exportError}</p>}
          </section>
        )}
      </main>

      <div className="wizard-footer">
        <button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</button>
        {!isReview && (
          <button className="primary" onClick={() => setStep((s) => Math.min(SECTIONS.length, s + 1))}>Next →</button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [authState, setAuthState] = useState("checking"); // checking | out | in
  const [user, setUser] = useState(null);
  const [view, setView] = useState("form"); // form | admin
  const [activeProject, setActiveProject] = useState(null); // null = show client picker

  useEffect(() => {
    return onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setAuthState("out");
        return;
      }
      ensureFreshToken().then(() => api.me()).then((me) => {
        setUser(me);
        setView(me.role === "admin" ? "admin" : "form");
        setAuthState("in");
      }).catch(() => {
        signOut(auth);
        setAuthState("out");
      });
    });
  }, []);

  function logout() {
    api.logout().catch(() => {}).finally(() => signOut(auth));
    setUser(null);
    setAuthState("out");
    setActiveProject(null);
    setView("form");
  }

  function editProject(id) {
    api.getProject(id).then((p) => {
      setActiveProject(p);
      setView("form");
    });
  }

  if (authState === "checking") return null;
  if (authState === "out") return <Login />;

  const isAdmin = user?.role === "admin";

  // Admin panel is a fully separate full-screen shell (own header + sidebar) —
  // no shared chrome with the staff proposal form.
  if (view === "admin" && isAdmin) {
    return (
      <Admin
        currentEmail={user.email}
        userName={user.name || user.email}
        onEditClient={editProject}
        onExit={() => setView("form")}
        onLogout={logout}
      />
    );
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-brand">
          <img src="/zarni-logo.png" alt="Zarni Electronics" />
          <span>Zarni Solar</span>
        </div>
        <div className="topbar-actions">
          {isAdmin && (
            <button className="topbar-link" onClick={() => setView("admin")}>Admin</button>
          )}
          <button className="icon-btn" title={`Log out (${user?.name || user?.email})`} onClick={logout}>⏻</button>
        </div>
      </div>

      {activeProject === null ? (
        <div className="app">
          <ClientPicker onPicked={(p) => setActiveProject(p)} />
        </div>
      ) : (
        <ProposalForm
          key={activeProject.id}
          initialProject={activeProject}
          onExitToPicker={() => setActiveProject(null)}
        />
      )}
    </>
  );
}
