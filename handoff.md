# Handoff Log

Running log of notable changes for AI tooling/session continuity. Newest entries at the top.

---

## 2026-07-28 — Boot loading screen + Google Maps location snapshot

- **Boot loader**: `frontend/index.html` now has a critical-inline loading screen (pulsing Zarni mark + sweeping red/gold/blue gradient bar, matches the brand look already used on the login screen) shown from first paint until React mounts and overwrites `#root`. A matching `<BootLoader/>` component in `App.jsx` covers the same gap for the post-mount Firebase auth-check ("checking" state), which previously rendered a blank white screen.
- **Google Maps location snapshot** (Surveying Data step, slide 5): new "📍 Get Map Image from Coordinates" button, enabled once lat/lng are filled in. Backend (`backend/app/services/map_image.py`, new endpoint `POST /projects/{id}/fetch-map-image`) fetches a Google Static Maps satellite image centered on the coordinates and stores it as the existing `survey_image` upload — reuses the slide 5 image slot as-is, no pptx export changes needed. **Requires `GOOGLE_MAPS_API_KEY` to be set on the Cloud Run backend** (enable "Maps Static API" in Google Cloud Console for the `zarni-solar-proposal-1c2b9` project, generate a key, `gcloud run services update zarni-solar-backend --set-env-vars GOOGLE_MAPS_API_KEY=...`) — until then the button fails with a clear "not configured" error; nothing else is affected.

---

## 2026-07-28 — Power Analyzer date range is now derived from the uploaded log

