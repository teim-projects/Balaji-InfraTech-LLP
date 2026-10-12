import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Building2,
  LayoutGrid,
  Briefcase,
  CalendarCheck,
  CreditCard,
  UserCheck,
  FileText,
  FileSpreadsheet,
  Database,
  X,
  ChevronDown,
  Calculator,
} from "lucide-react";
import { useUserRole } from "../hooks/useAuth";

const allItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid, path: "/dashboard" },
  { key: "attendance", label: "Attendance & Deduction", icon: CalendarCheck, path: "/attendance" },
  { key: "wage_sheet", label: "Wage Sheet", icon: FileSpreadsheet, path: "/wage-sheet" },
  { key: "payroll", label: "Payroll", icon: CreditCard, path: "/payroll" },
  { key: "compliances", label: "Compliances", icon: FileText, path: "/compliances" },
  {
    key: "master_data",
    label: "Master Data",
    icon: Database,
    path: "/master-data",
    children: [
      { key: "companies", label: "Companies", icon: Building2, path: "/companies" },
      { key: "employees", label: "Employees", icon: UserCheck, path: "/employees" },
      { key: "formulas", label: "Formulaes", icon: Calculator, path: "/master-data/formulas" },
    ],
  },
  { key: "accounts", label: "Accounts", icon: Briefcase, path: "/accounts" },
];

export default function Sidebar({ isCollapsed = false, onClose }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  const { userRole, isLoading: loadingRole } = useUserRole(baseApi);

  // Keep master data sub-menu open if current path is inside any of its children
  const isInsideMasterData =
    currentPath.startsWith("/master-data") ||
    currentPath.startsWith("/companies") ||
    currentPath.startsWith("/employees");

  const [masterDataOpen, setMasterDataOpen] = useState(true);

  useEffect(() => {
    if (isInsideMasterData) {
      setMasterDataOpen(true);
    }
  }, [isInsideMasterData]);

  const filteredItems = React.useMemo(() => {
    return allItems;
  }, []);

  return (
    <aside className="w-full bg-white h-full flex flex-col justify-between p-3 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div>
        {/* Top Header with Close (X) Button */}
        {onClose && (
          <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Payroll Console
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-black hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-center"
              title="Close menu"
            >
              <X className="w-5 h-5 text-black" />
            </button>
          </div>
        )}

        {/* Navigation List */}
        <nav className="space-y-2">
          {filteredItems.map((it) => {
            const hasChildren = Array.isArray(it.children) && it.children.length > 0;
            const isChildActive = hasChildren && it.children.some((c) => isActive(c.path, currentPath));
            const active = isActive(it.path, currentPath);
            const Icon = it.icon;

            if (hasChildren && !isCollapsed) {
              return (
                <div key={it.key} className="space-y-1">
                  <div
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 select-none ${active && !isChildActive
                      ? "bg-slate-900 text-white font-bold shadow-sm"
                      : isChildActive
                        ? "bg-slate-100 text-slate-900 font-bold"
                        : "text-slate-800 hover:bg-slate-100 hover:text-black font-semibold"
                      }`}
                  >
                    <Link
                      to={it.path}
                      onClick={() => onClose && onClose()}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 ${active && !isChildActive ? "text-white" : "text-black"
                          }`}
                      />
                      <span className="text-sm tracking-tight whitespace-nowrap truncate">
                        {it.label}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMasterDataOpen((prev) => !prev)}
                      className="p-1 rounded hover:bg-slate-200/60 transition cursor-pointer text-slate-500 hover:text-slate-800"
                      title={masterDataOpen ? "Collapse" : "Expand"}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${masterDataOpen ? "rotate-180 text-slate-700" : "text-slate-400"
                          }`}
                      />
                    </button>
                  </div>

                  {/* Sub-menu items */}
                  {masterDataOpen && (
                    <div className="ml-5 pl-2.5 border-l-2 border-slate-200 space-y-1 py-1">
                      {it.children.map((child) => {
                        const childActive = isActive(child.path, currentPath);
                        const ChildIcon = child.icon;
                        return (
                          <Link
                            key={child.key}
                            to={child.path}
                            onClick={() => onClose && onClose()}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${childActive
                              ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                          >
                            <ChildIcon
                              className={`w-4 h-4 ${childActive ? "text-blue-600" : "text-slate-400"
                                }`}
                            />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={it.key}
                to={it.path || "#"}
                onClick={() => onClose && onClose()}
                title={isCollapsed ? it.label : undefined}
                className={`flex items-center ${isCollapsed ? "justify-center px-2" : "px-3.5 gap-3"
                  } py-2.5 rounded-xl transition-all duration-200 select-none ${active || isChildActive
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : "text-slate-800 hover:bg-slate-100 hover:text-black font-semibold"
                  }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${active || isChildActive ? "text-white" : "text-black"
                    }`}
                />
                {!isCollapsed && (
                  <span className="text-sm tracking-tight whitespace-nowrap">
                    {it.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

function isActive(itemPath, currentPath) {
  if (!itemPath) return false;
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}
