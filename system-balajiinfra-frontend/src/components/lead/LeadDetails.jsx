import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { Printer, User } from "lucide-react";
import axios from "axios";

const LeadDetails = ({ open, onClose, leadId, baseApi, token }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !leadId) return;

    const fetchEmployee = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${baseApi.replace(/\/$/, "")}/lead/employee-details/${leadId}/`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        setEmployee(response.data);
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          String(err)
        );
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [open, leadId, baseApi, token]);

  if (!open) return null;

  const renderAadhaarBoxes = (val) => {
    const digits = String(val || "").replace(/[^0-9]/g, "");
    const padded = digits.padEnd(12, " ");
    return (
      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
        <div className="flex gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="inline-flex items-center justify-center w-4.5 h-4.5 border border-slate-700 bg-slate-50 text-slate-900 font-bold"
            >
              {padded[i] || ""}
            </span>
          ))}
        </div>
        <span className="text-slate-600 font-bold">-</span>
        <div className="flex gap-0.5">
          {[4, 5, 6, 7].map((i) => (
            <span
              key={i}
              className="inline-flex items-center justify-center w-4.5 h-4.5 border border-slate-700 bg-slate-50 text-slate-900 font-bold"
            >
              {padded[i] || ""}
            </span>
          ))}
        </div>
        <span className="text-slate-600 font-bold">-</span>
        <div className="flex gap-0.5">
          {[8, 9, 10, 11].map((i) => (
            <span
              key={i}
              className="inline-flex items-center justify-center w-4.5 h-4.5 border border-slate-700 bg-slate-50 text-slate-900 font-bold"
            >
              {padded[i] || ""}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderPanBoxes = (val) => {
    const chars = String(val || "").trim().toUpperCase();
    const padded = chars.padEnd(10, " ");
    return (
      <div className="flex gap-0.5 font-mono text-[11px] font-bold">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <span
            key={i}
            className="inline-flex items-center justify-center w-4.5 h-4.5 border border-slate-700 bg-slate-50 text-slate-900 font-bold"
          >
            {padded[i] || ""}
          </span>
        ))}
      </div>
    );
  };

  const Checkbox = ({ checked, label }) => (
    <span className="inline-flex items-center gap-1 mr-3 text-[11px] text-slate-900">
      <span
        className={`inline-flex items-center justify-center w-3.5 h-3.5 border border-slate-800 text-[10px] font-bold ${
          checked ? "bg-slate-900 text-white" : "bg-white"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      <span>{label}</span>
    </span>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto">
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #aadhaar-enrolment-print-area, #aadhaar-enrolment-print-area * {
            visibility: visible !important;
          }
          #aadhaar-enrolment-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm 6mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 10px !important;
            line-height: 1.25 !important;
            box-shadow: none !important;
            border: 1.5px solid #000 !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
        }
      `}</style>

      <div className="bg-slate-100 rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto relative flex flex-col">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-300 px-5 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Employee Registration Form (Aadhaar Format)
            </span>
            {employee?.balaji_emp_code && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded">
                {employee.balaji_emp_code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
              title="Print Form via default browser print"
            >
              <Printer size={15} />
              <span>Print Form (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
              title="Close"
            >
              <MdClose size={20} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
            <div>Loading employee registration form…</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Printable Form Sheet (Aadhaar Card Registration Form Design) */}
        {!loading && employee && (
          <div className="p-4 sm:p-6 flex-1 bg-slate-200/50 flex justify-center">
            <div
              id="aadhaar-enrolment-print-area"
              className="bg-white border-2 border-slate-900 shadow-md w-full max-w-[210mm] p-5 text-slate-900 font-sans text-[11px]"
              style={{ fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif" }}
            >
              {/* HEADER SECTION */}
              <div className="border-b-2 border-slate-900 pb-3 mb-3">
                <div className="flex items-start justify-between gap-4">
                  {/* Left & Center: Titles */}
                  <div className="flex-1">
                    <div className="text-[10px] tracking-widest font-extrabold text-slate-600 uppercase">
                      Statutory Employment & KYC Record
                    </div>
                    <h1 className="text-lg font-black tracking-wide text-slate-950 uppercase mt-0.5">
                      BALAJI RENEW INFRATECH LLP
                    </h1>
                    <div className="text-xs font-bold text-slate-800 uppercase tracking-tight mt-0.5">
                      EMPLOYEE ENROLMENT & REGISTRATION FORM / कर्मचारी नामांकन एवं पंजीकरण प्रपत्र
                    </div>
                    <div className="text-[10px] text-slate-600 italic mt-0.5">
                      (To be maintained as permanent statutory record for PF, ESIC, Wage Management & Statutory KYC)
                    </div>

                    {/* Metadata Strip */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] font-semibold border-t border-slate-300 pt-1.5">
                      <div>
                        <span className="text-slate-500">Enrolment ID: </span>
                        <span className="font-bold font-mono">
                          {employee.balaji_emp_code || `EMP-${employee.id}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Date: </span>
                        <span className="font-bold">
                          {employee.doj || new Date().toISOString().slice(0, 10)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Type: </span>
                        <Checkbox checked={true} label="New Registration" />
                        <Checkbox checked={false} label="Data Correction" />
                      </div>
                    </div>
                  </div>

                  {/* Right: Passport Photo Box */}
                  <div className="w-[105px] h-[130px] border-2 border-dashed border-slate-700 bg-slate-50 flex flex-col items-center justify-center p-1 text-center shrink-0">
                    {employee.photo ? (
                      <img
                        src={
                          employee.photo.startsWith("http")
                            ? employee.photo
                            : `${baseApi.replace(/\/$/, "")}${
                                employee.photo.startsWith("/") ? "" : "/"
                              }${employee.photo}`
                        }
                        alt="Employee Photo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-1">
                        <User size={28} className="text-slate-300 mb-1" />
                        <span className="text-[8px] leading-tight font-bold uppercase text-slate-500">
                          Paste Recent Passport Size Photo
                        </span>
                        <span className="text-[7px] text-slate-400 mt-1">
                          (Do not staple)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 1. EMPLOYMENT PARTICULARS */}
              <div className="mb-3 border border-slate-800">
                <div className="bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider flex justify-between">
                  <span>1. Employment Particulars (रोजगार विवरण)</span>
                  <span className="text-[9px] font-normal text-slate-300">Office Use / कार्यालय उपयोग</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-400 text-[10.5px]">
                  <div className="p-1.5">
                    <div className="text-[8.5px] uppercase font-bold text-slate-500">Employee Code (कर्मचारी कोड)</div>
                    <div className="font-bold font-mono text-slate-900">{employee.balaji_emp_code || "—"}</div>
                  </div>
                  <div className="p-1.5">
                    <div className="text-[8.5px] uppercase font-bold text-slate-500">Department (विभाग)</div>
                    <div className="font-semibold text-slate-900">{employee.department || "—"}</div>
                  </div>
                  <div className="p-1.5">
                    <div className="text-[8.5px] uppercase font-bold text-slate-500">Designation (पद)</div>
                    <div className="font-semibold text-slate-900">{employee.designation || "—"}</div>
                  </div>
                  <div className="p-1.5">
                    <div className="text-[8.5px] uppercase font-bold text-slate-500">Skill Category (श्रेणी)</div>
                    <div className="font-semibold text-slate-900">{employee.category || "Skilled"}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-400 border-t border-slate-400 text-[10.5px] bg-slate-50/70">
                  <div className="p-1.5">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 mr-2">Date of Joining:</span>
                    <span className="font-semibold text-slate-900">{employee.doj || "—"}</span>
                  </div>
                  <div className="p-1.5">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 mr-2">Calculation Days:</span>
                    <span className="font-semibold text-slate-900">{employee.calculation_days || 30} Days</span>
                  </div>
                  <div className="p-1.5">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 mr-2">Status:</span>
                    <span className="font-semibold text-emerald-800 uppercase">Active / Verified</span>
                  </div>
                </div>
              </div>

              {/* 2. PERSONAL DETAILS */}
              <div className="mb-3 border border-slate-800">
                <div className="bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider">
                  2. Personal Identity Details (व्यक्तिगत पहचान विवरण)
                </div>
                <div className="divide-y divide-slate-400 text-[10.5px]">
                  {/* Name Row */}
                  <div className="p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">
                        Full Name as per Aadhaar (आधार अनुसार पूरा नाम):
                      </span>
                      <span className="text-xs font-black uppercase tracking-wide text-slate-950">
                        {employee.salutation ? `${employee.salutation} ` : ""}
                        {employee.name}
                      </span>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Gender (लिंग):</span>
                      <div className="mt-0.5">
                        <Checkbox checked={String(employee.sex).toLowerCase() === "male"} label="MALE" />
                        <Checkbox checked={String(employee.sex).toLowerCase() === "female"} label="FEMALE" />
                        <Checkbox checked={String(employee.sex).toLowerCase() === "other"} label="OTHER" />
                      </div>
                    </div>
                  </div>

                  {/* Father/Husband & Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-400">
                    <div className="p-1.5">
                      <div className="text-[8.5px] uppercase font-bold text-slate-500">Father / Husband Name (पिता / पति का नाम)</div>
                      <div className="font-semibold uppercase">{employee.father_or_husband_name || "—"}</div>
                    </div>
                    <div className="p-1.5">
                      <div className="text-[8.5px] uppercase font-bold text-slate-500">Date of Birth (जन्म तिथि)</div>
                      <div className="font-semibold font-mono">{employee.dob || "—"}</div>
                    </div>
                    <div className="p-1.5">
                      <div className="text-[8.5px] uppercase font-bold text-slate-500">Marital Status (वैवाहिक स्थिति)</div>
                      <div className="font-semibold">{employee.marital_status || "Not Married"}</div>
                    </div>
                  </div>

                  {/* Contacts & Nominee */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-400">
                    <div className="p-1.5">
                      <div className="text-[8.5px] uppercase font-bold text-slate-500">Mobile Number (मोबाइल नंबर)</div>
                      <div className="font-bold font-mono text-slate-900">{employee.mobile_no || "—"}</div>
                    </div>
                    <div className="p-1.5">
                      <div className="text-[8.5px] uppercase font-bold text-slate-500">Email Address (ईमेल पता)</div>
                      <div className="font-medium text-slate-800">{employee.email || "—"}</div>
                    </div>
                    <div className="p-1.5">
                      <div className="text-[8.5px] uppercase font-bold text-slate-500">Nominee Name & Relation (नामित व्यक्ति)</div>
                      <div className="font-semibold text-slate-900">
                        {employee.nominee_name || "—"}{" "}
                        {employee.nominee_relation ? `(${employee.nominee_relation})` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. RESIDENTIAL ADDRESS */}
              <div className="mb-3 border border-slate-800">
                <div className="bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider">
                  3. Residential Address Details (निवास का पता)
                </div>
                <div className="divide-y divide-slate-400 text-[10.5px]">
                  <div className="p-2">
                    <div className="text-[8.5px] uppercase font-bold text-slate-500">Current / Present Address (वर्तमान पता)</div>
                    <div className="font-medium text-slate-900 mt-0.5">
                      {[
                        employee.current_address_line1,
                        employee.current_address_line2,
                        employee.current_address_city,
                        employee.current_address_taluka,
                        employee.current_address_state,
                        employee.current_address_pincode ? `PIN: ${employee.current_address_pincode}` : "",
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 divide-x divide-slate-400 bg-slate-50/70 text-[10px]">
                    <div className="p-1.5">
                      <span className="text-slate-500 font-bold uppercase text-[8.5px] block">City / Village</span>
                      <span className="font-semibold">{employee.current_address_city || "—"}</span>
                    </div>
                    <div className="p-1.5">
                      <span className="text-slate-500 font-bold uppercase text-[8.5px] block">Taluka / Tehsil</span>
                      <span className="font-semibold">{employee.current_address_taluka || "—"}</span>
                    </div>
                    <div className="p-1.5">
                      <span className="text-slate-500 font-bold uppercase text-[8.5px] block">State</span>
                      <span className="font-semibold">{employee.current_address_state || "—"}</span>
                    </div>
                    <div className="p-1.5">
                      <span className="text-slate-500 font-bold uppercase text-[8.5px] block">PIN Code</span>
                      <span className="font-bold font-mono">{employee.current_address_pincode || "—"}</span>
                    </div>
                  </div>
                  <div className="p-1.5 text-[10px]">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 mr-2">Permanent Address:</span>
                    <span className="font-medium text-slate-800">
                      {employee.is_permanent_same_as_current
                        ? "Same as Present Address (वर्तमान पते के समान)"
                        : [
                            employee.permanent_address_line1,
                            employee.permanent_address_city,
                            employee.permanent_address_state,
                            employee.permanent_address_pincode,
                          ]
                            .filter(Boolean)
                            .join(", ") || "Same as Present Address"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. STATUTORY IDENTITY & KYC NUMBERS */}
              <div className="mb-3 border border-slate-800">
                <div className="bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider">
                  4. Statutory Identity & KYC Numbers (पहचान एवं वैधानिक संख्याएं)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-400 text-[10.5px]">
                  {/* Aadhaar Box */}
                  <div className="p-2">
                    <div className="text-[8.5px] uppercase font-bold text-slate-600 mb-1">
                      Aadhaar Card Number (आधार संख्या - 12 Digits):
                    </div>
                    <div className="mt-1">{renderAadhaarBoxes(employee.adhar_no)}</div>
                  </div>

                  {/* PAN Card Box */}
                  <div className="p-2">
                    <div className="text-[8.5px] uppercase font-bold text-slate-600 mb-1">
                      Permanent Account Number - PAN (पैन संख्या - 10 Digits):
                    </div>
                    <div className="mt-1">
                      {employee.pan_number ? (
                        renderPanBoxes(employee.pan_number)
                      ) : (
                        <span className="text-slate-400 font-mono italic text-[10px]">Not Provided / Not Applicable</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* EPFO & ESIC Row */}
                <div className="grid grid-cols-2 divide-x divide-slate-400 border-t border-slate-400 text-[10.5px] bg-slate-50/70">
                  <div className="p-1.5 flex items-center justify-between">
                    <span className="text-[8.5px] uppercase font-bold text-slate-600">
                      UAN (EPFO Universal Account No):
                    </span>
                    <span className="font-bold font-mono text-slate-900">{employee.uan_no || "—"}</span>
                  </div>
                  <div className="p-1.5 flex items-center justify-between">
                    <span className="text-[8.5px] uppercase font-bold text-slate-600">
                      ESIC Insurance Number:
                    </span>
                    <span className="font-bold font-mono text-slate-900">{employee.esic_no || "—"}</span>
                  </div>
                </div>
              </div>

              {/* 5. BANK ACCOUNT DETAILS */}
              <div className="mb-3 border border-slate-800">
                <div className="bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider">
                  5. Bank Account Particulars for Wage Credit (बैंक खाता विवरण)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-400 text-[10.5px]">
                  <div className="p-1.5">
                    <div className="text-[8.5px] uppercase font-bold text-slate-500">Bank Name (बैंक का नाम)</div>
                    <div className="font-semibold text-slate-900">{employee.bank_name || "—"}</div>
                  </div>
                  <div className="p-1.5">
                    <div className="text-[8.5px] uppercase font-bold text-slate-500">Account Number (खाता संख्या)</div>
                    <div className="font-bold font-mono text-slate-950">{employee.account_no || "—"}</div>
                  </div>
                  <div className="p-1.5">
                    <div className="text-[8.5px] uppercase font-bold text-slate-500">IFSC Code (आईएफएससी कोड)</div>
                    <div className="font-bold font-mono text-slate-950">{employee.ifsc_code || "—"}</div>
                  </div>
                  <div className="p-1.5">
                    <div className="text-[8.5px] uppercase font-bold text-slate-500">Account Holder Name</div>
                    <div className="font-medium text-slate-900">{employee.bank_holder_name || employee.name}</div>
                  </div>
                </div>
              </div>

              {/* 6. MONTHLY WAGE & STATUTORY CTC BREAKDOWN */}
              <div className="mb-4 border border-slate-800">
                <div className="bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 uppercase tracking-wider flex justify-between">
                  <span>6. Approved Wage Structure & Monthly CTC (वेतन एवं सीटीसी विवरण)</span>
                  <span className="text-[9px] font-normal text-slate-300">All figures in INR (₹)</span>
                </div>
                <table className="w-full text-center border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-400 text-[9px] uppercase font-bold text-slate-700">
                      <th className="p-1 border-r border-slate-400">Basic</th>
                      <th className="p-1 border-r border-slate-400">HRA</th>
                      <th className="p-1 border-r border-slate-400">Bonus</th>
                      <th className="p-1 border-r border-slate-400">Leave</th>
                      <th className="p-1 border-r border-slate-400 bg-slate-200">Gross Salary</th>
                      <th className="p-1 border-r border-slate-400">PF 13%</th>
                      <th className="p-1 border-r border-slate-400">ESIC 3.25%</th>
                      <th className="p-1 border-r border-slate-400">Transport</th>
                      <th className="p-1 bg-blue-50 font-black text-blue-900">Total CTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-mono font-bold text-slate-900 divide-x divide-slate-400">
                      <td className="p-1.5">₹{employee.basic ?? 0}</td>
                      <td className="p-1.5">₹{employee.hra ?? 0}</td>
                      <td className="p-1.5">₹{employee.bonus ?? 0}</td>
                      <td className="p-1.5">₹{employee.leave_encashment ?? 0}</td>
                      <td className="p-1.5 bg-slate-100 font-black text-slate-950">₹{employee.gross_salary ?? 0}</td>
                      <td className="p-1.5">₹{employee.pf_13 ?? 0}</td>
                      <td className="p-1.5">₹{employee.esic_3_25 ?? 0}</td>
                      <td className="p-1.5">₹{employee.transport ?? 0}</td>
                      <td className="p-1.5 bg-blue-50 text-blue-950 font-black">₹{employee.ctc ?? 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 7. DECLARATION & SIGNATURES */}
              <div className="border border-slate-800 p-2 text-[9.5px]">
                <div className="font-bold uppercase text-[9px] text-slate-800 mb-1">
                  7. Applicant Declaration & Statutory Consent (आवेदक घोषणा एवं वैधानिक सहमति):
                </div>
                <p className="text-slate-700 leading-tight italic">
                  "I hereby confirm and declare that all the information, identity credentials, address, and bank details
                  furnished above are true, complete and correct to the best of my knowledge and belief. I authorize Balaji
                  Renew InfraTech LLP to verify and submit my Aadhaar, Bank, PF, and ESIC credentials for official statutory
                  and wage compliance purposes."
                </p>

                {/* Signature Boxes Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-2 border-t border-slate-300">
                  {/* Date & Place */}
                  <div className="border border-slate-400 p-2 flex flex-col justify-between h-[68px] bg-slate-50/50">
                    <div className="text-[8.5px] font-bold text-slate-600 uppercase">Verification Date & Place:</div>
                    <div className="text-[9px] font-medium text-slate-800 space-y-1">
                      <div>Date: ____________________</div>
                      <div>Place: ___________________</div>
                    </div>
                  </div>

                  {/* Employee Signature Box */}
                  <div className="border border-slate-400 p-2 flex flex-col justify-between text-center h-[68px] bg-slate-50/50">
                    <div className="text-[8px] font-bold text-slate-500 uppercase">Enrollee Sign / Thumb Impression</div>
                    <div className="border-t border-dashed border-slate-500 pt-1 text-[8.5px] font-bold text-slate-800">
                      Signature / Left Thumb of Employee
                      <div className="text-[7.5px] text-slate-500">(कर्मचारी के हस्ताक्षर / अंगूठे का निशान)</div>
                    </div>
                  </div>

                  {/* Employer / HR Stamp Box */}
                  <div className="border border-slate-400 p-2 flex flex-col justify-between text-center h-[68px] bg-slate-50/50">
                    <div className="text-[8px] font-bold text-slate-500 uppercase">For Balaji Renew InfraTech LLP</div>
                    <div className="border-t border-dashed border-slate-500 pt-1 text-[8.5px] font-bold text-slate-800">
                      Authorized Signatory & Stamp
                      <div className="text-[7.5px] text-slate-500">(अधिकृत हस्ताक्षरकर्ता एवं मुहर)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER BAR */}
              <div className="mt-2 text-center text-[8px] text-slate-500 uppercase tracking-widest border-t border-slate-300 pt-1">
                BALAJI RENEW INFRATECH LLP • CONFIDENTIAL & STATUTORY RECORD • GENERATED VIA SYSTEM PORTAL
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadDetails;