import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleUser } from "@fortawesome/free-solid-svg-icons";
import { LogOut, Menu, X } from "lucide-react";

const Navbar = ({ onMenuClick, isMenuOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogout = useCallback(() => {
    window.dispatchEvent(new Event("authChange"));
    setIsAuthenticated(false);
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login", { replace: true });
  }, [navigate]);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("access");
    if (!token) return setIsAuthenticated(false);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BASE_API_URL}/auth/dj-rest-auth/user/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      res.ok ? setIsAuthenticated(true) : handleLogout();
    } catch {
      handleLogout();
    }
  }, [handleLogout]);

  useEffect(() => {
    const publicPaths = ["/login", "/register"];
    if (!publicPaths.includes(location.pathname)) {
      checkAuth();
    } else {
      setIsAuthenticated(false);
    }
  }, [location, checkAuth]);

  return (
    <nav className="w-full bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-xs">
      {/* LEFT: Menu Icon & App Title */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Toggle Menu Icon with smooth animated hamburger morph */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-black hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer relative w-10 h-10"
          title={isMenuOpen ? "Close menu" : "Open menu"}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <div className="w-5 h-4 flex flex-col justify-between items-center relative pointer-events-none">
            <span
              className={`w-5 h-0.5 bg-black rounded-full transition-all duration-300 ease-in-out origin-center ${
                isMenuOpen ? "rotate-45 translate-y-[7px]" : ""
              }`}
            />
            <span
              className={`w-5 h-0.5 bg-black rounded-full transition-all duration-300 ease-in-out ${
                isMenuOpen ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"
              }`}
            />
            <span
              className={`w-5 h-0.5 bg-black rounded-full transition-all duration-300 ease-in-out origin-center ${
                isMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""
              }`}
            />
          </div>
        </button>

        {/* App Title */}
        <Link to="/dashboard" className="flex flex-col select-none">
          <span className="text-base md:text-lg font-bold text-black tracking-tight leading-tight">
            BALAJI RENEW INFRATECH LLP
          </span>
          <span className="text-xs md:text-sm font-semibold text-slate-600 leading-tight">
            Payroll Console
          </span>
        </Link>
      </div>

      {/* RIGHT: Profile & Sign Out */}
      <div className="flex items-center gap-3 md:gap-4">
        {isAuthenticated ? (
          <>
            <Link
              to="/profile"
              className="p-2 rounded-lg text-black hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
              title="Profile"
            >
              <FontAwesomeIcon icon={faCircleUser} className="text-2xl text-black" />
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white text-black ring-1 ring-inset ring-slate-300 hover:bg-slate-50 font-medium text-sm transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-slate-700" />
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

