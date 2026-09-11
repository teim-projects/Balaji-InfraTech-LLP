import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Base from "../components/Base";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (n) => Number(n).toLocaleString("en-IN");

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
function generateSlipHTML(r, companyName, period) {
  const isPaid = r._isPaid;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Salary Slip - ${r.emp_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 24px; }
    .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px; }
    .header h1 { font-size: 16px; font-weight: 700; letter-spacing: 1px; color: #1e3a8a; }
    .header p { font-size: 10px; color: #555; margin-top: 2px; }
    .slip-title { text-align: center; font-size: 13px; font-weight: 700; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #1e3a8a; padding: 5px; color: #1e3a8a; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 14px; }
    .info-row { display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; padding: 2px 0; }
    .info-row .label { font-weight: 600; color: #444; }
    .info-row .value { color: #111; }
    .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; background: #1e3a8a; color: #fff; padding: 3px 8px; margin-bottom: 4px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .table th { background: #f1f5f9; text-align: left; padding: 4px 8px; font-size: 10px; border: 1px solid #d1d5db; }
    .table td { padding: 3px 8px; font-size: 10px; border: 1px solid #e5e7eb; }
    .table td.right { text-align: right; font-weight: 600; }
    .totals { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 14px; }
    .total-box { border: 1px solid #d1d5db; padding: 6px 10px; text-align: center; }
    .total-box .tl { font-size: 9px; text-transform: uppercase; color: #666; }
    .total-box .tv { font-size: 13px; font-weight: 700; color: #111; }
    .net-box { background: #1e3a8a; color: #fff; border-radius: 2px; }
    .net-box .tv { color: #fff; font-size: 15px; }
    .footer { border-top: 1px solid #d1d5db; margin-top: 14px; padding-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 9px; color: #555; }
    .bank-box { border: 1px solid #d1d5db; padding: 6px 10px; }
    .bank-box .bl { font-size: 9px; text-transform: uppercase; color: #777; margin-bottom: 3px; font-weight: 700; }
    .stamp { text-align: right; }
    .status-paid { display:inline-block; padding:3px 10px; background:#dcfce7; color:#166534; border:1px solid #86efac; font-weight:700; font-size:10px; border-radius:2px; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${companyName.toUpperCase()}</h1>
    <p>Statutory Payroll System — Employee Salary Slip</p>
  </div>
  <div class="slip-title">Salary Slip — ${period}</div>

  <div class="info-grid">
    <div>
      <div class="info-row"><span class="label">Employee Code</span><span class="value">${r.emp_code || '—'}</span></div>
      <div class="info-row"><span class="label">Employee Name</span><span class="value">${r.emp_name || '—'}</span></div>
      <div class="info-row"><span class="label">Department</span><span class="value">${r.department || '—'}</span></div>
      <div class="info-row"><span class="label">Designation</span><span class="value">${r.designation || '—'}</span></div>
    </div>
    <div>
      <div class="info-row"><span class="label">Paid Days</span><span class="value">${r.total_paid_days}</span></div>
      <div class="info-row"><span class="label">UAN No.</span><span class="value">${r.uan_no || '—'}</span></div>
      <div class="info-row"><span class="label">Mobile</span><span class="value">${r.mobile_no || '—'}</span></div>
      <div class="info-row"><span class="label">Payment Status</span><span class="value">${isPaid ? '<span class="status-paid">NEFT PAID</span>' : 'Approved'}</span></div>
    </div>
  </div>

  <div class="section-title">Earnings</div>
  <table class="table">
    <thead><tr><th>Component</th><th class="right" style="text-align:right">Amount (Rs.)</th></tr></thead>
    <tbody>
      <tr><td>Basic Salary</td><td class="right">${Number(r.gross_earning * 0.55).toFixed(2)}</td></tr>
      <tr><td>House Rent Allowance (HRA)</td><td class="right">${Number(r.gross_earning * 0.05).toFixed(2)}</td></tr>
      <tr><td>Transport Allowance</td><td class="right">${r.total_paid_days > 0 ? Math.round(1500 / 27 * r.total_paid_days) : 0}</td></tr>
      <tr><td>Other Allowances</td><td class="right">${Number(r.gross_earning * 0.40).toFixed(2)}</td></tr>
      <tr style="font-weight:700;background:#f8fafc"><td>Gross Earnings</td><td class="right">${Number(r.gross_earning).toFixed(2)}</td></tr>
    </tbody>
  </table>

  <div class="section-title">Deductions</div>
  <table class="table">
    <thead><tr><th>Component</th><th class="right" style="text-align:right">Amount (Rs.)</th></tr></thead>
    <tbody>
      <tr><td>Provident Fund (PF 12%)</td><td class="right">${r.pf_12}</td></tr>
      <tr><td>ESIC (0.75%)</td><td class="right">${r.esic_0_75}</td></tr>
      <tr><td>Professional Tax</td><td class="right">${r.ptax}</td></tr>
      <tr><td>Canteen</td><td class="right">${r.canteen_ded}</td></tr>
      <tr><td>Labour Welfare Fund (LWF)</td><td class="right">${r.lwf_ded}</td></tr>
      <tr style="font-weight:700;background:#fef2f2"><td>Total Deductions</td><td class="right">${r.total_deduction}</td></tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="total-box"><div class="tl">Gross Earning</div><div class="tv">Rs. ${Number(r.gross_earning).toFixed(2)}</div></div>
    <div class="total-box"><div class="tl">Total Deduction</div><div class="tv">Rs. ${r.total_deduction}</div></div>
    <div class="total-box net-box"><div class="tl">Net Salary Payable</div><div class="tv">Rs. ${r.net_salary.toLocaleString('en-IN')}</div></div>
  </div>

  <div class="footer">
    <div class="bank-box">
      <div class="bl">Bank Payment Details (NEFT)</div>
      <div>Bank: <strong>${r.bank_name || '—'}</strong></div>
      <div>Account No: <strong>${r.account_no || '—'}</strong></div>
      <div>IFSC Code: <strong>${r.ifsc_code || '—'}</strong></div>
    </div>
    <div class="stamp">
      <div style="margin-top:30px;border-top:1px solid #ccc;padding-top:4px;">Authorized Signature</div>
      <div style="margin-top:4px;color:#aaa;font-size:8px;">This is a computer generated salary slip</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Payroll computation (mirrors WageSheet formulas exactly) ────────────────
function computePayrollRows(attendanceRecords, dbEmployees) {
  return attendanceRecords.map((att, idx) => {
    const empCodeClean = (att.emp_code || "").trim().toLowerCase();
    const empNameClean = (att.emp_name || "").trim().toLowerCase();
    const matchedEmp = dbEmployees.find(
      (e) =>
        (e.balaji_emp_code &&
          String(e.balaji_emp_code).trim().toLowerCase() === empCodeClean) ||
        (e.name && String(e.name).trim().toLowerCase() === empNameClean)
    );
    const isSaved = !!matchedEmp;

    const calc_days = parseFloat(matchedEmp?.calculation_days) || 27;
    const work_days = parseFloat(att.mandays) || 0;
    const c_off = 0;
    const total_paid_days = parseFloat(att.payable_mandays) || work_days + c_off;
    const canteen = Math.round((work_days + c_off) * 15);

    const basic_rate = isSaved ? parseFloat(matchedEmp.basic) || 0 : 15525;
    const hra_rate = isSaved
      ? parseFloat(matchedEmp.hra) || basic_rate * 0.05
      : basic_rate * 0.05;
    const cca_rate = isSaved ? parseFloat(matchedEmp.cca_site_allowance) || 0 : 0;
    const attendance_bonus_rate = isSaved ? parseFloat(matchedEmp.attendance_bonus) || 0 : 0;
    const bonus_rate = isSaved
      ? parseFloat(matchedEmp.bonus) || basic_rate * 0.0833
      : basic_rate * 0.0833;
    const leave_enc_rate = Math.round(
      isSaved
        ? parseFloat(matchedEmp.leave_encashment) || basic_rate * 0.05
        : basic_rate * 0.05
    );
    const gross_salary_rate = Math.round(
      basic_rate + hra_rate + cca_rate + attendance_bonus_rate + bonus_rate + leave_enc_rate
    );
    const transport_rate = isSaved
      ? Math.round(parseFloat(matchedEmp.transport) || 1500)
      : 1500;
    const pf_13_rate = isSaved
      ? Math.round(parseFloat(matchedEmp.pf_13) || basic_rate * 0.13)
      : basic_rate > 15000 ? 1950 : Math.round(basic_rate * 0.13);
    const esic_3_25_rate = Math.round((gross_salary_rate) * 0.0325);
    const uniform_shoes_rate = 300;
    const services_7_rate = Math.round(
      (gross_salary_rate + pf_13_rate + esic_3_25_rate + uniform_shoes_rate) * 0.07
    );
    const ctc_rate = Math.round(
      gross_salary_rate + transport_rate + pf_13_rate + esic_3_25_rate + uniform_shoes_rate + services_7_rate
    );

    let basic_earning = 0, hra_earning = 0, cca_earning = 0, incentive_earning = 0;
    let bonus_earning = 0, leave_earning = 0, transport_earning = 0;
    let gross_earning = 0;

    if (calc_days > 0) {
      basic_earning = (basic_rate / calc_days) * total_paid_days;
      hra_earning = (hra_rate / calc_days) * total_paid_days;
      cca_earning = (cca_rate / calc_days) * total_paid_days;
      incentive_earning = (attendance_bonus_rate / calc_days) * total_paid_days;
      bonus_earning = (bonus_rate / calc_days) * total_paid_days;
      leave_earning = (leave_enc_rate / calc_days) * total_paid_days;
      transport_earning = Math.round((transport_rate / calc_days) * total_paid_days);
      gross_earning =
        basic_earning + hra_earning + cca_earning + incentive_earning +
        bonus_earning + leave_earning + transport_earning;
    }

    let pf_12 = 0, esic_0_75 = 0, ptax = 0;
    let canteen_ded = 0, lwf_ded = 0, total_deduction = 0, net_salary = 0;

    if (gross_earning > 0 && calc_days > 0) {
      const rawPf = gross_salary_rate <= 15000
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
      id: att.id || idx + 1,
      sr_no: idx + 1,
      emp_code: att.emp_code || matchedEmp?.balaji_emp_code || "",
      emp_name: att.emp_name || matchedEmp?.name || "",
      department: isSaved ? matchedEmp.department || "" : "",
      designation: isSaved ? matchedEmp.designation || "" : "",
      bank_name: isSaved ? matchedEmp.bank_name || "" : "",
      account_no: isSaved ? matchedEmp.account_no || "" : "",
      ifsc_code: isSaved ? matchedEmp.ifsc_code || "" : "",
      mobile_no: isSaved ? matchedEmp.mobile_no || "" : "",
      uan_no: isSaved ? matchedEmp.uan_no || "" : "",
      total_paid_days,
      gross_earning,
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
  const [viewSlip, setViewSlip] = useState(null); // row to show in modal

  useEffect(() => {
    try {
      const s1 = JSON.parse(localStorage.getItem(approvalKey) || "[]");
      setApprovedIds(new Set(s1));
    } catch { setApprovedIds(new Set()); }
    try {
      const s2 = JSON.parse(localStorage.getItem(paidKey) || "[]");
      setPaidIds(new Set(s2));
    } catch { setPaidIds(new Set()); }
  }, [approvalKey, paidKey]);

  const persistApproved = useCallback((newSet) => {
    if (!approvalKey) return;
    localStorage.setItem(approvalKey, JSON.stringify([...newSet]));
    setApprovedIds(new Set(newSet));
  }, [approvalKey]);

  const persistPaid = useCallback((newSet) => {
    if (!paidKey) return;
    localStorage.setItem(paidKey, JSON.stringify([...newSet]));
    setPaidIds(new Set(newSet));
  }, [paidKey]);

  // ── Fetch companies ───────────────────────────────────────────────────────
  useEffect(() => {
    const go = async () => {
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
      } catch (e) { console.error(e); }
    };
    go();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BASE_API, token]);

  useEffect(() => {
    if (selectedCompanyId && companies.length > 0) {
      setSelectedCompanyObj(companies.find((c) => String(c.id) === String(selectedCompanyId)) || null);
    }
  }, [selectedCompanyId, companies]);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!selectedCompanyId || !selectedDate) { setLoading(false); return; }
    setLoading(true);
    try {
      const fd = selectedCompanyObj?.salary_type === "monthly"
        ? selectedDate.substring(0, 7)
        : selectedDate;
      const h = token ? { Authorization: `Bearer ${token}` } : {};
      const [r1, r2] = await Promise.all([
        fetch(`${BASE_API.replace(/\/$/, "")}/lead/attendance-records/?company=${selectedCompanyId}&attendance_date=${fd}`, { headers: h }),
        fetch(`${BASE_API.replace(/\/$/, "")}/lead/employees/?company=${selectedCompanyId}&page_size=500`, { headers: h }),
      ]);
      if (r1.ok) {
        const d = await r1.json();
        setAttendanceRecords(Array.isArray(d.results) ? d.results : Array.isArray(d) ? d : []);
      }
      if (r2.ok) {
        const d = await r2.json();
        setDbEmployees(Array.isArray(d.results) ? d.results : Array.isArray(d) ? d : []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedCompanyId, selectedDate, selectedCompanyObj, BASE_API, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Rows ──────────────────────────────────────────────────────────────────
  const allRows = useMemo(() => computePayrollRows(attendanceRecords, dbEmployees), [attendanceRecords, dbEmployees]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return allRows;
    const t = searchTerm.toLowerCase();
    return allRows.filter(
      (r) => r.emp_code.toLowerCase().includes(t) || r.emp_name.toLowerCase().includes(t) || r.department.toLowerCase().includes(t)
    );
  }, [allRows, searchTerm]);

  const approvedRows = useMemo(() => allRows.filter((r) => approvedIds.has(r.id)), [allRows, approvedIds]);

  const totals = useMemo(() =>
    approvedRows.reduce(
      (acc, r) => { acc.gross += r.gross_earning; acc.ded += r.total_deduction; acc.net += r.net_salary; return acc; },
      { gross: 0, ded: 0, net: 0 }
    ), [approvedRows]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleApprove = useCallback((id) => {
    const s = new Set(approvedIds); s.add(id); persistApproved(s);
  }, [approvedIds, persistApproved]);

  const handleApproveAll = useCallback(() => {
    if (!allRows.length) return;
    Swal.fire({
      title: "Approve All Employees?",
      text: `Approve all ${allRows.length} employees for payroll?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Approve All",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#1e40af",
    }).then((res) => {
      if (!res.isConfirmed) return;
      persistApproved(new Set(allRows.map((r) => r.id)));
      Swal.fire({ title: "All Approved", text: `${allRows.length} employees approved.`, icon: "success", confirmButtonColor: "#1e40af" });
    });
  }, [allRows, persistApproved]);

  // ── Pay through Bank (NEFT) ──────────────────────────────────────────────
  const handlePayBank = useCallback((id) => {
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
      const s = new Set(paidIds); s.add(id); persistPaid(s);
      Swal.fire({ title: "NEFT Payment Confirmed", text: "Salary marked as NEFT Paid.", icon: "success", timer: 1800, showConfirmButton: false });
    });
  }, [paidIds, persistPaid]);

  // ── Download payment slip ─────────────────────────────────────────────────
  const handleDownloadSlip = useCallback((r) => {
    const companyName = selectedCompanyObj?.name || "Company";
    const period = monthLabel(selectedDate);
    const html = generateSlipHTML({ ...r, _isPaid: paidIds.has(r.id) }, companyName, period);
    const win = window.open("", "_blank");
    if (!win) { Swal.fire({ icon: "warning", title: "Popup Blocked", text: "Please allow popups to download the payment slip.", confirmButtonColor: "#1e40af" }); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }, [selectedCompanyObj, selectedDate, paidIds]);

  // ── View payment slip in modal ────────────────────────────────────────────
  const handleViewSlip = useCallback((r) => {
    setViewSlip(r);
  }, []);

  // ── Send payment slip on WhatsApp ─────────────────────────────────────────
  const handleWhatsApp = useCallback((r) => {
    const companyName = selectedCompanyObj?.name || "Company";
    const period = monthLabel(selectedDate);
    const mobile = (r.mobile_no || "").replace(/\D/g, "");
    const intlMobile = mobile.startsWith("91") ? mobile : `91${mobile}`;
    const msg = [
      `*SALARY SLIP — ${period.toUpperCase()}*`,
      `*${companyName}*`,
      ``,
      `Employee: *${r.emp_name}*`,
      `Emp Code: ${r.emp_code}`,
      `Department: ${r.department || "—"}`,
      ``,
      `Paid Days: ${r.total_paid_days}`,
      `Gross Earning: *Rs. ${Number(r.gross_earning).toFixed(2)}*`,
      `PF (12%): Rs. ${r.pf_12}`,
      `ESIC (0.75%): Rs. ${r.esic_0_75}`,
      `Prof. Tax: Rs. ${r.ptax}`,
      `Canteen: Rs. ${r.canteen_ded}`,
      `LWF: Rs. ${r.lwf_ded}`,
      `Total Deductions: Rs. ${r.total_deduction}`,
      ``,
      `*Net Salary: Rs. ${r.net_salary.toLocaleString("en-IN")}*`,
      ``,
      `Bank: ${r.bank_name || "—"}`,
      `A/C No: ${r.account_no || "—"}`,
      `IFSC: ${r.ifsc_code || "—"}`,
      ``,
      `Status: ${paidIds.has(r.id) ? "NEFT PAID" : "Approved — Payment Pending"}`,
    ].join("\n");
    const url = mobile
      ? `https://wa.me/${intlMobile}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }, [selectedCompanyObj, selectedDate, paidIds]);

  const handleExport = useCallback(() => {
    if (!approvedRows.length) {
      Swal.fire({ icon: "warning", title: "No Approved Employees", text: "Approve at least one employee before exporting.", confirmButtonColor: "#1e40af" });
      return;
    }
    const companyName = selectedCompanyObj?.name || "Company";
    const period = monthLabel(selectedDate);
    const header = [
      "S.No.", "Emp Code", "Name", "Department", "Designation",
      "Paid Days", "Gross Earning", "PF 12%", "ESIC 0.75%", "P.Tax",
      "Canteen", "LWF", "Total Deduction", "Net Salary",
      "Bank Name", "Account No", "IFSC Code", "Mobile", "UAN No", "Status",
    ];
    const rows = approvedRows.map((r, i) => [
      i + 1, r.emp_code, r.emp_name, r.department, r.designation,
      r.total_paid_days, Number(r.gross_earning).toFixed(2),
      r.pf_12, r.esic_0_75, r.ptax, r.canteen_ded, r.lwf_ded,
      r.total_deduction, r.net_salary,
      r.bank_name, r.account_no, r.ifsc_code, r.mobile_no, r.uan_no,
      paidIds.has(r.id) ? "Paid" : "Approved",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([
      [`PAYROLL - ${companyName.toUpperCase()}`],
      [`PERIOD: ${period.toUpperCase()}`],
      [],
      header,
      ...rows,
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, `${period} ${companyName.replace(/[\\/:*?"<>|]/g, "_")} Payroll.xlsx`);
  }, [approvedRows, paidIds, selectedCompanyObj, selectedDate]);

  const isMonthly = selectedCompanyObj?.salary_type === "monthly";

  const stats = [
    { label: "Total Employees", value: fmtInt(allRows.length), sub: `${approvedIds.size} approved` },
    { label: "Gross Earning", value: `Rs. ${fmt(totals.gross)}`, sub: "approved employees" },
    { label: "Total Deductions", value: `Rs. ${fmt(totals.ded)}`, sub: "PF + ESIC + PTax + LWF + Canteen" },
    { label: "Net Payable", value: `Rs. ${fmt(totals.net)}`, sub: "after all deductions" },
    { label: "NEFT Paid", value: fmtInt(paidIds.size), sub: `of ${approvedIds.size} approved` },
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
              {monthLabel(selectedDate)} &bull; {approvedIds.size} of {allRows.length} employees approved &bull; {paidIds.size} NEFT paid
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-transparent text-slate-700 text-xs font-medium outline-none cursor-pointer max-w-[140px]"
              >
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
              <input
                type={isMonthly ? "month" : "date"}
                value={isMonthly ? selectedDate.substring(0, 7) : selectedDate}
                onChange={(e) => setSelectedDate(isMonthly ? e.target.value + "-01" : e.target.value)}
                className="bg-transparent text-slate-700 text-xs font-medium outline-none cursor-pointer"
              />
            </div>

            <input
              type="text"
              placeholder="Search name / code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500 w-40"
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
              {approvedIds.size === allRows.length && allRows.length > 0 ? `All Approved (${approvedIds.size})` : "Approve All"}
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
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xs">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{s.label}</div>
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
                <strong className="text-blue-700">{selectedCompanyObj?.name || "selected company"}</strong>.
              </p>
              <p className="text-xs text-slate-500">
                Save attendance in{" "}
                <button onClick={() => navigate("/wage-sheet")} className="underline text-blue-600">
                  Wage Sheet
                </button>{" "}
                first, then approve employees here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[62vh] [scrollbar-width:thin]">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                  <tr className="border-b-2 border-slate-200 text-[10px] uppercase tracking-wider divide-x divide-slate-200">
                    <th className="py-2.5 px-3 min-w-[95px] bg-indigo-50 text-indigo-900">Status</th>
                    <th className="py-2.5 px-3 text-center min-w-[40px]">#</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Emp Code</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Name</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Department</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Designation</th>
                    <th className="py-2.5 px-3 text-right min-w-[70px] bg-blue-50/60">Paid Days</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px] bg-emerald-50 text-emerald-900">Gross Earning</th>
                    <th className="py-2.5 px-3 text-right min-w-[70px] bg-red-50/50">PF 12%</th>
                    <th className="py-2.5 px-3 text-right min-w-[80px] bg-red-50/50">ESIC 0.75%</th>
                    <th className="py-2.5 px-3 text-right min-w-[60px] bg-red-50/50">P.Tax</th>
                    <th className="py-2.5 px-3 text-right min-w-[65px] bg-red-50/50">Canteen</th>
                    <th className="py-2.5 px-3 text-right min-w-[55px] bg-red-50/50">LWF</th>
                    <th className="py-2.5 px-3 text-right min-w-[90px] bg-red-100/60 text-red-900">Total Ded</th>
                    <th className="py-2.5 px-3 text-right min-w-[105px] bg-emerald-200/70 text-emerald-950">Net Salary</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Bank</th>
                    <th className="py-2.5 px-3 min-w-[130px]">Account No</th>
                    <th className="py-2.5 px-3 min-w-[100px]">IFSC Code</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Mobile</th>
                    <th className="py-2.5 px-3 min-w-[105px]">UAN No</th>
                    <th className="py-2.5 px-3 text-center min-w-[220px] bg-slate-50">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.map((r) => {
                    const isApproved = approvedIds.has(r.id);
                    const isPaid = paidIds.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`divide-x divide-slate-100 transition-all ${isApproved ? "hover:bg-slate-50" : "opacity-45"}`}
                      >
                        <td className="py-2 px-3 bg-indigo-50/20">
                          {isPaid ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded border border-blue-200">Paid</span>
                          ) : isApproved ? (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded border border-emerald-200">Approved</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded border border-amber-200">Pending</span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-center text-slate-400">{r.sr_no}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-800">{r.emp_code}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {r.emp_name}
                          {!r.isSaved && (
                            <span className="ml-1.5 text-[9px] px-1 py-0.5 bg-amber-100 text-amber-700 rounded">Unsaved</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{r.department || "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{r.designation || "—"}</td>

                        <td className="py-2 px-3 text-right font-semibold text-blue-800 bg-blue-50/20">{r.total_paid_days}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-800 bg-emerald-50/30">{fmt(r.gross_earning)}</td>

                        <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.pf_12}</td>
                        <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.esic_0_75}</td>
                        <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.ptax}</td>
                        <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.canteen_ded}</td>
                        <td className="py-2 px-3 text-right text-slate-700 bg-red-50/20">{r.lwf_ded}</td>

                        <td className="py-2 px-3 text-right font-bold text-red-800 bg-red-100/50">{r.total_deduction}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-950 bg-emerald-200/60">{fmtInt(r.net_salary)}</td>

                        <td className="py-2 px-3 text-slate-600">{r.bank_name || "—"}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono">{r.account_no || "—"}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono">{r.ifsc_code || "—"}</td>
                        <td className="py-2 px-3 text-slate-600">{r.mobile_no || "—"}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono">{r.uan_no || "—"}</td>

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
                              className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
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
                    <td colSpan={7} className="py-3 px-4 text-right text-xs uppercase tracking-wider text-slate-500">
                      Payroll Totals — {approvedRows.length} Approved
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-800 bg-emerald-50/40">{fmt(totals.gross)}</td>
                    <td colSpan={5} />
                    <td className="py-3 px-3 text-right text-red-800 bg-red-100/50">{fmtInt(totals.ded)}</td>
                    <td className="py-3 px-3 text-right text-emerald-950 bg-emerald-200/60">{fmtInt(totals.net)}</td>
                    <td colSpan={6} />
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
                <p className="text-sm font-bold text-slate-900">Payment Slip — {viewSlip.emp_name}</p>
                <p className="text-[10px] text-slate-400">{monthLabel(selectedDate)} &bull; {selectedCompanyObj?.name}</p>
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
                <p className="text-base font-bold text-blue-900 uppercase tracking-wide">{selectedCompanyObj?.name || "Company"}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Statutory Payroll System — Employee Salary Slip</p>
              </div>
              <div className="text-center text-xs font-bold uppercase tracking-wider border border-blue-900 text-blue-900 py-1">
                Salary Slip — {monthLabel(selectedDate)}
              </div>

              {/* Employee info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {[
                  ["Employee Code", viewSlip.emp_code || "—"],
                  ["Paid Days", viewSlip.total_paid_days],
                  ["Employee Name", viewSlip.emp_name || "—"],
                  ["UAN No.", viewSlip.uan_no || "—"],
                  ["Department", viewSlip.department || "—"],
                  ["Mobile", viewSlip.mobile_no || "—"],
                  ["Designation", viewSlip.designation || "—"],
                  ["Status", paidIds.has(viewSlip.id) ? "NEFT PAID" : "Approved"],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b border-dotted border-slate-200 py-0.5">
                    <span className="text-slate-500 font-medium">{l}</span>
                    <span className="font-semibold">{v}</span>
                  </div>
                ))}
              </div>

              {/* Earnings + Deductions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase bg-blue-900 text-white px-2 py-1 mb-2">Earnings</p>
                  {[
                    ["Gross Earning", `Rs. ${Number(viewSlip.gross_earning).toFixed(2)}`],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1 border-b border-slate-100 font-bold text-emerald-800">
                      <span>{l}</span><span>{v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase bg-blue-900 text-white px-2 py-1 mb-2">Deductions</p>
                  {[
                    ["PF 12%", viewSlip.pf_12],
                    ["ESIC 0.75%", viewSlip.esic_0_75],
                    ["Professional Tax", viewSlip.ptax],
                    ["Canteen", viewSlip.canteen_ded],
                    ["LWF", viewSlip.lwf_ded],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-0.5 border-b border-slate-100">
                      <span className="text-slate-600">{l}</span><span className="font-medium">Rs. {v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-bold text-red-800 border-t border-slate-300 mt-1">
                    <span>Total Deductions</span><span>Rs. {viewSlip.total_deduction}</span>
                  </div>
                </div>
              </div>

              {/* Net salary */}
              <div className="bg-blue-900 text-white rounded-lg px-5 py-3 flex justify-between items-center">
                <span className="text-xs font-semibold uppercase tracking-wide">Net Salary Payable</span>
                <span className="text-lg font-bold">Rs. {viewSlip.net_salary.toLocaleString("en-IN")}</span>
              </div>

              {/* Bank details */}
              <div className="border border-slate-200 rounded-lg px-4 py-3">
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Bank Payment Details (NEFT)</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><span className="text-slate-400">Bank</span><br /><strong>{viewSlip.bank_name || "—"}</strong></div>
                  <div><span className="text-slate-400">Account No</span><br /><strong className="font-mono">{viewSlip.account_no || "—"}</strong></div>
                  <div><span className="text-slate-400">IFSC Code</span><br /><strong className="font-mono">{viewSlip.ifsc_code || "—"}</strong></div>
                </div>
              </div>

              <p className="text-center text-[9px] text-slate-400">This is a computer generated salary slip. No signature required.</p>
            </div>
          </div>
        </div>
      )}
    </Base>
  );
}
