import { useState, useMemo } from "react";
import Base from "../components/Base";
import AmcList from "../components/amc/AmcList";
import ServiceManagementList from "../components/amc/ServiceManagementList";

export default function AmcPage() {
  const baseApi = import.meta.env.VITE_BASE_API_URL;
  const [activeTab, setActiveTab] = useState("contracts");
  const [filters, setFilters] = useState({});

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  ), []);

  const filtersConfigMap = {
    contracts: [
      { key: "search", label: "Search", type: "search", placeholder: "Search by contract no, customer name..." }
    ],
    management: [
      { key: "search", label: "Search", type: "search", placeholder: "Search by customer name, contact..." }
    ]
  };

  const filterTitleMap = {
    contracts: "AMC Contract Filters",
    management: "Service Management Filters"
  };

  const tabs = [
    { key: "contracts", label: "AMC Contracts" },
    { key: "management", label: "Service Management" },
  ];

  return (
    <Base
      title="AMC Management"
      filterTitle={filterTitleMap[activeTab] || "Filters"}
      filtersConfig={filtersConfigMap[activeTab] || null}
      initialFilterValues={filters}
      onFiltersChange={setFilters}
    >
      <div className="p-4">
        <div className="flex gap-3 mb-4 flex-wrap">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${activeTab === key
                  ? "bg-blue-600 text-white shadow"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              onClick={() => { setActiveTab(key); setFilters({}); }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "contracts" && <AmcList baseApi={baseApi} token={token} filters={filters} />}
        {activeTab === "management" && <ServiceManagementList baseApi={baseApi} token={token} filters={filters} />}
      </div>
    </Base>
  );
}
