# Handoff Log

Running log of notable changes for AI tooling/session continuity. Newest entries at the top.

---

## 2026-08-08 (2) — 15-item batch: bug fixes + proposal form/admin features

**Bug fixes** (highest priority, were blocking real usage):
- Product-select dropdowns in Product Specifications (`App.jsx` `ProductSelect`) never actually selected anything — Firestore doc IDs are random alphanumeric strings, and `onChange` coerced them with `Number()`, turning every real ID into `NaN`, which never matched any `<option>` value so the select always snapped back to blank. Fixed by keeping the value as a plain string.
- 401 "Not Authenticated" on export after the form had been open a while: `api.js` cached the Firebase ID token once at sign-in and only refreshed it via the SDK's own background timer, which idle/backgrounded browser tabs can throttle or skip — the cached token could sit expired for the rest of the session. Rewrote `authHeaders()` to call `getIdToken()` fresh on every request (it checks local expiry and auto-refreshes over the network when stale, so this is cheap when the token is still valid).
- Power analyzer daily-unit calculation (`power_analyzer.py`) now follows the exact formula requested: `Unit(kWh) = Σ(Watt × seconds-between-rows) / (3,600,000)`, with the interval measured once from the first two rows (uniform sampling assumed, not recomputed per row). Feeds `analyzer_stats.avg_daily_kwh`, which the ROI auto-fill now uses instead of the old rough `avg_kw × 24` estimate.
- Slide 16's Load/Grid/Solar usage chart (`_slide_usage_chart` in `pptx_export_v2.py`) had backwards semantics — Load was computed as `grid + solar` instead of being the client's actual 24h consumption. Fixed: Load is now constant across all option bars (sourced from `roi_total_epc_units`), Grid/Solar vary per option as before.

**Proposal form** (`App.jsx`, `fields.js`, `App.css`):
- System Options: fixed a CSS grid issue that made option cards 2-4 look like they overlapped (`grid-auto-rows: min-content` + `align-items: start` + `auto-fill` instead of `auto-fit`); product picker within each option is now grouped by category via `<optgroup>`; removed the redundant "Daily Usage Units" baseline field since the chart now derives it automatically.
- Cross-field auto-copy extended: System Options' CAPEX now feeds ROI's new "System Investment" field, and daily units auto-convert (×30) into the monthly Payback field, alongside the existing unit-cost sync.
- ROI reworked from a flat "N-year projection" model to a bill/investment/payback model — shows what the client currently pays (MMK/yr), the system's CAPEX, annual savings, and payback period in years. Both the live form preview and the backend's `_slide_roi` were rewritten; the old `roi_years` field is gone, replaced by a `roi_system_cost` field auto-filled from System Options.
- Export is now a split button — PPTX by default, PDF via a dropdown (backend converts via LibreOffice headless, `pptx_to_pdf.py`; `libreoffice-impress` added to the Docker image). A green "Create New Proposal" box appears after a successful export.
- Added a 4-template deck-theme picker (Navy & Gold / Emerald / Charcoal / Burgundy) with color-swatch previews in the Review & Export step; selection is stored on the project and threads through to both PPTX and PDF export. `deck_theme.py`'s palette is now thread-local (not a plain module global) so concurrent exports on Cloud Run's threadpool with different themes can't bleed into each other — this was a real concurrency bug I introduced and caught before shipping (bare `GOLD`/`ACCENT`/`PANEL` references inside deck_theme.py's own functions would have thrown `NameError` at import time if left as module-level names after removing the static assignments; fixed by resolving them through `_palette()` everywhere, including default-parameter-value cases like `add_panel(..., color=PANEL)` which had to become `color=None` since defaults are evaluated once at def-time).
- "Project Solution" (Surveying Data step) is now an admin-managed dropdown instead of free text (`solution-select` field type, mirrors the existing `warranty-select` pattern).
- Confirmed the existing localStorage draft-mirroring (added in an earlier session) already covers the "accidentally navigating away mid-form" case — no new code needed there.

**Admin panel** (`Admin.jsx`, backend):
- Inverter spec now includes Weight and Dimensions (W x H x Thickness), matching what Panel already had.
- System Logs: added real server-side cursor pagination (20/page, newest first, via `firestore_db.query_page`) so browsing logs no longer scans the whole collection every time (was `list_all` + Python slice, unbounded reads). Added a from/to date-range filter and a PDF export (`logs_pdf.py`, reportlab) of the filtered range — the `activity_log.list_recent()` function was replaced entirely (only caller was this router).
- Added `Admin → Settings → Project Solution Options` card to manage the new dropdown's choices.

