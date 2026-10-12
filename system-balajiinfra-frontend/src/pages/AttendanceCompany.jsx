import React, { useEffect, useState, useCallback, useMemo } from "react";
import Base from "../components/Base";
import { useParams, useNavigate } from "react-router-dom";
import { Building, Upload, Download, Save, Plus, Trash2, Edit3, CheckCircle, AlertTriangle } from "lucide-react";
import { MdOutlineNavigateNext, MdOutlineNavigateBefore } from "react-icons/md";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import RegisterEmployee from "../components/employee/RegisterEmployee";
import WeeklyWorkingBargraph from "../components/WeeklyWorkingBargraph";
import DeductionsPieChart from "../components/DeductionsPieChart";

export default function AttendanceCompany() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [dbEmployees, setDbEmployees] = useState([]);
  const [showRegisterEmployee, setShowRegisterEmployee] = useState(false);
  const [registerInitialData, setRegisterInitialData] = useState(null);

  const [attendanceRows, setAttendanceRows] = useState([]);
  const [punchingData, setPunchingData] = useState(null);
  const [savedAttendanceRows, setSavedAttendanceRows] = useState([]);
  const [savedPunchingData, setSavedPunchingData] = useState(null);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState(Date.now());
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(attendanceRows.length / pageSize)), [attendanceRows.length, pageSize]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return attendanceRows.slice(start, start + pageSize);
  }, [attendanceRows, page, pageSize]);

  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  ), []);

  // Formula recalculation helper
  const calculateFormulas = (row) => {
    const mandays = parseFloat(row.mandays) || 0;
    const ot = parseFloat(row.ot) || 0;

    // Formulas:
    // EXTRA DAY = MANDAYS > 27 ? MANDAYS - 27 : 0
    // EXTRA OT = EXTRA DAY * 8
    // PAYABLE MANDAYS = MANDAYS - EXTRA DAY
    // PAYABLE OT = OT + EXTRA OT
    const extra_days = mandays > 27 ? mandays - 27 : 0;
    const extra_ot = extra_days * 8;
    const payable_mandays = Math.max(0, mandays - extra_days);
    const payable_ot = ot + extra_ot;

    // Deductions
    const deduction_other = parseFloat(row.deduction_other) || 0;
    const deduction_shows_tshirt = parseFloat(row.deduction_shows_tshirt) || 0;
    const deduction_rashan = parseFloat(row.deduction_rashan) || 0;
    const deduction_room_rent = parseFloat(row.deduction_room_rent) || 0;
    const deduction_light_bill = parseFloat(row.deduction_light_bill) || 0;
    const deduction_lpg = parseFloat(row.deduction_lpg) || 0;
    const extra_deductions = parseFloat(row.extra_deductions) || 0;
    const total_deduction = Math.round(
      deduction_other +
      deduction_shows_tshirt +
      deduction_rashan +
      deduction_room_rent +
      deduction_light_bill +
      deduction_lpg
    );

    return {
      ...row,
      mandays,
      ot,
      extra_days,
      extra_ot,
      payable_mandays,
      payable_ot,
      deduction_other,
      deduction_shows_tshirt,
      deduction_rashan,
      deduction_room_rent,
      deduction_light_bill,
      deduction_lpg,
      total_deduction,
      extra_deductions
    };
  };

  // Fetch Company Details
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/payroll/companies/${id}/`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (res.ok) {
          const data = await res.json();
          setCompany(data);
        }
      } catch (err) {
        console.error("Failed to fetch company", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [id, BASE_API, token]);

  // Fetch Employees from Database to check presence
  const fetchDbEmployees = useCallback(async () => {
    try {
      const url = `${BASE_API.replace(/\/$/, "")}/payroll/employee-details/?page_size=1000`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        setDbEmployees(list);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
    }
  }, [BASE_API, token]);

  useEffect(() => {
    fetchDbEmployees();
  }, [fetchDbEmployees]);

  // Check if an employee is present in the system database
  const checkEmployeePresence = useCallback((empCode, empName) => {
    const cleanCode = (empCode || "").trim().toLowerCase();
    const cleanName = (empName || "").trim().toLowerCase();
    if (!cleanCode && !cleanName) return false;
    return dbEmployees.some((e) => {
      const dbCode = (e.balaji_emp_code || "").trim().toLowerCase();
      const dbName = (e.name || "").trim().toLowerCase();
      return (cleanCode && dbCode === cleanCode) || (cleanName && dbName === cleanName);
    });
  }, [dbEmployees]);

  // Fetch Existing Attendance Records for Selected Date/Month
  const fetchAttendanceRecords = useCallback(async () => {
    if (!id || !selectedDate) return;
    try {
      const formattedDate = company?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate;
      const url = `${BASE_API.replace(/\/$/, "")}/payroll/attendance-records/?company=${id}&attendance_date=${formattedDate}`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        const records = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
        if (records.length > 0) {
          const formatted = records.map((r, idx) => calculateFormulas({
            id: r.id || idx + 1,
            db_id: r.id || null,
            sr_no: r.sr_no || idx + 1,
            emp_code: r.emp_code || "",
            emp_name: r.emp_name || "",
            mandays: r.mandays || 0,
            ot: r.ot || 0,
            extra_days: r.extra_days || 0,
            extra_ot: r.extra_ot || 0,
            payable_mandays: r.payable_mandays || 0,
            payable_ot: r.payable_ot || 0,
            remark: r.remark || "",
            deduction_other: parseFloat(r.deduction_other) || 0,
            deduction_shows_tshirt: parseFloat(r.deduction_shows_tshirt) || 0,
            deduction_rashan: parseFloat(r.deduction_rashan) || 0,
            deduction_room_rent: parseFloat(r.deduction_room_rent) || 0,
            deduction_light_bill: parseFloat(r.deduction_light_bill) || 0,
            deduction_lpg: parseFloat(r.deduction_lpg) || 0,
            total_deduction: parseFloat(r.total_deduction) || 0,
            extra_deductions: parseFloat(r.extra_deductions) || 0,
          }));
          setAttendanceRows(formatted);
          setSavedAttendanceRows(formatted);
          setPunchingData(null);
          setSavedPunchingData(null);
          setLastSavedTimestamp(Date.now());
          setIsSaved(true);
          setIsEditing(false);
        } else {
          setAttendanceRows([]);
          setSavedAttendanceRows([]);
          setPunchingData(null);
          setSavedPunchingData(null);
          setIsSaved(false);
          setIsEditing(false);
        }

      }
    } catch (err) {
      console.error("Failed to fetch attendance records", err);
    }
  }, [id, selectedDate, company, BASE_API, token]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  // Excel / CSV File Import Handler
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        let extractedRows = [];
        let extractedPunch = null;

        // Iterate through sheets in workbook
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rowsJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          if (!rowsJson || rowsJson.length === 0) continue;

          // 1. Check for Daily Punching Sheet (has Work / Overtime / Status rows with 20+ day columns)
          let isPunchSheet = false;
          for (let r = 0; r < Math.min(10, rowsJson.length); r++) {
            const row = rowsJson[r];
            const numCount = row.filter(
              c => typeof c === "number" || (typeof c === "string" && /^\d{1,2}$/.test(c.trim()))
            ).length;
            if (numCount >= 20) {
              isPunchSheet = true;
              break;
            }
          }

          if (isPunchSheet && !extractedPunch) {
            let weeklyWork = [0, 0, 0, 0, 0];
            let weeklyOt = [0, 0, 0, 0, 0];
            let weeklyMandays = [0, 0, 0, 0, 0];

            for (let r = 0; r < rowsJson.length; r++) {
              const row = rowsJson[r];
              if (!row || !row[0]) continue;
              const label = String(row[0]).trim();
              if (label === "Work") {
                for (let d = 0; d < 31; d++) {
                  const val = parseFloat(row[d + 1]) || 0;
                  const w = Math.min(4, Math.floor(d / 7));
                  weeklyWork[w] += val;
                }
              } else if (label === "Overtime") {
                for (let d = 0; d < 31; d++) {
                  const val = parseFloat(row[d + 1]) || 0;
                  const w = Math.min(4, Math.floor(d / 7));
                  weeklyOt[w] += val;
                }
              } else if (label === "Status") {
                for (let d = 0; d < 31; d++) {
                  const st = String(row[d + 1] || "").trim();
                  const w = Math.min(4, Math.floor(d / 7));
                  if (st.startsWith("P")) weeklyMandays[w]++;
                }
              }
            }

            if (weeklyWork.some(v => v > 0) || weeklyMandays.some(v => v > 0)) {
              extractedPunch = { weeklyWork, weeklyOt, weeklyMandays };
            }
          }

          // 2. Check for Summary Table (contains 'emp code' and 'manday' / 'emp name')
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(15, rowsJson.length); i++) {
            const rowStr = rowsJson[i].map(c => String(c).toLowerCase()).join(" ");
            if (
              (rowStr.includes("emp code") || rowStr.includes("code") || rowStr.includes("emp_code")) &&
              (rowStr.includes("manday") || rowStr.includes("emp name") || rowStr.includes("name"))
            ) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex !== -1 && extractedRows.length === 0) {
            const headers = rowsJson[headerRowIndex].map(h => String(h).trim().toLowerCase());

            const getColIdx = (names) => {
              return headers.findIndex(h => names.some(n => h.includes(n)));
            };

            const colSrNo = getColIdx(["sr.no", "sr no", "sr"]) !== -1 ? getColIdx(["sr.no", "sr no", "sr"]) : 0;
            const colEmpCode = getColIdx(["emp code", "code", "emp_code"]) !== -1 ? getColIdx(["emp code", "code", "emp_code"]) : 1;
            const colEmpName = getColIdx(["emp name", "name", "emp_name"]) !== -1 ? getColIdx(["emp name", "name", "emp_name"]) : 2;
            const colMandays = getColIdx(["mandays", "manday"]) !== -1 ? getColIdx(["mandays", "manday"]) : 3;
            const colOt = getColIdx(["ot", "overtime"]) !== -1 ? getColIdx(["ot", "overtime"]) : 4;
            const colRemark = getColIdx(["remark", "remarks", "note"]) !== -1 ? getColIdx(["remark", "remarks", "note"]) : 9;

            const colOther = getColIdx(["other", "other ded"]);
            const colShowsTshirt = getColIdx(["shows & tshirt", "shows and tshirt", "shoes & tshirt", "shoes and tshirt", "shows", "shoes", "tshirt", "t-shirt", "uniform"]);
            const colRashan = getColIdx(["rashan", "ration", "grocery", "groceries"]);
            const colRoomRent = getColIdx(["room rent", "room", "rent"]);
            const colLightBill = getColIdx(["light bill", "electricity", "electric", "power", "light"]);
            const colLpg = getColIdx(["lpg", "gas", "cylinder"]);
            const colExtra = getColIdx(["extra deductions", "extra deduction", "extra ded", "extra"]);

            let count = 1;

            for (let i = headerRowIndex + 1; i < rowsJson.length; i++) {
              const row = rowsJson[i];
              const rowStr = row.map(c => String(c).toLowerCase()).join(" ");
              if (!rowStr || rowStr.includes("total") || rowStr.includes("sum") || rowStr.includes("sujal")) continue;

              const empCode = row[colEmpCode] !== undefined ? String(row[colEmpCode]).trim() : "";
              const empName = row[colEmpName] !== undefined ? String(row[colEmpName]).trim() : "";
              const mandaysRaw = row[colMandays] !== undefined ? row[colMandays] : 0;
              const otRaw = row[colOt] !== undefined ? row[colOt] : 0;
              const remark = colRemark !== -1 && row[colRemark] !== undefined ? String(row[colRemark]).trim() : "";

              if (!empCode && !empName && !mandaysRaw) continue;
              if (empCode.toLowerCase().includes("emp code") || empName.toLowerCase().includes("emp name")) continue;

              const mandaysVal = parseFloat(mandaysRaw) || 0;
              const otVal = parseFloat(otRaw) || 0;

              const calculated = calculateFormulas({
                id: Date.now() + i,
                sr_no: row[colSrNo] ? parseInt(row[colSrNo]) || count : count,
                emp_code: empCode,
                emp_name: empName,
                mandays: mandaysVal,
                ot: otVal,
                remark: remark,
                deduction_other: colOther !== -1 && row[colOther] !== undefined ? parseFloat(row[colOther]) || 0 : 0,
                deduction_shows_tshirt: colShowsTshirt !== -1 && row[colShowsTshirt] !== undefined ? parseFloat(row[colShowsTshirt]) || 0 : 0,
                deduction_rashan: colRashan !== -1 && row[colRashan] !== undefined ? parseFloat(row[colRashan]) || 0 : 0,
                deduction_room_rent: colRoomRent !== -1 && row[colRoomRent] !== undefined ? parseFloat(row[colRoomRent]) || 0 : 0,
                deduction_light_bill: colLightBill !== -1 && row[colLightBill] !== undefined ? parseFloat(row[colLightBill]) || 0 : 0,
                deduction_lpg: colLpg !== -1 && row[colLpg] !== undefined ? parseFloat(row[colLpg]) || 0 : 0,
                extra_deductions: colExtra !== -1 && row[colExtra] !== undefined ? parseFloat(row[colExtra]) || 0 : 0,
              });

              extractedRows.push(calculated);
              count++;
            }
          }
        }

        if (extractedPunch) {
          setPunchingData(extractedPunch);
        }

        if (extractedRows.length > 0) {
          setAttendanceRows(extractedRows);
          setIsEditing(true);
          setIsSaved(false);
          Swal.fire({
            icon: "success",
            title: "Attendance Sheet & Analytics Ready",
            text: `Extracted ${extractedRows.length} employee records with auto-calculated formulas, deductions, and weekly working bar graph!`,
            timer: 2400,
            showConfirmButton: false
          });
        } else if (extractedPunch) {
          Swal.fire({
            icon: "success",
            title: "Punching Data Loaded",
            text: "Weekly working hours and shifts extracted for bar graph!",
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          Swal.fire({ icon: "error", title: "Import Error", text: "Could not find valid attendance data rows in the file." });
        }

      } catch (err) {
        console.error(err);
        Swal.fire({ icon: "error", title: "Import Error", text: "Failed to parse Excel file format." });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ""; // reset input
  };

  // Handle cell edit in table
  const handleCellChange = (rowId, field, value) => {
    setAttendanceRows(prev => {
      return prev.map(row => {
        if (row.id === rowId) {
          const target = { ...row, [field]: value };
          const isCalcField = [
            "mandays", "ot",
            "deduction_other", "deduction_shows_tshirt", "deduction_rashan",
            "deduction_room_rent", "deduction_light_bill", "deduction_lpg", "extra_deductions"
          ].includes(field);
          if (isCalcField) {
            return calculateFormulas(target);
          }
          return target;
        }
        return row;
      });
    });
  };

  // Add new empty row
  const handleAddRow = () => {
    setIsEditing(true);
    const nextSr = attendanceRows.length + 1;
    const newRow = calculateFormulas({
      id: Date.now(),
      sr_no: nextSr,
      emp_code: "",
      emp_name: "",
      mandays: 0,
      ot: 0,
      remark: "",
      deduction_other: 0,
      deduction_shows_tshirt: 0,
      deduction_rashan: 0,
      deduction_room_rent: 0,
      deduction_light_bill: 0,
      deduction_lpg: 0,
      total_deduction: 0,
      extra_deductions: 0
    });
    setAttendanceRows(prev => [...prev, newRow]);
  };

  // Delete row (with confirmation and backend sync)
  const handleDeleteRow = async (rowId) => {
    const targetRow = attendanceRows.find(r => r.id === rowId);
    if (!targetRow) return;

    const confirmResult = await Swal.fire({
      title: "Delete Attendance Row?",
      text: targetRow.emp_name
        ? `Are you sure you want to delete the attendance record for "${targetRow.emp_name}"?`
        : "Are you sure you want to delete this attendance row?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete it!"
    });

    if (!confirmResult.isConfirmed) return;

    // If row exists in backend database, delete it from backend immediately
    if (targetRow.db_id) {
      try {
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/payroll/attendance-records/${targetRow.db_id}/`, {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok && res.status !== 404) {
          throw new Error("Failed to delete record from database");
        }
      } catch (err) {
        console.error("Delete row error:", err);
        Swal.fire({ icon: "error", title: "Delete Failed", text: "Failed to delete record from database." });
        return;
      }
    }

    setAttendanceRows(prev => {
      const next = prev.filter(r => r.id !== rowId);
      if (next.length === 0) {
        setIsSaved(false);
        setIsEditing(false);
      }
      return next;
    });

    Swal.fire({
      icon: "success",
      title: "Deleted!",
      text: "Attendance row deleted successfully.",
      timer: 1200,
      showConfirmButton: false
    });
  };

  // Delete All Records for Current Company & Period
  const handleDeleteAllRecords = async () => {
    if (attendanceRows.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Records",
        text: "There are no attendance records to delete for this period."
      });
      return;
    }

    const formattedDate = company?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate;

    const result = await Swal.fire({
      title: "Delete All Records?",
      text: `Are you sure you want to permanently delete all ${attendanceRows.length} attendance record(s) for ${company?.name || "Company"} (${formattedDate})? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, delete all records",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      const res = await fetch(`${BASE_API.replace(/\/$/, "")}/payroll/attendance-records/delete-all/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          company: parseInt(id),
          attendance_date: formattedDate,
        })
      });

      if (!res.ok) {
        // Fallback to bulk-save with empty records array
        const fallbackRes = await fetch(`${BASE_API.replace(/\/$/, "")}/payroll/attendance-records/bulk-save/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            company: parseInt(id),
            attendance_date: formattedDate,
            records: []
          })
        });
        if (!fallbackRes.ok) throw new Error("Failed to delete attendance records");
      }

      setAttendanceRows([]);
      setSavedAttendanceRows([]);
      setPunchingData(null);
      setSavedPunchingData(null);
      setLastSavedTimestamp(Date.now());
      setIsSaved(false);
      setIsEditing(false);
      setPage(1);

      Swal.fire({
        icon: "success",
        title: "All Records Deleted!",
        text: `All attendance records for ${formattedDate} have been deleted.`,
        confirmButtonColor: "#2563eb",
        timer: 2000
      });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Delete Failed", text: err.message || "An error occurred while deleting records." });
    } finally {
      setSaving(false);
    }
  };

  // Handle Click on Yellow Exclamation (Record not present in database)
  const handleNotPresentClick = async (row) => {
    const result = await Swal.fire({
      title: "Employee Record Not Found",
      html: `
        <div style="text-align: left; font-size: 13px; line-height: 1.6; color: #334155;">
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
            <div style="font-weight: 700; font-size: 14px; color: #92400e; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>⚠️</span> <span>Unregistered Employee Record</span>
            </div>
            <div style="margin-bottom: 4px;"><strong>Code:</strong> <span style="font-family: monospace; font-weight: 700; color: #1e293b;">${row.emp_code || "—"}</span></div>
            <div><strong>Name:</strong> <span style="font-weight: 700; color: #1e293b;">${row.emp_name || "—"}</span></div>
          </div>
          <p style="margin: 0; color: #475569;">
            This employee is not registered in the system database.<br/>
            Would you like to <strong>create a new employee record</strong> or <strong>delete this attendance row</strong>?
          </p>
        </div>
      `,
      icon: "warning",
      iconColor: "#f59e0b",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Create Record",
      confirmButtonColor: "#2563eb",
      denyButtonText: "Delete Row",
      denyButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      cancelButtonColor: "#64748b"
    });

    if (result.isConfirmed) {
      setRegisterInitialData({
        name: row.emp_name || "",
        balaji_emp_code: row.emp_code || "",
        company: company?.id || "",
        basic: "15525.00",
        is_unregistered: true
      });
      setShowRegisterEmployee(true);
    } else if (result.isDenied) {
      handleDeleteRow(row.id);
    }
  };

  // Save Attendance to Backend Permanently
  const handleSaveAttendance = async () => {
    if (attendanceRows.length === 0) {
      const confirmClear = await Swal.fire({
        title: "Delete All Attendance Records?",
        text: "There are no rows in the sheet. Saving will permanently delete all attendance records for this period from the database.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Yes, delete all records",
      });
      if (!confirmClear.isConfirmed) return;
    }

    try {
      setSaving(true);
      const formattedDate = company?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate;
      const payload = {
        company: parseInt(id),
        attendance_date: formattedDate,
        records: attendanceRows.map((r, idx) => ({
          sr_no: idx + 1,
          emp_code: r.emp_code,
          emp_name: r.emp_name,
          mandays: parseFloat(r.mandays) || 0,
          ot: parseFloat(r.ot) || 0,
          extra_days: parseFloat(r.extra_days) || 0,
          extra_ot: parseFloat(r.extra_ot) || 0,
          payable_mandays: parseFloat(r.payable_mandays) || 0,
          payable_ot: parseFloat(r.payable_ot) || 0,
          remark: r.remark || "",
          deduction_other: parseFloat(r.deduction_other) || 0,
          deduction_shows_tshirt: parseFloat(r.deduction_shows_tshirt) || 0,
          deduction_rashan: parseFloat(r.deduction_rashan) || 0,
          deduction_room_rent: parseFloat(r.deduction_room_rent) || 0,
          deduction_light_bill: parseFloat(r.deduction_light_bill) || 0,
          deduction_lpg: parseFloat(r.deduction_lpg) || 0,
          total_deduction: parseFloat(r.total_deduction) || 0,
          extra_deductions: parseFloat(r.extra_deductions) || 0
        }))
      };

      const res = await fetch(`${BASE_API.replace(/\/$/, "")}/payroll/attendance-records/bulk-save/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save attendance records");

      await fetchAttendanceRecords();
      setSavedAttendanceRows(attendanceRows);
      if (punchingData) setSavedPunchingData(punchingData);
      setLastSavedTimestamp(Date.now());
      setIsSaved(attendanceRows.length > 0);
      setIsEditing(false);

      Swal.fire({
        icon: "success",
        title: attendanceRows.length === 0 ? "Attendance & Deduction Cleared!" : "Attendance & Deduction Saved Permanently!",
        text: attendanceRows.length === 0
          ? `Deleted all attendance records for ${formattedDate}`
          : `Saved ${attendanceRows.length} employee records with deductions for ${formattedDate}`,
        confirmButtonColor: "#2563eb"
      });


    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Save Failed", text: err.message || "An error occurred while saving." });
    } finally {
      setSaving(false);
    }
  };

  // Totals calculations
  const totals = useMemo(() => {
    return attendanceRows.reduce((acc, r) => {
      acc.mandays += parseFloat(r.mandays) || 0;
      acc.ot += parseFloat(r.ot) || 0;
      acc.extra_days += parseFloat(r.extra_days) || 0;
      acc.extra_ot += parseFloat(r.extra_ot) || 0;
      acc.payable_mandays += parseFloat(r.payable_mandays) || 0;
      acc.payable_ot += parseFloat(r.payable_ot) || 0;
      acc.deduction_other += parseFloat(r.deduction_other) || 0;
      acc.deduction_shows_tshirt += parseFloat(r.deduction_shows_tshirt) || 0;
      acc.deduction_rashan += parseFloat(r.deduction_rashan) || 0;
      acc.deduction_room_rent += parseFloat(r.deduction_room_rent) || 0;
      acc.deduction_light_bill += parseFloat(r.deduction_light_bill) || 0;
      acc.deduction_lpg += parseFloat(r.deduction_lpg) || 0;
      acc.total_deduction += parseFloat(r.total_deduction) || 0;
      acc.extra_deductions += parseFloat(r.extra_deductions) || 0;
      return acc;
    }, {
      mandays: 0,
      ot: 0,
      extra_days: 0,
      extra_ot: 0,
      payable_mandays: 0,
      payable_ot: 0,
      deduction_other: 0,
      deduction_shows_tshirt: 0,
      deduction_rashan: 0,
      deduction_room_rent: 0,
      deduction_light_bill: 0,
      deduction_lpg: 0,
      total_deduction: 0,
      extra_deductions: 0
    });
  }, [attendanceRows]);

  // Download / Export Attendance Sheet to Excel
  const handleExportAttendance = () => {
    if (attendanceRows.length === 0) {
      Swal.fire({ icon: "warning", title: "No Data", text: "There are no attendance records to export." });
      return;
    }

    // Format Month name cleanly e.g., "June 2026"
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

    const companyName = company?.name || "Company";

    // Build Formal Excel Sheet with Header Banner
    const sheetData = [
      [`ATTENDANCE & DEDUCTION SHEET — ${companyName.toUpperCase()}`],
      [`Period: ${monthYearStr}`],
      [],
      [
        "SR.NO",
        "EMPLOYEE CODE",
        "EMPLOYEE NAME",
        "MANDAY",
        "OT",
        "EXTRA DAY",
        "EXTRA OT",
        "PAYABLE MANDAYS",
        "PAYABLE OT",
        "REMARK",
        "OTHER DED",
        "SHOWS & TSHIRT",
        "RASHAN",
        "ROOM RENT",
        "LIGHT BILL",
        "LPG",
        "TOTAL DEDUCTION",
        "EXTRA DEDUCTIONS"
      ],
      ...attendanceRows.map((r, idx) => [
        idx + 1,
        r.emp_code || "",
        r.emp_name || "",
        r.mandays,
        r.ot,
        r.extra_days,
        r.extra_ot,
        r.payable_mandays,
        r.payable_ot,
        r.remark || "",
        r.deduction_other || 0,
        r.deduction_shows_tshirt || 0,
        r.deduction_rashan || 0,
        r.deduction_room_rent || 0,
        r.deduction_light_bill || 0,
        r.deduction_lpg || 0,
        r.total_deduction || 0,
        r.extra_deductions || 0
      ]),
      [
        "TOTAL",
        "",
        "",
        totals.mandays,
        totals.ot,
        totals.extra_days,
        totals.extra_ot,
        totals.payable_mandays,
        totals.payable_ot,
        "",
        totals.deduction_other,
        totals.deduction_shows_tshirt,
        totals.deduction_rashan,
        totals.deduction_room_rent,
        totals.deduction_light_bill,
        totals.deduction_lpg,
        totals.total_deduction,
        totals.extra_deductions
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance & Deduction");

    // Filename format: e.g., "June 2026 BALAJI RENEW INFRATECH LLP Attendance & Deduction.xlsx"
    const safeCompName = companyName.replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `${monthYearStr} ${safeCompName} Attendance & Deduction.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Base
      title={
        showRegisterEmployee
          ? `${company?.name || "Company"} — Register Employee`
          : (company ? `${company.name} - Attendance & Deduction` : "Company Attendance & Deduction")
      }
    >
      {showRegisterEmployee ? (
        <div className="p-4">
          <RegisterEmployee
            onBack={() => {
              setShowRegisterEmployee(false);
              setRegisterInitialData(null);
            }}
            onSuccess={() => {
              setShowRegisterEmployee(false);
              setRegisterInitialData(null);
              fetchDbEmployees();
              Swal.fire({
                icon: "success",
                title: "Employee Registered!",
                text: "The employee has been registered successfully. The attendance row is now verified in the system.",
                timer: 2000,
                showConfirmButton: false
              });
            }}
            baseApi={BASE_API}
            token={token}
            initialData={registerInitialData}
            hideBreadcrumb={true}
          />
        </div>
      ) : (
        <div className="p-4 space-y-4">

        {/* Header Action Bar with Period Info, Date Picker, Import, Export & Save Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Period:</span>
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-bold">
              {company?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate}
            </span>
            <span className="text-xs text-slate-400 font-medium">({attendanceRows.length} employees)</span>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">


            {/* Date/Month Picker */}
            <div className="flex items-center space-x-2 bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <label htmlFor="attendance-date" className="text-xs font-semibold text-slate-600">
                {company?.salary_type === "monthly" ? "Select Month:" : "Select Date:"}
              </label>
              <input
                type={company?.salary_type === "monthly" ? "month" : "date"}
                id="attendance-date"
                value={company?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate}
                onChange={(e) => setSelectedDate(company?.salary_type === "monthly" ? e.target.value + "-01" : e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-md focus:ring-blue-500 focus:border-blue-500 block px-2.5 py-1.5 outline-none font-medium"
              />
            </div>

            {/* Import Excel Button */}
            <label className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs">
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Import Sheet</span>
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>

            {/* Download / Export Excel Button */}
            <button
              type="button"
              onClick={handleExportAttendance}
              disabled={attendanceRows.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download Attendance Sheet as Excel"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>Download Sheet</span>
            </button>

            {/* Edit / Save Toggle Buttons */}
            {isSaved && !isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Attendance</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Attendance"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Analytics Section: Weekly Working Bar Graph & Deductions Pie Chart (Saved Attendance) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          <div className="lg:col-span-7">
            <WeeklyWorkingBargraph
              company={company}
              selectedDate={selectedDate}
              attendanceRows={savedAttendanceRows}
              punchingData={savedPunchingData}
              lastSavedTimestamp={lastSavedTimestamp}
            />
          </div>
          <div className="lg:col-span-5">
            <DeductionsPieChart
              company={company}
              selectedDate={selectedDate}
              attendanceRows={savedAttendanceRows}
              lastSavedTimestamp={lastSavedTimestamp}
            />
          </div>
        </div>

        {/* Content area: Interactive Attendance Table matching screenshot style */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-300 overflow-hidden space-y-0">
          <div className="p-4 flex items-center justify-between border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                {company?.name} — Attendance & Deduction Sheet
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Attendance & Deduction for period: <span className="font-semibold text-slate-700">{company?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDeleteAllRecords}
                disabled={attendanceRows.length === 0 || saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 font-semibold text-xs rounded-md transition-colors border border-rose-200 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Delete all attendance records for this period"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Records</span>
              </button>
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs rounded-md transition-colors border border-blue-200 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : attendanceRows.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border-t border-slate-200 space-y-3">
              <Building className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm text-slate-600">
                Attendance & Deduction records will be shown here for company <strong className="text-slate-800">{company?.name || "Company"}</strong>.
              </p>
              <p className="text-xs text-slate-400">
                Click <strong>"Import Sheet"</strong> to upload an Excel file or click <strong>"Add Row"</strong> to enter details manually.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-[1600px] w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#eef1f6] border-b border-slate-300">
                    <tr>
                      <th rowSpan={2} className="py-3 px-3 text-center font-bold text-slate-700 uppercase tracking-wider text-[11px] w-12 border-r border-slate-200">SR.NO</th>
                      <th rowSpan={2} className="py-3 px-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px] min-w-[120px] border-r border-slate-200">EMPLOYEE CODE</th>
                      <th rowSpan={2} className="py-3 px-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px] min-w-[200px] border-r border-slate-200">EMPLOYEE NAME</th>
                      <th rowSpan={2} className="py-3 px-3 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-20 border-r border-slate-200">MANDAY</th>
                      <th rowSpan={2} className="py-3 px-3 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-20 border-r border-slate-200">OT</th>
                      <th rowSpan={2} className="py-3 px-3 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-20 border-r border-slate-200">EXTRA DAY</th>
                      <th rowSpan={2} className="py-3 px-3 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-20 border-r border-slate-200">EXTRA OT</th>
                      <th rowSpan={2} className="py-3 px-3 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-24 border-r border-slate-200">PAYABLE MANDAYS</th>
                      <th rowSpan={2} className="py-3 px-3 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-20 border-r border-slate-200">PAYABLE OT</th>
                      <th rowSpan={2} className="py-3 px-3 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px] min-w-[120px] border-r border-slate-200">REMARK</th>
                      <th colSpan={8} className="py-2 px-3 text-center font-bold text-rose-800 bg-rose-50 border-b border-rose-200 uppercase tracking-wider text-[11px] border-r border-slate-200">
                        ADD DEDUCTION
                      </th>
                      <th rowSpan={2} className="py-3 px-2 text-center font-bold text-slate-700 uppercase tracking-wider text-[11px] w-12">ACTION</th>
                    </tr>
                    <tr className="bg-rose-50/50 border-b border-slate-300">
                      <th className="py-2 px-2.5 text-right font-semibold text-rose-900 uppercase text-[10px] min-w-[75px] border-r border-rose-100">Other</th>
                      <th className="py-2 px-2.5 text-right font-semibold text-rose-900 uppercase text-[10px] min-w-[95px] border-r border-rose-100">Shows & Tshirt</th>
                      <th className="py-2 px-2.5 text-right font-semibold text-rose-900 uppercase text-[10px] min-w-[75px] border-r border-rose-100">Rashan</th>
                      <th className="py-2 px-2.5 text-right font-semibold text-rose-900 uppercase text-[10px] min-w-[85px] border-r border-rose-100">Room Rent</th>
                      <th className="py-2 px-2.5 text-right font-semibold text-rose-900 uppercase text-[10px] min-w-[80px] border-r border-rose-100">Light Bill</th>
                      <th className="py-2 px-2.5 text-right font-semibold text-rose-900 uppercase text-[10px] min-w-[75px] border-r border-rose-100">LPG</th>
                      <th className="py-2 px-2.5 text-right font-bold text-red-900 bg-rose-100/80 uppercase text-[10px] min-w-[95px] border-r border-rose-100">Total Deduction</th>
                      <th className="py-2 px-2.5 text-right font-semibold text-rose-900 uppercase text-[10px] min-w-[95px] border-r border-slate-200">Extra Deductions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedRows.map((row, idx) => {
                      const actualIdx = (page - 1) * pageSize + idx;
                      const isPresent = checkEmployeePresence(row.emp_code, row.emp_name);
                      return (
                        <tr key={row.id || actualIdx} className={`transition-colors ${!isPresent ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-slate-50/80"}`}>
                          <td className="py-3 px-4 text-center font-medium text-slate-500">
                            {actualIdx + 1}
                          </td>
                          <td className="py-2 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={row.emp_code}
                                onChange={(e) => handleCellChange(row.id, "emp_code", e.target.value)}
                                className="w-full px-2 py-1 bg-transparent border border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none font-mono font-medium text-slate-800"
                                placeholder="e.g. BI01"
                              />
                            ) : (
                              <span className="font-mono font-medium text-slate-800 px-2 py-1 inline-block">{row.emp_code || "—"}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-between gap-2 min-w-[220px]">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={row.emp_name}
                                  onChange={(e) => handleCellChange(row.id, "emp_name", e.target.value)}
                                  className="w-full px-2 py-1 bg-transparent border border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none font-semibold text-slate-800"
                                  placeholder="Full Name"
                                />
                              ) : (
                                <span className="font-semibold text-slate-800 px-2 py-1 inline-block">{row.emp_name || "—"}</span>
                              )}
                              {!isPresent && (
                                <button
                                  type="button"
                                  onClick={() => handleNotPresentClick(row)}
                                  title="Employee not registered in system! Click to create record or delete row"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100/90 hover:bg-amber-200 border border-amber-300 text-amber-800 transition-all cursor-pointer shadow-2xs group flex-shrink-0"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse group-hover:scale-110 transition-transform flex-shrink-0" />
                                  <span className="text-[10px] font-bold">Unregistered</span>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.5"
                                value={row.mandays}
                                onChange={(e) => handleCellChange(row.id, "mandays", e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-right"
                              />
                            ) : (
                              <span className="font-semibold text-slate-900 px-2 py-1 inline-block">{row.mandays}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.5"
                                value={row.ot}
                                onChange={(e) => handleCellChange(row.id, "ot", e.target.value)}
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-right"
                              />
                            ) : (
                              <span className="font-semibold text-slate-900 px-2 py-1 inline-block">{row.ot}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-600">
                            {row.extra_days}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-600">
                            {row.extra_ot}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700 bg-emerald-50/30">
                            {row.payable_mandays}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700 bg-emerald-50/30">
                            {row.payable_ot}
                          </td>
                          <td className="py-2 px-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={row.remark}
                                onChange={(e) => handleCellChange(row.id, "remark", e.target.value)}
                                className="w-full px-2 py-1 bg-transparent border border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none text-slate-600"
                                placeholder="Add remark..."
                              />
                            ) : (
                              <span className="text-slate-600 px-2 py-1 inline-block">{row.remark || "—"}</span>
                            )}
                          </td>

                          {/* Deduction: Other */}
                          <td className="py-2 px-2 text-right bg-rose-50/20">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.deduction_other ?? 0}
                                onChange={(e) => handleCellChange(row.id, "deduction_other", e.target.value)}
                                className="w-full px-1.5 py-1 bg-white border border-rose-200 rounded font-medium text-slate-800 text-right text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                              />
                            ) : (
                              <span className="text-slate-700 px-1 py-1 inline-block">{row.deduction_other || 0}</span>
                            )}
                          </td>

                          {/* Deduction: Shows & Tshirt */}
                          <td className="py-2 px-2 text-right bg-rose-50/20">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.deduction_shows_tshirt ?? 0}
                                onChange={(e) => handleCellChange(row.id, "deduction_shows_tshirt", e.target.value)}
                                className="w-full px-1.5 py-1 bg-white border border-rose-200 rounded font-medium text-slate-800 text-right text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                              />
                            ) : (
                              <span className="text-slate-700 px-1 py-1 inline-block">{row.deduction_shows_tshirt || 0}</span>
                            )}
                          </td>

                          {/* Deduction: Rashan */}
                          <td className="py-2 px-2 text-right bg-rose-50/20">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.deduction_rashan ?? 0}
                                onChange={(e) => handleCellChange(row.id, "deduction_rashan", e.target.value)}
                                className="w-full px-1.5 py-1 bg-white border border-rose-200 rounded font-medium text-slate-800 text-right text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                              />
                            ) : (
                              <span className="text-slate-700 px-1 py-1 inline-block">{row.deduction_rashan || 0}</span>
                            )}
                          </td>

                          {/* Deduction: Room Rent */}
                          <td className="py-2 px-2 text-right bg-rose-50/20">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.deduction_room_rent ?? 0}
                                onChange={(e) => handleCellChange(row.id, "deduction_room_rent", e.target.value)}
                                className="w-full px-1.5 py-1 bg-white border border-rose-200 rounded font-medium text-slate-800 text-right text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                              />
                            ) : (
                              <span className="text-slate-700 px-1 py-1 inline-block">{row.deduction_room_rent || 0}</span>
                            )}
                          </td>

                          {/* Deduction: Light Bill */}
                          <td className="py-2 px-2 text-right bg-rose-50/20">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.deduction_light_bill ?? 0}
                                onChange={(e) => handleCellChange(row.id, "deduction_light_bill", e.target.value)}
                                className="w-full px-1.5 py-1 bg-white border border-rose-200 rounded font-medium text-slate-800 text-right text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                              />
                            ) : (
                              <span className="text-slate-700 px-1 py-1 inline-block">{row.deduction_light_bill || 0}</span>
                            )}
                          </td>

                          {/* Deduction: LPG */}
                          <td className="py-2 px-2 text-right bg-rose-50/20">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.deduction_lpg ?? 0}
                                onChange={(e) => handleCellChange(row.id, "deduction_lpg", e.target.value)}
                                className="w-full px-1.5 py-1 bg-white border border-rose-200 rounded font-medium text-slate-800 text-right text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                              />
                            ) : (
                              <span className="text-slate-700 px-1 py-1 inline-block">{row.deduction_lpg || 0}</span>
                            )}
                          </td>

                          {/* Total Deduction (Auto Calculated) */}
                          <td className="py-2 px-2.5 text-right font-bold text-red-900 bg-rose-100/60 border-r border-rose-100">
                            {row.total_deduction || 0}
                          </td>

                          {/* Extra Deductions */}
                          <td className="py-2 px-2 text-right bg-rose-50/20 border-r border-slate-200">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={row.extra_deductions ?? 0}
                                onChange={(e) => handleCellChange(row.id, "extra_deductions", e.target.value)}
                                className="w-full px-1.5 py-1 bg-white border border-rose-200 rounded font-medium text-slate-800 text-right text-xs focus:ring-1 focus:ring-rose-500 outline-none"
                              />
                            ) : (
                              <span className="text-slate-700 px-1 py-1 inline-block">{row.extra_deductions || 0}</span>
                            )}
                          </td>

                          <td className="py-2 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {!isPresent && (
                                <button
                                  type="button"
                                  onClick={() => handleNotPresentClick(row)}
                                  className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors"
                                  title="Unregistered Employee — Click to Create Record or Delete Row"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete Row"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-right uppercase tracking-wider">
                        Total
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700">
                        {totals.mandays.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700">
                        {totals.ot.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-700">
                        {totals.extra_days.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-700">
                        {totals.extra_ot.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-800 bg-emerald-100/50">
                        {totals.payable_mandays.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-800 bg-emerald-100/50">
                        {totals.payable_ot.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-3 text-slate-400"></td>

                      {/* Deduction totals */}
                      <td className="py-3 px-2.5 text-right font-semibold text-rose-900 bg-rose-50/30">
                        {totals.deduction_other.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-2.5 text-right font-semibold text-rose-900 bg-rose-50/30">
                        {totals.deduction_shows_tshirt.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-2.5 text-right font-semibold text-rose-900 bg-rose-50/30">
                        {totals.deduction_rashan.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-2.5 text-right font-semibold text-rose-900 bg-rose-50/30">
                        {totals.deduction_room_rent.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-2.5 text-right font-semibold text-rose-900 bg-rose-50/30">
                        {totals.deduction_light_bill.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-2.5 text-right font-semibold text-rose-900 bg-rose-50/30">
                        {totals.deduction_lpg.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-2.5 text-right font-bold text-red-900 bg-rose-100/70 border-r border-rose-100">
                        {totals.total_deduction.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-2.5 text-right font-semibold text-rose-900 bg-rose-50/30 border-r border-slate-200">
                        {totals.extra_deductions.toFixed(2).replace(/\.00$/, "")}
                      </td>
                      <td className="py-3 px-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Pagination Bar matching TableView */}
              <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
                <div className="text-xs text-slate-500 font-medium">
                  Page <span className="text-slate-800 font-bold">{page}</span> of <span className="text-slate-800 font-bold">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                    aria-label="Previous page"
                  >
                    <MdOutlineNavigateBefore className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                    aria-label="Next page"
                  >
                    <MdOutlineNavigateNext className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      )}
    </Base>
  );
}
