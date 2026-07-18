# Project Info — Zarni Solar Proposal Generator

Reference doc for AI tools / future sessions. Written 2026-07-18, updated 2026-07-18.

## 1. What this project is

A full-stack web app used internally by **Zarni Electronics / ZARNI AUNG & SONS
Co., Ltd** (solar EPC company in Myanmar) to generate branded PowerPoint (.pptx)
sales proposals for commercial Solar + ESS (Energy Storage System) projects.

Staff log in, pick or create a **client**, fill out a multi-step form with
site/technical data (survey results, system sizing, financials, images), and
export a fully-designed 35-slide `.pptx` deck — no manual PowerPoint editing.
An admin panel manages the product catalog, company boilerplate text, staff
accounts, and past-proposal history.

## 2. Repository layout

```
Zarni/
├── backend/            FastAPI app (Python)
│   ├── app/
│   │   ├── main.py             FastAPI app, CORS, static /uploads, seeds admin user
│   │   ├── db.py                SQLAlchemy engine/session (SQLite or Postgres)
│   │   ├── models.py            User, Client, Project, Product, ReferenceImage, Boilerplate
│   │   ├── schema.py            VARIABLE field defaults + AUTO computed totals
│   │   ├── boilerplate.py       generic key/value store for admin-editable fixed content
│   │   ├── auth.py               bcrypt password hashing, HMAC-signed bearer tokens, roles
│   │   ├── storage.py            local disk file storage (swap for S3 later)
│   │   ├── routers/
│   │   │   ├── projects.py       proposal CRUD, uploads, AI image gen, export
│   │   │   ├── admin.py          login/me, boilerplate CRUD, reference-image CRUD
│   │   │   ├── products.py       product catalog CRUD
│   │   │   ├── clients.py        client CRUD
│   │   │   └── users.py          staff/admin account CRUD (admin-only)
│   │   └── services/
│   │       ├── pptx_export_v2.py   the deck builder — one function per slide, builds
│   │       │                        the whole 35-slide deck programmatically with python-pptx
│   │       ├── deck_theme.py       dark-navy 16:9 theme engine, shared shape/text helpers,
│   │       │                        Myanmar-font handling
│   │       ├── excel_analysis.py   parses uploaded consumption spreadsheets
│   │       ├── imagegen.py         pluggable AI image client (OpenAI-compatible)
│   │       ├── flowchart.py        Graphviz-drawn priority-logic flowchart
│   │       ├── text_drafts.py      auto-drafts Burmese narrative text
│   │       ├── chart_usage.py      matplotlib usage-comparison bar chart
│   │       └── richtext.py         rich-text HTML <-> pptx run conversion
│   ├── scripts/
│   │   └── migrate_clients.py    one-time backfill: Client rows for pre-existing projects
│   ├── requirements.txt
│   ├── Dockerfile                used by the Hugging Face Space deployment
│   └── .env.example
├── frontend/            React + Vite SPA
│   └── src/
│       ├── main.jsx        entry point
│       ├── App.jsx          auth gate, client picker, multi-step proposal form
│       ├── Login.jsx        shared login screen (used by both form & admin)
│       ├── Admin.jsx        admin shell: Dashboard, Products, Clients, Proposals, Users, Settings
│       ├── RichText.jsx     contentEditable rich-text field
│       ├── fields.js        form field schema, live totals (ROI, payback, per-unit cost)
│       └── api.js           fetch wrapper; auto-attaches bearer token from localStorage
├── zarni_ele.md          original build spec (27-slide era — superseded, kept for history)
├── NEW_DECK_NOTES.md     slide-by-slide map of the current 35-slide reference deck
└── render.yaml           alternate Render.com deploy config for the backend
```

## 3. Technology stack

