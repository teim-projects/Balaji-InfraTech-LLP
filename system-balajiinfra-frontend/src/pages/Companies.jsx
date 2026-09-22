import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import TableView from "../components/TableView";
import { MdEdit, MdDelete } from "react-icons/md";
import Swal from "sweetalert2";
import { useNavigate, Link } from "react-router-dom";
import { Plus, Home, ChevronRight } from "lucide-react";

export default function Companies() {
  const navigate = useNavigate();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const API_URL = `${BASE_API.replace(/\/$/, "")}/lead/companies/`;
  
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE_FALLBACK = 10;

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";
      if (!token) throw new Error("No bearer token found.");

      const params = new URLSearchParams();
      params.set("page", String(page));

      const url = `${API_URL}?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${body ? " - " + body : ""}`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.results)) {
        setRows(data.results);
        const count = Number.isFinite(data.count) ? data.count : data.results.length;
        const pageSize = data.results.length || PAGE_SIZE_FALLBACK;
        const calculatedPages = Math.max(1, Math.ceil(count / pageSize));

        setRows(data.results);
        setTotalPages(calculatedPages);

        if (page > calculatedPages && calculatedPages > 0) {
          setCurrentPage(calculatedPages);
        } else {
          setCurrentPage(page);
        }
      } else if (Array.isArray(data)) {
        setRows(data);
        setTotalPages(Math.max(1, Math.ceil(data.length / PAGE_SIZE_FALLBACK)));
        setCurrentPage(1);
      } else {
        throw new Error("Unexpected API response format");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  const handleDelete = useCallback(async (id) => {
    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
      });

      if (!result.isConfirmed) return;

      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";

      const res = await fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to delete company");
      }

      Swal.fire("Deleted!", "Company has been deleted.", "success");
      
      if (rows.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchData(currentPage);
      }
    } catch (err) {
      console.error("Delete Error:", err);
      Swal.fire("Error", err.message || "Failed to delete", "error");
    }
  }, [API_URL, currentPage, rows.length, fetchData]);

  const columns = [
    { key: "sr", label: "Sr.No", render: (_, idx) => (currentPage - 1) * PAGE_SIZE_FALLBACK + (idx + 1) },
    { key: "name", label: "Company Name", render: (r) => r.name || "-" },
    { key: "address", label: "Address", render: (r) => r.address || "-" },
    { key: "vendor", label: "Vendor", render: (r) => r.vendor || "-" },
    { key: "gst", label: "GST", render: (r) => r.gst || "-" },
    {
      key: "billing",
      label: "Billing Configuration",
      render: (r) => (
        <div className="flex flex-wrap gap-1 text-[11px] max-w-xs">
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
            PF: {r.pf != null ? `${r.pf}%` : "13%"}
          </span>
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
            ESIC: {r.esic != null ? `${r.esic}%` : "3.25%"}
          </span>
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
            LWF: ₹{r.lwf != null ? r.lwf : "75"}
          </span>
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
            Uniform: ₹{r.uniform_charge != null ? r.uniform_charge : "300"}
          </span>
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
            Admin: {r.admin_charge != null ? `${r.admin_charge}%` : "7%"}
          </span>
        </div>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/companies/edit/${r.id}`)}
            className="px-2 py-1 bg-sky-100 text-sky-700 rounded hover:bg-sky-200 transition-colors"
            title="Edit"
          >
            <MdEdit />
          </button>
          <button
            onClick={() => handleDelete(r.id)}
            className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            title="Delete"
          >
            <MdDelete />
          </button>
        </div>
      )
    },
  ];

  return (
    <Base title="Companies">
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
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
                <Link to="/master-data" className="ml-1 md:ml-2 hover:text-blue-600 transition-colors">
                  Master Data
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span className="ml-1 md:ml-2 text-slate-700 font-semibold">Companies</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Companies</h2>
            <p className="text-sm text-slate-500 mt-1">Manage all registered companies and billing details.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/companies/register')}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Company
            </button>
          </div>
        </div>

        <TableView
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          page={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => {
            if (p < 1 || p > totalPages) {
              console.warn(`Invalid page ${p}. Total pages: ${totalPages}`);
              return;
            }
            setCurrentPage(p);
          }}
        />
      </div>
    </Base>
  );
}
