import React, { useState, useEffect, useMemo } from "react";
// import Base from "../components/Base";
import { MdEdit, MdDelete } from "react-icons/md";
import Swal from "sweetalert2";
import AddVendorForm from "./AddVendorForm";
import Pagination from "../Pagination";

export default function Vendor({ base_api, filters }) {
  const BASE_API = base_api;

  // State for vendors list
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10; // Items per page

  // Modal state
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  // Fetch vendors from API with pagination | GET
  const fetchVendors = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_API}/inventory/vendors/?page=${page}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      //setVendors(data.results || data);
      // Handle paginated response from Django REST Framework
      if (data.results) {
        setVendors(data.results);
        setTotalCount(data.count || 0);
        const calculatedPages = Math.ceil((data.count || 0) / PAGE_SIZE);
        setTotalPages(calculatedPages);
        
        // Ensure current page doesn't exceed total pages
        if (page > calculatedPages && calculatedPages > 0) {
          setCurrentPage(calculatedPages);
        } else {
          setCurrentPage(page);
        }
      } else {
        // Fallback for non-paginated response
        setVendors(data);
        setTotalCount(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      }

    } catch (error) {
      console.error("Error fetching vendors:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch vendors"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter vendors with search
  const filterVendors = async (filterValues = {}, page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page);

      // Add search parameter if exists
      if (filterValues.search && filterValues.search.trim()) {
        params.set("search", filterValues.search);
      }

      const url = `${BASE_API}/inventory/vendors/?${params.toString()}`;
      console.log("🔎 Filter URL:", url);

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.results) {
        setVendors(data.results);
        setTotalCount(data.count || 0);
        const calculatedPages = Math.ceil((data.count || 0) / PAGE_SIZE);
        setTotalPages(calculatedPages);
        
        // Ensure current page doesn't exceed total pages
        if (page > calculatedPages && calculatedPages > 0) {
          setCurrentPage(calculatedPages);
        } else {
          setCurrentPage(page);
        }
      } else {
        setVendors(data);
        setTotalCount(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      }

    } catch (error) {
      console.error("Error filtering vendors:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to filter vendors"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch vendors on mount and when filters change
  useEffect(() => {
    const hasAnyFilter = filters && Object.values(filters).some(
      v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
    );

    if (hasAnyFilter) {
      filterVendors(filters, 1);  // Reset to page 1 when filters change
    } else {
      fetchVendors(1);  // Reset to page 1 when no filters
    }
  }, [filters]);

  // Handle delete vendor
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete vendor?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_API}/inventory/vendors/${id}/`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      Swal.fire({
        icon: "success",
        text: "Vendor deleted successfully",
        timer: 1500,
        showConfirmButton: false
      });

      // Refresh vendor list with current filters
      const hasAnyFilter = filters && Object.values(filters).some(
        v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
      );
      hasAnyFilter ? filterVendors(filters, currentPage) : fetchVendors(currentPage);

    } catch (error) {
      console.error("Error deleting vendor:", error);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: error.message || "Failed to delete vendor"
      });
    }
  };

  // Handle edit vendor
  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setShowVendorForm(true);
  };

  // Handle add vendor button
  const handleAddVendor = () => {
    setEditingVendor(null);
    setShowVendorForm(true);
  };

  // Handle form success (after add/edit)
  const handleFormSuccess = (data) => {
    console.log("Vendor saved:", data);
    
    // After adding a new vendor, calculate which page it should be on
    if (!editingVendor) {
      // This is a new vendor (not editing)
      const newTotalCount = totalCount + 1;
      const lastPage = Math.ceil(newTotalCount / PAGE_SIZE);
      
      // Navigate to the last page where the new item will be
      const hasAnyFilter = filters && Object.values(filters).some(
        v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
      );
      hasAnyFilter ? filterVendors(filters, lastPage) : fetchVendors(lastPage);
    } else {
      // Editing existing vendor, stay on current page
      const hasAnyFilter = filters && Object.values(filters).some(
        v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
      );
      hasAnyFilter ? filterVendors(filters, currentPage) : fetchVendors(currentPage);
    }
    
    setEditingVendor(null);
  };


  return (
    <div className="space-y-6">

      {/* Header Section */}
      <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Vendor Management</h2>
          <div className="text-sm text-slate-600">
            {loading ? "Loading..." : `${totalCount} vendor(s) found`}
          </div>
        </div>
        <div>
          <button
            onClick={handleAddVendor}
            className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700"
          >
            + Add Vendor
          </button>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sr.No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Vendor Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Mobile</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">State</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">GST</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Office POC</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                  No vendors found. Click "Add Vendor" to create one.
                </td>
              </tr>
            ) : (
              vendors.map((vendor, index) => (
                <tr key={vendor.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">{vendor.name}</td>
                  <td className="px-4 py-3 text-sm">{vendor.email}</td>
                  <td className="px-4 py-3 text-sm">{vendor.mobile}</td>
                  <td className="px-4 py-3 text-sm">{vendor.state || "-"}</td>
                  <td className="px-4 py-3 text-sm">{vendor.gst_details}</td>
                  <td className="px-4 py-3 text-sm">{vendor.supplier_category || "-"}</td>
                  <td className="px-4 py-3 text-sm">{vendor.office_poc_name}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(vendor)}
                        className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
                        title="Edit"
                      >
                        <MdEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(vendor.id)}
                        className="px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300"
                        title="Delete"
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(newPage) => {
            // Safeguard: Don't allow navigation beyond total pages
            if (newPage < 1 || newPage > totalPages) {
              console.warn(`Invalid page ${newPage}. Total pages: ${totalPages}`);
              return;
            }
            
            const hasAnyFilter = filters && Object.values(filters).some(
              v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
            );
            hasAnyFilter ? filterVendors(filters, newPage) : fetchVendors(newPage);
          }}

          totalItems={totalCount}
          showInfo={true}
          size="md"
          variant="default"
        />
      </div>


      {/* Add / Edit Vendor Modal */}

      <AddVendorForm
        open={showVendorForm}
        onClose={() => {
          setShowVendorForm(false);
          setEditingVendor(null);
        }}
        base_api={BASE_API}
        vendor={editingVendor}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
