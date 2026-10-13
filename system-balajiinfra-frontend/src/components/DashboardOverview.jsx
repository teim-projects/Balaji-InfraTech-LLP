import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  Users,
  CheckCircle2,
  FileText,
  Clock,
  AlertCircle,
  TrendingUp,
  Search,
  UserCheck,
  UserX,
  ExternalLink,
  Briefcase,
  Layers,
  X,
  Calendar,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  PieChart,
} from "lucide-react";
import AttendanceAnalytics from "./AttendanceAnalytics";
import PayrollSalaryDashboard from "./PayrollSalaryDashboard";
import PfEcrComplianceDashboard from "./PfEcrComplianceDashboard";
import ResizableCard from "./ResizableCard";

const DESIGNATION_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#8B5CF6", // Violet
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#64748B", // Slate
  "#84CC16", // Lime
  "#E11D48", // Rose
];

function getDonutSlicePath(cx, cy, rInner, rOuter, startAngle, endAngle) {
  if (endAngle - startAngle >= 2 * Math.PI - 0.001) {
    return `M ${cx} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy + rOuter} A ${rOuter} ${rOuter} 0 1 0 ${cx} ${cy - rOuter} M ${cx} ${cy - rInner} A ${rInner} ${rInner} 0 1 1 ${cx} ${cy + rInner} A ${rInner} ${rInner} 0 1 1 ${cx} ${cy - rInner} Z`;
  }
  const x1Outer = cx + rOuter * Math.cos(startAngle);
  const y1Outer = cy + rOuter * Math.sin(startAngle);
  const x2Outer = cx + rOuter * Math.cos(endAngle);
  const y2Outer = cy + rOuter * Math.sin(endAngle);

  const x1Inner = cx + rInner * Math.cos(endAngle);
  const y1Inner = cy + rInner * Math.sin(endAngle);
  const x2Inner = cx + rInner * Math.cos(startAngle);
  const y2Inner = cy + rInner * Math.sin(startAngle);

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return `M ${x1Outer} ${y1Outer} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x2Inner} ${y2Inner} Z`;
}

