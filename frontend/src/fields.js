export const SECTIONS = [
  {
    key: "cover",
    title: "Cover & Contact",
    fields: [
      { name: "site_name", label: "Site Name", type: "text", required: true },
      { name: "site_name_mm", label: "Site Name (Burmese)", type: "text", lang: "mm" },
      { name: "proposal_date", label: "Proposal Date", type: "date" },
      { name: "contact_phone", label: "Contact Phone", type: "text" },
    ],
  },
  {
    key: "site",
    title: "Project Background & Site",
    fields: [
      { name: "gps_lat", label: "GPS Latitude", type: "number" },
      { name: "gps_lng", label: "GPS Longitude", type: "number" },
      { name: "generator_capacity_kva", label: "Generator Capacity (kVA)", type: "number" },
      { name: "min_grid_supply", label: "Min Grid Supply (e.g. 6h~8h)", type: "text" },
    ],
    images: [{ name: "satellite_photo", label: "Satellite Photo" }],
  },
  {
    key: "load",
    title: "Load / Survey Data",
    fields: [
      { name: "max_load_kw", label: "Max Load (kW)", type: "number", required: true },
      { name: "avg_load_kw", label: "Avg Load (kW)", type: "number", required: true },
      { name: "min_load_kw", label: "Min Load (kW)", type: "number" },
      { name: "voltage_v", label: "Voltage (V)", type: "number" },
      { name: "power_factor", label: "Power Factor (optional)", type: "number" },
      { name: "daily_usage_units", label: "Daily Usage (units)", type: "number" },
      { name: "data_logger_start", label: "Data Logger Start", type: "datetime-local" },
      { name: "data_logger_end", label: "Data Logger End", type: "datetime-local" },
    ],
    images: [
      { name: "survey_photo_1", label: "Survey Photo 1" },
      { name: "survey_photo_2", label: "Survey Photo 2" },
      { name: "survey_photo_3", label: "Survey Photo 3" },
      { name: "survey_photo_4", label: "Survey Photo 4" },
      { name: "survey_photo_5", label: "Survey Photo 5" },
      { name: "survey_photo_6", label: "Survey Photo 6" },
      { name: "data_logger_photo_1", label: "Data Logger Photo 1" },
      { name: "data_logger_photo_2", label: "Data Logger Photo 2" },
      { name: "data_logger_photo_3", label: "Data Logger Photo 3" },
      { name: "load_profile_chart", label: "Load Profile Chart" },
      { name: "system_drawing", label: "System Drawing (slide 9)" },
    ],
  },
  {
    key: "system",
    title: "System Design",
    fields: [
      { name: "inverter_model", label: "Inverter Model", type: "text" },
      { name: "inverter_qty", label: "Inverter Qty", type: "number", required: true },
      { name: "inverter_unit_kw", label: "Inverter Unit (kW)", type: "number" },
      { name: "battery_module", label: "Battery Module", type: "text" },
      { name: "battery_qty", label: "Battery Qty", type: "number", required: true },
      { name: "battery_unit_kwh", label: "Battery Unit (kWh)", type: "number" },
      { name: "panel_brand", label: "Panel Brand", type: "text" },
      { name: "panel_watt", label: "Panel Watt", type: "number" },
      { name: "panel_qty", label: "Panel Qty", type: "number", required: true },
      { name: "backup_hours", label: "Backup Hours", type: "number" },
      { name: "design_margin_pct", label: "Design Margin (%)", type: "number" },
      { name: "load_items", label: "Load Items", type: "text" },
    ],
  },
  {
    key: "savings",
    title: "Power Management & Savings",
    fields: [
      { name: "bill_savings_low_pct", label: "Bill Savings Low (%)", type: "number" },
      { name: "bill_savings_high_pct", label: "Bill Savings High (%)", type: "number" },
    ],
  },
  {
    key: "priority",
    title: "Power Source Priority",
    fields: [
      { name: "solar_start_time", label: "Solar Start Time", type: "time" },
      { name: "solar_end_time", label: "Solar End Time", type: "time" },
      { name: "solar_load_kw", label: "Solar Load (kW, defaults to avg)", type: "number" },
      { name: "epc_start_time", label: "EPC Start Time", type: "time" },
      { name: "epc_end_time", label: "EPC End Time", type: "time" },
      { name: "generator_dod_trigger_pct", label: "Generator DoD Trigger (%)", type: "number" },
      {
        name: "power_priority_text",
        label: "Slide 21 — Power Source Priority narrative (Burmese; leave blank to keep template default)",
        type: "textarea",
        lang: "mm",
        draft: "slide21",
      },
    ],
  },
  {
    key: "power_mgmt",
    title: "Power Management (Slide 18)",
    fields: [
      {
        name: "power_management_text",
        label: "Slide 18 — Power Management narrative (Burmese; leave blank to keep template default)",
        type: "textarea",
        lang: "mm",
      },
    ],
  },
  {
    key: "warranty",
    title: "Warranty",
    fields: [{ name: "install_warranty_years", label: "Install Warranty (years)", type: "number" }],
  },
];

export function computeTotals(data) {
  const num = (v) => (v === undefined || v === null || v === "" ? 0 : Number(v));
  return {
    total_inverter_kw: num(data.inverter_qty) * num(data.inverter_unit_kw || 0),
    total_battery_kwh: num(data.battery_qty) * num(data.battery_unit_kwh || 0),
    total_solar_kwp: (num(data.panel_qty) * num(data.panel_watt || 0)) / 1000,
  };
}
