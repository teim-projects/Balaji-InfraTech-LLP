// src/components/inventory/DeliveryChallanForm.jsx
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";

export default function DeliveryChallanForm({
  open,
  onClose,
  onSuccess,
  base_api,
  dc = null
}) {
  const BASE_API = base_api;

  const [materialIssues, setMaterialIssues] = useState([]);
  const [issueItems, setIssueItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    material_issue: "",
    dispatch_date: "",
    transporter_name: "",
    vehicle_number: "",
    transporter_contact: "",
    driver_name: "",
    driver_license: "",
    destination: "",
    notes: "",
    items: []
  });

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }), [token]);

  useEffect(() => {
    if (open) {
      fetchMaterialIssues();
      if (dc) {
        loadDcData();
      } else {
        resetForm();
      }
    } else {
      resetForm();
    }
  }, [open, dc]);

  const fetchMaterialIssues = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_API}/inventory/material-issue/`, { headers });
      let data = [];
      if (Array.isArray(res.data)) data = res.data;
      else if (Array.isArray(res.data.results)) data = res.data.results;
      else if (Array.isArray(res.data.data)) data = res.data.data;
      setMaterialIssues(data);
    } catch (err) {
      setMaterialIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDcData = async () => {
    if (!dc) return;
    
    setFormData({
      material_issue: dc.material_issue_details?.id || dc.material_issue || "",
      dispatch_date: dc.dispatch_date || "",
      transporter_name: dc.transporter_name || "",
      vehicle_number: dc.vehicle_number || "",
      transporter_contact: dc.transporter_contact || "",
      driver_name: dc.driver_name || "",
      driver_license: dc.driver_license || "",
      destination: dc.destination || "",
      notes: dc.notes || "",
      items: dc.items || []
    });

    const issueId = dc.material_issue_details?.id || dc.material_issue;
    if (issueId) {
      await fetchIssueItems(issueId, dc.items);
    }
  };

  const fetchIssueItems = async (issueId, existingItems = []) => {
    try {
      const res = await axios.get(`${BASE_API}/inventory/material-issue/${issueId}/`, { headers });
      
      let items = [];
      if (res.data.items) items = res.data.items;
      else if (res.data.material_issue_items) items = res.data.material_issue_items;
      else if (res.data.item_details) items = res.data.item_details;

      setIssueItems(items);

      const mappedItems = items.map((item, index) => ({
        material_issue_item: item.id,
        quantity: existingItems[index]?.quantity || 0,
        item_name: item.item_name || item.display_name || item.name,
        unit: item.unit || "Nos",
        max_quantity: item.quantity || item.issued_quantity || 0
      }));

      setFormData(prev => ({ ...prev, items: mappedItems }));
    } catch (err) {
      console.error("Error fetching items:", err);
    }
  };

  const handleIssueChange = async (issueId) => {
    if (!issueId) {
      setFormData(prev => ({ ...prev, material_issue: "", items: [] }));
      setIssueItems([]);
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      setFormData(prev => ({ ...prev, material_issue: issueId, dispatch_date: today, items: [] }));

      const res = await axios.get(`${BASE_API}/inventory/material-issue/${issueId}/`, { headers });
      
      let items = [];
      if (res.data.items) items = res.data.items;
      else if (res.data.material_issue_items) items = res.data.material_issue_items;
      else if (res.data.item_details) items = res.data.item_details;

      setIssueItems(items);

      const mappedItems = items.map((item) => ({
        material_issue_item: item.id,
        quantity: 0,
        item_name: item.item_name || item.display_name || item.name,
        unit: item.unit || "Nos",
        max_quantity: item.quantity || item.issued_quantity || 0
      }));

      setFormData(prev => ({ ...prev, items: mappedItems }));
    } catch (err) {
      setIssueItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (index, value) => {
    const updatedItems = [...formData.items];
    const maxQty = issueItems[index]?.quantity || issueItems[index]?.issued_quantity || 0;
    let newValue = parseFloat(value);
    if (isNaN(newValue)) newValue = 0;
    if (newValue < 0) newValue = 0;
    if (newValue > maxQty) newValue = maxQty;
    updatedItems[index].quantity = newValue;
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.material_issue) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please select a material issue" });
      return false;
    }
    if (!formData.dispatch_date) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please select dispatch date" });
      return false;
    }
    const itemsToSubmit = formData.items.filter(item => Number(item.quantity) > 0);
    if (itemsToSubmit.length === 0) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please add at least one item with quantity greater than 0" });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const itemsToSubmit = formData.items.filter(item => Number(item.quantity) > 0);
      const payload = {
        material_issue: parseInt(formData.material_issue),
        dispatch_date: formData.dispatch_date,
        transporter_name: formData.transporter_name || null,
        vehicle_number: formData.vehicle_number || null,
        transporter_contact: formData.transporter_contact || null,
        driver_name: formData.driver_name || null,
        driver_license: formData.driver_license || null,
        destination: formData.destination || null,
        notes: formData.notes || null,
        items: itemsToSubmit.map(item => ({
          material_issue_item: item.material_issue_item,
          quantity: parseFloat(item.quantity)
        }))
      };

      const url = dc ? `${BASE_API}/inventory/delivery-challan/${dc.id}/` : `${BASE_API}/inventory/delivery-challan/`;
      const method = dc ? "PUT" : "POST";

      await axios({ method, url, data: payload, headers });

      Swal.fire({
        icon: "success",
        text: `Delivery Challan ${dc ? "updated" : "created"} successfully`,
        timer: 1200,
        showConfirmButton: false
      });

      onSuccess && onSuccess();
      onClose && onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.detail || `Error ${dc ? "updating" : "creating"} Delivery Challan`
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      material_issue: "",
      dispatch_date: "",
      transporter_name: "",
      vehicle_number: "",
      transporter_contact: "",
      driver_name: "",
      driver_license: "",
      destination: "",
      notes: "",
      items: []
    });
    setIssueItems([]);
  };

  const totalDispatchQty = formData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 mt-8 bg-black/40 flex items-start sm:items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-6xl relative max-h-[85vh] flex flex-col">
        {/* HEADER */}
        <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {dc ? "Edit Delivery Challan" : "Create Delivery Challan"}
          </h2>
          <button onClick={onClose} className="text-xl font-bold hover:text-red-500">✕</button>
        </div>

        {/* BODY */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* FORM FIELDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Material Issue *</label>
              <select
                value={formData.material_issue}
                onChange={(e) => handleIssueChange(e.target.value)}
                disabled={loading || submitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">{loading ? "Loading..." : "Select Material Issue"}</option>
                {materialIssues.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {issue.issue_number} - {issue.remarks || "No remarks"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dispatch Date *</label>
              <input
                type="date"
                name="dispatch_date"
                value={formData.dispatch_date}
                onChange={handleInputChange}
                disabled={submitting}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Vehicle Number</label>
              <input
                type="text"
                name="vehicle_number"
                value={formData.vehicle_number}
                onChange={handleInputChange}
                placeholder="e.g. MH 12 AB 1234"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Transporter Name</label>
              <input
                type="text"
                name="transporter_name"
                value={formData.transporter_name}
                onChange={handleInputChange}
                placeholder="Enter transporter name"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Transporter Contact</label>
              <input
                type="text"
                name="transporter_contact"
                value={formData.transporter_contact}
                onChange={handleInputChange}
                placeholder="Enter contact number"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Driver Name</label>
              <input
                type="text"
                name="driver_name"
                value={formData.driver_name}
                onChange={handleInputChange}
                placeholder="Enter driver name"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Driver License</label>
              <input
                type="text"
                name="driver_license"
                value={formData.driver_license}
                onChange={handleInputChange}
                placeholder="Enter license number"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Destination</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleInputChange}
                placeholder="Enter destination"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="2"
              placeholder="Additional notes..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {/* ITEMS TABLE */}
          <div className="border-t pt-4">
            <div className="flex justify-between mb-3">
              <h3 className="text-base font-semibold">Items</h3>
              <span className="text-sm">Total Qty: <b className="text-indigo-600">{totalDispatchQty}</b></span>
            </div>

            {loading ? (
              <div className="py-10 text-center">Loading items...</div>
            ) : issueItems.length > 0 ? (
              <div className="overflow-x-auto border rounded-md">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Item</th>
                      <th className="px-4 py-2 text-center">Issued Qty</th>
                      <th className="px-4 py-2 text-left">Dispatch Qty</th>
                      <th className="px-4 py-2 text-left">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issueItems.map((item, index) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-2">{index + 1}</td>
                        <td className="px-4 py-2">{item.item_name || item.name}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="bg-sky-100 px-2 py-1 rounded">
                            {item.quantity || item.issued_quantity || 0}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity || item.issued_quantity || 0}
                            value={formData.items[index]?.quantity || ""}
                            onChange={(e) => handleQtyChange(index, e.target.value)}
                            className="w-24 rounded border px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">{item.unit || "Nos"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 border rounded-md">
                {formData.material_issue ? "No items found" : "Select a material issue first"}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-sm hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !formData.material_issue || totalDispatchQty === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : (dc ? "Update" : "Create")}
          </button>
        </div>
      </div>
    </div>
  );
}