import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Building2,
  LayoutGrid,
  Briefcase,
  CalendarCheck,
  CreditCard,
  Database,
  UserCheck,
  Users,
  FileText,
  Package,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { useUserRole } from "../hooks/useAuth";

const allItems = [
  { key: "home", label: "Overview", icon: LayoutGrid, path: "/dashboard" },
  { key: "leads", label: "Employees", icon: UserCheck, path: "/leads" },
  { key: "accounts", label: "Accounts", icon: Briefcase, path: "/accounts" },
  { key: "amc", label: "Attendance", icon: CalendarCheck, path: "/amc" },
  { key: "wage_sheet", label: "Wage Sheet", icon: FileSpreadsheet, path: "/wage-sheet" },
  { key: "payroll", label: "Payroll", icon: CreditCard, path: "/invoice" },
  { key: "companies", label: "Companies", icon: Building2, path: "/companies" },
  { key: "quotation", label: "Compliances", icon: FileText, path: "/quotation" },
  { key: "products", label: "Products", icon: Package, path: "/products" },
  { key: "master_data", label: "Master Data", icon: Database, path: "/inventory" },
];

export default function Sidebar({ isCollapsed = false, onClose }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  const { userRole, isLoading: loadingRole } = useUserRole(baseApi);

  const filteredItems = React.useMemo(() => {
    if (loadingRole) return allItems;
    return allItems.filter((item) => {
      const roleName = userRole?.name?.toLowerCase();
      if (item.key === "accounts" && roleName === "sales") {
        return false;
      }
      return true;
    });
  }, [userRole, loadingRole]);

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
        <nav className="space-y-2.5">
          {filteredItems.map((it) => {
            const active = isActive(it.path, currentPath);
            const Icon = it.icon;

            return (
              <Link
                key={it.key}
                to={it.path || "#"}
                title={isCollapsed ? it.label : undefined}
                className={`flex items-center ${isCollapsed ? "justify-center px-2" : "px-3.5 gap-3"
                  } py-2.5 rounded-xl transition-all duration-200 select-none ${active
                    ? "bg-slate-900 text-white font-bold shadow-sm"
                    : "text-slate-800 hover:bg-slate-100 hover:text-black font-semibold"
                  }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : "text-black"
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

