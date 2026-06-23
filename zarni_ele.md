# Build Prompt: Solar ESS Proposal Generator (Web App)

Build a full-stack web application (frontend + backend) that lets a user fill in a form and export a professional, branded PowerPoint (.pptx) sales proposal for commercial solar Energy Storage System (ESS) projects. The output deck must match an existing company template exactly in design.

---

## 1. Core objective

A staff user enters project/client data through a multi-step form. The app merges that data into a fixed-design 27-slide PowerPoint template and returns a downloadable `.pptx`. Some slides are filled from text fields, some from uploaded images, one from an AI-generated image, one from a data-driven flowchart, and many are fixed company boilerplate that must never change.

---

## 2. Generation strategy (critical — read first)

**Do NOT build the deck from scratch with python-pptx.** That loses the design.

Instead:
- Use the provided file `MRTV_Prosal_17_June_2026.pptx` as the **design template**. It is the single source of truth for layout, colors, fonts, logos, and the fixed slides.
- On startup, produce a **tokenized copy** of this template: replace each variable text value in the original with a placeholder token such as `{{site_name}}`, `{{max_load_kw}}`, etc. (Do this once, save as `template.pptx` in the repo.)
- At export time: open `template.pptx` with `python-pptx`, replace every `{{token}}` with the user's value across all text runs, swap placeholder image shapes for uploaded/generated images by shape name or index, and insert the generated images for slides 19 and 20. Leave all fixed slides untouched.
- Preserve run-level formatting when replacing text (replace within existing runs, do not rebuild paragraphs).

**Bilingual / font handling:** The deck mixes English and Burmese (Myanmar Unicode). For any run containing Burmese text, set the font to **"Pyidaungsu"** (fallback "Myanmar Text", "Padauk"). Bundle Pyidaungsu in the project and document that the end user's PowerPoint needs a Myanmar font installed, or embed fonts in the output if feasible. Never let Burmese text render as boxes.

---

## 3. Tech stack

- **Backend:** Python + FastAPI. `python-pptx` for deck generation. `Pillow`/`matplotlib` (or `graphviz`) for the slide-20 flowchart and any chart rendering. A pluggable image-generation client for slide 19 (configurable provider + API key via environment variable — do not hardcode a provider).
- **Database:** SQLite for dev (design so it can swap to PostgreSQL). Store saved projects (so a proposal can be reopened and re-exported) and the admin reference-image library.
- **File storage:** local `/uploads` directory in dev, abstracted behind a storage interface so it can move to S3-compatible storage later.
- **Frontend:** React (Vite) with a multi-step / sectioned form, image-upload widgets, repeating-row tables, and a live computed-totals preview. Clean, simple, responsive.

---

## 4. Field schema

Fields are grouped by section. `VARIABLE` = user enters per project (form input). `FIXED` = company boilerplate, stored as editable defaults in an admin panel but constant across proposals. `AUTO` = computed, not entered. Each field notes the slide(s) it feeds.

### 4.1 Cover & contact
| Field | Type | Kind | Default | Slides |
|---|---|---|---|---|
| `site_name` | text | VARIABLE | — | 1, 3, 8 (title), 19 |
| `site_name_mm` | text (Burmese) | VARIABLE | — | 3 |
| `proposal_date` | date | VARIABLE | today | 1 |
| `contact_phone` | text | VARIABLE | — | 1 |
| company branches, phones, website, logos | — | FIXED | (current values) | 2 |

### 4.2 Project background & site
| Field | Type | Kind | Default | Slides |
|---|---|---|---|---|
| `gps_lat`, `gps_lng` | number | VARIABLE | — | 3 |
| `generator_capacity_kva` | number | VARIABLE | — | 3 |
| `min_grid_supply` | text (e.g. "6h~8h") | VARIABLE | — | 3 |
| `satellite_photo` | image upload | VARIABLE | — | 3 |

