import React, { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import axios from "axios";

export default function AddMaterialIssueForm({
  open,
  onClose,
  onSuccess,
  base_api,
  materialIssue = null
}) {
  const BASE_API = base_api;

  const [formData, setFormData] = useState({
    issue_type: "site",
    branch: "",
    site: "",
    technician: "",
    issue_date: new Date().toISOString().split('T')[0],
    items: [],
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState([]);
  const [sites, setSites] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [inventory, setInventory] = useState([]);

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
      if (!materialIssue) {
        setFormData({
          issue_type: "site",
          branch: "",
          site: "",
          technician: "",
          issue_date: new Date().toISOString().split('T')[0],
          items: [],
        });
      }
    }
  }, [open, materialIssue]);

  // Fetch data on modal open
  useEffect(() => {
    if (open) {
      fetchBranches();
      fetchSites();
      fetchTechnicians();
      fetchInventory();
    }
  }, [open]);

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${BASE_API}/auth/branch/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      setBranches(response.data.results || response.data);
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await axios.get(`${BASE_API}/auth/site/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      setSites(response.data.results || response.data);
    } catch (error) {
      console.error("Error fetching sites:", error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      // First, get all roles to find the "Technician" role ID
      const rolesResponse = await axios.get(`${BASE_API}/auth/roles/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      const roles = Array.isArray(rolesResponse.data) ? rolesResponse.data : rolesResponse.data.results || [];
      const technicianRole = roles.find(role => role.name.toLowerCase() === 'technician');
      
      // Fetch staff filtered by technician role
      let url = `${BASE_API}/auth/staff/all/`;
      if (technicianRole) {
        url += `?role=${technicianRole.id}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      setTechnicians(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error("Error fetching technicians:", error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await axios.get(`${BASE_API}/inventory/inventory/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = response.data.results || response.data;
      setInventory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  // Add item to issue
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          inventory_item: "",
          quantity: 0,
          uom: "",
        }
      ]
    }));
  };

  // Remove item
  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update item
  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      
      if (field === "inventory_item") {
        const selectedInventory = inventory.find(inv => inv.id === parseInt(value));
        updatedItems[index] = {
          ...updatedItems[index],
          inventory_item: value,
          uom: selectedInventory?.uom || "",
          available_quantity: selectedInventory?.quantity || 0,
        };
      } else {
        updatedItems[index] = {
          ...updatedItems[index],
          [field]: field === "quantity" ? parseFloat(value) || 0 : value,
        };
      }
      
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  // Validation
  const validateStep1 = () => {
    if (!formData.branch) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please select a Branch",
      });
      return false;
    }
    if (!formData.issue_date) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please select Issue Date",
      });
      return false;
    }
    if (formData.issue_type === "site" && !formData.site) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please select a Site",
      });
      return false;
    }
    if (formData.issue_type === "technician" && !formData.technician) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please select a Technician",
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.items || formData.items.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Validation Error",
        text: "Please add at least one item",
      });
      return false;
    }

    for (const item of formData.items) {
      if (!item.inventory_item) {
        Swal.fire({
          icon: "warning",
          title: "Validation Error",
          text: "Please select an item for all rows",
        });
        return false;
      }
      if (!item.quantity || item.quantity <= 0) {
        Swal.fire({
          icon: "warning",
          title: "Validation Error",
          text: "Quantity must be greater than 0",
        });
        return false;
      }
      if (item.quantity > item.available_quantity) {
        Swal.fire({
          icon: "warning",
          title: "Insufficient Stock",
          text: `Available quantity is ${item.available_quantity}, but you're trying to issue ${item.quantity}`,
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
      const payload = {
        issue_type: formData.issue_type,
        branch: parseInt(formData.branch),
        site: formData.issue_type === "site" ? parseInt(formData.site) : null,
        technician: formData.issue_type === "technician" ? parseInt(formData.technician) : null,
        issue_date: formData.issue_date,
        items: formData.items.map(item => ({
          inventory_item: parseInt(item.inventory_item),
          quantity: item.quantity,
          uom: item.uom,
        })),
      };

      console.log("Material Issue Payload:", payload);

      const response = await axios.post(
        `${BASE_API}/inventory/material-issue/`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      console.log("Material Issue Response:", response.data);

      Swal.fire({
        icon: "success",
        title: "Material Issue Created",
        text: `Material Issue ${response.data.issue_number || ""} created successfully! Stock has been updated.`,
        timer: 2000,
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Error saving Material Issue:", error);
      
      let errorMessage = "Failed to create Material Issue";
      
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
              Create Material Issue Note
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
              <span className="ml-2 font-medium">Basic Info</span>
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
              <span className="ml-2 font-medium">Select Items</span>
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
          
          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.issue_type}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      issue_type: e.target.value,
                      site: "",
                      technician: "",
                    }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="site">Site</option>
                    <option value="technician">Technician</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.issue_type === "site" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.site}
                      onChange={(e) => setFormData(prev => ({ ...prev, site: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Site</option>
                      {sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.issue_type === "technician" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Technician <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.technician}
                      onChange={(e) => setFormData(prev => ({ ...prev, technician: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Technician</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.first_name} {tech.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Select Items */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-800">Items to Issue</h3>
                <button
                  onClick={handleAddItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  + Add Item
                </button>
              </div>

              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items added. Click "Add Item" to start.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-left">Sr</th>
                        <th className="border border-gray-300 px-3 py-2 text-left">Item</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Available</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Issue Qty *</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">UOM</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => {
                        const selectedInv = inventory.find(inv => inv.id === parseInt(item.inventory_item));
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-3 py-2 text-center">{index + 1}</td>
                            <td className="border border-gray-300 px-3 py-2">
                              <select
                                value={item.inventory_item}
                                onChange={(e) => handleItemChange(index, "inventory_item", e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select Item</option>
                                {inventory.map((inv) => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.display_name} (Stock: {inv.quantity})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                              {selectedInv?.quantity || 0}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.quantity || 0}
                                onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              {item.uom || "-"}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">
                              <button
                                onClick={() => handleRemoveItem(index)}
                                className="px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300 transition"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Material Issue Summary</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">Issue Type:</span>
                    <p className="text-gray-900 mt-1 capitalize">{formData.issue_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Branch:</span>
                    <p className="text-gray-900 mt-1">
                      {branches.find(b => b.id === parseInt(formData.branch))?.name || "N/A"}
                    </p>
                  </div>
                  {formData.issue_type === "site" && (
                    <div>
                      <span className="text-gray-600 font-medium">Site:</span>
                      <p className="text-gray-900 mt-1">
                        {sites.find(s => s.id === parseInt(formData.site))?.name || "N/A"}
                      </p>
                    </div>
                  )}
                  {formData.issue_type === "technician" && (
                    <div>
                      <span className="text-gray-600 font-medium">Technician:</span>
                      <p className="text-gray-900 mt-1">
                        {(() => {
                          const tech = technicians.find(t => t.id === parseInt(formData.technician));
                          return tech ? `${tech.first_name} ${tech.last_name}` : "N/A";
                        })()}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600 font-medium">Issue Date:</span>
                    <p className="text-gray-900 mt-1">{formData.issue_date}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">Items Summary</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-3 py-2 text-left">Item</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">Issue Quantity</th>
                        <th className="border border-gray-300 px-3 py-2 text-center">UOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => {
                        const inv = inventory.find(i => i.id === parseInt(item.inventory_item));
                        return (
                          <tr key={index}>
                            <td className="border border-gray-300 px-3 py-2">{inv?.display_name || "N/A"}</td>
                            <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                              {item.quantity}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-center">{item.uom}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  ⚠️ <strong>Note:</strong> After creating this Material Issue, inventory will be automatically reduced by the issued quantities.
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
                {loading ? "Creating..." : "✓ Create Material Issue"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
