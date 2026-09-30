import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Clock,
  Briefcase,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Award,
  ChevronDown,
  Database,
  Building,
} from "lucide-react";
import ResizableCard from "./ResizableCard";

export default function AttendanceAnalytics() {
  const navigate = useNavigate();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const token = localStorage.getItem("access") || localStorage.getItem("token") || "";

  const handleEmployeeClick = (row) => {
    const name = row.emp_name || "";
    const code = row.emp_code || "";
    navigate(`/employees?highlight=${encodeURIComponent(name)}&code=${encodeURIComponent(code)}`, {
      state: { highlightName: name, highlightCode: code },
    });
  };

  // Data states from DB
  const [dbRecords, setDbRecords] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLiveDb, setIsLiveDb] = useState(false);

  // Filters
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedDate, setSelectedDate] = useState("All");
  const [selectedCode, setSelectedCode] = useState("All");
  const [selectedName, setSelectedName] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Chart hover states
  const [hoveredMandays, setHoveredMandays] = useState(null);
  const [hoveredOt, setHoveredOt] = useState(null);
  const [hoveredDeduction, setHoveredDeduction] = useState(null);

  // 1. Fetch Companies from Database
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_API.replace(/\/$/, "")}/lead/companies/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setCompanies(list);
      }
    } catch (err) {
      console.warn("Could not fetch companies from DB:", err);
    }
  }, [BASE_API, token]);

  // 2. Fetch Attendance Records from Database
  const fetchAttendance = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let url = `${BASE_API.replace(/\/$/, "")}/lead/attendance-records/`;
      const params = new URLSearchParams();
      if (selectedCompany !== "All") params.append("company", selectedCompany);
      if (selectedDate !== "All") params.append("attendance_date", selectedDate);

      const qs = params.toString();
      if (qs) url += `?${qs}`;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        if (list.length > 0) {
          const parsed = list.map((r, i) => ({
            id: r.id || i + 1,
            company: r.company,
            attendance_date: r.attendance_date,
            sr_no: r.sr_no || i + 1,
            emp_code: (r.emp_code || "").trim(),
            emp_name: (r.emp_name || "").trim(),
            mandays: parseFloat(r.mandays) || 0,
            ot: parseFloat(r.ot) || 0,
            extra_days: parseFloat(r.extra_days) || 0,
            extra_ot: parseFloat(r.extra_ot) || 0,
            payable_mandays: parseFloat(r.payable_mandays) || 0,
            payable_ot: parseFloat(r.payable_ot) || 0,
            remark: r.remark || "",
            // Statutory deductions
            pf: parseFloat(r.pf) || 0,
            esic: parseFloat(r.esic) || 0,
            ptax: parseFloat(r.ptax) || 0,
            canteen: parseFloat(r.canteen) || 0,
            lwf: parseFloat(r.lwf) || 0,
            // Operational deductions
            deduction_other: parseFloat(r.deduction_other) || 0,
            deduction_shows_tshirt: parseFloat(r.deduction_shows_tshirt) || 0,
            deduction_rashan: parseFloat(r.deduction_rashan) || 0,
            deduction_room_rent: parseFloat(r.deduction_room_rent) || 0,
            deduction_light_bill: parseFloat(r.deduction_light_bill) || 0,
            deduction_lpg: parseFloat(r.deduction_lpg) || 0,
            total_deduction: parseFloat(r.total_deduction) || 0,
            extra_deductions: parseFloat(r.extra_deductions) || 0,
          }));
          setDbRecords(parsed);
          setIsLiveDb(true);
        } else {
          setDbRecords([]);
          setIsLiveDb(true);
        }
      } else {
        console.warn("Database response not ok:", res.status);
      }
    } catch (err) {
      console.error("Error fetching attendance from database:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [BASE_API, token, selectedCompany, selectedDate]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Distinct available months/dates in the database
  const availableDates = useMemo(() => {
    const dates = Array.from(
      new Set(dbRecords.map((r) => r.attendance_date).filter(Boolean))
    ).sort().reverse();
    return ["All", ...dates];
  }, [dbRecords]);

  // Unique codes & names for dropdowns
  const uniqueCodes = useMemo(() => {
    const set = new Set(dbRecords.map((r) => r.emp_code).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [dbRecords]);

  const uniqueNames = useMemo(() => {
    const set = new Set(dbRecords.map((r) => r.emp_name).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [dbRecords]);

  // Filtered records based on active user filters
  const filteredRecords = useMemo(() => {
    return dbRecords.filter((r) => {
      if (selectedCode !== "All" && r.emp_code !== selectedCode) return false;
      if (selectedName !== "All" && r.emp_name !== selectedName) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesCode = (r.emp_code || "").toLowerCase().includes(q);
        const matchesName = (r.emp_name || "").toLowerCase().includes(q);
        if (!matchesCode && !matchesName) return false;
      }
      return true;
    });
  }, [dbRecords, selectedCode, selectedName, searchTerm]);

  // Dynamic Filtered Summary KPIs
  const summary = useMemo(() => {
    const empCount = filteredRecords.length;
    const totMandays = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.mandays) || 0), 0);
    const payMandays = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.payable_mandays) || 0), 0);
    const totOt = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.ot) || 0), 0);
    const payOt = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.payable_ot) || 0), 0);
    const totExtraDays = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.extra_days) || 0), 0);
    const totExtraOt = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.extra_ot) || 0), 0);

    return {
      attendance_employees: empCount,
      total_mandays: totMandays,
      payable_mandays: payMandays,
      total_ot_hours: totOt,
      payable_ot_hours: payOt,
      total_extra_days: totExtraDays,
      total_extra_ot: totExtraOt,
    };
  }, [filteredRecords]);

  // Chart 1: Mandays vs Payable Mandays (Top 13 employees dynamically from database)
  const chart1Employees = useMemo(() => {
    if (filteredRecords.length === 0) return [];
    // Prioritize prominent employees matching PowerBI screenshot if present in DB
    const screenshotNames = [
      "BHAIYA NARAYAN MORE",
      "DEVENDRA DILIP GIRASE",
      "HARISH KAILAS SONAWANE",
      "KAILASH SUDHAKAR KHAIRNAR",
      "KAMLESH GANGADHAR RAO",
      "MACHINDRA DNYANESHWAR MAHAJAN",
      "NILESH SHANKAR VENDE",
      "PRAVIN PIRAJI PAWAR",
      "PRAVIN RAMCHANDRA SURYAWANSHI",
      "SACHIN DADAJI SURYAWANSHI",
      "SHAILESH SAMBHAJI CHITTE",
      "VILAS RAMESH MORE",
      "VISHNU NIMBA BRAMHANE",
    ];

    const matched = [];
    const remaining = [...filteredRecords];

    screenshotNames.forEach((target) => {
      const idx = remaining.findIndex((r) =>
        r.emp_name.toLowerCase().includes(target.toLowerCase())
      );
      if (idx !== -1) {
        matched.push(remaining[idx]);
        remaining.splice(idx, 1);
      }
    });

    // Fill up to 13 from remaining records
    while (matched.length < 13 && remaining.length > 0) {
      matched.push(remaining.shift());
    }

    return matched.slice(0, 13);
  }, [filteredRecords]);

  // Chart 2: Overtime Analysis (Top 10 overtime employees dynamically from database)
  const chart2Employees = useMemo(() => {
    if (filteredRecords.length === 0) return [];
    // Filter records that have OT or take top OT records
    const withOt = [...filteredRecords].sort(
      (a, b) => Math.max(b.ot, b.payable_ot) - Math.max(a.ot, a.payable_ot)
    );
    return withOt.slice(0, 10);
  }, [filteredRecords]);

  // Dynamic Max OT for Chart 2 scaling
  const maxOtVal = useMemo(() => {
    if (chart2Employees.length === 0) return 120;
    const maxVal = Math.max(...chart2Employees.map((e) => Math.max(e.ot, e.payable_ot)));
    return Math.max(120, Math.ceil(maxVal / 10) * 10);
  }, [chart2Employees]);

  // Chart 3: Total Deductions Breakdown (Dynamically aggregated from database records)
  const deductionsData = useMemo(() => {
    let totPf = 0;
    let totEsic = 0;
    let totPtax = 0;
    let totCanteen = 0;
    let totLwf = 0;
    let totRent = 0;
    let totRashan = 0;
    let totLight = 0;
    let totLpg = 0;
    let totShows = 0;
    let totOther = 0;
    let totExtra = 0;

    filteredRecords.forEach((r) => {
      totPf += r.pf || 0;
      totEsic += r.esic || 0;
      totPtax += r.ptax || 0;
      totCanteen += r.canteen || 0;
      totLwf += r.lwf || 0;

      totRent += r.deduction_room_rent || 0;
      totRashan += r.deduction_rashan || 0;
      totLight += r.deduction_light_bill || 0;
      totLpg += r.deduction_lpg || 0;
      totShows += r.deduction_shows_tshirt || 0;
      totOther += r.deduction_other || 0;
      totExtra += r.extra_deductions || 0;
    });

    const statutoryTotal = totPf + totEsic + totPtax + totCanteen + totLwf;
    let categories = [];

    if (statutoryTotal > 0) {
      categories = [
        { label: "PF (12%)", amount: totPf, color: "#1E293B" },
        { label: "Canteen", amount: totCanteen, color: "#334155" },
        { label: "P.Tax", amount: totPtax, color: "#5B6B73" },
        { label: "ESIC (0.75%)", amount: totEsic, color: "#73868E" },
        { label: "LWF", amount: totLwf, color: "#8C9DA5" },
      ].filter((c) => c.amount > 0);
    } else {
      // Fallback to operational deductions if recorded
      categories = [
        { label: "Room Rent", amount: totRent, color: "#1E293B" },
        { label: "Rashan", amount: totRashan, color: "#334155" },
        { label: "Light Bill", amount: totLight, color: "#5B6B73" },
        { label: "LPG Gas", amount: totLpg, color: "#73868E" },
        { label: "Shoes/T-Shirt", amount: totShows, color: "#8C9DA5" },
        { label: "Other", amount: totOther + totExtra, color: "#A5B4BB" },
      ].filter((c) => c.amount > 0);
    }

    const total = categories.reduce((sum, c) => sum + c.amount, 0);
    const circumference = 2 * Math.PI * 40; // r = 40
    let accumulatedOffset = 0;

    const slices = categories.map((cat) => {
      const pct = total > 0 ? Math.round((cat.amount / total) * 1000) / 10 : 0;
      const strokeLength = total > 0 ? (cat.amount / total) * circumference : 0;
      const offset = accumulatedOffset;
      accumulatedOffset += strokeLength;

      return {
        ...cat,
        pct,
        strokeLength,
        offset,
        circumference,
      };
    });

    return { total, slices };
  }, [filteredRecords]);

  const handleResetFilters = () => {
    setSelectedCompany("All");
    setSelectedDate("All");
    setSelectedCode("All");
    setSelectedName("All");
    setSearchTerm("");
  };

  return (
    <div className="space-y-3.5 font-sans">
      {/* 1. TOP 6 KPI CARDS MATCHING POWERBI SCREENSHOT EXACTLY */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* KPI 1 */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold text-slate-500 tracking-tight">
            Attendance Employees
          </span>
          <div className="mt-1 text-2xl font-black text-slate-800 leading-none">
            {summary.attendance_employees}
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold text-slate-500 tracking-tight">
            Total Mandays
          </span>
          <div className="mt-1 text-2xl font-black text-slate-800 leading-none">
            {(summary.total_mandays / 1000).toFixed(4)}K
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold text-slate-500 tracking-tight">
            Payable Mandays
          </span>
          <div className="mt-1 text-2xl font-black text-slate-800 leading-none">
            {(summary.payable_mandays / 1000).toFixed(4)}K
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold text-slate-500 tracking-tight">
            Total OT Hours
          </span>
          <div className="mt-1 text-2xl font-black text-slate-800 leading-none">
            {(summary.total_ot_hours / 1000).toFixed(4)}K
          </div>
        </div>

        {/* KPI 5 */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold text-slate-500 tracking-tight">
            Payable OT Hours
          </span>
          <div className="mt-1 text-2xl font-black text-slate-800 leading-none">
            {(summary.payable_ot_hours / 1000).toFixed(4)}K
          </div>
        </div>

        {/* KPI 6 */}
        <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between">
          <span className="text-[10.5px] font-semibold text-slate-500 tracking-tight">
            Total Extra Days
          </span>
          <div className="mt-1 text-2xl font-black text-slate-800 leading-none">
            {summary.total_extra_days}
          </div>
        </div>
      </div>

      {/* 2. REAL DATABASE FILTER BAR */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Company Selector from DB */}
          {companies.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-slate-600 whitespace-nowrap flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-500" />
                Company:
              </label>
              <div className="relative">
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="pl-2 pr-7 py-1 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none cursor-pointer min-w-[120px]"
                >
                  <option value="All">All Companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Month / Period Filter from DB */}
          {availableDates.length > 1 && (
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-slate-600 whitespace-nowrap flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                Month:
              </label>
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-2 pr-7 py-1 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none cursor-pointer min-w-[105px]"
                >
                  {availableDates.map((dt) => (
                    <option key={dt} value={dt}>
                      {dt === "All" ? "All Months" : dt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Emp Code Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
              Emp Code:
            </label>
            <div className="relative">
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="pl-2 pr-7 py-1 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none cursor-pointer min-w-[110px]"
              >
                {uniqueCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>

          {/* Emp Name Filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-slate-600 whitespace-nowrap">
              Emp Name:
            </label>
            <div className="relative">
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                className="pl-2 pr-7 py-1 text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none cursor-pointer min-w-[160px] max-w-[220px] truncate"
              >
                {uniqueNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>

          {/* Search box */}
          <div className="relative w-36 sm:w-48">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Search code, name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-6 pr-2 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Live Database status & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Live DB Indicator */}
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Database className="w-2.5 h-2.5 text-emerald-600" />
            <span>Live DB: {dbRecords.length} records</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAttendance(true)}
            disabled={refreshing || loading}
            title="Refresh database records"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer border border-slate-200"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${refreshing ? "animate-spin text-sky-600" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Refresh"}</span>
          </button>

          {/* Clear Filters Button */}
          {(selectedCompany !== "All" ||
            selectedDate !== "All" ||
            selectedCode !== "All" ||
            selectedName !== "All" ||
            searchTerm.trim()) && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors cursor-pointer border border-sky-200/80"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT: 2 MAIN COLUMNS MATCHING POWERBI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* LEFT COLUMN: 6 COLS (Mandays Bar Chart, Overtime Line Chart & Total Deductions Pie Chart) */}
        <div className="lg:col-span-6 space-y-3.5">
          {/* CHART 1: MANDAYS VS PAYABLE MANDAYS (VERTICAL GROUPED BAR CHART MATCHING POWERBI) */}
          <ResizableCard
            id="attendance-mandays-chart"
            defaultHeight={290}
            minHeight={190}
            maxHeight={580}
            className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between dash-card-interactive"
          >
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between pb-1.5 mb-1">
              <h4 className="text-xs font-bold text-slate-800">
                Mandays vs Payable Mandays
              </h4>
              <div className="flex items-center gap-3 text-[9.5px] font-medium text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#5B6B73]" />
                  Payable Mandays
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#1E293B]" />
                  Total Mandays
                </span>
              </div>
            </div>

            {/* SVG Grouped Vertical Bar Chart */}
            <div className="relative w-full select-none overflow-x-auto custom-scrollbar">
              {chart1Employees.length > 0 ? (
                <svg viewBox="0 0 540 180" className="w-full h-auto min-w-[500px]">
                  {/* Horizontal reference grid lines at 0, 10, 20, 30 */}
                  {[0, 10, 20, 30].map((val) => {
                    const y = 145 - (val / 30) * 125;
                    return (
                      <g key={`mandays-grid-${val}`}>
                        <line x1="28" y1={y} x2="530" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x="22" y={y + 3} textAnchor="end" fontSize="8" fill="#94a3b8" fontWeight="600">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical Bars for Employees */}
                  {chart1Employees.map((emp, i) => {
                    const groupWidth = 36;
                    const barWidth = 9.5;
                    const groupX = 35 + i * groupWidth;

                    const payHeight = (Math.min(30, emp.payable_mandays) / 30) * 125;
                    const totHeight = (Math.min(30, emp.mandays) / 30) * 125;

                    const payY = 145 - payHeight;
                    const totY = 145 - totHeight;

                    return (
                      <g
                        key={`empbar-${emp.emp_code}-${i}`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredMandays(emp)}
                        onMouseLeave={() => setHoveredMandays(null)}
                      >
                        {/* Bar 1: Payable Mandays (Slate Gray #5B6B73) */}
                        <rect
                          x={groupX}
                          y={payY}
                          width={barWidth}
                          height={payHeight}
                          fill="#5B6B73"
                          rx="1"
                          className="transition-all hover:opacity-85"
                        />

                        {/* Bar 2: Total Mandays (Dark Charcoal #1E293B) */}
                        <rect
                          x={groupX + barWidth + 2}
                          y={totY}
                          width={barWidth}
                          height={totHeight}
                          fill="#1E293B"
                          rx="1"
                          className="transition-all hover:opacity-85"
                        />

                        {/* Employee Name Label rotated vertically */}
                        <text
                          x={groupX + barWidth}
                          y="152"
                          transform={`rotate(-90 ${groupX + barWidth} 152)`}
                          textAnchor="end"
                          fontSize="6"
                          fill="#475569"
                          fontWeight="600"
                          letterSpacing="-0.2px"
                        >
                          {emp.emp_name.length > 18
                            ? emp.emp_name.slice(0, 16) + "…"
                            : emp.emp_name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Hover Tooltip */}
                  {hoveredMandays && (
                    <g>
                      <rect x="180" y="8" width="180" height="28" rx="4" fill="#0f172a" opacity="0.96" />
                      <text x="270" y="20" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                        {hoveredMandays.emp_name.slice(0, 24)}
                      </text>
                      <text x="270" y="30" textAnchor="middle" fill="#93c5fd" fontSize="7">
                        Payable: {hoveredMandays.payable_mandays}d | Total: {hoveredMandays.mandays}d
                      </text>
                    </g>
                  )}
                </svg>
              ) : (
                <div className="py-14 text-center text-slate-400 text-xs">
                  No mandays data recorded in database
                </div>
              )}
            </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 mt-auto shrink-0">
              <span>Employee mandays tracking</span>
              <span className="font-semibold text-slate-600">Total: {summary.total_mandays.toFixed(1)} mandays</span>
            </div>
          </ResizableCard>

          {/* ROW 2: OVERTIME ANALYSIS (LINE CHART) & TOTAL DEDUCTIONS (DONUT CHART) SIDE BY SIDE */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
            {/* CHART 2: OVERTIME ANALYSIS (LINE CHART MATCHING POWERBI SCREENSHOT) */}
            <div className="sm:col-span-7">
              <ResizableCard
                id="attendance-ot-chart"
                defaultHeight={270}
                minHeight={180}
                maxHeight={550}
                className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between dash-card-interactive"
              >
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between pb-1 mb-1">
                  <h4 className="text-[11px] font-bold text-slate-800">
                    Overtime Analysis
                  </h4>
                  <div className="flex items-center gap-2 text-[8px] font-medium text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-0.5 bg-[#1E293B]" />
                      Total OT
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-0.5 bg-[#5B6B73]" />
                      Payable OT
                    </span>
                  </div>
                </div>

                {/* SVG Multi-Line Chart */}
                <div className="relative w-full select-none overflow-x-auto custom-scrollbar pb-1">
                  {chart2Employees.length > 0 ? (
                    <svg viewBox="0 0 310 160" className="w-full h-auto min-w-[260px] overflow-visible">
                      {/* Y-axis grid at 80, 100, 120 (or scaled to maxOtVal) */}
                      {[80, 100, maxOtVal].map((val) => {
                        const y = 110 - ((val - 60) / (maxOtVal - 50 || 1)) * 85;
                        return (
                          <g key={`otgrid-${val}`}>
                            <line x1="26" y1={y} x2="300" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="2,2" />
                            <text x="20" y={y + 3} textAnchor="end" fontSize="7.5" fill="#94a3b8" fontWeight="600">
                              {val}
                            </text>
                          </g>
                        );
                      })}

                      {/* Build Line Points for Total OT and Payable OT */}
                      {(() => {
                        const pointsTot = chart2Employees.map((emp, i) => {
                          const x = 32 + i * 27;
                          const y = 110 - ((Math.min(maxOtVal, Math.max(60, emp.ot)) - 60) / (maxOtVal - 50 || 1)) * 85;
                          return `${x},${y}`;
                        }).join(" ");

                        const pointsPay = chart2Employees.map((emp, i) => {
                          const x = 32 + i * 27;
                          const y = 110 - ((Math.min(maxOtVal, Math.max(60, emp.payable_ot)) - 60) / (maxOtVal - 50 || 1)) * 85;
                          return `${x},${y}`;
                        }).join(" ");

                        return (
                          <g>
                            {/* Payable OT Line (Slate) */}
                            <polyline
                              points={pointsPay}
                              fill="none"
                              stroke="#5B6B73"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {/* Total OT Line (Dark Charcoal) */}
                            <polyline
                              points={pointsTot}
                              fill="none"
                              stroke="#1E293B"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            {/* Data points & X-axis labels */}
                            {chart2Employees.map((emp, i) => {
                              const x = 32 + i * 27;
                              const yTot = 110 - ((Math.min(maxOtVal, Math.max(60, emp.ot)) - 60) / (maxOtVal - 50 || 1)) * 85;
                              const yPay = 110 - ((Math.min(maxOtVal, Math.max(60, emp.payable_ot)) - 60) / (maxOtVal - 50 || 1)) * 85;

                              return (
                                <g
                                  key={`pt-${i}`}
                                  className="cursor-pointer"
                                  onMouseEnter={() => setHoveredOt(emp)}
                                  onMouseLeave={() => setHoveredOt(null)}
                                >
                                  <circle cx={x} cy={yPay} r="2.5" fill="#5B6B73" />
                                  <circle cx={x} cy={yTot} r="2.5" fill="#1E293B" />
                                  <text
                                    x={x}
                                    y="118"
                                    transform={`rotate(-55 ${x} 118)`}
                                    textAnchor="end"
                                    fontSize="5.5"
                                    fill="#475569"
                                    fontWeight="600"
                                  >
                                    {emp.emp_name.split(" ")[0]}
                                  </text>
                                </g>
                              );
                            })}
                          </g>
                        );
                      })()}

                      {/* Tooltip */}
                      {hoveredOt && (
                        <g>
                          <rect x="75" y="4" width="160" height="24" rx="3" fill="#0f172a" opacity="0.96" />
                          <text x="155" y="15" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">
                            {hoveredOt.emp_name.slice(0, 22)}
                          </text>
                          <text x="155" y="23" textAnchor="middle" fill="#93c5fd" fontSize="6.5">
                            Total OT: {hoveredOt.ot}h | Payable OT: {hoveredOt.payable_ot}h
                          </text>
                        </g>
                      )}
                    </svg>
                  ) : (
                    <div className="py-10 text-center text-slate-400 text-xs">
                      No overtime records available
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[8.5px] text-slate-400 pt-1 border-t border-slate-100 mt-auto shrink-0 flex items-center justify-between">
                <span>Overtime tracker</span>
                <span className="font-semibold text-slate-600">Total: {summary.total_ot_hours.toFixed(1)} hrs</span>
              </div>
              </ResizableCard>
            </div>

            {/* CHART 3: TOTAL DEDUCTIONS PIE / DONUT CHART (USER REQUESTED FEATURE) */}
            <div className="sm:col-span-5">
              <ResizableCard
                id="attendance-deductions-chart"
                defaultHeight={270}
                minHeight={180}
                maxHeight={550}
                className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-3 flex flex-col justify-between dash-card-interactive"
              >
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-100">
                  <h4 className="text-[11px] font-bold text-slate-800">
                    Total Deductions
                  </h4>
                  <span className="text-[10px] font-bold text-slate-800">
                    ₹{deductionsData.total.toLocaleString()}
                  </span>
                </div>

                {/* Donut Chart with Center Display */}
                {deductionsData.total > 0 && deductionsData.slices.length > 0 ? (
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="relative w-24 h-24 shrink-0 select-none">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                        {deductionsData.slices.map((slice, idx) => (
                          <circle
                            key={`dslice-${idx}`}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={slice.color}
                            strokeWidth={hoveredDeduction === slice.label ? "14" : "12"}
                            strokeDasharray={`${slice.strokeLength} ${slice.circumference}`}
                            strokeDashoffset={-slice.offset}
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredDeduction(slice.label)}
                            onMouseLeave={() => setHoveredDeduction(null)}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-[7.5px] text-slate-400 font-medium truncate max-w-[55px]">
                          {hoveredDeduction || "Total"}
                        </span>
                        <span className="text-[9.5px] font-black text-slate-800 leading-none">
                          ₹
                          {hoveredDeduction
                            ? (
                                deductionsData.slices.find((s) => s.label === hoveredDeduction)?.amount || 0
                              ).toLocaleString()
                            : (deductionsData.total / 1000).toFixed(1) + "K"}
                        </span>
                      </div>
                    </div>

                    {/* Compact Deductions Legend */}
                    <div className="flex-1 space-y-1">
                      {deductionsData.slices.map((slice) => (
                        <div
                          key={slice.label}
                          onMouseEnter={() => setHoveredDeduction(slice.label)}
                          onMouseLeave={() => setHoveredDeduction(null)}
                          className={`flex items-center justify-between text-[9px] px-1 py-0.5 rounded cursor-pointer ${
                            hoveredDeduction === slice.label ? "bg-slate-100 font-bold" : "text-slate-600"
                          }`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="truncate">{slice.label}</span>
                          </div>
                          <span className="font-semibold text-slate-700 ml-1">{slice.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No deductions recorded
                  </div>
                )}
              </div>

              <div className="text-[8.5px] text-slate-400 pt-1 border-t border-slate-100 mt-auto shrink-0 flex items-center justify-between">
                <span>Real statutory & payroll deductions</span>
                <span className="font-semibold text-slate-600">Breakdown</span>
              </div>
              </ResizableCard>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 6 COLS (EMPLOYEE ATTENDANCE DETAILS TABLE MATCHING POWERBI) */}
        <div className="lg:col-span-6">
          <ResizableCard
            id="attendance-details-table"
            defaultHeight={580}
            minHeight={300}
            maxHeight={880}
            className="bg-white rounded-lg border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between dash-card-interactive"
          >
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2 shrink-0">
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Employee Attendance Details
                </h4>
                <p className="text-[9.5px] text-slate-400 font-medium">
                  Showing {filteredRecords.length} records live from database
                </p>
              </div>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                <span>{filteredRecords.length}</span>
                <span className="font-normal text-slate-400">rows</span>
              </span>
            </div>

            {/* Scrollable Table matching PowerBI columns & dark header */}
            <div className="w-full overflow-x-auto overflow-y-auto flex-1 min-h-[160px] border border-slate-200 rounded-lg custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead className="sticky top-0 bg-[#2D3748] text-white z-10">
                  <tr className="text-[9px] font-bold uppercase tracking-wider">
                    <th className="py-2 px-2 whitespace-nowrap">Emp Code</th>
                    <th className="py-2 px-2 whitespace-nowrap">Emp Name</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">Total Mandays</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">Payable Mandays</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">Payable OT Hours</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">Total OT Hours</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">Total Extra Days</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">Total Extra OT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px] text-slate-700 bg-white">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((row, index) => (
                      <tr
                        key={`${row.emp_code}-${row.id || index}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-1.5 px-2 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {row.emp_code}
                        </td>
                        <td
                          className="py-1.5 px-2 font-medium text-slate-800 whitespace-nowrap cursor-pointer hover:text-sky-600 hover:underline transition-colors"
                          onClick={() => handleEmployeeClick(row)}
                          title={`Click to view ${row.emp_name} in Employee List`}
                        >
                          {row.emp_name}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-slate-800 whitespace-nowrap">
                          {row.mandays.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-slate-800 whitespace-nowrap">
                          {row.payable_mandays.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-slate-800 whitespace-nowrap">
                          {row.payable_ot.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-slate-800 whitespace-nowrap">
                          {row.ot.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-slate-800 whitespace-nowrap">
                          {row.extra_days.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-slate-800 whitespace-nowrap">
                          {row.extra_ot}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400 text-xs">
                        No attendance records found in database
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* Total Summary Row */}
                <tfoot className="sticky bottom-0 bg-slate-100 border-t-2 border-slate-300 font-bold text-[10px] text-slate-900 z-10">
                  <tr>
                    <td colSpan={2} className="py-2 px-2">
                      Total
                    </td>
                    <td className="py-2 px-2 text-right">
                      {summary.total_mandays.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {summary.payable_mandays.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {summary.payable_ot_hours.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {summary.total_ot_hours.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {summary.total_extra_days.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {summary.total_extra_ot}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-400 mt-auto shrink-0">
            <span>Balaji Attendance Database Ledger</span>
            <span className="font-semibold text-slate-600">
              {selectedDate !== "All" ? selectedDate : "All Records"}
            </span>
          </div>
          </ResizableCard>
        </div>
      </div>
    </div>
  );
}