Verified via standalone Python smoke tests (all 4 themes produce distinct valid decks; ROI math and chart data checked against hand-computed expected values; PDF generation tested directly) and in-browser via the dev-stub technique for the System Options layout (confirmed non-overlapping via `getBoundingClientRect` — 4 cards, zero pairwise overlaps). A couple of purely-visual pieces (category optgroups, theme-card rendering) hit a test-harness fetch-mock timing limitation rather than an app defect (confirmed the underlying endpoints work via direct fetch) and were verified by code review instead of live screenshot.

Deployed: `firebase deploy --only hosting` (frontend) + `gcloud run deploy` (backend — heavier build this time due to `libreoffice-impress` in the Docker image for PDF export).

---

## 2026-08-08 — Real URL navigation (fixes back/forward exiting the app) + Create New Proposal button

**Frontend only** (`App.jsx`, `Admin.jsx`, `App.css`):
- User reported: clicking "Edit" on a draft from Admin, then pressing browser Back, closed the tab/exited the app instead of returning to the proposal list — happened for both admin and staff flows. Root cause: the SPA never touched the URL, so every internal screen (client picker, a project, each admin tab) lived under the same "/" — there was nothing in browser history to go back to.
- Fixed with real History API integration: `/` = client picker, `/project/:id` = a proposal, `/admin` / `/admin/:tab` = an admin tab. `App.jsx` has one `navigate()` helper that updates state and pushes/replaces history together, plus a `popstate` listener that re-derives state on back/forward. Admin's tab state moved from `Admin.jsx`-local to controlled-by-`App` (`tab`/`onTabChange` props) so tab clicks push into the same history stack. Reload-resume and the new deep-link/back-forward paths both route through one `initFromLocation()` so a refresh on `/project/:id` or `/admin/settings` lands back on the right screen.
- Firebase Hosting already had a catch-all SPA rewrite to `index.html`, so no hosting config change was needed for the new real paths.
- Verified in-browser via the dev-stub technique with mocked fetches: picking a client pushes `/project/:id`, back correctly returns to the picker; clicking through admin tabs pushes `/admin/:tab`, and back correctly walks Settings → Products → Dashboard instead of leaving the app. Found and fixed one bug during verification: an admin landing fresh at `/` rendered the Dashboard but the URL stayed `/` — fixed by replacing to `/admin` in that case, so a later back-navigation to that history entry doesn't land on the staff picker instead.
- Also added a "Create New Proposal" button (green, success-styled) that appears in the Review & Export section right after a successful PPTX export.
- Deployed: `firebase deploy --only hosting` only — no backend changes this round.

---

## 2026-08-07 (7) — Fix Google Maps satellite 403 (EEA account restriction)

**Backend only** (`map_image.py`):
- User hit `403: satellite and hybrid map types are not available for your account and region` in the Surveying Data step's "Get Map Image from Coordinates" button, and assumed it was their VPN's location. It isn't -- the Maps Static API call runs server-side from Cloud Run (always `us-central1`), so the requesting browser's IP/VPN has zero effect. This is a newer Google account-level restriction (EEA/Digital Markets Act) that some Cloud projects get flagged into, blocking satellite/hybrid tiles specifically regardless of who's asking or from where.
- Fixed: `fetch_static_map()` now detects that specific 403 and automatically retries with `maptype=roadmap` (not affected by the restriction) instead of failing the whole feature. Verified with a mocked-httpx unit test confirming the fallback fires and returns a valid image.
- Not fixed by this change: satellite imagery itself is still blocked for this Google Cloud project until Google's EEA compliance form (linked in the original error) is filed on the account, or a different maps account/project is used. The map feature now degrades to a labeled road map instead of erroring out.
- Deployed: `gcloud run deploy` (backend only, no frontend change).

---

## 2026-08-07 (6) — Fix Settings whitespace gaps + saved-warranty visibility

