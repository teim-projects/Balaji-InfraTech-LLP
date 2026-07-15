import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import TableView from "../components/TableView";
import { MdEdit, MdDelete } from "react-icons/md";
import Swal from "sweetalert2";
import AddCustomerForm from "../components/customers/AddCustomerForm"; // <-- import the form

export default function Customer() {
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const API_URL = `${BASE_API}/lead/customer/`;
  const initialFilters = useMemo(() => ({ search: "" }), []);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE_FALLBACK = 10;

  // modal / edit state
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  const customerFilters = useMemo(() => [
    { key: "search", type: "search", label: "Search", placeholder: "Search name, email, contact..." },
  ], []);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (appliedFilters?.search) params.set("search", appliedFilters.search);

      const url = `${API_URL}?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${body ? " — " + body : ""}`);
      }

      const data = await res.json();

      if (data && Array.isArray(data.results)) {
        const items = data.results;
        const count = Number.isFinite(data.count) ? data.count : items.length;
        const pageSize = items.length || PAGE_SIZE_FALLBACK;
        const calculatedPages = Math.max(1, Math.ceil(count / pageSize));
        
        setRows(items);
        setTotalCount(count);
        setTotalPages(calculatedPages);
        
        // Ensure current page doesn't exceed total pages
        if (page > calculatedPages && calculatedPages > 0) {
          setCurrentPage(calculatedPages);
        } else {
          setCurrentPage(page);
        }
      } else if (Array.isArray(data)) {
        const calculatedPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE_FALLBACK));
        setRows(data);
        setTotalCount(data.length);
        setTotalPages(calculatedPages);
        setCurrentPage(1);
      } else {
        const items = Array.isArray(data?.results) ? data.results : Array.isArray(data?.data) ? data.data : [];
        const calculatedPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE_FALLBACK));
        setRows(items);
        setTotalCount(items.length);
        setTotalPages(calculatedPages);
        setCurrentPage(1);
      }
    } catch (err) {
      setError(err.message || String(err));
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, appliedFilters]);

  useEffect(() => { fetchData(currentPage); }, [fetchData, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const handleFilterChange = useCallback((filters) => {
    setAppliedFilters(prev => ({ ...prev, ...filters }));
  }, []);

  const handleDelete = async (id) => {
    const res = await Swal.fire({
      title: "Delete customer?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete"
    });
    if (!res.isConfirmed) return;

    try {
      const resp = await fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`${resp.status} ${resp.statusText} — ${text}`);
      }
      Swal.fire({ icon: "success", text: "Customer deleted", timer: 1000, showConfirmButton: false });
      // refresh current page
      fetchData(currentPage);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Delete failed", text: err.message || String(err) });
    }
  };

  const columns = [
    { key: "sr", label: "Sr.No", render: (_, idx) => (currentPage - 1) * PAGE_SIZE_FALLBACK + (idx + 1) },
    { key: "name", label: "Company Name", render: (r) => r.name },
    { key: "contact", label: "Contact", render: (r) => r.contact_number },
    { key: "email", label: "Email", render: (r) => r.email },
    { key: "land_line_no", label: "Landline No", render: (r) => r.land_line_no },
    { key: "poc_name", label: "POC Name", render: (r) => r.poc_name },
    { key: "poc_contact_number", label: "POC Contact", render: (r) => r.poc_contact_number },
    { key: "city", label: "City", render: (r) => r.city },
    { key: "state", label: "State", render: (r) => r.state },
    // { key: "pin", label: "Pin", render: (r) => r.pin_code },
    // { key: "addr", label: "Address", render: (r) => r.address },
    // { key: "site_addr", label: "Site Address", render: (r) => r.site_address },
  ];

  // actions renderer (centered by TableView)
    const actionsRenderer = useCallback((row) => (
      <>
        <button
          onClick={() => { setEditingCustomer(row); setShowCustomerForm(true); }}
          className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded"
          title="Edit"
        >
          <MdEdit />
        </button>
  
        <button
          onClick={() => handleDelete(row.id)}
          className="px-2 py-1 bg-red-200 text-red-800 rounded"
          title="Delete"
        >
          <MdDelete />
        </button>
      </>
    ), [handleDelete]);

  return (
    <Base
      title="Customers"
      filtersConfig={customerFilters}
      initialFilterValues={initialFilters}
      onFiltersChange={handleFilterChange}
    >
      <div className="space-y-6 ">
        <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Customers</h2>
            <div className="text-sm text-slate-600">
              {loading ? "Loading…" : `${totalCount} total • ${rows.length} shown`}
            </div>
          </div>
          <div className="flex items-center gap-3">
            
            <button
              onClick={() => { setEditingCustomer(null); setShowCustomerForm(true); }}
              className="px-4 py-2 rounded-md bg-sky-600 text-white"
            >
              + Add
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
            // Safeguard: Don't allow navigation beyond total pages
            if (p < 1 || p > totalPages) {
              console.warn(`Invalid page ${p}. Total pages: ${totalPages}`);
              return;
            }
            setCurrentPage(p);
          }}
          pageSize={PAGE_SIZE_FALLBACK}
          actions={actionsRenderer}
          emptyMessage="No customers found"
        />
      </div>

      {/* Add / Edit Customer Modal */}
      <AddCustomerForm
        open={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        baseApi={BASE_API}
        customer={editingCustomer}
        onSuccess={() => {
          // After adding a new customer, calculate which page it should be on
          if (!editingCustomer) {
            // This is a new customer (not editing)
            const newTotalCount = totalCount + 1;
            const lastPage = Math.ceil(newTotalCount / PAGE_SIZE_FALLBACK);
            
            // Navigate to the last page where the new item will be
            fetchData(lastPage);
          } else {
            // Editing existing customer, stay on current page
            fetchData(currentPage);
          }
          
          setEditingCustomer(null);
        }}
      />
    </Base>
  );
}