### 4.3 Load / survey data
| Field | Type | Kind | Default | Slides |
|---|---|---|---|---|
| `max_load_kw` | number | VARIABLE | — | 3, 6 |
| `avg_load_kw` | number | VARIABLE | — | 3, 6 |
| `min_load_kw` | number | VARIABLE | — | 6 |
| `voltage_v` | number | VARIABLE | 230 | 6 |
| `power_factor` | number (optional) | VARIABLE | — | 6 |
| `daily_usage_units` | number | VARIABLE | — | 6 |
| `data_logger_start` | datetime | VARIABLE | — | 5 |
| `data_logger_end` | datetime | VARIABLE | — | 5 |
| `survey_photos` | image upload (multi, ~6) | VARIABLE | — | 4 |
| `data_logger_photos` | image upload (multi, ~3) | VARIABLE | — | 5 |
| `load_profile_chart` | image upload | VARIABLE | — | 6 |

### 4.4 System design block (core — drives multiple slides)
| Field | Type | Kind | Default | Slides |
|---|---|---|---|---|
| `inverter_model` | text | VARIABLE | "Sigen 60kW M1 HYB" | 17, 19 |
| `inverter_qty` | number | VARIABLE | — | 17, 19 |
| `inverter_unit_kw` | number | VARIABLE | 60 | 17 |
| `total_inverter_kw` | number | AUTO = qty × unit | — | 17, 19 |
| `battery_module` | text | VARIABLE | "Sigenstack 12.0kWh" | 17, 19 |
| `battery_qty` | number | VARIABLE | — | 17, 19 |
| `battery_unit_kwh` | number | VARIABLE | 12 | 17 |
| `total_battery_kwh` | number | AUTO = qty × unit | — | 8, 17, 18, 19, 21 |
| `panel_brand` | text | VARIABLE | "Longi" | 17, 19 |
| `panel_watt` | number | VARIABLE | 650 | 17, 19 |
| `panel_qty` | number | VARIABLE | — | 17, 19 |
| `total_solar_kwp` | number | AUTO = qty × watt ÷ 1000 | — | 8, 17, 19 |
| `backup_hours` | number | VARIABLE | 8 | 17 |
| `design_margin_pct` | number | VARIABLE | 20 | 17 |
| `load_items` | text list | VARIABLE | "MRTV transmitters, studio equipment, server room" | 19 |

> **Reconcile the Slide 8 capacity.** The original template shows 168 kWp on slide 8 but 187.2 kWp on slide 17. Slide 8 must use `total_solar_kwp` (the AUTO value), so all slides stay consistent.

### 4.5 Power management & savings
| Field | Type | Kind | Default | Slides |
|---|---|---|---|---|
| `bill_savings_low_pct` | number | VARIABLE | 70 | 18 |
| `bill_savings_high_pct` | number | VARIABLE | 80 | 18 |

### 4.6 Power source priority (feeds slide-20 flowchart + slide-21 text)
| Field | Type | Kind | Default | Slides |
|---|---|---|---|---|
| `solar_start_time` | time | VARIABLE | 09:00 | 20, 21 |
| `solar_end_time` | time | VARIABLE | 16:00 | 20, 21 |
| `solar_load_kw` | number | VARIABLE | = avg_load_kw | 20, 21 |
| `battery_windows` | list of time ranges | VARIABLE | 16:00–23:00, 05:00–09:00 | 20, 21 |
| `epc_start_time` | time | VARIABLE | 23:00 | 20, 21 |
| `epc_end_time` | time | VARIABLE | 05:00 | 20, 21 |
| `epc_precharge` | boolean | VARIABLE | true | 20, 21 |
| `generator_dod_trigger_pct` | number | VARIABLE | 20 | 20, 21 |
| `priority_order` | ordered list | VARIABLE | Solar → Battery → EPC → Generator | 20 |

### 4.7 Warranty
| Field | Type | Kind | Default | Slides |
|---|---|---|---|---|
| `install_warranty_years` | number | VARIABLE | 1 | 22 |
| product warranty lines (PV 5yr, Battery 5+5yr, Gateway 2yr) | — | FIXED | (current) | 22 |