**Frontend only** (`Admin.jsx`, `App.css`):
- `.settings-grid` was a CSS Grid with row bands, so a short card (e.g. Introduction) next to a tall one (e.g. Warranty with several templates) left a large dead gap underneath — classic uneven-grid-row problem. Switched to a CSS-columns masonry layout (`column-count`, `break-inside: avoid` on each card) so cards pack top-to-bottom per column regardless of neighboring heights.
- User reported not being able to see already-saved warranty templates after saving. They were actually being fetched and rendered as full edit forms, just not visible at a glance without scrolling through each one's info textarea. Added a "Currently saved" chip row at the top of Zarni's Warranty showing each template's name + years compactly.
- Also removed a stale, fully-overridden duplicate `.settings-grid`/`.branch-block`/`.settings-status` CSS block left over from before the Settings redesign.
- Verified in-browser via the dev-stub technique with mocked API responses.
- Deployed: `firebase deploy --only hosting` only.

---

## 2026-08-07 (5) — Fix browser tab favicon

**Frontend only** (`index.html`):
- Browser tab was showing the default Vite `/favicon.svg` instead of the Zarni logo — both were linked as `rel="icon"` and the generic one won in some browsers. Removed it, kept only `/zarni-logo.png`, added it as `apple-touch-icon` too.
- Deployed: `firebase deploy --only hosting` only.

---

## 2026-08-07 (4) — Admin-managed content + full admin panel redesign

**Content, now admin-controlled instead of per-proposal** (`boilerplate.py`, `pptx_export_v2.py`, `projects.py`, `fields.js`):
- Introduction (slide 2): admin sets it once (`introduction_message` boilerplate key) and it's reused on every client's deck. Removed the old per-project richtext "Introduction" step from the proposal form.
- Warranty templates (slide 34, renamed "Zarni's Warranty" in the admin UI): restructured from free-text bullet `lines[]` to `{name, years, info}`. `_slide_warranty()` in `pptx_export_v2.py` renders the name as title, "N Years Warranty" as subtitle, info as body paragraphs.
- "Zarni Electronics Service Info (slide 25)" is now "Thank You Message" (`thank_you_message` boilerplate key, was `closing_statement`), moved from a fixed mid-deck slide to the **final** slide of every generated deck.
- Added `_plaintext_blocks()` helper in `pptx_export_v2.py` — these three fields are plain `<textarea>`s (not the rich-text editor), so each non-empty line becomes its own paragraph on the slide instead of being run through `parse_html`.
- `export_project_v2()` signature changed: `closing_statement`/`warranty_lines` params replaced with `introduction_message`/`thank_you_message`/`warranty_template`.

