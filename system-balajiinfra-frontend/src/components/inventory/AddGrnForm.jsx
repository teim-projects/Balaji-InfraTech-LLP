import React, { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import axios from "axios";

export default function AddGrnForm({
  open,
  onClose,
  onSuccess,
  base_api,
  grn = null
}) {
  const BASE_API = base_api;

  const [formData, setFormData] = useState({
    purchase_order: "",
    grn_date: "",
    products: [],
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      if (!grn) {
        setFormData({
          purchase_order: "",
          grn_date: new Date().toISOString().split('T')[0], // Today's date
          products: [],
        });
        setSelectedPO(null);
      }
    }
  }, [open, grn]);

  // Fetch purchase orders on modal open
  useEffect(() => {
    if (open) {
      fetchPurchaseOrders();
    }
  }, [open]);

  const fetchPurchaseOrders = async () => {
    try {
      const response = await axios.get(`${BASE_API}/inventory/purchase-orders/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = response.data.results || response.data;
      setPurchaseOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch purchase orders",
      });
    }
  };

  // When PO is selected, load its products
  const handlePOChange = (poId) => {
    const po = purchaseOrders.find(p => p.id === parseInt(poId));
    
    if (po) {
      setSelectedPO(po);
      
      // Initialize products with received/rejected quantities
      const productsWithQty = (po.products || [])
        .filter(p => !p.is_section) // Exclude section headers
        .map(p => ({
          purchase_order_product: p.id,
          description: p.description,
          ordered_quantity: p.quantity,
          uom: p.uom,
          received_quantity: 0,
          rejected_quantity: 0,
        }));

      setFormData(prev => ({
        ...prev,
        purchase_order: poId,
        products: productsWithQty,
      }));
    }
  };

  // Handle product quantity changes
  const handleProductChange = (index, field, value) => {
    const numValue = parseFloat(value) || 0;
    
    setFormData(prev => {
      const updatedProducts = [...prev.products];
      updatedProducts[index] = {
        ...updatedProducts[index],
        [field]: numValue,
      };
      return {
        ...prev,
        products: updatedProducts,
      };
    });
  };

  // Validation
  const validateStep1 = () => {
    if (!formData.purchase_order) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please select a Purchase Order",
      });
      return false;
    }
    if (!formData.grn_date) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please select GRN Date",
      });
      return false;
    }
    if (!formData.products || formData.products.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Selected PO has no products",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    // Check if at least one product has received quantity
    const hasAnyReceived = formData.products.some(p => (p.received_quantity || 0) > 0);
    
    if (!hasAnyReceived) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "At least one product must have received quantity greater than 0",
      });
      return false;
    }

    // Validate rejected <= received for each product
    for (const product of formData.products) {
      const received = product.received_quantity || 0;
      const rejected = product.rejected_quantity || 0;
      
      if (rejected > received) {
        Swal.fire({
          icon: "warning",
          title: "Validation Error",
          text: `"${product.description}" - Rejected quantity (${rejected}) cannot exceed received quantity (${received})`,
        });
        return false;
      }

      // Validate received doesn't exceed ordered
      if (received > product.ordered_quantity) {
        Swal.fire({
          icon: "warning",
          title: "Validation Error",
          text: `"${product.description}" - Received quantity (${received}) cannot exceed ordered quantity (${product.ordered_quantity})`,
        });
        return false;
      }
    }

    return true;
  };

  // Navigation
  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (!validateStep2()) {
      return;
    }

    setLoading(true);

    try {
      // Filter products with received quantity > 0
      const productsToSend = formData.products
        .filter(p => (p.received_quantity || 0) > 0)
        .map(p => ({
          purchase_order_product: p.purchase_order_product,
          received_quantity: p.received_quantity || 0,
          rejected_quantity: p.rejected_quantity || 0,
        }));

      const payload = {
        purchase_order: parseInt(formData.purchase_order),
        grn_date: formData.grn_date,
        products: productsToSend,
      };

      console.log("GRN Payload:", payload);

      const url = grn
        ? `${BASE_API}/inventory/grn/${grn.id}/`
        : `${BASE_API}/inventory/grn/`;

      const method = grn ? "put" : "post";

      const response = await axios({
        method,
        url,
        data: payload,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      console.log("GRN Response:", response.data);

      Swal.fire({
        icon: "success",
        title: grn ? "GRN Updated" : "GRN Created",
        text: `GRN ${response.data.grn_no || ""} ${grn ? "updated" : "created"} successfully! Inventory has been updated.`,
        timer: 2000,
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error saving GRN:", error);
      console.error("Error response:", error.response);
      console.error("Error data:", error.response?.data);
      
      let errorMessage = "Failed to save GRN";
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          // HTML error page
          errorMessage = "Server error occurred. Check console for details.";
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.products) {
          errorMessage = `Products error: ${JSON.stringify(error.response.data.products)}`;
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
      }
      
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {grn ? "Edit GRN" : "Create GRN"}
            </h2>
            <button
              onClick={onClose}
              className="text-2xl font-bold text-gray-500 hover:text-red-500 transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? "text-blue-600" : "text-gray-400"}`}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                1
              </div>
              <span className="ml-2 font-medium">Select PO</span>
            </div>
            
            <div className={`w-12 h-1 ${step >= 2 ? "bg-blue-600" : "bg-gray-200"}`}></div>
            
            <div className={`flex items-center ${step >= 2 ? "text-blue-600" : "text-gray-400"}`}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                2
              </div>
              <span className="ml-2 font-medium">Receive Items</span>
            </div>
            
            <div className={`w-12 h-1 ${step >= 3 ? "bg-blue-600" : "bg-gray-200"}`}></div>
            
            <div className={`flex items-center ${step >= 3 ? "text-blue-600" : "text-gray-400"}`}>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= 3 ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                3
              </div>
              <span className="ml-2 font-medium">Review</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: Select Purchase Order */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purchase Order <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.purchase_order}
                  onChange={(e) => handlePOChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={grn !== null}
                >
                  <option value="">Select Purchase Order</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.purchase_order_no} - {po.vendor_name} - ₹{po.grand_total}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GRN Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.grn_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, grn_date: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* PO Details Preview */}
              {selectedPO && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Purchase Order Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">PO Number:</span>
                      <span className="ml-2 font-medium">{selectedPO.purchase_order_no}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Vendor:</span>
                      <span className="ml-2 font-medium">{selectedPO.vendor_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">PO Date:</span>
                      <span className="ml-2 font-medium">{selectedPO.po_date}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Items:</span>
                      <span className="ml-2 font-medium">{formData.products.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Enter Received Quantities */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <p className="text-yellow-800">
                  ℹ️ <strong>Note:</strong> Enter received and rejected quantities. Accepted quantity = Received - Rejected
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left">Sr</th>
                      <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Ordered</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">UOM</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Received *</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Rejected</th>
                      <th className="border border-gray-300 px-3 py-2 text-center bg-green-50">Accepted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.products.map((product, index) => {
                      const accepted = (product.received_quantity || 0) - (product.rejected_quantity || 0);
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 text-center">{index + 1}</td>
                          <td className="border border-gray-300 px-3 py-2">{product.description}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                            {product.ordered_quantity}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{product.uom}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.received_quantity || 0}
                              onChange={(e) => handleProductChange(index, "received_quantity", e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={product.rejected_quantity || 0}
                              onChange={(e) => handleProductChange(index, "rejected_quantity", e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center bg-green-50 font-semibold">
                            {accepted >= 0 ? accepted : 0}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">GRN Summary</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">Purchase Order:</span>
                    <p className="text-gray-900 mt-1">{selectedPO?.purchase_order_no}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Vendor:</span>
                    <p className="text-gray-900 mt-1">{selectedPO?.vendor_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">GRN Date:</span>
                    <p className="text-gray-900 mt-1">{formData.grn_date}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Total Items:</span>
                    <p className="text-gray-900 mt-1">{formData.products.filter(p => p.received_quantity > 0).length}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Items Summary</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-left">Description</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Ordered</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Received</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Rejected</th>
                        <th className="border border-gray-300 px-3 py-2 text-center bg-green-50">Accepted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.products
                        .filter(p => p.received_quantity > 0)
                        .map((product, index) => {
                          const accepted = product.received_quantity - product.rejected_quantity;
                          return (
                            <tr key={index}>
                              <td className="border border-gray-300 px-3 py-2">{product.description}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center">{product.ordered_quantity}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center">{product.received_quantity}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center">{product.rejected_quantity}</td>
                              <td className="border border-gray-300 px-3 py-2 text-center bg-green-50 font-semibold">
                                {accepted}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  ✅ <strong>Note:</strong> After creating this GRN, inventory will be automatically updated with the accepted quantities.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-between rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition"
              >
                ← Back
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : grn ? "Update GRN" : "✓ Create GRN"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
