// src/components/inventory/DeliveryChallan.jsx
import { useEffect, useState, useMemo } from "react";
import { MdEdit, MdDelete, MdRemoveRedEye, MdPictureAsPdf } from "react-icons/md";
import Swal from "sweetalert2";
import DeliveryChallanForm from "./DeliveryChallanForm";
import Pagination from "../Pagination";

export default function DeliveryChallan({ base_api, filters }) {

  const [dcList, setDcList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDcForm, setShowDcForm] = useState(false);
  const [editingDc, setEditingDc] = useState(null);
  const [viewingDc, setViewingDc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const PAGE_SIZE = 10;
  const token = useMemo(() => localStorage.getItem("access") || "", []);

  const fetchDC = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', PAGE_SIZE);
      
      // Add filters
      if (filters) {
        if (filters.search) params.append('search', filters.search);
        if (filters.status && filters.status !== 'All') params.append('status', filters.status.toLowerCase());
      }

      const response = await fetch(
        `${base_api}/inventory/delivery-challan/?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await response.json();
      console.log("API Response:", data);
      
      setDcList(data.results || data || []);
      setTotalCount(data.count || (data.results?.length) || 0);
      
      if (data.count) {
        setTotalPages(Math.ceil(data.count / PAGE_SIZE));
      } else if (Array.isArray(data)) {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching delivery challans:", err);
      setDcList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDC(1);
    setCurrentPage(1);
  }, [filters]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Delivery Challan?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${base_api}/inventory/delivery-challan/${id}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        Swal.fire("Deleted!", "Delivery Challan has been deleted.", "success");
        fetchDC(currentPage);
      } else {
        throw new Error("Delete failed");
      }
    } catch (err) {
      console.error("Error deleting delivery challan:", err);
      Swal.fire("Error!", "Failed to delete delivery challan.", "error");
    }
  };

  // View PDF - Open in new tab
  const handleViewPDF = (id) => {
    window.open(
      `${base_api}/inventory/delivery-challan/${id}/pdf/`,
      "_blank"
    );
  };

  // Download PDF
  const handleDownloadPDF = async (id, dcNumber) => {
    try {
      const response = await fetch(
        `${base_api}/inventory/delivery-challan/${id}/pdf/?download=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error("PDF download failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `delivery_challan_${dcNumber || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      Swal.fire("Success!", "PDF downloaded successfully!", "success");
    } catch (err) {
      console.error("Error downloading PDF:", err);
      Swal.fire("Error!", "Failed to download PDF.", "error");
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      'draft': 'bg-gray-100 text-gray-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'dispatched': 'bg-yellow-100 text-yellow-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    const style = statusStyles[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  const openCreateForm = () => {
    console.log("Opening create form");
    setEditingDc(null);
    setViewingDc(null);
    setShowDcForm(true);
  };

  const closeModal = () => {
    setShowDcForm(false);
    setEditingDc(null);
    setViewingDc(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Delivery Challan Management</h2>
          <div className="text-sm text-slate-600">
            {loading ? "Loading..." : `${totalCount} delivery challan(s) found`}
          </div>
        </div>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 transition-colors"
          type="button"
        >
          + Add Delivery Challan
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Sr.No</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">DC Number</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Issue Number</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Dispatch Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Vehicle</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Transporter</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
                    </div>
                  </td>
                </tr>
              ) : dcList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    No Delivery Challans Found
                  </td>
                </tr>
              ) : (
                dcList.map((dc, index) => (
                  <tr key={dc.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{((currentPage - 1) * PAGE_SIZE) + index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium">{dc.dc_number}</td>
                    <td className="px-4 py-3 text-sm">
                      {dc.material_issue_details?.issue_number || dc.issue_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{dc.dispatch_date || '-'}</td>
                    <td className="px-4 py-3 text-sm">{dc.vehicle_number || '-'}</td>
                    <td className="px-4 py-3 text-sm">{dc.transporter_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(dc.status)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        {/* View PDF */}
                        <button
                          onClick={() => handleViewPDF(dc.id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View PDF"
                          type="button"
                        >
                          <MdRemoveRedEye size={18} />
                        </button>

                        {/* Download PDF */}
                        <button
                          onClick={() => handleDownloadPDF(dc.id, dc.dc_number)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Download PDF"
                          type="button"
                        >
                          <MdPictureAsPdf size={18} />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingDc(dc);
                            setViewingDc(null);
                            setShowDcForm(true);
                          }}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Edit"
                          type="button"
                        >
                          <MdEdit size={18} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(dc.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete"
                          type="button"
                        >
                          <MdDelete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && totalPages > 1 && (
          <div className="p-4 border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page);
                fetchDC(page);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal - Updated to use open prop pattern */}
      <DeliveryChallanForm
        open={showDcForm}
        onClose={closeModal}
        onSuccess={() => {
          closeModal();
          fetchDC(currentPage);
        }}
        base_api={base_api}
        dc={editingDc || viewingDc}
      />
    </div>
  );
}