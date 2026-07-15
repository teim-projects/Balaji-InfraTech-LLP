import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MdEdit, MdDelete, MdCheckCircle } from "react-icons/md";
import Swal from "sweetalert2";
import AddGrnForm from "./AddGrnForm";
import TableView from "../TableView";
import axios from "axios";

export default function GRN({ base_api, filters }) {
  const BASE_API = base_api;

  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showGrnForm, setShowGrnForm] = useState(false);
  const [editingGrn, setEditingGrn] = useState(null);
  const PAGE_SIZE = 10;

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  // Build query string from current page + filters
  const buildUrl = useCallback((page, f = {}) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (f.search) params.set("search", f.search);
    return `${BASE_API}/inventory/grn/?${params.toString()}`;
  }, [BASE_API]);

  const fetchGrns = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.get(buildUrl(page, filters), {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = response.data;
      if (data.results) {
        setGrns(data.results);
        setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE));
        setCurrentPage(page);
      } else {
        setGrns(data);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching GRNs:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch GRNs",
      });
    } finally {
      setLoading(false);
    }
  }, [BASE_API, token, filters, buildUrl]);

  // Single source-of-truth effect:
  // Re-fetch whenever filters OR currentPage changes.
  // When filters change, reset to page 1 first.
  useEffect(() => {
    fetchGrns(currentPage);
  }, [fetchGrns, currentPage]);

  // When filters change, reset page to 1 (fetchGrns fires via fetchGrns dep change above)
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleEdit = (grn) => {
    if (grn.is_completed) {
      Swal.fire({
        icon: "error",
        title: "Cannot Edit",
        text: "Cannot edit completed GRN. Inventory has already been updated.",
      });
      return;
    }
    setEditingGrn(grn);
    setShowGrnForm(true);
  };

  const handleDelete = async (id) => {
    const grn = grns.find(g => g.id === id);
    
    if (grn?.is_completed) {
      Swal.fire({
        icon: "error",
        title: "Cannot Delete",
        text: "Cannot delete completed GRN. Inventory has already been updated.",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Delete GRN?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(`${BASE_API}/inventory/grn/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "GRN deleted successfully",
        timer: 1500,
      });

      fetchGrns(currentPage);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.error || error.response?.data?.detail || "Failed to delete GRN",
      });
    }
  };

  const handleComplete = async (id) => {
    const confirm = await Swal.fire({
      title: "Complete GRN?",
      text: "This will update inventory and cannot be undone",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Complete",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.post(
        `${BASE_API}/inventory/grn/${id}/complete/`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Completed",
        text: "GRN completed successfully! Inventory has been updated.",
        timer: 2000,
      });

      fetchGrns(currentPage);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.error || error.response?.data?.detail || "Failed to complete GRN",
      });
    }
  };

  const columns = [
    {
      key: "sr_no",
      label: "Sr. No.",
      render: (row, index) => (currentPage - 1) * PAGE_SIZE + index + 1,
    },
    { 
      key: "grn_no", 
      label: "GRN No",
      render: (row) => row.grn_no || "N/A",
    },
    {
      key: "purchase_order_no",
      label: "PO Number",
      render: (row) => row.purchase_order_no || "N/A",
    },
    {
      key: "vendor_name",
      label: "Vendor",
      render: (row) => row.vendor_name || "N/A",
    },
    { 
      key: "grn_date", 
      label: "GRN Date",
      render: (row) => row.grn_date || "N/A",
    },
    {
      key: "is_completed",
      label: "Status",
      render: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-semibold ${
          row.is_completed
            ? "bg-green-100 text-green-800"
            : "bg-yellow-100 text-yellow-800"
        }`}>
          {row.is_completed ? "✓ Completed" : "⏳ Pending"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">GRNs</h2>
        <button
          onClick={() => {
            setEditingGrn(null);
            setShowGrnForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Create GRN
        </button>
      </div>

      <TableView
        columns={columns}
        rows={grns}
        loading={loading}
        page={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        actions={(row) => (
          <div className="flex gap-2">
            {!row.is_completed && (
              <>
                <button
                  onClick={() => handleEdit(row)}
                  className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300 transition"
                  title="Edit"
                >
                  <MdEdit size={18} />
                </button>
                <button
                  onClick={() => handleComplete(row.id)}
                  className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300 transition"
                  title="Complete GRN"
                >
                  <MdCheckCircle size={18} />
                </button>
              </>
            )}
            <button
              onClick={() => handleDelete(row.id)}
              className={`px-2 py-1 rounded transition ${
                row.is_completed
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-red-200 text-red-800 hover:bg-red-300"
              }`}
              title={row.is_completed ? "Cannot delete completed GRN" : "Delete"}
              disabled={row.is_completed}
            >
              <MdDelete size={18} />
            </button>
          </div>
        )}
        emptyMessage="No GRNs found"
      />

      <AddGrnForm
        open={showGrnForm}
        onClose={() => setShowGrnForm(false)}
        base_api={BASE_API}
        grn={editingGrn}
        onSuccess={() => fetchGrns(currentPage)}
        token={token}
      />
    </div>
  );
}