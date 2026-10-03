import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import AddStaffForm from "../components/accounts/AddStaffForm";
import { MdEdit, MdDelete } from "react-icons/md";
import { Search, RotateCcw, Users, Shield, Plus, Database } from "lucide-react";
import RolePage from "../pages/RolesPage";
import Swal from "sweetalert2";
import TableView from "../components/TableView";
import defaultStaffData from "../data/dummyStaffAccounts.json";

export default function Accounts() {
  const BASE_API = import.meta.env.VITE_BASE_API_URL || "http://127.0.0.1:8000";

  // Data states
  const [rows, setRows] = useState([]);
  const [allStaffRecords, setAllStaffRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiveDb, setIsLiveDb] = useState(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");

  // Pagination state
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Role management & Modals
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Helper to read fresh auth token
  const getAuthToken = () => {
    return (
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  };

  // Fetch roles from backend
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        // Fallback default roles from dummy data
        const uniqueRoles = Array.from(new Set(defaultStaffData.map(s => s.role?.name).filter(Boolean)));
        setRoles(uniqueRoles.map((r, i) => ({ id: i + 1, name: r })));
        return;
      }

      const url = `${BASE_API}/auth/roles/`;
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
      const list = Array.isArray(data) ? data : data.results || [];
      if (list.length > 0) {
        setRoles(list);
      } else {
        const uniqueRoles = Array.from(new Set(defaultStaffData.map(s => s.role?.name).filter(Boolean)));
        setRoles(uniqueRoles.map((r, i) => ({ id: i + 1, name: r })));
      }
    } catch (err) {
      console.warn("Using fallback roles:", err.message);
      const uniqueRoles = Array.from(new Set(defaultStaffData.map(s => s.role?.name).filter(Boolean)));
      setRoles(uniqueRoles.map((r, i) => ({ id: i + 1, name: r })));
    } finally {
      setRolesLoading(false);
    }
  }, [BASE_API]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Fetch staff - supports backend API with automatic live synchronization
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        // Not authenticated - fallback to dummy data
        setAllStaffRecords(defaultStaffData);
        setIsLiveDb(false);
        return;
      }

      // 1. Fetch all staff records (/auth/staff/all/)
      let url = `${BASE_API}/auth/staff/all/`;
      let res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // 2. If /all/ is not available, fallback to standard endpoint with page_size
      if (!res.ok && (res.status === 404 || res.status === 405)) {
        url = `${BASE_API}/auth/staff/?page_size=1000`;
        res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch staff`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data.results) ? data.results : []);

      setAllStaffRecords(list);
      setIsLiveDb(true);
    } catch (err) {
      console.warn("Using dummy data fallback for accounts:", err.message);
      const token = getAuthToken();
      if (!token) {
        setAllStaffRecords(defaultStaffData);
        setIsLiveDb(false);
      } else {
        setError("Failed to load staff accounts from live database.");
      }
    } finally {
      setLoading(false);
    }
  }, [BASE_API]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side filtering across the records
  const filteredRecords = useMemo(() => {
    let list = allStaffRecords;

    if (selectedRoleFilter !== "All") {
      list = list.filter(r => (r.role?.name || "") === selectedRoleFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(r =>
        (r.first_name || "").toLowerCase().includes(q) ||
        (r.last_name || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        (r.mobile_no || "").toLowerCase().includes(q) ||
        (r.role?.name || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [allStaffRecords, selectedRoleFilter, searchTerm]);

  // Update pagination and displayed rows when filtered records change
  useEffect(() => {
    const count = filteredRecords.length;
    setTotalCount(count);
    const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
    setTotalPages(pages);

    const safePage = Math.min(currentPage, pages);
    if (safePage !== currentPage && safePage > 0) {
      setCurrentPage(safePage);
    }
    const startIdx = (safePage - 1) * PAGE_SIZE;
    const pageRows = filteredRecords.slice(startIdx, startIdx + PAGE_SIZE);
    setRows(pageRows);
  }, [filteredRecords, currentPage]);

  const handleDeleteStaff = async (id) => {
    const confirm = await Swal.fire({
      title: "Delete Staff Account?",
      text: "Are you sure you want to remove this staff record?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Cancel",
    });

    if (!confirm.isConfirmed) return;

    const token = getAuthToken();
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Authentication Required",
        text: "You must be logged in to delete staff accounts.",
      });
      return;
    }

    try {
      const res = await fetch(`${BASE_API}/auth/staff/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        let errMessage = `Delete failed (HTTP ${res.status})`;
        try {
          const errData = await res.json();
          errMessage = errData.detail || errData.message || JSON.stringify(errData);
        } catch (_) {
          const text = await res.text().catch(() => "");
          if (text) errMessage = text;
        }

        if (res.status === 403) {
          errMessage = "Permission denied: Only administrators can delete staff accounts.";
        } else if (res.status === 401) {
          errMessage = "Session expired or invalid token. Please log in again.";
        } else if (res.status === 404) {
          errMessage = "Staff record not found or already deleted on the server.";
        }

        throw new Error(errMessage);
      }

      // Optimistically update local state immediately
      setAllStaffRecords((prev) => prev.filter((r) => r.id !== id));

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Staff account removed successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      // Re-fetch from server to guarantee persistence and database synchronization
      await fetchData();
    } catch (err) {
      console.error("Delete staff error:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Delete",
        text: err.message || "An error occurred while deleting staff account.",
      });
    }
  };

  // Unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const set = new Set();
    allStaffRecords.forEach(s => {
      if (s.role?.name) set.add(s.role.name);
    });
    return ["All", ...Array.from(set)];
  }, [allStaffRecords]);

  // Role badge color helper
  const getRoleBadgeStyle = (roleName) => {
    const name = (roleName || "").toLowerCase();
    if (name.includes("admin")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (name.includes("manager")) return "bg-sky-50 text-sky-700 border-sky-200";
    if (name.includes("engineer")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (name.includes("account")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (name.includes("supervisor")) return "bg-amber-50 text-amber-700 border-amber-200";
    if (name.includes("safety")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (name.includes("quality")) return "bg-teal-50 text-teal-700 border-teal-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  // Table columns for TableView
  const columns = useMemo(() => ([
    {
      key: "sr",
      label: "Sr. No",
      render: (_, idx) => (
        <span className="font-mono font-bold text-slate-600">
          {(currentPage - 1) * PAGE_SIZE + (idx + 1)}
        </span>
      )
    },
    {
      key: "name",
      label: "Full Name",
      render: r => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {(r.first_name?.[0] || "U").toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-800 text-xs">
              {r.first_name} {r.last_name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Staff ID: #{r.id}
            </div>
          </div>
        </div>
      )
    },
    {
      key: "role",
      label: "Role / Designation",
      render: r => {
        const roleName = r.role?.name || "Staff";
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getRoleBadgeStyle(roleName)}`}>
            {roleName}
          </span>
        );
      }
    },
    {
      key: "email",
      label: "Official Email",
      render: r => (
        <span className="font-mono text-slate-700 text-xs hover:text-sky-600 cursor-pointer">
          {r.email}
        </span>
      )
    },
    {
      key: "mobile",
      label: "Mobile Number",
      render: r => (
        <span className="font-mono text-slate-600 text-xs">
          +91 {r.mobile_no}
        </span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: () => (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Active
        </span>
      )
    },
  ]), [currentPage]);

  // Actions renderer (Edit & Delete)
  const actionsRenderer = useCallback((row) => (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => { setEditingStaff(row); setShowStaffForm(true); }}
        className="p-1.5 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white rounded-lg transition-colors border border-sky-200 shadow-2xs cursor-pointer"
        title="Edit Staff Member"
      >
        <MdEdit className="w-4 h-4" />
      </button>

      <button
        onClick={() => handleDeleteStaff(row.id)}
        className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg transition-colors border border-rose-200 shadow-2xs cursor-pointer"
        title="Delete Staff Member"
      >
        <MdDelete className="w-4 h-4" />
      </button>
    </div>
  ), [handleDeleteStaff]);

  return (
    <Base title="Accounts Overview">
      <div className="space-y-4 pb-6">
        {/* Header Banner matching app styling */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  Staff Accounts & Roles
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>
                    {loading ? "Loading…" : `${totalCount} Staff Records`}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                    <Database className="w-3 h-3" />
                    {isLiveDb ? "Live Database" : "50 Dummy Data Loaded"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddRole(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200/80 transition-colors shadow-2xs cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>Manage Roles</span>
            </button>

            <button
              onClick={() => { setEditingStaff(null); setShowStaffForm(true); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Staff</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search staff by name, email, mobile, or role..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRoleFilter}
              onChange={(e) => {
                setSelectedRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              {uniqueRoles.map((r) => (
                <option key={r} value={r}>
                  {r === "All" ? "All Roles" : r}
                </option>
              ))}
            </select>

            {(searchTerm || selectedRoleFilter !== "All") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedRoleFilter("All");
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Reset filters"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Reusable TableView */}
        <TableView
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          page={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setCurrentPage(p)}
          pageSize={PAGE_SIZE}
          actions={actionsRenderer}
          emptyMessage="No staff accounts match your search."
        />
      </div>

      {/* Manage Roles modal */}
      {showAddRole && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-full max-w-3xl p-4">
            <RolePage
              baseApi={BASE_API}
              onClose={() => {
                setShowAddRole(false);
                fetchRoles();
              }}
            />
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      <AddStaffForm
        open={showStaffForm}
        onClose={() => setShowStaffForm(false)}
        onSuccess={() => fetchData()}
        baseApi={BASE_API}
        roles={roles}
        staff={editingStaff}
      />
    </Base>
  );
}
