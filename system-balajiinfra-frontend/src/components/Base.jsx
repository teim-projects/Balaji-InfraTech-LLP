import React from "react";

export default function Base({
  title = "Page",
  breadcrumb = null,
  children,
}) {
  return (
    <div className="relative h-full flex">
      {/* Main content area */}
      <div className="flex-1 flex flex-col transition-all duration-300 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-2 bg-transparent">
          <div className="ml-5">
            <h2 className="text-2xl font-semibold text-slate-800">{title}</h2>
            {breadcrumb && (
              <div className="mt-1">
                {breadcrumb}
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
