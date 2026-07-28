// Form schema for the redesigned deck (slides 1-12). Field labels in Burmese/English
// with help text. Special types: richtext, checkbox, excel-analyze section, computed display.
export const SECTIONS = [
  {
    key: "cover",
    title: "Cover (Slide 1)",
    fields: [
      { name: "site_name", label: "Client Name", help: "ဖောက်သည် အမည်။ ဥပမာ — MRTV Sagaing", type: "text", required: true },
      { name: "proposal_date", label: "Proposal Date", help: "Proposal ရက်စွဲ", type: "date" },
    ],
    note: "Contact number is set in Admin → Settings.",
  },
  {
    key: "intro",
    title: "Introduction (Slide 2)",
    fields: [
      { name: "introduction", label: "Introduction message", help: "မိတ်ဆက်စာ — why choose us, benefits. Format with bold / italic / lists.", type: "richtext" },
    ],
  },
  {
    key: "objectives",
    title: "Project Objectives (Slide 4)",
    fields: [
      { name: "project_objectives", label: "Project Objectives (ရည်ရွယ်ချက်များ)", help: "ရည်ရွယ်ချက်များ — use lists and bold/italic as needed.", type: "richtext" },
    ],
    note: "Slide 3 (Contents) is fixed and needs no input.",
  },
  {
    key: "surveying",
    title: "Surveying Data (Slide 5)",
    fields: [
      { name: "survey_lat", label: "Map Location — Latitude", help: "ဥပမာ — 21.9022", type: "number" },
      { name: "survey_lng", label: "Map Location — Longitude", help: "ဥပမာ — 95.9923", type: "number" },
      { name: "project_solution", label: "Project Solution", help: "ဥပမာ — ESS + Solar Solution For 48kW Load", type: "text" },
      { name: "install_area_sqft", label: "Solar Panel Installation Area (sq ft)", help: "ဥပမာ — 300", type: "number" },
      { name: "tilt_angle", label: "Tilt Angle (degrees)", help: "ဥပမာ — 22", type: "number" },
    ],
    images: [{ name: "survey_image", label: "Surveying Picture" }],
    mapFetch: { latField: "survey_lat", lngField: "survey_lng", imageField: "survey_image" },
  },
  {
    key: "bill",
    title: "Electricity Bill (Slide 6)",
    fields: [
      { name: "total_epc_cost", label: "Total EPC Cost (ဓာတ်အားခ စုစုပေါင်း, MMK)", help: "ဥပမာ — 57492600", type: "number" },
      { name: "total_epc_units", label: "Total EPC Units (သုံးစွဲယူနစ် စုစုပေါင်း)", help: "ဥပမာ — 120340", type: "number" },
    ],
    images: [{ name: "meter_bill_image", label: "Meter Bill Photo" }],
    perUnit: true, // show live per-unit cost
  },
  {
    key: "survey_photos",
    title: "Surveying Photos (Slide 7)",
    fields: [],
    images: [
      { name: "survey_photo_1", label: "Survey Photo 1 (with device)" },
      { name: "survey_photo_2", label: "Survey Photo 2 (with device)" },
    ],
  },
  {
    key: "solar_frame",
    title: "Solar Frame Location (Slide 8)",
    fields: [],
    images: [
      { name: "solar_frame_map_image", label: "Google Map Overview" },
      { name: "solar_frame_site_1", label: "Site Image 1" },
      { name: "solar_frame_site_2", label: "Site Image 2" },
    ],
  },
  {
    key: "data_result",
    title: "Surveying Data Result (Slide 9)",
    fields: [
      { name: "voltage_v", label: "Line Voltage (V)", help: "ဥပမာ — 400", type: "number" },
      { name: "transformer_kva", label: "Transformer Size (kVA)", help: "ဥပမာ — 315", type: "number" },
      { name: "generator_capacity_kva", label: "Generator (kVA)", help: "ဥပမာ — 110", type: "number" },
      { name: "pv_installation_area_sqft", label: "PV Installation Area (sq ft)", help: "ဥပမာ — 300", type: "number" },
    ],
    excelAnalyze: { avgField: "survey_avg_units", peakField: "survey_peak_units" },
  },
  {
    key: "analyzer",
    title: "Power Analyzer (Slide 10)",
    fields: [],
    images: [{ name: "analyzer_image", label: "Power Analyzer Image" }],
    powerAnalyzer: { field: "analyzer" },
  },
  {
    key: "second_survey",
    title: "Second Survey — Optional (Slides 11-12)",
    optionalToggle: "include_second_survey",
    fields: [
      { name: "second_max_load_kw", label: "Maximum Load Consumption (kWp)", type: "number" },
      { name: "second_duration_hours", label: "Duration Hours (Hr)", type: "number" },
      { name: "second_voltage_v", label: "Line Voltage (V)", type: "number" },
      { name: "second_power_factor", label: "Power Factor", type: "number" },
      { name: "second_transformer_kva", label: "Transformer Size (kVA)", type: "number" },
      { name: "second_generator_kva", label: "Generator (kVA)", type: "number" },
      { name: "second_pv_area_sqft", label: "PV Installation Area (sq ft)", type: "number" },
    ],
    images: [{ name: "second_analyzer_image", label: "Power Analyzer Image (Slide 12)" }],
    excelAnalyze: { avgField: "second_avg_units", peakField: "second_peak_units" },
    powerAnalyzer: { field: "second_analyzer" },
  },
  {
    key: "options",
    title: "System Options (Slides 13-14)",
    systemOptions: true,
    fields: [],
    note: "Build up to 4 pricing options from catalog products. Options 1-2 → slide 13, options 3-4 → slide 14. Grid/Solar units per option + baseline feed the Slide 16 comparison chart.",
  },
  {
    key: "roi",
    title: "ROI (Slide 15)",
    roiCalc: true,
    note: "Return-on-investment: compares EPC-only vs Solar cost over the chosen years. Slide 15 shows the step-by-step calculation in Burmese.",
    fields: [
      { name: "roi_total_epc_units", label: "Total EPC Usage (Units/day)", help: "ဖောက်သည်၏ စုစုပေါင်း နေ့စဉ် သုံးစွဲမှု။ ဥပမာ — 684", type: "number" },
      { name: "roi_epc_with_solar_units", label: "EPC Usage when Solar in use (Units/day)", help: "Solar သုံးချိန် EPC မှ ဆက်သုံးသော ယူနစ်။ ဥပမာ — 156", type: "number" },
      { name: "roi_solar_units", label: "Total Solar Usage (Units/day)", help: "Solar မှ ထုတ်ပေးသော ယူနစ်။ ဥပမာ — 528", type: "number" },
      { name: "roi_avg_unit_cost", label: "Average Unit Cost (MMK)", help: "တစ်ယူနစ် ပျမ်းမျှ ဈေးနှုန်း။ ဥပမာ — 500", type: "number" },
      { name: "roi_years", label: "Number of Years (1-10)", help: "တွက်ချက်မည့် နှစ်အရေအတွက်။ ဥပမာ — 7", type: "number" },
    ],
  },
];

