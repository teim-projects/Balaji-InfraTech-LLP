import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import AddMaterialReturnForm from "./AddMaterialReturnForm";
import Swal from "sweetalert2";

export default function MaterialReturn({ base_api }) {
  const BASE_API = base_api;

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  const fetchReturns = async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${BASE_API}/inventory/material-returns/?page=${page}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = response.data;
      const results = data.results || data;

      setReturns(Array.isArray(results) ? results : []);
      setTotalCount(data.count || results.length);
      setTotalPages(data.total_pages || Math.ceil((data.count || results.length) / 10));
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching material returns:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch material returns",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns(currentPage);
  }, [currentPage]);

  const handleComplete = async (returnId) => {
    const confirm = await Swal.fire({
      title: "Complete Material Return?",
      text: "This will update the inventory. This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Complete It",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.post(
        `${BASE_API}/inventory/material-returns/${returnId}/complete/`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Completed!",
        text: "Material return completed and inventory updated.",
        timer: 2000,
      });

      fetchReturns(currentPage);
    } catch (error) {
      console.error("Error completing material return:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.error || "Failed to complete material return",
      });
    }
  };

  const handleDelete = async (returnId) => {
    const confirm = await Swal.fire({
      title: "Delete Material Return?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete It",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(`${BASE_API}/inventory/material-returns/${returnId}/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Material return deleted successfully.",
        timer: 2000,
      });

      fetchReturns(currentPage);
    } catch (error) {
      console.error("Error deleting material return:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete material return",
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Material Return Notes (MRN)</h2>
          <p className="text-sm text-gray-600 mt-1">
            {totalCount} return note(s) • Page {currentPage} of {totalPages}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
        >
          <span className="text-xl">+</span>
          Create MRN
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-3 text-left">Sr.No</th>
              <th className="border border-gray-300 px-4 py-3 text-left">Return Number</th>
              <th className="border border-gray-300 px-4 py-3 text-left">Issue Number</th>
              <th className="border border-gray-300 px-4 py-3 text-left">Return Date</th>
              <th className="border border-gray-300 px-4 py-3 text-center">Items Count</th>
              <th className="border border-gray-300 px-4 py-3 text-center">Status</th>
              <th className="border border-gray-300 px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  Loading material returns...
                </td>
              </tr>
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  No material returns found. Click "Create MRN" to add one.
                </td>
              </tr>
            ) : (
              returns.map((returnNote, index) => (
                <tr key={returnNote.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3">
                    {(currentPage - 1) * 10 + index + 1}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 font-semibold text-blue-600">
                    {returnNote.return_number}
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    {returnNote.issue_number || "N/A"}
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    {returnNote.return_date}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    {returnNote.items?.length || 0}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    {returnNote.is_completed ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        Completed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <div className="flex gap-2 justify-center">
                      {!returnNote.is_completed && (
                        <button
                          onClick={() => handleComplete(returnNote.id)}
                          className="px-3 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300 transition text-xs font-medium"
                          title="Complete Return"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(returnNote.id)}
                        className="px-3 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300 transition text-xs font-medium"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Add Material Return Modal */}
      <AddMaterialReturnForm
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => fetchReturns(currentPage)}
        base_api={BASE_API}
      />
    </div>
  );
}
