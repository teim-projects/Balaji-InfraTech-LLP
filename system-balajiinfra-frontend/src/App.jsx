// App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";

import Navbar from "./components/Navbar";
import Login from "./components/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./components/Register";
import ProfileSection from "./components/ProfileSection";
import ForgotPassword from "./components/ForgotPassword";
import ResetPasswordConfirm from "./components/ResetPasswordConfirm";
import Sidebar from "./components/Sidebar";
import Accounts from "./pages/Accounts";
import Companies from "./pages/Companies";
import RegisterCompany from "./pages/RegisterCompany";
import AttendanceCompany from "./pages/AttendanceCompany";
import Employees from "./pages/Employees";
import CompliancesPage from "./pages/Compliances";
import AttendancePage from "./pages/Attendance";
import WageSheetPage from "./pages/WageSheet";
import PayrollPage from "./pages/Payroll";
import MasterData from "./pages/MasterData";


function AppRoutes() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const noNavPaths = ["/login", "/register", "/forgot-password"];
  const isLoggedIn = !!localStorage.getItem("access");

  const hideNavbar =
    !isLoggedIn ||
    noNavPaths.includes(location.pathname) ||
    location.pathname.startsWith("/password-reset-confirm/");

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleMenuClick = () => {
    if (window.innerWidth >= 768) {
      setIsCollapsed((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {!hideNavbar && (
        <header className="w-full flex-shrink-0 z-30">
          <Navbar
            onMenuClick={handleMenuClick}
            isMenuOpen={sidebarOpen}
          />
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {!hideNavbar && (
          <aside
            className={`hidden md:block ${isCollapsed ? "w-20" : "w-64"
              } flex-shrink-0 transition-all duration-300 h-full border-r border-slate-200 bg-white`}
          >
            <Sidebar isCollapsed={isCollapsed} />
          </aside>
        )}

        <main
          className={
            hideNavbar
              ? "flex-1 flex items-center justify-center overflow-auto"
              : "flex-1 p-6 overflow-auto"
          }
        >
          <div className="w-full h-full">
            <Routes>
              <Route
                path="/"
                element={
                  isLoggedIn ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/login"
                element={
                  isLoggedIn ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Login />
                  )
                }
              />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<ProfileSection />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/password-reset-confirm/:uid/:token"
                element={<ResetPasswordConfirm />}
              />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/register" element={<RegisterCompany />} />
              <Route path="/companies/edit/:id" element={<RegisterCompany />} />

              {/* Employees */}
              <Route path="/employees" element={<Employees />} />

              {/* Attendance */}
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/attendance/company/:id" element={<AttendanceCompany />} />

              {/* Wage Sheet & Payroll */}
              <Route path="/wage-sheet" element={<WageSheetPage />} />
              <Route path="/payroll" element={<PayrollPage />} />

              {/* Compliances */}
              <Route path="/compliances" element={<CompliancesPage />} />

              {/* Master Data */}
              <Route path="/master-data" element={<MasterData />} />
              <Route path="/master-data/formulas" element={<MasterData />} />
              <Route path="/master-data/companies" element={<Companies />} />
              <Route path="/master-data/employees" element={<Employees />} />
            </Routes>
          </div>
        </main>
      </div>

      {!hideNavbar && (
        <div
          className={`fixed inset-0 z-50 flex md:hidden transition-all duration-300 ${
            sidebarOpen
              ? "pointer-events-auto visible"
              : "pointer-events-none invisible delay-300"
          }`}
        >
          {/* Backdrop with fade animation */}
          <div
            className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ease-in-out ${
              sidebarOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer with slide-in/slide-out animation */}
          <aside
            className={`relative w-64 bg-white h-full shadow-2xl transform transition-transform duration-300 ease-in-out ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar isCollapsed={false} onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}