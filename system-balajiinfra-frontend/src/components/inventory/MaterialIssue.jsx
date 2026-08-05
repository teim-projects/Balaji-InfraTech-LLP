import React, { useState, useEffect, useMemo } from "react";
import { MdDelete, MdRemoveRedEye } from "react-icons/md";
import Swal from "sweetalert2";
import AddMaterialIssueForm from "./AddMaterialIssueForm";
import Pagination from "../Pagination";
import axios from "axios";

export default function MaterialIssue({ base_api, filters }) {
  const BASE_API = base_api;

  const [materialIssues, setMaterialIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const PAGE_SIZE = 10;

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  const fetchMaterialIssues = async (page = 1) => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_API}/inventory/material-issue/?page=${page}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = response.data;
      if (data.results) {
        setMaterialIssues(data.results);
        setTotalCount(data.count || 0);
        setTotalPages(Math.ceil((data.count || 0) / PAGE_SIZE));
        setCurrentPage(page);
      } else {
        setMaterialIssues(Array.isArray(data) ? data : []);
        setTotalCount(data.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching material issues:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch material issues",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterialIssues(currentPage);
  }, [currentPage]);

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "Delete Material Issue?",
      text: "This will restore the issued quantities back to inventory",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
    });

    if (!confirm.isConfirmed) return;

    try {
      await axios.delete(`${BASE_API}/inventory/material-issue/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Material Issue deleted successfully",
        timer: 1500,
      });

      fetchMaterialIssues(currentPage);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.error || error.response?.data?.detail || "Failed to delete Material Issue",
      });
    }
  };

  const handleView = (materialIssue) => {
  console.log("=== MATERIAL ISSUE DEBUG ===");
  console.log("Full materialIssue object:", materialIssue);
  console.log("Items array:", materialIssue.items);
  
  // Build items table HTML
  const itemsHTML = materialIssue.items && materialIssue.items.length > 0 
    ? `
      <table class="w-full mt-4 border-collapse text-left text-sm">
        <thead>
          <tr class="bg-gray-200 border">
            <th class="px-3 py-2 border">Sr.No</th>
            <th class="px-3 py-2 border">Item Details</th>
            <th class="px-3 py-2 border">Quantity</th>
            <th class="px-3 py-2 border">UOM</th>
          </tr>
        </thead>
        <tbody>
          ${materialIssue.items.map((item, index) => {
            // Use display_name or inventory_item_name (these exist!)
            const itemName = item.display_name || item.inventory_item_name || 'Unknown';
            console.log(`Item ${index} name:`, itemName);
            return `
              <tr class="border hover:bg-gray-50">
                <td class="px-3 py-2 border">${index + 1}</td>
                <td class="px-3 py-2 border font-medium">${itemName}</td>
                <td class="px-3 py-2 border text-center font-semibold">${item.quantity || 0}</td>
                <td class="px-3 py-2 border">${item.uom || '-'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `
    : '<p class="text-gray-500 italic mt-2">No items issued</p>';

  Swal.fire({
    title: `Material Issue: ${materialIssue.issue_number}`,
    html: `
      <div class="text-left max-h-96 overflow-y-auto">
        <div class="space-y-2 mb-4">
          <p><strong>Issue Type:</strong> <span class="capitalize">${materialIssue.issue_type}</span></p>
          <p><strong>Issue Date:</strong> ${materialIssue.issue_date}</p>
          <p><strong>Branch:</strong> ${materialIssue.branch_name || '-'}</p>
          <p><strong>Site:</strong> ${materialIssue.site_name || '-'}</p>
          <p><strong>Technician:</strong> ${materialIssue.technician_name || '-'}</p>
        </div>
        <hr class="my-3">
        <p class="font-semibold mb-2">Items Issued (${materialIssue.items?.length || 0}):</p>
        ${itemsHTML}
      </div>
    `,
    icon: "info",
    confirmButtonText: "Close",
    width: 750,
  });
};


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Material Issue Management</h2>
          <div className="text-sm text-slate-600">
            {loading ? "Loading..." : `${totalCount} material issue(s) found`}
          </div>
        </div>
        <div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700"
          >
            + Create Material Issue
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sr.No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Issue Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Issue Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Issue Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Total Items</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {materialIssues.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                  No material issues found. Click "Create Material Issue" to create one.
                </td>
              </tr>
            ) : (
              materialIssues.map((issue, index) => (
                <tr key={issue.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">{issue.issue_number || "-"}</td>
                  <td className="px-4 py-3 text-sm capitalize">{issue.issue_type || "-"}</td>
                  <td className="px-4 py-3 text-sm">{issue.issue_date || "-"}</td>
                  <td className="px-4 py-3 text-sm">{issue.items?.length || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleView(issue)}
                        className="px-2 py-1 bg-blue-200 text-blue-800 rounded hover:bg-blue-300"
                        title="View"
                      >
                        <MdRemoveRedEye />
                      </button>
                      <button
                        onClick={() => handleDelete(issue.id)}
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
          onPageChange={setCurrentPage}
          totalItems={totalCount}
          showInfo={true}
          size="md"
          variant="default"
        />
      </div>

      {/* Form Modal */}
      <AddMaterialIssueForm
        open={showForm}
        onClose={() => setShowForm(false)}
        base_api={BASE_API}
        onSuccess={() => fetchMaterialIssues(currentPage)}
      />
    </div>
  );
}