### 4.8 Reference project slides 24 & 25 (FIXED — admin-managed)
These are two fixed slides showcasing the company's own past projects. They are **not** entered per client. Content is the same on every exported proposal and is edited only in the admin panel. Keep them as exactly two slides (24 and 25), matching the original layout. Each holds:
| Field | Type | Kind |
|---|---|---|
| `ref_name` | text | FIXED |
| `ref_system_kw` | number | FIXED |
| `ref_system_kwp` | number | FIXED |
| `ref_system_kwh` | number | FIXED |
| `ref_equipment_lines` | text list (e.g. "Jinko 650W Mono - 304 Nos") | FIXED |
| `ref_images` | image upload (multi) | FIXED |

### 4.9 Reference sites table (slide 26 — FIXED, admin-managed rows)
Company past-project list. Not client-specific; edited in the admin panel as a repeating row set, identical across all proposals.
| Field | Type | Kind |
|---|---|---|
| `site_name` | text | FIXED |
| `spec_string` | text (e.g. "327.6 kWp, 22kW, 144kWh") | FIXED |
| `grid_connection_date` | date | FIXED |

---

## 5. Per-slide build map

| Slide | Title | Build type | Source |
|---|---|---|---|
| 1 | Cover | TEXT + fixed logo | §4.1 |
| 2 | Company / branches | FIXED (admin-editable) | boilerplate |
| 3 | Project background | TEXT + image upload | §4.2, §4.3 |
| 4 | Survey photos | IMAGE UPLOAD (multi) | §4.3 |
| 5 | Data logger record | TEXT + image upload | §4.3 |
| 6 | Daily energy load profile | TEXT + chart image upload | §4.3 |
| 7 | (section divider / blank) | FIXED | boilerplate |
| 8 | Executive summary | TEXT (AUTO totals) + client logo + fixed narrative | §4.4 |
| 9 | System drawing | IMAGE UPLOAD | §4.3 |
| 10–13 | Sigenergy product intro / benefits / monitoring / control | FIXED | boilerplate |
| 14 | Inverter spec table | FIXED | boilerplate |
| 15 | Battery spec table | FIXED | boilerplate |
| 16 | Panel spec table | FIXED | boilerplate |
| 17 | System technical configuration | TEXT (AUTO totals) | §4.4 |
| 18 | Power management system | TEXT (savings %, battery kWh) + fixed narrative | §4.4, §4.5 |
| 19 | Integrated system infographic | **AI-GENERATED IMAGE** | §6 |
| 20 | Power source priority logic | **DATA-DRIVEN FLOWCHART** | §7 |
| 21 | Power source priority (text) | TEXT | §4.6 |
| 22 | Warranty | TEXT (install years) + fixed product lines | §4.7 |
| 23 | Project references gallery | **ADMIN IMAGE LIBRARY** | §8 |
| 24 | Reference project 1 | FIXED (admin-managed) | §4.8 |
| 25 | Reference project 2 | FIXED (admin-managed) | §4.8 |
| 26 | Reference sites table | FIXED rows (admin-managed) | §4.9 |
| 27 | Closing statement | FIXED | boilerplate |

---

## 6. Slide 19 — AI-generated infographic

The app calls a configurable image-generation API. Use this fixed prompt template, substituting form values. The data values come from the §4.4 design block (do NOT re-ask the user — reuse).

```
A clean, professional technical infographic titled "{{site_name}}: INTEGRATED HYBRID
SOLAR POWER MANAGEMENT SYSTEM", subtitle "SYSTEM SPECIFICATION & PERFORMANCE".

Horizontal left-to-right system flow with four labeled stages connected by arrows:
1. SOLAR PV — "TOTAL {{total_solar_kwp}} kWp", "{{panel_qty}} x {{panel_watt}}W {{panel_brand}} PANEL",
   icon of solar panels with sun.
2. INVERTER — "{{inverter_qty}} x {{inverter_model}}", white wall-mounted hybrid inverter unit.
3. BATTERY — "TOTAL {{total_battery_kwh}} kWh", "{{battery_qty}} x {{battery_module}} BATTERY",
   stacked battery cabinet.
4. GRID & LOAD — transmission tower for GRID; LOAD icons for {{load_items}};
   GENERATOR BACKUP unit below.

Below the flow, four dark benefit cards labeled A–D: "PRIORITIZING SOLAR USE",
"OPTIMIZING BATTERY LIFE", "MINIMIZING GRID & GENERATOR RELIANCE",
"ENSURING 24/7 UNINTERRUPTED OPERATION".

Style: corporate energy infographic, light blue / navy palette, flat vector icons,
clear sans-serif labels, 16:9, high detail, no watermark.
```

