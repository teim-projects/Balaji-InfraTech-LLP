import { useState, useEffect, useMemo } from "react";
import { MdEdit, MdDelete } from "react-icons/md";
import Swal from "sweetalert2";
import AddBranchForm from "./AddBranchForm";
import Pagination from "../Pagination";

export default function Branch({ base_api, filters }) {
  const BASE_API = base_api;

  // State for branches list
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10; // Items per page


  // Modal state
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  // Fetch branches from API with pagination / GET
  const fetchBranches = async (page = 1) => {
    setLoading(true);
    try {
      // Note: Update this URL when backend is ready
      const response = await fetch(`${BASE_API}/auth/branch/?page=${page}`, {
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
        setBranches(data.results);
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
        setBranches(data);
        setTotalCount(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      }

    } catch (error) {
      console.error("Error fetching branches:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch branches"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter branches with search
  const filterBranches = async (filterValues = {}, page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page);

      // Add search parameter if exists
      if (filterValues.search && filterValues.search.trim()) {
        params.set("search", filterValues.search);
      }

      const url = `${BASE_API}/auth/branch/?${params.toString()}`;
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
        setBranches(data.results);
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
        setBranches(data);
        setTotalCount(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      }

    } catch (error) {
      console.error("Error filtering branches:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to filter branches"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches on mount and when filters change
  useEffect(() => {
    const hasAnyFilter = filters && Object.values(filters).some(
      v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
    );

    if (hasAnyFilter) {
      filterBranches(filters, 1);
    } else {
      fetchBranches(1);
    }
  }, [filters]);

  // Handle delete branch
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete branch?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_API}/auth/branch/${id}/`, {
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
        text: "Branch deleted successfully",
        timer: 1500,
        showConfirmButton: false
      });

      // Refresh branch list with current filters
      const hasAnyFilter = filters && Object.values(filters).some(
        v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
      );
      hasAnyFilter ? filterBranches(filters, currentPage) : fetchBranches(currentPage);

    } catch (error) {
      console.error("Error deleting branch:", error);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: error.message || "Failed to delete branch"
      });
    }
  };

  // Handle edit branch
  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setShowBranchForm(true);
  };

  // Handle add branch button
  const handleAddBranch = () => {
    setEditingBranch(null);
    setShowBranchForm(true);
  };

  // Handle form success (after add/edit)
  const handleFormSuccess = (data) => {
    console.log("Branch saved:", data);
    
    // After adding a new branch, calculate which page it should be on
    if (!editingBranch) {
      // This is a new branch (not editing)
      const newTotalCount = totalCount + 1;
      const lastPage = Math.ceil(newTotalCount / PAGE_SIZE);
      
      // Navigate to the last page where the new item will be
      const hasAnyFilter = filters && Object.values(filters).some(
        v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
      );
      hasAnyFilter ? filterBranches(filters, lastPage) : fetchBranches(lastPage);
    } else {
      // Editing existing branch, stay on current page
      const hasAnyFilter = filters && Object.values(filters).some(
        v => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)
      );
      hasAnyFilter ? filterBranches(filters, currentPage) : fetchBranches(currentPage);
    }
    
    setEditingBranch(null);
  };


  return (
    <div className="space-y-6">

      {/* Header Section */}
      <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Branch Management</h2>
          <div className="text-sm text-slate-600">
            {loading ? "Loading..." : `${totalCount} branch(es) found`}
          </div>
        </div>
        <div>
          <button
            onClick={handleAddBranch}
            className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700"
          >
            + Add Branch
          </button>
        </div>
      </div>

      {/* Branches Table */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sr.No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Branch Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Primary Contact</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">City</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">State</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">GST No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">PAN</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">MSME No</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Head Office</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-4 py-8 text-center text-slate-500">
                  No branches found. Click "Add Branch" to create one.
                </td>
              </tr>
            ) : (
              branches.map((branch, index) => (
                <tr key={branch.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">{branch.name}</td>
                  <td className="px-4 py-3 text-sm">{branch.email}</td>
                  <td className="px-4 py-3 text-sm">{branch.primary_contact}</td>
                  <td className="px-4 py-3 text-sm">{branch.city}</td>
                  <td className="px-4 py-3 text-sm">{branch.state}</td>
                  <td className="px-4 py-3 text-sm">{branch.gst_no || "-"}</td>
                  <td className="px-4 py-3 text-sm">{branch.company_pan || "-"}</td>
                  <td className="px-4 py-3 text-sm">{branch.msme_number || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    {branch.is_head_office ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Yes</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(branch)}
                        className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
                        title="Edit"
                      >
                        <MdEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(branch.id)}
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
            hasAnyFilter ? filterBranches(filters, newPage) : fetchBranches(newPage);
          }}
          totalItems={totalCount}
          showInfo={true}
          size="md"
          variant="defualt"
        />
      </div>

      {/* Add / Edit Branch Modal */}
      <AddBranchForm
        open={showBranchForm}
        onClose={() => {
          setShowBranchForm(false);
          setEditingBranch(null);
        }}
        base_api={BASE_API}
        branch={editingBranch}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