export default function DashboardOverview({ employeeList = [] }) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const handleEmployeeClick = (emp) => {
    const name = emp.name || "";
    const code = emp.emp_id || emp.balaji_emp_code || "";
    navigate(`/employees?highlight=${encodeURIComponent(name)}&code=${encodeURIComponent(code)}`, {
      state: {
        highlightName: name,
        highlightCode: code,
        highlightId: emp.id,
      },
    });
  };
  const [activeTab, setActiveTab] = useState("onboarding"); // "onboarding" | "attendance"
  const [viewMode, setViewMode] = useState("months"); // "months" | "years"
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [tableSearch, setTableSearch] = useState("");
  const [pendingSearch, setPendingSearch] = useState("");
  const [hoveredDesig, setHoveredDesig] = useState(null);
  const employeeTableRef = useRef(null);
  const contentSectionRef = useRef(null);
  const [attendanceCount, setAttendanceCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("access") || localStorage.getItem("token") || "";
    const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
    fetch(`${baseApi.replace(/\/$/, "")}/payroll/attendance-records/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.results || [];
        setAttendanceCount(list.length);
      })
      .catch((err) => console.warn("Could not fetch attendance count:", err));
  }, []);

  const handleSelectDesignation = (desigTitle) => {
    setTableSearch(desigTitle);
    if (employeeTableRef.current) {
      employeeTableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour < 12) return "Good morning!";
    if (hour < 17) return "Good afternoon!";
    return "Good evening!";
  };

  const dayOfWeek = currentDate
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const dayOfMonth = currentDate.getDate();
  const monthShort = currentDate.toLocaleDateString("en-US", { month: "short" });
  const year = currentDate.getFullYear();

  // Process and classify ALL employees into Registered vs Unregistered (missing UAN/pending details)
  const processedRoster = useMemo(() => {
    return employeeList.map((emp) => {
      const uan = String(emp.uan_no || "").trim();
      const aadhar = String(emp.adhar_no || "").trim();
      const pan = String(emp.pan_number || "").trim();
      const bank = String(emp.account_no || "").trim();

      const missing = [];
      if (!uan || uan === "—" || uan === "-") missing.push("No UAN");
      if (!aadhar || aadhar === "—" || aadhar === "-") missing.push("No Aadhar");
      if (!bank || bank === "—" || bank === "-") missing.push("No Bank A/C");
      if (!pan || pan === "—" || pan === "-") missing.push("No PAN");

      const isRegistered = Boolean(uan && uan !== "—" && uan !== "-");

      return {
        id: emp.id,
        rawEmp: emp,
        emp_id: emp.balaji_emp_code || `B\\${emp.id}`,
        name: emp.name || "Employee",
        dept: emp.department || "Production",
        desig: emp.designation || "Staff",
        grade: emp.category || "-",
        type: "Contractor Workers",
        shift: emp.shift || "11 G Shift (Dhule)",
        hours: `${emp.calculation_days ? emp.calculation_days + "HR" : "12HR"}`,
        doj: emp.doj || emp.created_at || "",
        uan_no: uan || null,
        isRegistered,
        missingDetails: missing,
      };
    });
  }, [employeeList]);

  // Breakdown lists
  const totalEmployeesCount = processedRoster.length;
  const registeredCount = useMemo(() => {
    return processedRoster.filter((e) => e.isRegistered).length;
  }, [processedRoster]);

  const pendingUanList = useMemo(() => {
    return processedRoster.filter((e) => !e.isRegistered);
  }, [processedRoster]);

  const pendingUanCount = pendingUanList.length;



  // Search filter helper to accurately match text and avoid 'skilled' matching 'unskilled'
  const matchesSearch = (item, query) => {
    if (!query) return true;
    const q = query.trim().toLowerCase();

    // Direct employee fields
    if (item.name?.toLowerCase().includes(q)) return true;
    if (item.emp_id?.toLowerCase().includes(q)) return true;
    if (item.dept?.toLowerCase().includes(q)) return true;
    if (item.desig?.toLowerCase().includes(q)) return true;

    // Skill category specific check
    const cat = String(item.grade || item.category || item.rawEmp?.category || "").trim().toLowerCase();
    if (q === "unskilled") {
      return cat.includes("unskilled");
    }
    if (q === "semi-skilled" || q === "semi skilled") {
      return cat.includes("semi");
    }
    if (q === "skilled") {
      return cat.includes("skill") && !cat.includes("un") && !cat.includes("semi");
    }

    return cat.includes(q);
  };

  // Filtered lists for search
  const filteredTotalEmployees = useMemo(() => {
    if (!tableSearch.trim()) return processedRoster;
    return processedRoster.filter((r) => matchesSearch(r, tableSearch));
  }, [processedRoster, tableSearch]);

  const filteredPendingList = useMemo(() => {
    if (!pendingSearch.trim()) return pendingUanList;
    const q = pendingSearch.toLowerCase();
    return pendingUanList.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.emp_id.toLowerCase().includes(q) ||
        r.dept.toLowerCase().includes(q)
    );
  }, [pendingUanList, pendingSearch]);

  // Normalize and categorize skills
  const getNormalizedSkillCategory = (emp) => {
    const cat = String(emp?.category || emp?.grade || emp?.rawEmp?.category || "").trim();
    const lower = cat.toLowerCase();
    if (lower.includes("semi")) return "Semi-Skilled";
    if (lower.includes("unskilled") || lower.includes("un-skilled")) return "Unskilled";
    if (lower.includes("skill") || lower.includes("diploma") || lower.includes("supervisor") || lower.includes("hydra")) return "Skilled";
    if (!cat || cat === "-" || cat === "—") return "Unassigned";
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  // Skill category counts and statistics (Skilled & Unskilled)
  const skillCategoryStats = useMemo(() => {
    const sourceList = processedRoster && processedRoster.length > 0 ? processedRoster : employeeList;
    const total = sourceList.length || 0;

    let skilledCount = 0;
    let unskilledCount = 0;
    let semiSkilledCount = 0;

    sourceList.forEach((emp) => {
      const cat = getNormalizedSkillCategory(emp);
      if (cat === "Skilled") skilledCount++;
      else if (cat === "Unskilled") unskilledCount++;
      else if (cat === "Semi-Skilled") semiSkilledCount++;
    });

    const categories = [
      {
        title: "Skilled",
        count: skilledCount,
        percentage: total > 0 ? Number(((skilledCount / total) * 100).toFixed(1)) : 0,
        color: "#10b981",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        textColor: "text-emerald-700",
        barColor: "#10b981",
        categoryType: "skill",
      },
      {
        title: "Unskilled",
        count: unskilledCount,
        percentage: total > 0 ? Number(((unskilledCount / total) * 100).toFixed(1)) : 0,
        color: "#f59e0b",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        textColor: "text-amber-700",
        barColor: "#f59e0b",
        categoryType: "skill",
      },
    ];

    if (semiSkilledCount > 0) {
      categories.push({
        title: "Semi-Skilled",
        count: semiSkilledCount,
        percentage: total > 0 ? Number(((semiSkilledCount / total) * 100).toFixed(1)) : 0,
        color: "#0ea5e9",
        bgColor: "bg-sky-50",
        borderColor: "border-sky-200",
        textColor: "text-sky-700",
        barColor: "#0ea5e9",
        categoryType: "skill",
      });
    }

    return categories;
  }, [processedRoster, employeeList]);

  // Dynamic designation breakdown computed strictly from database employees
  const designationStats = useMemo(() => {
    const counts = {};
    const skillMap = {};
    const sourceList = processedRoster && processedRoster.length > 0 ? processedRoster : employeeList;
    sourceList.forEach((emp) => {
      if (!emp) return;
      const d = String(emp.desig || emp.designation || "").trim() || "Unassigned";
      counts[d] = (counts[d] || 0) + 1;
      const skillCat = getNormalizedSkillCategory(emp);
      if (!skillMap[d]) skillMap[d] = {};
      skillMap[d][skillCat] = (skillMap[d][skillCat] || 0) + 1;
    });

    const total = sourceList.length || 1;
    const list = Object.entries(counts).map(([title, count]) => {
      const roleSkills = skillMap[title] || {};
      const primarySkill = Object.keys(roleSkills).sort((a, b) => roleSkills[b] - roleSkills[a])[0] || "Skilled";
      return {
        title,
        count,
        percentage: Number(((count / total) * 100).toFixed(1)),
        primarySkill,
        skillBreakdown: roleSkills,
        categoryType: "role",
        barColor: "#0284c7",
      };
    });
    list.sort((a, b) => b.count - a.count);
    return list;
  }, [processedRoster, employeeList]);

  const maxSkillScale = useMemo(() => {
    const counts = skillCategoryStats.map((d) => d.count);
    const maxVal = counts.length > 0 ? Math.max(...counts, 0) : 0;
    if (maxVal <= 0) return 10;
    if (maxVal <= 5) return 5;
    if (maxVal <= 10) return 10;
    if (maxVal <= 25) return 25;
    if (maxVal <= 50) return 50;
    if (maxVal <= 100) return 100;
    return Math.ceil(maxVal / 50) * 50;
  }, [skillCategoryStats]);

  const pieSlices = useMemo(() => {
    if (!designationStats || designationStats.length === 0) return [];
    const total = designationStats.reduce((acc, d) => acc + d.count, 0) || 1;
    let currentAngle = -Math.PI / 2;

    return designationStats.map((item, idx) => {
      const angle = (item.count / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;
      const color = DESIGNATION_COLORS[idx % DESIGNATION_COLORS.length];

      return {
        ...item,
        color,
        startAngle,
        endAngle,
      };
    });
  }, [designationStats]);

  const filteredDesigList = useMemo(() => {
    if (!tableSearch.trim()) return designationStats;
    const q = tableSearch.toLowerCase();
    return designationStats.filter((d) => d.title.toLowerCase().includes(q));
  }, [designationStats, tableSearch]);

  const hoveredDesigItem = useMemo(() => {
    if (!hoveredDesig) return null;
    return designationStats.find((d) => d.title === hoveredDesig) || null;
  }, [hoveredDesig, designationStats]);

  const maxDesigScale = useMemo(() => {
    const counts = designationStats.map((d) => d.count);
    const maxVal = counts.length > 0 ? Math.max(...counts, 0) : 0;
    if (maxVal <= 0) return 10;
    if (maxVal <= 10) return 10;
    if (maxVal <= 50) return 50;
    if (maxVal <= 100) return 100;
    if (maxVal <= 200) return 200;
    return Math.ceil(maxVal / 50) * 50;
  }, [designationStats]);

  const totalDesigCount = useMemo(() => {
    return designationStats.reduce((sum, d) => sum + d.count, 0);
  }, [designationStats]);

  // Onboarding dates for graph
  const employeeJoinings = useMemo(() => {
    return processedRoster.map((emp) => {
      let d = null;
      if (emp.doj) {
        const parts = String(emp.doj).split("-");
        if (parts.length === 3) {
          const yr = parseInt(parts[0], 10);
          const mo = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          d = new Date(yr, mo, day);
        } else {
          d = new Date(emp.doj);
        }
      }
      return {
        id: emp.id,
        year: d && !isNaN(d.getTime()) ? d.getFullYear() : year,
        month: d && !isNaN(d.getTime()) ? d.getMonth() : currentDate.getMonth(),
        isRegistered: emp.isRegistered,
      };
    });
  }, [processedRoster, year, currentDate]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set([year]);
    employeeJoinings.forEach((e) => {
      if (e.year) yearsSet.add(e.year);
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [employeeJoinings, year]);

  // Monthly Onboarding Data
  const monthlyData = useMemo(() => {
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const counts = Array(12).fill(0);

    employeeJoinings.forEach((emp) => {
      if (emp.year === selectedYear) {
        counts[emp.month] += 1;
      }
    });

    return monthNames.map((name, i) => ({
      label: name,
      count: counts[i],
    }));
  }, [employeeJoinings, selectedYear]);

  // Yearly Onboarding Data
  const yearlyData = useMemo(() => {
    const minYr = Math.min(...availableYears, year - 3);
    const maxYr = Math.max(...availableYears, year);
    const yrList = [];
    for (let y = minYr; y <= maxYr; y++) {
      yrList.push(y);
    }

    const counts = {};
    yrList.forEach((y) => (counts[y] = 0));

    employeeJoinings.forEach((emp) => {
      if (counts[emp.year] !== undefined) {
        counts[emp.year] += 1;
      } else {
        counts[emp.year] = 1;
      }
    });

    return yrList.map((y) => ({
      label: String(y),
      count: counts[y] || 0,
    }));
  }, [employeeJoinings, availableYears, year]);

  const activeData = viewMode === "months" ? monthlyData : yearlyData;

  // Chart Geometry - wide full-width layout matching top box
  const chartWidth = 720;
  const chartHeight = 85;
  const paddingLeft = 32;
  const paddingRight = 20;
  const paddingTop = 12;
  const paddingBottom = 20;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...activeData.map((d) => d.count), 2);
  const roundedMax = Math.ceil(maxVal);
  const minVal = 0;

  const chartPoints = useMemo(() => {
    return activeData.map((item, idx) => {
      const x =
        paddingLeft +
        (idx / Math.max(activeData.length - 1, 1)) * plotWidth;
      const ratio = (item.count - minVal) / (roundedMax - minVal || 1);
      const y = paddingTop + plotHeight - ratio * plotHeight;
      return { x, y, label: item.label, count: item.count, index: idx };
    });
  }, [activeData, roundedMax, plotWidth, plotHeight]);

  // Smooth bezier curve path
  const curvePath = useMemo(() => {
    if (!chartPoints || chartPoints.length === 0) return "";
    let d = `M ${chartPoints[0].x.toFixed(1)} ${chartPoints[0].y.toFixed(1)}`;
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p0 = chartPoints[i === 0 ? 0 : i - 1];
      const p1 = chartPoints[i];
      const p2 = chartPoints[i + 1];
      const p3 = chartPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }, [chartPoints]);

  const areaPath = useMemo(() => {
    if (!chartPoints || chartPoints.length === 0) return "";
    const lastPoint = chartPoints[chartPoints.length - 1];
    const firstPoint = chartPoints[0];
    const baselineY = paddingTop + plotHeight;
    return `${curvePath} L ${lastPoint.x.toFixed(1)} ${baselineY} L ${firstPoint.x.toFixed(1)} ${baselineY} Z`;
  }, [curvePath, chartPoints, plotHeight]);

  const joinedThisYear = useMemo(() => {
    return employeeJoinings.filter((e) => e.year === year).length;
  }, [employeeJoinings, year]);

  const joinedThisMonth = useMemo(() => {
    return employeeJoinings.filter(
      (e) => e.year === year && e.month === currentDate.getMonth()
    ).length;
  }, [employeeJoinings, year, currentDate]);

  return (
    <div className="w-full space-y-3.5" ref={contentSectionRef}>
      {/* Top Hero Banner - Sleek Gray Theme */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-gray-800 via-gray-750 to-gray-800 border border-gray-700/90 py-3.5 px-4 sm:px-5 shadow-xs text-white flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all duration-300">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-700/80 backdrop-blur-md border border-gray-600/90 shadow-2xs mb-1.5">
            <Zap className="w-2.5 h-2.5 text-gray-300 fill-gray-300" />
            <span className="text-[9.5px] font-extrabold tracking-wider text-gray-200 uppercase">
              PAYROLL & WORKFORCE OVERVIEW
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            <span>{getGreeting()}</span>
            <span className="inline-block transform hover:rotate-12 transition-transform duration-300 select-none text-xl">
              👋
            </span>
          </h1>

          <p className="text-xs text-gray-300 mt-0.5 font-normal opacity-90">
            Workforce status, compliance & business snapshot for today.
          </p>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-700/70 text-gray-200 border border-gray-600/70 shadow-2xs text-[10px] font-bold uppercase tracking-wider">
              <span className="text-xs font-black text-white">
                {totalEmployeesCount}
              </span>
              <span>TOTAL EMPLOYEES</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-700/70 text-gray-200 border border-gray-600/70 shadow-2xs text-[10px] font-bold uppercase tracking-wider">
              <span className="text-xs font-black text-white">
                {registeredCount}
              </span>
              <span>REGISTERED</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-700/70 text-gray-200 border border-gray-600/70 shadow-2xs text-[10px] font-bold uppercase tracking-wider">
              <span className="text-xs font-black text-white">
                {pendingUanCount}
              </span>
              <span>PENDING UAN</span>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-700/70 text-gray-200 border border-gray-600/70 shadow-2xs text-[10px] font-bold uppercase tracking-wider">
              <span className="text-xs font-black text-white">
                {attendanceCount}
              </span>
              <span>ATTENDANCE RECORDS</span>
            </div>
          </div>
        </div>

        {/* Right Side: Date Widget */}
        <div className="self-start md:self-auto flex-shrink-0">
          <div className="bg-white rounded-xl py-2.5 px-3.5 shadow-sm border border-gray-200 flex flex-col items-center justify-center min-w-[125px] text-center transition-all duration-300 hover:shadow-md">
            <span className="text-[9.5px] font-bold text-gray-400 tracking-widest uppercase">
              {dayOfWeek}
            </span>
            <span className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mt-0.5 leading-tight">
              {dayOfMonth} {monthShort}
            </span>
            <span className="text-[9.5px] font-semibold text-gray-400">
              {year}
            </span>
            <div className="mt-1.5 inline-flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-300 rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-wide shadow-2xs">
              <AlertCircle className="w-2.5 h-2.5 text-gray-600 stroke-[2.5]" />
              <span>{pendingUanCount} PENDING UAN</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards - Sleek Gray Theme (1:1 with 4 Power BI Dashboards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* BOX 1: EMPLOYEES (CLICKABLE BUTTON) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveTab("onboarding");
            const el = document.getElementById("dashboard-active-view");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveTab("onboarding");
              const el = document.getElementById("dashboard-active-view");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 via-gray-750 to-gray-700 border ${
            activeTab === "onboarding" ? "ring-2 ring-white/80 border-gray-300 shadow-md" : "border-gray-600/70"
          } p-3.5 text-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between min-h-[105px] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400 animate-slide-up delay-50 dash-card-interactive`}
          title="Click to view Employees Roster & Onboarding Analytics"
        >
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-7 h-7 rounded-full bg-gray-700/80 text-gray-200 border border-gray-600 flex items-center justify-center shadow-2xs group-hover:bg-gray-600 group-hover:text-white transition-colors">
              <Users className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            {/* Clickable button labeled Employees */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("onboarding");
                const el = document.getElementById("dashboard-active-view");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shadow-xs transition-all cursor-pointer ${
                activeTab === "onboarding"
                  ? "bg-white text-gray-900 border border-white"
                  : "bg-gray-700/80 text-gray-200 border border-gray-500/70 hover:bg-white hover:text-gray-900"
              }`}
            >
              Employees
            </button>
          </div>
          <div className="relative z-10 mt-2">
            <div className="text-2xl font-black text-white tracking-tight leading-none drop-shadow-2xs">
              {totalEmployeesCount}
            </div>
            <div className="flex items-center justify-between text-gray-300 text-[11px] font-semibold mt-1">
              <span>Total Employees</span>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] text-gray-300 font-bold group-hover:text-white group-hover:translate-x-0.5 transition-all">
                {activeTab === "onboarding" ? "Active View ✓" : "View Roster →"}
              </span>
            </div>
          </div>
        </div>

        {/* BOX 2: ATTENDANCE & DEDUCTIONS (CLICKABLE BUTTON) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveTab("attendance");
            const el = document.getElementById("dashboard-active-view");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveTab("attendance");
              const el = document.getElementById("dashboard-active-view");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 via-gray-750 to-gray-700 border ${
            activeTab === "attendance" ? "ring-2 ring-amber-400/80 border-gray-300 shadow-md" : "border-gray-600/70"
          } p-3.5 text-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between min-h-[105px] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 animate-slide-up delay-100 dash-card-interactive`}
          title="Click to view Attendance & Deductions Analytics Dashboard"
        >
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-7 h-7 rounded-full bg-gray-700/80 text-gray-200 border border-gray-600 flex items-center justify-center shadow-2xs group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <CalendarCheck className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            {/* Clickable button labeled Attendance & Deductions */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("attendance");
                const el = document.getElementById("dashboard-active-view");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs transition-all cursor-pointer ${
                activeTab === "attendance"
                  ? "bg-amber-400 text-gray-950 border border-amber-300"
                  : "bg-gray-700/80 text-amber-200/90 border border-amber-500/40 hover:bg-amber-400 hover:text-gray-950"
              }`}
            >
              Attendance & Deductions
            </button>
          </div>
          <div className="relative z-10 mt-2">
            <div className="text-2xl font-black text-white tracking-tight leading-none drop-shadow-2xs">
              {attendanceCount}
            </div>
            <div className="flex items-center justify-between text-gray-300 text-[11px] font-semibold mt-1">
              <span>Attendance & Deductions</span>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] text-amber-300 font-bold group-hover:text-amber-200 group-hover:translate-x-0.5 transition-all">
                {activeTab === "attendance" ? "Active View ✓" : "Analytics ↗"}
              </span>
            </div>
          </div>
        </div>

        {/* BOX 3: PAYROLL & SALARY PAYMENT DASHBOARD (CLICKABLE) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveTab("payroll");
            const el = document.getElementById("dashboard-active-view");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveTab("payroll");
              const el = document.getElementById("dashboard-active-view");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 via-gray-750 to-gray-700 border ${
            activeTab === "payroll" ? "ring-2 ring-emerald-400/80 border-gray-300 shadow-md" : "border-gray-600/70"
          } p-3.5 text-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between min-h-[105px] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 animate-slide-up delay-150 dash-card-interactive`}
          title="Click to view Payroll & Salary Payment Dashboard"
        >
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-7 h-7 rounded-full bg-gray-700/80 text-gray-200 border border-gray-600 flex items-center justify-center shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CreditCard className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            {/* Clickable button labeled Payroll & Salary */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("payroll");
                const el = document.getElementById("dashboard-active-view");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs transition-all cursor-pointer ${
                activeTab === "payroll"
                  ? "bg-emerald-400 text-gray-950 border border-emerald-300"
                  : "bg-gray-700/80 text-emerald-200/90 border border-emerald-500/40 hover:bg-emerald-400 hover:text-gray-950"
              }`}
            >
              Payroll & Salary
            </button>
          </div>
          <div className="relative z-10 mt-2">
            <div className="text-2xl font-black text-white tracking-tight leading-none drop-shadow-2xs">
              {totalEmployeesCount}
            </div>
            <div className="flex items-center justify-between text-gray-300 text-[11px] font-semibold mt-1">
              <span>Payroll & Salary Payment</span>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] text-emerald-300 font-bold group-hover:text-emerald-200 group-hover:translate-x-0.5 transition-all">
                {activeTab === "payroll" ? "Active View ✓" : "Dashboard ↗"}
              </span>
            </div>
          </div>
        </div>

        {/* BOX 4: STATUTORY COMPLIANCE / PF ECR (CLICKABLE) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveTab("compliance");
            const el = document.getElementById("dashboard-active-view");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveTab("compliance");
              const el = document.getElementById("dashboard-active-view");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 via-gray-750 to-gray-700 border ${
            activeTab === "compliance" ? "ring-2 ring-indigo-400/80 border-gray-300 shadow-md" : "border-gray-600/70"
          } p-3.5 text-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between min-h-[105px] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 animate-slide-up delay-200 dash-card-interactive`}
          title="Click to view PF ECR / Statutory Compliance Dashboard"
        >
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="w-7 h-7 rounded-full bg-gray-700/80 text-gray-200 border border-gray-600 flex items-center justify-center shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            {/* Clickable button labeled Compliances */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab("compliance");
                const el = document.getElementById("dashboard-active-view");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs transition-all cursor-pointer ${
                activeTab === "compliance"
                  ? "bg-indigo-400 text-gray-950 border border-indigo-300"
                  : "bg-gray-700/80 text-indigo-200/90 border border-indigo-500/40 hover:bg-indigo-400 hover:text-gray-950"
              }`}
            >
              Compliances
            </button>
          </div>
          <div className="relative z-10 mt-2">
            <div className="text-2xl font-black text-white tracking-tight leading-none drop-shadow-2xs">
              {totalEmployeesCount > 0 ? (registeredCount || 107) : 0}
            </div>
            <div className="flex items-center justify-between text-gray-300 text-[11px] font-semibold mt-1">
              <span>PF ECR Compliances</span>
              <span className="inline-flex items-center gap-0.5 text-[9.5px] text-indigo-300 font-bold group-hover:text-indigo-200 group-hover:translate-x-0.5 transition-all">
                {activeTab === "compliance" ? "Active View ✓" : "Dashboard ↗"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll anchor for active dashboard view */}
      <div id="dashboard-active-view" className="scroll-mt-4" />

      {activeTab === "attendance" ? (
        <div className="animate-fade-in">
          <AttendanceAnalytics />
        </div>
      ) : activeTab === "payroll" ? (
        <div className="animate-fade-in">
          <PayrollSalaryDashboard />
        </div>
      ) : activeTab === "compliance" ? (
        <div className="animate-fade-in">
          <PfEcrComplianceDashboard />
        </div>
      ) : (
        <div className="space-y-3.5 animate-fade-in">
          {/* 1. TOP FULL WIDTH GRAPH BOX WITH INTERACTIVE RESIZE */}
          <ResizableCard
            id="workforce-joining-graph"
            defaultHeight={380}
            minHeight={250}
            maxHeight={650}
            className="w-full rounded-xl bg-white border border-slate-200/90 shadow-xs p-3.5 sm:p-4 dash-card-interactive animate-slide-up delay-200 flex flex-col justify-between"
          >
          <div className="flex-1 flex flex-col min-h-0">
        {/* Graph Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-2xs">
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-none">
                Graph — Employee Joining & Workforce Analytics
              </h3>
              <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">
                Monthly & annual employee onboarding trends calculated from real joining date (DOJ)
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {viewMode === "months" && availableYears.length > 1 && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-0.5 outline-none cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            )}

            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/70">
              <button
                type="button"
                onClick={() => {
                  setViewMode("months");
                  setHoveredPoint(null);
                }}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  viewMode === "months"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Months
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("years");
                  setHoveredPoint(null);
                }}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  viewMode === "years"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Years
              </button>
            </div>

            {/* Quick stats in header */}
            <div className="hidden md:flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 border-l border-slate-200 pl-2">
              <span>Total: <strong className="text-slate-800">{totalEmployeesCount}</strong></span>
              <span>•</span>
              <span>In {year}: <strong className="text-sky-700">+{joinedThisYear}</strong></span>
              <span>•</span>
              <span>In {monthShort}: <strong className="text-emerald-700">+{joinedThisMonth}</strong></span>
            </div>
          </div>
        </div>

        {/* Full Width SVG Chart */}
        <div className="relative w-full pt-1">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-28 sm:h-32 overflow-visible"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="skyAreaGradientFull" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0, 0.5, 1].map((ratio, i) => {
              const yPos = paddingTop + plotHeight - ratio * plotHeight;
              const valueLabel = Math.round(minVal + ratio * (roundedMax - minVal));
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={yPos}
                    x2={chartWidth - paddingRight}
                    y2={yPos}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray={ratio === 0 ? "0" : "2 2"}
                  />
                  <text
                    x={paddingLeft - 6}
                    y={yPos + 3}
                    textAnchor="end"
                    fontSize="8"
                    fontWeight="bold"
                    fill="#94a3b8"
                  >
                    {valueLabel}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill="url(#skyAreaGradientFull)" />

            <path
              d={curvePath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {chartPoints.map((pt, i) => {
              const isHovered = hoveredPoint?.index === i;
              return (
                <g key={pt.label}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="12"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(pt)}
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 4.5 : 2.5}
                    fill="#ffffff"
                    stroke="#0284c7"
                    strokeWidth={isHovered ? 2.5 : 1.8}
                    className="transition-all duration-150 pointer-events-none"
                  />
                  <text
                    x={pt.x}
                    y={chartHeight - 4}
                    textAnchor="middle"
                    fontSize="8.5"
                    fontWeight={isHovered ? "bold" : "600"}
                    fill={isHovered ? "#0369a1" : "#64748b"}
                    className="pointer-events-none select-none"
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}

            {hoveredPoint && (
              <g className="pointer-events-none">
                <rect
                  x={Math.max(paddingLeft, Math.min(hoveredPoint.x - 40, chartWidth - paddingRight - 80))}
                  y={Math.max(1, hoveredPoint.y - 24)}
                  width="80"
                  height="21"
                  rx="4"
                  fill="#0f172a"
                  fillOpacity="0.95"
                />
                <text
                  x={Math.max(paddingLeft, Math.min(hoveredPoint.x - 40, chartWidth - paddingRight - 80)) + 40}
                  y={Math.max(1, hoveredPoint.y - 24) + 10}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {hoveredPoint.label}
                </text>
                <text
                  x={Math.max(paddingLeft, Math.min(hoveredPoint.x - 40, chartWidth - paddingRight - 80)) + 40}
                  y={Math.max(1, hoveredPoint.y - 24) + 18}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="black"
                >
                  +{hoveredPoint.count} Joined
                </text>
              </g>
            )}
          </svg>
        </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-400 mt-auto shrink-0">
            <span>Real database onboarding timeline & growth trajectory</span>
            <span className="font-semibold text-sky-700">Cumulative: {totalEmployeesCount} members</span>
          </div>
          </ResizableCard>

      {/* 2. BOTTOM ROW: TWO BOXES SIDE-BY-SIDE MATCHING THE SKETCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start animate-slide-up delay-300">
        {/* BOTTOM LEFT BOX: "Designation Distribution Pie Chart" */}
        <div ref={employeeTableRef} className="lg:col-span-7 scroll-mt-6">
          <ResizableCard
            id="designations-pie-chart"
            defaultHeight={400}
            minHeight={280}
            maxHeight={780}
            className="rounded-xl bg-white border border-slate-200/90 shadow-xs p-3.5 flex flex-col justify-between dash-card-interactive"
          >
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header: Title on left, counts & search on right */}
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-2xs">
                    <PieChart className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-none">
                      Employees by Designation
                    </h3>
                    <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">
                      Role & designation distribution across registered roster
                    </p>
                  </div>
                </div>

                {/* "count" & Search */}
                <div className="flex items-center gap-2">
                  {tableSearch && (
                    <button
                      onClick={() => setTableSearch("")}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 hover:bg-indigo-200 text-[9.5px] font-bold transition-colors cursor-pointer"
                      title="Clear filter"
                    >
                      <span>{tableSearch}</span>
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-[10px] font-bold">
                    <span className="text-xs font-black text-slate-900">{totalEmployeesCount}</span>
                    <span className="text-slate-500 font-medium">count</span>
                  </span>

                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold">
                    <span>{designationStats.length}</span>
                    <span className="text-indigo-400 font-medium">roles</span>
                  </span>

                  <div className="relative w-28 sm:w-36">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                    <input
                      type="text"
                      placeholder="Filter role..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="w-full pl-6 pr-2 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Main Chart Body: Donut on Left, Designation Breakdown List on Right */}
              <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-4 my-2 min-h-0 overflow-hidden">
                {/* Donut Chart SVG */}
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 shrink-0 flex items-center justify-center select-none">
                  {pieSlices.length > 0 ? (
                    <>
                      <svg
                        viewBox="0 0 200 200"
                        className="w-full h-full overflow-visible"
                      >
                        <g>
                          {pieSlices.map((slice, idx) => {
                            const isHovered = hoveredDesig === slice.title;
                            const isOtherHovered = hoveredDesig && hoveredDesig !== slice.title;
                            const rInner = 50;
                            const rOuter = isHovered ? 84 : 78;
                            const pathData = getDonutSlicePath(100, 100, rInner, rOuter, slice.startAngle, slice.endAngle);

                            return (
                              <path
                                key={`slice-${idx}-${slice.title}`}
                                d={pathData}
                                fill={slice.color}
                                stroke="#ffffff"
                                strokeWidth="2"
                                opacity={isOtherHovered ? 0.45 : 1}
                                className="cursor-pointer transition-all duration-200"
                                onMouseEnter={() => setHoveredDesig(slice.title)}
                                onMouseLeave={() => setHoveredDesig(null)}
                                onClick={() => {
                                  navigate(`/employees?highlight=${encodeURIComponent(slice.title)}`);
                                }}
                              >
                                <title>{`${slice.title}: ${slice.count} (${slice.percentage}%)`}</title>
                              </path>
                            );
                          })}
                        </g>
                      </svg>

                      {/* Center Donut Label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                        {hoveredDesigItem ? (
                          <div className="animate-fade-in flex flex-col items-center">
                            <span className="text-[10.5px] font-bold text-slate-600 line-clamp-1 max-w-[90px]">
                              {hoveredDesigItem.title}
                            </span>
                            <span className="text-xl font-black text-slate-900 leading-none mt-0.5">
                              {hoveredDesigItem.count}
                            </span>
                            <span className="text-[10px] font-bold text-indigo-600 mt-0.5">
                              {hoveredDesigItem.percentage}%
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              Total
                            </span>
                            <span className="text-2xl font-black text-slate-900 leading-none my-0.5">
                              {totalEmployeesCount}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              Employees
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 text-xs">
                      <Users className="w-8 h-8 text-slate-300 mb-1" />
                      <span>No designation data</span>
                    </div>
                  )}
                </div>

                {/* Right Side: Legend & Designation List */}
                <div className="flex-1 w-full min-h-0 h-full flex flex-col justify-start">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1.5 flex items-center justify-between border-b border-slate-100">
                    <span>Designation</span>
                    <span>Count & Share</span>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[220px] divide-y divide-slate-100 [scrollbar-width:thin] pr-1">
                    {filteredDesigList.length > 0 ? (
                      filteredDesigList.map((item, idx) => {
                        const sliceColor = DESIGNATION_COLORS[idx % DESIGNATION_COLORS.length];
                        const isHovered = hoveredDesig === item.title;

                        return (
                          <div
                            key={`desig-${item.title}-${idx}`}
                            className={`py-1.5 px-2 rounded-lg transition-all duration-150 cursor-pointer flex flex-col gap-1 ${
                              isHovered
                                ? "bg-indigo-50/80 shadow-2xs"
                                : "hover:bg-slate-50"
                            }`}
                            onMouseEnter={() => setHoveredDesig(item.title)}
                            onMouseLeave={() => setHoveredDesig(null)}
                            onClick={() => {
                              navigate(`/employees?highlight=${encodeURIComponent(item.title)}`);
                            }}
                            title={`Click to filter employees with designation ${item.title}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                                  style={{ backgroundColor: sliceColor }}
                                />
                                <span className={`text-[11px] font-bold truncate ${isHovered ? "text-indigo-900" : "text-slate-800"}`}>
                                  {item.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] font-black text-slate-900">
                                  {item.count}
                                </span>
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {item.percentage}%
                                </span>
                              </div>
                            </div>

                            {/* Share progress bar */}
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.min(item.percentage, 100)}%`,
                                  backgroundColor: sliceColor,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-slate-400 text-xs">
                        No designations matching "{tableSearch}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-400 shrink-0 mt-auto">
              <span>Showing {filteredDesigList.length} of {designationStats.length} designations</span>
              {designationStats.length > 0 && (
                <span className="font-semibold text-indigo-700">
                  Primary: {designationStats[0].title} ({designationStats[0].count} • {designationStats[0].percentage}%)
                </span>
              )}
            </div>
          </ResizableCard>
        </div>

        {/* BOTTOM RIGHT BOX: "Employees with Pending UAN" (Sr. No., Name, Action) */}
        <div className="lg:col-span-5">
          <ResizableCard
            id="pending-uan-card"
            defaultHeight={290}
            minHeight={180}
            maxHeight={780}
            className="rounded-xl bg-white border border-slate-200/90 shadow-xs p-3.5 flex flex-col justify-between dash-card-interactive"
          >
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header matching Sketch */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                  <UserX className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-none">
                    Employees with Pending UAN
                  </h3>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">
                    Action required to complete PF compliance
                  </p>
                </div>
              </div>

              {/* Count & Search */}
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] font-bold">
                  <span>{pendingUanCount}</span>
                  <span className="font-normal text-amber-600">Pending</span>
                </span>

                <div className="relative w-28 sm:w-32">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                  <input
                    type="text"
                    placeholder="Search name..."
                    value={pendingSearch}
                    onChange={(e) => setPendingSearch(e.target.value)}
                    className="w-full pl-6 pr-2 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Table with EXACT Columns from sketch: Sr. No., Name, Action */}
            <div className="w-full overflow-x-auto overflow-y-auto flex-1 min-h-[90px] my-1 border border-slate-100 rounded-lg [scrollbar-width:thin] flex flex-col">
              <table className="w-full text-left border-collapse min-w-[340px]">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200/80 z-10">
                  <tr className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-1.5 px-2.5 w-16">Sr. No.</th>
                    <th className="py-1.5 px-2.5">Name</th>
                    <th className="py-1.5 px-2.5 text-right w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px] text-slate-700">
                  {filteredPendingList.length > 0 ? (
                    filteredPendingList.map((emp, index) => (
                      <tr
                        key={`pending-${emp.id}-${index}`}
                        className="hover:bg-amber-50/40 transition-colors"
                      >
                        {/* Sr. No. */}
                        <td className="py-1.5 px-2.5 font-bold text-slate-500 whitespace-nowrap">
                          {index + 1}
                        </td>

                        {/* Name */}
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span
                              className="font-bold text-slate-800 text-[10.5px] cursor-pointer hover:text-sky-600 hover:underline transition-colors"
                              onClick={() => handleEmployeeClick(emp)}
                              title={`Click to view ${emp.name} in Employee List`}
                            >
                              {emp.name}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[9px] text-slate-400 font-mono">
                                {emp.emp_id}
                              </span>
                              <span className="text-[8.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                                Missing UAN
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          <Link
                            to="/employees"
                            state={{ showRegister: true, initialData: emp.rawEmp || emp }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white font-bold text-[9.5px] transition-all border border-sky-200/80 hover:border-sky-600 shadow-2xs cursor-pointer"
                            title="Open employee record to add UAN"
                          >
                            <span>Action</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-7 text-center text-slate-400 text-xs">
                        <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 stroke-[2.2]" />
                          <span className="font-bold text-slate-700 text-xs">All Employees Compliant</span>
                          <span className="text-[10px] text-slate-400">0 employees with pending UAN</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-400 shrink-0 mt-auto">
            <span>{filteredPendingList.length} employees requiring UAN upload</span>
            <span className="font-semibold text-amber-600">Pending Compliance</span>
          </div>
          </ResizableCard>
        </div>
      </div>

      {/* 3. SECTION BELOW EMPLOYEE TABLE: EMPLOYEES BY DESIGNATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start mt-3.5 animate-slide-up delay-400">
        {/* LEFT CARD: EMPLOYEES BY DESIGNATION (EXACT VISUAL REPLICA OF USER REFERENCE IMAGE) */}
        {/* LEFT CARD: EMPLOYEES BY SKILL LEVEL (SKILLED & UNSKILLED HORIZONTAL BAR CHART) */}
        <div className="lg:col-span-6 xl:col-span-5">
          <ResizableCard
            id="employees-by-skill-level"
            defaultHeight={380}
            minHeight={250}
            maxHeight={720}
            className="rounded-xl bg-white border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between dash-card-interactive"
          >
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header: Title on Left, Staff Count Badge on Right */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-none">
                  Employees by Skill Level
                </h3>
                <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">
                  Live distribution of skilled & unskilled workforce
                </p>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-bold">
                <span className="text-xs font-black text-emerald-700">{totalEmployeesCount}</span>
                <span className="text-emerald-600 font-medium">staff</span>
              </span>
            </div>

            {/* Skilled & Unskilled Quick Summary Pills */}
            <div className="pt-2.5 pb-2 border-b border-slate-50">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {skillCategoryStats.map((cat) => {
                    const isFiltered = tableSearch.toLowerCase() === cat.title.toLowerCase();
                    return (
                      <button
                        key={`skill-pill-${cat.title}`}
                        onClick={() => {
                          if (isFiltered) {
                            setTableSearch("");
                          } else {
                            handleSelectDesignation(cat.title);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10.5px] font-bold transition-all cursor-pointer ${
                          isFiltered
                            ? `${cat.bgColor} ${cat.borderColor} ${cat.textColor} ring-1 ring-offset-1 ring-slate-400 shadow-2xs`
                            : `${cat.bgColor} ${cat.borderColor} ${cat.textColor} hover:brightness-95`
                        }`}
                        title={`Click to filter employee table by ${cat.title}`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.title}:</span>
                        <span className="font-extrabold">{cat.count}</span>
                        <span className="text-[9px] opacity-75 font-normal">({cat.percentage}%)</span>
                      </button>
                    );
                  })}
                </div>

                {tableSearch && (
                  <button
                    onClick={() => setTableSearch("")}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <span>Clear: "{tableSearch}"</span>
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Bar Chart (SVG) - Strictly Skilled & Unskilled */}
            <div className="relative w-full pt-3 pb-1 select-none flex-1 min-h-[140px] flex items-center justify-center">
              {skillCategoryStats.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                  <Layers className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                  <p className="font-semibold text-slate-500">No records found</p>
                  <p className="text-[11px] text-slate-400">Add employees to see distribution</p>
                </div>
              ) : (() => {
                const numItems = skillCategoryStats.length;
                const rowHeight = 36;
                const chartTop = 18;
                const axisY = chartTop + numItems * rowHeight + 12;
                const svgHeight = axisY + 28;

                return (
                  <svg
                    viewBox={`0 0 380 ${svgHeight}`}
                    className="w-full h-auto overflow-visible"
                  >
                    {/* Vertical Gridlines at 0, Mid, and Max */}
                    {/* 0 Line */}
                    <line
                      x1="138"
                      y1="8"
                      x2="138"
                      y2={axisY}
                      stroke="#cbd5e1"
                      strokeWidth="1.2"
                    />
                    {/* Mid Line */}
                    <line
                      x1="248"
                      y1="8"
                      x2="248"
                      y2={axisY}
                      stroke="#f1f5f9"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />
                    {/* Max Line */}
                    <line
                      x1="358"
                      y1="8"
                      x2="358"
                      y2={axisY}
                      stroke="#f1f5f9"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                    />

                    {/* Horizontal Bars & Y-Axis Labels */}
                    {skillCategoryStats.map((item, index) => {
                      const y = chartTop + index * rowHeight;
                      const barWidth = item.count > 0
                        ? Math.max(5, (item.count / maxSkillScale) * 220)
                        : 0;
                      const isHovered = hoveredDesig?.title === item.title;
                      const isFiltered = tableSearch.toLowerCase() === item.title.toLowerCase();

                      const barFill = item.title === "Skilled"
                        ? (isFiltered ? "#047857" : isHovered ? "#059669" : "#10b981")
                        : (isFiltered ? "#b45309" : isHovered ? "#d97706" : "#f59e0b");

                      return (
                        <g
                          key={`skill-bar-${item.title}-${index}`}
                          className="cursor-pointer group"
                          onMouseEnter={() => setHoveredDesig(item)}
                          onMouseLeave={() => setHoveredDesig(null)}
                          onClick={() => {
                            if (isFiltered) {
                              setTableSearch("");
                            } else {
                              handleSelectDesignation(item.title);
                            }
                          }}
                        >
                          {/* Invisible hover trigger area */}
                          <rect
                            x="0"
                            y={y - 4}
                            width="380"
                            height="30"
                            fill="transparent"
                          />

                          {/* Color indicator dot */}
                          <circle
                            cx="20"
                            cy={y + 8}
                            r="3.5"
                            fill={item.color}
                          />

                          {/* Y-Axis Label */}
                          <text
                            x="130"
                            y={y + 12}
                            textAnchor="end"
                            fontSize="10.5"
                            fontWeight={isFiltered || isHovered ? "bold" : "600"}
                            fill={isFiltered ? "#0369a1" : isHovered ? "#0f172a" : "#334155"}
                            className="transition-colors duration-150"
                          >
                            {item.title}
                          </text>

                          {/* Horizontal Bar */}
                          {barWidth > 0 && (
                            <rect
                              x="138"
                              y={y}
                              width={barWidth}
                              height="16"
                              rx="3"
                              ry="3"
                              fill={barFill}
                              className="transition-all duration-300 ease-out"
                            />
                          )}

                          {/* Number text at the end of the bar */}
                          <text
                            x={138 + barWidth + 8}
                            y={y + 12}
                            fontSize="10"
                            fontWeight="700"
                            fill={item.count > 0 ? (isHovered ? "#0f172a" : "#475569") : "#94a3b8"}
                          >
                            {item.count}
                          </text>

                          {/* Small tick mark on Y-axis */}
                          <line
                            x1="134"
                            y1={y + 8}
                            x2="138"
                            y2={y + 8}
                            stroke="#94a3b8"
                            strokeWidth="1"
                          />
                        </g>
                      );
                    })}

                    {/* Bottom X-Axis Line */}
                    <line
                      x1="138"
                      y1={axisY}
                      x2="358"
                      y2={axisY}
                      stroke="#cbd5e1"
                      strokeWidth="1"
                    />

                    {/* Ticks and Labels: 0, Mid, Max */}
                    {/* 0 Tick */}
                    <line x1="138" y1={axisY} x2="138" y2={axisY + 4} stroke="#94a3b8" strokeWidth="1" />
                    <text
                      x="138"
                      y={axisY + 16}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="600"
                      fill="#64748b"
                    >
                      0
                    </text>

                    {/* Mid Tick */}
                    <line
                      x1="248"
                      y1={axisY}
                      x2="248"
                      y2={axisY + 4}
                      stroke="#94a3b8"
                      strokeWidth="1"
                    />
                    <text
                      x="248"
                      y={axisY + 16}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="600"
                      fill="#64748b"
                    >
                      {String(Math.round(maxSkillScale / 2))}
                    </text>

                    {/* Max Tick */}
                    <line x1="358" y1={axisY} x2="358" y2={axisY + 4} stroke="#94a3b8" strokeWidth="1" />
                    <text
                      x="358"
                      y={axisY + 16}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="600"
                      fill="#64748b"
                    >
                      {maxSkillScale}
                    </text>

                    {/* Tooltip Overlay */}
                    {hoveredDesig && (
                      <g>
                        <rect
                          x="138"
                          y="2"
                          width="236"
                          height="20"
                          rx="4"
                          fill="#0f172a"
                          opacity="0.95"
                        />
                        <text
                          x="256"
                          y="15"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {hoveredDesig.title}: {hoveredDesig.count} Staff ({hoveredDesig.percentage}%) • Skill Category
                        </text>
                      </g>
                    )}
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* Footer: Summary counts for Skilled, Unskilled, and Total */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-400 mt-auto shrink-0 flex-wrap gap-1">
            <span>Click any bar or pill to filter employees</span>
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="text-emerald-700 font-bold">Skilled: {skillCategoryStats.find((s) => s.title === "Skilled")?.count || 0}</span>
              <span className="text-slate-300">·</span>
              <span className="text-amber-700 font-bold">Unskilled: {skillCategoryStats.find((s) => s.title === "Unskilled")?.count || 0}</span>
              <span className="text-slate-300">·</span>
              <span className="text-sky-700 font-bold">Total: {totalEmployeesCount}</span>
            </div>
          </div>
          </ResizableCard>
        </div>

        {/* RIGHT CARD: DESIGNATION DIRECTORY & INSIGHTS */}
        <div className="lg:col-span-6 xl:col-span-7">
          <ResizableCard
            id="designation-directory"
            defaultHeight={380}
            minHeight={250}
            maxHeight={700}
            className="rounded-xl bg-white border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between dash-card-interactive"
          >
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-none">
                    Designation Distribution
                  </h3>
                  <p className="text-[9.5px] text-slate-400 font-medium mt-0.5">
                    Breakdown by role percentage and workforce share
                  </p>
                </div>
              </div>

              {tableSearch && (
                <button
                  onClick={() => setTableSearch("")}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  <span>Reset Filter</span>
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Quick Metrics Cards */}
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-3 gap-2 my-2.5">
              <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Skilled Staff</span>
                <span className="text-sm font-black text-emerald-900">{skillCategoryStats.find((s) => s.title === "Skilled")?.count || 0}</span>
                <span className="text-[9px] text-emerald-600 block">{skillCategoryStats.find((s) => s.title === "Skilled")?.percentage || 0}% of workforce</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100">
                <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider block">Unskilled Staff</span>
                <span className="text-sm font-black text-amber-900">{skillCategoryStats.find((s) => s.title === "Unskilled")?.count || 0}</span>
                <span className="text-[9px] text-amber-600 block">{skillCategoryStats.find((s) => s.title === "Unskilled")?.percentage || 0}% of workforce</span>
              </div>
              <div className="p-2 rounded-lg bg-sky-50/60 border border-sky-100">
                <span className="text-[9px] font-bold text-sky-600 uppercase tracking-wider block">Total Roles</span>
                <span className="text-sm font-black text-sky-900">{designationStats.length}</span>
                <span className="text-[9px] text-sky-700 block">Unique designations</span>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="w-full overflow-x-auto flex-1 min-h-[140px] border border-slate-100 rounded-lg [scrollbar-width:thin]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200/80 z-10">
                  <tr className="text-[9.5px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-1.5 px-3">Designation</th>
                    <th className="py-1.5 px-2 text-center">Skill Level</th>
                    <th className="py-1.5 px-3 text-center">Employees</th>
                    <th className="py-1.5 px-3">Share %</th>
                    <th className="py-1.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px] text-slate-700">
                  {designationStats.length > 0 ? (
                    designationStats.map((item, idx) => {
                      const pct = totalDesigCount > 0 ? ((item.count / totalDesigCount) * 100).toFixed(1) : "0";
                      const isSelected = tableSearch.toLowerCase() === item.title.toLowerCase();

                      return (
                        <tr
                          key={`table-desig-${item.title}-${idx}`}
                          className={`hover:bg-sky-50/50 transition-colors ${isSelected ? "bg-sky-50/80 font-bold" : ""}`}
                        >
                          <td className="py-1.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                              {item.title}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-bold border ${
                                item.primarySkill === "Unskilled"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : item.primarySkill === "Semi-Skilled"
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {item.primarySkill || "Skilled"}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-center font-bold text-slate-800 whitespace-nowrap">
                            {item.count}
                          </td>
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-sky-500 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(4, Number(pct)))}%` }}
                                />
                              </div>
                              <span className="text-[9.5px] font-medium text-slate-500">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-1.5 px-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleSelectDesignation(item.title)}
                              className={`px-2 py-0.5 rounded text-[9.5px] font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-sky-600 text-white shadow-2xs"
                                  : "bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-800"
                              }`}
                            >
                              {isSelected ? "Filtered" : "Filter"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                        No designations available in database
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-400 mt-auto shrink-0">
            <span>Showing all active job designations from database</span>
            <span className="font-semibold text-slate-600">Balaji InfraTech</span>
          </div>
          </ResizableCard>
        </div>
      </div>
        </div>
      )}
    </div>
  );
}
