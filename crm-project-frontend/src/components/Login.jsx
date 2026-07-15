import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";


const Login = () => {
  const navigate = useNavigate();
  const BASE_API = import.meta.env.VITE_BASE_API_URL;
  console.log("BASE_API :", BASE_API);

  const LOGIN_ENDPOINT = `${BASE_API}/auth/dj-rest-auth/login/`;

  const [form, setForm] = useState({ email_or_mobile: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Logging in...");

    try {
      const res = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage("❌ Login failed: " + JSON.stringify(data));
        return;
      }

      if (data.access) localStorage.setItem("access", data.access);
      if (data.refresh) localStorage.setItem("refresh", data.refresh);

      window.dispatchEvent(new Event("authChange"));
      
      setMessage("✅ Login successful!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setMessage("⚠️ Error connecting to server.");
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-slate-50">
  
      {/* LEFT WELCOME SECTION */}
      <div className="hidden md:flex flex-col justify-center px-16 bg-gradient-to-br from-sky-100 to-sky-200 relative overflow-hidden">
  
        {/* Decorative circles */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-sky-300 opacity-20 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-52 h-52 bg-sky-400 opacity-20 rounded-full blur-xl"></div>
  
        <h1 className="text-5xl font-extrabold text-sky-700 leading-tight drop-shadow-sm z-10">
          Welcome to <br /> Krisna Air Conditioning
        </h1>
  
        <p className="mt-6 text-lg text-sky-700 max-w-md z-10">
          Premium Cooling, Trusted Service — providing modern AC solutions for your comfort. 
        </p>
  
        <p className="mt-4 text-sm text-sky-600 opacity-80 z-10">
          Creating healthier, cooler environments since 2005.
        </p>
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
  
              {/* Forgot */}
              {/* 
              <Link to="/forgot-password" className="text-sky-600 hover:text-sky-700 font-medium">
                Forgot?
              </Link>
              */}
            </div>
  
            {/* Submit */}
            <button
              className="w-full py-3 rounded-md text-white font-semibold 
                         bg-sky-500 hover:bg-sky-600 transition-all duration-200 shadow-sm"
            >
              Login
            </button>
          </form>
  
          {/* Message */}
          {message && (
            <p className="mt-6 text-center text-sm text-sky-600 font-medium">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
  
  
};

export default Login;
