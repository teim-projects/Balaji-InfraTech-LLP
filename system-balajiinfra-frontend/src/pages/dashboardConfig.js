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
];