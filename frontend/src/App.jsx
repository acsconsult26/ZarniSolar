import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { SECTIONS, computeTotals } from "./fields";
import "./App.css";

function Field({ field, value, onChange, onDraft, drafting }) {
  if (field.type === "textarea") {
    return (
      <label className="field field-wide">
        <span>{field.label}{field.required ? " *" : ""}</span>
        <textarea
          rows={8}
          value={value ?? ""}
          lang={field.lang === "mm" ? "my" : undefined}
          onChange={(e) => onChange(field.name, e.target.value)}
        />
        {field.draft && (
          <button type="button" className="draft-btn" onClick={() => onDraft(field)} disabled={drafting}>
            {drafting ? "Generating draft…" : "Generate draft from data"}
          </button>
        )}
      </label>
    );
  }
  return (
    <label className="field">
      <span>{field.label}{field.required ? " *" : ""}</span>
      <input
        type={field.type}
        value={value ?? ""}
        lang={field.lang === "mm" ? "my" : undefined}
        onChange={(e) => onChange(field.name, e.target.value)}
      />
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

export default function App() {
  const [projectId, setProjectId] = useState(null);
  const [name, setName] = useState("Untitled Project");
  const [data, setData] = useState({});
  const [uploads, setUploads] = useState({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [slide19Url, setSlide19Url] = useState(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState(null);
  const [flowchartKey, setFlowchartKey] = useState(0);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [drafting, setDrafting] = useState(false);

  async function handleDraft(field) {
    if (!projectId || field.draft !== "slide21") return;
    setDrafting(true);
    try {
      await api.updateProject(projectId, { name, data }); // ensure latest data on server
      const result = await api.slide21Draft(projectId);
      setField(field.name, result.text);
    } catch (e) {
      // non-fatal: leave the field as-is
      console.error(e);
    } finally {
      setDrafting(false);
    }
  }

  const totals = useMemo(() => computeTotals(data), [data]);

  useEffect(() => {
    api.createProject({ name: "Untitled Project", data: {} }).then((project) => setProjectId(project.id));
  }, []);

  function setField(fieldName, value) {
    setData((d) => ({ ...d, [fieldName]: value }));
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

  async function generateSlide19() {
    if (!projectId) return;
    setGenBusy(true);
    setGenError(null);
    try {
      await saveDraft();
      const result = await api.generateSlide19(projectId);
      setSlide19Url(api.fileUrl(result.url));
    } catch (e) {
      setGenError(String(e));
    } finally {
      setGenBusy(false);
    }
  }

  async function uploadSlide19Manual(e) {
    const file = e.target.files[0];
    if (!file || !projectId) return;
    const result = await api.uploadSlide19Fallback(projectId, file);
    setSlide19Url(api.fileUrl(result.url));
    setGenError(null);
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

  return (
    <div className="app">
      <header>
        <h1>Solar ESS Proposal Generator</h1>
        <input className="project-name" value={name} onChange={(e) => setName(e.target.value)} />
        {projectId && <span className="project-id">Project #{projectId}</span>}
      </header>

      <nav className="steps">
        {SECTIONS.map((s, i) => (
          <button key={s.key} className={i === step ? "active" : ""} onClick={() => setStep(i)}>
            {i + 1}. {s.title}
          </button>
        ))}
        <button className={step === SECTIONS.length ? "active" : ""} onClick={() => setStep(SECTIONS.length)}>
          Review & Export
        </button>
      </nav>

      <main>
        {step < SECTIONS.length && (
          <section className="form-section">
            <h2>{section.title}</h2>
            <div className="field-grid">
              {section.fields.map((f) => (
                <Field key={f.name} field={f} value={data[f.name]} onChange={setField} onDraft={handleDraft} drafting={drafting} />
              ))}
            </div>
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

            {section.key === "system" && (
              <div className="totals">
                <h3>Live Totals (AUTO)</h3>
                <ul>
                  <li>Total Inverter: {totals.total_inverter_kw} kW</li>
                  <li>Total Battery: {totals.total_battery_kwh} kWh</li>
                  <li>Total Solar: {totals.total_solar_kwp} kWp</li>
                </ul>
                <p className="hint">
                  These AUTO totals drive slides 8, 17, 18, 19, 21 consistently &mdash; no more mismatched capacity
                  numbers across the deck.
                </p>
              </div>
            )}
          </section>
        )}

        {step === SECTIONS.length && (
          <section className="form-section">
            <h2>Review & Export</h2>

            <div className="totals">
              <h3>Computed Totals</h3>
              <ul>
                <li>Total Inverter: {totals.total_inverter_kw} kW</li>
                <li>Total Battery: {totals.total_battery_kwh} kWh</li>
                <li>Total Solar: {totals.total_solar_kwp} kWp</li>
              </ul>
            </div>

            <div className="slide19">
              <h3>Slide 19 &mdash; AI-Generated Infographic</h3>
              {slide19Url && <img className="slide19-preview" src={slide19Url} alt="Slide 19 infographic" />}
              <div className="slide19-actions">
                <button onClick={generateSlide19} disabled={genBusy}>
                  {genBusy ? "Generating..." : slide19Url ? "Regenerate" : "Generate"}
                </button>
                <label className="upload-fallback">
                  or upload manually
                  <input type="file" accept="image/*" onChange={uploadSlide19Manual} />
                </label>
              </div>
              {genError && <p className="error">{genError}</p>}
            </div>

            <div className="slide20">
              <h3>Slide 20 &mdash; Power Source Priority Flowchart (auto-drawn)</h3>
              {projectId && (
                <img
                  key={flowchartKey}
                  className="flowchart-preview"
                  src={api.previewFlowchartUrl(projectId)}
                  alt="Priority flowchart"
                />
              )}
              <button onClick={() => setFlowchartKey((k) => k + 1)}>Refresh preview</button>
            </div>

            <div className="export-actions">
              <button onClick={saveDraft} disabled={saving}>
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button className="primary" onClick={handleExport} disabled={exportBusy}>
                {exportBusy ? "Exporting..." : "Export PPTX"}
              </button>
            </div>
            {exportError && <p className="error">{exportError}</p>}
          </section>
        )}
      </main>

      <footer>
        <button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Back
        </button>
        <button disabled={step === SECTIONS.length} onClick={() => setStep((s) => Math.min(SECTIONS.length, s + 1))}>
          Next
        </button>
      </footer>
    </div>
  );
}
