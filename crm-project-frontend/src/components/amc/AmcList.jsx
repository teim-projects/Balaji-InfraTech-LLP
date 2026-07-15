import { useState, useEffect } from "react";
import { MdEdit, MdDelete, MdAutorenew, MdVisibility, MdBuild } from "react-icons/md";
import Swal from "sweetalert2";
import AddAmcForm from "./AddAmcForm";
import ContractDetailModal from "./ContractDetailModal";
import AmcSparePartsModal from "./AmcSparePartsModal";

export default function AmcList({ baseApi, token, filters = {} }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAmc, setSelectedAmc] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, active, expiring_soon
  const [detailContract, setDetailContract] = useState(null);
  const [sparePartsContract, setSparePartsContract] = useState(null);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      let url = `${baseApi}/amc/contracts/`;
      if (filterType === "expiring_soon") {
        url = `${baseApi}/amc/contracts/expiring_soon/`;
      } else if (filterType === "active") {
        url = `${baseApi}/amc/contracts/active_contracts/`;
      }
      // Append search filter from FiltersPanel
      if (filters?.search) {
        const separator = url.includes("?") ? "&" : "?";
        url += `${separator}search=${encodeURIComponent(filters.search)}`;
      }

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setContracts(data.results || data);
      } else {
        throw new Error("Failed to load contracts");
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to fetch contracts" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [filterType, baseApi, token, filters]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the contract",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${baseApi}/amc/contracts/${id}/`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        Swal.fire({ icon: "success", text: "Contract deleted successfully", timer: 1200 });
        fetchContracts();
      } else {
        throw new Error("Failed to delete contract");
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  const handleRenew = async (id) => {
    const { value: cost } = await Swal.fire({
      title: "Renew AMC Contract",
      input: "number",
      inputLabel: "Enter AMC Cost for renewal",
      inputPlaceholder: "Cost in INR",
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value || isNaN(parseFloat(value))) {
          return "Please enter a valid cost";
        }
      }
    });

    if (!cost) return;

    try {
      const res = await fetch(`${baseApi}/amc/contracts/${id}/create_renewal/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ amc_cost: parseFloat(cost) })
      });

      if (res.ok) {
        Swal.fire({ icon: "success", text: "Contract renewed successfully", timer: 1200 });
        fetchContracts();
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to renew contract");
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-slate-100 text-slate-800";
      case "EXPIRED":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card matching PurchaseOrder */}
      <div className="bg-white p-4 rounded-md shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">AMC Contracts</h2>
          <div className="text-sm text-slate-600">
            {loading ? "Loading..." : `${contracts.length} AMC contract(s) found`}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                filterType === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("active")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                filterType === "active" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterType("expiring_soon")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                filterType === "expiring_soon" ? "bg-amber-600 text-white" : "bg-amber-100 text-amber-800 hover:bg-amber-200"
              }`}
            >
              Expiring Soon
            </button>
          </div>
          <button
            onClick={() => {
              setSelectedAmc(null);
              setShowAddForm(true);
            }}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 text-sm font-medium"
          >
            + Add AMC
          </button>
        </div>
      </div>

      {/* Table Card matching PurchaseOrder */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sr.No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Contract No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Customer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">AMC Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Visit Freq.</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">AC Variant</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Start Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">End Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Cost</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="11" className="px-4 py-8 text-center text-sm text-slate-500">
                  Loading contracts...
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan="11" className="px-4 py-8 text-center text-sm text-slate-500">
                  No contracts found. Click "+ Add AMC" to create one.
                </td>
              </tr>
            ) : (
              contracts.map((item, index) => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{item.contract_number}</td>
                  <td className="px-4 py-3 text-sm">{item.customer_name || `Customer ID: ${item.customer}`}</td>
                  <td className="px-4 py-3 text-sm">
                    {item.amc_type === "COMPREHENSIVE"
                      ? "Comprehensive"
                      : item.amc_type === "NON_COMPREHENSIVE"
                        ? "Non-Comprehensive"
                        : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {{
                      MONTHLY: "Monthly",
                      QUARTERLY: "Quarterly",
                      HALF_YEARLY: "Half Yearly",
                      YEARLY: "Yearly",
                    }[item.visit_frequency] || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">{item.product_name || `Variant ID: ${item.product_variant}`}</td>
                  <td className="px-4 py-3 text-sm">{item.amc_start_date}</td>
                  <td className="px-4 py-3 text-sm">{item.amc_end_date}</td>
                  <td className="px-4 py-3 text-sm">₹{item.amc_cost}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setDetailContract(item)}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        title="View Details"
                      >
                        <MdVisibility />
                      </button>
                      {item.amc_type === "NON_COMPREHENSIVE" && (
                        <button
                          onClick={() => setSparePartsContract(item)}
                          className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                          title="Spare Parts & Invoice"
                        >
                          <MdBuild />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedAmc(item);
                          setShowAddForm(true);
                        }}
                        className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
                        title="Edit"
                      >
                        <MdEdit />
                      </button>
                      {item.status === "ACTIVE" && (
                        <button
                          onClick={() => handleRenew(item.id)}
                          className="px-2 py-1 bg-purple-200 text-purple-800 rounded hover:bg-purple-300"
                          title="Renew AMC"
                        >
                          <MdAutorenew />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
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
      </div>

      {showAddForm && (
        <AddAmcForm
          open={showAddForm}
          onClose={() => {
            setShowAddForm(false);
            setSelectedAmc(null);
          }}
          onSuccess={() => {
            fetchContracts();
          }}
          baseApi={baseApi}
          amc={selectedAmc}
          token={token}
        />
      )}

      {detailContract && (
        <ContractDetailModal
          contract={detailContract}
          onClose={() => setDetailContract(null)}
        />
      )}

      {sparePartsContract && (
        <AmcSparePartsModal
          contract={sparePartsContract}
          baseApi={baseApi}
          token={token}
          onClose={() => setSparePartsContract(null)}
          onUpdated={fetchContracts}
        />
      )}
    </div>
  );
}
