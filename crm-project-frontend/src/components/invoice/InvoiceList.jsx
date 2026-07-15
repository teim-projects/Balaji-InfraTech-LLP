import { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import axios from "axios";
import { FaWhatsapp } from "react-icons/fa";
import { MdRemoveRedEye, MdDownload, MdEdit, MdDelete, MdEmail, MdHistory } from "react-icons/md";

const BASE_API =
  import.meta.env.VITE_BASE_API_URL;

const api = axios.create({
  baseURL: `${BASE_API}/`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * InvoiceList
 * Props:
 *   onAdd    – called when user clicks "+ Create Invoice"
 *   onEdit   – called with invoice id when user clicks Edit
 *   filters  – applied filter object from FiltersPanel (passed by Invoice.jsx)
 *
 * Exposed ref methods:
 *   refreshList() – force re-fetch (called from parent after add/edit)
 */
const InvoiceList = forwardRef(({ onAdd, onEdit, filters = {} }, ref) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ─── Build query string from filters ───────────────────────────────────────
  const buildParams = useCallback((f = {}) => {
    const params = new URLSearchParams();

    // Full-text search → DRF SearchFilter uses ?search=
    if (f.search) params.set("search", f.search);

    // Date range → InvoiceFilter date_from / date_to
    if (f.date?.from) params.set("date_from", f.date.from);
    if (f.date?.to)   params.set("date_to",   f.date.to);

    // GST type → InvoiceFilter exact match
    if (f.gst_type) params.set("gst_type", f.gst_type);

    return params.toString();
  }, []);

  // ─── Fetch invoices whenever filters change ─────────────────────────────────
  const fetchInvoices = useCallback(() => {
    setLoading(true);
    const qs = buildParams(filters);
    api
      .get(`invoice/invoice/${qs ? `?${qs}` : ""}`)
      .then((res) => {
        setData(res.data.results || res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [filters, buildParams]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Expose refresh method to parent component
  useImperativeHandle(ref, () => ({
    refreshList: fetchInvoices
  }));

  /* ================= PDF VIEW ================= */

  const handleViewPDF = async (invoiceId) => {
    try {
      const response = await api.get(
        `/invoice/${invoiceId}/pdf/`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      alert("Failed to view PDF");
    }
  };

  /* ================= PDF DOWNLOAD ================= */

  const handleDownloadPDF = async (invoiceId) => {
    try {
      const response = await api.get(
        `/invoice/${invoiceId}/pdf/`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const fileURL = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = fileURL;

      // ✅ IMPORTANT
      link.setAttribute("download", `invoice_${invoiceId}.pdf`);

      document.body.appendChild(link);
      link.click();

      // remove silently
      link.remove();
      window.URL.revokeObjectURL(fileURL);
    } catch (err) {
      console.error(err);
      alert("Download failed");
    }
  };

  /* ================= DELETE ================= */

  const handleDeleteInvoice = async (invoiceId) => {
    const ok = window.confirm("Delete this invoice?");
    if (!ok) return;

    try {
      await api.delete(`invoice/invoice/${invoiceId}/`);
      fetchInvoices();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section — matches PurchaseOrder.jsx */}
      <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invoice Management</h2>
          <div className="text-sm text-slate-600">
            {loading ? "Loading..." : `${data.length} invoice(s) found`}
          </div>
        </div>
        <div>
          <button
            onClick={onAdd}
            className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700"
          >
            + Create Invoice
          </button>
        </div>
      </div>

      {/* Table — matches PurchaseOrder.jsx */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sr.No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Invoice No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Buyer</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Total Amount</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>

          <tbody>
            {data.map((inv, index) => (
              <tr key={inv.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3 text-sm">{index + 1}</td>
                <td className="px-4 py-3 text-sm font-medium">
                  {inv.invoice_no}
                </td>

                <td className="px-4 py-3 text-sm">
                  {inv.invoice_date
                    ? new Date(inv.invoice_date).toLocaleDateString()
                    : "N/A"}
                </td>

                <td className="px-4 py-3 text-sm">{inv.buyer_name}</td>

                <td className="px-4 py-3 text-sm font-medium">
                  ₹
                  {Number(inv.grand_total || 0).toLocaleString(
                    "en-IN",
                    { minimumFractionDigits: 2 }
                  )}
                </td>

                {/* ACTIONS */}
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {/* ORDER matches PurchaseOrder.jsx: History | View | Edit | Download | WhatsApp | Email | Delete */}
                    <button className="px-2 py-1 bg-purple-200 text-purple-800 rounded hover:bg-purple-300" title="Invoice History">
                      <MdHistory />
                    </button>

                    <button onClick={() => handleViewPDF(inv.id)} className="px-2 py-1 bg-blue-200 text-blue-800 rounded hover:bg-blue-300" title="View">
                      <MdRemoveRedEye />
                    </button>

                    <button onClick={() => onEdit(inv.id)} className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300" title="Edit">
                      <MdEdit />
                    </button>

                    <button onClick={() => handleDownloadPDF(inv.id)} className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300" title="Download">
                      <MdDownload />
                    </button>

                    <button className="px-2 py-1 bg-green-200 text-green-800 rounded hover:bg-green-300" title="WhatsApp">
                      <FaWhatsapp />
                    </button>

                    <button className="px-2 py-1 bg-sky-200 text-sky-800 rounded hover:bg-sky-300" title="Email">
                      <MdEmail />
                    </button>

                    <button onClick={() => handleDeleteInvoice(inv.id)} className="px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300" title="Delete">
                      <MdDelete />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {data.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                  No invoices found. Create your first invoice!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default InvoiceList;