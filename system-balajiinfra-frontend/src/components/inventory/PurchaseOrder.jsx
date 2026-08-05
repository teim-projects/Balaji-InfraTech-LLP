import { useState, useEffect, useMemo, Fragment } from "react";
import { MdEdit, MdDelete, MdRemoveRedEye, MdDownload, MdHistory, MdEmail } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import Swal from "sweetalert2";
import AddPoFrom from "./AddPoFrom";
import Pagination from "../Pagination";

export default function PurchaseOrder({ base_api, filters }) {
  const BASE_API = base_api;

  // State for sites list
  const [po, setPo] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

  // Modal state
  const [showPoForm, setShowPoForm] = useState(false);
  const [editingPo, setEditingPo] = useState(null);

  // Version history state
  const [expandedPO, setExpandedPO] = useState(null); // stores purchase_order_no of expanded PO
  const [versionHistory, setVersionHistory] = useState({}); // stores version data: { "PO-001": [...versions] }
  const [loadingVersions, setLoadingVersions] = useState(false);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  // Fetch purchase orders with pagination
  const fetchPO = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_API}/inventory/purchase-orders/?page=${page}`, {
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
        setPo(data.results);
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
        setPo(data);
        setTotalCount(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      }

    } catch (error) {
      console.error("Error fetching purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter purchase orders with search
  const filterPO = async (page = 1) => {
    setLoading(true);
    try {
      let url = `${BASE_API}/inventory/purchase-orders/?page=${page}`;

      // Add search parameter if filter exists
      if (filters?.search) {
        url += `&search=${encodeURIComponent(filters.search)}`;
      }

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
        setPo(data.results);
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
        setPo(data);
        setTotalCount(data.length);
        setTotalPages(1);
        setCurrentPage(1);
      }

    } catch (error) {
      console.error("Error filtering purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch POs on component mount and when filters change
  useEffect(() => {
    if (filters && Object.keys(filters).length > 0) {
      filterPO(1);
    } else {
      fetchPO(1);
    }
  }, [filters]);

  // Fetch version history for a specific PO
  const fetchVersionHistory = async (purchase_order_no) => {
    setLoadingVersions(true);
    console.log("Fetching version history for:", purchase_order_no);
    console.log("API URL:", `${BASE_API}/inventory/purchase-orders-history/?purchase_order_no=${purchase_order_no}`);

    try {
      const response = await fetch(
        `${BASE_API}/inventory/purchase-orders-history/?purchase_order_no=${purchase_order_no}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Version history response:", data);

      // Extract results array from paginated response
      const versions = data.results || data;
      console.log("Data length:", versions?.length);

      // Reverse to show ascending order (oldest first)
      const sortedVersions = [...versions].reverse();

      // Store version history in state
      setVersionHistory(prev => ({
        ...prev,
        [purchase_order_no]: sortedVersions
      }));


    } catch (error) {
      console.error("Error fetching version history:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to load version history",
        text: error.message
      });
    } finally {
      setLoadingVersions(false);
    }
  };

  // Handle delete site
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete purchase order?",
      text: "This action cannot be undone",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      // Note: Update this URL when backend is ready
      const response = await fetch(`${BASE_API}/inventory/purchase-orders/${id}/`, {
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
        text: "Purchase Order deleted successfully",
        timer: 1500,
        showConfirmButton: false
      });

      // Refresh PO list with current filters
      if (filters && Object.keys(filters).length > 0) {
        filterPO(currentPage);
      } else {
        fetchPO(currentPage);
      }
    } catch (error) {
      console.error("Error deleting site:", error);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: error.message || "Failed to delete site"
      });
    }
  };

  // Handle delete version history
  const handleDeleteVersion = async (versionId) => {
    const result = await Swal.fire({
      title: "Delete this version?",
      text: "This will delete only this specific version",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_API}/inventory/purchase-orders-history/${versionId}/`, {
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
        text: "Version deleted successfully",
        timer: 1500,
        showConfirmButton: false
      });

      // Refresh PO list and clear version history cache
      if (filters && Object.keys(filters).length > 0) {
        filterPO(currentPage);
      } else {
        fetchPO(currentPage);
      }
      setExpandedPO(null);
      setVersionHistory({});
    } catch (error) {
      console.error("Error deleting version:", error);
      Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: error.message || "Failed to delete version"
      });
    }
  };

  // Handle edit site
  const handleEdit = (po) => {
    setEditingPo(po);
    setShowPoForm(true);
  };

  // Handle add site button
  const handleAddPo = () => {
    // console.log("Add PO clicked");
    setEditingPo(null);
    setShowPoForm(true);
  };

  // Handle form success (after add/edit)
  const handleFormSuccess = (data) => {
    console.log("Purchase Order saved:", data);
    // Refresh PO list with current filters
    if (filters && Object.keys(filters).length > 0) {
      filterPO(1);
    } else {
      fetchPO(1);
    }
    setEditingPo(null);
  };
  // Handle version history - toggle expand/collapse
  const handleVersion = async (purchase_order_no) => {
    // If already expanded, collapse it
    if (expandedPO === purchase_order_no) {
      setExpandedPO(null);
      return;
    }

    // Expand and fetch version history if not already fetched
    setExpandedPO(purchase_order_no);

    if (!versionHistory[purchase_order_no]) {
      await fetchVersionHistory(purchase_order_no);
    }
  };

  // Handle view PO
  const handleView = (id) => {
    window.open(`${BASE_API}/inventory/purchase-order/${id}/pdf/`, "_blank");
  };

  const handleDownload = (id) => {
    window.open(`${BASE_API}/inventory/purchase-order/${id}/pdf/?download=1`);
  };

  // Handle WhatsApp share
  const handleWhatsapp = (id) => {
    console.log("Share via WhatsApp:", id);
    // TODO: Implement WhatsApp share
  };

  // Handle email
  const handleEmail = (id) => {
    console.log("Send email:", id);
    // TODO: Implement email functionality
  };


  return (
    <div className="space-y-6">

      {/* Header Section */}
      <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Purchase Order Management</h2>
          <div className="text-sm text-slate-600">
            {loading ? "Loading..." : `${totalCount} purchase order(s) found`}
          </div>
        </div>
        <div>
          <button
            onClick={handleAddPo}
            className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700"
          >
            + Add Purchase Order
          </button>
        </div>
      </div>

      {/* Sites Table */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sr.No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Vendor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Site</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">PO Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">PO Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Contact Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Contact No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Grand Total</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {po.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-slate-500">
                  No purchase orders found. Click "Add Purchase Order" to create one.
                </td>
              </tr>
            ) : (
              po.map((order, index) => (
                <Fragment key={order.id}>
                  {/* Main PO Row */}
                  <tr className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium">{order.vendor_name || "-"}</td>
                    <td className="px-4 py-3 text-sm">{order.site_name || "-"}</td>
                    <td className="px-4 py-3 text-sm">{order.po_date || "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      {order.purchase_order_no ? `${order.purchase_order_no} (v${order.version || 1})` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">{order.contact_name || "-"}</td>
                    <td className="px-4 py-3 text-sm">{order.contact_no || "-"}</td>
                    <td className="px-4 py-3 text-sm">₹{order.grand_total || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleVersion(order.purchase_order_no)}
                          className={`px-2 py-1 rounded hover:bg-purple-300 ${expandedPO === order.purchase_order_no
                            ? "bg-purple-400 text-purple-900"
                            : "bg-purple-200 text-purple-800"
                            }`}
                          title="Version History"
                        >
                          <MdHistory />
                        </button>
                        <button
                          onClick={() => handleView(order.id)}
                          className="px-2 py-1 bg-blue-200 text-blue-800 rounded hover:bg-blue-300"
                          title="View"
                        >
                          <MdRemoveRedEye />
                        </button>
                        <button
                          onClick={() => handleEdit(order)}
                          className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
                          title="Edit"
                        >
                          <MdEdit />
                        </button>
                        <button
                          onClick={() => handleDownload(order.id)}
                          className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300"
                          title="Download"
                        >
                          <MdDownload />
                        </button>
                        <button
                          onClick={() => handleWhatsapp(order.id)}
                          className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300"
                          title="WhatsApp"
                        >
                          <FaWhatsapp />
                        </button>
                        <button
                          onClick={() => handleEmail(order.id)}
                          className="px-2 py-1 bg-sky-200 text-sky-800 rounded hover:bg-sky-300"
                          title="Email"
                        >
                          <MdEmail />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300"
                          title="Delete"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Version History Sub-rows */}
                  {expandedPO === order.purchase_order_no && (
                    <>
                      {loadingVersions ? (
                        <tr>
                          <td colSpan="9" className="px-4 py-3 text-center text-sm text-slate-500 bg-slate-50">
                            Loading version history...
                          </td>
                        </tr>
                      ) : versionHistory[order.purchase_order_no]?.length > 0 ? (
                        versionHistory[order.purchase_order_no].map((version, vIndex) => (
                          <tr key={version.id} className="bg-slate-50 border-b border-slate-200">
                            <td className="px-4 py-3 text-sm pl-8">
                              <span className="text-slate-500"> {index + 1}.{version.version}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{version.vendor_name || "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{version.site_name || "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {new Date(version.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {version.purchase_order_no ? `${version.purchase_order_no} (v${version.version || 1})` : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{version.contact_name || "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{version.contact_no || "-"}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">₹{version.grand_total || 0}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleView(version.id)}
                                  className="px-2 py-1 bg-blue-200 text-blue-800 rounded hover:bg-blue-300"
                                  title="View"
                                >
                                  <MdRemoveRedEye />
                                </button>
                                <button
                                  onClick={() => handleDownload(version.id)}
                                  className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300"
                                  title="Download"
                                >
                                  <MdDownload />
                                </button>
                                <button
                                  onClick={() => handleWhatsapp(version.id)}
                                  className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300"
                                  title="WhatsApp"
                                >
                                  <FaWhatsapp />
                                </button>
                                <button
                                  onClick={() => handleEmail(version.id)}
                                  className="px-2 py-1 bg-sky-200 text-sky-800 rounded hover:bg-sky-300"
                                  title="Email"
                                >
                                  <MdEmail />
                                </button>
                                {!version.is_current && (
                                  <button
                                    onClick={() => handleDeleteVersion(version.id)}
                                    className="px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300"
                                    title="Delete"
                                  >
                                    <MdDelete />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="px-4 py-3 text-center text-sm text-slate-500 bg-slate-50">
                            No version history found
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </Fragment>
              ))
            )}
          </tbody>

        </table>
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            // Safeguard: Don't allow navigation beyond total pages
            if (page < 1 || page > totalPages) {
              console.warn(`Invalid page ${page}. Total pages: ${totalPages}`);
              return;
            }
            
            if (filters && Object.keys(filters).length > 0) {
              filterPO(page);
            } else {
              fetchPO(page);
            }
          }}
          totalItems={totalCount}
          showInfo={true}
          size="md"
          variant="default"
        />
      </div>

      {/* Add / Edit Site Modal */}
      <AddPoFrom
        open={showPoForm}
        onClose={() => {
          setShowPoForm(false);
          setEditingPo(null);
        }}
        baseApi={BASE_API}
        po={editingPo}
        onSuccess={handleFormSuccess}
        token={token}
      />
    </div>
  );
}
