import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Building2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import authbg from "../assets/images/authbg.jpg";

const Login = () => {
  const navigate = useNavigate();
  const BASE_API = import.meta.env.VITE_BASE_API_URL;
  console.log("BASE_API :", BASE_API);

  const LOGIN_ENDPOINT = `${BASE_API}/auth/dj-rest-auth/login/`;

  const [form, setForm] = useState({ email_or_mobile: "", password: "" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "error" });

  const showToast = (msg, type = "error") => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const formatErrorMessage = (data) => {
    if (!data) return "Login failed. Please check your credentials.";
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (data.non_field_errors) {
      return Array.isArray(data.non_field_errors)
        ? data.non_field_errors.join(" ")
        : data.non_field_errors;
    }

    const errors = [];
    if (data.email_or_mobile) {
      errors.push(
        Array.isArray(data.email_or_mobile)
          ? `Email/Mobile: ${data.email_or_mobile.join(", ")}`
          : `Email/Mobile: ${data.email_or_mobile}`
      );
    }
    if (data.password) {
      errors.push(
        Array.isArray(data.password)
          ? `Password: ${data.password.join(", ")}`
          : `Password: ${data.password}`
      );
    }

    if (errors.length > 0) {
      return errors.join(" ");
    }

    return Object.entries(data)
      .map(([field, errs]) => {
        const fieldName = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const errText = Array.isArray(errs) ? errs.join(", ") : errs;
        return `${fieldName}: ${errText}`;
      })
      .join(" ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Logging in...");
    setIsError(false);

    try {
      const res = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = formatErrorMessage(data);
        setIsError(true);
        setMessage(errMsg);
        showToast(errMsg, "error");
        return;
      }

      if (data.access) localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);

      setIsError(false);
      setMessage("Login successful!");
      showToast("Login successful!", "success");

      setTimeout(() => {
        window.dispatchEvent(new Event("authChange"));
        navigate("/dashboard");
      }, 1000);
    } catch (error) {
      console.error("Login error:", error);
      const connErrMsg = "Error connecting to server. Please try again.";
      setIsError(true);
      setMessage(connErrMsg);
      showToast(connErrMsg, "error");
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-slate-50 relative">

      {/* FLOATING TOAST NOTIFICATION (SLIDE IN FROM LEFT) */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={`fixed top-5 left-5 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg shadow-md border bg-white/95 backdrop-blur-sm text-xs max-w-sm ${toast.type === "error" ? "border-red-200" : "border-emerald-200"
              }`}
          >
            <div className={`p-1 rounded-full shrink-0 ${toast.type === "error" ? "bg-red-100 text-red-500" : "bg-emerald-100 text-emerald-500"}`}>
              {toast.type === "error" ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
            <span className="text-slate-700 font-medium leading-snug flex-1">{toast.message}</span>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT WELCOME SECTION */}
      <div
        className="hidden md:flex flex-col justify-between p-12 lg:p-16 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${authbg})` }}
      >
        {/* Soft dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 z-0"></div>

        {/* Top Company Branding */}
        <div className="relative z-10">
          <p className="text-xl font-semibold tracking-wide text-white">
            WELCOME TO
          </p>
          <h2 className="text-2xl lg:text-4xl font-bold text-white tracking-tight mt-1">
            Balaji Renew Infratech LLP
          </h2>
          <p className="text-lg font-semibold text-white mt-0.5">
            Payroll System
          </p>
        </div>

        {/* Bottom Hero Content */}
        <div className="relative z-10 max-w-xl mt-12">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-xs font-medium text-white shadow-sm mb-6 w-fit">
            <Building2 className="w-3.5 h-3.5 opacity-90" />
            <span>Trusted by staffing teams</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-white leading-tight tracking-tight drop-shadow-sm mb-4">
            Hire, verify, deploy the modern workforce workflow.
          </h1>

          {/* Subtitle */}
          <p className="text-base text-slate-200 font-medium opacity-90 drop-shadow-sm">
            From open requirement to active site, keep every candidate journey tracked, transparent, and audit-ready.
          </p>
        </div>
      </div>

      {/* RIGHT LOGIN FORM */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-lg border border-slate-100">

          <h2 className="text-3xl font-bold text-slate-800 text-center mb-2">
            Sign in
          </h2>

          <p className="text-sm text-slate-500 text-center mb-8">
            Login using your registered mobile number or email.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email/Mobile */}
            <div>
              <label className="text-sm text-slate-600 font-medium">
                Email or Mobile
              </label>
              <input
                type="text"
                name="email_or_mobile"
                value={form.email_or_mobile}
                onChange={handleChange}
                placeholder="you@example.com or 9876543210"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 
                           focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-slate-600 font-medium">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 
                           focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              {/* Remember */}
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="rounded text-sky-500 focus:ring-sky-300" />
                <span className="text-slate-600">Remember me</span>
              </label>
            </div>

            {/* Submit */}
            <button
              className="w-full py-3 rounded-md text-white font-semibold 
                         bg-gray-600 hover:bg-gray-700 transition-all duration-200 shadow-sm cursor-pointer"
            >
              Login
            </button>
          </form>

          {/* Inline plain text message (no box) */}
          {message && (
            <p
              className={`mt-5 text-center text-sm font-medium ${isError ? "text-red-500" : "text-emerald-600"
                }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );


};

export default Login;
