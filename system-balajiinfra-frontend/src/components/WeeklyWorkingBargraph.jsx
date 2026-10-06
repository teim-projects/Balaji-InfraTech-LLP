import React, { useState, useMemo, useEffect } from "react";

export default function WeeklyWorkingBargraph({
  company,
  selectedDate = new Date().toISOString().split("T")[0],
  attendanceRows = [],
  punchingData = null,
  lastSavedTimestamp = null,
}) {
  const [hoveredWeek, setHoveredWeek] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  // Trigger animation replay whenever saved records or saved timestamp updates
  useEffect(() => {
    setAnimKey((prev) => prev + 1);
  }, [attendanceRows, lastSavedTimestamp]);

  // Period label formatting (e.g. "October 2026")
  const periodInfo = useMemo(() => {
    let year = 2026;
    let month = 10;
    try {
      const parts = selectedDate.split("-");
      if (parts[0]) year = parseInt(parts[0], 10);
      if (parts[1]) month = parseInt(parts[1], 10);
    } catch {
      // fallback
    }

    const d = new Date(year, month - 1, 1);
    const monthName = d.toLocaleString("en-US", { month: "long" });
    const shortMonth = d.toLocaleString("en-US", { month: "short" });
    const daysInMonth = new Date(year, month, 0).getDate();

    // Previous month info for 21st-20th cycle
    const prevD = new Date(year, month - 2, 1);
    const prevShortMonth = prevD.toLocaleString("en-US", { month: "short" });

    return {
      year,
      month,
      monthName,
      shortMonth,
      prevShortMonth,
      daysInMonth,
      periodStr: `${monthName} ${year}`,
    };
  }, [selectedDate]);

  // Weekly Date Range Labels (21st to 20th cycle standard for factory attendance)
  const weekDefinitions = useMemo(() => {
    const { shortMonth, prevShortMonth } = periodInfo;

    return [
      { key: "w1", title: "WEEK 1", dates: `21 - 27 ${prevShortMonth}`, daysCount: 7 },
      { key: "w2", title: "WEEK 2", dates: `28 ${prevShortMonth} - 03 ${shortMonth}`, daysCount: 7 },
      { key: "w3", title: "WEEK 3", dates: `04 - 10 ${shortMonth}`, daysCount: 7 },
      { key: "w4", title: "WEEK 4", dates: `11 - 17 ${shortMonth}`, daysCount: 7 },
      { key: "w5", title: "WEEK 5", dates: `18 - 20 ${shortMonth}`, daysCount: 3 },
    ];
  }, [periodInfo]);

  // Compute Weekly Working Data
  const weeklyData = useMemo(() => {
    // If exact punching data was extracted from uploaded Excel
    if (punchingData && punchingData.weeklyWork && punchingData.weeklyWork.length === 5) {
      const { weeklyWork, weeklyOt, weeklyMandays } = punchingData;
      return weekDefinitions.map((w, idx) => {
        const mandays = Math.round((weeklyMandays[idx] || 0) * 10) / 10;
        const ot = Math.round((weeklyOt[idx] || 0) * 10) / 10;
        const totalHours = Math.round((weeklyWork[idx] || 0) * 10) / 10;
        return {
          ...w,
          index: idx,
          mandays,
          ot,
          totalHours,
        };
      });
    }

    // Default: compute from saved attendanceRows
    const weeks = weekDefinitions.map((w, idx) => ({
      ...w,
      index: idx,
      mandays: 0,
      ot: 0,
      totalHours: 0,
    }));

    if (!attendanceRows || attendanceRows.length === 0) {
      return weeks;
    }

    attendanceRows.forEach((row) => {
      const m = parseFloat(row.mandays) || 0;
      const ot = parseFloat(row.ot) || 0;

      // Standard work week capacities: W1: 6, W2: 6, W3: 6, W4: 6, W5: 3 (Total = 27 days)
      const capacities = [6, 6, 6, 6, 3];
      let remainingM = m;

      capacities.forEach((cap, idx) => {
        let weekM = 0;
        if (m <= 27) {
          weekM = Math.min(cap, remainingM);
          remainingM = Math.max(0, remainingM - cap);
        } else {
          weekM = (cap / 27) * m;
        }

        const weekOt = m > 0 ? (weekM / m) * ot : ot / 5;

        weeks[idx].mandays += weekM;
        weeks[idx].ot += weekOt;
      });
    });

    return weeks.map((w) => {
      const mandays = Math.round(w.mandays * 10) / 10;
      const ot = Math.round(w.ot * 10) / 10;
      const totalHours = Math.round((mandays * 8 + ot) * 10) / 10;
      return {
        ...w,
        mandays,
        ot,
        totalHours,
      };
    });
  }, [attendanceRows, punchingData, weekDefinitions]);

  // Overall totals for percentage of output calculation
  const totalOutputHours = useMemo(() => {
    return weeklyData.reduce((sum, w) => sum + w.totalHours, 0);
  }, [weeklyData]);

  // Max value for Y-axis scale
  const maxChartValue = useMemo(() => {
    let max = 0;
    weeklyData.forEach((w) => {
      max = Math.max(max, w.mandays, w.ot);
    });
    if (max <= 0) return 30;
    const target = max * 1.15;
    if (target <= 10) return 10;
    if (target <= 20) return 20;
    if (target <= 30) return 30;
    if (target <= 50) return 50;
    if (target <= 100) return 100;
    const mag = Math.pow(10, Math.floor(Math.log10(target)));
    return Math.ceil(target / mag) * mag;
  }, [weeklyData]);

  // 4 Y-axis ticks e.g. 0, 8, 15, 23, 30
  const yTicks = useMemo(() => {
    const ticks = [0];
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      ticks.push(Math.round((maxChartValue / steps) * i));
    }
    return ticks;
  }, [maxChartValue]);

  if (!attendanceRows || attendanceRows.length === 0) {
    return null;
  }

  // Exact colors matching reference image:
  // Primary (Mandays): Muted Slate-Gray #5B6B73
  // Secondary (OT Hours): Lighter Harmonious Slate #8898A1
  const COLOR_PRIMARY = "#5B6B73";
  const COLOR_SECONDARY = "#8898A1";

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 sm:p-5 font-sans">
      {/* Header matching screenshot: Title on left, Legends on right */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-700 tracking-tight">
          Weekly Work Distribution — {periodInfo.periodStr}{" "}
          <span className="text-slate-400 font-normal text-xs">(21st to 20th Cycle)</span>
        </h3>

        {/* Legend in matching muted slate tones */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_PRIMARY }} />
            <span>Weekly Mandays</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_SECONDARY }} />
            <span>Weekly OT Hours</span>
          </span>
        </div>
      </div>

      {/* SVG Bar Graph with smooth CSS entry animation */}
      <div className="w-full overflow-x-auto select-none custom-scrollbar pb-1">
        <svg
          key={animKey}
          viewBox="0 0 740 230"
          className="w-full h-auto min-w-[480px] overflow-visible"
          style={{ maxHeight: "240px" }}
        >
          <style>{`
            @keyframes barGrowUp {
              0% {
                transform: scaleY(0);
                opacity: 0.2;
              }
              100% {
                transform: scaleY(1);
                opacity: 1;
              }
            }
            @keyframes labelFadeIn {
              0% {
                opacity: 0;
                transform: translateY(5px);
              }
              100% {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .bar-anim-0 {
              animation: barGrowUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
              animation-delay: 0ms;
              transform-origin: bottom;
              transform-box: fill-box;
            }
            .bar-anim-1 {
              animation: barGrowUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
              animation-delay: 80ms;
              transform-origin: bottom;
              transform-box: fill-box;
            }
            .bar-anim-2 {
              animation: barGrowUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
              animation-delay: 160ms;
              transform-origin: bottom;
              transform-box: fill-box;
            }
            .bar-anim-3 {
              animation: barGrowUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
              animation-delay: 240ms;
              transform-origin: bottom;
              transform-box: fill-box;
            }
            .bar-anim-4 {
              animation: barGrowUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
              animation-delay: 320ms;
              transform-origin: bottom;
              transform-box: fill-box;
            }
            .label-anim-0 { animation: labelFadeIn 0.4s ease-out both; animation-delay: 250ms; }
            .label-anim-1 { animation: labelFadeIn 0.4s ease-out both; animation-delay: 330ms; }
            .label-anim-2 { animation: labelFadeIn 0.4s ease-out both; animation-delay: 410ms; }
            .label-anim-3 { animation: labelFadeIn 0.4s ease-out both; animation-delay: 490ms; }
            .label-anim-4 { animation: labelFadeIn 0.4s ease-out both; animation-delay: 570ms; }
          `}</style>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((val) => {
            const chartTop = 15;
            const chartBottom = 165;
            const y = chartBottom - (val / (maxChartValue || 1)) * (chartBottom - chartTop);
            return (
              <g key={`ytick-${val}`}>
                <line
                  x1="45"
                  y1={y}
                  x2="710"
                  y2={y}
                  stroke={val === 0 ? "#94a3b8" : "#f1f5f9"}
                  strokeWidth={val === 0 ? "1.2" : "1"}
                  strokeDasharray={val === 0 ? "none" : "3,3"}
                />
                <text
                  x="38"
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fontWeight="500"
                  fill="#64748b"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* 5 Weeks Bars */}
          {weeklyData.map((week, idx) => {
            const colWidth = 130;
            const colX = 50 + idx * colWidth;
            const chartTop = 15;
            const chartBottom = 165;
            const chartHeight = chartBottom - chartTop;

            const mandaysH = Math.max(2, (week.mandays / (maxChartValue || 1)) * chartHeight);
            const mandaysY = chartBottom - mandaysH;
            const otH = Math.max(2, (week.ot / (maxChartValue || 1)) * chartHeight);
            const otY = chartBottom - otH;

            const barW = 30;
            const mBarX = colX + 30;
            const otBarX = colX + 66;

            const sharePct =
              totalOutputHours > 0 ? Math.round((week.totalHours / totalOutputHours) * 100) : 0;

            const isHovered = hoveredWeek?.index === idx;

            return (
              <g
                key={week.key}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredWeek(week)}
                onMouseLeave={() => setHoveredWeek(null)}
              >
                {/* Weekly Mandays Bar (Muted Slate-Gray with upward animation) */}
                <rect
                  x={mBarX}
                  y={mandaysY}
                  width={barW}
                  height={mandaysH}
                  rx="3"
                  fill={COLOR_PRIMARY}
                  className={`bar-anim-${idx} transition-opacity duration-200 hover:opacity-90`}
                />
                {/* Mandays value label on top with fade animation */}
                <text
                  x={mBarX + barW / 2}
                  y={mandaysY - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={COLOR_PRIMARY}
                  className={`label-anim-${idx}`}
                >
                  {Math.round(week.mandays)}d
                </text>

                {/* Weekly OT Bar (Harmonious Soft Slate with upward animation) */}
                <rect
                  x={otBarX}
                  y={otY}
                  width={barW}
                  height={otH}
                  rx="3"
                  fill={COLOR_SECONDARY}
                  className={`bar-anim-${idx} transition-opacity duration-200 hover:opacity-90`}
                />
                {/* OT value label on top with fade animation */}
                <text
                  x={otBarX + barW / 2}
                  y={otY - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={COLOR_SECONDARY}
                  className={`label-anim-${idx}`}
                >
                  {Math.round(week.ot)}h
                </text>

                {/* X-Axis Week Title */}
                <text
                  x={colX + colWidth / 2}
                  y="185"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="600"
                  fill={isHovered ? COLOR_PRIMARY : "#334155"}
                  letterSpacing="0.02em"
                >
                  {week.title}
                </text>

                {/* Date range subtext */}
                <text
                  x={colX + colWidth / 2}
                  y="199"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="500"
                  fill="#64748b"
                >
                  {week.dates}
                </text>

                {/* % of output subtext */}
                <text
                  x={colX + colWidth / 2}
                  y="212"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="400"
                  fill="#94a3b8"
                >
                  {sharePct}% of output
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
