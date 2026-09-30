import React from "react";

export default function DashboardWidget({ widget, data }) {
  if (widget.type === "kpi") {
    return (
      <div className="
        bg-white 
        rounded-2xl 
        shadow-xs 
        border 
        border-slate-100/90 
        p-5 
        flex 
        items-center 
        justify-between
        transition-all 
        duration-300 
        hover:shadow-md 
        hover:-translate-y-0.5
      ">
        <div className="space-y-1">
          <h3 className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            {widget.title}
          </h3>
          <p className="text-3xl font-black text-slate-800 tracking-tight">
            {data ?? 0}
          </p>
        </div>

        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shadow-2xs">
          {widget.icon}
        </div>
      </div>
    );
  }

  return null;
}
