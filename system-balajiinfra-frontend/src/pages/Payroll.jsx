import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Base from "../components/Base";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import CustomDropdown from "../components/CustomDropdown";

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

// ─── Payment Slip Document Data Helper ────────────────────────────────────────
function formatMonthYearSlip(periodStr, selectedDateStr) {
  const raw = selectedDateStr || periodStr || "";
  if (!raw) return "Sep-26";
  const str = String(raw).trim();
  if (/^[A-Za-z]{3}-\d{2}$/i.test(str)) {
    return str;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const m = d.toLocaleString("en-US", { month: "short" });
      const y = String(d.getFullYear()).slice(-2);
      return `${m}-${y}`;
    }
  } catch (e) {}
  if (str.includes("-")) {
    const parts = str.split("-");
    if (parts.length >= 2) {
      const isYearFirst = parts[0].length === 4;
      const y = isYearFirst ? parts[0].slice(-2) : parts[1].slice(-2);
      const mIdx = isYearFirst ? parseInt(parts[1], 10) - 1 : parseInt(parts[0], 10) - 1;
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      if (months[mIdx]) return `${months[mIdx]}-${y}`;
    }
  }
  const mMatch = str.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})/i);
  if (mMatch) {
    const m = mMatch[1].slice(0, 3);
    const y = mMatch[2].slice(-2);
    return `${m}-${y}`;
  }
  return str;
}

function getSlipData(r, companyName, period, companyAddress) {
  const cName = companyName || "Balaji Infrastructure Nandurbar";
  const cAddress =
    companyAddress ||
    "Plot no 9, Ambika Colony,Janata Raja Chouk, Nandurbar, Maharashtra 425412";
  const monthYear = formatMonthYearSlip(period);

  const empId = r.emp_code || r.balaji_emp_code || "—";
  const empName = [r.salutation, r.emp_name].filter(Boolean).join(" ") || r.emp_name || "—";
  const uanNo = r.uan_no || "—";
  const esiNo = r.esic_no || "—";
  const totalDays = r.total_paid_days ?? r.payable_mandays ?? r.mandays ?? r.work_days ?? 26;
  const otHr = r.ot_hrs ?? r.payable_ot ?? r.ot ?? 0;
  const destination = r.category || r.designation || "Skilled";

  // Earnings
  const basic = Math.round(Number(r.basic_earning ?? r.basic ?? 0));
  const hra = Math.round(Number(r.hra_earning ?? r.hra ?? 0));
  const transport = Math.round(Number(r.transport_earning ?? r.transport ?? 0));
  const cca = Math.round(Number(r.cca_earning ?? r.cca_site_allowance ?? 0));
  const incentive = Math.round(Number(r.incentive_earning ?? r.attendance_bonus ?? 0));
  const bonus = Math.round(Number(r.bonus_earning ?? r.bonus ?? 0));
  const leaveEnc = Math.round(Number(r.leave_earning ?? r.leave_encashment ?? 0));
  const totalAddition = basic + hra + transport + cca + incentive + bonus + leaveEnc;
  const daDiff = Math.round(Number(r.da_diff || 0));

  // Deductions
  const pf = Math.round(Number(r.pf_12 ?? r.pf_deduction ?? r.pf ?? 0));
  const esi = Math.round(Number(r.esic_0_75 ?? r.esic_deduction ?? r.esic ?? 0));
  const canteen = Math.round(Number(r.canteen_ded ?? r.canteen ?? 0));
  const tax = Math.round(Number(r.ptax ?? r.pt ?? r.professional_tax ?? 0));
  const lwf = Math.round(Number(r.lwf_ded ?? r.lwf ?? 0));
  const totalDeduction = pf + esi + canteen + tax + lwf;

  // Net Salary & OT & TOTAL
  const netSalary = totalAddition - totalDeduction;
  const ot = Math.round(Number(r.site_allowance_earning ?? r.ot_amount ?? 0));
  const totalPayable = netSalary + ot;

  return {
    cName,
    cAddress,
    monthYear,
    empId,
    empName,
    uanNo,
    esiNo,
    totalDays,
    otHr,
    destination,
    basic,
    hra,
    transport,
    cca,
    incentive,
    bonus,
    leaveEnc,
    totalAddition,
    daDiff,
    pf,
    esi,
    canteen,
    tax,
    lwf,
    totalDeduction,
    netSalary,
    ot,
    totalPayable,
  };
}

