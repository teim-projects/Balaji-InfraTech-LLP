export function printForm(employee, baseApi = "") {
  if (!employee) return;

  const adharRaw = String(employee.adhar_no || "").replace(/[^0-9]/g, "");
  const adharPadded = adharRaw.padEnd(12, " ");
  const panChars = String(employee.pan_number || "").trim().toUpperCase().padEnd(10, " ");
  const sex = String(employee.sex || "male").toLowerCase();

  const photoSrc = employee.photo
    ? employee.photo.startsWith("http")
      ? employee.photo
      : `${baseApi.replace(/\/$/, "")}${employee.photo.startsWith("/") ? "" : "/"}${employee.photo}`
    : "";

  const currentAddress = [
    employee.current_address_line1,
    employee.current_address_line2,
    employee.current_address_city,
    employee.current_address_taluka,
    employee.current_address_state,
    employee.current_address_pincode ? `PIN: ${employee.current_address_pincode}` : "",
  ]
    .filter(Boolean)
    .join(", ") || "—";

  const permanentAddress = employee.is_permanent_same_as_current
    ? "Same as Present Address (वर्तमान पते के समान)"
    : [
        employee.permanent_address_line1,
        employee.permanent_address_city,
        employee.permanent_address_state,
        employee.permanent_address_pincode,
      ]
        .filter(Boolean)
        .join(", ") || "Same as Present Address";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Employee Registration Form - ${employee.balaji_emp_code || ""}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    .form-frame {
      border: 2px solid #000000;
      padding: 10px;
      width: 100%;
      height: calc(297mm - 16.5mm);
      min-height: calc(297mm - 16.5mm);
      max-height: calc(297mm - 16.5mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      box-sizing: border-box;
      page-break-inside: avoid;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #000000;
      padding-bottom: 8px;
      margin-bottom: 9px;
    }
    .org-sub {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.2px;
      color: #333333;
      text-transform: uppercase;
    }
    .org-title {
      font-size: 18px;
      font-weight: 900;
      letter-spacing: 0.8px;
      color: #000000;
      text-transform: uppercase;
      margin: 2px 0;
    }
    .form-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      color: #000000;
      margin-top: 1px;
    }
    .form-desc {
      font-size: 8.5px;
      color: #555555;
      font-style: italic;
      margin-top: 2px;
    }
    .meta-strip {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #cccccc;
      font-size: 10px;
      display: flex;
      gap: 20px;
      align-items: center;
    }
    .photo-box {
      width: 114px;
      height: 140px;
      border: 1.5px dashed #333333;
      background: #fbfbfb;
      text-align: center;
      padding: 3px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #555555;
      font-weight: bold;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .photo-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .section-block {
      border: 1.2px solid #000000;
      margin-bottom: 9px;
    }
    .section-title {
      background: #000000;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3.5px 8px;
      display: flex;
      justify-content: space-between;
    }
    .grid-row {
      display: flex;
      border-top: 1px solid #777777;
      font-size: 10.5px;
    }
    .grid-row:first-of-type {
      border-top: none;
    }
    .grid-cell {
      flex: 1;
      padding: 5px 8px;
      border-right: 1px solid #777777;
    }
    .grid-cell:last-child {
      border-right: none;
    }
    .cell-label {
      font-size: 8px;
      font-weight: 700;
      color: #444444;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .cell-value {
      font-size: 11px;
      font-weight: 700;
      color: #000000;
    }
    .cell-value-mono {
      font-size: 11px;
      font-weight: 800;
      font-family: monospace;
      color: #000000;
    }
    .digit-box {
      display: inline-block;
      width: 17px;
      height: 20px;
      line-height: 20px;
      text-align: center;
      border: 1px solid #000000;
      background: #f8f8f8;
      font-family: monospace;
      font-size: 11px;
      font-weight: 800;
      margin-right: 1.5px;
    }
    .check-box {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 1px solid #000000;
      text-align: center;
      line-height: 11px;
      font-size: 9.5px;
      font-weight: 900;
      margin-right: 4px;
      vertical-align: middle;
    }
    .check-box.checked {
      background: #000000;
      color: #ffffff;
    }
    table.wage-table {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
      font-size: 10.5px;
    }
    table.wage-table th {
      background: #f0f0f0;
      border: 1px solid #555555;
      padding: 5px 3px;
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 800;
    }
    table.wage-table td {
      border: 1px solid #555555;
      padding: 6px 3px;
      font-family: monospace;
      font-weight: 700;
      font-size: 11px;
    }
    .decl-text {
      font-size: 8.5px;
      line-height: 1.35;
      color: #222222;
      font-style: italic;
      margin-bottom: 7px;
    }
    .sig-grid {
      display: flex;
      gap: 10px;
      margin-top: 6px;
      border-top: 1px solid #cccccc;
      padding-top: 6px;
    }
    .sig-box {
      flex: 1;
      border: 1px solid #444444;
      background: #fafafa;
      padding: 6px 8px;
      height: 90px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
    }
    .sig-label {
      font-size: 8.5px;
      font-weight: 700;
      color: #444444;
      text-transform: uppercase;
    }
    .sig-line {
      border-top: 1px dashed #444444;
      padding-top: 3px;
      font-size: 8.5px;
      font-weight: 700;
    }
    .footer-note {
      text-align: center;
      font-size: 8px;
      color: #555555;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: auto;
      border-top: 1px solid #cccccc;
      padding-top: 4px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="form-frame">
    <!-- HEADER -->
    <div class="header-table">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
        <div style="flex: 1;">
          <div class="org-sub">Statutory Employment & KYC Record</div>
          <div class="org-title">BALAJI RENEW INFRATECH LLP</div>
          <div class="form-title">EMPLOYEE ENROLMENT & REGISTRATION FORM / कर्मचारी नामांकन एवं पंजीकरण प्रपत्र</div>

          <div class="meta-strip">
            <div>
              <span style="color: #666;">Enrolment ID:</span>
              <strong style="font-family: monospace;">${employee.balaji_emp_code || `EMP-${employee.id}`}</strong>
            </div>
            <div>
              <span style="color: #666;">Date:</span>
              <strong>${employee.doj || new Date().toISOString().slice(0, 10)}</strong>
            </div>
            <div>
              <span class="check-box checked">✓</span> <span>New Registration</span>
              <span class="check-box" style="margin-left: 8px;"></span> <span>Data Correction</span>
            </div>
          </div>
        </div>

        <!-- PHOTO BOX -->
        <div class="photo-box">
          ${
            photoSrc
              ? `<img src="${photoSrc}" alt="Employee Photo" />`
              : `<div>Paste Recent Passport Size Photo</div>`
          }
        </div>
      </div>
    </div>

    <!-- 1. EMPLOYMENT PARTICULARS -->
    <div class="section-block">
      <div class="section-title">
        <span>1. Employment Particulars (रोजगार विवरण)</span>
        <span style="font-size: 8px; font-weight: normal; color: #ccc;">Office Use / कार्यालय उपयोग</span>
      </div>
      <div class="grid-row">
        <div class="grid-cell">
          <div class="cell-label">Employee Code (कर्मचारी कोड)</div>
          <div class="cell-value-mono">${employee.balaji_emp_code || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">Department (विभाग)</div>
          <div class="cell-value">${employee.department || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">Designation (पद)</div>
          <div class="cell-value">${employee.designation || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">Skill Category (श्रेणी)</div>
          <div class="cell-value">${employee.category || "Skilled"}</div>
        </div>
      </div>
      <div class="grid-row" style="background: #fafafa;">
        <div class="grid-cell">
          <span class="cell-label" style="display:inline-block; margin-right:4px;">Date of Joining:</span>
          <strong>${employee.doj || "—"}</strong>
        </div>
        <div class="grid-cell">
          <span class="cell-label" style="display:inline-block; margin-right:4px;">Calculation Days:</span>
          <strong>${employee.calculation_days || 30} Days</strong>
        </div>
        <div class="grid-cell">
          <span class="cell-label" style="display:inline-block; margin-right:4px;">Status:</span>
          <strong style="color: #0d6832;">ACTIVE / VERIFIED</strong>
        </div>
      </div>
    </div>

    <!-- 2. PERSONAL DETAILS -->
    <div class="section-block">
      <div class="section-title">
        <span>2. Personal Identity Details (व्यक्तिगत पहचान विवरण)</span>
      </div>
      <div class="grid-row">
        <div class="grid-cell" style="flex: 2;">
          <div class="cell-label">Full Name as per Aadhaar (आधार अनुसार पूरा नाम)</div>
          <div class="cell-value" style="font-size: 11px; text-transform: uppercase;">
            ${employee.salutation ? `${employee.salutation} ` : ""}${employee.name || "—"}
          </div>
        </div>
        <div class="grid-cell" style="text-align: right;">
          <div class="cell-label">Gender (लिंग)</div>
          <div style="margin-top: 2px;">
            <span class="check-box ${sex === "male" ? "checked" : ""}">✓</span> <span>MALE</span>
            <span class="check-box ${sex === "female" ? "checked" : ""}" style="margin-left: 6px;">${sex === "female" ? "✓" : ""}</span> <span>FEMALE</span>
            <span class="check-box ${sex === "other" ? "checked" : ""}" style="margin-left: 6px;">${sex === "other" ? "✓" : ""}</span> <span>OTHER</span>
          </div>
        </div>
      </div>
      <div class="grid-row">
        <div class="grid-cell">
          <div class="cell-label">Father / Husband Name (पिता / पति का नाम)</div>
          <div class="cell-value" style="text-transform: uppercase;">${employee.father_or_husband_name || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">Date of Birth (जन्म तिथि)</div>
          <div class="cell-value-mono">${employee.dob || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">Marital Status (वैवाहिक स्थिति)</div>
          <div class="cell-value">${employee.marital_status || "Not Married"}</div>
        </div>
      </div>
      <div class="grid-row">
        <div class="grid-cell">
          <div class="cell-label">Mobile Number (मोबाइल नंबर)</div>
          <div class="cell-value-mono">${employee.mobile_no || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">Email Address (ईमेल पता)</div>
          <div class="cell-value">${employee.email || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">Nominee Name & Relation (नामित व्यक्ति)</div>
          <div class="cell-value">${employee.nominee_name || "—"} ${employee.nominee_relation ? `(${employee.nominee_relation})` : ""}</div>
        </div>
      </div>
    </div>

    <!-- 3. RESIDENTIAL ADDRESS -->
    <div class="section-block">
      <div class="section-title">
        <span>3. Residential Address Details (निवास का पता)</span>
      </div>
      <div class="grid-row">
        <div class="grid-cell">
          <div class="cell-label">Present Address (वर्तमान पता)</div>
          <div class="cell-value">${currentAddress}</div>
        </div>
      </div>
      <div class="grid-row" style="background: #fafafa;">
        <div class="grid-cell">
          <div class="cell-label">City / Village</div>
          <div class="cell-value">${employee.current_address_city || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">Taluka / Tehsil</div>
          <div class="cell-value">${employee.current_address_taluka || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">State</div>
          <div class="cell-value">${employee.current_address_state || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">PIN Code</div>
          <div class="cell-value-mono">${employee.current_address_pincode || "—"}</div>
        </div>
      </div>
      <div class="grid-row">
        <div class="grid-cell">
          <span class="cell-label" style="display:inline-block; margin-right:4px;">Permanent Address:</span>
          <span>${permanentAddress}</span>
        </div>
      </div>
    </div>

    <!-- 4. STATUTORY IDENTITY & KYC -->
    <div class="section-block">
      <div class="section-title">
        <span>4. Statutory Identity & KYC Numbers (पहचान एवं वैधानिक संख्याएं)</span>
      </div>
      <div class="grid-row">
        <div class="grid-cell">
          <div class="cell-label" style="margin-bottom: 3px;">Aadhaar Card Number (आधार संख्या - 12 Digits):</div>
          <div>
            <span class="digit-box">${adharPadded[0]}</span><span class="digit-box">${adharPadded[1]}</span><span class="digit-box">${adharPadded[2]}</span><span class="digit-box">${adharPadded[3]}</span>
            <span style="font-weight:bold; margin: 0 1px;">-</span>
            <span class="digit-box">${adharPadded[4]}</span><span class="digit-box">${adharPadded[5]}</span><span class="digit-box">${adharPadded[6]}</span><span class="digit-box">${adharPadded[7]}</span>
            <span style="font-weight:bold; margin: 0 1px;">-</span>
            <span class="digit-box">${adharPadded[8]}</span><span class="digit-box">${adharPadded[9]}</span><span class="digit-box">${adharPadded[10]}</span><span class="digit-box">${adharPadded[11]}</span>
          </div>
        </div>
        <div class="grid-cell">
          <div class="cell-label" style="margin-bottom: 3px;">PAN Number (पैन संख्या - 10 Digits):</div>
          <div>
            ${
              employee.pan_number
                ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
                    .map((i) => `<span class="digit-box">${panChars[i]}</span>`)
                    .join("")
                : `<span style="color:#777; font-style:italic;">Not Provided / Not Applicable</span>`
            }
          </div>
        </div>
      </div>
      <div class="grid-row" style="background: #fafafa;">
        <div class="grid-cell">
          <span class="cell-label" style="display:inline-block; margin-right:4px;">UAN (EPFO Universal Account No):</span>
          <strong style="font-family:monospace;">${employee.uan_no || "—"}</strong>
        </div>
        <div class="grid-cell">
          <span class="cell-label" style="display:inline-block; margin-right:4px;">ESIC Insurance Number:</span>
          <strong style="font-family:monospace;">${employee.esic_no || "—"}</strong>
        </div>
      </div>
    </div>

    <!-- 5. BANK ACCOUNT DETAILS -->
    <div class="section-block">
      <div class="section-title">
        <span>5. Bank Account Particulars for Wage Credit (बैंक खाता विवरण)</span>
      </div>
      <div class="grid-row">
        <div class="grid-cell">
          <div class="cell-label">Bank Name (बैंक का नाम)</div>
          <div class="cell-value">${employee.bank_name || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">Account Number (खाता संख्या)</div>
          <div class="cell-value-mono">${employee.account_no || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">IFSC Code (आईएफएससी कोड)</div>
          <div class="cell-value-mono">${employee.ifsc_code || "—"}</div>
        </div>
        <div class="grid-cell">
          <div class="cell-label">Account Holder Name</div>
          <div class="cell-value">${employee.bank_holder_name || employee.name || "—"}</div>
        </div>
      </div>
    </div>

    <!-- 6. WAGE & CTC BREAKDOWN -->
    <div class="section-block">
      <div class="section-title">
        <span>6. Approved Wage Structure & Monthly CTC (वेतन एवं सीटीसी विवरण)</span>
        <span style="font-size: 8px; font-weight: normal; color: #ccc;">All figures in INR (₹)</span>
      </div>
      <table class="wage-table">
        <thead>
          <tr>
            <th>Basic</th>
            <th>HRA</th>
            <th>Bonus</th>
            <th>Leave</th>
            <th style="background:#f0f0f0;">Gross Wages</th>
            <th>PF 13%</th>
            <th>ESIC 3.25%</th>
            <th>Transport</th>
            <th style="background:#e0edff; color:#1e40af;">Total CTC</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>₹${employee.basic ?? 0}</td>
            <td>₹${employee.hra ?? 0}</td>
            <td>₹${employee.bonus ?? 0}</td>
            <td>₹${employee.leave_encashment ?? 0}</td>
            <td style="background:#f8f8f8; font-weight:900;">₹${employee.gross_salary ?? 0}</td>
            <td>₹${employee.pf_13 ?? 0}</td>
            <td>₹${employee.esic_3_25 ?? 0}</td>
            <td>₹${employee.transport ?? 0}</td>
            <td style="background:#e0edff; color:#1e3a8a; font-weight:900;">₹${employee.ctc ?? 0}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 7. DECLARATION & SIGNATURES -->
    <div class="section-block" style="padding: 8px 10px;">
      <div class="cell-label" style="font-size: 9px; color:#000; margin-bottom: 4px;">
        7. Applicant Declaration & Statutory Consent (आवेदक घोषणा एवं सहमति):
      </div>
      <div class="decl-text">
        "I hereby declare that all information and identity credentials furnished above are true, complete and correct
        to the best of my knowledge and belief. I authorize Balaji Renew InfraTech LLP to verify and submit my Aadhaar,
        Bank, PF, and ESIC credentials for official statutory compliance and wage management."
      </div>

      <div class="sig-grid">
        <div class="sig-box">
          <div class="sig-label">Date & Place:</div>
          <div style="font-size: 9px; text-align: left; line-height: 1.6;">
            <div>Date: _______________</div>
            <div>Place: ______________</div>
          </div>
        </div>

        <div class="sig-box">
          <div class="sig-label">Enrollee Sign / Thumb</div>
          <div class="sig-line">
            Signature / Left Thumb of Employee
            <div style="font-size: 7.5px; color: #555;">(कर्मचारी के हस्ताक्षर / अंगूठे का निशान)</div>
          </div>
        </div>

        <div class="sig-box">
          <div class="sig-label">For Balaji Renew InfraTech LLP</div>
          <div class="sig-line">
            Authorized Signatory & Stamp
            <div style="font-size: 7.5px; color: #555;">(अधिकृत हस्ताक्षरकर्ता एवं मुहर)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer-note">
      BALAJI RENEW INFRATECH LLP • CONFIDENTIAL & STATUTORY RECORD • GENERATED VIA SYSTEM PORTAL
    </div>
  </div>

</body>
</html>`;

  // Remove any previously created print iframe
  const oldIframe = document.getElementById("aadhaar-print-iframe");
  if (oldIframe) {
    oldIframe.remove();
  }

  // Create an invisible iframe attached to current page
  const iframe = document.createElement("iframe");
  iframe.id = "aadhaar-print-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  };

  iframe.onload = triggerPrint;
  setTimeout(triggerPrint, 300);
}

export const printAadhaarForm = printForm;

