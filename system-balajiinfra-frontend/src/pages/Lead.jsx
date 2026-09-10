import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Base from "../components/Base";
import TableView from "../components/TableView";
import LeadDetails from "../components/lead/LeadDetails";
import AddLeadFollowUpForm from "../components/lead/AddLeadFollowUpForm";
import AddLeadForm from "../components/lead/AddLeadForm";
import { MdEdit, MdDelete, MdOutlineRemoveRedEye, MdEditDocument, MdAdd } from "react-icons/md";
import { Upload, Download, FileSpreadsheet, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { useUserRole } from '../hooks/useAuth';
import AddQuotation from "../components/quotations/AddQuotation";
import RegisterEmployee from "../components/employee/RegisterEmployee";


export default function Lead() {
  const location = useLocation();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const API_URL = `${BASE_API.replace(/\/$/, "")}/lead/employee-details/`;

  // ✅ Called hook to get user role
  const { userRole, isLoading: loadingUser } = useUserRole(BASE_API);

  // Initialize assign_to filter as empty string as well
  // const initialFilters = useMemo(() => ({ search: "", status: "", assign_to: "", lead_source: "", }), []);
  const initialFilters = useMemo(() => ({
    search: "",
    status: "",
    assign_to: "",
    lead_source: "",
    date: { from: "", to: "" },
    followup_date: { from: "", to: "" },
    overdue: [],
    sort_by: "",
  }), []);


  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  //forn connect enquiry to quotattion
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationLeadData, setQuotationLeadData] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [error, setError] = useState(null);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE_FALLBACK = 10;

  // modal / edit state
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [editingLead, setEditingLead] = useState(null);

  useEffect(() => {
    if (location.state?.showRegister) {
      setShowRegister(true);
      if (location.state?.registerInitialData || location.state?.initialData) {
        setEditingLead(location.state.registerInitialData || location.state.initialData);
      }
    }
  }, [location.state]);

  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [leadDetailsId, setLeadDetailsId] = useState(null);

  const [showLeadFollowUp, setShowLeadFollowUp] = useState(false);
  const [followUpLeadId, setFollowUpLeadId] = useState(null);

  const [loadingStaff, setLoadingStaff] = useState(false);
  const [assignToOptions, setAssignToOptions] = useState([]);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  const status_choice = useMemo(() => [
    { value: "open", label: "Open" },
    { value: "in_process", label: "In Process" },
    { value: "closed", label: "Closed" },
  ], []);

  const leadSourceOptions = useMemo(() => [
    { value: "google_ads", label: "Google Ads" },
    { value: "indiamart", label: "IndiaMART" },
    { value: "bni", label: "BNI" },
    { value: "justdial", label: "Justdial" },
    { value: "reference", label: "Reference" },
    { value: "architect/interior_designer", label: "Architect Interior Designer" },
    { value: "builder", label: "Builder" },
    { value: "existing_customer", label: "Existing Customer" },
    { value: "ka_staff", label: "KA Staff" },
    { value: "other", label: "Other" },
  ], []);


  // =========================================================
  //  useEffect: Fetch Staff Data for Filters (Conditional Fetch)
  // =========================================================
  useEffect(() => {
    // ✅ Only fetch if token exists AND user role is NOT sales
    if (!token || userRole?.name === "sales" || loadingUser) {
      setAssignToOptions([]);
      setLoadingStaff(false);
      return;
    }

    setLoadingStaff(true);
    const controller = new AbortController();

    const staffUrl = `${BASE_API.replace(/\/$/, "")}/auth/staff/?search=sales`;

    fetch(staffUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Failed to fetch staff: ${res.status} ${res.statusText} ${txt}`);
        }
        return res.json();
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.results ?? [];
        const mappedStaff = items.map((u) => ({
          id: u.id,
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        }));
        setAssignToOptions(mappedStaff);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error("Failed to fetch assignable staff:", err);
        setAssignToOptions([]);
      })
      .finally(() => setLoadingStaff(false));

    return () => controller.abort();

  }, [BASE_API, token, userRole, loadingUser]); // Added userRole, loadingUser to deps
  // =========================================================


  const baseFilters = useMemo(() => [
    { key: "search", type: "search", label: "Search", placeholder: "Search name, email, contact..." },
    {
      key: "status",
      type: "select",
      label: "Status",
      placeholder: "Status",
      options: [...status_choice.map(r => ({ value: r.value, label: r.label }))]
    },
    // Assign To filter definition
    {
      key: "assign_to",
      type: "select",
      label: loadingStaff ? "Assign to (Loading...)" : "Assign to",
      placeholder: "Assign to",
      options: assignToOptions.map(at => ({ value: String(at.id), label: at.name }))
    },
    {
      key: "lead_source",
      type: "select",
      label: "Source",
      placeholder: "Source",
      options: [...leadSourceOptions.map(ls => ({ value: ls.value, label: ls.label }))]
    },
    {
      key: "overdue",
      type: "checkbox",
      label: "Overdue Follow-ups",
      options: [
        { value: "true", label: "Show only overdue" }
      ]
    },
    {
      key: "date",
      type: "daterange",
      label: "Lead Date",
    },
    {
      key: "followup_date",
      type: "daterange",
      label: "Follow-up Date",
    },
    {
      key: "sort_by",
      type: "select",
      label: "Sort By",
      placeholder: "Default (Priority)",
      options: [
        { value: "-date", label: "Newest First" },
        { value: "date", label: "Oldest First" },
        { value: "customer__name", label: "Customer Name A to Z" },
        { value: "-customer__name", label: "Customer Name Z to A" },
        { value: "followup_date", label: "Follow-up Date Ascending" },
        { value: "-followup_date", label: "Follow-up Date Descending" },
      ],
    },
  ], [status_choice, assignToOptions, loadingStaff, leadSourceOptions]);

  // ✅ CONDITIONAL FILTERING LOGIC: Hide Assign To filter for sales users
  const leadFilters = useMemo(() => {
    // If user role is still loading, show no filters to prevent flicker
    if (loadingUser) return [];

    return baseFilters.filter(filter => {
      // If user is sales, hide the 'assign_to' filter
      if (userRole?.name === 'sales' && filter.key === 'assign_to') {
        return false;
      }
      return true;
    });
  }, [baseFilters, userRole, loadingUser]);

  const PAGE_SIZE = 10;
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error("No bearer token found in localStorage.");

      const params = new URLSearchParams();
      params.set("page", String(page));

      // attach filters
      if (appliedFilters.search) params.set("search", appliedFilters.search);
      if (appliedFilters.status) params.set("status", appliedFilters.status);
      if (appliedFilters.lead_source) params.set("lead_source", appliedFilters.lead_source);

      // 🔹 LEAD DATE RANGE
      if (appliedFilters.date?.from) {
        params.set("date_from", appliedFilters.date.from);
      }
      if (appliedFilters.date?.to) {
        params.set("date_to", appliedFilters.date.to);
      }

      // 🔹 FOLLOWUP DATE RANGE
      if (appliedFilters.followup_date?.from) {
        params.set("followup_date_from", appliedFilters.followup_date.from);
      }
      if (appliedFilters.followup_date?.to) {
        params.set("followup_date_to", appliedFilters.followup_date.to);
      }

      // 🔴 OVERDUE FILTER
      if (appliedFilters.overdue?.includes("true")) {
        params.set("overdue", "true");
      }


      // ✅ Final check for assign_to: Only include filter if user is NOT sales
      // The backend handles the restriction for sales users automatically.
      if (userRole?.name !== 'sales' && appliedFilters.assign_to) {
        params.set("assign_to", appliedFilters.assign_to);
      }

      // 🔹 SORT / ORDERING — maps to DRF OrderingFilter ?ordering=
      if (appliedFilters.sort_by) {
        params.set("ordering", appliedFilters.sort_by);
      }

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

      // ... (rest of data handling remains the same) ...

      // If DRF pagination is enabled, response will contain `results`
      if (data && Array.isArray(data.results)) {
        setRows(data.results);
        const count = Number.isFinite(data.count) ? data.count : (data.results.length || 0);
        setTotalCount(count);
        // compute total pages (PAGE_SIZE must match backend page size)
        const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
        setTotalPages(pages);
        setCurrentPage(page);
      } else if (Array.isArray(data)) {
        // not paginated: backend returned raw array
        setRows(data);
        setTotalCount(data.length);
        setTotalPages(Math.max(1, Math.ceil(data.length / PAGE_SIZE)));
        setCurrentPage(1);
      } else {
        // unexpected shape
        throw new Error("Unexpected staff response shape");
      }
    } catch (err) {
      setError(err.message || String(err));
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [token, appliedFilters, API_URL, userRole]); // Added userRole to deps

  useEffect(() => { fetchData(currentPage); }, [fetchData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const handleFilterChange = useCallback((filters) => {
    setAppliedFilters(prev => ({ ...prev, ...filters }));
  }, []);

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Delete Employee?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete"
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
      Swal.fire({ icon: "success", text: "Employee data deleted", timer: 1000, showConfirmButton: false });
      // refresh current page
      fetchData(currentPage);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Delete failed", text: err.message || String(err) });
    }
  };

  // Delete All Employee Records
  const handleDeleteAll = async () => {
    const totalRecords = totalCount || rows.length;
    if (totalRecords === 0) {
      Swal.fire({
        icon: "info",
        title: "No Records",
        text: "There are no employee records to delete."
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
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingAll(true);
      const res = await fetch(`${BASE_API.replace(/\/$/, "")}/lead/employee-details/delete-all/`, {
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
        text: err.message || "Failed to delete employee records."
      });
    } finally {
      setDeletingAll(false);
    }
  };
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
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
      "Calculation Days"
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
      27
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
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rowsJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (!rowsJson || rowsJson.length < 2) {
          Swal.fire({ icon: "warning", title: "Empty File", text: "The selected Excel file has no employee data rows." });
          setImporting(false);
          return;
        }

        // Detect header row (first row with emp code, name, or employee)
        let headerIdx = 0;
        for (let i = 0; i < Math.min(15, rowsJson.length); i++) {
          const rowText = rowsJson[i].map(c => String(c).toLowerCase()).join(" ");
          if (rowText.includes("name") || rowText.includes("emp code") || rowText.includes("code") || rowText.includes("adhar")) {
            headerIdx = i;
            break;
          }
        }

        const headers = rowsJson[headerIdx].map(h => String(h || "").trim().toLowerCase());

        const getCol = (possibleNames) => {
          return headers.findIndex(h => {
            const cleanH = h.replace(/[^a-z0-9]/g, "");
            return possibleNames.some(p => {
              const cleanP = p.replace(/[^a-z0-9]/g, "");
              return cleanH === cleanP || cleanH.includes(cleanP);
            });
          });
        };

        const colEmpCode = getCol(["balaji emp code", "emp code", "employee code", "code"]);
        const colName = getCol(["name", "employee name", "emp name", "full name"]);
        const colFather = getCol(["father name", "father / husband name", "father", "husband name"]);
        const colSex = getCol(["sex", "gender"]);
        const colAddress = getCol(["add.", "address", "current address", "add"]);
        const colDob = getCol(["dob", "date of birth", "birth"]);
        const colDoj = getCol(["doj", "date of joining", "joining"]);
        const colAdhar = getCol(["adhar no.", "adhar no", "aadhar no", "aadhar", "adhar", "uid"]);
        const colBank = getCol(["bank name", "bank"]);
        const colAcc = getCol(["a/c no.", "a/c no", "account no", "account number", "acc no"]);
        const colIfsc = getCol(["ifsc code.", "ifsc code", "ifsc"]);
        const colUan = getCol(["uan no.", "uan no", "uan"]);
        const colEsic = getCol(["esic no.", "esic no", "esic"]);
        const colMobile = getCol(["mobile no", "mobile", "phone", "contact"]);
        const colNominee = getCol(["nominee name", "nominee"]);
        const colDept = getCol(["department", "dept"]);
        const colDesig = getCol(["designation", "desig", "role"]);
        const colCat = getCol(["category", "skill category", "skill"]);
        const colComp = getCol(["company", "company name"]);

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
          const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (dm) {
            return `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
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

          const nameVal = colName !== -1 ? String(r[colName] || "").trim() : "";
          const empCodeVal = colEmpCode !== -1 ? String(r[colEmpCode] || "").trim() : "";

          // Skip if row is empty or looks like another header
          if (!nameVal && !empCodeVal) continue;
          if (nameVal.toLowerCase().includes("emp name") || nameVal.toLowerCase().includes("total")) continue;

          let sexVal = colSex !== -1 ? String(r[colSex] || "").trim().toLowerCase() : "male";
          const sex = sexVal.startsWith("f") ? "Female" : "Male";

          employees.push({
            balaji_emp_code: empCodeVal || undefined,
            name: nameVal || `Employee ${employees.length + 1}`,
            father_or_husband_name: colFather !== -1 ? String(r[colFather] || "").trim() : "",
            sex,
            current_address_line1: colAddress !== -1 ? String(r[colAddress] || "").trim() : "",
            dob: parseDateVal(colDob !== -1 ? r[colDob] : null),
            doj: parseDateVal(colDoj !== -1 ? r[colDoj] : null),
            adhar_no: colAdhar !== -1 ? String(r[colAdhar] || "").replace(/[^0-9]/g, "") : "",
            bank_name: colBank !== -1 ? String(r[colBank] || "").trim() : "",
            account_no: colAcc !== -1 ? String(r[colAcc] || "").trim() : "",
            ifsc_code: colIfsc !== -1 ? String(r[colIfsc] || "").trim().toUpperCase() : "",
            uan_no: colUan !== -1 ? String(r[colUan] || "").replace(/[^0-9]/g, "") : "",
            esic_no: colEsic !== -1 ? String(r[colEsic] || "").replace(/[^0-9]/g, "") : "",
            mobile_no: colMobile !== -1 ? String(r[colMobile] || "").replace(/[^0-9]/g, "") : "",
            nominee_name: colNominee !== -1 ? String(r[colNominee] || "").trim() : "",
            department: colDept !== -1 ? String(r[colDept] || "").trim() : "",
            designation: colDesig !== -1 ? String(r[colDesig] || "").trim() : "",
            category: colCat !== -1 ? String(r[colCat] || "").trim() : "Skilled",
            company: colComp !== -1 ? String(r[colComp] || "").trim() : undefined,
            ...(() => {
              const calcDays = colCalcDays !== -1 ? parseInt(r[colCalcDays]) || 30 : 30;
              const rawBasic = parseNum(colBasic !== -1 ? r[colBasic] : 0);
              const basic = rawBasic > 0 ? rawBasic : 15525;

              const rawHra = parseNum(colHra !== -1 ? r[colHra] : 0);
              const hra = rawHra > 0 ? rawHra : parseFloat((basic * 0.05).toFixed(2));

              const cca = parseNum(colCca !== -1 ? r[colCca] : 0);
              const attBonus = parseNum(colAttBonus !== -1 ? r[colAttBonus] : 0);

              const rawBonus = parseNum(colBonus !== -1 ? r[colBonus] : 0);
              const bonus = rawBonus > 0 ? rawBonus : parseFloat((basic * 0.0833).toFixed(2));

              const rawLeave = parseNum(colLeave !== -1 ? r[colLeave] : 0);
              const leave = rawLeave > 0 ? rawLeave : parseFloat((basic * 0.05).toFixed(2));

              const rawGross = parseNum(colGross !== -1 ? r[colGross] : 0);
              const calcGross = parseFloat((basic + hra + cca + attBonus + bonus + leave).toFixed(2));
              const gross = rawGross > 1.2 ? rawGross : calcGross;

              const rawTrans = parseNum(colTransport !== -1 ? r[colTransport] : 0);
              const transport = rawTrans > 0 ? rawTrans : 1500;

              const rawPf = parseNum(colPf13 !== -1 ? r[colPf13] : 0);
              const pf_13 = rawPf > 0 ? rawPf : (basic > 15000 ? 15000 * 0.13 : parseFloat((basic * 0.13).toFixed(2)));

              const rawEsic = parseNum(colEsic325 !== -1 ? r[colEsic325] : 0);
              const esic_3_25 = rawEsic > 0 ? rawEsic : parseFloat(((gross - bonus) * 0.0325).toFixed(2));

              const rawUni = parseNum(colUniform !== -1 ? r[colUniform] : 0);
              const uniform_shoes = rawUni > 0 ? rawUni : 300;

              const rawServ = parseNum(colServices !== -1 ? r[colServices] : 0);
              const services_7 = rawServ > 0 ? rawServ : parseFloat(((gross + transport + esic_3_25 + uniform_shoes) * 0.07).toFixed(2));

              const rawCtc = parseNum(colCtc !== -1 ? r[colCtc] : 0);
              const calcCtc = parseFloat((gross + transport + pf_13 + esic_3_25 + uniform_shoes + services_7).toFixed(2));
              const ctc = rawCtc > 0 ? rawCtc : calcCtc;

              const per_day_ctc = calcDays > 0 ? parseFloat((ctc / calcDays).toFixed(2)) : 0;
              const site_allowance_paid_rate = calcDays > 0 ? parseFloat(((basic + hra + cca) / calcDays / 8).toFixed(2)) : 0;
              const site_allowance_billing_rate = parseFloat((site_allowance_paid_rate * 1.0325 * 1.07).toFixed(2));

              return {
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
              };
            })(),
          });
        }

        if (employees.length === 0) {
          Swal.fire({ icon: "warning", title: "No Valid Records", text: "Could not find valid employee records in the Excel file." });
          setImporting(false);
          return;
        }

        // Send to backend bulk-import endpoint
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/lead/employee-details/bulk-import/`, {
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

        Swal.fire({
          icon: resData.created > 0 ? "success" : "info",
          title: resData.created > 0 ? "Import Complete!" : "No New Employees",
          html: `<div class="text-left space-y-2 mt-2">
            <p class="text-slate-700 font-medium">✅ <strong>${resData.created ?? 0}</strong> new employee(s) added successfully.</p>
            ${(resData.skipped ?? 0) > 0 ? `<p class="text-amber-700 font-medium">⚠️ <strong>${resData.skipped}</strong> repeated record(s) were skipped.</p>` : ''}
          </div>`,
          confirmButtonColor: "#2563eb",
        });

        // Refresh table
        fetchData(currentPage);

      } catch (err) {
        console.error("Excel import error:", err);
        Swal.fire({ icon: "error", title: "Import Error", text: err.message || "Failed to parse and import Excel file." });
      } finally {
        setImporting(false);
        e.target.value = ""; // Reset file input so user can re-upload if needed
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const getRowClassName = (lead) => {
    if (!lead.followup_date) return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const followupDate = new Date(lead.followup_date);
    followupDate.setHours(0, 0, 0, 0);

    // Today's followup - Yellow
    if (followupDate.getTime() === today.getTime()) {
      return "bg-yellow-100";
    }

    // Missed followup - Red
    if (followupDate < today) {
      return "bg-red-100";
    }

    return "";
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
        if (!r.name) return "-";
        const parts = r.name.split(" ").filter(Boolean);
        return parts.length >= 3 ? parts.slice(1, -1).join(" ") : "-";
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
    { key: "account_no", label: "Account Number", render: (r) => r.account_no || "-" },
    { key: "uan_no", label: "UAN Number", render: (r) => r.uan_no || "-" },
    { key: "esic_no", label: "ESIC Number", render: (r) => r.esic_no || "-" },
    { key: "department", label: "Department", render: (r) => r.department || "-" },
    { key: "designation", label: "Designation", render: (r) => r.designation || "-" },
    { key: "category", label: "Category", render: (r) => r.category || "-" },
  ];

  // actions renderer (centered by TableView)
  const actionsRenderer = useCallback((row) => (
    <>
      <button
        onClick={() => {
          setLeadDetailsId(row.id);
          setShowLeadDetails(true);
        }}
        className="px-2 py-1 bg-blue-200 text-blue-800 rounded"
        title="View"
      >
        <MdOutlineRemoveRedEye />
      </button>

      <button
        onClick={() => { setEditingLead(row); setShowRegister(true); }}
        className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded"
        title="Edit"
      >
        <MdEdit />
      </button>

      <button
        onClick={() => handleDelete(row.id)}
        className="px-2 py-1 bg-red-200 text-red-800 rounded"
        title="Delete"
      >
        <MdDelete />
      </button>
    </>
  ), [handleDelete]);

  return (
    <Base
      title="Employees Account"
      filtersConfig={leadFilters}
      initialFilterValues={initialFilters}
      onFiltersChange={handleFilterChange}
    >
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
        />
      ) : (
        <div className="space-y-6 ">
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
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>

              {/* Manual Register Button */}
              <button
                onClick={() => { setEditingLead(null); setShowRegister(true); }}
                className="flex items-center gap-1 px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 transition-colors font-medium text-xs shadow-2xs"
              >
                <MdAdd className="w-4 h-4" />
                <span>Register</span>
              </button>
            </div>
          </div>

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
            emptyMessage="No employee details found"
            rowClassName={getRowClassName}
          />
        </div>
      )}
      <AddLeadForm
        open={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        baseApi={BASE_API}
        token={token}
        lead={editingLead}  // null = add | object = edit
        onSuccess={() => {
          fetchData(currentPage);
          setShowLeadForm(false);
          setEditingLead(null);
        }}
      />

      <LeadDetails
        open={showLeadDetails}
        onClose={() => setShowLeadDetails(false)}
        leadId={leadDetailsId}
        baseApi={BASE_API}
        token={token}
      />

      {/* 👉 Follow-up form modal – use your existing AddLeadFollowUpForm */}
      <AddLeadFollowUpForm
        open={showLeadFollowUp}
        onClose={() => setShowLeadFollowUp(false)}
        baseApi={BASE_API}
        token={token}
        leadId={followUpLeadId}
        onSuccess={() => {
          fetchData(currentPage);
          setShowLeadFollowUp(false);
          setFollowUpLeadId(null);
        }}
      />

      {/* ADD QUOTATION FORM */}
      {showQuotationForm && (
        <AddQuotation
          leadData={quotationLeadData}
          onBack={() => {
            setShowQuotationForm(false);
            setQuotationLeadData(null);
            // Refresh the leads list
            fetchData(currentPage);
          }}
        />
      )}

    </Base>
  );
}