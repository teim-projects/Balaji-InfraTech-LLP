const BASE_API = import.meta.env.VITE_BASE_API_URL;

export const dashboardConfig = [
  // Lead Count
  {
    id: "kpi_leads",
    type: "kpi",
    title: "Total Leads",
    api: `${BASE_API}/lead/lead/`,
    icon: "📊",
  },

  // Inventory
  {
    id: "kpi_inventory",
    type: "kpi",
    title: "Total Inventory",
    api: `${BASE_API}/product/product-inventory/`,
    icon: "📦",
  },

  // Variants
  {
    id: "kpi_variants",
    type: "kpi",
    title: "Total Variants",
    api: `${BASE_API}/product/product-variant/`,
    icon: "🧩",
  },

  // Brands
  {
    id: "kpi_brands",
    type: "kpi",
    title: "Total Brands",
    api: `${BASE_API}/product/ac-brand/`,
    icon: "🏷️",
  },

  // AC Types
  {
    id: "kpi_ac_types",
    type: "kpi",
    title: "AC Types",
    api: `${BASE_API}/product/actype/`,
    icon: "❄️",
  },

  // Sub Types
  {
    id: "kpi_sub_types",
    type: "kpi",
    title: "Sub Types",
    api: `${BASE_API}/product/ac-subtypes/`,
    icon: "📘",
  },
];