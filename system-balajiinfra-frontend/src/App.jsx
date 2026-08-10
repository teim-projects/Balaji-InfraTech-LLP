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
import Customer from "./pages/Customer";
import RegisterCustomer from "./pages/RegisterCustomer";
import Companies from "./pages/Companies";
import RegisterCompany from "./pages/RegisterCompany";
import AttendanceCompany from "./pages/AttendanceCompany";
import Lead from "./pages/Lead";

import Quotation from "./pages/Quotation";
import Invoice from "./pages/Invoice";
import Inventory from "./pages/Inventory";
import AmcPage from "./pages/Amc";

// ✅ Correct path - files are in components/products/
import ProductList from './components/products/ProductList';
import ProductForm from './components/products/ProductForm';


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
            isMenuOpen={sidebarOpen || !isCollapsed}
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
              <Route path="/customer" element={<Customer />} />
              <Route path="/customer/register" element={<RegisterCustomer />} />
              <Route path="/customer/edit/:id" element={<RegisterCustomer />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/register" element={<RegisterCompany />} />
              <Route path="/companies/edit/:id" element={<RegisterCompany />} />
              <Route path="/leads" element={<Lead />} />

              <Route path="/quotation" element={<Quotation />} />
              <Route path="/invoice" element={<Invoice />} />

              {/* ✅ Product Routes - Now correct path */}
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/add" element={<ProductForm />} />
              <Route path="/products/edit/:id" element={<ProductForm />} />

              <Route path="/inventory" element={<Inventory />} />
              <Route path="/amc" element={<AmcPage />} />
              <Route path="/amc/company/:id" element={<AttendanceCompany />} />
            </Routes>
          </div>
        </main>
      </div>

      {sidebarOpen && !hideNavbar && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 bg-white h-full shadow-lg">
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