Requirements:
- Show the generated image to the user in the UI with a **Regenerate** button before it is placed in the slide.
- Cache the chosen image with the project so re-export doesn't regenerate.
- Make the prompt template itself editable in the admin panel.
- Handle generation failure gracefully (allow manual image upload as fallback).

---

## 7. Slide 20 — data-driven flowchart

Render (not AI; draw it programmatically with graphviz or matplotlib) a priority-logic flowchart from §4.6 inputs. Default flow: **Solar PV → Battery ESS → EPC/Grid → Generator**, each node annotated with its time window and trigger condition (e.g. Solar `{{solar_start_time}}–{{solar_end_time}}` serving `{{solar_load_kw}}` kW; Generator triggers at `{{generator_dod_trigger_pct}}%` DoD). Match the deck's navy/blue palette. Export as a PNG and insert into the slide.

---

## 8. Slide 23 — admin reference gallery

Admin-only image library stored in the backend. Admin uploads/stores past-project reference photos once; they are inserted into slide 23 at export time. Provide an admin screen to upload, tag, reorder, and delete these images, and to select which subset appears in a given proposal.

---

## 9. Admin panel

Separate admin area to edit all FIXED content without code changes:
- Company info (slide 2): branch addresses, phones, website, logos.
- Product marketing copy + images (slides 10–13).
- Spec tables (slides 14–16).
- Warranty product lines (slide 22).
- Reference project slides 24 & 25 (name, system specs, equipment lines, images).
- Reference sites table rows (slide 26).
- Closing statement (slide 27).
- The slide-19 AI prompt template.
- The reference image library (slide 23).
- Field defaults (e.g. default inverter model, voltage 230, design margin 20%).

---

## 10. Frontend UX

- Multi-step form grouped by the §4 sections (Cover, Site, Load Data, System Design, Power Priority, Warranty). Reference slides 24–26 are NOT in the client form — they are fixed and managed in the admin panel.
- Live preview of AUTO totals (`total_solar_kwp`, `total_inverter_kw`, `total_battery_kwh`) as the user types quantities.
- Image-upload widgets with thumbnail preview for each photo field; multi-upload where noted.
- Burmese text inputs must accept and display Myanmar Unicode correctly.
- Save draft, reopen saved project, and **Export PPTX** button.
- Validation: required fields flagged; numbers ≥ 0; dates valid; warn if Slide 8 capacity would differ from computed total.

---

## 11. Backend API (suggested)

- `POST /projects` create, `GET /projects/{id}`, `PUT /projects/{id}` save draft.
- `POST /projects/{id}/uploads` upload an image to a named field.
- `POST /projects/{id}/slide19/generate` call image-gen, return image for preview.
- `POST /projects/{id}/export` build and return the `.pptx`.
- `GET/POST/DELETE /admin/reference-images` manage slide-23 library.
- `GET/PUT /admin/boilerplate` manage all FIXED content + defaults + slide-19 prompt.

---

## 12. Deliverables & acceptance criteria

- Running frontend + backend with README and `.env.example` (image-gen provider + key).
- `template.pptx` (tokenized) committed, plus the build step that produced it from `MRTV_Prosal_17_June_2026.pptx`.
- Exporting a fully filled project yields a 27-slide deck **visually identical to the original** except for the merged data, with: correct Burmese rendering, consistent capacity numbers everywhere (driven by AUTO totals), AI image on slide 19, drawn flowchart on slide 20, admin gallery on slide 23, fixed reference projects on slides 24 & 25, and the fixed reference-sites table on slide 26.
- Fixed slides byte-for-byte unchanged in layout.
- Graceful handling of missing optional fields (e.g. blank power factor) and missing images (skip or placeholder, never crash).

**Note for the build:** the original `MRTV_Prosal_17_June_2026.pptx` will be provided in the project root — inspect it first to map every variable text run and image shape to a token before writing the generator.
