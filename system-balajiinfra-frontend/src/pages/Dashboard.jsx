import React, { useEffect, useState } from "react";
import Base from "../components/Base";
import DashboardWidget from "./DashboardWidget";
import { dashboardConfig } from "./dashboardConfig";

export default function Dashboard() {
  const [widgetData, setWidgetData] = useState({});

  useEffect(() => {
    const token =
      localStorage.getItem("access") ||
      localStorage.getItem("token") ||
      "";

    dashboardConfig.forEach(async (widget) => {
      if (!widget.api) return;

      try {
        const res = await fetch(widget.api, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = await res.json();

        setWidgetData((prev) => ({
          ...prev,
          [widget.id]: data.count || 0,
        }));
      } catch (error) {
        console.error("API Error: ", widget.api);
      }
    });
  }, []);

  return (
    <Base
      title="  "
      filterTitle="Dashboard Filters"
      // filtersConfig={[]}
      // initialFilterValues={{}}
    >
      <div className="space-y-10">

        {/* KPI GRID */}
        <div className="
          grid 
          grid-cols-1 
          sm:grid-cols-2 
          md:grid-cols-3 
          lg:grid-cols-3 
          gap-6
        ">
          {dashboardConfig.map((widget) => (
            <DashboardWidget
              key={widget.id}
              widget={widget}
              data={widgetData[widget.id]}
            />
          ))}
        </div>

      </div>
    </Base>
  );
}
