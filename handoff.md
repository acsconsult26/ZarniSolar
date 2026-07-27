# Handoff Log

Running log of notable changes for AI tooling/session continuity. Newest entries at the top.

---

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
