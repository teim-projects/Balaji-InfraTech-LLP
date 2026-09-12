const BASE_API = import.meta.env.VITE_BASE_API_URL;

export const dashboardConfig = [
  {
    id: "kpi_employees",
    type: "kpi",
    title: "Total Employees",
    api: `${BASE_API}/lead/employee-details/`,
    icon: "👥",
  },
  {
    id: "kpi_companies",
    type: "kpi",
    title: "Total Companies",
    api: `${BASE_API}/lead/companies/`,
    icon: "🏢",
  },
];