import { MdClose } from "react-icons/md";

export default function ContractDetailModal({ contract, onClose }) {
  if (!contract) return null;

  const getStatusBadge = (status) => {
    const map = {
      ACTIVE: "bg-green-100 text-green-800",
      EXPIRED: "bg-red-100 text-red-800",
      CANCELLED: "bg-amber-100 text-amber-800",
      INACTIVE: "bg-slate-100 text-slate-800",
    };
    return map[status] || "bg-slate-100 text-slate-800";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-6">
        <div className="flex items-start justify-between px-6 py-5 border-b bg-slate-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{contract.contract_number}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {contract.customer_name}
              {contract.amc_type
                ? ` · ${contract.amc_type === "COMPREHENSIVE" ? "Comprehensive" : "Non-Comprehensive"}`
                : ""}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors ml-4">
            <MdClose size={24} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 border-b">
          {[
            { label: "AC Variant", value: contract.product_name || "—" },
            { label: "AMC Period", value: `${contract.amc_start_date} → ${contract.amc_end_date}` },
            { label: "AMC Cost", value: `₹${parseFloat(contract.amc_cost || 0).toLocaleString("en-IN")}` },
            { label: "Status", value: contract.status, badge: true },
          ].map(({ label, value, badge }) => (
            <div key={label} className="bg-white px-4 py-3">
              <p className="text-xs text-slate-400 font-medium">{label}</p>
              {badge
                ? <span className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(value)}`}>{value}</span>
                : <p className="text-sm font-semibold text-slate-700 mt-1">{value}</p>
              }
            </div>
          ))}
        </div>

        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dates</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Sale Date</dt>
                <dd className="font-medium text-slate-700">{contract.sale_date || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Warranty End</dt>
                <dd className="font-medium text-slate-700">{contract.warranty_end_date || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">AMC Included in Sale</dt>
                <dd className="font-medium text-slate-700">{contract.amc_included_in_sale ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Renewal</dt>
                <dd className="font-medium text-slate-700">{contract.is_renewal ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">AMC Type</p>
            <p className="text-sm font-medium text-slate-700">
              {contract.amc_type === "COMPREHENSIVE"
                ? "Comprehensive"
                : contract.amc_type === "NON_COMPREHENSIVE"
                  ? "Non-Comprehensive"
                  : "—"}
            </p>
            <p className="text-xs text-slate-500 mt-2">Visit Frequency</p>
            <p className="text-sm font-medium text-slate-700">
              {{
                MONTHLY: "Monthly",
                QUARTERLY: "Quarterly",
                HALF_YEARLY: "Half Yearly",
                YEARLY: "Yearly",
              }[contract.visit_frequency] || "—"}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-slate-50 rounded-b-xl flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-700 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