// inserted before ROI section so slide order reads naturally; see SECTIONS unshift below
export const PAYBACK_SECTION = {
  key: "payback",
  title: "Payback Table (Slide 17)",
  paybackTable: true,
  note: "Payback comparison across the options above. Per-option spec & payback years are entered in the System Options step.",
  fields: [
    { name: "payback_epc_units_month", label: "Total EPC Units / Month (same for all)", help: "ဥပမာ — 27000", type: "number" },
    { name: "payback_unit_cost", label: "Average Unit Cost (MMK)", help: "ဥပမာ — 500", type: "number" },
  ],
};
SECTIONS.push(PAYBACK_SECTION);

export const TECH_DRAWINGS_SECTION = {
  key: "tech_drawings",
  title: "Technical Drawings (Slides 18-19)",
  fields: [],
  images: [
    { name: "system_drawing_image", label: "Hybrid Solar System Drawing (Slide 18)" },
    { name: "block_diagram_image", label: "Solar System Block Diagram (Slide 19)" },
  ],
  note: "Upload the system drawing and block diagram images; each is placed full-slide with its own title.",
};
SECTIONS.push(TECH_DRAWINGS_SECTION);

export const SIMULATION_SECTION = {
  key: "simulation",
  title: "Simulation & Shade Reports (Slides 20-24)",
  fields: [
    { name: "west_shade_perfect", label: "West View Shade — Perfect Match (Slide 23)", type: "checkbox" },
    { name: "south_shade_perfect", label: "South View Shade — Perfect Match (Slide 24)", type: "checkbox" },
    { name: "east_shade_perfect", label: "East View Shade — Perfect Match (Slide 24b)", type: "checkbox" },
  ],
  images: [
    { name: "sim_south_view", label: "Simulation — South View (Slide 20)" },
    { name: "sim_west_view", label: "Simulation — West View (Slide 20)" },
    { name: "sim_east_view", label: "Simulation — East View (Slide 20)" },
    { name: "sim_pv_array", label: "Simulation — PV Array (Slide 20)" },
    { name: "energy_yield_1", label: "Energy Yield Report — Photo 1 (Slide 21)" },
    { name: "energy_yield_2", label: "Energy Yield Report — Photo 2 (Slide 21)" },
    { name: "monthly_production_image", label: "Monthly Production From Solar (Slide 22)" },
    { name: "west_shade_1", label: "West Shade — Photo 1 (Slide 23)" },
    { name: "west_shade_2", label: "West Shade — Photo 2 (Slide 23)" },
    { name: "south_shade_1", label: "South Shade — Photo 1 (Slide 24)" },
    { name: "south_shade_2", label: "South Shade — Photo 2 (Slide 24)" },
    { name: "east_shade_1", label: "East Shade — Photo 1 (Slide 24b)" },
    { name: "east_shade_2", label: "East Shade — Photo 2 (Slide 24b)" },
  ],
};
SECTIONS.push(SIMULATION_SECTION);

