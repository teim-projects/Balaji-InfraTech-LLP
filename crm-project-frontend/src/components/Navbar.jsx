import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleUser, faBars } from "@fortawesome/free-solid-svg-icons";

const Navbar = ({ onMenuClick }) => {
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
    <nav style={styles.navbar}>
      {/* LEFT: Menu Icon */}
      <div style={styles.left}>
        {/* Mobile / Tablet → Menu Icon */}
        <button
          onClick={onMenuClick}
          style={styles.menuBtn}
          className="md:hidden"
          title="Menu"
        >
          <FontAwesomeIcon icon={faBars} size="lg" />
        </button>

        {/* Desktop → App Name */}
        <Link
          to="/dashboard"
          style={styles.logo}
          className="hidden md:block text-2xl font-bold"
        >
          Krisna AC
        </Link>
      </div>
      {/* RIGHT: Profile / Login */}
      <div style={styles.links}>
        {isAuthenticated ? (
          <Link to="/profile">
            <FontAwesomeIcon icon={faCircleUser} size="lg" title="Profile" />
          </Link>
        ) : (
          <Link to="/login" style={styles.link}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    backgroundColor: "#34495E",
    color: "white",
    position: "fixed",
    top: "0",
    width: "100%",
    zIndex: 1000,
  },
  menuBtn: {
    background: "none",
    border: "none",
    color: "white",
    cursor: "pointer",
  },
  links: {
    display: "flex",
    gap: "12px",
  },
  link: {
    color: "white",
    textDecoration: "none",
    fontWeight: "bold",
    padding: "8px 14px",
    borderRadius: "6px",
    backgroundColor: "#388E3C",
  },
};

export default Navbar;
