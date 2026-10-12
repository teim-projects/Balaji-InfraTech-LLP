import React from "react";

export default function Base({
  title = "Page",
  breadcrumb = null,
  noPadding = false,
  children,
}) {
  return (
    <div className="relative h-full flex">
      {/* Main content area */}
      <div className="flex-1 flex flex-col transition-all duration-300 overflow-hidden">
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 sm:px-6 pt-5 pb-1 bg-transparent">
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">{title}</h2>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className={`flex-1 ${noPadding ? "p-0" : "px-4 sm:px-6 py-4 sm:py-6"} overflow-y-auto overflow-x-hidden`}>
          {children}
        </div>
      </div>
    </div>
  );
}
