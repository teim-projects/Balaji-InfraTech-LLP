import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";

export const NEFT_HISTORY_STORAGE_KEY = "balaji_neft_salary_slips_history";

// Format date into slip month-year representation (e.g., "Aug-26")
export function formatMonthYearSlip(val) {
  if (!val) return "Sep-26";
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const m = d.toLocaleString("en-US", { month: "short" });
      const y = String(d.getFullYear()).slice(-2);
      return `${m}-${y}`;
    }
  } catch {
    // fallback
  }
  return val;
}

// Get previous month (Month 1) and current month (Month 2), e.g. "August" and "September"
export function getPreviousAndCurrentMonthNames(dateStr) {
  let targetDate = new Date();
  if (dateStr) {
    try {
      if (typeof dateStr === "string" && dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts.length >= 2) {
          // e.g. "2026-09" or "2026-09-25"
          if (parts[0].length === 4) {
            const year = parseInt(parts[0], 10);
            const monthIdx = parseInt(parts[1], 10) - 1;
            targetDate = new Date(year, monthIdx, 15);
          } else {
            // e.g. "Sep-26" or "Aug-26"
            const parsed = new Date(`${parts[0]} 15, 20${parts[1]}`);
            if (!isNaN(parsed.getTime())) {
              targetDate = parsed;
            }
          }
        }
      } else {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          targetDate = parsed;
        }
      }
    } catch {
      targetDate = new Date();
    }
  }

  // Month 2 = Target/Current month (e.g. "September" or "October")
  const month2 = targetDate.toLocaleString("en-US", { month: "long" });

  // Month 1 = Previous month (e.g. "August" or "September")
  const prevDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 15);
  const month1 = prevDate.toLocaleString("en-US", { month: "long" });

  return { month1, month2 };
}

// Get full month name from date string or period
export function getFullMonthName(dateStr) {
  const { month1, month2 } = getPreviousAndCurrentMonthNames(dateStr);
  return `${month1}-${month2}`;
}

// Format slip name: "Company Name Month1-Month2" (e.g. "Nandurbar August-September")
export function formatSlipName(companyName, periodOrDate) {
  const cName = (companyName || "Balaji InfraTech LLP").trim();
  const { month1, month2 } = getPreviousAndCurrentMonthNames(periodOrDate);
  return `${cName} ${month1}-${month2}`;
}

export function getSlipData(r, companyName, period, companyAddress) {
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

export function generateSlipDocHTML(r, companyName, period, companyAddress) {
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

export function generateSlipHTML(r, companyName, period, companyAddress) {
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

export async function generateSlipPDFBlob(r, companyName, period, companyAddress) {
  const cleanEmpName = (r.emp_name || "Employee").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const cleanPeriod = (period || "Salary_Slip").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Salary_Slip_${cleanEmpName}_${cleanPeriod}.pdf`;

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
      scale: 2,
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

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, Math.min(contentHeight, pageHeight - margin * 2));
    const pdfBlob = pdf.output("blob");
    const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
    return { blob: pdfBlob, file: pdfFile, filename };
  } finally {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

export async function downloadSalarySlip(r, companyName, period, companyAddress) {
  try {
    Swal.fire({
      title: "Generating PDF...",
      text: "Preparing salary slip document",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const { blob, filename } = await generateSlipPDFBlob(r, companyName, period, companyAddress);
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
    console.error("PDF generation error, fallback to print window:", err);
    const html = generateSlipHTML(r, companyName, period, companyAddress);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  }
}

// ─── NEFT History Storage Operations ──────────────────────────────────────────

export function getAllNeftHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(NEFT_HISTORY_STORAGE_KEY) || "[]");
    if (!Array.isArray(list)) return [];
    // Ensure all entries use the Month1-Month2 format
    return list.map(item => {
      const formattedName = formatSlipName(item.company_name, item.month_year || item.period);
      const formattedMonth = getFullMonthName(item.month_year || item.period);
      return {
        ...item,
        slip_name: formattedName,
        month_name: formattedMonth,
      };
    });
  } catch (err) {
    console.error("Failed to load NEFT history", err);
    return [];
  }
}

export function saveNeftSalarySlip(slipItem) {
  if (!slipItem) return;
  const list = getAllNeftHistory();

  const empCode = (slipItem.emp_code || "").trim();
  const empName = (slipItem.emp_name || "").trim();
  const companyName = (slipItem.company_name || "Balaji InfraTech LLP").trim();
  const period = slipItem.period || formatMonthYearSlip(slipItem.month_year);
  const monthName = getFullMonthName(slipItem.month_year || period);
  const slipName = formatSlipName(companyName, slipItem.month_year || period);

  // Unique identifier for a slip: employee + company + month/period
  const slipKey = `${empCode || empName}_${slipItem.company_id || companyName}_${slipItem.month_year || period}`;

  const existingIdx = list.findIndex(
    item => item.slip_key === slipKey || (
      ((empCode && item.emp_code === empCode) || (empName && item.emp_name.toLowerCase() === empName.toLowerCase())) &&
      item.company_id === slipItem.company_id &&
      (item.month_year === slipItem.month_year || item.period === period)
    )
  );

  const newEntry = {
    id: slipItem.id || `neft_slip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    slip_key: slipKey,
    emp_code: empCode,
    emp_name: empName,
    company_id: slipItem.company_id || "",
    company_name: companyName,
    company_address: slipItem.company_address || "",
    month_year: slipItem.month_year || "2026-09",
    period: period,
    month_name: monthName,
    slip_name: slipName,
    net_salary: slipItem.net_salary || slipItem.rowData?.net_salary || 0,
    paid_at: slipItem.paid_at || new Date().toISOString(),
    payment_mode: "NEFT",
    rowData: slipItem.rowData || slipItem,
  };

  if (existingIdx !== -1) {
    list[existingIdx] = { ...list[existingIdx], ...newEntry };
  } else {
    list.unshift(newEntry);
  }

  try {
    localStorage.setItem(NEFT_HISTORY_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to save NEFT salary slip to history", err);
  }
  return newEntry;
}

export function saveBulkNeftSalarySlips(items) {
  if (!Array.isArray(items) || items.length === 0) return;
  items.forEach(saveNeftSalarySlip);
}

// Retrieve salary slips for a specific employee, sorted with newest on top
export function getEmployeeNeftSlips(empCode, empName) {
  const all = getAllNeftHistory();
  const cCode = (empCode || "").trim().toLowerCase();
  const cName = (empName || "").trim().toLowerCase();

  const filtered = all.filter(item => {
    const itemCode = (item.emp_code || "").trim().toLowerCase();
    const itemName = (item.emp_name || "").trim().toLowerCase();
    return (cCode && itemCode === cCode) || (cName && itemName === cName);
  });

  // Sort with newest on top
  filtered.sort((a, b) => {
    const dateA = a.paid_at || a.month_year || "";
    const dateB = b.paid_at || b.month_year || "";
    return dateB.localeCompare(dateA);
  });

  return filtered;
}
