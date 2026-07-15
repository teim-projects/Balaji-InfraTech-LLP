import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { MdClose, MdDelete, MdReceipt } from "react-icons/md";
import AddInvoice from "../invoice/AddInvoice";
import { formatAmount, toNum } from "../../utils/numberFormat";

const emptyPartForm = {
  inventory_item: "",
  quantity_used: "",
  unit: "Nos",
  rate_per_unit: "",
  gst_percent: "18",
  hsn_sac: "",
  description: "",
};

export default function AmcSparePartsModal({ contract, baseApi, token, onClose, onUpdated }) {
  const [parts, setParts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [partForm, setPartForm] = useState(emptyPartForm);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState(null);
  const [inventoryLoadError, setInventoryLoadError] = useState("");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fetchParts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseApi}/amc/contracts/${contract.id}/spare_parts/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setParts(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (retry = 0) => {
    const endpoints = [
      `${baseApi}/inventory/inventory/all/`,
      `${baseApi}/inventory/inventory/low_side/`,
      `${baseApi}/inventory/inventory/`,
    ];

    setInventoryLoadError("");

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { headers });
        if (!res.ok) continue;

        const data = await res.json();
        const items = Array.isArray(data) ? data : data.results || [];
        const lowSide = items.filter((i) => i.item && !i.product_variant);
        setInventory(lowSide);
        return;
      } catch (err) {
        console.warn(`Inventory fetch failed (${url}):`, err);
      }
    }

    if (retry < 1) {
      await new Promise((r) => setTimeout(r, 800));
      return fetchInventory(retry + 1);
    }

    setInventoryLoadError("Could not load inventory stock. Please check that the backend is running and refresh.");
    Swal.fire({
      icon: "error",
      title: "Inventory unavailable",
      text: "Failed to load stock list. If the backend just restarted, wait a moment and close/reopen this dialog.",
    });
  };

  useEffect(() => {
    if (!contract?.id) return;
    fetchParts();
    fetchInventory();
  }, [contract?.id, baseApi, token]);

  const uninvoicedParts = parts.filter((p) => !p.invoice);

  const handleAddPart = async () => {
    if (!partForm.inventory_item) {
      Swal.fire({ icon: "error", title: "Validation", text: "Select a material" });
      return;
    }
    if (!partForm.quantity_used || toNum(partForm.quantity_used) <= 0) {
      Swal.fire({ icon: "error", title: "Validation", text: "Enter a valid quantity" });
      return;
    }
    if (!partForm.rate_per_unit || toNum(partForm.rate_per_unit) < 0) {
      Swal.fire({ icon: "error", title: "Validation", text: "Enter a valid rate" });
      return;
    }

    const selected = inventory.find((i) => String(i.id) === String(partForm.inventory_item));
    if (selected && toNum(selected.quantity) < toNum(partForm.quantity_used)) {
      Swal.fire({
        icon: "error",
        title: "Insufficient Stock",
        text: `Available: ${selected.quantity}, Requested: ${partForm.quantity_used}`,
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${baseApi}/amc/contracts/${contract.id}/add_spare_part/`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          inventory_item: parseInt(partForm.inventory_item, 10),
          quantity_used: toNum(partForm.quantity_used),
          unit: partForm.unit || "Nos",
          rate_per_unit: toNum(partForm.rate_per_unit),
          gst_percent: toNum(partForm.gst_percent, 18),
          hsn_sac: partForm.hsn_sac,
          description: partForm.description,
        }),
      });

      if (!res.ok) {
        let errMsg = "Failed to add spare part";
        try {
          const err = await res.json();
          errMsg = err.detail || errMsg;
        } catch {
          errMsg = `Server error (${res.status}). Please try again.`;
        }
        throw new Error(errMsg);
      }

      setPartForm(emptyPartForm);
      await fetchParts();
      await fetchInventory();
      onUpdated?.();
      Swal.fire({ icon: "success", text: "Spare part added — stock updated", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePart = async (partId) => {
    const result = await Swal.fire({
      title: "Remove spare part?",
      text: "Stock will be restored to inventory",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remove",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${baseApi}/amc/contracts/${contract.id}/spare_parts/${partId}/`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to remove");
      }
      await fetchParts();
      await fetchInventory();
      onUpdated?.();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const res = await fetch(`${baseApi}/amc/contracts/${contract.id}/invoice_draft/`, { headers });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "No spare parts to invoice");
      }
      const draft = await res.json();
      setInvoiceDraft(draft);
      setShowInvoice(true);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  const selectedStock = inventory.find((i) => String(i.id) === String(partForm.inventory_item));

  if (!contract) return null;

  if (showInvoice && invoiceDraft) {
    return (
      <AddInvoice
        initialDraft={invoiceDraft}
        amcContractId={contract.id}
        sparePartIds={invoiceDraft.spare_part_ids || []}
        onBack={() => {
          setShowInvoice(false);
          setInvoiceDraft(null);
          fetchParts();
          onUpdated?.();
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-6">
        <div className="flex items-start justify-between px-6 py-5 border-b bg-slate-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Spare Parts</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {contract.contract_number} · {contract.customer_name} · Non-Comprehensive
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <MdClose size={24} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
            Adding spare parts deducts quantity from inventory stock. Create an invoice to bill the customer for uninvoiced parts.
          </div>

          {inventoryLoadError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{inventoryLoadError}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Material (Low Side Stock)</label>
              <select
                value={partForm.inventory_item}
                onChange={(e) => setPartForm((p) => ({ ...p, inventory_item: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              >
                <option value="">Select material...</option>
                {inventory.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.display_name || inv.item_name} — Stock: {inv.quantity} {inv.uom || ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Available</label>
              <p className="px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-medium">
                {selectedStock ? `${selectedStock.quantity} ${selectedStock.uom || ""}` : "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={partForm.quantity_used}
                onChange={(e) => setPartForm((p) => ({ ...p, quantity_used: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
              <input
                type="text"
                value={partForm.unit}
                onChange={(e) => setPartForm((p) => ({ ...p, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rate (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={partForm.rate_per_unit}
                onChange={(e) => setPartForm((p) => ({ ...p, rate_per_unit: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">GST %</label>
              <input
                type="number"
                min="0"
                value={partForm.gst_percent}
                onChange={(e) => setPartForm((p) => ({ ...p, gst_percent: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">HSN/SAC</label>
              <input
                type="text"
                value={partForm.hsn_sac}
                onChange={(e) => setPartForm((p) => ({ ...p, hsn_sac: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddPart}
                disabled={saving}
                className="w-full px-4 py-2 bg-sky-600 text-white rounded text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Part"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input
              type="text"
              value={partForm.description}
              onChange={(e) => setPartForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              placeholder="Optional description"
            />
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">Material</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Rate</th>
                  <th className="px-3 py-2 text-right">GST%</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-center">Invoiced</th>
                  <th className="px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-3 py-6 text-center text-slate-400">Loading...</td>
                  </tr>
                ) : parts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-3 py-6 text-center text-slate-400">No spare parts added yet</td>
                  </tr>
                ) : (
                  parts.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50">
                      <td className="px-3 py-2">{p.product_name}</td>
                      <td className="px-3 py-2 text-right">{p.quantity_used} {p.unit}</td>
                      <td className="px-3 py-2 text-right">₹{formatAmount(p.rate_per_unit)}</td>
                      <td className="px-3 py-2 text-right">{p.gst_percent}%</td>
                      <td className="px-3 py-2 text-right font-medium">₹{formatAmount(p.total_cost)}</td>
                      <td className="px-3 py-2 text-center">
                        {p.invoice ? (
                          <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">Yes</span>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {!p.invoice && (
                          <button
                            type="button"
                            onClick={() => handleDeletePart(p.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove & restore stock"
                          >
                            <MdDelete />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 rounded-b-xl flex justify-between items-center gap-3">
          <p className="text-sm text-slate-600">
            {uninvoicedParts.length} uninvoiced part(s)
          </p>
          <div className="flex gap-2">
            {uninvoicedParts.length > 0 && (
              <button
                type="button"
                onClick={handleCreateInvoice}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              >
                <MdReceipt size={18} /> Create Invoice
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-700 text-white text-sm font-medium rounded-md hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}