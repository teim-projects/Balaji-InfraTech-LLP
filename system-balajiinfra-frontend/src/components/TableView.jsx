import React from "react";
import { MdOutlineNavigateNext, MdOutlineNavigateBefore } from "react-icons/md";

/**
 * TableView
 *
 * Props:
 * - columns: [{ key, label, render? }]
 * - rows: array
 * - loading: bool
 * - error: string|null
 * - page: number
 * - totalPages: number
 * - onPageChange: fn(newPage)
 * - pageSize: number (for Sr.No calculation)
 * - actions: function(row) => ReactNode (optional actions column)
 * - emptyMessage: string
 */
export default function TableView({
  columns = [],
  rows = [],
  loading = false,
  error = null,
  page = 1,
  totalPages = 1,
  onPageChange = () => { },
  pageSize = 10,
  actions = null,
  emptyMessage = "No records",
  rowClassName,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
      {loading ? (
        <div className="py-8 text-center text-slate-200 font-medium animate-pulse">Loading data...</div>
      ) : error ? (
        <div className="py-7 text-center text-red-500 bg-red-50 font-medium">Error: {error}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm whitespace-nowrap">
              <thead className="bg-gray-200 border-b border-slate-300">
                <tr>
                  {columns.map(col => (
                    <th key={col.key} className="py-3.5 px-4 text-left font-semibold text-black uppercase tracking-wider text-xs">
                      {col.label}
                    </th>
                  ))}
                  {actions && <th className="py-3.5 px-4 text-center font-semibold text-black uppercase tracking-wider text-xs">Actions</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (actions ? 1 : 0)} className="py-10 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="text-lg opacity-50">📂</span>
                        <p>{emptyMessage}</p>
                      </div>
                    </td>
                  </tr>
                ) : rows.map((row, idx) => {
                  const customClass = rowClassName ? rowClassName(row) : "";
                  const isHighlighted = customClass.includes("bg-gray-200") || customClass.includes("bg-slate-200") || customClass.includes("highlight");
                  return (
                    <tr
                      key={row.id ?? idx}
                      id={isHighlighted ? "highlighted-employee-row" : undefined}
                      className={`hover:bg-slate-50/80 transition-colors ${customClass}`}
                    >
                    {columns.map(col => (
                      <td key={col.key} className="py-3 px-4 text-left text-slate-800">
                        {col.render ? col.render(row, idx) : (row[col.key] ?? "")}
                      </td>
                    ))}

                    {actions && (
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center text-center gap-2">
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>

          {/* Pagination (Prev / Next only) */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500">
              Page <span className="text-slate-800 font-semibold">{page}</span> of <span className="text-slate-800 font-semibold">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                aria-label="Previous page"
              >
                <MdOutlineNavigateBefore className="w-5 h-5" />
              </button>

              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                aria-label="Next page"
              >
                <MdOutlineNavigateNext className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
