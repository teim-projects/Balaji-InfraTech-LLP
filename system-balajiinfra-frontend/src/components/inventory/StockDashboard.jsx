import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";

export default function StockDashboard({ base_api, filters }) {
  const BASE_API = base_api;

  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stockStats, setStockStats] = useState({
    totalItems: 0,
    lowStock: 0,
    outOfStock: 0,
    inStock: 0,
  });

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  const LOW_STOCK_THRESHOLD = 10; // Items with quantity <= 10 are considered low stock

  const fetchStockItems = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page);

      // Add search filter if exists
      if (filters?.search) {
        params.set("search", filters.search);
      }

      const response = await axios.get(
        `${BASE_API}/inventory/inventory/?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      console.log("API RESPONSE:", response.data);

      const data = response.data;
      const results = data.results || data;

      setStockItems(Array.isArray(results) ? results : []);
      setTotalCount(data.count || results.length);
      setTotalPages(data.total_pages || Math.ceil((data.count || results.length) / 10));
      setCurrentPage(page);

      // Calculate stats
      calculateStats(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error("Error fetching stock items:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch stock items",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (items) => {
    const stats = {
      totalItems: items.length,
      lowStock: 0,
      outOfStock: 0,
      inStock: 0,
    };

    items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      if (qty === 0) {
        stats.outOfStock++;
      } else if (qty <= LOW_STOCK_THRESHOLD) {
        stats.lowStock++;
      } else {
        stats.inStock++;
      }
    });

    setStockStats(stats);
  };

  useEffect(() => {
    fetchStockItems(currentPage);
  }, [currentPage, filters]);

  const getStockStatus = (quantity) => {
    const qty = parseFloat(quantity) || 0;
    if (qty === 0) {
      return { label: "Out of Stock", color: "bg-red-100 text-red-800" };
    } else if (qty <= LOW_STOCK_THRESHOLD) {
      return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800" };
    } else {
      return { label: "In Stock", color: "bg-green-100 text-green-800" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Items</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{totalCount}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">In Stock</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stockStats.inStock}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Low Stock</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stockStats.lowStock}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Out of Stock</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stockStats.outOfStock}</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Stock Inventory</h2>
            <p className="text-sm text-gray-600 mt-1">
              {totalCount} item(s) • Page {currentPage} of {totalPages}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => fetchStockItems(currentPage)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-3 text-left">Sr.No</th>
                <th className="border border-gray-300 px-4 py-3 text-left">Item Code/SKU</th>
                <th className="border border-gray-300 px-4 py-3 text-left">Item Type</th>
                <th className="border border-gray-300 px-4 py-3 text-center">Opening Stock</th>
                <th className="border border-gray-300 px-4 py-3 text-center">Closing Stock</th>
                <th className="border border-gray-300 px-4 py-3 text-center">Existing Stock</th>
                <th className="border border-gray-300 px-4 py-3 text-center">UOM</th>
                <th className="border border-gray-300 px-4 py-3 text-center">Status</th>
                <th className="border border-gray-300 px-4 py-3 text-center">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    Loading stock items...
                  </td>
                </tr>
              ) : stockItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    No stock items found.
                  </td>
                </tr>
              ) : (
                stockItems.map((item, index) => {
                  const status = getStockStatus(item.quantity);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-3">
                        {(currentPage - 1) * 10 + index + 1}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 font-semibold text-blue-600">
                        {item.display_name || item.item_name || item.product_variant_name || "N/A"}
                      </td>
                      <td className="border border-gray-300 px-4 py-3">
                        {item.product_variant ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            High Side
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            Low Side
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center font-semibold text-green-600">
                        {parseFloat(item.total_in_quantity || 0).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center font-semibold text-red-600">
                        {parseFloat(item.total_out_quantity || 0).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center font-bold text-lg text-blue-700">
                        {parseFloat(item.quantity).toFixed(2)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        {item.uom || "-"}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-gray-600">
                        {new Date(item.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
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
      </div>

      {/* Low Stock Alert */}
      {stockStats.lowStock > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> {stockStats.lowStock} item(s) are running low on stock. Consider reordering soon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Out of Stock Alert */}
      {stockStats.outOfStock > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <strong>Alert:</strong> {stockStats.outOfStock} item(s) are out of stock. Immediate action required!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
