// Form schema for the redesigned deck (slides 1-12). Field labels in Burmese/English
// with help text. Special types: richtext, checkbox, excel-analyze section, computed display.
export const SECTIONS = [
  {
    key: "cover",
    title: "Cover (Slide 1)",
    fields: [
      { name: "site_name", label: "Client Name", help: "ဖောက်သည် အမည်။ ဥပမာ — MRTV Sagaing", type: "text", required: true },
      { name: "proposal_date", label: "Proposal Date", help: "Proposal ရက်စွဲ။ ဥပမာ — 26.Jun.2026", type: "text" },
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
      { name: "max_load_kw", label: "Maximum Load Consumption (kWp)", help: "ဥပမာ — 48", type: "number" },
      { name: "duration_hours", label: "Duration Hours (Hr)", help: "ဥပမာ — 18", type: "number" },
      { name: "voltage_v", label: "Line Voltage (V)", help: "ဥပမာ — 400", type: "number" },
      { name: "power_factor", label: "Power Factor", help: "ဥပမာ — 0.88", type: "number" },
      { name: "transformer_kva", label: "Transformer Size (kVA)", help: "ဥပမာ — 315", type: "number" },
      { name: "generator_capacity_kva", label: "Generator (kVA)", help: "ဥပမာ — 110", type: "number" },
      { name: "pv_installation_area_sqft", label: "PV Installation Area (sq ft)", help: "ဥပမာ — 300", type: "number" },
    ],
    excelAnalyze: { avgField: "survey_avg_units", peakField: "survey_peak_units" },
  },
  {
    key: "analyzer",
    title: "Power Analyzer (Slide 10)",
    fields: [
      { name: "analyzer_date_range", label: "Date Range (subtitle)", help: "ဥပမာ — 22.Jun.26 – 24.Jun.26", type: "text" },
    ],
    images: [{ name: "analyzer_image", label: "Power Analyzer Image" }],
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
      { name: "second_analyzer_date_range", label: "Power Analyzer Date Range (Slide 12)", type: "text" },
    ],
    images: [{ name: "second_analyzer_image", label: "Power Analyzer Image (Slide 12)" }],
    excelAnalyze: { avgField: "second_avg_units", peakField: "second_peak_units" },
  },
];

export function perUnitCost(data) {
  const cost = Number(data.total_epc_cost) || 0;
  const units = Number(data.total_epc_units) || 0;
  return units ? Math.round((cost / units) * 100) / 100 : 0;
}