- Removed the manual "Date Range" date-range picker from the Power Analyzer step (and the optional Second Survey's analyzer step) — the uploaded trend log already has start/end timestamps, so `analyze_power_log()` now returns a formatted `date_range` string ("22.May.26 – 24.May.26") and the analyze-power-log endpoint writes it directly into `analyzer_date_range` / `second_analyzer_date_range`, the same fields the pptx export already reads for the slide subtitle. The now-unused `daterange` field type/`DateRangeField` component were removed from `fields.js`/`App.jsx`.

---

## 2026-07-28 — Power Analyzer CSV/Excel analysis feature + fixed a login-crashing CORS false alarm

- **Fixed `/admin/me` login crash**: comparing Firestore's timezone-aware `last_login_at` against `datetime.utcnow()` (naive) raised an unhandled `TypeError`. Since it was unhandled, it bypassed FastAPI's CORS middleware entirely, so the browser only reported a missing `Access-Control-Allow-Origin` header instead of the real 500 — not an actual CORS misconfiguration. Fixed in `backend/app/routers/admin.py`.
- **New Power Analyzer CSV/Excel analysis feature** (Power Analyzer step, slide 10, and the optional Second Survey's slide 12):
  - `backend/app/services/power_analyzer.py` (new) — parses the analyzer's raw trend-log export (CSV or XLSX). The device's header layout is unusually tricky: group labels (e.g. "W") sit in a merged/centered cell over their L1/L2/L3(+total) sub-columns rather than the group's first column, and some phase readings switch units between W and kW depending on magnitude mid-file. Verified against a real ~8,640-row 2-day sample file from the client (`Ko Min Han,MRTV ALL.csv`) — caught and fixed two real bugs this way: (1) a date-format bug (device uses YY/MM/DD, not DD/MM/YY), (2) a column-segmentation bug that mixed in a neighboring group's column and summed mismatched W/kW units, producing a nonsense ~1998kW "peak" before the fix (correct peak is ~139kW).
  - `backend/app/services/chart_power_hourly.py` (new) — renders the hourly-load bar chart via matplotlib, same transparent dark-deck styling as the existing `chart_usage.py`.
  - `POST /projects/{id}/analyze-power-log?field=analyzer|second_analyzer` (new, in `projects.py`) — computes avg/peak kW, PF, THD (voltage & current), stores the stats on the project's `data` and the rendered chart image in Firebase Storage (via the existing compression pipeline), returns both plus the chart URL.
  - `pptx_export_v2.py` — new `_slide_analyzer_stats` slide (dynamically numbered, inserted right after the fixed-numbered slide 10/12 analyzer slides) shows the stats + chart image on export.
  - Frontend: new `PowerAnalyzer` component (`App.jsx`) with a real upload-progress bar (via `XMLHttpRequest` for progress events) transitioning through uploading → analyzing → done/error, showing stat cards and the chart preview (same image used in the deck). Wired into both the primary and second-survey analyzer sections via a new `powerAnalyzer` field on their `fields.js` section configs.
  - Architecture: built into the existing FastAPI backend (Cloud Run), not a separate Cloud Function — matches the existing consumption-Excel-analyzer pattern (`excel_analysis.py`), avoids a second deploy target and duplicate `pandas`/`openpyxl` dependencies.

## 2026-07-27 — Proposal form bug fixes: rich text, image uploads, date pickers, gateway product, east view

- **Rich text editor broken** (`frontend/src/RichText.jsx`, `App.jsx`): the contentEditable box was wrapped in a `<label>` with no associated form control, which silently ate the click-to-focus in Chrome — typing/bold/italic did nothing. Fixed by using a `<div>` wrapper. Also replaced the deprecated/unreliable `document.execCommand` formatting calls with manual Range/DOM wrapping (`<strong>`/`<em>`/`<u>` + manual list insertion) since execCommand didn't reliably apply formatting.
- **Uploaded images not showing + broken storage URLs** (root cause of both bugs, and of the `ERR_NAME_NOT_RESOLVED` console error): `api.fileUrl()` unconditionally prepended the Cloud Run API base to whatever path it got, but `storage.url_for()` already returns a full Firebase Storage URL — double-prefixing produced malformed URLs like `...run.apphttps//firebasestorage...`. Fixed `api.fileUrl` to pass through absolute URLs unchanged, and fixed the backend's project `_serialize()` (`backend/app/routers/projects.py`) to resolve `uploads` paths to full URLs consistently with the fresh-upload response.
- **Image compression** (`backend/app/storage.py`): uploads are now downscaled (max 1920px) and re-encoded as JPEG (or PNG if they have real transparency) via Pillow before saving to Firebase Storage, with `content_type` set correctly.
- **Proposal Date** is now a native date picker (`frontend/src/fields.js`).
- **Power Analyzer date range** (step 9 / slide 10): replaced the free-text field with a proper from/to date-range picker (`daterange` field type, `DateRangeField` component in `App.jsx`).
- **System Options UI overflow** (step 11 / slides 13-14): item rows (product select, name, qty, unit) were overflowing option cards after the 2nd item. Redesigned into two stacked rows per item with flexible/min-width-0 children so it can't overflow regardless of card width.
- **EPC units / unit cost auto-fill**: Total EPC Units and the derived per-unit cost from the Electricity Bill step now auto-populate the ROI and Payback steps' equivalent fields (only when those fields are still empty), so the same numbers don't need retyping.
- **East View** added alongside West/South View throughout the Simulation & Shade Reports section (slide 20 image, new shade-report slide, `fields.js` + `pptx_export_v2.py`).
- **Gateway product** added as a 4th product-select field (alongside Inverter/Solar/Battery) on the Product Specifications step, plus a new "Gateway" product category wired through `boilerplate.py` (with a migration helper `ensure_category()` for already-seeded Firestore docs), `Admin.jsx` category list + spec fields, and a new gateway spec slide in `pptx_export_v2.py`.

## 2026-07-27 — Proposal wizard step indicator, admin sidebar collapse, system logs, responsive pass

- **Proposal form**: wizard progress bar now shows "N steps left: Section A · Section B · ..." listing remaining section titles (`frontend/src/App.jsx`).
- **Admin dashboard**: fixed asymmetric blank-space layout bug by centering `.admin-content` (`frontend/src/App.css`).
- **Admin sidebar**: added collapse/expand toggle (desktop), auto-collapses to icon-only on tablet widths (721-1024px), reverts to horizontal bar on mobile (≤720px) (`frontend/src/Admin.jsx`, `frontend/src/App.css`).
- **System Logs tab** (new): audit trail of login/logout, client/product/user create/update/delete. Backend: new `activity_log` Firestore collection (`backend/app/activity_log.py`), new `GET /admin/logs` endpoint (`backend/app/routers/logs.py`), logging calls wired into `admin.py`, `clients.py`, `products.py`, `users.py`. Frontend: new "System Logs" nav tab in `Admin.jsx`.
- **Responsive pass**: admin tables (`clients-table`, `catalog-table`) now scroll horizontally within their card instead of breaking layout on narrow screens; tightened mobile spacing for topbar/content/modals.
- Fixed an N+1 Firestore read pattern in the client list endpoint (one query per client → single collection scan), removed leftover Render/pre-migration config files.

## 2026-07-27 — Migrated from Postgres/Vercel/Hugging Face/Supabase to Firebase/Firestore/Cloud Run

- Full backend rewrite: SQLAlchemy/Postgres → Firestore (`backend/app/firebase.py`, `backend/app/firestore_db.py`, all routers rewritten).
- Firebase Auth replaces custom JWT auth; role/profile stored in Firestore `users/{uid}` doc.
- Firebase Storage replaces local disk uploads (`backend/app/storage.py`).
- Frontend deployed to Firebase Hosting; backend deployed to Cloud Run (`gcloud run deploy --source .`).
- Client's own Firebase project: `zarni-solar-proposal-1c2b9` (Blaze plan). Live URLs:
  - Frontend: https://zarni-solar-proposal-1c2b9.web.app
  - Backend: https://zarni-solar-backend-984257448342.us-central1.run.app
- Old production data on Supabase was **not migrated** (wrong/unlocatable credentials) — decided to start fresh on Firebase instead.
- Vercel, Hugging Face Space, and Supabase project decommissioning was approved by the client but requires manual dashboard access (no API tooling available in-session) — not yet confirmed done.

---

## Workflow note

Per client instruction: every code change in this repo should be **committed + pushed to GitHub, and deployed** (Firebase Hosting for frontend, Cloud Run for backend) as part of finishing the task — not left as local-only changes. Log a dated entry here summarizing what changed each time.