// ─── Payment Slip Document HTML Generator ─────────────────────────────────────
function generateSlipDocHTML(r, companyName, period, companyAddress) {
  const d = getSlipData(r, companyName, period, companyAddress);

  return `
    <div class="salary-slip-doc" style="background:#ffffff; color:#000000; font-family: Arial, Helvetica, sans-serif; font-size: 11.5px; padding: 22px 26px; width: 750px; box-sizing: border-box; margin: 0 auto; border: 1.5px solid #000000;">
      <style>
        .salary-slip-doc * { box-sizing: border-box; }
        .salary-slip-doc table { width: 100%; border-collapse: collapse; border: 1.5px solid #000000; }
        .salary-slip-doc th, .salary-slip-doc td { border: 1px solid #000000; padding: 4px 8px; font-size: 11.5px; color: #000000; line-height: 1.35; }
        .salary-slip-doc .header { text-align: center; margin-bottom: 6px; }
        .salary-slip-doc .header h1 { font-size: 19px; font-weight: bold; margin: 0 0 3px 0; color: #000000; }
        .salary-slip-doc .header p { font-size: 11px; margin: 0 0 5px 0; color: #000000; }
        .salary-slip-doc .header .slip-title { font-size: 14.5px; font-weight: bold; margin: 0; color: #000000; }
        .salary-slip-doc .divider { border-bottom: 1.5px solid #000000; margin: 6px 0 12px 0; }
        .salary-slip-doc .info-table { margin-bottom: 12px; }
        .salary-slip-doc .info-table td.lbl { font-weight: bold; width: 20%; }
        .salary-slip-doc .info-table td.val { width: 30%; }
        .salary-slip-doc .breakup-table { margin-bottom: 20px; }
        .salary-slip-doc .breakup-table th { background: #d9d9d9; font-weight: bold; text-align: left; }
        .salary-slip-doc .breakup-table td.amt { text-align: right; }
        .salary-slip-doc .bold-cell { font-weight: bold; }
        .salary-slip-doc .signatures { display: flex; justify-content: space-between; margin-top: 25px; padding: 0 4px; font-size: 12px; font-weight: bold; color: #000000; }
      </style>

      <div class="header">
        <h1>${d.cName}</h1>
        <p>${d.cAddress}</p>
        <div class="slip-title">Monthly Salary Slip</div>
      </div>
      <div class="divider"></div>

      <table class="info-table">
        <tbody>
          <tr>
            <td class="lbl">Employe Id</td>
            <td class="val">${d.empId}</td>
            <td class="lbl">Employee Name</td>
            <td class="val">${d.empName}</td>
          </tr>
          <tr>
            <td class="lbl">UAN No.</td>
            <td class="val">${d.uanNo}</td>
            <td class="lbl">ESI No.</td>
            <td class="val">${d.esiNo}</td>
          </tr>
          <tr>
            <td class="lbl">Total Days</td>
            <td class="val">${d.totalDays}</td>
            <td class="lbl">OT HR.</td>
            <td class="val">${d.otHr}</td>
          </tr>
          <tr>
            <td class="lbl">Destination</td>
            <td class="val">${d.destination}</td>
            <td class="lbl">Month & Year</td>
            <td class="val">${d.monthYear}</td>
          </tr>
        </tbody>
      </table>

      <table class="breakup-table">
        <thead>
          <tr>
            <th style="width: 28%;">Earnings</th>
            <th style="width: 22%;"></th>
            <th style="width: 28%;">Deduction</th>
            <th style="width: 22%;"></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Basic</td>
            <td class="amt">${d.basic}</td>
            <td>Provident Fund</td>
            <td class="amt">${d.pf}</td>
          </tr>
          <tr>
            <td>H.R.A</td>
            <td class="amt">${d.hra}</td>
            <td>E.S.I</td>
            <td class="amt">${d.esi}</td>
          </tr>
          <tr>
            <td>Transport</td>
            <td class="amt">${d.transport}</td>
            <td>Canteen</td>
            <td class="amt">${d.canteen}</td>
          </tr>
          <tr>
            <td>CCA/Site A</td>
            <td class="amt">${d.cca}</td>
            <td>Tax</td>
            <td class="amt">${d.tax}</td>
          </tr>
          <tr>
            <td>Incentive</td>
            <td class="amt">${d.incentive}</td>
            <td>LWF</td>
            <td class="amt">${d.lwf}</td>
          </tr>
          <tr>
            <td>Bonus</td>
            <td class="amt">${d.bonus}</td>
            <td class="bold-cell">Total Deduction</td>
            <td class="amt bold-cell">${d.totalDeduction}</td>
          </tr>
          <tr>
            <td>Leave Encashment</td>
            <td class="amt">${d.leaveEnc}</td>
            <td class="bold-cell">Net Salary</td>
            <td class="amt bold-cell">${d.netSalary}</td>
          </tr>
          <tr>
            <td class="bold-cell">Total Addition</td>
            <td class="amt bold-cell">${d.totalAddition}</td>
            <td>OT</td>
            <td class="amt">${d.ot}</td>
          </tr>
          <tr>
            <td>DA Diff</td>
            <td class="amt">${d.daDiff}</td>
            <td class="bold-cell">TOTAL</td>
            <td class="amt bold-cell">${d.totalPayable}</td>
          </tr>
        </tbody>
      </table>

      <div class="signatures">
        <div>Signature of the Employee..................................</div>
        <div>Director.............................................</div>
      </div>
    </div>
  `;
}

