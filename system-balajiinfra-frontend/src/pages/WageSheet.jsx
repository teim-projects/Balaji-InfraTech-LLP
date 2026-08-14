import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import {
  FileSpreadsheet,
  Download,
  Building,
  Calendar,
  Search,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

export default function WageSheetPage() {
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  ), []);

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompanyObj, setSelectedCompanyObj] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [dbEmployees, setDbEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch List of Companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/lead/companies/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
          setCompanies(items);
          if (items.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(items[0].id);
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
      const found = companies.find((c) => String(c.id) === String(selectedCompanyId));
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
      const formattedDate = selectedCompanyObj?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate;

      // Fetch Attendance Records
      const attUrl = `${BASE_API.replace(/\/$/, "")}/lead/attendance-records/?company=${selectedCompanyId}&attendance_date=${formattedDate}`;
      const attRes = await fetch(attUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let attItems = [];
      if (attRes.ok) {
        const attData = await attRes.json();
        attItems = Array.isArray(attData.results) ? attData.results : Array.isArray(attData) ? attData : [];
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
        empItems = Array.isArray(empData.results) ? empData.results : Array.isArray(empData) ? empData : [];
      }
      setDbEmployees(empItems);

    } catch (err) {
      console.error("Error loading wage sheet data", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedDate, selectedCompanyObj, BASE_API, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 3. Compute Wage Sheet Table Rows using Formulas from Template IRN
  const wageSheetRows = useMemo(() => {
    if (attendanceRecords.length === 0) return [];

    return attendanceRecords.map((att, idx) => {
      const empCodeClean = (att.emp_code || "").trim().toLowerCase();
      const empNameClean = (att.emp_name || "").trim().toLowerCase();

      // Find matching employee in system DB
      const matchedEmp = dbEmployees.find(
        (e) =>
          (e.balaji_emp_code && String(e.balaji_emp_code).trim().toLowerCase() === empCodeClean) ||
          (e.name && String(e.name).trim().toLowerCase() === empNameClean)
      );

      const isSavedInSystem = !!matchedEmp;

      // MEMBER DETAILS (Blank if not saved in system)
      const memberDetails = {
        sr_no: idx + 1,
        emp_code: att.emp_code || matchedEmp?.balaji_emp_code || "",
        emp_name: att.emp_name || matchedEmp?.name || "",

        father_name: isSavedInSystem ? matchedEmp.father_or_husband_name || "" : "",
        sex: isSavedInSystem ? matchedEmp.sex || "" : "",
        address: isSavedInSystem
          ? matchedEmp.current_address_line1 || matchedEmp.permanent_address_line1 || ""
          : "",
        dob: isSavedInSystem ? matchedEmp.dob || "" : "",
        doj: isSavedInSystem ? matchedEmp.doj || "" : "",
        adhar_no: isSavedInSystem ? matchedEmp.adhar_no || "" : "",
        bank_name: isSavedInSystem ? matchedEmp.bank_name || "" : "",
        account_no: isSavedInSystem ? matchedEmp.account_no || "" : "",
        ifsc_code: isSavedInSystem ? matchedEmp.ifsc_code || "" : "",
        uan_no: isSavedInSystem ? matchedEmp.uan_no || "" : "",
        esic_no: isSavedInSystem ? matchedEmp.esic_no || "" : "",
        mobile_no: isSavedInSystem ? matchedEmp.mobile_no || "" : "",
        nominee_name: isSavedInSystem ? matchedEmp.nominee_name || "" : "",
        department: isSavedInSystem ? matchedEmp.department || "" : "",
        designation: isSavedInSystem ? matchedEmp.designation || "" : "",
        category: isSavedInSystem ? matchedEmp.category || "" : "",
        isSavedInSystem
      };

      // DAYS DATA
      const calc_days = parseFloat(matchedEmp?.calculation_days) || 27;
      const work_days = parseFloat(att.mandays) || 0;
      const c_off = 0;
      const ph = 0;
      const total_paid_days = parseFloat(att.payable_mandays) || (work_days + c_off + ph);
      const ot_hrs = parseFloat(att.payable_ot) || (parseFloat(att.ot) || 0);
      const canteen = 0;
      const advance = 0;
      const other_ded = 0;

      const daysData = {
        calc_days,
        work_days,
        c_off,
        ph,
        total_paid_days,
        ot_hrs,
        arrear_pay_days: 0,
        canteen,
        advance,
        other_ded
      };

      // RATES (Monthly Base Rates from DB if saved, else 0/blank)
      const basic_rate = isSavedInSystem ? parseFloat(matchedEmp.basic) || 0 : 0;
      const hra_rate = isSavedInSystem ? (parseFloat(matchedEmp.hra) || basic_rate * 0.05) : 0;
      const cca_rate = isSavedInSystem ? parseFloat(matchedEmp.cca_site_allowance) || 0 : 0;
      const attendance_bonus_rate = isSavedInSystem ? parseFloat(matchedEmp.attendance_bonus) || 0 : 0;
      const bonus_rate = isSavedInSystem ? (parseFloat(matchedEmp.bonus) || basic_rate * 0.0833) : 0;
      const leave_encashment_rate = isSavedInSystem ? (parseFloat(matchedEmp.leave_encashment) || basic_rate * 0.05) : 0;
      const gross_salary_rate = basic_rate + hra_rate + cca_rate + attendance_bonus_rate + bonus_rate + leave_encashment_rate;
      const transport_rate = isSavedInSystem ? parseFloat(matchedEmp.transport) || 1500 : 0;
      const pf_13_rate = isSavedInSystem ? parseFloat(matchedEmp.pf_13) || Math.min(gross_salary_rate * 0.13, 1950) : 0;
      const esic_3_25_rate = isSavedInSystem ? parseFloat(matchedEmp.esic_3_25) || ((gross_salary_rate - bonus_rate) * 0.0325) : 0;
      const uniform_shoes_rate = isSavedInSystem ? parseFloat(matchedEmp.uniform_shoes) || 300 : 0;
      const services_7_rate = isSavedInSystem ? parseFloat(matchedEmp.services_7) || ((gross_salary_rate + transport_rate + esic_3_25_rate + uniform_shoes_rate) * 0.07) : 0;
      const ctc_rate = gross_salary_rate + transport_rate + pf_13_rate + esic_3_25_rate + uniform_shoes_rate + services_7_rate;
      const per_day_ctc = calc_days > 0 ? ctc_rate / calc_days : 0;
      const site_allowance_paid_rate = isSavedInSystem ? parseFloat(matchedEmp.site_allowance_paid_rate) || (calc_days > 0 ? (basic_rate + hra_rate + cca_rate) / calc_days / 8 : 0) : 0;
      const site_allowance_billing_rate = isSavedInSystem ? parseFloat(matchedEmp.site_allowance_billing_rate) || (site_allowance_paid_rate * 1.0325 * 1.07) : 0;

      const ratesData = {
        basic_rate,
        hra_rate,
        cca_rate,
        attendance_bonus_rate,
        bonus_rate,
        leave_encashment_rate,
        gross_salary_rate,
        transport_rate,
        pf_13_rate,
        esic_3_25_rate,
        uniform_shoes_rate,
        services_7_rate,
        ctc_rate,
        per_day_ctc,
        site_allowance_paid_rate,
        site_allowance_billing_rate
      };

      // EARNINGS (Calculated dynamically for month if employee saved in system)
      let basic_earning = 0;
      let hra_earning = 0;
      let cca_earning = 0;
      let incentive_earning = 0;
      let bonus_earning = 0;
      let leave_earning = 0;
      let transport_earning = 0;
      let site_allowance_earning = 0;
      let arrear_pay = 0;
      let gross_earning = 0;

      if (isSavedInSystem && calc_days > 0) {
        basic_earning = (basic_rate / calc_days) * total_paid_days;
        hra_earning = (hra_rate / calc_days) * total_paid_days;
        cca_earning = (cca_rate / calc_days) * total_paid_days;
        incentive_earning = (attendance_bonus_rate / calc_days) * total_paid_days;
        bonus_earning = (bonus_rate / calc_days) * total_paid_days;
        leave_earning = (leave_encashment_rate / calc_days) * total_paid_days;
        transport_earning = Math.round((transport_rate / calc_days) * total_paid_days);
        site_allowance_earning = Math.round(site_allowance_paid_rate * ot_hrs);
        arrear_pay = 0;
        gross_earning = basic_earning + hra_earning + cca_earning + incentive_earning + bonus_earning + leave_earning + transport_earning + site_allowance_earning + arrear_pay;
      }

      const earningsData = {
        basic_earning,
        hra_earning,
        cca_earning,
        incentive_earning,
        bonus_earning,
        leave_earning,
        transport_earning,
        site_allowance_earning,
        arrear_pay,
        gross_earning
      };

      // DEDUCTIONS (Calculated dynamically for month if employee saved in system)
      let pf_12 = 0;
      let esic_0_75 = 0;
      let ptax = 0;
      let advance_ded = 0;
      let other_ded_val = 0;
      let canteen_ded = 0;
      let lwf_ded = 0;
      let total_deduction = 0;
      let net_salary = 0;

      if (isSavedInSystem && gross_earning > 0) {
        const pfEligibleBase = basic_rate <= 15000 ? ctc_rate : 15000;
        const rawPf = (pfEligibleBase * 0.12 * total_paid_days) / calc_days;
        pf_12 = Math.min(Math.round(rawPf), 1800);

        const esicBase = Math.max(0, gross_earning - transport_earning - bonus_earning - leave_earning);
        esic_0_75 = Math.ceil(esicBase * 0.0075);

        ptax = gross_earning >= 10000 ? 200 : (gross_earning >= 7500 ? 175 : 0);
        advance_ded = 0;
        other_ded_val = 0;
        canteen_ded = ot_hrs > 0 ? Math.round((ot_hrs / 8) * 15) : 0;
        lwf_ded = 25;

        total_deduction = pf_12 + esic_0_75 + ptax + advance_ded + other_ded_val + canteen_ded + lwf_ded;
        net_salary = Math.round(gross_earning - total_deduction);
      }

      const deductionsData = {
        pf_12,
        esic_0_75,
        ptax,
        advance_ded,
        other_ded_val,
        canteen_ded,
        lwf_ded,
        total_deduction,
        net_salary
      };

      // BILLING SUMMARY (Calculated dynamically for month if employee saved in system)
      let billing_pf_13 = 0;
      let billing_esic_3_25 = 0;
      let billing_lwf = 0;
      let billing_uniform = 0;
      let billing_admin_rate = 0;
      let billing_ctc = 0;

      if (isSavedInSystem && gross_earning > 0 && calc_days > 0) {
        billing_pf_13 = Math.min(Math.round((15000 * 0.13 * total_paid_days) / calc_days), 1950);
        const esicBase = Math.max(0, gross_earning - transport_earning - bonus_earning - leave_earning);
        billing_esic_3_25 = Math.round(esicBase * 0.0325);
        billing_lwf = 75;
        billing_uniform = 300;
        billing_admin_rate = Math.round((billing_uniform + billing_pf_13 + billing_esic_3_25 + billing_lwf + gross_earning - transport_earning) * 0.07);
        billing_ctc = gross_earning + billing_pf_13 + billing_esic_3_25 + billing_uniform + billing_admin_rate + billing_lwf;
      }

      const billingData = {
        billing_pf_13,
        billing_esic_3_25,
        billing_lwf,
        billing_uniform,
        billing_admin_rate,
        billing_ctc
      };

      return {
        id: att.id || idx + 1,
        ...memberDetails,
        ...daysData,
        ...ratesData,
        ...earningsData,
        ...deductionsData,
        ...billingData
      };
    });
  }, [attendanceRecords, dbEmployees]);

  // Filtered rows for UI search
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return wageSheetRows;
    const term = searchTerm.toLowerCase();
    return wageSheetRows.filter(
      (r) =>
        r.emp_code.toLowerCase().includes(term) ||
        r.emp_name.toLowerCase().includes(term) ||
        r.department.toLowerCase().includes(term)
    );
  }, [wageSheetRows, searchTerm]);

  // Calculate Totals for Footer Row
  const totals = useMemo(() => {
    return wageSheetRows.reduce(
      (acc, r) => {
        acc.work_days += r.work_days;
        acc.paid_days += r.total_paid_days;
        acc.ot_hrs += r.ot_hrs;
        acc.gross_earning += r.gross_earning;
        acc.total_deduction += r.total_deduction;
        acc.net_salary += r.net_salary;
        acc.billing_ctc += r.billing_ctc;
        return acc;
      },
      {
        work_days: 0,
        paid_days: 0,
        ot_hrs: 0,
        gross_earning: 0,
        total_deduction: 0,
        net_salary: 0,
        billing_ctc: 0
      }
    );
  }, [wageSheetRows]);

  // Export to Excel (Template IRN Exact Layout)
  const handleExportExcel = () => {
    if (wageSheetRows.length === 0) {
      Swal.fire({ icon: "warning", title: "No Data", text: "There are no wage sheet records to export." });
      return;
    }

    let monthYearStr = selectedDate;
    try {
      const parts = selectedDate.split("-");
      if (parts.length >= 2) {
        const yearNum = parts[0];
        const monthNum = parseInt(parts[1], 10) - 1;
        const d = new Date(yearNum, monthNum, 1);
        monthYearStr = d.toLocaleString("en-US", { month: "long", year: "numeric" });
      }
    } catch {
      monthYearStr = selectedDate;
    }

    const companyName = selectedCompanyObj?.name || "Company";

    // Build Exact Template IRN 6-Row Header Banner & Columns
    const headerGroupRow = [
      "MEMBER DETAILS", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "DAYS DATA", "", "", "", "", "", "", "", "", "",
      "Rates", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "Earnings", "", "", "", "", "", "", "", "", "",
      "Deductions", "", "", "", "", "", "", "", "",
      "BILLING SUMMARY", "", "", "", "", ""
    ];

    const columnsRow = [
      "S.NO.", "BALAJI EMP Code", "NAME", "FATHER NAME", "SEX", "ADD.", "DOB", "DOJ", "ADHAR NO.", "BANK NAME", "A/C NO.", "IFSC CODE.", "UAN No.", "ESIC NO", "MOBILE NO", "NOMINEE NAME", "Department", "Designation", "CATEGORY",
      "Calculation Days", "TOTAL WORK DAYS", "C Off", "PH", "Total Paid Days", "SITE ALLOWANCE WORK HRS", "ARREAR PAY", "CANTEEN", "ADVANCE", "Other DED",
      "Basic", "HRA", "CCA / Site Allowance", "Attendance Bonus", "BONUS", "Leave Encashment", "Gross Salary", "Transport", "PF 13%", "ESIC 3.25%", "UNIFORM/SHOES", "SERVICES 7%", "CTC", "PER DAY CTC", "SITE ALLOWANCE PAID RATE", "SITE ALLOWANCE BILLING RATE",
      "Basic", "HRA", "CCA / Site Allowance", "Incentive", "Bonus", "Leave Encashment", "Transport", "SITE ALLOWANCE", "ARREAR PAY", "Gross Salary",
      "PF 12%", "ESIC 0.75%", "P.Tax", "ADVANCE", "OTHER DED", "Canteen", "LWF", "Total Deduction", "Net Salary",
      "PF @13%", "ESIC/WC @ 3.25%", "LWF", "Uniform Charges", "Admin Charges Rate", "CTC"
    ];

    const dataRows = wageSheetRows.map((r, i) => [
      i + 1,
      r.emp_code || "",
      r.emp_name || "",
      r.father_name || "",
      r.sex || "",
      r.address || "",
      r.dob || "",
      r.doj || "",
      r.adhar_no || "",
      r.bank_name || "",
      r.account_no || "",
      r.ifsc_code || "",
      r.uan_no || "",
      r.esic_no || "",
      r.mobile_no || "",
      r.nominee_name || "",
      r.department || "",
      r.designation || "",
      r.category || "",
      r.isSavedInSystem ? r.calc_days : "",
      r.work_days,
      r.isSavedInSystem ? r.c_off : "",
      r.isSavedInSystem ? r.ph : "",
      r.total_paid_days,
      r.ot_hrs,
      r.isSavedInSystem ? r.arrear_pay_days : "",
      r.isSavedInSystem ? r.canteen : "",
      r.isSavedInSystem ? r.advance : "",
      r.isSavedInSystem ? r.other_ded : "",
      r.isSavedInSystem ? r.basic_rate : "",
      r.isSavedInSystem ? r.hra_rate : "",
      r.isSavedInSystem ? r.cca_rate : "",
      r.isSavedInSystem ? r.attendance_bonus_rate : "",
      r.isSavedInSystem ? r.bonus_rate : "",
      r.isSavedInSystem ? r.leave_encashment_rate : "",
      r.isSavedInSystem ? r.gross_salary_rate : "",
      r.isSavedInSystem ? r.transport_rate : "",
      r.isSavedInSystem ? r.pf_13_rate : "",
      r.isSavedInSystem ? r.esic_3_25_rate : "",
      r.isSavedInSystem ? r.uniform_shoes_rate : "",
      r.isSavedInSystem ? r.services_7_rate : "",
      r.isSavedInSystem ? r.ctc_rate : "",
      r.isSavedInSystem ? r.per_day_ctc.toFixed(2) : "",
      r.isSavedInSystem ? r.site_allowance_paid_rate.toFixed(2) : "",
      r.isSavedInSystem ? r.site_allowance_billing_rate.toFixed(2) : "",
      r.isSavedInSystem ? r.basic_earning.toFixed(2) : "",
      r.isSavedInSystem ? r.hra_earning.toFixed(2) : "",
      r.isSavedInSystem ? r.cca_earning.toFixed(2) : "",
      r.isSavedInSystem ? r.incentive_earning.toFixed(2) : "",
      r.isSavedInSystem ? r.bonus_earning.toFixed(2) : "",
      r.isSavedInSystem ? r.leave_earning.toFixed(2) : "",
      r.isSavedInSystem ? r.transport_earning : "",
      r.isSavedInSystem ? r.site_allowance_earning : "",
      r.isSavedInSystem ? r.arrear_pay : "",
      r.isSavedInSystem ? r.gross_earning.toFixed(2) : "",
      r.isSavedInSystem ? r.pf_12 : "",
      r.isSavedInSystem ? r.esic_0_75 : "",
      r.isSavedInSystem ? r.ptax : "",
      r.isSavedInSystem ? r.advance_ded : "",
      r.isSavedInSystem ? r.other_ded_val : "",
      r.isSavedInSystem ? r.canteen_ded : "",
      r.isSavedInSystem ? r.lwf_ded : "",
      r.isSavedInSystem ? r.total_deduction : "",
      r.isSavedInSystem ? r.net_salary : "",
      r.isSavedInSystem ? r.billing_pf_13 : "",
      r.isSavedInSystem ? r.billing_esic_3_25 : "",
      r.isSavedInSystem ? r.billing_lwf : "",
      r.isSavedInSystem ? r.billing_uniform : "",
      r.isSavedInSystem ? r.billing_admin_rate : "",
      r.isSavedInSystem ? r.billing_ctc : ""
    ]);

    const totalRow = [
      "TOTAL", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "", totals.work_days, "", "", totals.paid_days, totals.ot_hrs, "", "", "", "",
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "", "", "", "", "", "", "", "", "", totals.gross_earning.toFixed(2),
      "", "", "", "", "", "", "", totals.total_deduction, totals.net_salary,
      "", "", "", "", "", totals.billing_ctc
    ];

    const sheetAOA = [
      [`WAGE SHEET — ${companyName.toUpperCase()}`],
      [`BILL FOR ${monthYearStr.toUpperCase()}`],
      [],
      headerGroupRow,
      columnsRow,
      ...dataRows,
      totalRow
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetAOA);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Wage Sheet");

    const safeComp = companyName.replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `${monthYearStr} ${safeComp} Wage Sheet.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Base title="Wage Sheet">
      <div className="space-y-4">
        {/* Header Action Bar */}
        <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <span>Wage Sheet — {selectedCompanyObj?.name || "Select Company"}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-filled from Attendance records & Employee Master Database (Template IRN Format)
            </p>
          </div>

          {/* Action Inputs */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Company Selector */}
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <Building className="w-4 h-4 text-slate-500" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent text-slate-700 text-xs font-semibold outline-none cursor-pointer max-w-[200px]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date/Month Picker */}
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500" />
              <input
                type={selectedCompanyObj?.salary_type === "monthly" ? "month" : "date"}
                value={selectedCompanyObj?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate}
                onChange={(e) => setSelectedDate(selectedCompanyObj?.salary_type === "monthly" ? e.target.value + "-01" : e.target.value)}
                className="bg-transparent text-slate-700 text-xs font-semibold outline-none cursor-pointer"
              />
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search Emp Code/Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            {/* Download Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={wageSheetRows.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download Wage Sheet as Excel (Template IRN Format)"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>Download Sheet</span>
            </button>
          </div>
        </div>

        {/* Content Table Area */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-56">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : wageSheetRows.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 space-y-3">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
                No saved attendance records found for <strong className="text-blue-600">{selectedCompanyObj?.name || "selected company"}</strong>.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                When attendance is saved for this company and month in the <strong>Attendance Sheet</strong> section, the Wage Sheet will automatically be populated here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[72vh] [scrollbar-width:thin]">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                {/* 2-Tier Header Row matching Template IRN Response */}
                <thead className="bg-[#eef1f6] text-slate-800 font-bold sticky top-0 z-20 shadow-2xs">
                  {/* Group Header Row */}
                  <tr className="border-b border-slate-300 text-[11px] uppercase tracking-wider text-center bg-slate-200/70">
                    <th colSpan={19} className="py-2 px-3 border-r border-slate-300 bg-slate-200 text-slate-800">MEMBER DETAILS</th>
                    <th colSpan={10} className="py-2 px-3 border-r border-slate-300 bg-blue-100/70 text-blue-900">DAYS DATA</th>
                    <th colSpan={16} className="py-2 px-3 border-r border-slate-300 bg-amber-100/70 text-amber-900">RATES (MONTHLY BASE)</th>
                    <th colSpan={10} className="py-2 px-3 border-r border-slate-300 bg-emerald-100/70 text-emerald-900">EARNINGS</th>
                    <th colSpan={9} className="py-2 px-3 border-r border-slate-300 bg-red-100/70 text-red-900">DEDUCTIONS</th>
                    <th colSpan={6} className="py-2 px-3 bg-purple-100/70 text-purple-900">BILLING SUMMARY</th>
                  </tr>
                  {/* Specific Columns Header Row */}
                  <tr className="border-b border-slate-300 text-[10px] uppercase tracking-wider divide-x divide-slate-300">
                    {/* Member Details */}
                    <th className="py-2.5 px-3 text-center min-w-[50px]">S.NO.</th>
                    <th className="py-2.5 px-3 min-w-[110px]">EMP Code</th>
                    <th className="py-2.5 px-3 min-w-[180px]">NAME</th>
                    <th className="py-2.5 px-3 min-w-[160px]">FATHER NAME</th>
                    <th className="py-2.5 px-3 min-w-[70px]">SEX</th>
                    <th className="py-2.5 px-3 min-w-[180px]">ADDRESS</th>
                    <th className="py-2.5 px-3 min-w-[90px]">DOB</th>
                    <th className="py-2.5 px-3 min-w-[90px]">DOJ</th>
                    <th className="py-2.5 px-3 min-w-[110px]">ADHAR NO.</th>
                    <th className="py-2.5 px-3 min-w-[140px]">BANK NAME</th>
                    <th className="py-2.5 px-3 min-w-[110px]">A/C NO.</th>
                    <th className="py-2.5 px-3 min-w-[100px]">IFSC CODE</th>
                    <th className="py-2.5 px-3 min-w-[100px]">UAN NO.</th>
                    <th className="py-2.5 px-3 min-w-[100px]">ESIC NO</th>
                    <th className="py-2.5 px-3 min-w-[100px]">MOBILE NO</th>
                    <th className="py-2.5 px-3 min-w-[140px]">NOMINEE</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Department</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Designation</th>
                    <th className="py-2.5 px-3 min-w-[90px]">CATEGORY</th>

                    {/* Days Data */}
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 min-w-[70px]">Calc Days</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 min-w-[80px]">Work Days</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 min-w-[60px]">C Off</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 min-w-[60px]">PH</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 font-bold min-w-[80px]">Paid Days</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 min-w-[80px]">OT Hrs</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 min-w-[70px]">Arrear Pay</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 min-w-[70px]">Canteen</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 min-w-[70px]">Advance</th>
                    <th className="py-2.5 px-3 text-right bg-blue-50/50 min-w-[70px]">Other Ded</th>

                    {/* Rates */}
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">Basic</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[70px]">HRA</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">CCA/Site</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">Att Bonus</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[70px]">Bonus</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">Leave Enc</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[90px]">Gross Salary</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">Transport</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[70px]">PF 13%</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">ESIC 3.25%</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">Uniform</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">Services 7%</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[90px]">CTC</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[90px]">Per Day CTC</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[90px]">Site Paid Rate</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[95px]">Site Bill Rate</th>

                    {/* Earnings */}
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50 min-w-[80px]">Basic</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50 min-w-[70px]">HRA</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50 min-w-[80px]">CCA/Site</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50 min-w-[80px]">Incentive</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50 min-w-[70px]">Bonus</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50 min-w-[80px]">Leave Enc</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50 min-w-[80px]">Transport</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50 min-w-[85px]">Site Allow</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-50/50 min-w-[70px]">Arrear Pay</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-100/80 text-emerald-900 font-bold min-w-[95px]">Gross Earning</th>

                    {/* Deductions */}
                    <th className="py-2.5 px-3 text-right bg-red-50/50 min-w-[70px]">PF 12%</th>
                    <th className="py-2.5 px-3 text-right bg-red-50/50 min-w-[75px]">ESIC 0.75%</th>
                    <th className="py-2.5 px-3 text-right bg-red-50/50 min-w-[65px]">P.Tax</th>
                    <th className="py-2.5 px-3 text-right bg-red-50/50 min-w-[70px]">Advance</th>
                    <th className="py-2.5 px-3 text-right bg-red-50/50 min-w-[70px]">Other Ded</th>
                    <th className="py-2.5 px-3 text-right bg-red-50/50 min-w-[70px]">Canteen</th>
                    <th className="py-2.5 px-3 text-right bg-red-50/50 min-w-[60px]">LWF</th>
                    <th className="py-2.5 px-3 text-right bg-red-100/80 text-red-900 font-bold min-w-[90px]">Total Ded</th>
                    <th className="py-2.5 px-3 text-right bg-emerald-200/80 text-emerald-950 font-bold min-w-[95px]">Net Salary</th>

                    {/* Billing Summary */}
                    <th className="py-2.5 px-3 text-right bg-purple-50/50 min-w-[75px]">PF @13%</th>
                    <th className="py-2.5 px-3 text-right bg-purple-50/50 min-w-[85px]">ESIC @3.25%</th>
                    <th className="py-2.5 px-3 text-right bg-purple-50/50 min-w-[60px]">LWF</th>
                    <th className="py-2.5 px-3 text-right bg-purple-50/50 min-w-[80px]">Uniform</th>
                    <th className="py-2.5 px-3 text-right bg-purple-50/50 min-w-[85px]">Admin Rate</th>
                    <th className="py-2.5 px-3 text-right bg-purple-200/80 text-purple-950 font-bold min-w-[95px]">Billing CTC</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors divide-x divide-slate-100">
                      {/* Member Details */}
                      <td className="py-2 px-3 text-center font-medium text-slate-500">{r.sr_no}</td>
                      <td className="py-2 px-3 font-mono font-medium text-slate-800">{r.emp_code}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {r.emp_name}
                        {!r.isSavedInSystem && (
                          <span className="ml-1.5 text-[10px] font-normal px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">
                            Unsaved
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{r.father_name || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.sex || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.address || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.dob || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.doj || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.adhar_no || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.bank_name || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.account_no || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.ifsc_code || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.uan_no || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.esic_no || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.mobile_no || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.nominee_name || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.department || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.designation || "—"}</td>
                      <td className="py-2 px-3 text-slate-600">{r.category || "—"}</td>

                      {/* Days Data */}
                      <td className="py-2 px-3 text-right text-slate-600 bg-blue-50/20">{r.isSavedInSystem ? r.calc_days : "—"}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-800 bg-blue-50/20">{r.work_days}</td>
                      <td className="py-2 px-3 text-right text-slate-600 bg-blue-50/20">{r.isSavedInSystem ? r.c_off : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-600 bg-blue-50/20">{r.isSavedInSystem ? r.ph : "—"}</td>
                      <td className="py-2 px-3 text-right font-bold text-blue-800 bg-blue-100/30">{r.total_paid_days}</td>
                      <td className="py-2 px-3 text-right text-slate-800 bg-blue-50/20">{r.ot_hrs}</td>
                      <td className="py-2 px-3 text-right text-slate-600 bg-blue-50/20">{r.isSavedInSystem ? r.arrear_pay_days : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-600 bg-blue-50/20">{r.isSavedInSystem ? r.canteen : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-600 bg-blue-50/20">{r.isSavedInSystem ? r.advance : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-600 bg-blue-50/20">{r.isSavedInSystem ? r.other_ded : "—"}</td>

                      {/* Rates */}
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.basic_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.hra_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.cca_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.attendance_bonus_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.bonus_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.leave_encashment_rate : "—"}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900 bg-amber-50/20">{r.isSavedInSystem ? r.gross_salary_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.transport_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.pf_13_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.esic_3_25_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.uniform_shoes_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.services_7_rate : "—"}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900 bg-amber-50/20">{r.isSavedInSystem ? r.ctc_rate : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.per_day_ctc.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.site_allowance_paid_rate.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.isSavedInSystem ? r.site_allowance_billing_rate.toFixed(2) : "—"}</td>

                      {/* Earnings */}
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.isSavedInSystem ? r.basic_earning.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.isSavedInSystem ? r.hra_earning.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.isSavedInSystem ? r.cca_earning.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.isSavedInSystem ? r.incentive_earning.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.isSavedInSystem ? r.bonus_earning.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.isSavedInSystem ? r.leave_earning.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.isSavedInSystem ? r.transport_earning : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.isSavedInSystem ? r.site_allowance_earning : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.isSavedInSystem ? r.arrear_pay : "—"}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800 bg-emerald-100/50">{r.isSavedInSystem ? r.gross_earning.toFixed(2) : "—"}</td>

                      {/* Deductions */}
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.isSavedInSystem ? r.pf_12 : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.isSavedInSystem ? r.esic_0_75 : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.isSavedInSystem ? r.ptax : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.isSavedInSystem ? r.advance_ded : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.isSavedInSystem ? r.other_ded_val : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.isSavedInSystem ? r.canteen_ded : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.isSavedInSystem ? r.lwf_ded : "—"}</td>
                      <td className="py-2 px-3 text-right font-bold text-red-800 bg-red-100/50">{r.isSavedInSystem ? r.total_deduction : "—"}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-900 bg-emerald-200/50">{r.isSavedInSystem ? r.net_salary : "—"}</td>

                      {/* Billing Summary */}
                      <td className="py-2 px-3 text-right text-slate-700 bg-purple-50/20">{r.isSavedInSystem ? r.billing_pf_13 : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-purple-50/20">{r.isSavedInSystem ? r.billing_esic_3_25 : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-purple-50/20">{r.isSavedInSystem ? r.billing_lwf : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-purple-50/20">{r.isSavedInSystem ? r.billing_uniform : "—"}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-purple-50/20">{r.isSavedInSystem ? r.billing_admin_rate : "—"}</td>
                      <td className="py-2 px-3 text-right font-bold text-purple-950 bg-purple-200/50">{r.isSavedInSystem ? r.billing_ctc : "—"}</td>
                    </tr>
                  ))}
                </tbody>

                {/* Footer Totals Row */}
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 divide-x divide-slate-300">
                  <tr>
                    <td colSpan={19} className="py-3 px-4 text-right uppercase tracking-wider">
                      TOTAL ({filteredRows.length} Employees)
                    </td>
                    <td className="py-3 px-3 text-right"></td>
                    <td className="py-3 px-3 text-right text-blue-800">{totals.work_days}</td>
                    <td colSpan={2}></td>
                    <td className="py-3 px-3 text-right text-blue-900 bg-blue-100/50">{totals.paid_days}</td>
                    <td className="py-3 px-3 text-right text-slate-800">{totals.ot_hrs}</td>
                    <td colSpan={29}></td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-800 bg-emerald-100/50">
                      {totals.gross_earning.toFixed(2)}
                    </td>
                    <td colSpan={7}></td>
                    <td className="py-3 px-3 text-right font-bold text-red-800 bg-red-100/50">
                      {totals.total_deduction}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-950 bg-emerald-200/50">
                      {totals.net_salary}
                    </td>
                    <td colSpan={5}></td>
                    <td className="py-3 px-3 text-right font-bold text-purple-950 bg-purple-200/50">
                      {totals.billing_ctc}
                    </td>
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
