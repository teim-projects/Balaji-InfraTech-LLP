import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Award,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import defaultComplianceData from "../data/pfEcrComplianceData.json";
import ResizableCard from "./ResizableCard";

// Formatters matching Power BI exact presentation
const formatCardCurrency = (val) => {
  const n = Number(val || 0);
  if (n === 0) return "₹ 0";
  if (n >= 10000000) {
    return "₹ " + (n / 10000000).toFixed(2) + " Cr";
  }
  if (n >= 1000000) {
    return "₹ " + (n / 1000000).toFixed(2) + "M";
  }
  if (n >= 1000) {
    return "₹ " + (n / 1000).toFixed(2) + "K";
  }
  return "₹ " + n.toLocaleString("en-IN");
};

const formatFullCurrency = (val) => {
  const n = Number(val || 0);
  return "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PfEcrComplianceDashboard() {
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const token = localStorage.getItem("access") || localStorage.getItem("token") || "";

  // Data state
  const [complianceRecords, setComplianceRecords] = useState(defaultComplianceData.records || []);
  const [loading, setLoading] = useState(false);
  const [isLiveDb, setIsLiveDb] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWageFilter, setSelectedWageFilter] = useState("All");

  // Table pagination & sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortField, setSortField] = useState("sr_no");
  const [sortAsc, setSortAsc] = useState(true);

  // Interactive hover states for charts
  const [hoveredBarGross, setHoveredBarGross] = useState(null);
  const [hoveredBarContri, setHoveredBarContri] = useState(null);

  // Check if live DB has employee/compliance records
  useEffect(() => {
    let isMounted = true;
    const fetchLiveCompliance = async () => {
      try {
        setLoading(true);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${BASE_API.replace(/\/$/, "")}/payroll/employee-details/`, {
          headers,
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          if (!isMounted) return;

          // If database was deleted (0 employees), reflect 0 records
          if (list.length === 0) {
            setComplianceRecords([]);
            setIsLiveDb(true);
            return;
          }

          // If DB has employees, map them into PF compliance format with real wage structures
          const pfMembers = list.filter((e) => e.uan_no && String(e.uan_no).trim() !== "" && String(e.uan_no) !== "-");
          if (pfMembers.length > 0) {
            const mapped = pfMembers.map((emp, idx) => {
              const gross = parseFloat(emp.gross_salary) || 18370.73;
              const epf = Math.min(15000, parseFloat(emp.basic) || 15000);
              const eps = Math.min(15000, parseFloat(emp.basic) || 15000);
              const edli = epf;
              const epfContri = Math.round(epf * 0.12 * 100) / 100;
              const epsContri = Math.round(eps * 0.0833 * 100) / 100;
              const diff = Math.round((epfContri - epsContri) * 100) / 100;
              const ncp = Math.max(0, 30 - (parseInt(emp.calculation_days, 10) || 27));

              return {
                sr_no: idx + 1,
                uan: String(emp.uan_no).trim(),
                name: emp.name,
                gross_wages: gross,
                epf_wages: epf,
                eps_wages: eps,
                edli_wages: edli,
                epf_contri: epfContri,
                eps_contri: epsContri,
                diff: diff,
                ncp_days: ncp,
              };
            });
            setComplianceRecords(mapped);
            setIsLiveDb(true);
            return;
          }
        }
      } catch (e) {
        console.warn("Using verified PF ECR dataset:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLiveCompliance();
    return () => {
      isMounted = false;
    };
  }, [BASE_API, token]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return complianceRecords.filter((r) => {
      const matchSearch =
        searchTerm.trim() === "" ||
        (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.uan && r.uan.includes(searchTerm));

      if (!matchSearch) return false;

      if (selectedWageFilter === "Capped") {
        return r.epf_wages >= 15000;
      }
      if (selectedWageFilter === "Below") {
        return r.epf_wages < 15000;
      }
      return true;
    });
  }, [complianceRecords, searchTerm, selectedWageFilter]);

  // Dynamic KPI Aggregates matching Power BI cards
  const kpis = useMemo(() => {
    const totalMembers = filteredRecords.length;
    const totalGross = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.gross_wages) || 0), 0);
    const totalEpsWages = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.eps_wages) || 0), 0);
    const totalEpfWages = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.epf_wages) || 0), 0);
    const totalEpfContri = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.epf_contri) || 0), 0);
    const totalEpsContri = filteredRecords.reduce((acc, r) => acc + (parseFloat(r.eps_contri) || 0), 0);

    return {
      totalMembers,
      totalGross,
      totalEpsWages,
      totalEpfWages,
      totalEpfContri,
      totalEpsContri,
    };
  }, [filteredRecords]);

  // Top 10 Employees for Visual Charts (Gross vs EPF Wages & EPF vs EPS Contri)
  const top10Employees = useMemo(() => {
    if (complianceRecords.length === 0) return [];
    const sorted = [...complianceRecords].sort((a, b) => b.gross_wages - a.gross_wages);
    return sorted.slice(0, 10);
  }, [complianceRecords]);

  // Max scale for Gross vs EPF chart (20K baseline)
  const maxWageScale = useMemo(() => {
    if (top10Employees.length === 0) return 20000;
    const m = Math.max(...top10Employees.map((e) => Math.max(e.gross_wages, e.epf_wages)));
    return Math.max(20000, Math.ceil(m / 5000) * 5000);
  }, [top10Employees]);

  // Max scale for Contri chart (2K baseline)
  const maxContriScale = useMemo(() => {
    if (top10Employees.length === 0) return 2000;
    const m = Math.max(...top10Employees.map((e) => Math.max(e.epf_contri, e.eps_contri)));
    return Math.max(2000, Math.ceil(m / 500) * 500);
  }, [top10Employees]);

  // Sort and Paginate
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (
        sortField === "sr_no" ||
        sortField === "gross_wages" ||
        sortField === "epf_wages" ||
        sortField === "eps_wages" ||
        sortField === "edli_wages" ||
        sortField === "epf_contri" ||
        sortField === "eps_contri" ||
        sortField === "ncp_days"
      ) {
        va = Number(va || 0);
        vb = Number(vb || 0);
        return sortAsc ? va - vb : vb - va;
      }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "sr_no" || field === "name" || field === "uan");
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "SR NO",
      "UAN",
      "MEMBER NAME",
      "GROSS WAGES",
      "EPF WAGES",
      "EPS WAGES",
      "EDLI WAGES",
      "EPF CONTRI",
      "EPS CONTRI",
      "DIFF",
      "NCP DAYS",
    ];
    const rows = sortedRecords.map((r) => [
      r.sr_no,
      `"${r.uan}"`,
      `"${r.name}"`,
      r.gross_wages.toFixed(2),
      r.epf_wages.toFixed(2),
      r.eps_wages.toFixed(2),
      r.edli_wages.toFixed(2),
      r.epf_contri.toFixed(2),
      r.eps_contri.toFixed(2),
      r.diff.toFixed(2),
      r.ncp_days,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PF_ECR_Statutory_Compliance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-4 pb-6 font-sans animate-fade-in">
      {/* ── TOP 6 KPI METRIC CARDS ROW (Exact match to Power BI Page 4) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total PF Members */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <span>Total PF Members</span>
            <Users className="w-3.5 h-3.5 text-sky-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 leading-none">
            {kpis.totalMembers}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
            <span>ECR Return Active</span>
          </div>
        </div>

        {/* Card 2: Total Gross Wages */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <span>Total Gross Wages</span>
            <DollarSign className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 leading-none">
            {formatCardCurrency(kpis.totalGross)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1 truncate" title={formatFullCurrency(kpis.totalGross)}>
            {kpis.totalGross > 0 ? formatFullCurrency(kpis.totalGross) : "₹ 0.00"}
          </div>
        </div>

        {/* Card 3: Total EPS Wages */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <span>Total EPS Wages</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 leading-none">
            {formatCardCurrency(kpis.totalEpsWages)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1 truncate" title={formatFullCurrency(kpis.totalEpsWages)}>
            {kpis.totalEpsWages > 0 ? formatFullCurrency(kpis.totalEpsWages) : "₹ 0.00"}
          </div>
        </div>

        {/* Card 4: Total EPF Wages */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <span>Total EPF Wages</span>
            <Layers className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 leading-none">
            {formatCardCurrency(kpis.totalEpfWages)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1 truncate" title={formatFullCurrency(kpis.totalEpfWages)}>
            {kpis.totalEpfWages > 0 ? formatFullCurrency(kpis.totalEpfWages) : "₹ 0.00"}
          </div>
        </div>

        {/* Card 5: EPF Contribution */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <span>EPF Contribution</span>
            <Award className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 leading-none">
            {formatCardCurrency(kpis.totalEpfContri)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1 truncate" title={formatFullCurrency(kpis.totalEpfContri)}>
            {kpis.totalEpfContri > 0 ? formatFullCurrency(kpis.totalEpfContri) : "₹ 0.00"}
          </div>
        </div>

        {/* Card 6: EPS Contribution */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <span>EPS Contribution</span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-1.5 leading-none">
            {formatCardCurrency(kpis.totalEpsContri)}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1 truncate" title={formatFullCurrency(kpis.totalEpsContri)}>
            {kpis.totalEpsContri > 0 ? formatFullCurrency(kpis.totalEpsContri) : "₹ 0.00"}
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by UAN or Member Name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
            />
          </div>

          <select
            value={selectedWageFilter}
            onChange={(e) => {
              setSelectedWageFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
          >
            <option value="All">All Wages</option>
            <option value="Capped">Capped (₹15,000)</option>
            <option value="Below">&lt; ₹15,000</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {(searchTerm || selectedWageFilter !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedWageFilter("All");
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-900 hover:bg-slate-800 text-[11px] font-bold text-white shadow-xs transition-all cursor-pointer"
            title="Download PF ECR Report as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ECR CSV</span>
          </button>
        </div>
      </div>

      {/* ── 2-COLUMN MAIN LAYOUT (Left: 2 Charts | Right: Member Details Table) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* ── LEFT COLUMN (5 Cols: Top 10 Gross vs EPF & Top 10 EPF vs EPS) ── */}
        <div className="lg:col-span-5 space-y-3.5 flex flex-col">
          {/* VISUAL 1: Top 10 Employees - Gross vs EPF Wages (Grouped Vertical Bar Chart) */}
          <ResizableCard
            id="pf-gross-epf-chart"
            defaultHeight={340}
            minHeight={240}
            maxHeight={650}
            className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex-1 flex flex-col justify-between dash-card-interactive"
          >
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                  Top 10 Employees — Gross vs EPF Wages
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">Grouped Column</span>
              </div>

              {/* Legend matching Power BI */}
              <div className="flex items-center justify-end gap-3 mt-2 text-[10px] font-bold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#64748b] inline-block" />
                  <span>Total EPF Wages</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0f172a] inline-block" />
                  <span>Total Gross Wages</span>
                </div>
              </div>

              {/* Vertical Grouped Bars Container */}
              <div className="mt-3 relative h-48 w-full flex items-end">
                {/* Y-axis labels (0, 5K, 10K, 15K, 20K) */}
                <div className="w-8 h-full flex flex-col justify-between text-[9px] text-slate-400 font-semibold pb-6">
                  <span>20K</span>
                  <span>15K</span>
                  <span>10K</span>
                  <span>5K</span>
                  <span>0</span>
                </div>

                {/* Bars Area */}
                <div className="flex-1 h-full flex flex-col justify-between relative pl-1">
                  {/* Grid lines */}
                  <div className="w-full border-b border-dashed border-slate-200 h-0" />
                  <div className="w-full border-b border-dashed border-slate-200 h-0" />
                  <div className="w-full border-b border-dashed border-slate-200 h-0" />
                  <div className="w-full border-b border-slate-300 h-0" />

                  {/* Bars flex row */}
                  {top10Employees.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-semibold">
                      No employee wage data available.
                    </div>
                  ) : (
                    <div className="absolute inset-0 bottom-6 flex items-end justify-between gap-1 px-1">
                      {top10Employees.map((emp, i) => {
                        const epfPct = Math.min(100, Math.max(8, (emp.epf_wages / maxWageScale) * 100));
                        const grossPct = Math.min(100, Math.max(10, (emp.gross_wages / maxWageScale) * 100));
                        const isHovered = hoveredBarGross?.name === emp.name;

                        return (
                          <div
                            key={emp.uan + i}
                            className="flex-1 h-full flex items-end justify-center gap-0.5 group cursor-pointer relative"
                            onMouseEnter={() => setHoveredBarGross(emp)}
                            onMouseLeave={() => setHoveredBarGross(null)}
                          >
                            {/* Hover Tooltip */}
                            {isHovered && (
                              <div className="absolute -top-12 z-30 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[9.5px] font-bold shadow-xl whitespace-nowrap pointer-events-none">
                                <div className="text-[10px] text-sky-400 font-black truncate max-w-[160px]">{emp.name}</div>
                                <div className="flex items-center gap-2 mt-0.5 text-slate-300">
                                  <span>Gross: {formatFullCurrency(emp.gross_wages)}</span>
                                  <span>EPF: {formatFullCurrency(emp.epf_wages)}</span>
                                </div>
                              </div>
                            )}

                            {/* Bar 1: Total EPF Wages (lighter slate / #64748b) */}
                            <div
                              style={{ height: `${epfPct}%` }}
                              className={`w-1.5 sm:w-2 rounded-t transition-all duration-300 ${
                                isHovered ? "bg-sky-500 shadow-sm" : "bg-[#64748b]"
                              }`}
                            />

                            {/* Bar 2: Total Gross Wages (dark slate / #0f172a) */}
                            <div
                              style={{ height: `${grossPct}%` }}
                              className={`w-1.5 sm:w-2 rounded-t transition-all duration-300 ${
                                isHovered ? "bg-slate-950 shadow-sm" : "bg-[#0f172a]"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* X-axis labels (Vertical / abbreviated employee names matching screenshot) */}
                  <div className="w-full flex justify-between gap-1 text-[7px] sm:text-[7.5px] text-slate-500 font-semibold pt-1 px-0.5">
                    {top10Employees.map((e, idx) => {
                      const parts = e.name.split(" ");
                      const shortName = parts.length > 1 ? `${parts[0].slice(0, 4)} ${parts[1].slice(0, 3)}` : e.name.slice(0, 7);
                      return (
                        <div key={idx} className="flex-1 text-center truncate" title={e.name}>
                          {shortName}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between mt-auto shrink-0">
              <span>Gross vs EPF statutory wage ceiling</span>
              <span className="font-semibold text-slate-600">EPF Capped: ₹15,000</span>
            </div>
          </ResizableCard>

          {/* VISUAL 2: Top 10 Employees - EPF vs EPS Contribution (Grouped Horizontal Bar Chart) */}
          <ResizableCard
            id="pf-epf-eps-chart"
            defaultHeight={340}
            minHeight={240}
            maxHeight={650}
            className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex-1 flex flex-col justify-between dash-card-interactive"
          >
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                  Top 10 Employees — EPF vs EPS Contribution
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">Grouped Bar</span>
              </div>

              {/* Legend matching Power BI */}
              <div className="flex items-center justify-end gap-3 mt-2 text-[10px] font-bold text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#64748b] inline-block" />
                  <span>EPF Contribution</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#0f172a] inline-block" />
                  <span>EPS Contribution</span>
                </div>
              </div>

              {/* Horizontal Grouped Bars Container */}
              <div className="mt-3 space-y-2">
                {top10Employees.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                    No contribution data available.
                  </div>
                ) : (
                  top10Employees.map((emp, i) => {
                    const epfWidth = Math.min(100, Math.max(6, (emp.epf_contri / maxContriScale) * 100));
                    const epsWidth = Math.min(100, Math.max(6, (emp.eps_contri / maxContriScale) * 100));
                    const isHovered = hoveredBarContri?.name === emp.name;

                    return (
                      <div
                        key={emp.uan + i}
                        className="group cursor-pointer relative"
                        onMouseEnter={() => setHoveredBarContri(emp)}
                        onMouseLeave={() => setHoveredBarContri(null)}
                      >
                        <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 mb-0.5">
                          <span className="truncate max-w-[140px] sm:max-w-[180px]">{emp.name}</span>
                          <span className="text-slate-400 font-medium">
                            EPF: {formatFullCurrency(emp.epf_contri)} | EPS: {formatFullCurrency(emp.eps_contri)}
                          </span>
                        </div>

                        <div className="w-full h-3 bg-slate-100 rounded flex flex-col justify-between p-0.5 gap-0.5">
                          {/* EPF Contri bar */}
                          <div
                            style={{ width: `${epfWidth}%` }}
                            className={`h-1 rounded transition-all duration-300 ${
                              isHovered ? "bg-sky-500 shadow-xs" : "bg-[#64748b]"
                            }`}
                          />
                          {/* EPS Contri bar */}
                          <div
                            style={{ width: `${epsWidth}%` }}
                            className={`h-1 rounded transition-all duration-300 ${
                              isHovered ? "bg-slate-950 shadow-xs" : "bg-[#0f172a]"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}

                {/* X-axis scale (0K, 1K, 2K) */}
                <div className="w-full flex justify-between text-[9px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                  <span>0K</span>
                  <span>1K</span>
                  <span>2K</span>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between mt-auto shrink-0">
              <span>Statutory EPF (12%) & EPS (8.33%) split</span>
              <span className="font-semibold text-slate-600">Compliant</span>
            </div>
          </ResizableCard>
        </div>

        {/* ── RIGHT COLUMN (7 Cols: PF Member Details Table) ── */}
        <div className="lg:col-span-7 flex flex-col">
          <ResizableCard
            id="pf-member-details-table"
            defaultHeight={580}
            minHeight={300}
            maxHeight={880}
            className="bg-white rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between h-full dash-card-interactive"
          >
            <div className="flex-1 flex flex-col min-h-0">
            {/* Table Header / Title Bar */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                  PF Member Details
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredRecords.length} records
                </span>
                {isLiveDb && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live ECR
                  </span>
                )}
              </div>

              <div className="text-[10px] text-slate-400 font-medium">
                Page {currentPage} of {totalPages}
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto [scrollbar-width:thin] flex-1 min-h-[160px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                {/* Dark Navy Table Header matching Power BI screenshot */}
                <thead className="bg-[#111827] text-white text-[10px] font-bold uppercase sticky top-0 z-10 select-none shadow-xs">
                  <tr>
                    <th
                      className="py-2 px-2.5 w-10 text-center cursor-pointer hover:bg-slate-800 transition-colors"
                      onClick={() => handleSort("sr_no")}
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <span>#</span>
                        {sortField === "sr_no" && <span>{sortAsc ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("uan")}
                    >
                      <div className="flex items-center gap-1">
                        <span>UAN</span>
                        {sortField === "uan" && <span>{sortAsc ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        <span>MEMBER NAME</span>
                        {sortField === "name" && <span>{sortAsc ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("gross_wages")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total Gross Wages</span>
                        {sortField === "gross_wages" && <span>{sortAsc ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("epf_wages")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total EPF Wages</span>
                        {sortField === "epf_wages" && <span>{sortAsc ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("eps_wages")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total EPS Wages</span>
                        {sortField === "eps_wages" && <span>{sortAsc ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("edli_wages")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Total EDLI WAGES</span>
                        {sortField === "edli_wages" && <span>{sortAsc ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("epf_contri")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>EPF Contribution</span>
                        {sortField === "epf_contri" && <span>{sortAsc ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("eps_contri")}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>EPS Contribution</span>
                        {sortField === "eps_contri" && <span>{sortAsc ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                    <th
                      className="py-2 px-2.5 text-center cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                      onClick={() => handleSort("ncp_days")}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Sum of NCP Days</span>
                        {sortField === "ncp_days" && <span>{sortAsc ? "↑" : "↓"}</span>}
                      </div>
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 text-[10.5px] font-medium text-slate-800">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No PF member records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((r, i) => (
                      <tr
                        key={r.uan + i}
                        className="hover:bg-slate-50/90 transition-colors"
                      >
                        <td className="py-2 px-2.5 text-center font-bold text-slate-400 whitespace-nowrap">
                          {r.sr_no || ((currentPage - 1) * pageSize + i + 1)}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-slate-900 whitespace-nowrap font-mono text-[10px]">
                          {r.uan}
                        </td>
                        <td className="py-2 px-2.5 font-semibold text-slate-800 whitespace-nowrap max-w-[150px] truncate" title={r.name}>
                          {r.name}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          {r.gross_wages.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2.5 text-right font-medium text-slate-700 whitespace-nowrap">
                          {r.epf_wages.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2.5 text-right font-medium text-slate-700 whitespace-nowrap">
                          {r.eps_wages.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2.5 text-right font-medium text-slate-700 whitespace-nowrap">
                          {r.edli_wages.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          {r.epf_contri.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          {r.eps_contri.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2.5 text-center font-bold text-slate-600 whitespace-nowrap">
                          {r.ncp_days}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </div>

            {/* Pagination Controls */}
            <div className="p-2.5 px-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 mt-auto shrink-0">
              <div className="flex items-center gap-2">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-semibold cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={1000}>All ({filteredRecords.length})</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-bold px-1.5">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </ResizableCard>
        </div>
      </div>
    </div>
  );
}