// ─── Payment Slip Full HTML (For browser window print) ─────────────────────────
function generateSlipHTML(r, companyName, period, companyAddress) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Salary Slip - ${r.emp_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; margin: 0; padding: 20px; font-family: Arial, Helvetica, sans-serif; display: flex; justify-content: center; }
    @media print {
      body { padding: 0; display: block; }
      @page { margin: 8mm; }
    }
  </style>
</head>
<body>
  ${generateSlipDocHTML(r, companyName, period, companyAddress)}
</body>
</html>`;
}

// ─── Payment Slip PDF Generator (html2canvas + jsPDF) ────────────────────────
async function generateSlipPDFBlob(r, companyName, period, companyAddress) {
  const cleanEmpName = (r.emp_name || "Employee").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanPeriod = (period || "Salary_Slip").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Salary_Slip_${cleanEmpName}_${cleanPeriod}.pdf`;

  // Create temporary off-screen but rendered container in the DOM
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "750px";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "999999";
  container.style.pointerEvents = "none";
  container.innerHTML = generateSlipDocHTML(r, companyName, period, companyAddress);
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
    const margin = 10; // 10mm margin
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
function computePayrollRows(attendanceRecords, dbEmployees, companyObj = null) {
  if (!attendanceRecords || attendanceRecords.length === 0) return [];

  const compPfRate = (companyObj?.pf !== null && companyObj?.pf !== undefined && companyObj?.pf !== "") ? (parseFloat(companyObj.pf) / 100) : 0.13;
  const compEsicRate = (companyObj?.esic !== null && companyObj?.esic !== undefined && companyObj?.esic !== "") ? (parseFloat(companyObj.esic) / 100) : 0.0325;
  const compUniformRate = (companyObj?.uniform_charge !== null && companyObj?.uniform_charge !== undefined && companyObj?.uniform_charge !== "") ? parseFloat(companyObj.uniform_charge) : 300;
  const compAdminRate = (companyObj?.admin_charge !== null && companyObj?.admin_charge !== undefined && companyObj?.admin_charge !== "") ? (parseFloat(companyObj.admin_charge) / 100) : 0.07;

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

    // Balaji formula: standard 26 mandays threshold, overtime includes extra OT
    const extra_days = work_days > 26 ? parseFloat((work_days - 26).toFixed(2)) : 0;
    const extra_ot = parseFloat((extra_days * 8).toFixed(2));
    const calc_payable_mandays = Math.max(0, parseFloat((work_days - extra_days).toFixed(2)));
    const raw_pMandays = att.payable_mandays !== undefined && att.payable_mandays !== null && att.payable_mandays !== "" && !isNaN(parseFloat(att.payable_mandays))
      ? parseFloat(att.payable_mandays)
      : calc_payable_mandays;
    const total_paid_days = ((work_days > 26 && raw_pMandays > 26) ? calc_payable_mandays : raw_pMandays) + c_off;

    const base_ot = parseFloat(att.ot) || 0;
    const raw_pOt = att.payable_ot !== undefined && att.payable_ot !== null && att.payable_ot !== "" && !isNaN(parseFloat(att.payable_ot))
      ? parseFloat(att.payable_ot)
      : (base_ot + extra_ot);
    const ot_hrs = raw_pOt < base_ot + extra_ot ? parseFloat((base_ot + extra_ot).toFixed(2)) : raw_pOt;
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
      : (basic_rate > 15000 ? Math.round(15000 * compPfRate) : Math.round(basic_rate * compPfRate));

    const esic_3_25_rate = isSaved && parseFloat(matchedEmp.esic_3_25) > 0
      ? Math.round(parseFloat(matchedEmp.esic_3_25))
      : Math.round(gross_salary_rate * compEsicRate);

    const uniform_shoes_rate = isSaved && parseFloat(matchedEmp.uniform_shoes) > 0
      ? Math.round(parseFloat(matchedEmp.uniform_shoes))
      : compUniformRate;

    const services_7_rate = isSaved && parseFloat(matchedEmp.services_7) > 0
      ? Math.round(parseFloat(matchedEmp.services_7))
      : Math.round((gross_salary_rate + pf_13_rate + esic_3_25_rate + uniform_shoes_rate) * compAdminRate);

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

    // ── Attendance Deductions ─────────────────────────────────────────────
    const ded_other = parseFloat(att.deduction_other) || 0;
    const ded_shows_tshirt = parseFloat(att.deduction_shows_tshirt) || 0;
    const ded_rashan = parseFloat(att.deduction_rashan) || 0;
    const ded_room_rent = parseFloat(att.deduction_room_rent) || 0;
    const ded_light_bill = parseFloat(att.deduction_light_bill) || 0;
    const ded_lpg = parseFloat(att.deduction_lpg) || 0;
    const extra_deductions = parseFloat(att.extra_deductions) || 0;
    const attendance_deduction = (parseFloat(att.total_deduction) || (
      ded_other + ded_shows_tshirt + ded_rashan + ded_room_rent + ded_light_bill + ded_lpg
    )) + extra_deductions;

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
      total_deduction = pf_12 + esic_0_75 + ptax + canteen_ded + lwf_ded + attendance_deduction;
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
      mobile_no: matchedEmp?.mobile_no || matchedEmp?.phone_number || matchedEmp?.mobile || att.mobile_no || att.mobile || "",
      email: matchedEmp?.email || matchedEmp?.email_id || att.email || att.email_id || "",
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
      // Attendance Deductions
      ded_other,
      ded_shows_tshirt,
      ded_rashan,
      ded_room_rent,
      ded_light_bill,
      ded_lpg,
      extra_deductions,
      attendance_deduction,
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
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/payroll/companies/`, {
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
          `${BASE_API.replace(/\/$/, "")}/payroll/attendance-records/?company=${selectedCompanyId}&attendance_date=${fd}`,
          { headers: h }
        ),
        fetch(`${BASE_API.replace(/\/$/, "")}/payroll/employee-details/?page_size=1000`, {
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
    () => computePayrollRows(attendanceRecords, dbEmployees, selectedCompanyObj),
    [attendanceRecords, dbEmployees, selectedCompanyObj]
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
        r.email.toLowerCase().includes(t) ||
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
      if (!paidIds.has(r.id)) {
        Swal.fire({
          icon: "warning",
          title: "Payment Pending",
          text: "Payment slip PDF can only be generated after the salary has been paid (NEFT Paid).",
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }

      const companyName = selectedCompanyObj?.name || "Balaji Infrastructure Nandurbar";
      const companyAddress =
        selectedCompanyObj?.address ||
        "Plot no 9, Ambika Colony,Janata Raja Chouk, Nandurbar, Maharashtra 425412";
      const period = selectedDate ? formatMonthYearSlip(selectedDate) : "Sep-26";
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
          period,
          companyAddress
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
        const html = generateSlipHTML({ ...r, _isPaid: paidIds.has(r.id) }, companyName, period, companyAddress);
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
  const handleViewSlip = useCallback(
    (r) => {
      if (!paidIds.has(r.id)) {
        Swal.fire({
          icon: "warning",
          title: "Payment Pending",
          text: "Payment slip can only be viewed after the salary has been paid (NEFT Paid).",
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }
      setViewSlip(r);
    },
    [paidIds]
  );

  // ── Send payment slip on WhatsApp ─────────────────────────────────────────
  const handleWhatsApp = useCallback(
    async (r) => {
      if (!paidIds.has(r.id)) {
        Swal.fire({
          icon: "warning",
          title: "Payment Pending",
          text: "Payment slip can only be sent on WhatsApp after the salary has been paid (NEFT Paid).",
          confirmButtonColor: "#1d4ed8",
        });
        return;
      }

      const companyName = selectedCompanyObj?.name || "Balaji Infrastructure Nandurbar";
      const companyAddress =
        selectedCompanyObj?.address ||
        "Plot no 9, Ambika Colony,Janata Raja Chouk, Nandurbar, Maharashtra 425412";
      const period = selectedDate ? formatMonthYearSlip(selectedDate) : "Sep-26";
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
          period,
          companyAddress
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
      "Other Ded",
      "Shows & Tshirt",
      "Rashan",
      "Room Rent",
      "Light Bill",
      "LPG",
      "Extra Deductions",
      "Additional Deduction Total",
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
      r.ded_other || 0,
      r.ded_shows_tshirt || 0,
      r.ded_rashan || 0,
      r.ded_room_rent || 0,
      r.ded_light_bill || 0,
      r.ded_lpg || 0,
      r.extra_deductions || 0,
      r.attendance_deduction || 0,
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

  // ── Bank Export (NFPS Format) ─────────────────────────────────────────────
  const handleBankExport = useCallback(async () => {
    if (!approvedRows.length) {
      Swal.fire({
        icon: "warning",
        title: "No Approved Rows",
        text: "Please approve at least one employee before exporting bank sheet.",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    const validBankRows = approvedRows.filter(
      (r) => r.account_no && r.ifsc_code && Number(r.net_salary || 0) > 0
    );

    if (!validBankRows.length) {
      Swal.fire({
        icon: "warning",
        title: "No Bank Details Found",
        text: "None of the approved employees have both Bank Account Number and IFSC Code filled.",
        confirmButtonColor: "#1e40af",
      });
      return;
    }

    if (validBankRows.length < approvedRows.length) {
      const skippedCount = approvedRows.length - validBankRows.length;
      const res = await Swal.fire({
        icon: "question",
        title: "Export Bank Sheet",
        html: `
          <div style="text-align: left; font-size: 13px;">
            <p><strong>${validBankRows.length}</strong> approved employees have complete bank details.</p>
            <p style="color: #e11d48; margin-top: 6px;">⚠️ <strong>${skippedCount}</strong> employees will be excluded due to missing Bank Account No or IFSC code.</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: `Export ${validBankRows.length} Records`,
        confirmButtonColor: "#1d4ed8",
        cancelButtonText: "Cancel",
      });
      if (!res.isConfirmed) return;
    }

    try {
      const companyName = selectedCompanyObj?.name || "Company";

      // Calculate short month and 2-digit year (e.g. JUN 26)
      let mStr = "JUN";
      let yStr = "26";
      try {
        const parts = selectedDate.split("-");
        const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        mStr = dt.toLocaleString("en-US", { month: "short" }).toUpperCase();
        yStr = String(dt.getFullYear()).slice(-2);
      } catch {
        // fallback
      }

      // Default narration matching NFPS format e.g. "PRODUCTION JUN 26 SALARY "
      const defaultNarr = `${companyName.toUpperCase()} ${mStr} ${yStr} SALARY `;

      // Current date in DD-MM-YYYY format
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      const pymtDate = `${dd}-${mm}-${yyyy}`;

      const debitAccNo = "087105500189";

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Sheet1", {
        views: [{ showGridLines: true }],
      });

      // 13 Columns with exact widths from NFPS format template
      ws.columns = [
        { key: "PYMT_PROD_TYPE_CODE", width: 27.55 },
        { key: "PYMT_MODE", width: 26.66 },
        { key: "DEBIT_ACC_NO", width: 26.66 },
        { key: "BNF_NAME", width: 45.66 },
        { key: "BENE_ACC_NO", width: 26.66 },
        { key: "BENE_IFSC", width: 26.66 },
        { key: "AMOUNT", width: 26.66 },
        { key: "CREDIT_NARR", width: 33.55 },
        { key: "PYMT_DATE", width: 26.66 },
        { key: "MOBILE_NUM", width: 26.66 },
        { key: "EMAIL_ID", width: 26.66 },
        { key: "REMARK", width: 26.66 },
        { key: "REF_NO", width: 26.66 },
      ];

      const headers = [
        "PYMT_PROD_TYPE_CODE",
        "PYMT_MODE",
        "DEBIT_ACC_NO",
        "BNF_NAME",
        "BENE_ACC_NO",
        "BENE_IFSC",
        "AMOUNT",
        "CREDIT_NARR",
        "PYMT_DATE",
        "MOBILE_NUM",
        "EMAIL_ID",
        "REMARK",
        "REF_NO",
      ];

      const headerRow = ws.addRow(headers);
      headerRow.height = 102.75;

      headerRow.eachCell((cell) => {
        cell.font = { name: "Mulish SemiBold", size: 11 };
        cell.alignment = { horizontal: "center", vertical: "top", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { indexed: 8 } },
          left: { style: "thin", color: { indexed: 8 } },
          bottom: { style: "thin", color: { indexed: 8 } },
          right: { style: "thin", color: { indexed: 8 } },
        };
        cell.numFmt = "@";
      });

      validBankRows.forEach((r) => {
        const ifsc = String(r.ifsc_code || "").trim().toUpperCase();
        const mode = ifsc.startsWith("ICIC") ? "FT" : "NEFT";
        const bnfName = String(r.bank_holder_name || r.emp_name || "").trim().toUpperCase();
        const beneAcc = String(r.account_no || "").trim();
        const amountStr = String(Math.round(r.net_salary || 0));

        // Format Mobile Number if present
        const rawMobile = String(r.mobile_no || r.mobile || "").trim();
        let mobileVal = null;
        if (rawMobile) {
          const digitsOnly = rawMobile.replace(/\D/g, "");
          if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
            mobileVal = digitsOnly.slice(2);
          } else if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
            mobileVal = digitsOnly.slice(1);
          } else if (digitsOnly.length === 10) {
            mobileVal = digitsOnly;
          } else {
            mobileVal = digitsOnly || rawMobile;
          }
        }

        // Format Email if present
        const rawEmail = String(r.email || r.email_id || "").trim();
        const emailVal = rawEmail ? rawEmail.toLowerCase() : null;

        const row = ws.addRow([
          "PAB_VENDOR",
          mode,
          debitAccNo,
          bnfName,
          beneAcc,
          ifsc,
          amountStr,
          defaultNarr,
          pymtDate,
          mobileVal,
          emailVal,
          null,
          null,
        ]);

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = { name: "Mulish SemiBold", size: 11 };
          cell.alignment = { horizontal: "center" };
          cell.border = {
            top: { style: "thin", color: { indexed: 8 } },
            left: { style: "thin", color: { indexed: 8 } },
            bottom: { style: "thin", color: { indexed: 8 } },
            right: { style: "thin", color: { indexed: 8 } },
          };
          cell.numFmt = "@";
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanComp = companyName.replace(/[\\/:*?"<>|]/g, "_");
      a.download = `NFPS_FMT ${cleanComp} ${mStr} ${yStr} Monthly salary sheet ${validBankRows.length}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Bank Export Complete",
        text: `Exported ${validBankRows.length} records successfully.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Bank export failed:", err);
      Swal.fire({
        icon: "error",
        title: "Bank Export Failed",
        text: err.message || "Failed to generate bank export file.",
        confirmButtonColor: "#1e40af",
      });
    }
  }, [approvedRows, selectedCompanyObj, selectedDate]);

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
            <CustomDropdown
              options={companies}
              value={selectedCompanyId}
              onChange={(val) => setSelectedCompanyId(val)}
              placeholder="Select Company"
            />

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

            <button
              onClick={handleBankExport}
              disabled={approvedRows.length === 0}
              className="px-2.5 py-1 text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
              title="Export Bank Sheet (NFPS Format)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Bank Export
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
                    <th className="py-2.5 px-3 text-right min-w-[75px] bg-rose-100/70 text-rose-900" title="Additional Deductions (Other, Shows & Tshirt, Rashan, Room Rent, Light Bill, LPG)">
                      Add. Ded
                    </th>
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
                        <td
                          className="py-2 px-3 text-right font-semibold text-rose-800 bg-rose-50/30"
                          title={`Other: ${r.ded_other || 0}, Shows & Tshirt: ${r.ded_shows_tshirt || 0}, Rashan: ${r.ded_rashan || 0}, Room: ${r.ded_room_rent || 0}, Light: ${r.ded_light_bill || 0}, LPG: ${r.ded_lpg || 0}, Extra Deductions: ${r.extra_deductions || 0}`}
                        >
                          {fmtInt(r.attendance_deduction)}
                        </td>

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
                              {!isPaid ? (
                                <>
                                  {/* Pay through Bank NEFT */}
                                  <button
                                    onClick={() => handlePayBank(r.id)}
                                    className="w-full px-2 py-1 text-[10px] font-semibold bg-blue-700 hover:bg-blue-800 text-white rounded transition-colors text-center shadow-xs cursor-pointer"
                                  >
                                    Pay through Bank (NEFT)
                                  </button>
                                  <span className="text-[9px] text-amber-600 font-medium text-center">
                                    Payment Pending (Slip locked)
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded border border-blue-200 text-center">
                                    NEFT Paid
                                  </span>
                                  {/* Download Slip */}
                                  <button
                                    onClick={() => handleDownloadSlip(r)}
                                    className="w-full px-2 py-0.5 text-[10px] font-semibold bg-slate-700 hover:bg-slate-800 text-white rounded transition-colors text-left cursor-pointer"
                                  >
                                    Download Payment Slip
                                  </button>
                                  {/* View Slip */}
                                  <button
                                    onClick={() => handleViewSlip(r)}
                                    className="w-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded transition-colors text-left cursor-pointer"
                                  >
                                    View Payment Slip
                                  </button>
                                  {/* WhatsApp */}
                                  <button
                                    onClick={() => handleWhatsApp(r)}
                                    className="w-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors text-left cursor-pointer"
                                  >
                                    Send on WhatsApp
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleApprove(r.id)}
                              className="px-2.5 py-1 text-[10px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors cursor-pointer"
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
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setViewSlip(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl sticky top-0 z-10">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Monthly Salary Slip — {viewSlip.emp_name}
                </p>
                <p className="text-[10px] text-slate-500">
                  {formatMonthYearSlip(selectedDate)} &bull; {selectedCompanyObj?.name || "Balaji Infrastructure Nandurbar"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadSlip(viewSlip)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-black text-white rounded-md transition-colors shadow-sm"
                >
                  Download / Print
                </button>
                <button
                  onClick={() => handleWhatsApp(viewSlip)}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-sm"
                >
                  Send WhatsApp
                </button>
                <button
                  onClick={() => setViewSlip(null)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Slip body matching reference image */}
            <div className="p-6 bg-slate-200/60 flex justify-center overflow-x-auto">
              <div
                dangerouslySetInnerHTML={{
                  __html: generateSlipDocHTML(
                    viewSlip,
                    selectedCompanyObj?.name,
                    selectedDate,
                    selectedCompanyObj?.address
                  ),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </Base>
  );
}
