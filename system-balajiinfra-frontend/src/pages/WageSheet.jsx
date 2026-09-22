import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Base from "../components/Base";
import {
  FileSpreadsheet,
  Download,
  Building,
  Calendar,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { getModuleFormulas } from "../utils/formulaConfig";
import CustomDropdown from "../components/CustomDropdown";

export default function WageSheetPage() {
  const navigate = useNavigate();
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

  // ── Approval State ─────────────────────────────────────────────────────────
  const approvalKey = useMemo(() => {
    if (!selectedCompanyId || !selectedDate) return null;
    const ym = selectedDate.substring(0, 7).replace("-", "_");
    return `payroll_approved_${selectedCompanyId}_${ym}`;
  }, [selectedCompanyId, selectedDate]);

  const [approvedIds, setApprovedIds] = useState(new Set());
  const [wageFormulas, setWageFormulas] = useState(() => getModuleFormulas("wage_sheet"));

  useEffect(() => {
    const handleFormulaUpdate = () => {
      setWageFormulas(getModuleFormulas("wage_sheet"));
    };
    window.addEventListener("formula-config-changed", handleFormulaUpdate);
    return () => window.removeEventListener("formula-config-changed", handleFormulaUpdate);
  }, []);

  // Load approved IDs from localStorage when company/month changes
  useEffect(() => {
    if (!approvalKey) return;
    try {
      const stored = JSON.parse(localStorage.getItem(approvalKey) || "[]");
      setApprovedIds(new Set(stored));
    } catch {
      setApprovedIds(new Set());
    }
  }, [approvalKey]);

  const persistApproved = useCallback((newSet) => {
    if (!approvalKey) return;
    localStorage.setItem(approvalKey, JSON.stringify([...newSet]));
    setApprovedIds(new Set(newSet));
  }, [approvalKey]);

  const handleApprove = useCallback((rowId) => {
    const newSet = new Set(approvedIds);
    newSet.add(rowId);
    persistApproved(newSet);
    Swal.fire({
      title: "Approved",
      text: "Employee salary approved and sent to Payroll.",
      icon: "success",
      showCancelButton: true,
      confirmButtonText: "Go to Payroll",
      cancelButtonText: "Stay Here",
      confirmButtonColor: "#1e40af",
    }).then((result) => {
      if (result.isConfirmed) navigate("/payroll");
    });
  }, [approvedIds, persistApproved, navigate]);

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

  // ── Company-specific Billing Configuration (with fallbacks to master formulas/standards) ──
  const compPfPct = (selectedCompanyObj?.pf !== null && selectedCompanyObj?.pf !== undefined && selectedCompanyObj?.pf !== "")
    ? parseFloat(selectedCompanyObj.pf)
    : (parseFloat(wageFormulas.pf_employer_pct) || 13);

  const compEsicPct = (selectedCompanyObj?.esic !== null && selectedCompanyObj?.esic !== undefined && selectedCompanyObj?.esic !== "")
    ? parseFloat(selectedCompanyObj.esic)
    : (parseFloat(wageFormulas.esic_employer_pct) || 3.25);

  const compLwf = (selectedCompanyObj?.lwf !== null && selectedCompanyObj?.lwf !== undefined && selectedCompanyObj?.lwf !== "")
    ? parseFloat(selectedCompanyObj.lwf)
    : 75;

  const compUniform = (selectedCompanyObj?.uniform_charge !== null && selectedCompanyObj?.uniform_charge !== undefined && selectedCompanyObj?.uniform_charge !== "")
    ? parseFloat(selectedCompanyObj.uniform_charge)
    : 300;

  const compAdminPct = (selectedCompanyObj?.admin_charge !== null && selectedCompanyObj?.admin_charge !== undefined && selectedCompanyObj?.admin_charge !== "")
    ? parseFloat(selectedCompanyObj.admin_charge)
    : (parseFloat(wageFormulas.service_charge_pct) || 7);

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
      // Dynamic formula percentages from Master Data & Company Billing Configuration
      const hra_pct = (parseFloat(wageFormulas.hra_pct) || 5) / 100;
      const bonus_pct = (parseFloat(wageFormulas.bonus_pct) || 8.33) / 100;
      const leave_pct = (parseFloat(wageFormulas.leave_encashment_pct) || 5) / 100;
      const pf_er_pct = compPfPct / 100;
      const esic_er_pct = compEsicPct / 100;
      const services_pct = compAdminPct / 100;
      const canteen_daily_rate = parseFloat(wageFormulas.canteen_deduction_day) || 15;

      const ot_hrs = parseFloat(att.payable_ot) || (parseFloat(att.ot) || 0);
      // Canteen: (WorkDays + COff) * Canteen Rate from Formula Config
      const canteen = Math.round((work_days + c_off) * canteen_daily_rate);
      const advance = 0;
      const other_ded = (parseFloat(att.total_deduction) || (
        (parseFloat(att.deduction_other) || 0) +
        (parseFloat(att.deduction_shows_tshirt) || 0) +
        (parseFloat(att.deduction_rashan) || 0) +
        (parseFloat(att.deduction_room_rent) || 0) +
        (parseFloat(att.deduction_light_bill) || 0) +
        (parseFloat(att.deduction_lpg) || 0)
      )) + (parseFloat(att.extra_deductions) || 0);

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

      // RATES (Monthly Base Rates: DB rates if saved, else default rates for unregistered employees)
      const basic_rate = isSavedInSystem ? parseFloat(matchedEmp.basic) || 0 : 15525;
      const hra_rate = isSavedInSystem ? (parseFloat(matchedEmp.hra) || basic_rate * hra_pct) : basic_rate * hra_pct;
      const cca_rate = isSavedInSystem ? parseFloat(matchedEmp.cca_site_allowance) || 0 : 0;
      const attendance_bonus_rate = isSavedInSystem ? parseFloat(matchedEmp.attendance_bonus) || 0 : 0;
      const bonus_rate = isSavedInSystem ? (parseFloat(matchedEmp.bonus) || basic_rate * bonus_pct) : basic_rate * bonus_pct;
      
      // Leave Encashment: integer format (remove float values) as requested
      const leave_encashment_rate = Math.round(
        isSavedInSystem ? (parseFloat(matchedEmp.leave_encashment) || basic_rate * leave_pct) : basic_rate * leave_pct
      );
      
      // Gross Salary: remove float values (integer format) as requested
      const gross_salary_rate = Math.round(
        basic_rate + hra_rate + cca_rate + attendance_bonus_rate + bonus_rate + leave_encashment_rate
      );
      
      const transport_rate = isSavedInSystem ? Math.round(parseFloat(matchedEmp.transport) || 1500) : 1500;
      const pf_13_rate = isSavedInSystem
        ? Math.round(parseFloat(matchedEmp.pf_13) || (basic_rate > 15000 ? 15000 * pf_er_pct : basic_rate * pf_er_pct))
        : (basic_rate > 15000 ? Math.round(15000 * pf_er_pct) : Math.round(basic_rate * pf_er_pct));
      
      // ESIC in RATES: (Gross Salary - Bonus) * ESIC ER % in integer format
      const esic_3_25_rate = isSavedInSystem && parseFloat(matchedEmp.esic_3_25) > 0
        ? Math.round(parseFloat(matchedEmp.esic_3_25))
        : Math.round((gross_salary_rate - bonus_rate) * esic_er_pct);
        
      const uniform_shoes_rate = isSavedInSystem ? Math.round(parseFloat(matchedEmp.uniform_shoes) || compUniform) : compUniform;
      
      // Services in RATES: (Gross + PF + ESIC + Uniform) * Service %
      const services_7_rate = Math.round((gross_salary_rate + pf_13_rate + esic_3_25_rate + uniform_shoes_rate) * services_pct);
      
      // CTC in RATES: Gross + Transport + PF + ESIC + Uniform + Services
      const ctc_rate = Math.round(gross_salary_rate + transport_rate + pf_13_rate + esic_3_25_rate + uniform_shoes_rate + services_7_rate);
      
      const per_day_ctc = calc_days > 0 ? ctc_rate / calc_days : 0;
      const site_allowance_paid_rate = isSavedInSystem && parseFloat(matchedEmp.site_allowance_paid_rate) > 0
        ? parseFloat(matchedEmp.site_allowance_paid_rate)
        : (calc_days > 0 ? (basic_rate + hra_rate + cca_rate) / calc_days / 8 : 0);
      const site_allowance_billing_rate = isSavedInSystem && parseFloat(matchedEmp.site_allowance_billing_rate) > 0
        ? parseFloat(matchedEmp.site_allowance_billing_rate)
        : (site_allowance_paid_rate * (1 + esic_er_pct) * (1 + services_pct));

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

      // EARNINGS (Calculated dynamically for month)
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

      if (calc_days > 0) {
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

      // DEDUCTIONS (Calculated dynamically for month)
      let pf_12 = 0;
      let esic_0_75 = 0;
      let ptax = 0;
      let advance_ded = 0;
      let other_ded_val = 0;
      let canteen_ded = 0;
      let lwf_ded = 0;
      let total_deduction = 0;
      let net_salary = 0;

      if (gross_earning > 0 && calc_days > 0) {
        const pf_ee_pct = (parseFloat(wageFormulas.pf_employee_pct) || 12) / 100;
        const esic_ee_pct = (parseFloat(wageFormulas.esic_employee_pct) || 0.75) / 100;

        // In Jun Wages Sheet.xlsx Col BE: IF(Gross <= 15000, ROUND(CTC * PF%, 0), ROUND(15000 * PF% * PaidDays / CalcDays, 0)) capped at 1800
        const rawPf = gross_salary_rate <= 15000
          ? Math.round(ctc_rate * pf_ee_pct)
          : Math.round((15000 * pf_ee_pct * total_paid_days) / calc_days);
        pf_12 = Math.min(rawPf, 1800);

        // ESIC: In Jun Wages Sheet.xlsx Col BF: ROUNDUP((Gross - Transport - Bonus - Leave) * ESIC%, 0)
        const esicBase = Math.max(0, gross_earning - transport_earning - bonus_earning - leave_earning);
        esic_0_75 = Math.ceil(esicBase * esic_ee_pct);

        ptax = gross_earning >= 10000 ? 200 : (gross_earning >= 7500 ? 175 : 0);
        advance_ded = advance;
        other_ded_val = other_ded;
        // Canteen deduction matches Excel Col BJ (=+AB)
        canteen_ded = canteen;
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

      // BILLING SUMMARY (Calculated dynamically for month based on Company Billing Settings)
      let billing_pf_13 = 0;
      let billing_esic_3_25 = 0;
      let billing_lwf = 0;
      let billing_uniform = 0;
      let billing_admin_rate = 0;
      let billing_ctc = 0;

      if (gross_earning > 0 && calc_days > 0) {
        const pf_rate_dec = compPfPct / 100;
        const pfCap = Math.round(15000 * pf_rate_dec);
        // In Jun Wages Sheet.xlsx Col BN: IF(Gross <= 15000, ROUND(CTC * PF%, 0), ROUND(15000 * PF% * PaidDays / CalcDays, 0)) capped at 15000 * PF%
        const rawPf13 = gross_salary_rate <= 15000
          ? Math.round(ctc_rate * pf_rate_dec)
          : Math.round((15000 * pf_rate_dec * total_paid_days) / calc_days);
        billing_pf_13 = Math.min(rawPf13, pfCap);

        // ESIC: In Jun Wages Sheet.xlsx Col BO: ROUND((Gross - Transport - Bonus - Leave) * ESIC%, 0)
        const esic_rate_dec = compEsicPct / 100;
        const esicBase = Math.max(0, gross_earning - transport_earning - bonus_earning - leave_earning);
        billing_esic_3_25 = Math.round(esicBase * esic_rate_dec);

        billing_lwf = compLwf;
        billing_uniform = compUniform;

        // Admin rate: In Jun Wages Sheet.xlsx Col BR: ROUND((Uniform + PF + ESIC + LWF + Gross Earning - Transport) * AdminRate%, 0)
        const admin_rate_dec = compAdminPct / 100;
        billing_admin_rate = Math.round((billing_uniform + billing_pf_13 + billing_esic_3_25 + billing_lwf + gross_earning - transport_earning) * admin_rate_dec);

        // Billing CTC: In Jun Wages Sheet.xlsx Col BS: BD + BN + BO + BQ + BR + BP
        billing_ctc = parseFloat((gross_earning + billing_pf_13 + billing_esic_3_25 + billing_uniform + billing_admin_rate + billing_lwf).toFixed(2));
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
  }, [attendanceRecords, dbEmployees, selectedCompanyObj, wageFormulas, compPfPct, compEsicPct, compLwf, compUniform, compAdminPct]);

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
        acc.billing_pf_13 += r.billing_pf_13;
        acc.billing_esic_3_25 += r.billing_esic_3_25;
        acc.billing_lwf += r.billing_lwf;
        acc.billing_uniform += r.billing_uniform;
        acc.billing_admin_rate += r.billing_admin_rate;
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
        billing_pf_13: 0,
        billing_esic_3_25: 0,
        billing_lwf: 0,
        billing_uniform: 0,
        billing_admin_rate: 0,
        billing_ctc: 0
      }
    );
  }, [wageSheetRows]);

  // ── handleApproveAll defined here so wageSheetRows is in scope ─────────────
  const handleApproveAll = useCallback(() => {
    if (wageSheetRows.length === 0) return;
    Swal.fire({
      title: "Approve All Employees?",
      text: `This will approve all ${wageSheetRows.length} employee salaries and send them to Payroll.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Approve All",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1e40af",
    }).then((result) => {
      if (!result.isConfirmed) return;
      const newSet = new Set(wageSheetRows.map((r) => r.id));
      persistApproved(newSet);
      Swal.fire({
        title: "All Approved",
        text: `${wageSheetRows.length} employees approved and sent to Payroll.`,
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Go to Payroll",
        cancelButtonText: "Stay Here",
        confirmButtonColor: "#1e40af",
      }).then((r2) => {
        if (r2.isConfirmed) navigate("/payroll");
      });
    });
  }, [wageSheetRows, persistApproved, navigate]);

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
      "Basic", "HRA", "CCA / Site Allowance", "Attendance Bonus", "BONUS", "Leave Encashment", "Gross Salary", "Transport", `PF ${compPfPct}%`, `ESIC ${compEsicPct}%`, "UNIFORM/SHOES", `SERVICES ${compAdminPct}%`, "CTC", "PER DAY CTC", "SITE ALLOWANCE PAID RATE", "SITE ALLOWANCE BILLING RATE",
      "Basic", "HRA", "CCA / Site Allowance", "Incentive", "Bonus", "Leave Encashment", "Transport", "SITE ALLOWANCE", "ARREAR PAY", "Gross Salary",
      "PF 12%", "ESIC 0.75%", "P.Tax", "ADVANCE", "OTHER DED", "Canteen", "LWF", "Total Deduction", "Net Salary",
      `PF @${compPfPct}%`, `ESIC @${compEsicPct}%`, "LWF", "Uniform Charges", `Admin Rate (${compAdminPct}%)`, "Billing CTC"
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
      r.calc_days,
      r.work_days,
      r.c_off,
      r.ph,
      r.total_paid_days,
      r.ot_hrs,
      r.arrear_pay_days,
      r.canteen,
      r.advance,
      r.other_ded,
      r.basic_rate,
      r.hra_rate,
      r.cca_rate,
      r.attendance_bonus_rate,
      r.bonus_rate,
      r.leave_encashment_rate,
      r.gross_salary_rate,
      r.transport_rate,
      r.pf_13_rate,
      r.esic_3_25_rate,
      r.uniform_shoes_rate,
      r.services_7_rate,
      r.ctc_rate,
      r.per_day_ctc.toFixed(2),
      r.site_allowance_paid_rate.toFixed(2),
      r.site_allowance_billing_rate.toFixed(2),
      r.basic_earning.toFixed(2),
      r.hra_earning.toFixed(2),
      r.cca_earning.toFixed(2),
      r.incentive_earning.toFixed(2),
      r.bonus_earning.toFixed(2),
      r.leave_earning.toFixed(2),
      r.transport_earning,
      r.site_allowance_earning,
      r.arrear_pay,
      r.gross_earning.toFixed(2),
      r.pf_12,
      r.esic_0_75,
      r.ptax,
      r.advance_ded,
      r.other_ded_val,
      r.canteen_ded,
      r.lwf_ded,
      r.total_deduction,
      r.net_salary,
      r.billing_pf_13,
      r.billing_esic_3_25,
      r.billing_lwf,
      r.billing_uniform,
      r.billing_admin_rate,
      Number(r.billing_ctc).toFixed(2)
    ]);

    const totalRow = [
      "TOTAL", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "", totals.work_days, "", "", totals.paid_days, totals.ot_hrs, "", "", "", "",
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      "", "", "", "", "", "", "", "", "", totals.gross_earning.toFixed(2),
      "", "", "", "", "", "", "", totals.total_deduction, totals.net_salary,
      totals.billing_pf_13, totals.billing_esic_3_25, totals.billing_lwf, totals.billing_uniform, totals.billing_admin_rate, totals.billing_ctc.toFixed(2)
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
        <div className="bg-white px-3 py-2.5 rounded-xl shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="shrink-0">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Wage Sheet — {selectedCompanyObj?.name || "Select Company"}</span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              Auto-filled from Attendance records &amp; Employee Master Database (Template IRN Format)
            </p>
          </div>

          {/* Action Inputs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Company Selector */}
            <CustomDropdown
              options={companies}
              value={selectedCompanyId}
              onChange={(val) => setSelectedCompanyId(val)}
              placeholder="Select Company"
              icon={Building}
            />

            {/* Date/Month Picker */}
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              <input
                type={selectedCompanyObj?.salary_type === "monthly" ? "month" : "date"}
                value={selectedCompanyObj?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate}
                onChange={(e) => setSelectedDate(selectedCompanyObj?.salary_type === "monthly" ? e.target.value + "-01" : e.target.value)}
                className="bg-transparent text-slate-700 text-xs font-medium outline-none cursor-pointer"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchData}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            {/* Approve All Button */}
            <button
              type="button"
              onClick={handleApproveAll}
              disabled={wageSheetRows.length === 0}
              className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              title="Approve all employee salaries"
            >
              {approvedIds.size === wageSheetRows.length && wageSheetRows.length > 0
                ? `All Approved (${approvedIds.size})`
                : `Approve All`}
            </button>

            {/* Download Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={wageSheetRows.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              title="Download Wage Sheet as Excel (Template IRN Format)"
            >
              <Download className="w-3 h-3" />
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
                    <th colSpan={1} className="py-2 px-3 border-r border-slate-300 bg-indigo-100/70 text-indigo-900">ACTION</th>
                    <th colSpan={19} className="py-2 px-3 border-r border-slate-300 bg-slate-200 text-slate-800">MEMBER DETAILS</th>
                    <th colSpan={10} className="py-2 px-3 border-r border-slate-300 bg-blue-100/70 text-blue-900">DAYS DATA</th>
                    <th colSpan={16} className="py-2 px-3 border-r border-slate-300 bg-amber-100/70 text-amber-900">RATES (MONTHLY BASE)</th>
                    <th colSpan={10} className="py-2 px-3 border-r border-slate-300 bg-emerald-100/70 text-emerald-900">EARNINGS</th>
                    <th colSpan={9} className="py-2 px-3 border-r border-slate-300 bg-red-100/70 text-red-900">DEDUCTIONS</th>
                    <th colSpan={6} className="py-2 px-3 bg-purple-100/70 text-purple-900">BILLING SUMMARY</th>
                  </tr>
                  {/* Specific Columns Header Row */}
                  <tr className="border-b border-slate-300 text-[10px] uppercase tracking-wider divide-x divide-slate-300">
                    {/* Action */}
                    <th className="py-2.5 px-3 text-center min-w-[90px] bg-indigo-50/50">Approve</th>
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
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[70px]">PF {compPfPct}%</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">ESIC {compEsicPct}%</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">Uniform</th>
                    <th className="py-2.5 px-3 text-right bg-amber-50/50 min-w-[80px]">Services {compAdminPct}%</th>
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
                    <th className="py-2.5 px-3 text-right bg-purple-50/50 min-w-[75px]">PF @{compPfPct}%</th>
                    <th className="py-2.5 px-3 text-right bg-purple-50/50 min-w-[85px]">ESIC @{compEsicPct}%</th>
                    <th className="py-2.5 px-3 text-right bg-purple-50/50 min-w-[60px]">LWF</th>
                    <th className="py-2.5 px-3 text-right bg-purple-50/50 min-w-[80px]">Uniform</th>
                    <th className="py-2.5 px-3 text-right bg-purple-50/50 min-w-[95px]">Admin Rate ({compAdminPct}%)</th>
                    <th className="py-2.5 px-3 text-right bg-purple-200/80 text-purple-950 font-bold min-w-[95px]">Billing CTC</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {wageSheetRows.map((r) => {
                    const isApproved = approvedIds.has(r.id);
                    return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors divide-x divide-slate-100">
                      {/* Action */}
                      <td className="py-2 px-2 text-center bg-indigo-50/20">
                        {isApproved ? (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                            Approved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApprove(r.id)}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                          >
                            Approve
                          </button>
                        )}
                      </td>
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
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {r.uan_no ? (
                          r.uan_no
                        ) : (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                            title="Missing UAN number"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                            No UAN
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {r.esic_no ? (
                          r.esic_no
                        ) : (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                            title="Missing ESIC number"
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                            No ESIC
                          </span>
                        )}
                      </td>
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
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.basic_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.hra_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.cca_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.attendance_bonus_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.bonus_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.leave_encashment_rate}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900 bg-amber-50/20">{r.gross_salary_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.transport_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.pf_13_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.esic_3_25_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.uniform_shoes_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.services_7_rate}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900 bg-amber-50/20">{r.ctc_rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.per_day_ctc.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.site_allowance_paid_rate.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-amber-50/20">{r.site_allowance_billing_rate.toFixed(2)}</td>

                      {/* Earnings */}
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.basic_earning.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.hra_earning.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.cca_earning.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.incentive_earning.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.bonus_earning.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.leave_earning.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.transport_earning}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.site_allowance_earning}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-emerald-50/20">{r.arrear_pay}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-800 bg-emerald-100/50">{r.gross_earning.toFixed(2)}</td>

                      {/* Deductions */}
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.pf_12}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.esic_0_75}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.ptax}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.advance_ded}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.other_ded_val}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.canteen_ded}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.lwf_ded}</td>
                      <td className="py-2 px-3 text-right font-bold text-red-800 bg-red-100/50">{r.total_deduction}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-900 bg-emerald-200/50">{r.net_salary}</td>

                      {/* Billing Summary */}
                      <td className="py-2 px-3 text-right text-slate-700 bg-purple-50/20">{r.billing_pf_13}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-purple-50/20">{r.billing_esic_3_25}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-purple-50/20">{r.billing_lwf}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-purple-50/20">{r.billing_uniform}</td>
                      <td className="py-2 px-3 text-right text-slate-700 bg-purple-50/20">{r.billing_admin_rate}</td>
                      <td className="py-2 px-3 text-right font-bold text-purple-950 bg-purple-200/50">{Number(r.billing_ctc).toFixed(2)}</td>
                    </tr>
                    );
                  })}
                </tbody>

                {/* Footer Totals Row */}
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 divide-x divide-slate-300">
                  <tr>
                    <td className="py-3 px-2 text-center text-[10px] text-indigo-800 bg-indigo-50">
                      {approvedIds.size}/{wageSheetRows.length}
                    </td>
                    <td colSpan={19} className="py-3 px-4 text-right uppercase tracking-wider">
                      TOTAL ({wageSheetRows.length} Employees)
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
                    <td className="py-3 px-3 text-right text-slate-800 bg-purple-50/30">{totals.billing_pf_13}</td>
                    <td className="py-3 px-3 text-right text-slate-800 bg-purple-50/30">{totals.billing_esic_3_25}</td>
                    <td className="py-3 px-3 text-right text-slate-800 bg-purple-50/30">{totals.billing_lwf}</td>
                    <td className="py-3 px-3 text-right text-slate-800 bg-purple-50/30">{totals.billing_uniform}</td>
                    <td className="py-3 px-3 text-right text-slate-800 bg-purple-50/30">{totals.billing_admin_rate}</td>
                    <td className="py-3 px-3 text-right font-bold text-purple-950 bg-purple-200/50">
                      {totals.billing_ctc.toFixed(2)}
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
