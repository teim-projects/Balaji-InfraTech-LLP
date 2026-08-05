import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import AddStaffForm from "../components/accounts/AddStaffForm";
import { MdEdit, MdDelete } from "react-icons/md";
import RolePage from "../pages/RolesPage";
import Swal from "sweetalert2";
import TableView from "../components/TableView"; // <-- reusable table

export default function Accounts() {
  const BASE_API = import.meta.env.VITE_BASE_API_URL;
  const initialFilters = useMemo(() => ({ search: "", role: "" }), []);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const token = useMemo(() => {
    return (
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  }, []);

  // dynamic filters config (role options loaded)
  const dashboardFilters = useMemo(() => {
    return [
      { key: "search", type: "search", label: "Search", placeholder: "Search name, email, mobile..." },
      {
        key: "role",
        type: "select",
        label: "Role",
        placeholder: "All roles",
        options: [...roles.map(r => ({ value: String(r.id), label: r.name }))]
      },
    ];
  }, [roles]);

  // fetch roles
  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      if (!token) throw new Error("No bearer token found.");

      const url = `${BASE_API}/auth/roles/`;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${body ? " — " + body : ""}`);
      }

      const data = await res.json();

      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      setRolesError(err.message || String(err));
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  }, [token, BASE_API]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  // fetch staff - supports paginated and non-paginated responses
  const PAGE_SIZE = 10;
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error("No bearer token found in localStorage.");

      const params = new URLSearchParams();
      params.set("page", String(page));
      // attach filters
      if (appliedFilters.search) params.set("search", appliedFilters.search);
      if (appliedFilters.role) params.set("role", appliedFilters.role);

      const url = `${BASE_API}/auth/staff/?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${body ? " — " + body : ""}`);
      }

      const data = await res.json();

      // If DRF pagination is enabled, response will contain `results`
      if (data && Array.isArray(data.results)) {
        setRows(data.results);
        const count = Number.isFinite(data.count) ? data.count : (data.results.length || 0);
        setTotalCount(count);
        // compute total pages (PAGE_SIZE must match backend page size)
        const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
        setTotalPages(pages);
        setCurrentPage(page);
      } else if (Array.isArray(data)) {
        // not paginated: backend returned raw array
        setRows(data);
        setTotalCount(data.length);
        setTotalPages(Math.max(1, Math.ceil(data.length / PAGE_SIZE)));
        setCurrentPage(1);
      } else {
        // unexpected shape
        throw new Error("Unexpected staff response shape");
      }
    } catch (err) {
      setError(err.message || String(err));
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [token, appliedFilters, BASE_API]);

  // initial load and reload whenever filters or page change
  useEffect(() => {
    // whenever filters change, reset to page 1
    setCurrentPage(1);
    fetchData(1);
  }, [appliedFilters, fetchData]);

  // when currentPage changes (via pagination UI), fetch that page
  useEffect(() => {
    fetchData(currentPage);
  }, [currentPage, fetchData]);

  const handleFilterChange = useCallback((filters) => {
    setAppliedFilters(prev => ({ ...prev, ...filters }));
  }, []);

  const handleDeleteStaff = async (id) => {
    const confirm = await Swal.fire({
      title: "Delete Staff?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete"
    });

    if (!confirm.isConfirmed) return;

    await fetch(`${BASE_API}/auth/staff/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    fetchData(currentPage);
  };

  // table columns for TableView
  const columns = useMemo(() => ([
    {
      key: "sr",
      label: "Sr.No",
      render: (_, idx) => (currentPage - 1) * PAGE_SIZE + (idx + 1)
    },
    { key: "email", label: "Email", render: r => r.email },
    { key: "mobile", label: "Mobile", render: r => r.mobile_no },
    { key: "first_name", label: "First Name", render: r => r.first_name },
    { key: "last_name", label: "Last Name", render: r => r.last_name },
    { key: "role", label: "Role", render: r => r.role?.name ?? "" },
  ]), [currentPage]);

  // actions renderer (centered by TableView)
  const actionsRenderer = useCallback((row) => (
    <>
      <button
        onClick={() => { setEditingStaff(row); setShowStaffForm(true); }}
        className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded"
        title="Edit"
      >
        <MdEdit />
      </button>

      <button
        onClick={() => handleDeleteStaff(row.id)}
        className="px-2 py-1 bg-red-200 text-red-800 rounded"
        title="Delete"
      >
        <MdDelete />
      </button>
    </>
  ), [handleDeleteStaff]);

  return (
    <Base
      title="Accounts Overview"
      filtersConfig={dashboardFilters}
      initialFilterValues={initialFilters}
      onFiltersChange={handleFilterChange}
    >
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Staff Accounts & Roles</h2>
            <div className="text-sm text-slate-600">
              {loading ? "Loading…" : `${totalCount} total • ${rows.length} shown`}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddRole(true)}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
            >
              Manage Roles
            </button>

            <button
              onClick={() => { setEditingStaff(null); setShowStaffForm(true); }}
              className="px-4 py-2 rounded-md bg-sky-600 text-white"
            >
              + Add Staff
            </button>

            {rolesLoading ? <div className="text-sm text-slate-500">Loading roles…</div> :
             rolesError ? <div className="text-sm text-red-500">Roles error</div> : null}
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
          emptyMessage="No records"
        />
      </div>

      {/* Manage Roles modal */}
      {showAddRole && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-full max-w-3xl p-4">
            <RolePage baseApi={BASE_API} onClose={() => {setShowAddRole(false); 
                      fetchRoles();}} />
          </div>
        </div>
      )}

      <AddStaffForm
        open={showStaffForm}
        onClose={() => setShowStaffForm(false)}
        onSuccess={() => fetchData(currentPage)}
        baseApi={BASE_API}
        roles={roles}
        staff={editingStaff}
      />
    </Base>
  );
}
