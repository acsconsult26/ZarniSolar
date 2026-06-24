// Field labels and help text are in Burmese. Each field: { name, label, help, type, ... }
export const SECTIONS = [
  {
    key: "cover",
    title: "မျက်နှာဖုံး နှင့် ဆက်သွယ်ရန်",
    fields: [
      { name: "site_name", label: "Client / Site အမည်", help: "ဖောက်သည် သို့မဟုတ် Site ၏ အမည်။ ဥပမာ — MRTV Sagaing", type: "text", required: true },
      { name: "site_name_mm", label: "Site အမည် (မြန်မာ)", help: "မြန်မာဘာသာဖြင့် Site အမည်။ ဥပမာ — ဆွမ်းဦးပုံ", type: "text", lang: "mm" },
      { name: "proposal_date", label: "ကမ်းလှမ်းသည့် ရက်စွဲ", help: "Proposal ထုတ်သည့်ရက်။ ဥပမာ — 17.June.2026", type: "date" },
      { name: "contact_phone", label: "ဆက်သွယ်ရန် ဖုန်း", help: "ဆက်သွယ်ရန် ဖုန်းနံပါတ်။ ဥပမာ — 09-2031977", type: "text" },
    ],
  },
  {
    key: "site",
    title: "စီမံကိန်း နောက်ခံ နှင့် နေရာ",
    fields: [
      { name: "gps_lat", label: "GPS Latitude", help: "Site တည်နေရာ၏ Latitude။ ဥပမာ — 21.9022", type: "number" },
      { name: "gps_lng", label: "GPS Longitude", help: "Site တည်နေရာ၏ Longitude။ ဥပမာ — 95.9923", type: "number" },
      { name: "generator_capacity_kva", label: "Generator စွမ်းအား (kVA)", help: "လက်ရှိ Generator ၏ စွမ်းအား။ ဥပမာ — 110", type: "number" },
      { name: "min_grid_supply", label: "အနည်းဆုံး Grid ရရှိချိန်", help: "တစ်နေ့လျှင် Grid မီး ရရှိချိန်။ ဥပမာ — 6h~8h", type: "text" },
    ],
    images: [{ name: "satellite_photo", label: "ဂြိုဟ်တု ဓာတ်ပုံ (Satellite)" }],
  },
  {
    key: "load",
    title: "ဝန်အား / စစ်တမ်း အချက်အလက်",
    fields: [
      { name: "max_load_kw", label: "အမြင့်ဆုံး ဝန်အား (kW)", help: "တိုင်းတာ ရရှိသော အမြင့်ဆုံး Load။ ဥပမာ — 88.59", type: "number", required: true },
      { name: "avg_load_kw", label: "ပျမ်းမျှ ဝန်အား (kW)", help: "ပျမ်းမျှ Load။ ဥပမာ — 48", type: "number", required: true },
      { name: "min_load_kw", label: "အနိမ့်ဆုံး ဝန်အား (kW)", help: "အနိမ့်ဆုံး Load။ ဥပမာ — 5", type: "number" },
      { name: "voltage_v", label: "ဗို့အား (V)", help: "စနစ်၏ ဗို့အား။ ဥပမာ — 230", type: "number" },
      { name: "power_factor", label: "Power Factor (ရှိလျှင်)", help: "Power Factor တန်ဖိုး (မဖြစ်မနေ မလို)။ ဥပမာ — 0.9", type: "number" },
      { name: "daily_usage_units", label: "နေ့စဉ် သုံးစွဲမှု (Units)", help: "တစ်နေ့လျှင် သုံးစွဲသော ယူနစ်။ ဥပမာ — 900", type: "number" },
      { name: "data_logger_start", label: "Data Logger စတင်ချိန်", help: "Data logger စတင် မှတ်တမ်းတင်ချိန်", type: "datetime-local" },
      { name: "data_logger_end", label: "Data Logger ပြီးဆုံးချိန်", help: "Data logger မှတ်တမ်း ပြီးဆုံးချိန်", type: "datetime-local" },
    ],
    images: [
      { name: "survey_photo_1", label: "စစ်တမ်း ဓာတ်ပုံ ၁" },
      { name: "survey_photo_2", label: "စစ်တမ်း ဓာတ်ပုံ ၂" },
      { name: "survey_photo_3", label: "စစ်တမ်း ဓာတ်ပုံ ၃" },
      { name: "survey_photo_4", label: "စစ်တမ်း ဓာတ်ပုံ ၄" },
      { name: "survey_photo_5", label: "စစ်တမ်း ဓာတ်ပုံ ၅" },
      { name: "survey_photo_6", label: "စစ်တမ်း ဓာတ်ပုံ ၆" },
      { name: "data_logger_photo_1", label: "Data Logger ဓာတ်ပုံ ၁" },
      { name: "data_logger_photo_2", label: "Data Logger ဓာတ်ပုံ ၂" },
      { name: "data_logger_photo_3", label: "Data Logger ဓာတ်ပုံ ၃" },
      { name: "load_profile_chart", label: "Load Profile Chart" },
      { name: "system_drawing", label: "System Drawing (Slide 9)" },
    ],
  },
  {
    key: "system",
    title: "စနစ် ဒီဇိုင်း",
    fields: [
      { name: "inverter_product_id", label: "Inverter (Catalog မှ ရွေးရန်)", help: "Admin Catalog မှ Inverter ရွေးပါ။ ရွေးလျှင် Model အလိုအလျောက် ဖြည့်ပါမည်။", type: "product-select", category: "inverter" },
      { name: "inverter_model", label: "Inverter Model", help: "Inverter ၏ Model။ ဥပမာ — Sigen 60kW M1 HYB", type: "text" },
      { name: "inverter_qty", label: "Inverter အရေအတွက်", help: "Inverter လုံးရေ။ ဥပမာ — 2", type: "number", required: true },
      { name: "inverter_unit_kw", label: "Inverter တစ်လုံး (kW)", help: "Inverter တစ်လုံး၏ kW။ ဥပမာ — 60", type: "number" },
      { name: "battery_product_id", label: "Battery (Catalog မှ ရွေးရန်)", help: "Admin Catalog မှ Battery ရွေးပါ။", type: "product-select", category: "battery" },
      { name: "battery_module", label: "Battery Module", help: "Battery Module အမည်။ ဥပမာ — Sigenstack 12.0kWh", type: "text" },
      { name: "battery_qty", label: "Battery အရေအတွက်", help: "Battery module အရေအတွက်။ ဥပမာ — 36", type: "number", required: true },
      { name: "battery_unit_kwh", label: "Battery တစ်ခု (kWh)", help: "Battery module တစ်ခု၏ kWh။ ဥပမာ — 12", type: "number" },
      { name: "panel_product_id", label: "Solar Panel (Catalog မှ ရွေးရန်)", help: "Admin Catalog မှ Panel ရွေးပါ။", type: "product-select", category: "panel" },
      { name: "panel_brand", label: "Panel Brand", help: "Solar panel အမှတ်တံဆိပ်။ ဥပမာ — Longi", type: "text" },
      { name: "panel_watt", label: "Panel Watt", help: "Panel တစ်ချပ်၏ Watt။ ဥပမာ — 650", type: "number" },
      { name: "panel_qty", label: "Panel အရေအတွက်", help: "Solar panel ချပ်ရေ။ ဥပမာ — 288", type: "number", required: true },
      { name: "backup_hours", label: "Backup နာရီ", help: "Backup ပေးနိုင်သည့် နာရီ။ ဥပမာ — 8", type: "number" },
      { name: "design_margin_pct", label: "Design Margin (%)", help: "ဒီဇိုင်း လုံခြုံမှု ရာခိုင်နှုန်း။ ဥပမာ — 20", type: "number" },
      { name: "load_items", label: "အဓိက ဝန်အားများ", help: "အဓိက သုံးစွဲသည့် ပစ္စည်းများ။ ဥပမာ — Transmitter, Studio, Server", type: "text" },
    ],
  },
  {
    key: "savings",
    title: "ပါဝါ စီမံခန့်ခွဲမှု နှင့် ချွေတာမှု",
    fields: [
      { name: "bill_savings_low_pct", label: "ဘီလ် ချွေတာမှု (အနိမ့်ဆုံး %)", help: "မီတာခ ချွေတာနိုင်မှု အနိမ့်ဆုံး။ ဥပမာ — 70", type: "number" },
      { name: "bill_savings_high_pct", label: "ဘီလ် ချွေတာမှု (အမြင့်ဆုံး %)", help: "မီတာခ ချွေတာနိုင်မှု အမြင့်ဆုံး။ ဥပမာ — 80", type: "number" },
    ],
  },
  {
    key: "priority",
    title: "ပါဝါ ရင်းမြစ် ဦးစားပေး",
    fields: [
      { name: "solar_start_time", label: "Solar စတင်ချိန်", help: "Solar စတင် အသုံးပြုချိန်။ ဥပမာ — 09:00", type: "time" },
      { name: "solar_end_time", label: "Solar ပြီးဆုံးချိန်", help: "Solar ရပ်တန့်ချိန်။ ဥပမာ — 16:00", type: "time" },
      { name: "solar_load_kw", label: "Solar ဝန်အား (kW)", help: "Solar ဖြင့် တိုက်ရိုက် မောင်းနှင်မည့် Load (မထည့်လျှင် ပျမ်းမျှ Load သုံးပါမည်)။ ဥပမာ — 48", type: "number" },
      { name: "epc_start_time", label: "EPC/Grid စတင်ချိန်", help: "EPC မီးလိုင်း သုံးစတင်ချိန်။ ဥပမာ — 23:00", type: "time" },
      { name: "epc_end_time", label: "EPC/Grid ပြီးဆုံးချိန်", help: "EPC မီးလိုင်း ရပ်ချိန်။ ဥပမာ — 05:00", type: "time" },
      { name: "generator_dod_trigger_pct", label: "Generator DoD Trigger (%)", help: "Battery ဤ % သို့ ရောက်လျှင် Generator အလိုအလျောက် မောင်းမည်။ ဥပမာ — 20", type: "number" },
      { name: "power_priority_text", label: "Slide 21 — ပါဝါ ဦးစားပေး စာသား", help: "မဖြည့်လျှင် Template မူရင်းစာသား သုံးပါမည်။ 'Draft ထုတ်ရန်' နှိပ်၍ အလိုအလျောက် ရေးနိုင်သည်။", type: "textarea", lang: "mm", draft: "slide21" },
    ],
  },
  {
    key: "power_mgmt",
    title: "ပါဝါ စီမံခန့်ခွဲမှု (Slide 18)",
    fields: [
      { name: "power_management_text", label: "Slide 18 — ပါဝါ စီမံခန့်ခွဲမှု စာသား", help: "ဖောက်သည်အလိုက် စိတ်ကြိုက် စာသား (မြန်မာ)။ မဖြည့်လျှင် Template မူရင်း သုံးပါမည်။", type: "textarea", lang: "mm" },
    ],
  },
  {
    key: "warranty",
    title: "အာမခံ",
    fields: [
      { name: "install_warranty_years", label: "တပ်ဆင်မှု အာမခံ (နှစ်)", help: "Zarni ၏ တပ်ဆင်မှု အာမခံ နှစ်။ ဥပမာ — 1", type: "number" },
    ],
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
