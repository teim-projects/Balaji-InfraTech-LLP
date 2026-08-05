import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Building2,
  CalendarCheck,
  CreditCard,
  Database,
  Target,
  Users,
  FileText,
  Package,
  LogOut,
} from "lucide-react";
import { useUserRole } from "../hooks/useAuth";

const allItems = [
  { key: "home", label: "Overview", icon: LayoutGrid, path: "/dashboard" },
  { key: "accounts", label: "Companies", icon: Building2, path: "/accounts" },
  { key: "amc", label: "Attendance", icon: CalendarCheck, path: "/amc" },
  { key: "payroll", label: "Payroll", icon: CreditCard, path: "/invoice" },
  { key: "master_data", label: "Master Data", icon: Database, path: "/inventory" },
  { key: "leads", label: "Enquiries", icon: Target, path: "/leads" },
  { key: "customer", label: "Contacts", icon: Users, path: "/customer" },
  { key: "quotation", label: "Quotes", icon: FileText, path: "/quotation" },
  { key: "products", label: "Products", icon: Package, path: "/products" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";

  const { userRole, isLoading: loadingRole } = useUserRole(baseApi);
  const [userEmail, setUserEmail] = useState("strawberryduniya20@gmail.com");

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (token) {
      fetch(`${baseApi}/auth/dj-rest-auth/user/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.email) setUserEmail(data.email);
        })
        .catch(() => { });
    }
  }, [baseApi]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.dispatchEvent(new Event("authChange"));
    navigate("/login", { replace: true });
  };

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
    <aside className="w-64 bg-white border-r border-slate-200/80 h-full flex flex-col justify-between p-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div>
        {/* Header Title */}
        <div className="mb-3 px-1">
          <h1 className="text-base font-extrabold text-slate-900 tracking-normal mt-1">
            PAYROLL CONSOLE
          </h1>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {filteredItems.map((it) => {
            const active = isActive(it.path, currentPath);
            const Icon = it.icon;

            return (
              <Link
                key={it.key}
                to={it.path || "#"}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 select-none ${
                  active
                    ? "bg-[#18181b] text-white font-bold shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-semibold"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    active ? "text-white" : "text-slate-500"
                  }`}
                />
                <span className="text-sm tracking-tight">{it.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Sign out */}
      <div className="border-t border-slate-200/80 pt-3 mt-4">
        <div className="mb-2 px-1">
          <p className="font-bold text-slate-900 text-xs">Admin</p>
          <p className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
            {userEmail}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-1 text-slate-600 hover:text-red-600 font-medium text-xs transition-colors cursor-pointer w-full text-left"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function isActive(itemPath, currentPath) {
  if (!itemPath) return false;
  return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}
