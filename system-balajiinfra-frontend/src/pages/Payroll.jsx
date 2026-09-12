import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Base from "../components/Base";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (n) => Number(n || 0).toLocaleString("en-IN");

function monthLabel(dateStr) {
  try {
    const [y, m] = dateStr.split("-");
    return new Date(y, parseInt(m, 10) - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Payment Slip HTML Generator ─────────────────────────────────────────────
// ─── Payment Slip Document HTML Generator ─────────────────────────────────────
function generateSlipDocHTML(r, companyName, period) {
  const isPaid = r._isPaid;
  const fullName = [r.salutation, r.emp_name].filter(Boolean).join(" ");
  return `
    <div class="salary-slip-doc" style="background:#ffffff; color:#111111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 11px; padding: 20px; width: 760px; box-sizing: border-box; margin: 0 auto;">
      <style>
        .salary-slip-doc * { box-sizing: border-box; }
        .salary-slip-doc .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px; }
        .salary-slip-doc .header h1 { font-size: 17px; font-weight: 800; letter-spacing: 0.5px; color: #1e3a8a; margin: 0 0 4px 0; }
        .salary-slip-doc .header p { font-size: 10px; color: #555; margin: 0; }
        .salary-slip-doc .slip-title { text-align: center; font-size: 12px; font-weight: 700; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #1e3a8a; padding: 5px; color: #1e3a8a; background: #f8fafc; }
        .salary-slip-doc .info-grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 14px; }
        .salary-slip-doc .info-col { width: 48%; }
        .salary-slip-doc .info-row { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 3px 0; }
        .salary-slip-doc .info-row .label { font-weight: 600; color: #555; }
        .salary-slip-doc .info-row .value { font-weight: 600; color: #111; text-align: right; }
        .salary-slip-doc .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; background: #1e3a8a; color: #fff; padding: 4px 8px; margin-bottom: 4px; }
        .salary-slip-doc .table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .salary-slip-doc .table th { background: #f1f5f9; text-align: left; padding: 4px 8px; font-size: 10px; border: 1px solid #d1d5db; color: #1e293b; }
        .salary-slip-doc .table td { padding: 4px 8px; font-size: 10px; border: 1px solid #e5e7eb; }
        .salary-slip-doc .table td.right { text-align: right; font-weight: 600; }
        .salary-slip-doc .totals { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 14px; }
        .salary-slip-doc .total-box { flex: 1; border: 1px solid #d1d5db; padding: 8px 10px; text-align: center; background: #fafafa; }
        .salary-slip-doc .total-box .tl { font-size: 9px; text-transform: uppercase; color: #666; font-weight: 600; }
        .salary-slip-doc .total-box .tv { font-size: 13px; font-weight: 700; color: #111; margin-top: 2px; }
        .salary-slip-doc .net-box { background: #1e3a8a !important; color: #fff; border-color: #1e3a8a; }
        .salary-slip-doc .net-box .tl { color: #e0e7ff !important; }
        .salary-slip-doc .net-box .tv { color: #fff !important; font-size: 15px; }
        .salary-slip-doc .footer { border-top: 1px solid #d1d5db; margin-top: 14px; padding-top: 10px; display: flex; justify-content: space-between; gap: 10px; font-size: 9px; color: #555; }
        .salary-slip-doc .bank-box { flex: 1; border: 1px solid #d1d5db; padding: 6px 10px; line-height: 1.5; }
        .salary-slip-doc .bank-box .bl { font-size: 9px; text-transform: uppercase; color: #777; margin-bottom: 3px; font-weight: 700; }
        .salary-slip-doc .stamp { width: 220px; text-align: right; }
        .salary-slip-doc .status-paid { display:inline-block; padding:2px 8px; background:#dcfce7; color:#166534; border:1px solid #86efac; font-weight:700; font-size:10px; border-radius:3px; }
        .salary-slip-doc .status-approved { display:inline-block; padding:2px 8px; background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-weight:700; font-size:10px; border-radius:3px; }
      </style>

      <div class="header">
        <h1>${companyName.toUpperCase()}</h1>
        <p>Statutory Payroll System — Employee Salary Slip</p>
      </div>
      <div class="slip-title">Salary Slip — ${period}</div>

      <div class="info-grid">
        <div class="info-col">
          <div class="info-row"><span class="label">Employee Code</span><span class="value">${r.emp_code || '—'}</span></div>
          <div class="info-row"><span class="label">Employee Name</span><span class="value">${fullName || '—'}</span></div>
          <div class="info-row"><span class="label">Father / Husband Name</span><span class="value">${r.father_name || '—'}</span></div>
          <div class="info-row"><span class="label">Department</span><span class="value">${r.department || '—'}</span></div>
          <div class="info-row"><span class="label">Designation</span><span class="value">${r.designation || '—'}</span></div>
          <div class="info-row"><span class="label">Category</span><span class="value">${r.category || '—'}</span></div>
          <div class="info-row"><span class="label">Date of Joining (DOJ)</span><span class="value">${r.doj || '—'}</span></div>
        </div>
        <div class="info-col">
          <div class="info-row"><span class="label">Paid Days / Cal. Days</span><span class="value">${r.total_paid_days} / ${r.calc_days}</span></div>
          <div class="info-row"><span class="label">UAN Number</span><span class="value">${r.uan_no || '—'}</span></div>
          <div class="info-row"><span class="label">ESIC Number</span><span class="value">${r.esic_no || '—'}</span></div>
          <div class="info-row"><span class="label">PAN Number</span><span class="value">${r.pan_number || '—'}</span></div>
          <div class="info-row"><span class="label">Aadhar Number</span><span class="value">${r.adhar_no || '—'}</span></div>
          <div class="info-row"><span class="label">Mobile Number</span><span class="value">${r.mobile_no || '—'}</span></div>
          <div class="info-row"><span class="label">Payment Status</span><span class="value">${isPaid ? '<span class="status-paid">NEFT PAID</span>' : '<span class="status-approved">Approved</span>'}</span></div>
        </div>
      </div>

      <div class="section-title">Earnings (Calculated from Employee Wage Structure)</div>
      <table class="table">
        <thead>
          <tr>
            <th>Component</th>
            <th class="right" style="text-align:right">Monthly Rate (Rs.)</th>
            <th class="right" style="text-align:right">Earned Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Basic Salary</td><td class="right">${fmt(r.basic_rate)}</td><td class="right">${fmt(r.basic_earning)}</td></tr>
          <tr><td>House Rent Allowance (HRA)</td><td class="right">${fmt(r.hra_rate)}</td><td class="right">${fmt(r.hra_earning)}</td></tr>
          <tr><td>Transport Allowance</td><td class="right">${fmt(r.transport_rate)}</td><td class="right">${fmt(r.transport_earning)}</td></tr>
          ${r.cca_earning > 0 ? `<tr><td>CCA / Site Allowance</td><td class="right">${fmt(r.cca_rate)}</td><td class="right">${fmt(r.cca_earning)}</td></tr>` : ''}
          ${r.incentive_earning > 0 ? `<tr><td>Attendance Bonus / Incentive</td><td class="right">${fmt(r.attendance_bonus_rate)}</td><td class="right">${fmt(r.incentive_earning)}</td></tr>` : ''}
          <tr><td>Bonus (8.33%)</td><td class="right">${fmt(r.bonus_rate)}</td><td class="right">${fmt(r.bonus_earning)}</td></tr>
          <tr><td>Leave Encashment</td><td class="right">${fmt(r.leave_enc_rate)}</td><td class="right">${fmt(r.leave_earning)}</td></tr>
          ${r.site_allowance_earning > 0 ? `<tr><td>Site OT Allowance</td><td class="right">—</td><td class="right">${fmt(r.site_allowance_earning)}</td></tr>` : ''}
          <tr style="font-weight:700;background:#f8fafc">
            <td>Gross Earnings</td>
            <td class="right">${fmt(r.gross_salary_rate)}</td>
            <td class="right">${fmt(r.gross_earning)}</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Deductions</div>
      <table class="table">
        <thead>
          <tr>
            <th>Component</th>
            <th class="right" style="text-align:right">Amount (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Provident Fund (PF 12%)</td><td class="right">${fmt(r.pf_12)}</td></tr>
          <tr><td>ESIC (0.75%)</td><td class="right">${fmt(r.esic_0_75)}</td></tr>
          <tr><td>Professional Tax (P.Tax)</td><td class="right">${fmt(r.ptax)}</td></tr>
          <tr><td>Canteen Deduction</td><td class="right">${fmt(r.canteen_ded)}</td></tr>
          <tr><td>Labour Welfare Fund (LWF)</td><td class="right">${fmt(r.lwf_ded)}</td></tr>
          <tr style="font-weight:700;background:#fef2f2">
            <td>Total Deductions</td>
            <td class="right">${fmt(r.total_deduction)}</td>
          </tr>
        </tbody>
      </table>

      <div class="totals">
        <div class="total-box"><div class="tl">Gross Earning</div><div class="tv">Rs. ${fmt(r.gross_earning)}</div></div>
        <div class="total-box"><div class="tl">Total Deduction</div><div class="tv">Rs. ${fmt(r.total_deduction)}</div></div>
        <div class="total-box net-box"><div class="tl">Net Salary Payable</div><div class="tv">Rs. ${fmt(r.net_salary)}</div></div>
      </div>

      <div class="footer">
        <div class="bank-box">
          <div class="bl">Bank Payment Details (NEFT)</div>
          <div>Bank: <strong>${r.bank_name || '—'}</strong></div>
          <div>A/C Holder: <strong>${r.bank_holder_name || r.emp_name || '—'}</strong></div>
          <div>Account No: <strong>${r.account_no || '—'}</strong></div>
          <div>IFSC Code: <strong>${r.ifsc_code || '—'}</strong></div>
        </div>
        <div class="stamp">
          <div style="margin-top:30px;border-top:1px solid #ccc;padding-top:4px;">Authorized Signature</div>
          <div style="margin-top:4px;color:#aaa;font-size:8px;">This is a computer generated salary slip</div>
        </div>
      </div>
    </div>
  `;
}

// ─── Payment Slip Full HTML (For browser window print) ─────────────────────────
function generateSlipHTML(r, companyName, period) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Salary Slip - ${r.emp_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; margin: 0; padding: 10px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${generateSlipDocHTML(r, companyName, period)}
</body>
</html>`;
}

// ─── Payment Slip PDF Generator (html2canvas + jsPDF) ────────────────────────
async function generateSlipPDFBlob(r, companyName, period) {
  const cleanEmpName = (r.emp_name || "Employee").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanPeriod = (period || "Salary_Slip").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Salary_Slip_${cleanEmpName}_${cleanPeriod}.pdf`;

  // Create temporary off-screen but rendered container in the DOM
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "760px";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "999999";
  container.style.pointerEvents = "none";
  container.innerHTML = generateSlipDocHTML(r, companyName, period);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // High resolution crisp text
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: 800,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 8; // 8mm margin
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, Math.min(contentHeight, pageHeight - margin * 2));
    const pdfBlob = pdf.output("blob");
    const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
    return { blob: pdfBlob, file: pdfFile, filename };
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}

// ─── Payroll computation ─────────────────────────────────────────────────────
// Fetches and joins data from the Employee Form section (Employee_detail) and Attendance
function computePayrollRows(attendanceRecords, dbEmployees) {
  if (!attendanceRecords || attendanceRecords.length === 0) return [];

  // Lookup helper for employee from the Employee Form section
  const findEmp = (empCode, empName) => {
    const cCode = (empCode || "").trim().toLowerCase();
    const cName = (empName || "").trim().toLowerCase();
    if (!cCode && !cName) return null;

    return dbEmployees.find((e) => {
      const dbCode = (e.balaji_emp_code || "").trim().toLowerCase();
      const dbName = (e.name || "").trim().toLowerCase();
      return (
        (cCode && dbCode === cCode) ||
        (cName && dbName === cName) ||
        (cName && dbName && (dbName.includes(cName) || cName.includes(dbName)))
      );
    });
  };

  return attendanceRecords.map((att, idx) => {
    const matchedEmp = findEmp(att.emp_code, att.emp_name);
    const keyId = att.id || `att_${idx + 1}`;
    const isSaved = !!matchedEmp;

    // ── Rates & Structure from the Employees Form Section ─────────────────
    const calc_days = parseFloat(matchedEmp?.calculation_days) || 27;
    const work_days = parseFloat(att.mandays) || 0;
    const c_off = parseFloat(att.c_off) || 0;
    const total_paid_days = parseFloat(att.payable_mandays) ?? (work_days + c_off);
    const ot_hrs = parseFloat(att.payable_ot) ?? (parseFloat(att.ot) || 0);
    const canteen = Math.round((work_days + c_off) * 15);

    const basic_rate = isSaved && parseFloat(matchedEmp.basic) > 0 ? parseFloat(matchedEmp.basic) : 15525;
    const hra_rate = isSaved && parseFloat(matchedEmp.hra) > 0 ? parseFloat(matchedEmp.hra) : basic_rate * 0.05;
    const cca_rate = isSaved ? parseFloat(matchedEmp.cca_site_allowance) || 0 : 0;
    const attendance_bonus_rate = isSaved ? parseFloat(matchedEmp.attendance_bonus) || 0 : 0;
    const bonus_rate = isSaved && parseFloat(matchedEmp.bonus) > 0 ? parseFloat(matchedEmp.bonus) : basic_rate * 0.0833;
    const leave_enc_rate = isSaved && parseFloat(matchedEmp.leave_encashment) > 0
      ? Math.round(parseFloat(matchedEmp.leave_encashment))
      : Math.round(basic_rate * 0.05);

    const gross_salary_rate = isSaved && parseFloat(matchedEmp.gross_salary) > 0
      ? Math.round(parseFloat(matchedEmp.gross_salary))
      : Math.round(basic_rate + hra_rate + cca_rate + attendance_bonus_rate + bonus_rate + leave_enc_rate);

    const transport_rate = isSaved && parseFloat(matchedEmp.transport) > 0
      ? Math.round(parseFloat(matchedEmp.transport))
      : 1500;

    const pf_13_rate = isSaved && parseFloat(matchedEmp.pf_13) > 0
      ? Math.round(parseFloat(matchedEmp.pf_13))
      : (basic_rate > 15000 ? 1950 : Math.round(basic_rate * 0.13));

    const esic_3_25_rate = isSaved && parseFloat(matchedEmp.esic_3_25) > 0
      ? Math.round(parseFloat(matchedEmp.esic_3_25))
      : Math.round(gross_salary_rate * 0.0325);

    const uniform_shoes_rate = isSaved && parseFloat(matchedEmp.uniform_shoes) > 0
      ? Math.round(parseFloat(matchedEmp.uniform_shoes))
      : 300;

    const services_7_rate = isSaved && parseFloat(matchedEmp.services_7) > 0
      ? Math.round(parseFloat(matchedEmp.services_7))
      : Math.round((gross_salary_rate + pf_13_rate + esic_3_25_rate + uniform_shoes_rate) * 0.07);

    const ctc_rate = isSaved && parseFloat(matchedEmp.ctc) > 0
      ? Math.round(parseFloat(matchedEmp.ctc))
      : Math.round(gross_salary_rate + transport_rate + pf_13_rate + esic_3_25_rate + uniform_shoes_rate + services_7_rate);

    const per_day_ctc = calc_days > 0 ? ctc_rate / calc_days : 0;
    const site_allowance_paid_rate = isSaved && parseFloat(matchedEmp.site_allowance_paid_rate) > 0
      ? parseFloat(matchedEmp.site_allowance_paid_rate)
      : (calc_days > 0 ? (basic_rate + hra_rate + cca_rate) / calc_days / 8 : 0);

    // ── Monthly Earnings (calculated dynamically based on total_paid_days) ─
    let basic_earning = 0;
    let hra_earning = 0;
    let cca_earning = 0;
    let incentive_earning = 0;
    let bonus_earning = 0;
    let leave_earning = 0;
    let transport_earning = 0;
    let site_allowance_earning = 0;
    let gross_earning = 0;

    if (calc_days > 0) {
      basic_earning = (basic_rate / calc_days) * total_paid_days;
      hra_earning = (hra_rate / calc_days) * total_paid_days;
      cca_earning = (cca_rate / calc_days) * total_paid_days;
      incentive_earning = (attendance_bonus_rate / calc_days) * total_paid_days;
      bonus_earning = (bonus_rate / calc_days) * total_paid_days;
      leave_earning = (leave_enc_rate / calc_days) * total_paid_days;
      transport_earning = Math.round((transport_rate / calc_days) * total_paid_days);
      site_allowance_earning = Math.round(site_allowance_paid_rate * ot_hrs);
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

    // ── Deductions ────────────────────────────────────────────────────────
    let pf_12 = 0;
    let esic_0_75 = 0;
    let ptax = 0;
    let canteen_ded = 0;
    let lwf_ded = 0;
    let total_deduction = 0;
    let net_salary = 0;

    if (gross_earning > 0 && calc_days > 0) {
      const rawPf =
        gross_salary_rate <= 15000
          ? Math.round(ctc_rate * 0.12)
          : Math.round((15000 * 0.12 * total_paid_days) / calc_days);
      pf_12 = Math.min(rawPf, 1800);
      const esicBase = Math.max(0, gross_earning - transport_earning - bonus_earning - leave_earning);
      esic_0_75 = Math.ceil(esicBase * 0.0075);
      ptax = gross_earning >= 10000 ? 200 : gross_earning >= 7500 ? 175 : 0;
      canteen_ded = canteen;
      lwf_ded = 25;
      total_deduction = pf_12 + esic_0_75 + ptax + canteen_ded + lwf_ded;
      net_salary = Math.round(gross_earning - total_deduction);
    }

    return {
      id: keyId,
      sr_no: idx + 1,
      // Identification & Personal
      emp_code: matchedEmp?.balaji_emp_code || att.emp_code || "",
      emp_name: matchedEmp?.name || att.emp_name || "",
      salutation: matchedEmp?.salutation || "",
      father_name: matchedEmp?.father_or_husband_name || "",
      sex: matchedEmp?.sex || "",
      dob: matchedEmp?.dob || "",
      doj: matchedEmp?.doj || "",
      adhar_no: matchedEmp?.adhar_no || "",
      pan_number: matchedEmp?.pan_number ? String(matchedEmp.pan_number).trim().toUpperCase() : "",
      department: matchedEmp?.department || "",
      designation: matchedEmp?.designation || "",
      category: matchedEmp?.category || "",
      // Bank & Statutory
      bank_name: matchedEmp?.bank_name || "",
      account_no: matchedEmp?.account_no || "",
      ifsc_code: matchedEmp?.ifsc_code || "",
      bank_holder_name: matchedEmp?.bank_holder_name || matchedEmp?.name || "",
      uan_no: matchedEmp?.uan_no || "",
      esic_no: matchedEmp?.esic_no || "",
      mobile_no: matchedEmp?.mobile_no || "",
      email: matchedEmp?.email || "",
      nominee_name: matchedEmp?.nominee_name || "",
      // Attendance & Days
      calc_days,
      work_days,
      total_paid_days,
      ot_hrs,
      // Base Salary Rates from Employee Form Section
      basic_rate,
      hra_rate,
      cca_rate,
      attendance_bonus_rate,
      bonus_rate,
      leave_enc_rate,
      gross_salary_rate,
      transport_rate,
      pf_13_rate,
      esic_3_25_rate,
      uniform_shoes_rate,
      services_7_rate,
      ctc_rate,
      per_day_ctc,
      site_allowance_paid_rate,
      // Calculated Month Earnings
      basic_earning,
      hra_earning,
      cca_earning,
      incentive_earning,
      bonus_earning,
      leave_earning,
      transport_earning,
      site_allowance_earning,
      gross_earning,
      // Deductions
      pf_12,
      esic_0_75,
      ptax,
      canteen_ded,
      lwf_ded,
      total_deduction,
      net_salary,
      isSaved,
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const navigate = useNavigate();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const token = useMemo(
    () =>
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      "",
    []
  );

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCompanyObj, setSelectedCompanyObj] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [dbEmployees, setDbEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Approval & Paid keys ──────────────────────────────────────────────────
  const approvalKey = useMemo(() => {
    if (!selectedCompanyId || !selectedDate) return null;
    const ym = selectedDate.substring(0, 7).replace("-", "_");
    return `payroll_approved_${selectedCompanyId}_${ym}`;
  }, [selectedCompanyId, selectedDate]);

  const paidKey = useMemo(() => {
    if (!selectedCompanyId || !selectedDate) return null;
    const ym = selectedDate.substring(0, 7).replace("-", "_");
    return `payroll_paid_${selectedCompanyId}_${ym}`;
  }, [selectedCompanyId, selectedDate]);

  const [approvedIds, setApprovedIds] = useState(new Set());
  const [paidIds, setPaidIds] = useState(new Set());
  const [viewSlip, setViewSlip] = useState(null);

  useEffect(() => {
    try {
      const s1 = JSON.parse(localStorage.getItem(approvalKey) || "[]");
      setApprovedIds(new Set(s1));
    } catch {
      setApprovedIds(new Set());
    }
    try {
      const s2 = JSON.parse(localStorage.getItem(paidKey) || "[]");
      setPaidIds(new Set(s2));
    } catch {
      setPaidIds(new Set());
    }
  }, [approvalKey, paidKey]);

  const persistApproved = useCallback(
    (newSet) => {
      if (!approvalKey) return;
      localStorage.setItem(approvalKey, JSON.stringify([...newSet]));
      setApprovedIds(new Set(newSet));
    },
    [approvalKey]
  );

  const persistPaid = useCallback(
    (newSet) => {
      if (!paidKey) return;
      localStorage.setItem(paidKey, JSON.stringify([...newSet]));
      setPaidIds(new Set(newSet));
    },
    [paidKey]
  );

  // ── Fetch companies ───────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/lead/companies/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const d = await res.json();
          const items = Array.isArray(d.results) ? d.results : Array.isArray(d) ? d : [];
          setCompanies(items);
          if (items.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(items[0].id);
            setSelectedCompanyObj(items[0]);
          }
        }
      } catch (e) {
        console.error("Failed to load companies", e);
      }
    };
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BASE_API, token]);

  useEffect(() => {
    if (selectedCompanyId && companies.length > 0) {
      setSelectedCompanyObj(
        companies.find((c) => String(c.id) === String(selectedCompanyId)) || null
      );
    }
  }, [selectedCompanyId, companies]);

  // ── Fetch Attendance & Employees form section data ────────────────────────
  const fetchData = useCallback(async () => {
    if (!selectedCompanyId || !selectedDate) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fd =
        selectedCompanyObj?.salary_type === "daily"
          ? selectedDate
          : selectedDate.substring(0, 7);
      const h = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Fetch attendance records for this company & month, AND employee details from Employee Form Section
      const [r1, r2] = await Promise.all([
        fetch(
          `${BASE_API.replace(/\/$/, "")}/lead/attendance-records/?company=${selectedCompanyId}&attendance_date=${fd}`,
          { headers: h }
        ),
        fetch(`${BASE_API.replace(/\/$/, "")}/lead/employee-details/?page_size=1000`, {
          headers: h,
        }),
      ]);

      if (r1.ok) {
        const d = await r1.json();
        setAttendanceRecords(Array.isArray(d.results) ? d.results : Array.isArray(d) ? d : []);
      } else {
        setAttendanceRecords([]);
      }

      if (r2.ok) {
        const d = await r2.json();
        const emps = Array.isArray(d.results) ? d.results : Array.isArray(d) ? d : [];
        setDbEmployees(emps);
      } else {
        setDbEmployees([]);
      }
    } catch (e) {
      console.error("Error fetching payroll data", e);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedDate, selectedCompanyObj, BASE_API, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Compute Rows ──────────────────────────────────────────────────────────
  const allRows = useMemo(
    () => computePayrollRows(attendanceRecords, dbEmployees),
    [attendanceRecords, dbEmployees]
  );

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return allRows;
    const t = searchTerm.toLowerCase();
    return allRows.filter(
      (r) =>
        r.emp_code.toLowerCase().includes(t) ||
        r.emp_name.toLowerCase().includes(t) ||
        r.department.toLowerCase().includes(t) ||
        r.designation.toLowerCase().includes(t) ||
        r.pan_number.toLowerCase().includes(t) ||
        r.mobile_no.includes(t) ||
        r.uan_no.includes(t)
    );
  }, [allRows, searchTerm]);

  const approvedRows = useMemo(
    () => allRows.filter((r) => approvedIds.has(r.id)),
    [allRows, approvedIds]
  );

  const totals = useMemo(
    () =>
      approvedRows.reduce(
        (acc, r) => {
          acc.gross += r.gross_earning;
          acc.ded += r.total_deduction;
          acc.net += r.net_salary;
          return acc;
        },
        { gross: 0, ded: 0, net: 0 }
      ),
    [approvedRows]
  );

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = useCallback(
    (id) => {
      const s = new Set(approvedIds);
      s.add(id);
      persistApproved(s);
    },
    [approvedIds, persistApproved]
  );

  const handleApproveAll = useCallback(() => {
    if (!allRows.length) return;
    Swal.fire({
      title: "Approve All Employees?",
      text: `Approve all ${allRows.length} employees for payroll?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve All",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1e40af",
    }).then((res) => {
      if (!res.isConfirmed) return;
      persistApproved(new Set(allRows.map((r) => r.id)));
      Swal.fire({
        title: "All Approved",
        text: `${allRows.length} employees approved for payroll.`,
        icon: "success",
        confirmButtonColor: "#1e40af",
      });
    });
  }, [allRows, persistApproved]);

  // ── Pay through Bank (NEFT) ──────────────────────────────────────────────
  const handlePayBank = useCallback(
    (id) => {
      Swal.fire({
        title: "Pay through Bank (NEFT)?",
        text: "Confirm NEFT transfer for this employee. This will mark the salary as NEFT Paid.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Confirm NEFT Payment",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#1e40af",
      }).then((res) => {
        if (!res.isConfirmed) return;
        const s = new Set(paidIds);
        s.add(id);
        persistPaid(s);
        Swal.fire({
          title: "NEFT Payment Confirmed",
          text: "Salary marked as NEFT Paid.",
          icon: "success",
          timer: 1800,
          showConfirmButton: false,
        });
      });
    },
    [paidIds, persistPaid]
  );

  // ── Download payment slip ─────────────────────────────────────────────────
  const handleDownloadSlip = useCallback(
    async (r) => {
      const companyName = selectedCompanyObj?.name || "Company";
      const period = monthLabel(selectedDate);
      try {
        Swal.fire({
          title: "Generating PDF...",
          text: "Preparing your payment slip document",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });
        const { blob, filename } = await generateSlipPDFBlob(
          { ...r, _isPaid: paidIds.has(r.id) },
          companyName,
          period
        );
        const fileUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = fileUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(fileUrl), 5000);
        Swal.close();
      } catch (err) {
        console.error("PDF generation failed, falling back to print window:", err);
        const html = generateSlipHTML({ ...r, _isPaid: paidIds.has(r.id) }, companyName, period);
        const win = window.open("", "_blank");
        if (!win) {
          Swal.fire({
            icon: "warning",
            title: "Popup Blocked",
            text: "Please allow popups to download the payment slip.",
            confirmButtonColor: "#1e40af",
          });
          return;
        }
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => {
          win.print();
        }, 500);
      }
    },
    [selectedCompanyObj, selectedDate, paidIds]
  );

  // ── View payment slip in modal ────────────────────────────────────────────
  const handleViewSlip = useCallback((r) => {
    setViewSlip(r);
  }, []);

  // ── Send payment slip on WhatsApp ─────────────────────────────────────────
  const handleWhatsApp = useCallback(
    async (r) => {
      const companyName = selectedCompanyObj?.name || "Company";
      const period = monthLabel(selectedDate);
      const defaultMobile = (r.mobile_no || "").replace(/\D/g, "");

      // Step 1: Prompt user for destination WhatsApp number
      const result = await Swal.fire({
        title: "Send Payment Slip on WhatsApp",
        html: `
          <div style="text-align: left; font-size: 13px; color: #374151;">
            <p style="margin-bottom: 6px;">Employee: <strong>${r.emp_name}</strong> (${r.emp_code || "—"})</p>
            <p style="margin-bottom: 12px; color: #6b7280; font-size: 12px;">
              Period: <strong>${period}</strong> &bull; Net Salary: <strong>Rs. ${fmt(r.net_salary)}</strong>
            </p>
            <label style="display:block; font-weight:600; margin-bottom:6px; font-size:12px; color:#111827;">
              Recipient WhatsApp Number:
            </label>
            <div style="display:flex; align-items:center; border:1px solid #d1d5db; border-radius:8px; overflow:hidden; background:#fff;">
              <span style="background:#f3f4f6; padding:8px 12px; font-size:13px; color:#4b5563; font-weight:600; border-right:1px solid #d1d5db;">+91</span>
              <input 
                id="swal-wa-mobile" 
                type="tel"
                class="swal2-input" 
                style="margin:0; border:none; box-shadow:none; width:100%; font-size:14px; padding:8px 12px;" 
                placeholder="Enter 10-digit mobile number" 
                value="${defaultMobile}" 
              />
            </div>
            <p style="margin-top: 10px; font-size: 11px; color: #047857; background: #ecfdf5; padding: 8px 10px; border-radius: 6px; border: 1px solid #a7f3d0;">
              📄 An official PDF of this payment slip will be generated and sent to this WhatsApp contact.
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Generate & Send PDF",
        confirmButtonColor: "#059669",
        cancelButtonText: "Cancel",
        focusConfirm: false,
        didOpen: () => {
          const input = document.getElementById("swal-wa-mobile");
          if (input) {
            input.focus();
            if (defaultMobile) input.select();
          }
        },
        preConfirm: () => {
          const input = document.getElementById("swal-wa-mobile");
          const val = (input ? input.value : "").replace(/\D/g, "");
          if (!val || val.length < 10) {
            Swal.showValidationMessage("Please enter a valid 10-digit mobile number");
            return false;
          }
          return val;
        },
      });

      if (!result.isConfirmed || !result.value) return;

      const targetMobile = result.value;
      const intlMobile = targetMobile.startsWith("91") ? targetMobile : `91${targetMobile}`;

      // Step 2: Show loading while generating PDF
      Swal.fire({
        title: "Generating Salary Slip PDF...",
        text: "Rendering high-resolution payment slip document",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      try {
        const { blob, file, filename } = await generateSlipPDFBlob(
          { ...r, _isPaid: paidIds.has(r.id), mobile_no: targetMobile },
          companyName,
          period
        );

        const msg = [
          `*SALARY SLIP — ${period.toUpperCase()}*`,
          `*${companyName}*`,
          ``,
          `Dear *${r.emp_name}*,`,
          `Your salary slip for *${period}* is generated.`,
          ``,
          `*Employee Code:* ${r.emp_code || "—"}`,
          `*Department:* ${r.department || "—"}`,
          `*Designation:* ${r.designation || "—"}`,
          `*Paid Days:* ${r.total_paid_days} / ${r.calc_days}`,
          ``,
          `*Gross Earning:* Rs. ${fmt(r.gross_earning)}`,
          `*Total Deductions:* Rs. ${fmt(r.total_deduction)}`,
          `*Net Salary Payable:* *Rs. ${fmt(r.net_salary)}*`,
          ``,
          `*Bank Name:* ${r.bank_name || "—"}`,
          `*Account No:* ${r.account_no || "—"}`,
          `*IFSC Code:* ${r.ifsc_code || "—"}`,
          `*Payment Status:* ${paidIds.has(r.id) ? "NEFT PAID" : "Approved — Payment Pending"}`,
          ``,
          `📄 *Attached File:* ${filename}`,
        ].join("\n");

        const waUrl = `https://wa.me/${intlMobile}?text=${encodeURIComponent(msg)}`;

        // Check if Web Share API with file sharing is supported
        let sharedDirectly = false;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Salary Slip - ${r.emp_name}`,
              text: msg,
            });
            sharedDirectly = true;
            Swal.fire({
              icon: "success",
              title: "Payment Slip Shared!",
              text: `PDF slip has been shared via WhatsApp.`,
              timer: 2000,
              showConfirmButton: false,
            });
            return;
          } catch (shareErr) {
            if (shareErr.name !== "AbortError") {
              console.warn("Native share failed, falling back:", shareErr);
            } else {
              Swal.close();
              return;
            }
          }
        }

        // Fallback for Desktop & Browsers without direct Web Share
        if (!sharedDirectly) {
          // 1. Download PDF to user's computer
          const fileUrl = URL.createObjectURL(blob);
          const downloadAnchor = document.createElement("a");
          downloadAnchor.href = fileUrl;
          downloadAnchor.download = filename;
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          document.body.removeChild(downloadAnchor);
          setTimeout(() => URL.revokeObjectURL(fileUrl), 5000);

          // 2. Open WhatsApp Web to target recipient
          window.open(waUrl, "_blank");

          // 3. User guidance popup
          Swal.fire({
            icon: "success",
            title: "PDF Downloaded & WhatsApp Opened!",
            html: `
              <div style="font-size:13px; text-align:left; color:#374151;">
                <p style="margin-bottom:8px;">✅ <strong>${filename}</strong> has been saved to your downloads.</p>
                <p style="margin-bottom:12px;">📱 WhatsApp chat with <strong>+${intlMobile}</strong> is open in a new tab with pre-filled salary details.</p>
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:10px; border-radius:8px; color:#166534; font-size:12px;">
                  <strong>Quick Step:</strong> In the WhatsApp chat, click <strong>📎 (Attach) &rarr; Document</strong> or drag &amp; drop the downloaded PDF file, then click Send!
                </div>
              </div>
            `,
            confirmButtonText: "Done",
            confirmButtonColor: "#059669",
          });
        }
      } catch (err) {
        console.error("WhatsApp PDF generation failed:", err);
        Swal.fire({
          icon: "error",
          title: "PDF Generation Failed",
          text: err.message || "Failed to generate payment slip PDF.",
          confirmButtonColor: "#1e40af",
        });
      }
    },
    [selectedCompanyObj, selectedDate, paidIds]
  );

  // ── Excel Export ──────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!approvedRows.length) {
      Swal.fire({
        icon: "warning",
        title: "No Approved Employees",
        text: "Approve at least one employee before exporting.",
        confirmButtonColor: "#1e40af",
      });
      return;
    }
    const companyName = selectedCompanyObj?.name || "Company";
    const period = monthLabel(selectedDate);
    const header = [
      "S.No.",
      "Emp Code",
      "Employee Name",
      "Father / Husband Name",
      "Department",
      "Designation",
      "Category",
      "Date of Joining",
      "Paid Days",
      "Calculation Days",
      "Basic Rate",
      "Basic Earning",
      "HRA Earning",
      "Transport Earning",
      "Bonus Earning",
      "Leave Encashment",
      "Gross Earning",
      "PF 12%",
      "ESIC 0.75%",
      "P.Tax",
      "Canteen",
      "LWF",
      "Total Deduction",
      "Net Salary",
      "Bank Name",
      "Account Holder Name",
      "Account No",
      "IFSC Code",
      "Mobile No",
      "UAN No",
      "PAN No",
      "ESIC No",
      "Aadhar No",
      "Payment Status",
    ];
    const rows = approvedRows.map((r, i) => [
      i + 1,
      r.emp_code,
      r.emp_name,
      r.father_name,
      r.department,
      r.designation,
      r.category,
      r.doj,
      r.total_paid_days,
      r.calc_days,
      Number(r.basic_rate).toFixed(2),
      Number(r.basic_earning).toFixed(2),
      Number(r.hra_earning).toFixed(2),
      Number(r.transport_earning).toFixed(2),
      Number(r.bonus_earning).toFixed(2),
      Number(r.leave_earning).toFixed(2),
      Number(r.gross_earning).toFixed(2),
      r.pf_12,
      r.esic_0_75,
      r.ptax,
      r.canteen_ded,
      r.lwf_ded,
      r.total_deduction,
      r.net_salary,
      r.bank_name,
      r.bank_holder_name,
      r.account_no,
      r.ifsc_code,
      r.mobile_no,
      r.uan_no,
      r.pan_number,
      r.esic_no,
      r.adhar_no,
      paidIds.has(r.id) ? "NEFT Paid" : "Approved",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([
      [`PAYROLL REGISTER — ${companyName.toUpperCase()}`],
      [`PERIOD: ${period.toUpperCase()}`],
      [],
      header,
      ...rows,
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(
      wb,
      `${period} ${companyName.replace(/[\\/:*?"<>|]/g, "_")} Payroll.xlsx`
    );
  }, [approvedRows, paidIds, selectedCompanyObj, selectedDate]);

  const isMonthly = selectedCompanyObj?.salary_type === "monthly";

  const stats = [
    {
      label: "Total Employees",
      value: fmtInt(allRows.length),
      sub: `${approvedIds.size} approved`,
    },
    {
      label: "Gross Earning",
      value: `Rs. ${fmt(totals.gross)}`,
      sub: "approved employees",
    },
    {
      label: "Total Deductions",
      value: `Rs. ${fmt(totals.ded)}`,
      sub: "PF + ESIC + PTax + LWF + Canteen",
    },
    {
      label: "Net Payable",
      value: `Rs. ${fmt(totals.net)}`,
      sub: "after statutory deductions",
    },
    {
      label: "NEFT Paid",
      value: fmtInt(paidIds.size),
      sub: `of ${approvedIds.size} approved`,
    },
  ];

  return (
    <Base title="Payroll">
      <div className="space-y-4">
        {/* Header bar */}
        <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Payroll — {selectedCompanyObj?.name || "Select Company"}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              {monthLabel(selectedDate)} &bull; {approvedIds.size} of {allRows.length} employees
              approved &bull; {paidIds.size} NEFT paid &bull; {dbEmployees.length} employees synced from Employee Form
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent text-slate-700 text-xs font-medium outline-none cursor-pointer max-w-[150px]"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              <input
                type={isMonthly ? "month" : "date"}
                value={isMonthly ? selectedDate.substring(0, 7) : selectedDate}
                onChange={(e) =>
                  setSelectedDate(isMonthly ? e.target.value + "-01" : e.target.value)
                }
                className="bg-transparent text-slate-700 text-xs font-medium outline-none cursor-pointer"
              />
            </div>

            <input
              type="text"
              placeholder="Search code / name / PAN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />

            <button
              onClick={() => navigate("/wage-sheet")}
              className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              Wage Sheet
            </button>

            <button
              onClick={handleApproveAll}
              disabled={allRows.length === 0}
              className="px-2.5 py-1 text-xs font-medium bg-indigo-700 hover:bg-indigo-800 text-white rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {approvedIds.size === allRows.length && allRows.length > 0
                ? `All Approved (${approvedIds.size})`
                : "Approve All"}
            </button>

            <button
              onClick={handleExport}
              disabled={approvedRows.length === 0}
              className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export Payroll
            </button>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs"
            >
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {s.label}
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1 leading-tight">{s.value}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Payroll table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-56">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : allRows.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                No attendance records found for{" "}
                <strong className="text-blue-700">{selectedCompanyObj?.name || "selected company"}</strong>{" "}
                for <strong>{monthLabel(selectedDate)}</strong>.
              </p>
              <p className="text-xs text-slate-500">
                Fill and save attendance in{" "}
                <button
                  onClick={() => navigate("/wage-sheet")}
                  className="underline text-blue-600 font-medium"
                >
                  Wage Sheet
                </button>{" "}
                for this month first.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[62vh] [scrollbar-width:thin]">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                  <tr className="border-b-2 border-slate-200 text-[10px] uppercase tracking-wider divide-x divide-slate-200">
                    <th className="py-2.5 px-3 min-w-[95px] bg-indigo-50 text-indigo-900">Status</th>
                    <th className="py-2.5 px-3 text-center min-w-[40px]">#</th>
                    <th className="py-2.5 px-3 min-w-[95px]">Emp Code</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Employee Name</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Department</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Designation</th>
                    <th className="py-2.5 px-3 min-w-[90px]">Category</th>
                    <th className="py-2.5 px-3 text-right min-w-[70px] bg-blue-50/60">Paid Days</th>
                    <th className="py-2.5 px-3 text-right min-w-[90px]">Basic Rate</th>
                    <th className="py-2.5 px-3 text-right min-w-[105px] bg-emerald-50 text-emerald-900">
                      Gross Earning
                    </th>
                    <th className="py-2.5 px-3 text-right min-w-[70px] bg-red-50/50">PF 12%</th>
                    <th className="py-2.5 px-3 text-right min-w-[75px] bg-red-50/50">ESIC 0.75%</th>
                    <th className="py-2.5 px-3 text-right min-w-[60px] bg-red-50/50">P.Tax</th>
                    <th className="py-2.5 px-3 text-right min-w-[65px] bg-red-50/50">Canteen</th>
                    <th className="py-2.5 px-3 text-right min-w-[55px] bg-red-50/50">LWF</th>
                    <th className="py-2.5 px-3 text-right min-w-[90px] bg-red-100/60 text-red-900">
                      Total Ded
                    </th>
                    <th className="py-2.5 px-3 text-right min-w-[105px] bg-emerald-200/70 text-emerald-950">
                      Net Salary
                    </th>
                    <th className="py-2.5 px-3 min-w-[130px]">Bank Name</th>
                    <th className="py-2.5 px-3 min-w-[125px]">Account No</th>
                    <th className="py-2.5 px-3 min-w-[95px]">IFSC Code</th>
                    <th className="py-2.5 px-3 min-w-[95px]">Mobile No</th>
                    <th className="py-2.5 px-3 min-w-[100px]">UAN No</th>
                    <th className="py-2.5 px-3 min-w-[90px]">PAN No</th>
                    <th className="py-2.5 px-3 text-center min-w-[210px] bg-slate-50">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.map((r) => {
                    const isApproved = approvedIds.has(r.id);
                    const isPaid = paidIds.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`divide-x divide-slate-100 transition-all ${
                          isApproved ? "hover:bg-slate-50" : "opacity-50"
                        }`}
                      >
                        <td className="py-2 px-3 bg-indigo-50/20">
                          {isPaid ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded border border-blue-200">
                              Paid
                            </span>
                          ) : isApproved ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                              Approved
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded border border-amber-200">
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-center text-slate-400">{r.sr_no}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-800">{r.emp_code}</td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">
                            {r.emp_name}
                            {!r.isSaved && (
                              <span className="ml-1 text-[9px] px-1 py-0.2 bg-amber-100 text-amber-700 rounded font-normal">
                                Unsaved
                              </span>
                            )}
                          </div>
                          {r.father_name && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              S/O: {r.father_name}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{r.department || "—"}</td>
                        <td className="py-2 px-3 text-slate-700">{r.designation || "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{r.category || "—"}</td>

                        <td className="py-2 px-3 text-right font-semibold text-blue-800 bg-blue-50/20">
                          {r.total_paid_days}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          {fmt(r.basic_rate)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-800 bg-emerald-50/30">
                          {fmt(r.gross_earning)}
                        </td>

                        <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.pf_12}</td>
                        <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.esic_0_75}</td>
                        <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.ptax}</td>
                        <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.canteen_ded}</td>
                        <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.lwf_ded}</td>

                        <td className="py-2 px-3 text-right font-bold text-red-800 bg-red-100/50">
                          {fmtInt(r.total_deduction)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-950 bg-emerald-200/60">
                          {fmtInt(r.net_salary)}
                        </td>

                        <td className="py-2 px-3 text-slate-700">{r.bank_name || "—"}</td>
                        <td className="py-2 px-3 text-slate-700 font-mono">{r.account_no || "—"}</td>
                        <td className="py-2 px-3 text-slate-700 font-mono">{r.ifsc_code || "—"}</td>
                        <td className="py-2 px-3 text-slate-700">{r.mobile_no || "—"}</td>
                        <td className="py-2 px-3 text-slate-700 font-mono">{r.uan_no || "—"}</td>
                        <td className="py-2 px-3 text-slate-700 font-mono uppercase">{r.pan_number ? r.pan_number.toUpperCase() : "—"}</td>

                        {/* Actions */}
                        <td className="py-2 px-2">
                          {isApproved ? (
                            <div className="flex flex-col gap-1">
                              {/* Pay through Bank NEFT */}
                              {!isPaid ? (
                                <button
                                  onClick={() => handlePayBank(r.id)}
                                  className="w-full px-2 py-0.5 text-[10px] font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors text-left"
                                >
                                  Pay through Bank (NEFT)
                                </button>
                              ) : (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded border border-blue-200 text-center">
                                  NEFT Paid
                                </span>
                              )}
                              {/* Download Slip */}
                              <button
                                onClick={() => handleDownloadSlip(r)}
                                className="w-full px-2 py-0.5 text-[10px] font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded transition-colors text-left"
                              >
                                Download Payment Slip
                              </button>
                              {/* View Slip */}
                              <button
                                onClick={() => handleViewSlip(r)}
                                className="w-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded transition-colors text-left"
                              >
                                View Payment Slip
                              </button>
                              {/* WhatsApp */}
                              <button
                                onClick={() => handleWhatsApp(r)}
                                className="w-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors text-left"
                              >
                                Send on WhatsApp
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleApprove(r.id)}
                              className="px-2.5 py-1 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 divide-x divide-slate-200 sticky bottom-0 z-10">
                  <tr>
                    <td
                      colSpan={9}
                      className="py-3 px-4 text-right text-xs uppercase tracking-wider text-slate-500"
                    >
                      Payroll Totals — {approvedRows.length} Approved
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/40">
                      {fmt(totals.gross)}
                    </td>
                    <td colSpan={5} />
                    <td className="py-3 px-3 text-right text-red-800 bg-red-100/50">
                      {fmtInt(totals.ded)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-950 bg-emerald-200/60">
                      {fmtInt(totals.net)}
                    </td>
                    <td colSpan={8} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Payment Slip Modal ──────────────────────────────────────────────── */}
      {viewSlip && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setViewSlip(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Payment Slip — {viewSlip.emp_name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {monthLabel(selectedDate)} &bull; {selectedCompanyObj?.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadSlip(viewSlip)}
                  className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-900 text-white rounded-md transition-colors"
                >
                  Download / Print
                </button>
                <button
                  onClick={() => handleWhatsApp(viewSlip)}
                  className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                >
                  Send WhatsApp
                </button>
                <button
                  onClick={() => setViewSlip(null)}
                  className="px-2.5 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Slip body */}
            <div className="p-5 space-y-4 text-xs text-slate-800">
              {/* Company + Period */}
              <div className="text-center border-b-2 border-blue-900 pb-3">
                <p className="text-base font-bold text-blue-900 uppercase tracking-wide">
                  {selectedCompanyObj?.name || "Company"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Statutory Payroll System — Employee Salary Slip
                </p>
              </div>
              <div className="text-center text-xs font-bold uppercase tracking-wider border border-blue-900 text-blue-900 py-1 bg-blue-50">
                Salary Slip — {monthLabel(selectedDate)}
              </div>

              {/* Employee info from Employee Form Section */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {[
                  ["Employee Code", viewSlip.emp_code || "—"],
                  ["Paid Days / Total Days", `${viewSlip.total_paid_days} / ${viewSlip.calc_days}`],
                  [
                    "Employee Name",
                    [viewSlip.salutation, viewSlip.emp_name].filter(Boolean).join(" ") || "—",
                  ],
                  ["UAN No.", viewSlip.uan_no || "—"],
                  ["Father / Husband", viewSlip.father_name || "—"],
                  ["ESIC No.", viewSlip.esic_no || "—"],
                  ["Department", viewSlip.department || "—"],
                  ["PAN No.", viewSlip.pan_number || "—"],
                  ["Designation", viewSlip.designation || "—"],
                  ["Aadhar No.", viewSlip.adhar_no || "—"],
                  ["Category", viewSlip.category || "—"],
                  ["Mobile", viewSlip.mobile_no || "—"],
                  ["Date of Joining", viewSlip.doj || "—"],
                  ["Status", paidIds.has(viewSlip.id) ? "NEFT PAID" : "Approved"],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    className="flex justify-between border-b border-dotted border-slate-200 py-0.5"
                  >
                    <span className="text-slate-500 font-medium">{l}</span>
                    <span className="font-semibold text-slate-900">{v}</span>
                  </div>
                ))}
              </div>

              {/* Earnings + Deductions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase bg-blue-900 text-white px-2 py-1 mb-2">
                    Earnings (Wage Structure)
                  </p>
                  {[
                    ["Basic Salary", `Rs. ${fmt(viewSlip.basic_earning)}`],
                    ["House Rent Allowance (HRA)", `Rs. ${fmt(viewSlip.hra_earning)}`],
                    ["Transport Allowance", `Rs. ${fmt(viewSlip.transport_earning)}`],
                    ...(viewSlip.cca_earning > 0
                      ? [["CCA / Site Allowance", `Rs. ${fmt(viewSlip.cca_earning)}`]]
                      : []),
                    ...(viewSlip.incentive_earning > 0
                      ? [["Attendance Bonus", `Rs. ${fmt(viewSlip.incentive_earning)}`]]
                      : []),
                    ["Bonus (8.33%)", `Rs. ${fmt(viewSlip.bonus_earning)}`],
                    ["Leave Encashment", `Rs. ${fmt(viewSlip.leave_earning)}`],
                    ...(viewSlip.site_allowance_earning > 0
                      ? [["Site OT Allowance", `Rs. ${fmt(viewSlip.site_allowance_earning)}`]]
                      : []),
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      className="flex justify-between py-0.5 border-b border-slate-100 text-slate-700"
                    >
                      <span>{l}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-bold text-emerald-800 border-t border-slate-300 mt-1">
                    <span>Total Gross Earning</span>
                    <span>Rs. ${fmt(viewSlip.gross_earning)}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase bg-blue-900 text-white px-2 py-1 mb-2">
                    Deductions
                  </p>
                  {[
                    ["Provident Fund (PF 12%)", `Rs. ${fmt(viewSlip.pf_12)}`],
                    ["ESIC (0.75%)", `Rs. ${fmt(viewSlip.esic_0_75)}`],
                    ["Professional Tax (P.Tax)", `Rs. ${fmt(viewSlip.ptax)}`],
                    ["Canteen Deduction", `Rs. ${fmt(viewSlip.canteen_ded)}`],
                    ["Labour Welfare Fund (LWF)", `Rs. ${fmt(viewSlip.lwf_ded)}`],
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      className="flex justify-between py-0.5 border-b border-slate-100 text-slate-700"
                    >
                      <span>{l}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-bold text-red-800 border-t border-slate-300 mt-1">
                    <span>Total Deductions</span>
                    <span>Rs. ${fmt(viewSlip.total_deduction)}</span>
                  </div>
                </div>
              </div>

              {/* Net salary */}
              <div className="bg-blue-900 text-white rounded-lg px-5 py-3 flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wide">
                  Net Salary Payable
                </span>
                <span className="text-lg font-bold">
                  Rs. {fmt(viewSlip.net_salary)}
                </span>
              </div>

              {/* Bank details from Employee Form Section */}
              <div className="border border-slate-200 rounded-lg px-4 py-3 bg-slate-50">
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">
                  Bank Payment Details (NEFT)
                </p>
                <div className="grid grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px]">Bank Name</span>
                    <br />
                    <strong className="text-slate-800">{viewSlip.bank_name || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">A/C Holder Name</span>
                    <br />
                    <strong className="text-slate-800">
                      {viewSlip.bank_holder_name || viewSlip.emp_name || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Account Number</span>
                    <br />
                    <strong className="font-mono text-slate-800">
                      {viewSlip.account_no || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">IFSC Code</span>
                    <br />
                    <strong className="font-mono text-slate-800">
                      {viewSlip.ifsc_code || "—"}
                    </strong>
                  </div>
                </div>
              </div>

              <p className="text-center text-[9px] text-slate-400">
                This is a computer generated salary slip from the Statutory Payroll System.
              </p>
            </div>
          </div>
        </div>
      )}
    </Base>
  );
}
