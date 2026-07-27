# Handoff Log

Running log of notable changes for AI tooling/session continuity. Newest entries at the top.

---

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
