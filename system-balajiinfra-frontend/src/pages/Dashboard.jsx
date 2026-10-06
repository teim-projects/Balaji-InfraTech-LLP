import React, { useEffect, useState } from "react";
import Base from "../components/Base";
import DashboardOverview from "../components/DashboardOverview";

export default function Dashboard() {
  const [widgetData, setWidgetData] = useState({});
  const [employeeList, setEmployeeList] = useState([]);

  useEffect(() => {
    const token =
      localStorage.getItem("access") ||
      localStorage.getItem("token") ||
      "";

    const baseApi = import.meta.env.VITE_BASE_API_URL;

    // Fetch employees for real count & DOJ stats
    fetch(`${baseApi}/payroll/employee-details/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.results || []);
        const count = list.length || data.count || 0;
        setWidgetData((prev) => ({ ...prev, employees: count }));
        setEmployeeList(list);
      })
      .catch((err) => console.error("Error fetching employees:", err));

    // Fetch companies
    fetch(`${baseApi}/payroll/companies/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.results || []);
        const count = list.length || data.count || 0;
        setWidgetData((prev) => ({ ...prev, companies: count }));
      })
      .catch((err) => console.error("Error fetching companies:", err));
  }, []);

  return (
    <Base title={null}>
      <div className="space-y-4 pb-6">
        <DashboardOverview
          employeeList={employeeList}
        />
      </div>
    </Base>
  );
}

