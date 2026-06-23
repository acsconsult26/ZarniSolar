# Solar ESS Proposal Generator

Full-stack app that merges client/project data into the company's branded
27-slide PowerPoint template (`MRTV Prosal 17.June.2026.pptx`) and exports a
downloadable `.pptx` proposal. See [zarni_ele.md](zarni_ele.md) for the full spec.

## How it works

1. `backend/scripts/tokenize_template.py` reads the original template once and
   writes a **tokenized** copy to `backend/app/template.pptx`, replacing
   variable text values with `{{token}}` placeholders *inside existing runs*
   (so fonts/colors/bold are untouched). Already committed — re-run it only if
   the original deck design changes:
   ```
   python3 backend/scripts/tokenize_template.py
   ```
2. At export time, `backend/app/services/pptx_export.py` opens
   `template.pptx`, substitutes every `{{token}}` with the project's values,
   swaps placeholder picture shapes for uploaded photos, drops in the slide-19
   AI infographic and the slide-20 priority flowchart (drawn with Graphviz,
   not AI), and streams back the finished deck. Fixed slides (2, 7, 10-16,
   22-27 boilerplate) are left untouched.
3. Any run containing Burmese (Myanmar Unicode) text is forced onto the
   **Pyidaungsu** font so it never renders as boxes. The end user's PowerPoint
   needs a Myanmar Unicode font installed (Pyidaungsu / Myanmar Text / Padauk)
   to display correctly.

## Run it

### Backend (FastAPI)
```
cd backend
python3 -m venv .venv && source .venv/bin/activate   # optional
pip install -r requirements.txt
brew install graphviz   # provides the `dot` binary used for slide 20
cp .env.example .env    # fill in IMAGE_GEN_* if you want slide-19 AI generation
uvicorn app.main:app --reload --port 8000
```
Verified: `/health`, project create/update, image upload, `/slide19/generate`
(fails gracefully to manual upload without an API key), `/slide20/preview`,
and `/export` (produces a 27-slide deck) all work end-to-end via curl.

### Frontend (React + Vite)
```
cd frontend
npm install
echo "VITE_API_BASE=http://localhost:8000" > .env
npm run dev
```
Open http://localhost:5173. `npm run build` was verified to succeed.
**Not yet verified in an actual browser** (no UI automation was run in this
session) — please click through the multi-step form once before relying on
it; the network/API layer is confirmed working but visual/UX issues may exist.

## What's simplified vs. the full spec

- **Admin panel UI**: the backend has full CRUD for boilerplate content,
  reference images (slide 23), and field defaults (`/admin/*` endpoints), but
  there's no dedicated admin *screen* in the frontend yet — only the client
  multi-step form. Admin content can be edited via the API today.
- **Reference project slides 24/25 & reference-sites table (slide 26)**: data
  model and API exist (`admin.boilerplate["reference_projects"]` /
  `["reference_sites_table"]`), but these fixed slides are not yet re-rendered
  from that data at export time — they currently pass through from the
  original template unchanged. Wire this into `pptx_export.py` if/when the
  admin UI for editing them is built.
- **Slide 9 system drawing / load profile chart**: upload-only; no in-app
  chart authoring tool, matching the spec (these are uploaded images, not
  AI/data-generated).

## Project layout

```
backend/
  app/
    main.py            FastAPI app, CORS, static /uploads
    db.py, models.py    SQLite via SQLAlchemy (swap DATABASE_URL for Postgres)
    schema.py           VARIABLE field defaults + AUTO total computation
    storage.py           local disk storage (swap for S3 later)
    template.pptx        tokenized deck (generated, committed)
    services/
      pptx_export.py     token replace, image swap, slide 19/20 insertion
      imagegen.py         pluggable AI image client (env-configured)
      flowchart.py         Graphviz-drawn slide 20
    routers/
      projects.py, admin.py
  scripts/tokenize_template.py
frontend/
  src/App.jsx, fields.js, api.js   multi-step form, live totals, exports
```
