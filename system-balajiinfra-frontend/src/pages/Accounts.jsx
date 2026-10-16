import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import AddStaffForm from "../components/accounts/AddStaffForm";
import { MdEdit, MdDelete } from "react-icons/md";
import { Search, RotateCcw, ShieldCheck, Shield, Plus, Database } from "lucide-react";
import RolePage from "../pages/RolesPage";
import Swal from "sweetalert2";
import TableView from "../components/TableView";

const DEFAULT_ADMIN_DATA = [
  {
    id: 1,
    first_name: "Admin",
    last_name: "User",
    email: "admin1234@gmail.com",
    mobile_no: "1234567890",
    role: { id: 1, name: "Admin" },
    is_staff: true,
    is_superuser: true,
  },
];

export default function Accounts() {
  const BASE_API = import.meta.env.VITE_BASE_API_URL || "http://127.0.0.1:8000";

  // Data states
  const [rows, setRows] = useState([]);
  const [allAdminRecords, setAllAdminRecords] = useState([]);
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
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);

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

  // Fetch admin roles from backend
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setRoles([
          { id: 1, name: "Admin" },
          { id: 2, name: "Sub-Admin" },
        ]);
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
        throw new Error(`${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : data.results || [];
      // Accounts is only for admin accounts: filter roles to admin roles
      const adminRoles = list.filter((r) =>
        (r.name || "").toLowerCase().includes("admin")
      );
      if (adminRoles.length > 0) {
        setRoles(adminRoles);
      } else {
        setRoles([
          { id: 1, name: "Admin" },
          { id: 2, name: "Sub-Admin" },
        ]);
      }
    } catch (err) {
      setRoles([
        { id: 1, name: "Admin" },
        { id: 2, name: "Sub-Admin" },
      ]);
    } finally {
      setRolesLoading(false);
    }
  }, [BASE_API]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Fetch admin accounts - strictly displays administrator accounts only
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        setAllAdminRecords(DEFAULT_ADMIN_DATA);
        setIsLiveDb(false);
        return;
      }

      let url = `${BASE_API}/auth/staff/all/`;
      let res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

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
        throw new Error(`HTTP ${res.status}: Failed to fetch admin accounts`);
      }

      const data = await res.json();
      const rawList = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : [];
      // Strictly ensure only Admin / Administrator accounts are included
      const list = rawList.filter(
        (r) =>
          r.is_superuser ||
          (r.role?.name || "").toLowerCase().includes("admin") ||
          (r.email || "").toLowerCase().includes("admin")
      );

      setAllAdminRecords(list.length > 0 ? list : DEFAULT_ADMIN_DATA);
      setIsLiveDb(true);
    } catch (err) {
      console.warn("Using default admin data fallback:", err.message);
      setAllAdminRecords(DEFAULT_ADMIN_DATA);
      setIsLiveDb(false);
    } finally {
      setLoading(false);
    }
  }, [BASE_API]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side filtering across admin records
  const filteredRecords = useMemo(() => {
    let list = allAdminRecords;

    if (selectedRoleFilter !== "All") {
      list = list.filter((r) => (r.role?.name || "") === selectedRoleFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          (r.first_name || "").toLowerCase().includes(q) ||
          (r.last_name || "").toLowerCase().includes(q) ||
          (r.email || "").toLowerCase().includes(q) ||
          (r.mobile_no || "").toLowerCase().includes(q) ||
          (r.role?.name || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [allAdminRecords, selectedRoleFilter, searchTerm]);

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

  const handleDeleteAdmin = async (id) => {
    const confirm = await Swal.fire({
      title: "Delete Admin Account?",
      text: "Are you sure you want to remove this administrator account?",
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
        text: "You must be logged in to delete administrator accounts.",
      });
      return;
    }

    try {
      const res = await fetch(`${BASE_API}/auth/staff/${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to delete administrator account (HTTP ${res.status})`);
      }

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Admin account removed successfully.",
        timer: 1500,
        showConfirmButton: false,
      });

      await fetchData();
    } catch (err) {
      console.error("Delete admin error:", err);
      Swal.fire({
        icon: "error",
        title: "Failed to Delete",
        text: err.message || "An error occurred while deleting admin account.",
      });
    }
  };

  // Unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const set = new Set();
    allAdminRecords.forEach((s) => {
      if (s.role?.name) set.add(s.role.name);
    });
    return ["All", ...Array.from(set)];
  }, [allAdminRecords]);

  // Role badge color helper
  const getRoleBadgeStyle = (roleName) => {
    const name = (roleName || "").toLowerCase();
    if (name.includes("super")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (name.includes("sub")) return "bg-sky-50 text-sky-700 border-sky-200";
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  };

  // Table columns for TableView
  const columns = useMemo(
    () => [
      {
        key: "sr",
        label: "Sr. No",
        render: (_, idx) => (
          <span className="font-mono font-bold text-slate-600">
            {(currentPage - 1) * PAGE_SIZE + (idx + 1)}
          </span>
        ),
      },
      {
        key: "name",
        label: "Admin Name",
        render: (r) => (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {(r.first_name?.[0] || "A").toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-800 text-xs">
                {r.first_name} {r.last_name}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Admin ID: #{r.id}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        label: "Admin Role",
        render: (r) => {
          const roleName = r.role?.name || (r.is_superuser ? "Super Admin" : "Admin");
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getRoleBadgeStyle(
                roleName
              )}`}
            >
              {roleName}
            </span>
          );
        },
      },
      {
        key: "email",
        label: "Official Email",
        render: (r) => (
          <span className="font-mono text-slate-700 text-xs hover:text-sky-600 cursor-pointer">
            {r.email}
          </span>
        ),
      },
      {
        key: "mobile",
        label: "Mobile Number",
        render: (r) => (
          <span className="font-mono text-slate-600 text-xs">
            +91 {r.mobile_no || "—"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: () => (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        ),
      },
    ],
    [currentPage]
  );

  // Actions renderer (Edit & Delete)
  const actionsRenderer = useCallback(
    (row) => (
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={() => {
            setEditingAdmin(row);
            setShowAdminForm(true);
          }}
          className="p-1.5 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white rounded-lg transition-colors border border-sky-200 shadow-2xs cursor-pointer"
          title="Edit Admin Account"
        >
          <MdEdit className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleDeleteAdmin(row.id)}
          className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg transition-colors border border-rose-200 shadow-2xs cursor-pointer"
          title="Delete Admin Account"
        >
          <MdDelete className="w-4 h-4" />
        </button>
      </div>
    ),
    [handleDeleteAdmin]
  );

  return (
    <Base title="Accounts Overview">
      <div className="space-y-4 pb-6">
        {/* Header Banner */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  Administrator Accounts & Roles
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>
                    {loading ? "Loading…" : `${totalCount} Admin ${totalCount === 1 ? "Account" : "Accounts"}`}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                    <Database className="w-3 h-3" />
                    {isLiveDb ? "Live Database" : "Protected Portal"}
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
              <span>Admin Roles</span>
            </button>

            <button
              onClick={() => {
                setEditingAdmin(null);
                setShowAdminForm(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Admin</span>
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
                placeholder="Search admin by name, email, or mobile..."
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
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none font-medium"
            >
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>
                  {role === "All" ? "All Admin Roles" : role}
                </option>
              ))}
            </select>

            {(searchTerm || selectedRoleFilter !== "All") && (
              <button
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
          emptyMessage="No admin accounts match your search."
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

      {/* Add / Edit Admin Modal */}
      <AddStaffForm
        open={showAdminForm}
        onClose={() => setShowAdminForm(false)}
        onSuccess={() => fetchData()}
        baseApi={BASE_API}
        roles={roles}
        staff={editingAdmin}
      />
    </Base>
  );
}
