import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Base from "../components/Base";
import TableView from "../components/TableView";
import { MdEdit, MdDelete, MdAdd } from "react-icons/md";
import { Upload, Download, Trash2, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import RegisterEmployee from "../components/employee/RegisterEmployee";
import { printForm } from "../utils/printForm";

export default function Employees() {
  const location = useLocation();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const API_URL = `${BASE_API.replace(/\/$/, "")}/payroll/employee-details/`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [error, setError] = useState(null);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  const [showRegister, setShowRegister] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  // Redirection & Row Highlighting from Dashboard
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialHighlightName = searchParams.get("highlight") || location.state?.highlightName || "";
  const initialHighlightCode = searchParams.get("code") || location.state?.highlightCode || "";

  const [highlightedName, setHighlightedName] = useState(initialHighlightName);
  const [highlightedCode, setHighlightedCode] = useState(initialHighlightCode);

  useEffect(() => {
    const qName = searchParams.get("highlight") || location.state?.highlightName || "";
    const qCode = searchParams.get("code") || location.state?.highlightCode || "";
    if (qName) setHighlightedName(qName);
    if (qCode) setHighlightedCode(qCode);
  }, [location, searchParams]);

  // Auto-scroll to highlighted row when data finishes loading
  useEffect(() => {
    if ((highlightedName || highlightedCode) && rows.length > 0 && !loading) {
      const timer = setTimeout(() => {
        const el = document.getElementById("highlighted-employee-row");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [highlightedName, highlightedCode, rows, loading]);

  const getRowClassName = useCallback(
    (row) => {
      if (!highlightedName && !highlightedCode) return "";
      const cleanRowName = (row.name || "").trim().toLowerCase();
      const cleanHighlight = (highlightedName || "").trim().toLowerCase();
      const cleanRowCode = (row.balaji_emp_code || "").trim().toLowerCase().replace(/\\/g, "");
      const cleanHighlightCode = (highlightedCode || "").trim().toLowerCase().replace(/\\/g, "");

      const isMatch =
        (cleanHighlight &&
          (cleanRowName === cleanHighlight ||
            cleanRowName.includes(cleanHighlight) ||
            cleanHighlight.includes(cleanRowName))) ||
        (cleanHighlightCode &&
          cleanRowCode &&
          (cleanRowCode === cleanHighlightCode ||
            cleanRowCode.includes(cleanHighlightCode) ||
            cleanHighlightCode.includes(cleanRowCode)));

      return isMatch
        ? "!bg-gray-200 hover:!bg-gray-200/95 border-l-4 border-slate-700 font-bold text-slate-900 shadow-2xs"
        : "";
    },
    [highlightedName, highlightedCode]
  );

  useEffect(() => {
    if (location.state?.showRegister) {
      setShowRegister(true);
      if (location.state?.registerInitialData || location.state?.initialData) {
        setEditingLead(location.state.registerInitialData || location.state.initialData);
      }
    }
  }, [location.state]);

  const token = useMemo(
    () =>
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "",
    []
  );

  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        if (!token) throw new Error("No bearer token found in localStorage.");

        const params = new URLSearchParams();
        params.set("page", String(page));

        const url = `${API_URL}?${params.toString()}`;

        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText}${body ? " — " + body : ""}`);
        }

        const data = await res.json();

        if (data && Array.isArray(data.results)) {
          setRows(data.results);
          const count = Number.isFinite(data.count) ? data.count : data.results.length || 0;
          setTotalCount(count);
          const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
          setTotalPages(pages);
          setCurrentPage(page);
        } else if (Array.isArray(data)) {
          setRows(data);
          setTotalCount(data.length);
          setTotalPages(Math.max(1, Math.ceil(data.length / PAGE_SIZE)));
          setCurrentPage(1);
        } else {
          throw new Error("Unexpected employee response shape");
        }
      } catch (err) {
        setError(err.message || String(err));
        setRows([]);
        setTotalCount(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [token, API_URL]
  );

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Delete Employee?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!res.isConfirmed) return;

    try {
      const resp = await fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`${resp.status} ${resp.statusText} — ${text}`);
      }
      Swal.fire({
        icon: "success",
        text: "Employee data deleted",
        timer: 1000,
        showConfirmButton: false,
      });
      fetchData(currentPage);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: err.message || String(err),
      });
    }
  };

  // Delete All Employee Records
  const handleDeleteAll = async () => {
    const totalRecords = totalCount || rows.length;
    if (totalRecords === 0) {
      Swal.fire({
        icon: "info",
        title: "No Records",
        text: "There are no employee records to delete.",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Delete All Records?",
      text: `Are you sure you want to permanently delete all ${totalRecords} employee record(s)? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete all records",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingAll(true);
      const res = await fetch(`${BASE_API.replace(/\/$/, "")}/payroll/employee-details/delete-all/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Delete failed with status ${res.status}`);
      }

      const resData = await res.json();
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: resData.detail || "All employee records have been deleted successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      setCurrentPage(1);
      fetchData(1);
    } catch (err) {
      console.error("Delete all error:", err);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: err.message || "Failed to delete employee records.",
      });
    } finally {
      setDeletingAll(false);
    }
  };

  // Download Sample Employee Excel Template
  const handleDownloadTemplate = () => {
    const headers = [
      "BALAJI EMP Code",
      "NAME",
      "FATHER NAME",
      "SEX",
      "ADD.",
      "DOB",
      "DOJ",
      "ADHAR NO.",
      "BANK NAME",
      "A/C NO.",
      "IFSC CODE.",
      "UAN No.",
      "ESIC NO",
      "MOBILE NO",
      "NOMINEE NAME",
      "Department",
      "Designation",
      "CATEGORY",
      "Company",
      "Basic",
      "HRA",
      "CCA / Site Allowance",
      "Attendance Bonus",
      "BONUS",
      "Leave Encashment",
      "Gross Salary",
      "PF",
      "Transport",
      "Calculation Days",
    ];

    const sampleRow = [
      "B001",
      "Rahul Kumar Sharma",
      "Shri Ram Sharma",
      "Male",
      "Plot No. 12, Industrial Area, Surat, Gujarat",
      "1995-05-15",
      "2023-01-01",
      "123456789012",
      "State Bank of India",
      "12345678901",
      "SBIN0001234",
      "101234567890",
      "3123456789",
      "9876543210",
      "Sunita Sharma",
      "Production",
      "Operator",
      "Skilled",
      "Vedant",
      15000,
      750,
      0,
      0,
      1249.5,
      750,
      17749.5,
      1950,
      1500,
      27,
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees_Template");
    XLSX.writeFile(wb, "Employee_Import_Template.xlsx");
  };

  // Direct 1-Click Excel File Import Handler
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        
        // Find best sheet: prefer "Details", "Master", "Employees", or first sheet
        let selectedSheetName = workbook.SheetNames[0];
        for (const sName of workbook.SheetNames) {
          const lower = sName.toLowerCase();
          if (lower.includes("detail") || lower.includes("master") || lower.includes("employee")) {
            selectedSheetName = sName;
            break;
          }
        }

        const sheet = workbook.Sheets[selectedSheetName];
        const rowsJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (!rowsJson || rowsJson.length < 2) {
          Swal.fire({
            icon: "warning",
            title: "Empty File",
            text: "The selected Excel file has no employee data rows.",
          });
          setImporting(false);
          return;
        }

        // Detect header row by scanning for recognizable columns
        let headerIdx = -1;
        for (let i = 0; i < Math.min(15, rowsJson.length); i++) {
          const rowText = rowsJson[i].map((c) => String(c).toLowerCase()).join(" ");
          if (
            (rowText.includes("first name") || rowText.includes("name") || rowText.includes("emp code")) &&
            (rowText.includes("biometric") || rowText.includes("emp") || rowText.includes("employee id") || rowText.includes("adhar") || rowText.includes("bank"))
          ) {
            headerIdx = i;
            break;
          }
        }

        if (headerIdx === -1) {
          // Fallback simple search
          for (let i = 0; i < Math.min(15, rowsJson.length); i++) {
            const rowText = rowsJson[i].map((c) => String(c).toLowerCase()).join(" ");
            if (rowText.includes("name") || rowText.includes("code") || rowText.includes("adhar")) {
              headerIdx = i;
              break;
            }
          }
        }

        if (headerIdx === -1) headerIdx = 0;

        const headers = rowsJson[headerIdx].map((h) => String(h || "").trim().toLowerCase());
        const clean = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

        const getCol = (targetNames) => {
          // 1st pass: exact clean match
          for (const t of targetNames) {
            const cleanT = clean(t);
            const idx = headers.findIndex((h) => clean(h) === cleanT);
            if (idx !== -1) return idx;
          }
          // 2nd pass: contains match
          for (const t of targetNames) {
            const cleanT = clean(t);
            const idx = headers.findIndex((h) => clean(h).includes(cleanT));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const colBiometric = getCol(["current biometric id", "biometric id", "biometric"]);
        const colEmpId = getCol(["balaji emp code", "employee code", "emp code", "employee id", "code"]);
        const colSalutation = getCol(["salutation", "title"]);
        const colFirstName = getCol(["first name", "firstname"]);
        const colMiddleName = getCol(["middle name", "middlename"]);
        const colLastName = getCol(["last name", "lastname", "surname"]);
        const colFullName = getCol(["employee name", "emp name", "full name", "name"]);
        const colFatherName = getCol(["father name", "father / husband name", "father"]);
        const colGender = getCol(["gender", "sex"]);
        const colDob = getCol(["date of birth", "dob", "birth"]);
        const colDoj = getCol(["date of join", "date of joining", "doj", "joining"]);
        const colLocation = getCol(["job location", "location", "company", "company name"]);
        const colDept = getCol(["department", "dept"]);
        const colDesig = getCol(["designation", "desig", "role"]);
        const colCategory = getCol(["paygradematrix", "grade", "category", "skill category", "skill"]);
        const colUan = getCol(["pf uan", "uan no", "uan"]);
        const colEsic = getCol(["esic no", "esic"]);
        const colPan = getCol(["pan number", "pan no", "pan"]);
        const colAdhar = getCol(["aadhar number", "aadhar no", "adhar no", "aadhar", "adhar", "uid"]);
        const colMobile = getCol(["mobile number", "mobile no", "mobile", "phone", "contact"]);
        const colEmail = getCol(["email", "email id", "email address", "mail"]);
        const colMarital = getCol(["marital status", "marital"]);
        const colEmergPerson = getCol(["emergency contact person", "emergency contact name", "nominee name", "nominee"]);
        const colEmergNo = getCol(["emergency contact no", "emergency contact number", "emergency no"]);
        const colBlood = getCol(["blood group", "blood"]);
        const colGrade = getCol(["grade"]);
        const colEmpType = getCol(["employee type"]);
        const colWorkHr = getCol(["working hr per day", "working hr", "working hours"]);
        const colHolidayGroup = getCol(["holiday group"]);
        const colWeekOff = getCol(["week off defination", "week off definition", "week off"]);
        const colShift = getCol(["current shift", "shift"]);
        const colLin = getCol(["lin number", "lin"]);
        const colReporting = getCol(["reporting to", "reporting"]);
        const colQual = getCol(["qualification", "degree"]);
        
        // Current Address
        const colCurrAdd1 = getCol(["current address line 1", "current address line1", "current address", "add.", "address"]);
        const colCurrAdd2 = getCol(["current address line 2", "current address line2"]);
        const colCurrCity = getCol(["current address city", "current city"]);
        const colCurrState = getCol(["current address state", "current state"]);
        const colCurrPin = getCol(["current address pincode", "current pincode"]);

        // Permanent Address
        const colPermAdd1 = getCol(["permanent address line 1", "permanent address line1", "permanent address"]);
        const colPermAdd2 = getCol(["permanent address line 2", "permanent address line2"]);
        const colPermCity = getCol(["permanent address city", "permanent city"]);
        const colPermState = getCol(["permanent state", "permanent address state"]);
        const colPermPin = getCol(["permanent address pincode", "permanent pincode"]);

        // Bank Details
        const colBank = getCol(["bank name", "bank"]);
        const colAcc = getCol(["bank account number", "account number", "a/c no", "account no"]);
        const colIfsc = getCol(["bank ifsc code", "ifsc code", "ifsc"]);
        const colBankHolder = getCol(["employee name in bank", "bank holder name", "holder name"]);

        // Salary rate fields (if present in wage sheets)
        const colBasic = getCol(["basic", "basic rate"]);
        const colHra = getCol(["hra"]);
        const colCca = getCol(["cca / site allowance", "cca", "site allowance"]);
        const colAttBonus = getCol(["attendance bonus"]);
        const colBonus = getCol(["bonus"]);
        const colLeave = getCol(["leave encashment"]);
        const colGross = getCol(["gross salary", "gross"]);
        const colPf13 = getCol(["pf 13%", "pf (er)", "pf", "provident fund"]);
        const colTransport = getCol(["transport"]);
        const colEsic325 = getCol(["esic 3.25%", "esic (er)"]);
        const colUniform = getCol(["uniform/shoes", "uniform"]);
        const colServices = getCol(["services 7%", "admin charge"]);
        const colCtc = getCol(["ctc"]);
        const colCalcDays = getCol(["calculation days", "days"]);

        const parseDateVal = (raw) => {
          if (!raw) return null;
          if (raw instanceof Date) {
            return !isNaN(raw.getTime()) ? raw.toISOString().split("T")[0] : null;
          }
          if (typeof raw === "number") {
            const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
            return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : null;
          }
          const s = String(raw).trim();
          if (!s) return null;

          // dd.mm.yyyy, dd/mm/yyyy, dd-mm-yyyy
          const dm = s.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
          if (dm) {
            return `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
          }

          // yyyy-mm-dd, yyyy/mm/dd
          const ym = s.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})$/);
          if (ym) {
            return `${ym[1]}-${ym[2].padStart(2, "0")}-${ym[3].padStart(2, "0")}`;
          }

          // Typo dates like 10/121988
          const typo = s.match(/^(\d{1,2})[\.\/\-]?(\d{2})(\d{4})$/);
          if (typo) {
            return `${typo[3]}-${typo[2].padStart(2, "0")}-${typo[1].padStart(2, "0")}`;
          }

          return s || null;
        };

        const parseNum = (val) => {
          if (val === "" || val === null || val === undefined) return 0;
          const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
          return isNaN(num) ? 0 : num;
        };

        const employees = [];

        for (let i = headerIdx + 1; i < rowsJson.length; i++) {
          const r = rowsJson[i];
          if (!r || r.length === 0) continue;

          const fName = colFirstName !== -1 ? String(r[colFirstName] || "").trim() : "";
          const mName = colMiddleName !== -1 ? String(r[colMiddleName] || "").trim() : "";
          const lName = colLastName !== -1 ? String(r[colLastName] || "").trim() : "";
          const rawFullName = colFullName !== -1 ? String(r[colFullName] || "").trim() : "";
          const bankHolder = colBankHolder !== -1 ? String(r[colBankHolder] || "").trim() : "";

          let nameVal = [fName, mName, lName].filter(Boolean).join(" ");
          if (!nameVal) nameVal = rawFullName || bankHolder;
          nameVal = nameVal.replace(/\s+/g, " ").trim();

          const bioVal = colBiometric !== -1 ? String(r[colBiometric] || "").trim() : "";
          const empIdVal = colEmpId !== -1 ? String(r[colEmpId] || "").trim() : "";
          const empCodeVal = bioVal || empIdVal;

          if (!nameVal && !empCodeVal) continue;
          if (nameVal.toLowerCase().includes("emp name") || nameVal.toLowerCase().includes("total")) continue;

          // Resolve Father / Husband Name
          let fatherName = colFatherName !== -1 ? String(r[colFatherName] || "").trim() : "";
          if (!fatherName && mName) fatherName = mName;
          if (!fatherName && colEmergPerson !== -1) fatherName = String(r[colEmergPerson] || "").trim();

          // Resolve Gender
          let sexVal = colGender !== -1 ? String(r[colGender] || "").trim().toLowerCase() : "male";
          const sex = sexVal.includes("female") || sexVal.includes("2") ? "Female" : "Male";

          // Resolve Department & Designation & Category & Company (strip numeric codes like '4 Production')
          let rawDept = colDept !== -1 ? String(r[colDept] || "").trim() : "";
          rawDept = rawDept.replace(/^\d+\s*/, "");

          let rawDesig = colDesig !== -1 ? String(r[colDesig] || "").trim() : "";
          rawDesig = rawDesig.replace(/^\d+\s*/, "");

          let rawCat = colCategory !== -1 ? String(r[colCategory] || "").trim() : "Skilled";
          rawCat = rawCat.replace(/^\d+\s*/, "");
          if (/semiskill/i.test(rawCat)) rawCat = "Semi-Skilled";
          else if (/unskill/i.test(rawCat)) rawCat = "Unskilled";
          else if (/skill/i.test(rawCat)) rawCat = "Skilled";

          let rawLoc = colLocation !== -1 ? String(r[colLocation] || "").trim() : "";
          rawLoc = rawLoc.replace(/^\d+\s*/, "");

          let rawMarital = colMarital !== -1 ? String(r[colMarital] || "").trim().toUpperCase() : "";
          let maritalStatus = "Not Married";
          if (rawMarital === "MARRIED" || rawMarital === "YES") maritalStatus = "Married";

          const qualVal = colQual !== -1 ? String(r[colQual] || "").trim() : "";
          const resolvedQual = qualVal || (["ITI", "12TH", "DIPLOMA", "GRADUATE"].some(q => rawDesig.toUpperCase().includes(q)) ? rawDesig : "");

          const remarksList = [
            colGrade !== -1 && r[colGrade] ? `Grade: ${String(r[colGrade]).trim()}` : null,
            colEmpType !== -1 && r[colEmpType] ? `Type: ${String(r[colEmpType]).trim()}` : null,
            colWorkHr !== -1 && r[colWorkHr] ? `Working Hr: ${String(r[colWorkHr]).trim()}` : null,
            colHolidayGroup !== -1 && r[colHolidayGroup] ? `Holiday Group: ${String(r[colHolidayGroup]).trim()}` : null,
            colWeekOff !== -1 && r[colWeekOff] ? `Week Off: ${String(r[colWeekOff]).trim()}` : null,
            colShift !== -1 && r[colShift] ? `Shift: ${String(r[colShift]).trim()}` : null,
            colBlood !== -1 && r[colBlood] ? `Blood: ${String(r[colBlood]).trim()}` : null,
            colLin !== -1 && r[colLin] ? `LIN: ${String(r[colLin]).trim()}` : null,
            colReporting !== -1 && r[colReporting] ? `Reporting: ${String(r[colReporting]).trim()}` : null,
          ].filter(Boolean);

          const remark = remarksList.join(" | ") || undefined;

          const curr1 = colCurrAdd1 !== -1 ? String(r[colCurrAdd1] || "").trim() : "";
          const perm1 = colPermAdd1 !== -1 ? String(r[colPermAdd1] || "").trim() : "";
          const isPermSame = Boolean(curr1 && perm1 && curr1.toLowerCase() === perm1.toLowerCase());

          // Calculate or fallback salary fields
          const calcDays = colCalcDays !== -1 ? parseInt(r[colCalcDays]) || 27 : 27;
          let basic = parseNum(colBasic !== -1 ? r[colBasic] : 0);
          if (basic <= 0) {
            if (rawCat === "Unskilled") basic = 12519;
            else if (rawCat === "Semi-Skilled") basic = 13879;
            else basic = 15239;
          }

          let hra = parseNum(colHra !== -1 ? r[colHra] : 0);
          if (hra <= 0) hra = parseFloat((basic * 0.05).toFixed(2));

          const cca = parseNum(colCca !== -1 ? r[colCca] : 0);
          const attBonus = parseNum(colAttBonus !== -1 ? r[colAttBonus] : 0);

          let bonus = parseNum(colBonus !== -1 ? r[colBonus] : 0);
          if (bonus <= 0) bonus = parseFloat((basic * 0.0833).toFixed(2));

          let leave = parseNum(colLeave !== -1 ? r[colLeave] : 0);
          if (leave <= 0) leave = parseFloat((basic * 0.05).toFixed(2));

          const rawGross = parseNum(colGross !== -1 ? r[colGross] : 0);
          const calcGross = parseFloat((basic + hra + cca + attBonus + bonus + leave).toFixed(2));
          const gross = rawGross > 1.2 ? rawGross : calcGross;

          const rawTrans = parseNum(colTransport !== -1 ? r[colTransport] : 0);
          const transport = rawTrans > 0 ? rawTrans : 1500;

          const rawPf = parseNum(colPf13 !== -1 ? r[colPf13] : 0);
          const pf_13 =
            rawPf > 0
              ? rawPf
              : basic > 15000
              ? 15000 * 0.13
              : parseFloat((basic * 0.13).toFixed(2));

          const rawEsic = parseNum(colEsic325 !== -1 ? r[colEsic325] : 0);
          const esic_3_25 =
            rawEsic > 0 ? rawEsic : parseFloat(((gross - bonus) * 0.0325).toFixed(2));

          const rawUni = parseNum(colUniform !== -1 ? r[colUniform] : 0);
          const uniform_shoes = rawUni > 0 ? rawUni : 300;

          const rawServ = parseNum(colServices !== -1 ? r[colServices] : 0);
          const services_7 =
            rawServ > 0
              ? rawServ
              : parseFloat(((gross + transport + esic_3_25 + uniform_shoes) * 0.07).toFixed(2));

          const rawCtc = parseNum(colCtc !== -1 ? r[colCtc] : 0);
          const calcCtc = parseFloat(
            (gross + transport + pf_13 + esic_3_25 + uniform_shoes + services_7).toFixed(2)
          );
          const ctc = rawCtc > 0 ? rawCtc : calcCtc;

          const per_day_ctc = calcDays > 0 ? parseFloat((ctc / calcDays).toFixed(2)) : 0;
          const site_allowance_paid_rate =
            calcDays > 0 ? parseFloat(((basic + hra + cca) / calcDays / 8).toFixed(2)) : 0;
          const site_allowance_billing_rate = parseFloat(
            (site_allowance_paid_rate * 1.0325 * 1.07).toFixed(2)
          );

          employees.push({
            balaji_emp_code: empCodeVal || undefined,
            name: nameVal || `Employee ${employees.length + 1}`,
            father_or_husband_name: fatherName || "",
            sex,
            salutation: colSalutation !== -1 ? String(r[colSalutation] || "").trim() || "Mr." : "Mr.",
            dob: parseDateVal(colDob !== -1 ? r[colDob] : null),
            doj: parseDateVal(colDoj !== -1 ? r[colDoj] : null),
            adhar_no: colAdhar !== -1 ? String(r[colAdhar] || "").replace(/[^0-9]/g, "") : "",
            pan_number: colPan !== -1 ? String(r[colPan] || "").trim().toUpperCase() : "",
            uan_no: colUan !== -1 ? String(r[colUan] || "").replace(/[^0-9]/g, "") : "",
            esic_no: colEsic !== -1 ? String(r[colEsic] || "").replace(/[^0-9]/g, "") : "",
            mobile_no: colMobile !== -1 ? String(r[colMobile] || "").replace(/[^0-9]/g, "") : "",
            emergency_contact_no: colEmergNo !== -1 ? String(r[colEmergNo] || "").replace(/[^0-9]/g, "") : "",
            email: colEmail !== -1 ? String(r[colEmail] || "").trim() : "",
            marital_status: maritalStatus,
            nominee_name: colEmergPerson !== -1 ? String(r[colEmergPerson] || "").trim() : "",
            department: rawDept,
            designation: rawDesig,
            category: rawCat,
            company: rawLoc || undefined,
            qualification: resolvedQual || undefined,
            remark,
            is_permanent_same_as_current: isPermSame,

            current_address_line1: colCurrAdd1 !== -1 ? String(r[colCurrAdd1] || "").trim() : "",
            current_address_line2: colCurrAdd2 !== -1 ? String(r[colCurrAdd2] || "").trim() : "",
            current_address_city: colCurrCity !== -1 ? String(r[colCurrCity] || "").trim() : "",
            current_address_state: colCurrState !== -1 ? String(r[colCurrState] || "").trim() : "",
            current_address_pincode: colCurrPin !== -1 ? String(r[colCurrPin] || "").trim() : "",

            permanent_address_line1: colPermAdd1 !== -1 ? String(r[colPermAdd1] || "").trim() : "",
            permanent_address_line2: colPermAdd2 !== -1 ? String(r[colPermAdd2] || "").trim() : "",
            permanent_address_city: colPermCity !== -1 ? String(r[colPermCity] || "").trim() : "",
            permanent_address_state: colPermState !== -1 ? String(r[colPermState] || "").trim() : "",
            permanent_address_pincode: colPermPin !== -1 ? String(r[colPermPin] || "").trim() : "",

            bank_name: colBank !== -1 ? String(r[colBank] || "").trim() : "",
            account_no: colAcc !== -1 ? String(r[colAcc] || "").trim() : "",
            ifsc_code: colIfsc !== -1 ? String(r[colIfsc] || "").trim().toUpperCase() : "",
            bank_holder_name: bankHolder || nameVal,

            calculation_days: calcDays,
            basic,
            hra,
            cca_site_allowance: cca,
            attendance_bonus: attBonus,
            bonus,
            leave_encashment: leave,
            gross_salary: gross,
            transport,
            pf_13,
            esic_3_25,
            uniform_shoes,
            services_7,
            ctc,
            per_day_ctc,
            site_allowance_paid_rate,
            site_allowance_billing_rate,
          });
        }

        if (employees.length === 0) {
          Swal.fire({
            icon: "warning",
            title: "No Valid Records",
            text: "Could not find valid employee records in the Excel file.",
          });
          setImporting(false);
          return;
        }

        // Send to backend bulk-import endpoint
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/payroll/employee-details/bulk-import/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ employees }),
        });

        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.detail || "Failed to import employees");
        }

        const totalProcessed = (resData.created ?? 0) + (resData.updated ?? 0);
        Swal.fire({
          icon: totalProcessed > 0 ? "success" : "info",
          title: totalProcessed > 0 ? "Import Complete!" : "No Records Processed",
          html: `<div class="text-left space-y-2 mt-2">
            ${
              (resData.created ?? 0) > 0
                ? `<p class="text-slate-700 font-medium">✅ <strong>${resData.created}</strong> new employee(s) added successfully.</p>`
                : ""
            }
            ${
              (resData.updated ?? 0) > 0
                ? `<p class="text-blue-700 font-medium">🔄 <strong>${resData.updated}</strong> employee record(s) updated with full details.</p>`
                : ""
            }
            ${
              (resData.skipped ?? 0) > 0
                ? `<p class="text-amber-700 font-medium">⚠️ <strong>${resData.skipped}</strong> record(s) could not be processed.</p>`
                : ""
            }
          </div>`,
          confirmButtonColor: "#2563eb",
        });

        fetchData(currentPage);
      } catch (err) {
        console.error("Excel import error:", err);
        Swal.fire({
          icon: "error",
          title: "Import Error",
          text: err.message || "Failed to parse and import Excel file.",
        });
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const columns = [
    { key: "sr", label: "Sr.No", render: (_, idx) => (currentPage - 1) * PAGE_SIZE + (idx + 1) },
    { key: "balaji_emp_code", label: "Employee Code", render: (r) => r.balaji_emp_code || "-" },
    {
      key: "first_name",
      label: "First Name",
      render: (r) => {
        if (!r.name) return "-";
        const parts = r.name.split(" ").filter(Boolean);
        return parts[0] || "-";
      },
    },
    {
      key: "middle_name",
      label: "Middle Name",
      render: (r) => {
        if (r.name) {
          const parts = r.name.split(" ").filter(Boolean);
          if (parts.length >= 3) return parts.slice(1, -1).join(" ");
        }
        return r.father_or_husband_name || "-";
      },
    },
    {
      key: "last_name",
      label: "Last Name",
      render: (r) => {
        if (!r.name) return "-";
        const parts = r.name.split(" ").filter(Boolean);
        return parts.length >= 2 ? parts[parts.length - 1] : "-";
      },
    },
    { key: "mobile_no", label: "Mobile Number", render: (r) => r.mobile_no || "-" },
    { key: "adhar_no", label: "Adhar Card Number", render: (r) => r.adhar_no || "-" },
    { key: "pan_number", label: "PAN Number", render: (r) => r.pan_number || "-" },
    { key: "dob", label: "Date Of Birth", render: (r) => r.dob || "-" },
    { key: "doj", label: "Date Of Join", render: (r) => r.doj || "-" },
    { key: "bank_name", label: "Bank Name", render: (r) => r.bank_name || "-" },
    { key: "account_no", label: "Account Number", render: (r) => r.account_no || "-" },
    { key: "ifsc_code", label: "IFSC Code", render: (r) => r.ifsc_code || "-" },
    { key: "uan_no", label: "UAN Number", render: (r) => r.uan_no || "-" },
    { key: "esic_no", label: "ESIC Number", render: (r) => r.esic_no || "-" },
    { key: "department", label: "Department", render: (r) => r.department || "-" },
    { key: "designation", label: "Designation", render: (r) => r.designation || "-" },
    { key: "category", label: "Category", render: (r) => r.category || "-" },
    {
      key: "location",
      label: "Location / City",
      render: (r) => r.current_address_city || (typeof r.company === "object" ? r.company?.name : r.company) || "-",
    },
  ];

  // actions renderer (centered by TableView)
  const actionsRenderer = useCallback(
    (row) => (
      <>
        <button
          onClick={() => printForm(row, BASE_API)}
          className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
          title="Print Enrolment Form (Aadhaar Format)"
        >
          <Printer className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setEditingLead(row);
            setShowRegister(true);
          }}
          className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300 transition-colors"
          title="Edit"
        >
          <MdEdit />
        </button>

        <button
          onClick={() => handleDelete(row.id)}
          className="px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300 transition-colors"
          title="Delete"
        >
          <MdDelete />
        </button>
      </>
    ),
    [handleDelete, BASE_API]
  );

  return (
    <Base title="Employees Account">
      {showRegister ? (
        <RegisterEmployee
          onBack={() => {
            setShowRegister(false);
            setEditingLead(null);
          }}
          onSuccess={() => {
            setShowRegister(false);
            setEditingLead(null);
            fetchData(currentPage);
          }}
          baseApi={BASE_API}
          token={token}
          initialData={editingLead}
          hideBreadcrumb={true}
        />
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Employee Details</h2>
              <div className="text-sm text-slate-600">
                {loading ? "Loading…" : `${totalCount} total • ${rows.length} shown`}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {/* Delete All Records Button */}
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={loading || deletingAll || (rows.length === 0 && totalCount === 0)}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md transition-colors font-medium text-xs border border-rose-200 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Delete all employee records"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{deletingAll ? "Deleting..." : "Delete All"}</span>
              </button>

              {/* Download Sample Template */}
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors font-medium text-xs border border-slate-300 shadow-2xs"
                title="Download Sample Employee Excel Template"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Template</span>
              </button>

              {/* Direct 1-Click Excel Upload Button */}
              <label className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer transition-colors font-medium text-xs shadow-2xs">
                <Upload className="w-4 h-4 text-emerald-100" />
                <span>{importing ? "Importing..." : "Upload Excel"}</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv, .xlsm"
                  onChange={handleFileImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>

              {/* Manual Register Button */}
              <button
                onClick={() => {
                  setEditingLead(null);
                  setShowRegister(true);
                }}
                className="flex items-center gap-1 px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 transition-colors font-medium text-xs shadow-2xs"
              >
                <MdAdd className="w-4 h-4" />
                <span>Register</span>
              </button>
            </div>
          </div>

          {/* Highlight indicator banner */}
          {(highlightedName || highlightedCode) && (
            <div className="bg-slate-100 border border-slate-300 rounded-lg p-2.5 flex items-center justify-between text-xs text-slate-700 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600 animate-pulse" />
                <span>
                  Highlighting selected employee:{" "}
                  <strong className="text-slate-900 font-bold">{highlightedName || highlightedCode}</strong>
                  {highlightedCode && highlightedName && (
                    <span className="ml-1 text-slate-500 font-mono">({highlightedCode})</span>
                  )}
                </span>
              </div>
              <button
                onClick={() => {
                  setHighlightedName("");
                  setHighlightedCode("");
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Clear Highlight
              </button>
            </div>
          )}

          <TableView
            columns={columns}
            rows={rows}
            loading={loading}
            error={error}
            page={currentPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            pageSize={PAGE_SIZE}
            actions={actionsRenderer}
            rowClassName={getRowClassName}
            emptyMessage="No employee details found"
          />
        </div>
      )}
    </Base>
  );
}