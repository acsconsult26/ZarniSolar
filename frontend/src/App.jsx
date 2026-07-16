import { useEffect, useState } from "react";
import { api } from "./api";
import { SECTIONS, perUnitCost, roiCompute, paybackRows } from "./fields";
import RichText from "./RichText";
import Admin from "./Admin";
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
      <label className="field field-wide">
        <span className="field-label">{field.label}{field.required ? " *" : ""}</span>
        {field.help && <small className="field-help">{field.help}</small>}
        <RichText value={value} onChange={(html) => onChange(field.name, html)} placeholder={field.help} />
      </label>
    );
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
                <select value="" onChange={(e) => { pickProduct(i, j, e.target.value); e.target.value = ""; }}>
                  <option value="">{it.name ? "↺ change product" : "Pick product…"}</option>
                  {catalog.map((p) => (
                    <option key={p.id} value={p.id}>{p.brand} {p.model_name}</option>
                  ))}
                </select>
                <input className="item-name" value={it.name || ""} placeholder="item name"
                       onChange={(e) => setItem(i, j, { name: e.target.value })} />
                <input className="item-qty" type="number" value={it.qty ?? ""} placeholder="qty"
                       onChange={(e) => setItem(i, j, { qty: e.target.value })} />
                <input className="item-unit" value={it.unit || ""} placeholder="unit"
                       onChange={(e) => setItem(i, j, { unit: e.target.value })} />
                <button className="remove-x" onClick={() => removeItem(i, j)}>×</button>
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

export default function App() {
  const [projectId, setProjectId] = useState(null);
  const [name, setName] = useState("Untitled Project");
  const [data, setData] = useState({});
  const [uploads, setUploads] = useState({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [view, setView] = useState("form");

  useEffect(() => {
    api.createProject({ name: "Untitled Project", data: {} }).then((p) => setProjectId(p.id));
  }, []);

  // Debounced auto-save
  useEffect(() => {
    if (!projectId || view !== "form") return;
    const t = setTimeout(() => api.updateProject(projectId, { name, data }).catch(() => {}), 700);
    return () => clearTimeout(t);
  }, [name, data, projectId, view]);

  function setField(fieldName, value) {
    setData((d) => ({ ...d, [fieldName]: value }));
  }

  async function loadProject(id) {
    const p = await api.getProject(id);
    setProjectId(p.id);
    setName(p.name);
    setData(p.data || {});
    setUploads(p.uploads || {});
    setStep(0);
    setView("form");
  }

  async function newProject() {
    const p = await api.createProject({ name: "Untitled Project", data: {} });
    setProjectId(p.id);
    setName("Untitled Project");
    setData({});
    setUploads({});
    setStep(0);
    setView("form");
  }

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

  if (view === "admin") {
    return <Admin onEditClient={loadProject} onExit={() => setView("form")} />;
  }

  const section = SECTIONS[step];
  const sectionEnabled = !section?.optionalToggle || !!data[section.optionalToggle];

  return (
    <div className="app">
      <div className="brand-logo">
        <img src="/zarni-logo.png" alt="Zarni Electronics" />
      </div>

      <div className="topnav">
        <button className={view === "form" ? "active" : ""} onClick={() => setView("form")}>Proposal Form</button>
        <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>Admin</button>
      </div>

      <header>
        <h1>Zarni Solar — Proposal</h1>
        <input className="project-name" value={name} onChange={(e) => setName(e.target.value)} />
        {projectId && <span className="project-id">Project #{projectId}</span>}
        <button className="new-project-btn" onClick={newProject}>+ New</button>
      </header>

      <nav className="steps">
        {SECTIONS.map((s, i) => (
          <button key={s.key} className={i === step ? "active" : ""} onClick={() => setStep(i)}>
            {i + 1}. {s.title}
          </button>
        ))}
        <button className={step === SECTIONS.length ? "active" : ""} onClick={() => setStep(SECTIONS.length)}>
          Review &amp; Export
        </button>
      </nav>

      <main>
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

      <footer>
        <button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
        <button disabled={step === SECTIONS.length} onClick={() => setStep((s) => Math.min(SECTIONS.length, s + 1))}>Next</button>
      </footer>
    </div>
  );
}
