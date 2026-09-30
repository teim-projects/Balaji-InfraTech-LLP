import React, { useState, useMemo, useEffect } from "react";

export default function DeductionsPieChart({
  company,
  selectedDate = new Date().toISOString().split("T")[0],
  attendanceRows = [],
  lastSavedTimestamp = null,
}) {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  // Trigger animation replay when attendance is saved
  useEffect(() => {
    setAnimKey((prev) => prev + 1);
  }, [attendanceRows, lastSavedTimestamp]);

  // Aggregate deductions from saved attendanceRows
  const deductionTotals = useMemo(() => {
    if (!attendanceRows || attendanceRows.length === 0) {
      return {
        room_rent: 0,
        rashan: 0,
        light_bill: 0,
        lpg: 0,
        shows_tshirt: 0,
        other: 0,
        extra: 0,
        total: 0,
      };
    }

    return attendanceRows.reduce(
      (acc, r) => {
        const rr = parseFloat(r.deduction_room_rent) || 0;
        const ra = parseFloat(r.deduction_rashan) || 0;
        const lb = parseFloat(r.deduction_light_bill) || 0;
        const lpg = parseFloat(r.deduction_lpg) || 0;
        const st = parseFloat(r.deduction_shows_tshirt) || 0;
        const oth = parseFloat(r.deduction_other) || 0;
        const ext = parseFloat(r.extra_deductions) || 0;

        acc.room_rent += rr;
        acc.rashan += ra;
        acc.light_bill += lb;
        acc.lpg += lpg;
        acc.shows_tshirt += st;
        acc.other += oth;
        acc.extra += ext;
        acc.total += rr + ra + lb + lpg + st + oth + ext;
        return acc;
      },
      {
        room_rent: 0,
        rashan: 0,
        light_bill: 0,
        lpg: 0,
        shows_tshirt: 0,
        other: 0,
        extra: 0,
        total: 0,
      }
    );
  }, [attendanceRows]);

  // Slices configuration in matching corporate slate palette
  const categories = useMemo(() => {
    const list = [
      { key: "room_rent", label: "Room Rent", amount: deductionTotals.room_rent, color: "#4A585F" },
      { key: "rashan", label: "Rashan", amount: deductionTotals.rashan, color: "#5B6B73" },
      { key: "light_bill", label: "Light Bill", amount: deductionTotals.light_bill, color: "#73868E" },
      { key: "lpg", label: "LPG Gas", amount: deductionTotals.lpg, color: "#8C9DA5" },
      { key: "shows_tshirt", label: "Shoes & T-Shirt", amount: deductionTotals.shows_tshirt, color: "#A5B4BB" },
      { key: "other", label: "Other", amount: deductionTotals.other, color: "#64748B" },
      { key: "extra", label: "Extra", amount: deductionTotals.extra, color: "#334155" },
    ];

    const total = deductionTotals.total;
    let accumulatedOffset = 0;
    const circumference = 2 * Math.PI * 48; // r = 48

    return list.map((cat) => {
      const pct = total > 0 ? (cat.amount / total) * 100 : 0;
      const strokeLength = total > 0 ? (cat.amount / total) * circumference : 0;
      const offset = accumulatedOffset;
      accumulatedOffset += strokeLength;

      return {
        ...cat,
        pct: Math.round(pct * 10) / 10,
        strokeLength,
        offset,
        circumference,
      };
    });
  }, [deductionTotals]);

  // Active categories with amount > 0 for legend (or top list if all zero)
  const activeCategories = useMemo(() => {
    const items = categories.filter((c) => c.amount > 0);
    return items.length > 0 ? items : categories.slice(0, 4);
  }, [categories]);

  const hasDeductions = deductionTotals.total > 0;

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 sm:p-5 font-sans h-full flex flex-col justify-between overflow-hidden">
      {/* Header without overlapping border line */}
      <div className="flex items-start justify-between gap-2 mb-2 pb-0">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-slate-700 tracking-tight leading-none">
            Deductions Overview
          </h3>
          <p className="text-[10.5px] text-slate-400 font-medium mt-1">Saved deductions breakdown</p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs sm:text-sm font-bold text-slate-800 leading-none block">
            ₹{Math.round(deductionTotals.total).toLocaleString()}
          </span>
          <div className="text-[9.5px] text-slate-400 mt-0.5">Total Deductions</div>
        </div>
      </div>

      {!hasDeductions ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
            ₹
          </div>
          <p className="text-xs font-medium text-slate-600">No deductions recorded</p>
          <p className="text-[10.5px] text-slate-400 mt-0.5 max-w-[200px]">
            Saved employee deductions will appear here once saved.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-1">
          {/* Animated SVG Donut Chart */}
          <div className="relative w-32 h-32 shrink-0 flex items-center justify-center select-none">
            <svg
              key={animKey}
              viewBox="0 0 130 130"
              className="w-full h-full transform -rotate-90 overflow-visible"
            >
              <style>{`
                @keyframes donutSpinIn {
                  0% {
                    stroke-dasharray: 0 400;
                    opacity: 0.2;
                  }
                  100% {
                    opacity: 1;
                  }
                }
                .donut-slice {
                  animation: donutSpinIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
                  transition: stroke-width 0.2s, opacity 0.2s;
                }
              `}</style>

              {/* Background circle */}
              <circle
                cx="65"
                cy="65"
                r="48"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="13"
              />

              {/* Slices */}
              {categories.map((cat, idx) => {
                if (cat.amount <= 0) return null;
                const isHovered = hoveredCategory === cat.key;
                return (
                  <circle
                    key={cat.key}
                    cx="65"
                    cy="65"
                    r="48"
                    fill="none"
                    stroke={cat.color}
                    strokeWidth={isHovered ? "16" : "13"}
                    strokeDasharray={`${cat.strokeLength} ${cat.circumference}`}
                    strokeDashoffset={-cat.offset}
                    className="donut-slice cursor-pointer"
                    style={{ animationDelay: `${idx * 70}ms` }}
                    onMouseEnter={() => setHoveredCategory(cat.key)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                );
              })}
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                {hoveredCategory
                  ? categories.find((c) => c.key === hoveredCategory)?.label
                  : "Total"}
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-800 leading-tight mt-0.5">
                ₹
                {hoveredCategory
                  ? Math.round(categories.find((c) => c.key === hoveredCategory)?.amount || 0).toLocaleString()
                  : Math.round(deductionTotals.total).toLocaleString()}
              </span>
              <span className="text-[9px] text-slate-500 font-semibold">
                {hoveredCategory
                  ? `${categories.find((c) => c.key === hoveredCategory)?.pct}%`
                  : `${activeCategories.length} types`}
              </span>
            </div>
          </div>

          {/* Compact Legend: ALL active items displayed with clean spacing */}
          <div className="flex-1 w-full space-y-1 pl-0 sm:pl-1 overflow-y-auto max-h-[175px]">
            {activeCategories.map((cat) => {
              const isHovered = hoveredCategory === cat.key;
              return (
                <div
                  key={cat.key}
                  onMouseEnter={() => setHoveredCategory(cat.key)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  className={`flex items-center justify-between text-xs px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    isHovered ? "bg-slate-100 font-semibold" : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-[11px] truncate text-slate-700">{cat.label}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-slate-800">
                      ₹{Math.round(cat.amount).toLocaleString()}
                    </span>
                    <span className="text-[9.5px] text-slate-400 ml-1">({cat.pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
