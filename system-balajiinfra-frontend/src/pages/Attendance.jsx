import React, { useState, useEffect } from "react";
import Base from "../components/Base";
import { useNavigate, Link } from "react-router-dom";
import { ChevronRight, Home, Building } from "lucide-react";

export default function AttendancePage() {
  const navigate = useNavigate();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const API_URL = `${BASE_API.replace(/\/$/, "")}/lead/companies/`;
  
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token =
          localStorage.getItem("access") ||
          localStorage.getItem("access_token") ||
          localStorage.getItem("token") ||
          "";
        
        const res = await fetch(API_URL, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch companies");
        }
        
        const data = await res.json();
        if (data && Array.isArray(data.results)) {
          setCompanies(data.results);
        } else if (Array.isArray(data)) {
          setCompanies(data);
        } else {
          setCompanies([]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompanies();
  }, [API_URL]);

  return (
    <Base title="Attendance">
      <div className="p-4 space-y-6">
        
        {/* Breadcrumb */}
        <nav className="flex text-sm text-slate-500 font-medium" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link to="/dashboard" className="inline-flex items-center hover:text-blue-600 transition-colors">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="ml-1 md:ml-2 text-slate-700">Attendance</span>
              </div>
            </li>
          </ol>
        </nav>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 bg-red-50 rounded-md">Error: {error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => navigate(`/attendance/company/${company.id}`)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                    <Building className="w-6 h-6" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                  {company.name}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2 mt-auto">
                  {company.address || "No address provided"}
                </p>
              </div>
            ))}
            
            {companies.length === 0 && (
              <div className="col-span-full p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-500">No registered companies found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Base>
  );
}