export const PRODUCT_SPEC_SECTION = {
  key: "product_specs",
  title: "Product Specifications (Slides 26-28)",
  note: "Pick the exact catalog product used for this proposal. Its spec table + image show on slides 26 (Solar), 27 (Battery), 28 (Inverter), 29 (Gateway). Leave blank to skip a slide.",
  fields: [
    { name: "panel_product_id", label: "Solar Panel (Slide 26)", type: "product-select", category: "panel" },
    { name: "battery_product_id", label: "Battery (Slide 27)", type: "product-select", category: "battery" },
    { name: "inverter_product_id", label: "Inverter (Slide 28)", type: "product-select", category: "inverter" },
    { name: "gateway_product_id", label: "Gateway (Slide 29)", type: "product-select", category: "gateway" },
  ],
};
SECTIONS.push(PRODUCT_SPEC_SECTION);

export function paybackRows(data) {
  const n = (v) => Number(v) || 0;
  const epcMonth = n(data.payback_epc_units_month);
  const cost = n(data.payback_unit_cost);
  const epcYear = epcMonth * 12 * cost;
  const opts = (data.system_options || []).slice(0, 4);
  const i0 = (x) => (x === "" || x == null ? "—" : x);
  return {
    epcMonth, epcYear,
    columns: opts.map((o) => ({
      title: o.title || "Option",
      system: `${i0(o.solar_count)} Solar, ${i0(o.inverter_power)}kW, ${i0(o.battery_capacity)}kWh, ${i0(o.backup_hours)}Hrs`,
      capex: n(o.capex),
      solarMonth: n(o.solar_units) * 30,
      solarYear: n(o.solar_units) * 30 * 12,
      payback: i0(o.payback_years),
    })),
  };
}

export function roiCompute(data) {
  const num = (v) => Number(v) || 0;
  const n1 = num(data.roi_total_epc_units);
  const n2 = num(data.roi_epc_with_solar_units);
  const n3 = num(data.roi_solar_units);
  const cost = num(data.roi_avg_unit_cost);
  const years = num(data.roi_years) || 5;
  const annualEpc = n1 * 30 * 12 * cost;
  const annualSolar = n3 * 30 * 12 * cost;
  const totalEpc = annualEpc * years;
  const totalSolar = annualSolar * years;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const g = n2 && n3 ? gcd(Math.round(n2), Math.round(n3)) || 1 : 1;
  return {
    years,
    ratio: n2 && n3 ? `${Math.round(n2 / g)} : ${Math.round(n3 / g)}` : "—",
    epcPct: n1 ? Math.round((n2 / n1) * 100) : 0,
    solarPct: n1 ? Math.round((n3 / n1) * 100) : 0,
    annualEpc, annualSolar, totalEpc, totalSolar,
    savings: totalEpc - totalSolar,
  };
}

export function perUnitCost(data) {
  const cost = Number(data.total_epc_cost) || 0;
  const units = Number(data.total_epc_units) || 0;
  return units ? Math.round((cost / units) * 100) / 100 : 0;
}
