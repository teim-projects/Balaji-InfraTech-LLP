import React, { useEffect, useState, useCallback, useMemo } from "react";
import Base from "../components/Base";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Home, Building, Upload, Download, Save, Plus, Trash2, Edit3, CheckCircle } from "lucide-react";
import { MdOutlineNavigateNext, MdOutlineNavigateBefore } from "react-icons/md";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

export default function AttendanceCompany() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [attendanceRows, setAttendanceRows] = useState([]);
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

    return {
      ...row,
      mandays,
      ot,
      extra_days,
      extra_ot,
      payable_mandays,
      payable_ot
    };
  };

  // Fetch Company Details
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/lead/companies/${id}/`, {
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

  // Fetch Existing Attendance Records for Selected Date/Month
  const fetchAttendanceRecords = useCallback(async () => {
    if (!id || !selectedDate) return;
    try {
      const formattedDate = company?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate;
      const url = `${BASE_API.replace(/\/$/, "")}/lead/attendance-records/?company=${id}&attendance_date=${formattedDate}`;
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
            remark: r.remark || ""
          }));
          setAttendanceRows(formatted);
          setIsSaved(true);
          setIsEditing(false);
        } else {
          setAttendanceRows([]);
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
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rowsJson = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (rowsJson.length === 0) {
          Swal.fire({ icon: "error", title: "Import Error", text: "The selected file is empty." });
          return;
        }

        // Find header row (find row containing 'emp code' or 'emp name' or 'manday' or 'sr')
        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(15, rowsJson.length); i++) {
          const rowStr = rowsJson[i].map(c => String(c).toLowerCase()).join(" ");
          if (rowStr.includes("emp code") || rowStr.includes("emp name") || rowStr.includes("manday")) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) headerRowIndex = 0; // fallback to row 0

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

        const extractedRows = [];
        let count = 1;

        for (let i = headerRowIndex + 1; i < rowsJson.length; i++) {
          const row = rowsJson[i];
          // Skip empty or total/summary rows
          const rowStr = row.map(c => String(c).toLowerCase()).join(" ");
          if (!rowStr || rowStr.includes("total") || rowStr.includes("sum") || rowStr.includes("sujal")) continue;

          const empCode = row[colEmpCode] !== undefined ? String(row[colEmpCode]).trim() : "";
          const empName = row[colEmpName] !== undefined ? String(row[colEmpName]).trim() : "";
          const mandaysRaw = row[colMandays] !== undefined ? row[colMandays] : 0;
          const otRaw = row[colOt] !== undefined ? row[colOt] : 0;
          const remark = colRemark !== -1 && row[colRemark] !== undefined ? String(row[colRemark]).trim() : "";

          // Skip header repeats or non-data rows
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
            remark: remark
          });

          extractedRows.push(calculated);
          count++;
        }

        setAttendanceRows(extractedRows);
        setIsEditing(true);
        setIsSaved(false);
        Swal.fire({
          icon: "success",
          title: "Attendance Sheet Imported",
          text: `Extracted ${extractedRows.length} employee records with auto-calculated formulas!`,
          timer: 2000,
          showConfirmButton: false
        });

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
          if (field === "mandays" || field === "ot") {
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
      remark: ""
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
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/lead/attendance-records/${targetRow.db_id}/`, {
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
          remark: r.remark || ""
        }))
      };

      const res = await fetch(`${BASE_API.replace(/\/$/, "")}/lead/attendance-records/bulk-save/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save attendance records");

      await fetchAttendanceRecords();
      setIsSaved(attendanceRows.length > 0);
      setIsEditing(false);

      Swal.fire({
        icon: "success",
        title: attendanceRows.length === 0 ? "Attendance Cleared!" : "Attendance Saved Permanently!",
        text: attendanceRows.length === 0
          ? `Deleted all attendance records for ${formattedDate}`
          : `Saved ${attendanceRows.length} employee records for ${formattedDate}`,
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
      return acc;
    }, { mandays: 0, ot: 0, extra_days: 0, extra_ot: 0, payable_mandays: 0, payable_ot: 0 });
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
      [`ATTENDANCE SHEET — ${companyName.toUpperCase()}`],
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
        "REMARK"
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
        r.remark || ""
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
        ""
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    // Filename format: e.g., "June 2026 BALAJI RENEW INFRATECH LLP.xlsx"
    const safeCompName = companyName.replace(/[\\/:*?"<>|]/g, "_");
    const fileName = `${monthYearStr} ${safeCompName}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Base title={company ? `${company.name} - Attendance` : "Company Attendance"}>
      <div className="p-4 space-y-4">

        {/* Header with Breadcrumb, Date Picker, Import, Export & Save Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <nav className="flex text-sm text-slate-500 font-medium" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link to="/dashboard" className="inline-flex items-center hover:text-blue-600 transition-colors">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <Link to="/amc" className="ml-1 md:ml-2 hover:text-blue-600 transition-colors">
                    Attendance
                  </Link>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                  <span className="ml-1 md:ml-2 text-slate-700 font-semibold">
                    {loading ? "Loading..." : company?.name || "Company"}
                  </span>
                </div>
              </li>
            </ol>
          </nav>

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

        {/* Content area: Interactive Attendance Table matching screenshot style */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-300 overflow-hidden space-y-0">
          <div className="p-4 flex items-center justify-between border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-600" />
                {company?.name} — Attendance Sheet
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Attendance for period: <span className="font-semibold text-slate-700">{company?.salary_type === "monthly" ? selectedDate.substring(0, 7) : selectedDate}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs rounded-md transition-colors border border-blue-200 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : attendanceRows.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border-t border-slate-200 space-y-3">
              <Building className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm text-slate-600">
                Attendance will be shown here for company <strong className="text-slate-800">{company?.name || "Company"}</strong>.
              </p>
              <p className="text-xs text-slate-400">
                Click <strong>"Import Sheet"</strong> to upload an Excel file or click <strong>"Add Row"</strong> to enter details manually.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1250px] w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-[#eef1f6] border-b border-slate-300">
                    <tr>
                      <th className="py-3.5 px-4 text-center font-bold text-slate-700 uppercase tracking-wider text-[11px] w-14">SR.NO</th>
                      <th className="py-3.5 px-4 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px] min-w-[130px]">EMPLOYEE CODE</th>
                      <th className="py-3.5 px-4 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px] min-w-[240px]">EMPLOYEE NAME</th>
                      <th className="py-3.5 px-4 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-24">MANDAY</th>
                      <th className="py-3.5 px-4 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-24">OT</th>
                      <th className="py-3.5 px-4 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-24">EXTRA DAY</th>
                      <th className="py-3.5 px-4 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-24">EXTRA OT</th>
                      <th className="py-3.5 px-4 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-32">PAYABLE MANDAYS</th>
                      <th className="py-3.5 px-4 text-right font-bold text-slate-700 uppercase tracking-wider text-[11px] w-28">PAYABLE OT</th>
                      <th className="py-3.5 px-4 text-left font-bold text-slate-700 uppercase tracking-wider text-[11px] min-w-[150px]">REMARK</th>
                      <th className="py-3.5 px-3 text-center font-bold text-slate-700 uppercase tracking-wider text-[11px] w-12">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedRows.map((row, idx) => {
                      const actualIdx = (page - 1) * pageSize + idx;
                      return (
                        <tr key={row.id || actualIdx} className="hover:bg-slate-50/80 transition-colors">
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
                            {isEditing ? (
                              <input
                                type="text"
                                value={row.emp_name}
                                onChange={(e) => handleCellChange(row.id, "emp_name", e.target.value)}
                                className="w-full min-w-[220px] px-2 py-1 bg-transparent border border-slate-300 focus:border-blue-500 focus:bg-white rounded outline-none font-semibold text-slate-800"
                                placeholder="Full Name"
                              />
                            ) : (
                              <span className="font-semibold text-slate-800 px-2 py-1 inline-block">{row.emp_name || "—"}</span>
                            )}
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
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Row"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                      <td colSpan={2} className="py-3 px-4"></td>
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
    </Base>
  );
}
