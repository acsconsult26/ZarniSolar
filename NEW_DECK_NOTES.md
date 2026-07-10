# Change Notes — "MRTV -Update file.pptx" (new reference deck)

Reference file: `MRTV -Update file.pptx` (35 slides). Compared against the current
generator template `MRTV Prosal 17.June.2026.pptx` (27 slides). These notes are
for a **later rearrange/redesign** — nothing is wired into the app yet.

## Headline differences

| | Current template | New reference deck |
|---|---|---|
| Slides | 27 | **35** |
| Page size | 20 × 11.25 in (oversized) | **13.33 × 7.5 in (standard 16:9)** |
| Structure | Ad-hoc | **Numbered 1–8 sections matching a Contents slide** |
| Solar panel | Longi 650W | **COMET 2U 670W (Monofacial)** |
| Content | English-heavy | **Much more Burmese narrative** |
| Analysis | Basic | **Multi-option BOM + CAPEX + payback + PVsyst simulation** |

## New deck slide-by-slide map

1. **Cover** — "BUSINESS ENERGY SOLUTION For MRTV (Sagaing Region)" / subtitle
   "Technical Proposal" / "ZARNI AUNG & SONS Co.,Ltd" / "Contact To; 09-2031977" /
   "Date – 26.Jun.2026"
2. Section/blank
3. **CONTENTS** (8 items): Project Objectives · Surveying Data (Project Background)
   · System Requirement · Technical Proposal · Product Specifications ·
   Technical Advantages · Solar Panels Support Mounting Structure · Warranty
4. **1. Project Objectives (ရည်ရွယ်ချက်များ)** — long Burmese narrative + image
5. **2. Surveying Data (Project Background)** — Project Location (name + GPS),
   Project Solution ("ESS + Solar Solution For 48kW Load"), Solar Panel
   Installation Area (300 sq/ft), Tilt Angle 20°–25° (Mountain-Slope + Ground) + images
6. **Electricity bill / units demand** (Burmese numerals): total charge ၅၇,၄၉၂,၆၀၀ Ks,
   total units ၁၂၀,၃၄၀, per-unit ၄၇၇.၇၅ Ks
7. **Surveying photos** (record images)
8. **Solar Frame location photos**
9. **(I) Surveying Data Result — MRTV Only**: Max Load 48kWp(avg), Duration 18 hrs,
   Voltage 390–400V, PF 0.87–0.89, 684 units/day, Transformer 315kVA, Generator 110kVA,
   PV area 300 sq/ft (ground-mounted)
10. **Power Analyzer Recording (22–24 Jun 26)** images
11. **(II) Surveying Data Result — For All (PDM FM, FOREVER, Shwe Than Lwin)**:
    138kWp(avg), 2500 units/day, 2× 110kVA generators
12. **Power Analyzer Recording** images
13. **3. System Requirement – Option 1** — 2-column BOM table
    (48kW backup 4hrs vs 8hrs) with inverter/battery/BC/base/solar counts +
    CAPEX 586,990,000 / 978,300,000
14. **System Requirement – Option 2** — 2-column BOM table
    (48kW backup 10hrs vs 138kW backup 2hrs) + CAPEX 1,253,250,000 / 1,455,800,000
15. **Chart** — daily unit usage after solar install
16. **Daily Power Usage (Grid + Solar-Battery)** chart
17. **CAPEX / Payback analysis** — 7×4 table across 4 options
    (CAPEX, EPC/month, EPC/year, Solar/month, Solar/year, Payback 5.5–7.7 yrs).
    Note "တစ်ယူနစ်=၅၀၀ကျပ်" (1 unit = 500 Ks)
18. **4. Technical Proposal — Sigen Hybrid Solar System Drawing** (image)
19. **Sigen HYBRID SYSTEM BLOCK DIAGRAM**
20. **Simulation Result** — West View / PV Array / South View + config text
    (180 panels, 117kWp, 110kW inverter, 204kWh battery, 48kW backup 4hrs)
21. **Energy Yield Report**
22. **Chart**
23. **West View Shade Report**
24. **South View Shade Report (Perfect)**
25. **Real Time Monitoring** — Burmese note re Battery SOC / Weather Focus + images
26. **5. Product Specification** — SIGEN PV inverter spec table (12×8, model comparison
    50/60/80/100/110 M1-HYB; DC input, MPPT, battery module rows)
27. **Sigen-Stack Battery** (spec + images)
28. **Solar Panel Specification** — **COMET 2U (Monofacial)** table:
    Pmax 670W/505W, Voc 54.88/51.86, Isc 15.32/12.39, Vmp 44.57, Imp 13.80,
    Efficiency 24.8%, Weight 28.2kg ±3%, Dimension 33mm 2382L×1134W
29. **6. Technical Advantages** — long Burmese narrative (3rd-gen, AI, IP66, AFCI, etc.)
30. **Technical Advantages (cont.)** — CAPEX/OPEX, DC coupling, modular, 0ms switch,
    150% overload 10s, parallel inverters, battery-ready, LFP, 24/7 Grid+Solar+Battery
31. **7. Solar Support Mounting Structure – Design (1)** — images
32. **Solar priority install area 1** — 90×90 ft = 188 panels
33. **Solar priority install area 2** — 35×200 ft = 180 panels
34. **8. Warranty**: Sigenergy Inverter+Battery 5yr (product), Gateway 2yr (service),
    **Solar Panel 15yr**, Installation 1yr (ZARNI Electronics)
35. **THANK YOU!!!**

## Implications for the app (for the redesign phase)

- **New base template**: switch generator from the 27-slide deck to this 35-slide,
  standard-16:9 deck. All slide-index maps, tokenization, and inserted-slide logic
  will need to be re-derived against this file.
- **New sections to support** that the current form/admin doesn't cover yet:
  electricity-bill data (slide 6), dual survey results MRTV-only vs For-All (9/11),
  multi-option System Requirement BOM + CAPEX tables (13/14), CAPEX/payback matrix (17),
  PVsyst simulation/shade/energy-yield slides (20–24), mounting-structure design (31–33),
  real-time monitoring (25).
- **Product catalog updates**: default panel becomes COMET 2U 670W; warranty defaults
  change (panel 15yr, gateway 2yr, inverter/battery 5yr, install 1yr).
- **More Burmese**: objectives, advantages, warranty, monitoring are long Burmese blocks
  → likely admin-managed boilerplate rather than per-client form fields.
- Several slides are **image/chart-heavy** (PVsyst exports, analyzer recordings) → these
  will be uploads, not generated.

_Status: noted only. Await user direction on the rearrange/redesign plan._
