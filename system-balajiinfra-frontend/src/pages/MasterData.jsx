import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Base from "../components/Base";
import {
  Calculator,
  Percent,
  Save,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  UserCheck,
  CalendarCheck,
  Sparkles,
  Info,
  Sliders,
  Building2,
  Users,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  FORMULA_MODULES,
  getAllFormulas,
  getModuleFormulas,
  saveModuleFormulas,
  resetModuleFormulas,
} from "../utils/formulaConfig";

export default function MasterData() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine if we are viewing the Formulaes details or the Master Data cards
  const isFormulasView =
    location.pathname === "/master-data/formulas" ||
    new URLSearchParams(location.search).get("view") === "formulas";

  const [activeModuleKey, setActiveModuleKey] = useState("wage_sheet");
  const [formulasState, setFormulasState] = useState(() => getAllFormulas());
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [companiesCount, setCompaniesCount] = useState(null);
  const [employeesCount, setEmployeesCount] = useState(null);

  useEffect(() => {
    if (isFormulasView) return;
    const token =
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      "";
    const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

    const fetchCounts = async () => {
      try {
        const [compRes, empRes] = await Promise.all([
          fetch(`${baseApi.replace(/\/$/, "")}/payroll/companies/?page_size=1`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(`${baseApi.replace(/\/$/, "")}/payroll/employee-details/?page_size=1`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);
        if (compRes.ok) {
          const data = await compRes.json();
          const count = Number.isFinite(data.count)
            ? data.count
            : Array.isArray(data.results)
              ? data.results.length
              : Array.isArray(data)
                ? data.length
                : 0;
          setCompaniesCount(count);
        }
        if (empRes.ok) {
          const data = await empRes.json();
          const count = Number.isFinite(data.count)
            ? data.count
            : Array.isArray(data.results)
              ? data.results.length
              : Array.isArray(data)
                ? data.length
                : 0;
          setEmployeesCount(count);
        }
      } catch (err) {
        console.warn("Failed to fetch master data counts", err);
      }
    };
    fetchCounts();
  }, [isFormulasView]);

  // Live calculation preview input state
  const [sampleBasic, setSampleBasic] = useState(15525);
  const [sampleMandays, setSampleMandays] = useState(30);

  const activeModule = FORMULA_MODULES[activeModuleKey];
  const currentValues = formulasState[activeModuleKey] || {};

  // Update a single formula value in state
  const handleValueChange = (key, value) => {
    const num = parseFloat(value);
    setFormulasState((prev) => ({
      ...prev,
      [activeModuleKey]: {
        ...prev[activeModuleKey],
        [key]: isNaN(num) ? "" : num,
      },
    }));
  };

  // Save current module formulas
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated = saveModuleFormulas(activeModuleKey, formulasState[activeModuleKey]);

      // Attempt syncing to backend if token and wage_sheet module
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";
      const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

      if (token && activeModuleKey === "wage_sheet") {
        try {
          const wsRes = await fetch(`${baseApi}/payroll/wage-sheets/?page_size=1`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (wsRes.ok) {
            const wsData = await wsRes.json();
            const sheets = Array.isArray(wsData) ? wsData : wsData.results || [];
            if (sheets.length > 0) {
              const wsId = sheets[0].id;
              const formulasRes = await fetch(
                `${baseApi}/payroll/payroll-formulas/?wage_sheet=${wsId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (formulasRes.ok) {
                const existing = await formulasRes.json();
                const existingList = Array.isArray(existing) ? existing : existing.results || [];

                // Update or create HRA
                const hraF = existingList.find((f) => f.target_field === "hra");
                const hraVal = (parseFloat(updated.hra_pct) || 5) / 100;
                await fetch(
                  hraF ? `${baseApi}/payroll/payroll-formulas/${hraF.id}/` : `${baseApi}/payroll/payroll-formulas/`,
                  {
                    method: hraF ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      wage_sheet: wsId,
                      target_field: "hra",
                      base_field: "basic",
                      operator: "*",
                      percentage_or_value: hraVal,
                    }),
                  }
                );

                // Update or create Bonus
                const bonusF = existingList.find((f) => f.target_field === "bonus");
                const bonusVal = (parseFloat(updated.bonus_pct) || 8.33) / 100;
                await fetch(
                  bonusF ? `${baseApi}/payroll/payroll-formulas/${bonusF.id}/` : `${baseApi}/payroll/payroll-formulas/`,
                  {
                    method: bonusF ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                      wage_sheet: wsId,
                      target_field: "bonus",
                      base_field: "basic",
                      operator: "*",
                      percentage_or_value: bonusVal,
                    }),
                  }
                );
              }
            }
          }
        } catch (backendErr) {
          console.warn("Backend sync optional note:", backendErr);
        }
      }

      setLastSavedTime(new Date().toLocaleTimeString());
      Swal.fire({
        icon: "success",
        title: "Formulas Saved!",
        text: `${activeModule.name} formulas and percentages updated successfully.`,
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save formula changes. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset module to statutory defaults
  const handleReset = () => {
    Swal.fire({
      title: "Reset to Default Percentages?",
      text: `Are you sure you want to reset ${activeModule.name} formulas back to statutory default values?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Reset Defaults",
    }).then((result) => {
      if (result.isConfirmed) {
        resetModuleFormulas(activeModuleKey);
        setFormulasState(getAllFormulas());
        Swal.fire({
          icon: "info",
          title: "Reset Completed",
          text: `${activeModule.name} formulas have been restored to default values.`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  // Module Icons Map
  const moduleIcons = {
    wage_sheet: FileSpreadsheet,
    compliances: FileText,
    employees: UserCheck,
    attendance: CalendarCheck,
  };

  // Live simulation outputs based on active module and user percentages
  const livePreview = useMemo(() => {
    const basic = parseFloat(sampleBasic) || 0;
    const mandays = parseFloat(sampleMandays) || 0;

    if (activeModuleKey === "wage_sheet") {
      const hra = Math.round(basic * ((parseFloat(currentValues.hra_pct) || 0) / 100));
      const bonus = Math.round(basic * ((parseFloat(currentValues.bonus_pct) || 0) / 100));
      const leave = Math.round(basic * ((parseFloat(currentValues.leave_encashment_pct) || 0) / 100));
      const gross = basic + hra + bonus + leave;
      const pf13 = Math.round(Math.min(basic, 15000) * ((parseFloat(currentValues.pf_employer_pct) || 0) / 100));
      const esic325 = Math.round((gross - bonus) * ((parseFloat(currentValues.esic_employer_pct) || 0) / 100));
      const eePf = Math.min(Math.round(basic * ((parseFloat(currentValues.pf_employee_pct) || 0) / 100)), 1800);
      const eeEsic = Math.ceil(Math.max(0, gross - bonus - leave) * ((parseFloat(currentValues.esic_employee_pct) || 0) / 100));
      const serviceCharge = Math.round((gross + pf13 + esic325 + 300) * ((parseFloat(currentValues.service_charge_pct) || 0) / 100));

      return [
        { label: "Calculated HRA", val: `₹${hra.toLocaleString()}`, note: `${currentValues.hra_pct}% of ₹${basic}` },
        { label: "Calculated Bonus", val: `₹${bonus.toLocaleString()}`, note: `${currentValues.bonus_pct}% of ₹${basic}` },
        { label: "Leave Encashment", val: `₹${leave.toLocaleString()}`, note: `${currentValues.leave_encashment_pct}% of ₹${basic}` },
        { label: "Gross Base Salary", val: `₹${gross.toLocaleString()}`, note: "Basic + HRA + Bonus + Leave" },
        { label: "Employer PF (13%)", val: `₹${pf13.toLocaleString()}`, note: `${currentValues.pf_employer_pct}% on capped basic` },
        { label: "Employee PF (12%)", val: `₹${eePf.toLocaleString()}`, note: `Deduction capped at ₹1,800` },
        { label: "Employer ESIC", val: `₹${esic325.toLocaleString()}`, note: `${currentValues.esic_employer_pct}% on (Gross - Bonus)` },
        { label: "Employee ESIC", val: `₹${eeEsic.toLocaleString()}`, note: `${currentValues.esic_employee_pct}% health deduction` },
        { label: "Service / Markup", val: `₹${serviceCharge.toLocaleString()}`, note: `${currentValues.service_charge_pct}% agency margin` },
      ];
    } else if (activeModuleKey === "compliances") {
      const epfWage = Math.min(basic, 15000);
      const eePf = Math.min(Math.round(epfWage * ((parseFloat(currentValues.ee_pf_pct) || 12) / 100)), 1800);
      const erEps = Math.min(Math.round(epfWage * ((parseFloat(currentValues.er_eps_pct) || 8.33) / 100)), 1250);
      const erEpf = Math.max(0, eePf - erEps);
      const erAdmin = Math.round(epfWage * ((parseFloat(currentValues.er_admin_pct) || 1) / 100));
      const eeEsic = Math.ceil(basic * ((parseFloat(currentValues.ee_esic_pct) || 0.75) / 100));
      const erEsic = Math.round(basic * ((parseFloat(currentValues.er_esic_pct) || 3.25) / 100));

      return [
        { label: "EE PF (Account 01)", val: `₹${eePf.toLocaleString()}`, note: `${currentValues.ee_pf_pct}% of ₹${epfWage}` },
        { label: "ER EPS (Account 10)", val: `₹${erEps.toLocaleString()}`, note: `${currentValues.er_eps_pct}% (Max ₹1,250)` },
        { label: "ER EPF Differential", val: `₹${erEpf.toLocaleString()}`, note: `Remitted to Account 01` },
        { label: "Admin & EDLI Charges", val: `₹${erAdmin.toLocaleString()}`, note: `${currentValues.er_admin_pct}% administrative` },
        { label: "EE ESIC Deduction", val: `₹${eeEsic.toLocaleString()}`, note: `${currentValues.ee_esic_pct}% employee share` },
        { label: "ER ESIC Contribution", val: `₹${erEsic.toLocaleString()}`, note: `${currentValues.er_esic_pct}% employer share` },
      ];
    } else if (activeModuleKey === "attendance") {
      const threshold = parseFloat(currentValues.standard_days_threshold) || 27;
      const factor = parseFloat(currentValues.extra_day_ot_factor) || 8;
      const extraDays = mandays > threshold ? mandays - threshold : 0;
      const extraOt = extraDays * factor;
      const payableMandays = Math.max(0, mandays - extraDays);

      return [
        { label: "Mandays Worked", val: `${mandays} Days`, note: "Recorded in muster" },
        { label: "Extra Days (> Threshold)", val: `${extraDays} Days`, note: `Exceeding ${threshold} days` },
        { label: "Payable Mandays", val: `${payableMandays} Days`, note: "Standard payable days" },
        { label: "Extra Overtime Credited", val: `${extraOt} Hours`, note: `${extraDays} days × ${factor} hrs/day` },
      ];
    } else {
      // Employees
      const hra = Math.round(basic * ((parseFloat(currentValues.default_hra_pct) || 5) / 100));
      const bonus = Math.round(basic * ((parseFloat(currentValues.default_bonus_pct) || 8.33) / 100));
      const leave = Math.round(basic * ((parseFloat(currentValues.default_leave_pct) || 5) / 100));
      const calcDays = currentValues.default_calc_days || 27;
      const perDayWage = Math.round(basic / calcDays);

      return [
        { label: "Default HRA Allowance", val: `₹${hra.toLocaleString()}`, note: `${currentValues.default_hra_pct}% of ₹${basic}` },
        { label: "Default Statutory Bonus", val: `₹${bonus.toLocaleString()}`, note: `${currentValues.default_bonus_pct}% of ₹${basic}` },
        { label: "Default Leave Encashment", val: `₹${leave.toLocaleString()}`, note: `${currentValues.default_leave_pct}% of ₹${basic}` },
        { label: "Per-Day Wage Divisor", val: `₹${perDayWage}/day`, note: `Based on ${calcDays} days divisor` },
      ];
    }
  }, [activeModuleKey, currentValues, sampleBasic, sampleMandays]);

  return (
    <Base title="Master Data">
      <div className="space-y-6">
        {/* ── View 1: Main Master Data Hub with Companies, Employees & Formulaes Cards ── */}
        {!isFormulasView && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Card 1: Companies */}
            <div
              onClick={() => navigate("/companies")}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                  <Building2 className="w-6 h-6" />
                </div>
                {companiesCount !== null && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {companiesCount}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                Companies
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2 mt-auto">
                Manage registered companies
              </p>
            </div>

            {/* Card 2: Employees */}
            <div
              onClick={() => navigate("/employees")}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                  <UserCheck className="w-6 h-6" />
                </div>
                {employeesCount !== null && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {employeesCount}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                Employees
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2 mt-auto">
                Manage employee database
              </p>
            </div>

            {/* Card 3: Formulaes */}
            <div
              onClick={() => navigate("/master-data/formulas")}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                  <Calculator className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                Formulaes
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2 mt-auto">
                Configure module percentages
              </p>
            </div>
          </div>
        )}

        {/* ── View 2: Detailed Formulas View (Shown on Card Click) ─────────── */}
        {isFormulasView && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header & Module Selector */}
            <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="shrink-0">
                <h2 className="text-base font-bold text-slate-800">
                  Formulaes & Percentage Configuration
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select a module below to inspect and customize calculation percentages.
                </p>
              </div>

              {/* Module Selector Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto flex-nowrap max-w-full no-scrollbar">
                {Object.values(FORMULA_MODULES).map((mod) => {
                  const Icon = moduleIcons[mod.id] || Sliders;
                  const isActive = activeModuleKey === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setActiveModuleKey(mod.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${isActive
                        ? "bg-white text-blue-600 shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                        }`}
                    >
                      <Icon className={`w-3 h-3 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      <span>{mod.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Module Sub-Header */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  <strong>{activeModule.name}:</strong> {activeModule.description}
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 bg-white border border-slate-200 rounded-md transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            {/* Formula Input Grid */}
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeModule.formulas.map((item) => {
                  const val = currentValues[item.key] ?? item.defaultValue;
                  const isModified = parseFloat(val) !== item.defaultValue;

                  return (
                    <div
                      key={item.key}
                      className={`p-4 rounded-lg border transition-all ${isModified
                        ? "bg-blue-50/20 border-blue-200 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">
                            {item.name}
                          </h4>
                          <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                            Base: {item.baseField}
                          </span>
                        </div>
                        {isModified && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            Custom
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mb-2.5 line-clamp-2">
                        {item.description}
                      </p>

                      {/* Mathematical formula badge */}
                      <div className="text-[11px] font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 mb-3 truncate">
                        {item.formulaDesc}
                      </div>

                      {/* Percentage Input */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step={item.step || 0.01}
                            min={item.min ?? 0}
                            max={item.max ?? 100}
                            value={val}
                            onChange={(e) => handleValueChange(item.key, e.target.value)}
                            className="w-full pl-3 pr-10 py-1.5 border border-slate-300 rounded-md text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
                            {item.unit}
                          </div>
                        </div>

                        {isModified && (
                          <button
                            type="button"
                            onClick={() => handleValueChange(item.key, item.defaultValue)}
                            title={`Reset to ${item.defaultValue}${item.unit}`}
                            className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-md transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Preview Simulation Sandbox */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Live Simulation Preview ({activeModule.name})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeModuleKey === "attendance" ? (
                      <>
                        <label className="text-xs text-slate-500 font-medium">
                          Sample Mandays:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={sampleMandays}
                          onChange={(e) => setSampleMandays(e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded-md text-xs font-bold text-slate-800"
                        />
                      </>
                    ) : (
                      <>
                        <label className="text-xs text-slate-500 font-medium">
                          Sample Basic Salary (₹):
                        </label>
                        <input
                          type="number"
                          step="100"
                          min="1000"
                          value={sampleBasic}
                          onChange={(e) => setSampleBasic(e.target.value)}
                          className="w-28 px-2 py-1 border border-slate-300 rounded-md text-xs font-bold text-slate-800"
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Simulation Outputs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {livePreview.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <span className="text-[11px] font-medium text-slate-500 block truncate">
                        {item.label}
                      </span>
                      <span className="text-base font-bold text-slate-800 mt-0.5 block">
                        {item.val}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                        {item.note}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Footer Actions */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {lastSavedTime ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Saved at {lastSavedTime}
                    </span>
                  ) : (
                    <span>
                      Formulas directly control Wage Sheet, Compliances, and Attendance.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/master-data")}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                  >
                    Back to Cards
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? "Saving..." : "Save Formulas"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Base>
  );
}
