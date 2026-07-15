import React from "react";

export default function DashboardWidget({ widget, data }) {
  if (widget.type === "kpi") {
    return (
      <div className="
        bg-white 
        rounded-xl 
        shadow-md 
        border 
        border-slate-100 
        p-5 
        flex 
        flex-col 
        items-center 
        gap-3
        transition 
        duration-300 
        hover:shadow-xl 
        hover:-translate-y-1
      ">
        
        <div className="text-5xl">{widget.icon}</div>

        <h3 className="text-slate-600 text-base font-medium">
          {widget.title}
        </h3>

        <p className="text-4xl font-extrabold text-sky-600">
          {data || 0}
        </p>
      </div>
    );
  }

  return null;
}