| Layer | Technology |
|---|---|
| Backend framework | Python 3, **FastAPI**, Uvicorn |
| ORM / DB | **SQLAlchemy**; SQLite by default, swappable to **Postgres** via `DATABASE_URL` |
| Deck generation | **python-pptx** (fully programmatic, no template file) |
| Charts / diagrams | **matplotlib** (usage bar chart), **Graphviz** (priority flowchart) |
| Image processing | **Pillow** |
| Spreadsheet parsing | **openpyxl** |
| Auth | **bcrypt** password hashing + custom HMAC-signed bearer tokens (no external JWT lib) |
| Frontend framework | **React 19** + **Vite** |
| Frontend language | JavaScript (JSX), no TypeScript |
| Styling | Plain CSS (`App.css`, `index.css`), no CSS framework |
| File storage | Local disk (`backend/app/storage.py`), abstracted for a future S3 swap |

## 4. Deployment

Three separate providers, each auto/manually deployed from the same GitHub repo:

- **GitHub** — `github.com/acsconsult26/ZarniSolar`, `main` branch. Source of truth.
- **Vercel** — hosts the frontend. Connected directly to the GitHub repo; **auto-deploys on every push to `main`**.
- **Hugging Face Space** — hosts the backend (Docker runtime, `backend/Dockerfile`).
  **Not auto-deployed** — requires a manual push from the `backend/` subtree:
  ```
  git push hf $(git subtree split --prefix backend main):main --force
  ```
  (git remote `hf` → `https://huggingface.co/spaces/acsconsult/zarni-solar-backend`)
- `render.yaml` exists as an alternate backend deploy target (Render.com), not the primary path.

Frontend talks to the backend via `VITE_API_BASE` (`frontend/.env.production` points at the HF Space URL).

## 5. Data model

- **User** — login account. `email`, `password_hash` (bcrypt), `name`, `role` (`admin` | `staff`), `is_active`. One admin is auto-seeded from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars on first startup if the table is empty.
- **Client** — the customer/company a proposal is for. `name`, `phone`, `email`, `organization`, `address`, `notes`. One client can have many `Project`s over time.
- **Project** — one proposal/export. `client_id` (FK), `created_by_id` (FK User), `name`, `status` (`draft` | `exported`), `data` (JSON blob of all form fields — see `schema.py`), `uploads` (JSON field→file path map), `export_count`, `last_exported_at`.
- **Product** — catalog entry (panel / inverter / battery). Brand, model, rating, spec-table rows, warranty line, image — feeds the spec-table slides and system-option pickers.
- **ReferenceImage** — admin-managed photo library for the reference-gallery slide.
- **Boilerplate** — generic key→JSON store for all fixed/admin-editable content: company info, warranty defaults, closing statement, product categories, slide-19 AI prompt template, export stats.

`Project.data` stays a flexible JSON blob (not normalized into columns) because the
per-site technical fields are numerous and evolve slide-by-slide — see `schema.py`
`VARIABLE_DEFAULTS` for the full field list and `compute_auto_fields()` for derived
totals (total kWp, total kWh, ROI, per-unit cost, etc).

## 6. Auth & roles

- Single login for the whole app (`POST /admin/login` → bearer token). Frontend stores
  the token in `localStorage` and `api.js` attaches it to every request automatically.
- **admin** role: full access — Dashboard, Products, Clients, Proposals, Users, Settings.
- **staff** role: Proposal Form only (create/edit clients and proposals, export decks) — no Admin tab, and `/users` endpoints are admin-only server-side too (not just hidden in the UI).
- All `/projects/*`, `/clients/*` endpoints require login; `/users/*` and boilerplate/product writes require the `admin` role specifically.

## 7. Core workflow

1. **Login** (shared screen for staff/admin).
2. **Pick or create a client** (name/phone/email/organization) — the proposal's `client_id`.
3. **Fill the multi-step proposal form** (`App.jsx` `SECTIONS`, defined in `fields.js`):
   cover/contact → project background → survey/load data → system design (products,
   quantities) → power priority → warranty, etc. Presented as a mobile-first step
   wizard — progress bar, "Step X of 17" counter, and a dropdown to jump to any
   section, with sticky Back/Next navigation pinned to the bottom of the screen.
   Live-computed totals (kWp, kWh, ROI, payback) update as you type. Auto-saves as
   a draft (debounced) on every change.
4. **Optional AI/data-driven slides**: slide-19-equivalent infographic (pluggable AI
   image gen, falls back to manual upload if no API key configured) and the
   priority-logic flowchart (Graphviz, deterministic — not AI).
