// Small inline SVG icon set used across the proposal form.
// Kept as simple stroke icons (no emoji) so they inherit currentColor.
const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export const IconText = (p) => (
  <svg {...base} {...p}><path d="M4 6h16M4 12h16M4 18h10" /></svg>
);
export const IconNumber = (p) => (
  <svg {...base} {...p}><path d="M4 9h16M4 15h16M9 4 7 20M17 4l-2 16" /></svg>
);
export const IconCalendar = (p) => (
  <svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
);
export const IconLocation = (p) => (
  <svg {...base} {...p}><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>
);
export const IconImage = (p) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.7" /><path d="m4 17 5-5 3.5 3.5L17 11l3 3" /></svg>
);
export const IconRichText = (p) => (
  <svg {...base} {...p}><path d="M5 4h11l3 3v13H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>
);
export const IconCheckbox = (p) => (
  <svg {...base} {...p}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8.5 12 2.3 2.3L16 9.5" /></svg>
);
export const IconCurrency = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 6.5v11M9.5 9c0-1.4 1.2-2.2 2.5-2.2 1.6 0 2.6 1 2.6 2.1 0 3.1-5.1 1.9-5.1 5 0 1.2 1.1 2.1 2.6 2.1 1.4 0 2.5-.8 2.5-2.1" /></svg>
);
export const IconProduct = (p) => (
  <svg {...base} {...p}><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></svg>
);
export const IconWarranty = (p) => (
  <svg {...base} {...p}><path d="M12 3 4 6v6c0 5 3.5 8.2 8 9 4.5-.8 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IconTextarea = (p) => (
  <svg {...base} {...p}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 10h8M8 14h5" /></svg>
);
export const IconChart = (p) => (
  <svg {...base} {...p}><path d="M4 19V5M4 19h16" /><rect x="7" y="11" width="3" height="8" /><rect x="12" y="7" width="3" height="12" /><rect x="17" y="14" width="3" height="5" /></svg>
);
export const IconCover = (p) => <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></svg>;
export const IconIntro = (p) => <svg {...base} {...p}><circle cx="12" cy="8" r="3" /><path d="M5 21c0-4 3-6.5 7-6.5S19 17 19 21" /></svg>;
export const IconObjectives = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.7" fill="currentColor" /></svg>;
export const IconSurvey = (p) => <svg {...base} {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="5" /></svg>;
export const IconBill = (p) => <svg {...base} {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>;
export const IconPhoto = IconImage;
export const IconFrame = (p) => <svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 15l5-5 4 4 5-6 4 5" /></svg>;
export const IconResult = (p) => <svg {...base} {...p}><path d="M9 11l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>;
export const IconAnalyzer = (p) => <svg {...base} {...p}><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>;
export const IconOptions = (p) => <svg {...base} {...p}><circle cx="6" cy="6" r="2.2" /><circle cx="6" cy="12" r="2.2" /><circle cx="6" cy="18" r="2.2" /><path d="M10 6h11M10 12h11M10 18h11" /></svg>;
export const IconRoi = (p) => <svg {...base} {...p}><path d="M4 20 10 12l4 4 6-9" /><path d="M14 7h6v6" /></svg>;
export const IconPayback = (p) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>;
export const IconDrawing = (p) => <svg {...base} {...p}><path d="M4 20 15 9l3-3 2 2-3 3L6 22z" /><path d="M13 6l3 3" /></svg>;
export const IconSimulation = (p) => <svg {...base} {...p}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>;
export const IconSpecs = (p) => <svg {...base} {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>;
export const IconAdvantages = (p) => <svg {...base} {...p}><path d="m12 3 2.4 5.3 5.6.7-4.1 3.8 1.1 5.6L12 15.8 6.9 18.4l1.1-5.6-4.1-3.8 5.6-.7z" /></svg>;
export const IconMounting = (p) => <svg {...base} {...p}><path d="M4 20V10l8-6 8 6v10" /><path d="M4 20h16M9 20v-6h6v6" /></svg>;
export const IconClient = (p) => <svg {...base} {...p}><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.9 3-6.5 7-6.5s7 2.6 7 6.5" /></svg>;
export const IconSave = (p) => <svg {...base} {...p}><path d="M5 4h11l3 3v13H5z" /><path d="M9 4v6h6V4M7 14h10v6H7z" /></svg>;
export const IconExport = (p) => <svg {...base} {...p}><path d="M12 3v13M7 8l5-5 5 5" /><path d="M5 21h14" /></svg>;
export const IconBack = (p) => <svg {...base} {...p}><path d="M15 6l-6 6 6 6" /></svg>;
export const IconTop = (p) => <svg {...base} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>;
export const IconPlus = (p) => <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const IconLogout = (p) => <svg {...base} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></svg>;
export const IconMap = (p) => <svg {...base} {...p}><path d="M9 4 3 6.5v14L9 18l6 2.5 6-2.5v-14L15 6.5 9 4Z" /><path d="M9 4v14M15 6.5v14" /></svg>;

export const SECTION_ICONS = {
  cover: IconCover,
  intro: IconIntro,
  objectives: IconObjectives,
  surveying: IconSurvey,
  bill: IconBill,
  survey_photos: IconPhoto,
  solar_frame: IconFrame,
  data_result: IconResult,
  analyzer: IconAnalyzer,
  second_survey: IconSurvey,
  options: IconOptions,
  roi: IconRoi,
  payback: IconPayback,
  tech_drawings: IconDrawing,
  simulation: IconSimulation,
  product_specs: IconSpecs,
  tech_advantages: IconAdvantages,
  mounting_structure: IconMounting,
  warranty: IconWarranty,
};

export function sectionIcon(key) {
  return SECTION_ICONS[key] || IconText;
}

export function fieldIcon(field) {
  const name = field.name || "";
  if (/lat|lng|location/i.test(name)) return IconLocation;
  if (/cost|price|mmk|unit_cost/i.test(name)) return IconCurrency;
  if (field.type === "date") return IconCalendar;
  if (field.type === "number") return IconNumber;
  if (field.type === "checkbox") return IconCheckbox;
  if (field.type === "richtext") return IconRichText;
  if (field.type === "textarea") return IconTextarea;
  if (field.type === "product-select") return IconProduct;
  if (field.type === "warranty-select") return IconWarranty;
  return IconText;
}
