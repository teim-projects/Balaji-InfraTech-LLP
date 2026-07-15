import React, { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import axios from "axios";

export default function AddMaterialReturnForm({
  open,
  onClose,
  onSuccess,
  base_api,
}) {
  const BASE_API = base_api;

  const [formData, setFormData] = useState({
    material_issue: "",
    return_date: new Date().toISOString().split('T')[0],
    items: [],
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [materialIssues, setMaterialIssues] = useState([]);
  const [selectedIssueDetails, setSelectedIssueDetails] = useState(null);

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
      setFormData({
        material_issue: "",
        return_date: new Date().toISOString().split('T')[0],
        items: [],
      });
      setSelectedIssueDetails(null);
    }
  }, [open]);

  // Fetch data on modal open
  useEffect(() => {
    if (open) {
      fetchMaterialIssues();
    }
  }, [open]);

  const fetchMaterialIssues = async () => {
    try {
      const response = await axios.get(`${BASE_API}/inventory/material-issue/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = response.data.results || response.data;
      setMaterialIssues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching material issues:", error);
    }
  };

  const fetchIssueDetails = async (issueId) => {
    try {
      const response = await axios.get(`${BASE_API}/inventory/material-issue/${issueId}/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      setSelectedIssueDetails(response.data);
      
      // Initialize items with issued items
      const items = response.data.items.map(item => ({
        material_issue_item: item.id,
        issued_quantity: item.quantity,
        return_quantity: 0,
        inventory_item_name: item.inventory_item_name || item.display_name || "Unknown Item",
        uom: item.uom,
      }));
      
      setFormData(prev => ({ ...prev, items }));
    } catch (error) {
      console.error("Error fetching issue details:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch material issue details",
      });
    }
  };

  // Handle material issue selection
  const handleIssueChange = (issueId) => {
    setFormData(prev => ({ ...prev, material_issue: issueId, items: [] }));
    if (issueId) {
      fetchIssueDetails(issueId);
    } else {
      setSelectedIssueDetails(null);
    }
  };

  // Update return quantity
  const handleReturnQuantityChange = (index, value) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = {
        ...updatedItems[index],
        return_quantity: parseFloat(value) || 0,
      };
      return { ...prev, items: updatedItems };
    });
  };

  // Validation
  const validateStep1 = () => {
    if (!formData.material_issue) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please select a Material Issue",
      });
      return false;
    }
    if (!formData.return_date) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please select Return Date",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const itemsWithReturn = formData.items.filter(item => item.return_quantity > 0);
    
    if (itemsWithReturn.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please enter return quantity for at least one item",
      });
      return false;
    }

    for (const item of formData.items) {
      if (item.return_quantity > item.issued_quantity) {
        Swal.fire({
          icon: "warning",
          title: "Invalid Quantity",
          text: `Return quantity cannot exceed issued quantity for ${item.inventory_item_name}`,
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
      // Filter items with return quantity > 0
      const itemsToReturn = formData.items
        .filter(item => item.return_quantity > 0)
        .map(item => ({
          material_issue_item: item.material_issue_item,
          quantity: item.return_quantity,
        }));

      const payload = {
        material_issue: parseInt(formData.material_issue),
        return_date: formData.return_date,
        items: itemsToReturn,
      };

      console.log("Material Return Payload:", payload);

      const response = await axios.post(
        `${BASE_API}/inventory/material-returns/`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      console.log("Material Return Response:", response.data);

      Swal.fire({
        icon: "success",
        title: "Material Return Created",
        text: `Material Return ${response.data.return_number || ""} created successfully! Stock has been updated.`,
        timer: 2000,
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error saving Material Return:", error);
      
      let errorMessage = "Failed to create Material Return";
      
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          errorMessage = JSON.stringify(error.response.data);
        } else {
          errorMessage = error.response.data;
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
              Create Material Return Note (MRN)
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
              <span className="ml-2 font-medium">Select Issue</span>
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
              <span className="ml-2 font-medium">Return Items</span>
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
          
          {/* STEP 1: Select Material Issue */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material Issue <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.material_issue}
                    onChange={(e) => handleIssueChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Material Issue</option>
                    {materialIssues.map((issue) => (
                      <option key={issue.id} value={issue.id}>
                        {issue.issue_number} - {issue.issue_type} - {issue.issue_date}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.return_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, return_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Display Issue Details */}
              {selectedIssueDetails && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h3 className="font-semibold text-blue-900 mb-3">Material Issue Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Issue Number:</span>
                      <p className="text-blue-900">{selectedIssueDetails.issue_number}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Issue Type:</span>
                      <p className="text-blue-900 capitalize">{selectedIssueDetails.issue_type}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Branch:</span>
                      <p className="text-blue-900">{selectedIssueDetails.branch_name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Issue Date:</span>
                      <p className="text-blue-900">{selectedIssueDetails.issue_date}</p>
                    </div>
                    {selectedIssueDetails.site_name && (
                      <div>
                        <span className="text-blue-700 font-medium">Site:</span>
                        <p className="text-blue-900">{selectedIssueDetails.site_name}</p>
                      </div>
                    )}
                    {selectedIssueDetails.technician_name && (
                      <div>
                        <span className="text-blue-700 font-medium">Technician:</span>
                        <p className="text-blue-900">{selectedIssueDetails.technician_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Return Items */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Items to Return</h3>
                <p className="text-sm text-gray-600">Enter quantities to return</p>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items found in the selected material issue.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-left">Sr</th>
                        <th className="border border-gray-300 px-3 py-2 text-left">Item</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Issued Qty</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Return Qty *</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">UOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 text-center">{index + 1}</td>
                          <td className="border border-gray-300 px-3 py-2">
                            {item.inventory_item_name}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                            {item.issued_quantity}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.issued_quantity}
                              step="0.01"
                              value={item.return_quantity || 0}
                              onChange={(e) => handleReturnQuantityChange(index, e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center">
                            {item.uom || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="text-yellow-800 text-sm">
                  ℹ️ <strong>Note:</strong> You can return partial quantities. Leave return quantity as 0 for items you don't want to return.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Material Return Summary</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">Material Issue:</span>
                    <p className="text-gray-900 mt-1">
                      {materialIssues.find(i => i.id === parseInt(formData.material_issue))?.issue_number || "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Return Date:</span>
                    <p className="text-gray-900 mt-1">{formData.return_date}</p>
                  </div>
                  {selectedIssueDetails && (
                    <>
                      <div>
                        <span className="text-gray-600 font-medium">Issue Type:</span>
                        <p className="text-gray-900 mt-1 capitalize">{selectedIssueDetails.issue_type}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Branch:</span>
                        <p className="text-gray-900 mt-1">{selectedIssueDetails.branch_name || "N/A"}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Items to Return</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-left">Item</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Issued Qty</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Return Qty</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">UOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items
                        .filter(item => item.return_quantity > 0)
                        .map((item, index) => (
                          <tr key={index}>
                            <td className="border border-gray-300 px-3 py-2">{item.inventory_item_name}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              {item.issued_quantity}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-green-700">
                              {item.return_quantity}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">{item.uom}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  ✓ <strong>Note:</strong> After creating this Material Return, inventory will be automatically increased by the returned quantities.
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
                {loading ? "Creating..." : "✓ Create Material Return"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