5. **Export** → `POST /projects/{id}/export` calls `pptx_export_v2.export_project_v2()`,
   which builds the entire deck slide-by-slide with python-pptx using the dark-navy
   theme, and streams back the `.pptx` file. Marks the project `status=exported`,
   increments `export_count`, and logs a month-bucketed export stat for the dashboard.
6. **Admin side** (admin role only): manage the product catalog, edit company/warranty/
   closing-statement boilerplate text, manage the reference-image gallery, view/edit
   past proposals, and manage staff/admin user accounts.

## 8. Slide coverage (35-slide target deck)

See [NEW_DECK_NOTES.md](NEW_DECK_NOTES.md) for the full slide-by-slide map of the
target reference deck (`MRTV -Update file.pptx`). As of 2026-07-18, slides 1, 3–24,
26–28, and a closing slide are implemented in `pptx_export_v2.py`. **Not yet built**:
slide 2 (section divider), 25 (Real Time Monitoring), 29–30 (Technical Advantages
narrative), 31–33 (Solar Mounting Structure design), a standalone 34 (Warranty
summary slide — currently only per-product warranty lines exist), and 35 (Thank You).
The CAPEX/payback table is also simplified vs. the notes' full 4-option matrix.

## 9. Frontend UI/UX

- **Staff proposal form and admin panel are fully separate surfaces** — no shared
  chrome (logo, nav) between them. Each renders its own top bar/header.
- **Staff form**: minimal top bar (logo + "Zarni Solar" wordmark, an "Admin" link
  shown only to admin-role users, and a top-right circular logout icon button) above
  a mobile-first step wizard — see workflow step 3 above.
- **Admin panel**: full-screen shell with a dark navy sidebar (Dashboard, Products,
  Clients, Proposals, Users, Settings) and a topbar with the page title on the left
  and a top-right logout icon button. "← Proposal Form" link sits at the bottom of
  the sidebar to exit back to the staff form (relevant for admin users, who can see
  both surfaces).
- **Logout is always a top-right icon button** in both surfaces — consistent
  placement was a specific design requirement.
- No CSS framework; hand-written CSS in `App.css` using CSS custom properties
  (`--brand-blue`, `--brand-red`, `--brand-gold`, `--navy`) for the Zarni brand palette.

## 10. Bilingual (Burmese) support

The deck mixes English and Burmese (Myanmar Unicode) text. Any text run containing
Burmese is forced onto the **Pyidaungsu** font (`deck_theme.py`) so it never renders
as boxes — the viewer's PowerPoint needs a Myanmar Unicode font installed
(Pyidaungsu / Myanmar Text / Padauk) to display correctly.

## 11. Schema migrations

There's no Alembic setup. `main.py` runs `Base.metadata.create_all()` (creates any
wholly-missing tables) followed by `migrations.auto_migrate()` (`backend/app/migrations.py`),
which diffs each *existing* table's live columns against the SQLAlchemy model and
issues `ALTER TABLE ... ADD COLUMN` for anything missing, backfilling a SQL default
where the column has a Python-side default (so `NOT NULL` columns don't break on
existing rows). This exists because `create_all()` alone never alters a table that's
already present — a lesson learned the hard way when adding `Project.client_id` /
`status` / etc. 500'd in production against the pre-existing `projects` table.
Column *type* changes and drops are still unhandled — only additive column changes
auto-migrate safely today.

## 12. Known simplifications / gaps

- No S3 file storage yet — uploads live on local disk (`storage.py`), which is
  ephemeral on the Hugging Face free tier (resets on Space restart/rebuild).
- No password-reset flow — admin resets a user's password directly via the Users tab.
- `render.yaml` (Render.com) exists but Hugging Face is the actively used backend host.
- Admin panel's sidebar is not mobile-optimized (wraps into a busy row on narrow
  screens) — acceptable for now since admin work is expected to happen on desktop;
  only the staff proposal form was designed mobile-first.
- Seeded demo accounts (`admin@zarni.com` / staff test accounts) only exist per
  database — a fresh production DB has just the auto-seeded admin; staff accounts
  must be created via Admin → Users on that specific deployment, they don't carry
  over from local testing.