**Admin panel redesign** (`Admin.jsx`, new `Toast.jsx` + `Loading.jsx`, `icons.jsx`, `App.css`):
- New toast system (slide in/out, bottom-right) replacing `alert()` for save/delete feedback across every tab.
- New `Spinner`/`SkeletonRows`/`LoadingBlock`/`FadeIn` components (framer-motion, newly added dependency) used while each tab's data is fetching.
- New button system — `.btn-primary/.btn-ghost/.btn-danger` + icon-only row-action buttons — color now signals meaning (blue=primary, red=delete, gray=neutral).
- Settings tab rebuilt as categorized cards: Company Info & Branches (branches are now a dynamic add/remove list, not fixed at 2), Introduction Message, Zarni's Warranty, Thank You Message, Advanced (AI prompt now hidden behind an "Edit AI Prompt" button + modal, no more "Slide 19" wording anywhere). Removed the read-only "Backend Settings" card entirely. Removed all "(Slide N)" text from admin titles/copy.
- **Found and fixed a real bug during verification**: `AnimatePresence mode="wait"` wrapping the tab content froze the UI on the previous tab forever (header title updated but content didn't) — some incompatibility in this environment. Fixed by dropping `AnimatePresence` and keeping a plain `motion.div` keyed by tab for the enter-fade only.
- Verified via a standalone python-pptx smoke test (paragraph breaks, warranty subtitle, final Thank You slide all correct) and in-browser via the dev-stub technique (Settings cards, AI prompt modal, toast firing, tab switching all confirmed working with mocked API responses).

---

## 2026-07-29 — Slides 29-34 (Technical Advantages, Mounting Structure, Warranty) + invite-based user auth

**Slides 29-34** (`fields.js`, `pptx_export_v2.py`, `boilerplate.py`, `Admin.jsx`):
- Slides 29-30 Technical Advantages: two per-proposal richtext fields, each its own slide.
- Slides 31-33 Mounting Structure: design photos (31) + two "priority install area" photo+note slides (32-33).
- Slide 34 Warranty: new admin-managed **warranty templates** (named, multi-line, CRUD in Admin → Settings, replaces the old unused single `warranty_lines` textarea) — the proposal form's new Warranty step lets staff pick one per project, resolved at export time.
- Verified the new pptx slide functions end-to-end with a standalone python-pptx smoke test (no live Firebase needed) before shipping — confirmed richtext/bullets/image+note/placeholder-fallback all render correctly.
- Slide 35 (Thank You) is still not built -- wasn't requested this round.

**Invite-based user auth** (`users.py`, `Login.jsx`, `ResetPassword.jsx` (new), `Admin.jsx`):
- Admin now invites a new admin/staff account with just email + name + role, no password field -- backend creates the Firebase Auth user with **no password set**, frontend follows up with a Firebase password-reset email that doubles as the invite-accept link.
- New in-app `ResetPassword.jsx` page (matches brand styling, not Firebase's generic hosted action page) handles both invite-accept and "Forgot password?" -- verifies the oobCode, takes new password + confirm, then tells the user to sign in again.
- Admin can resend an invite/reset link per-user from the Users tab.
- Role separation (staff → proposal form, admin → dashboard) was already enforced in both UI and via `require_admin` on the backend from earlier work -- this only added account provisioning on top of it.
- Note: the emailed link uses Firebase's default "Password reset" email template wording, which reads a little odd for a first-time invite ("reset" implies a prior password). Customizable in Firebase Console → Authentication → Templates → Password reset if a friendlier invite wording is wanted; Firebase has no separate "invite" template without adding a Cloud Function + custom mail extension.

---

## 2026-07-29 — Slides 29-34 built (Technical Advantages, Mounting Structure, Warranty templates)

Closes out the 35-slide MRTV reference deck redesign except slide 35 (Thank You, not yet built — trivial, not requested this round).

- **Slides 29-30 (Technical Advantages)**: new `tech_advantages` form section, two rich-text fields (`fields.js`), each rendered as its own slide via new `_slide_richtext_block()` in `pptx_export_v2.py`.
- **Slides 31-33 (Mounting Structure)**: new `mounting_structure` form section — up to 2 design photos (slide 31, `_slide_photo_row`) plus two "priority install area" photo+note slides (32-33, new `_slide_image_note()`).
- **Slide 34 (Warranty)**: new `warranty_templates` boilerplate key — named, admin-managed templates (`WarrantyTemplatesCard` in `Admin.jsx` → Settings, replaces the old single global `warranty_lines` textarea which the v2 exporter never actually read). Proposal form gets a new `warranty-select` field type (`WarrantySelect` in `App.jsx`) to pick which template applies; resolved server-side at export time (`projects.py`) by `warranty_template_id` and rendered via new `_slide_bullets()`.
- Verified all three new slide-generation code paths end-to-end with a standalone `export_project_v2()` test (rich text/bold parsing, image-vs-placeholder fallback, notes, bullets) before wiring into the live export pipeline — caught nothing, all correct on first pass.

---

## 2026-07-28 — Power Analyzer Avg kW feeds ROI's Total EPC Usage auto-fill

- The ROI step's "Total EPC Usage (Units/day)" auto-fill (`App.jsx`) now also falls back to the Power Analyzer's Avg kW × 24h as a daily-usage estimate when the Electricity Bill step's Total EPC Units hasn't been entered — same fill-if-empty behavior as the existing bill-derived auto-fill, never overrides a value the user set.

---

## 2026-07-28 — Removed consumption Excel analyzer (steps 8/10) and Power Analyzer log/image from step 10

- Dropped "Consumption Excel (hourly units)" from both Surveying Data Result (step 8) and the Second Survey (step 10), and dropped the Power Analyzer CSV/Excel log upload + Power Analyzer Image (slide 12) from the Second Survey. The primary Power Analyzer step (step 9) is untouched.
- Removed the now-unused backend consumption-analyzer service/endpoint (`excel_analysis.py`, `POST /projects/{id}/analyze-consumption`) and the `ExcelAnalyze` frontend component, and dropped the second-survey analyzer/chart slide generation in `pptx_export_v2.py` since nothing populates those fields anymore.

---

## 2026-07-28 — Fixed OOM crash on large CSV uploads (was surfacing as a false CORS error)

- Uploading a large (~25MB) CSV to step 8's consumption analyzer crashed the backend with an unhandled OOM kill, which the browser reported as a CORS error (no `Access-Control-Allow-Origin` header) — same failure class as the earlier `/admin/me` crash: an unhandled server-side failure bypasses FastAPI's CORS middleware entirely.
- Root cause: `analyze_consumption` (`backend/app/services/excel_analysis.py`) built one full Python list of values per spreadsheet column just to score which column looks like the consumption series — on a wide CSV this multiplied memory usage by the column count. Rewrote to a single-pass per-column counter instead.
- Also bumped the Cloud Run service (`zarni-solar-backend`) from the default 512Mi to **1Gi memory** for headroom on large files (`gcloud run services update zarni-solar-backend --memory 1Gi`).

---

## 2026-07-28 — Fixed CSV upload crash; simplified Surveying Data Result step

- **Fixed**: uploading a CSV on step 8 (Surveying Data Result)'s consumption analyzer threw `400: File is not a zip file`, because `analyze_consumption` only ever called `openpyxl.load_workbook` (xlsx-only, requires a zip container). `backend/app/services/excel_analysis.py` now detects CSV vs Excel by filename and falls back to CSV parsing if openpyxl can't open the file.
- **Simplified step 8**: removed "Maximum Load Consumption", "Duration Hours", and "Power Factor" from the primary Surveying Data Result form — redundant now that avg/peak consumption comes from the uploaded file. The optional Second Survey step (which has no file-upload derivation of its own) still collects them; `pptx_export_v2.py`'s shared `_slide9_data_result` only renders those rows for that variant.

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

## 2026-08-07 — Proposal form redesign: full-page scroll + icons + motion

**Frontend only** (`App.jsx`, `App.css`, `icons.jsx` (new)):
- Replaced the old one-step-at-a-time wizard with a single continuous full-page layout — every section (Cover through Warranty) renders at once, stacked vertically, instead of behind Next/Back buttons.
- Added a sticky left icon rail (horizontal scroll strip on mobile) that jump-scrolls to any section and highlights the one currently in view via a scroll listener.
- Each section fades/slides in the first time it scrolls into the viewport (IntersectionObserver + CSS transition, respects `prefers-reduced-motion`).
- Added a small hand-rolled SVG icon set (`icons.jsx`, no emoji) — every section header gets a themed icon badge, every field label gets a matching icon (calendar for dates, currency symbol for cost fields, location pin for lat/lng, etc.).
- Buttons now carry meaning-based color: "Save Draft" is neutral gray, "Export PPTX" is green, "+ New" / map-fetch stay brand blue — replacing the old all-blue-or-all-white step-nav buttons.
- Added a floating "back to top" button that fades in after scrolling.
- Verified in the Browser pane via the dev-stub (`localStorage.__DEV_FORCE_VIEW`) technique, reverted before shipping; production build (`npm run build`) succeeded with no errors.
- Deployed: `firebase deploy --only hosting` only — no backend changes this round.

---

## 2026-08-07 (2) — Fix cramped forgot-password form spacing

**Frontend only** (`Login.jsx`, `App.css`):
- The "Reset password" form was a bare `<form>` (no layout class), unlike the sign-in form which uses `.admin-login`'s flex+gap — so the email field and "Send reset link" button had no space between them.
- Added `.forgot-form` (same flex/gap pattern) plus a short intro sentence above the email field for context. Verified in browser: clean spacing now between field and button.
- Deployed: `firebase deploy --only hosting` only.

---

## 2026-08-07 (3) — Fix reload data loss on the proposal form

**Frontend only** (`App.jsx`):
- User reported: filled-in form data disappears on page reload.
- Root causes were two separate gaps: (1) which project was currently open only lived in React state — a reload always dropped back to the client picker even though the server had the last autosave; (2) the autosave to the server is debounced 700ms, so a reload inside that window lost whatever was typed most recently.
- Fixes: `App` now remembers the active project id in `localStorage` (`zarni_active_project_id`) and re-fetches it on load instead of showing the picker. `ProposalForm` mirrors every field edit to a per-project `localStorage` draft immediately (no debounce), restores it on mount, and clears it once the debounced server autosave (or an explicit "Save Draft") confirms the data landed.
- Verified via the dev-stub technique: typed into a field, confirmed the localStorage draft updated instantly, reloaded, confirmed the value was restored.
- Deployed: `firebase deploy --only hosting` only.

---

## Workflow note

Per client instruction: every code change in this repo should be **committed + pushed to GitHub, and deployed** (Firebase Hosting for frontend, Cloud Run for backend) as part of finishing the task — not left as local-only changes. Log a dated entry here summarizing what changed each time.
