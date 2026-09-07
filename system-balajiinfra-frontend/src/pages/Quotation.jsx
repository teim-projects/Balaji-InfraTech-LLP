import React, { useState, useEffect, useCallback, useMemo } from "react";
import Base from "../components/Base";
import {
  FileSpreadsheet,
  Building,
  Calendar,
  Search,
  RefreshCw,
  Download,
  ShieldCheck,
  Award,
  Wallet,
  Building2,
  FileCheck,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function CompliancesPage() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompanyObj, setSelectedCompanyObj] = useState(null);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'pf' | 'esic' | 'pt_lwf'

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [dbEmployees, setDbEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const token = useMemo(
    () =>
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      "",
    []
  );

  // 1. Fetch Companies list
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/lead/companies/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data.results)
            ? data.results
            : Array.isArray(data)
            ? data
            : [];
          setCompanies(items);
          if (items.length > 0) {
            setSelectedCompanyId(String(items[0].id));
            setSelectedCompanyObj(items[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch companies", err);
      }
    };
    fetchCompanies();
  }, [BASE_API, token]);

  // Update selected company object when selection changes
  useEffect(() => {
    if (selectedCompanyId && companies.length > 0) {
      const found = companies.find(
        (c) => String(c.id) === String(selectedCompanyId)
      );
      setSelectedCompanyObj(found || null);
    }
  }, [selectedCompanyId, companies]);

  // 2. Fetch Saved Attendance Records & System DB Employees for selected Company & Month
  const fetchData = useCallback(async () => {
    if (!selectedCompanyId || !selectedDate) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const formattedDate =
        selectedCompanyObj?.salary_type === "monthly"
          ? selectedDate.substring(0, 7)
          : selectedDate;

      // Fetch Attendance Records
      const attUrl = `${BASE_API.replace(
        /\/$/,
        ""
      )}/lead/attendance-records/?company=${selectedCompanyId}&attendance_date=${formattedDate}`;
      const attRes = await fetch(attUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let attItems = [];
      if (attRes.ok) {
        const attData = await attRes.json();
        attItems = Array.isArray(attData.results)
          ? attData.results
          : Array.isArray(attData)
          ? attData
          : [];
      }
      setAttendanceRecords(attItems);

      // Fetch Employee Details for matching
      const empUrl = `${BASE_API.replace(/\/$/, "")}/lead/employee-details/`;
      const empRes = await fetch(empUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let empItems = [];
      if (empRes.ok) {
        const empData = await empRes.json();
        empItems = Array.isArray(empData.results)
          ? empData.results
          : Array.isArray(empData)
          ? empData
          : [];
      }
      setDbEmployees(empItems);
    } catch (err) {
      console.error("Error loading compliance data", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedDate, selectedCompanyObj, BASE_API, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 3. Compute Compliance Rows using standard statutory formulas
  const complianceRows = useMemo(() => {
    if (attendanceRecords.length === 0) return [];

    return attendanceRecords.map((att, idx) => {
      const empCodeClean = (att.emp_code || "").trim().toLowerCase();
      const empNameClean = (att.emp_name || "").trim().toLowerCase();

      // Find matching employee in system DB
      const matchedEmp = dbEmployees.find(
        (e) =>
          (e.balaji_emp_code &&
            String(e.balaji_emp_code).trim().toLowerCase() === empCodeClean) ||
          (e.name && String(e.name).trim().toLowerCase() === empNameClean)
      );

      const isSavedInSystem = !!matchedEmp;

      // Member details
      const sr_no = idx + 1;
      const emp_code = att.emp_code || matchedEmp?.balaji_emp_code || "";
      const emp_name = att.emp_name || matchedEmp?.name || "";
      const uan_no = isSavedInSystem ? matchedEmp.uan_no || "" : "";
      const esic_no = isSavedInSystem ? matchedEmp.esic_no || "" : "";
      const adhar_no = isSavedInSystem ? matchedEmp.adhar_no || "" : "";
      const department = isSavedInSystem ? matchedEmp.department || "" : "";
      const designation = isSavedInSystem ? matchedEmp.designation || "" : "";

      // Days data
      const calc_days = parseFloat(matchedEmp?.calculation_days) || 27;
      const work_days = parseFloat(att.mandays) || 0;
      const paid_days = parseFloat(att.payable_mandays) || work_days;
      const ot_hrs = parseFloat(att.payable_ot) || parseFloat(att.ot) || 0;

      // Rates
      const basic_rate = isSavedInSystem ? parseFloat(matchedEmp.basic) || 0 : 0;
      const hra_rate = isSavedInSystem ? parseFloat(matchedEmp.hra) || basic_rate * 0.05 : 0;
      const cca_rate = isSavedInSystem ? parseFloat(matchedEmp.cca_site_allowance) || 0 : 0;
      const attendance_bonus_rate = isSavedInSystem ? parseFloat(matchedEmp.attendance_bonus) || 0 : 0;
      const bonus_rate = isSavedInSystem ? parseFloat(matchedEmp.bonus) || basic_rate * 0.0833 : 0;
      const leave_encashment_rate = isSavedInSystem ? parseFloat(matchedEmp.leave_encashment) || basic_rate * 0.05 : 0;
      const gross_salary_rate = basic_rate + hra_rate + cca_rate + attendance_bonus_rate + bonus_rate + leave_encashment_rate;
      const transport_rate = isSavedInSystem ? parseFloat(matchedEmp.transport) || 1500 : 0;
      const site_allowance_paid_rate = isSavedInSystem
        ? parseFloat(matchedEmp.site_allowance_paid_rate) || (calc_days > 0 ? (basic_rate + hra_rate + cca_rate) / calc_days / 8 : 0)
        : 0;

      // Earnings
      let basic_earning = 0;
      let gross_earning = 0;
      let transport_earning = 0;
      let bonus_earning = 0;
      let leave_earning = 0;

      if (isSavedInSystem && calc_days > 0) {
        basic_earning = (basic_rate / calc_days) * paid_days;
        const hra_earning = (hra_rate / calc_days) * paid_days;
        const cca_earning = (cca_rate / calc_days) * paid_days;
        const incentive_earning = (attendance_bonus_rate / calc_days) * paid_days;
        bonus_earning = (bonus_rate / calc_days) * paid_days;
        leave_earning = (leave_encashment_rate / calc_days) * paid_days;
        transport_earning = Math.round((transport_rate / calc_days) * paid_days);
        const site_allowance_earning = Math.round(site_allowance_paid_rate * ot_hrs);
        gross_earning =
          basic_earning +
          hra_earning +
          cca_earning +
          incentive_earning +
          bonus_earning +
          leave_earning +
          transport_earning +
          site_allowance_earning;
      }

      // EPF Calculations (Standard ECR format)
      let epf_wages = 0;
      let eps_wages = 0;
      let edli_wages = 0;
      let ee_pf_12 = 0;
      let er_eps_8_33 = 0;
      let er_epf_3_67 = 0;
      let er_admin_1 = 0;
      let total_pf_contribution = 0;

      if (isSavedInSystem && gross_earning > 0 && calc_days > 0) {
        // EPF base wage capped at 15,000 for statutory return
        const fullBasic = (basic_rate / calc_days) * paid_days;
        epf_wages = Math.min(Math.round(fullBasic), 15000);
        eps_wages = epf_wages;
        edli_wages = epf_wages;

        ee_pf_12 = Math.min(Math.round(fullBasic * 0.12), 1800);
        er_eps_8_33 = Math.min(Math.round(fullBasic * 0.0833), 1250);
        er_epf_3_67 = Math.max(0, ee_pf_12 - er_eps_8_33);
        er_admin_1 = Math.round(epf_wages * 0.01);
        total_pf_contribution = ee_pf_12 + er_eps_8_33 + er_epf_3_67 + er_admin_1;
      }

      // ESIC Calculations (Standard Monthly Return)
      let esic_wages = 0;
      let ee_esic_0_75 = 0;
      let er_esic_3_25 = 0;
      let total_esic = 0;

      if (isSavedInSystem && gross_earning > 0) {
        esic_wages = Math.round(
          Math.max(0, gross_earning - transport_earning - bonus_earning - leave_earning)
        );
        ee_esic_0_75 = Math.ceil(esic_wages * 0.0075);
        er_esic_3_25 = Math.round(esic_wages * 0.0325);
        total_esic = ee_esic_0_75 + er_esic_3_25;
      }

      // Professional Tax (PT)
      let ptax = 0;
      if (isSavedInSystem && gross_earning > 0) {
        ptax = gross_earning >= 10000 ? 200 : gross_earning >= 7500 ? 175 : 0;
      }

      // Labour Welfare Fund (LWF)
      let lwf_ee = isSavedInSystem && gross_earning > 0 ? 25 : 0;
      let lwf_er = isSavedInSystem && gross_earning > 0 ? 75 : 0;
      let total_lwf = lwf_ee + lwf_er;

      // Grand Total Compliance Cost for Employee
      const total_compliance = total_pf_contribution + total_esic + ptax + total_lwf;

      return {
        id: att.id || idx + 1,
        sr_no,
        emp_code,
        emp_name,
        uan_no,
        esic_no,
        adhar_no,
        department,
        designation,
        paid_days,
        gross_earning: Math.round(gross_earning),
        // PF
        epf_wages,
        eps_wages,
        edli_wages,
        ee_pf_12,
        er_eps_8_33,
        er_epf_3_67,
        er_admin_1,
        total_pf_contribution,
        // ESIC
        esic_wages,
        ee_esic_0_75,
        er_esic_3_25,
        total_esic,
        // PT & LWF
        ptax,
        lwf_ee,
        lwf_er,
        total_lwf,
        // Total
        total_compliance,
        isSavedInSystem,
      };
    });
  }, [attendanceRecords, dbEmployees]);

  // Filter compliance rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return complianceRows;
    const term = searchTerm.toLowerCase().trim();
    return complianceRows.filter(
      (r) =>
        (r.emp_code && r.emp_code.toLowerCase().includes(term)) ||
        (r.emp_name && r.emp_name.toLowerCase().includes(term)) ||
        (r.uan_no && r.uan_no.toLowerCase().includes(term)) ||
        (r.esic_no && r.esic_no.toLowerCase().includes(term))
    );
  }, [complianceRows, searchTerm]);

  // Totals calculations
  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.gross_earning += r.gross_earning;
        acc.epf_wages += r.epf_wages;
        acc.ee_pf_12 += r.ee_pf_12;
        acc.er_eps_8_33 += r.er_eps_8_33;
        acc.er_epf_3_67 += r.er_epf_3_67;
        acc.er_admin_1 += r.er_admin_1;
        acc.total_pf_contribution += r.total_pf_contribution;

        acc.esic_wages += r.esic_wages;
        acc.ee_esic_0_75 += r.ee_esic_0_75;
        acc.er_esic_3_25 += r.er_esic_3_25;
        acc.total_esic += r.total_esic;

        acc.ptax += r.ptax;
        acc.lwf_ee += r.lwf_ee;
        acc.lwf_er += r.lwf_er;
        acc.total_lwf += r.total_lwf;
        acc.total_compliance += r.total_compliance;
        return acc;
      },
      {
        gross_earning: 0,
        epf_wages: 0,
        ee_pf_12: 0,
        er_eps_8_33: 0,
        er_epf_3_67: 0,
        er_admin_1: 0,
        total_pf_contribution: 0,
        esic_wages: 0,
        ee_esic_0_75: 0,
        er_esic_3_25: 0,
        total_esic: 0,
        ptax: 0,
        lwf_ee: 0,
        lwf_er: 0,
        total_lwf: 0,
        total_compliance: 0,
      }
    );
  }, [filteredRows]);

  // Excel Export
  const handleExportExcel = () => {
    if (complianceRows.length === 0) return;

    let periodStr = selectedDate;
    try {
      const parts = selectedDate.split("-");
      if (parts.length >= 2) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        periodStr = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      }
    } catch {
      periodStr = selectedDate;
    }

    const compName = selectedCompanyObj?.name || "Balaji Renew Infratech LLP";

    const headers = [
      "SR.NO",
      "EMP CODE",
      "EMPLOYEE NAME",
      "UAN NO",
      "ESIC NO",
      "PAID DAYS",
      "GROSS EARNING",
      "EPF WAGES",
      "EE PF 12%",
      "ER EPS 8.33%",
      "ER EPF 3.67%",
      "ER ADMIN 1%",
      "TOTAL PF",
      "ESIC WAGES",
      "EE ESIC 0.75%",
      "ER ESIC 3.25%",
      "TOTAL ESIC",
      "P.TAX",
      "LWF (EE+ER)",
      "TOTAL STATUTORY COMPLIANCE",
    ];

    const dataRows = filteredRows.map((r, i) => [
      i + 1,
      r.emp_code,
      r.emp_name,
      r.uan_no || "-",
      r.esic_no || "-",
      r.paid_days,
      r.gross_earning,
      r.epf_wages,
      r.ee_pf_12,
      r.er_eps_8_33,
      r.er_epf_3_67,
      r.er_admin_1,
      r.total_pf_contribution,
      r.esic_wages,
      r.ee_esic_0_75,
      r.er_esic_3_25,
      r.total_esic,
      r.ptax,
      r.total_lwf,
      r.total_compliance,
    ]);

    const totalRow = [
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      totals.gross_earning,
      totals.epf_wages,
      totals.ee_pf_12,
      totals.er_eps_8_33,
      totals.er_epf_3_67,
      totals.er_admin_1,
      totals.total_pf_contribution,
      totals.esic_wages,
      totals.ee_esic_0_75,
      totals.er_esic_3_25,
      totals.total_esic,
      totals.ptax,
      totals.total_lwf,
      totals.total_compliance,
    ];

    const sheetData = [
      [`STATUTORY COMPLIANCE SHEET — ${compName.toUpperCase()}`],
      [`Period: ${periodStr}`],
      [],
      headers,
      ...dataRows,
      totalRow,
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compliances");

    const safeName = compName.replace(/[\\/:*?"<>|]/g, "_");
    XLSX.writeFile(wb, `${periodStr} ${safeName} - Statutory Compliances.xlsx`);
  };

  return (
    <Base title="Compliances">
      <div className="space-y-4">
        {/* Header Action Bar — Matches Screenshot */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="shrink-0">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <span>Compliances — {selectedCompanyObj?.name || "Select Company"}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-filled from Attendance records & Employee Master Database (Statutory Compliance Format)
            </p>
          </div>

          {/* Action Inputs - Single line */}
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 sm:pb-0">
            {/* Company Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200 shrink-0">
              <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent text-slate-700 text-xs font-semibold outline-none cursor-pointer max-w-[160px]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date/Month Picker */}
            <div className="flex items-center space-x-1.5 bg-slate-50 p-1.5 rounded-lg border border-slate-200 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type={selectedCompanyObj?.salary_type === "monthly" ? "month" : "date"}
                value={
                  selectedCompanyObj?.salary_type === "monthly"
                    ? selectedDate.substring(0, 7)
                    : selectedDate
                }
                onChange={(e) =>
                  setSelectedDate(
                    selectedCompanyObj?.salary_type === "monthly"
                      ? e.target.value + "-01"
                      : e.target.value
                  )
                }
                className="bg-transparent text-slate-700 text-xs font-semibold outline-none cursor-pointer"
              />
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search Emp Code/Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-36 sm:w-44"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors shrink-0"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            {/* Download Excel Button - Small & Single Line */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={complianceRows.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
              title="Download Compliance Sheet as Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-100" />
              <span>Download Sheet</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Banner */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total EPF (PF)</div>
              <div className="text-base font-bold text-slate-800">
                ₹{totals.total_pf_contribution.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total ESIC</div>
              <div className="text-base font-bold text-slate-800">
                ₹{totals.total_esic.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Prof. Tax (PT)</div>
              <div className="text-base font-bold text-slate-800">
                ₹{totals.ptax.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total LWF</div>
              <div className="text-base font-bold text-slate-800">
                ₹{totals.total_lwf.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3 col-span-2 md:col-span-1">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Grand Total</div>
              <div className="text-base font-bold text-indigo-700">
                ₹{totals.total_compliance.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          {[
            { id: "all", label: "All Compliances" },
            { id: "pf", label: "EPFO / PF Return" },
            { id: "esic", label: "ESIC Return" },
            { id: "pt_lwf", label: "PT & LWF" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Table Area */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-56">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 space-y-3">
              <ShieldCheck className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
                No saved attendance records found for{" "}
                <strong className="text-blue-600">
                  {selectedCompanyObj?.name || "selected company"}
                </strong>
                .
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                When attendance is saved for this company and month in the{" "}
                <strong>Attendance Sheet</strong> section, statutory compliances will automatically be calculated and displayed here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[70vh] [scrollbar-width:thin]">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead className="bg-[#eef1f6] text-slate-800 font-bold sticky top-0 z-20 shadow-2xs">
                  <tr className="border-b border-slate-300 text-[11px] uppercase tracking-wider text-center bg-slate-200/70">
                    <th colSpan={5} className="py-2 px-3 border-r border-slate-300 bg-slate-200 text-slate-800">
                      MEMBER DETAILS
                    </th>
                    {activeTab === "all" && (
                      <>
                        <th colSpan={3} className="py-2 px-3 border-r border-slate-300 bg-blue-100/70 text-blue-900">
                          PF (EPFO)
                        </th>
                        <th colSpan={3} className="py-2 px-3 border-r border-slate-300 bg-emerald-100/70 text-emerald-900">
                          ESIC
                        </th>
                        <th colSpan={2} className="py-2 px-3 border-r border-slate-300 bg-purple-100/70 text-purple-900">
                          PT & LWF
                        </th>
                        <th colSpan={1} className="py-2 px-3 bg-indigo-100/70 text-indigo-900">
                          TOTAL
                        </th>
                      </>
                    )}
                    {activeTab === "pf" && (
                      <th colSpan={8} className="py-2 px-3 bg-blue-100/70 text-blue-900">
                        EPFO STATUTORY DETAILS (ECR FORMAT)
                      </th>
                    )}
                    {activeTab === "esic" && (
                      <th colSpan={5} className="py-2 px-3 bg-emerald-100/70 text-emerald-900">
                        ESIC MONTHLY RETURN DETAILS
                      </th>
                    )}
                    {activeTab === "pt_lwf" && (
                      <th colSpan={4} className="py-2 px-3 bg-purple-100/70 text-purple-900">
                        PROFESSIONAL TAX & LABOUR WELFARE FUND
                      </th>
                    )}
                  </tr>
                  <tr className="border-b border-slate-300 bg-slate-100 text-[11px]">
                    <th className="py-2.5 px-3 text-center w-12">SR</th>
                    <th className="py-2.5 px-3">EMP CODE</th>
                    <th className="py-2.5 px-3 min-w-[160px]">NAME</th>
                    <th className="py-2.5 px-3 min-w-[120px]">UAN NO</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 min-w-[120px]">ESIC NO</th>

                    {/* Tab: ALL */}
                    {activeTab === "all" && (
                      <>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50">EPF WAGES</th>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50">EE PF (12%)</th>
                        <th className="py-2.5 px-3 text-right border-r border-slate-300 bg-blue-50/50">ER PF (13%)</th>

                        <th className="py-2.5 px-3 text-right bg-emerald-50/50">ESIC WAGES</th>
                        <th className="py-2.5 px-3 text-right bg-emerald-50/50">EE (0.75%)</th>
                        <th className="py-2.5 px-3 text-right border-r border-slate-300 bg-emerald-50/50">ER (3.25%)</th>

                        <th className="py-2.5 px-3 text-right bg-purple-50/50">P.TAX</th>
                        <th className="py-2.5 px-3 text-right border-r border-slate-300 bg-purple-50/50">LWF</th>

                        <th className="py-2.5 px-3 text-right bg-indigo-50/70 font-extrabold text-indigo-950">TOTAL COMPLIANCE</th>
                      </>
                    )}

                    {/* Tab: PF */}
                    {activeTab === "pf" && (
                      <>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50">GROSS</th>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50">EPF WAGES</th>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50">EPS WAGES</th>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50">EE 12%</th>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50">ER EPS 8.33%</th>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50">ER EPF 3.67%</th>
                        <th className="py-2.5 px-3 text-right bg-blue-50/50">ADMIN 1%</th>
                        <th className="py-2.5 px-3 text-right bg-blue-100 font-extrabold text-blue-950">TOTAL PF</th>
                      </>
                    )}

                    {/* Tab: ESIC */}
                    {activeTab === "esic" && (
                      <>
                        <th className="py-2.5 px-3 text-right bg-emerald-50/50">PAID DAYS</th>
                        <th className="py-2.5 px-3 text-right bg-emerald-50/50">ESIC WAGES</th>
                        <th className="py-2.5 px-3 text-right bg-emerald-50/50">EE ESIC (0.75%)</th>
                        <th className="py-2.5 px-3 text-right bg-emerald-50/50">ER ESIC (3.25%)</th>
                        <th className="py-2.5 px-3 text-right bg-emerald-100 font-extrabold text-emerald-950">TOTAL ESIC (4%)</th>
                      </>
                    )}

                    {/* Tab: PT & LWF */}
                    {activeTab === "pt_lwf" && (
                      <>
                        <th className="py-2.5 px-3 text-right bg-purple-50/50">GROSS SALARY</th>
                        <th className="py-2.5 px-3 text-right bg-purple-50/50">P.TAX DEDUCTION</th>
                        <th className="py-2.5 px-3 text-right bg-purple-50/50">LWF EMPLOYEE</th>
                        <th className="py-2.5 px-3 text-right bg-purple-100 font-extrabold text-purple-950">TOTAL LWF (100)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRows.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-500 font-medium">{i + 1}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800">{r.emp_code}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{r.emp_name}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{r.uan_no || "—"}</td>
                      <td className="py-2 px-3 font-mono text-slate-600 border-r border-slate-200">{r.esic_no || "—"}</td>

                      {/* Tab: ALL */}
                      {activeTab === "all" && (
                        <>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-blue-50/20">{r.epf_wages.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-semibold text-blue-700 bg-blue-50/20">{r.ee_pf_12.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-semibold text-blue-800 border-r border-slate-200 bg-blue-50/20">{(r.er_eps_8_33 + r.er_epf_3_67 + r.er_admin_1).toLocaleString()}</td>

                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-emerald-50/20">{r.esic_wages.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-semibold text-emerald-700 bg-emerald-50/20">{r.ee_esic_0_75.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-semibold text-emerald-800 border-r border-slate-200 bg-emerald-50/20">{r.er_esic_3_25.toLocaleString()}</td>

                          <td className="py-2 px-3 text-right font-medium text-purple-700 bg-purple-50/20">{r.ptax.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-medium text-purple-800 border-r border-slate-200 bg-purple-50/20">{r.total_lwf.toLocaleString()}</td>

                          <td className="py-2 px-3 text-right font-bold text-indigo-700 bg-indigo-50/30">{r.total_compliance.toLocaleString()}</td>
                        </>
                      )}

                      {/* Tab: PF */}
                      {activeTab === "pf" && (
                        <>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-blue-50/20">{r.gross_earning.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-blue-50/20">{r.epf_wages.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-blue-50/20">{r.eps_wages.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-semibold text-blue-700 bg-blue-50/20">{r.ee_pf_12.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-blue-50/20">{r.er_eps_8_33.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-blue-50/20">{r.er_epf_3_67.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-blue-50/20">{r.er_admin_1.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-bold text-blue-800 bg-blue-100/40">{r.total_pf_contribution.toLocaleString()}</td>
                        </>
                      )}

                      {/* Tab: ESIC */}
                      {activeTab === "esic" && (
                        <>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-emerald-50/20">{r.paid_days}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-emerald-50/20">{r.esic_wages.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-semibold text-emerald-700 bg-emerald-50/20">{r.ee_esic_0_75.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-semibold text-emerald-800 bg-emerald-50/20">{r.er_esic_3_25.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-800 bg-emerald-100/40">{r.total_esic.toLocaleString()}</td>
                        </>
                      )}

                      {/* Tab: PT & LWF */}
                      {activeTab === "pt_lwf" && (
                        <>
                          <td className="py-2 px-3 text-right font-medium text-slate-700 bg-purple-50/20">{r.gross_earning.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-semibold text-purple-700 bg-purple-50/20">{r.ptax.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-medium text-purple-700 bg-purple-50/20">{r.lwf_ee.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-bold text-purple-800 bg-purple-100/40">{r.total_lwf.toLocaleString()}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>

                {/* Table Footer with Totals */}
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-xs sticky bottom-0 z-10 shadow-md">
                  <tr>
                    <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider border-r border-slate-300">
                      Total ({filteredRows.length} Employees)
                    </td>

                    {/* Tab: ALL */}
                    {activeTab === "all" && (
                      <>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-blue-100/50">{totals.epf_wages.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-700 bg-blue-100/50">{totals.ee_pf_12.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-900 border-r border-slate-300 bg-blue-100/50">{(totals.er_eps_8_33 + totals.er_epf_3_67 + totals.er_admin_1).toLocaleString()}</td>

                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-emerald-100/50">{totals.esic_wages.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 bg-emerald-100/50">{totals.ee_esic_0_75.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-900 border-r border-slate-300 bg-emerald-100/50">{totals.er_esic_3_25.toLocaleString()}</td>

                        <td className="py-2.5 px-3 text-right font-bold text-purple-800 bg-purple-100/50">{totals.ptax.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-purple-900 border-r border-slate-300 bg-purple-100/50">{totals.total_lwf.toLocaleString()}</td>

                        <td className="py-2.5 px-3 text-right font-black text-indigo-900 bg-indigo-100/70 text-sm">₹{totals.total_compliance.toLocaleString()}</td>
                      </>
                    )}

                    {/* Tab: PF */}
                    {activeTab === "pf" && (
                      <>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-blue-100/50">{totals.gross_earning.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-blue-100/50">{totals.epf_wages.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-blue-100/50">{totals.epf_wages.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-blue-700 bg-blue-100/50">{totals.ee_pf_12.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-blue-100/50">{totals.er_eps_8_33.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-blue-100/50">{totals.er_epf_3_67.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-blue-100/50">{totals.er_admin_1.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-black text-blue-900 bg-blue-200/60">₹{totals.total_pf_contribution.toLocaleString()}</td>
                      </>
                    )}

                    {/* Tab: ESIC */}
                    {activeTab === "esic" && (
                      <>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-emerald-100/50">-</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-emerald-100/50">{totals.esic_wages.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700 bg-emerald-100/50">{totals.ee_esic_0_75.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-800 bg-emerald-100/50">{totals.er_esic_3_25.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-950 bg-emerald-200/60">₹{totals.total_esic.toLocaleString()}</td>
                      </>
                    )}

                    {/* Tab: PT & LWF */}
                    {activeTab === "pt_lwf" && (
                      <>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 bg-purple-100/50">{totals.gross_earning.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-purple-800 bg-purple-100/50">{totals.ptax.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-purple-700 bg-purple-100/50">{totals.lwf_ee.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-black text-purple-950 bg-purple-200/60">₹{totals.total_lwf.toLocaleString()}</td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </Base>
  );
}