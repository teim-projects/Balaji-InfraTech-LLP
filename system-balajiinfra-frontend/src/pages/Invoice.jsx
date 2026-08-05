import { useState, useRef, useCallback, useMemo } from "react";
import Base from "../components/Base";
import InvoiceList from "../components/invoice/InvoiceList";
import AddInvoice from "../components/invoice/AddInvoice";

export default function Invoice() {

  const [mode, setMode] = useState("list");
  const [editId, setEditId] = useState(null);
  const invoiceListRef = useRef();

  // ─── Filter state ────────────────────────────────────────────────────────────
  const initialFilters = useMemo(() => ({
    search: "",
    date: { from: "", to: "" },
    gst_type: "",
  }), []);

  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  // ─── Filter config for FiltersPanel (via Base) ────────────────────────────────
  // Uses the same config shape as Lead.jsx / Inventory.jsx / Quotation.jsx
  const filtersConfig = useMemo(() => [
    {
      key: "search",
      type: "search",
      label: "Search",
      placeholder: "Search by invoice no, buyer, site...",
    },
    {
      key: "date",
      type: "daterange",
      label: "Invoice Date",
    },
    {
      key: "gst_type",
      type: "select",
      label: "GST Type",
      placeholder: "All GST Types",
      options: [
        { value: "CGST_SGST", label: "CGST + SGST" },
        { value: "IGST",      label: "IGST" },
        { value: "NO_GST",    label: "No GST" },
      ],
    },
  ], []);

  const handleFilterChange = useCallback((filters) => {
    setAppliedFilters(filters);
  }, []);

  // ─── Navigation ───────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setMode("add");
  };

  const openEdit = (id) => {
    setEditId(id);
    setMode("add");
  };

  const goBack = () => {
    setMode("list");
    // Refresh the invoice list after adding/editing
    if (invoiceListRef.current) {
      invoiceListRef.current.refreshList();
    }
  };

  return (
    <Base
      title="Invoices"
      filterTitle="Invoice Filters"
      filtersConfig={filtersConfig}
      initialFilterValues={initialFilters}
      onFiltersChange={handleFilterChange}
    >
      {/* ✅ ALWAYS SHOW LIST IN BACKGROUND */}
      <InvoiceList
        ref={invoiceListRef}
        onAdd={openAdd}
        onEdit={openEdit}
        filters={appliedFilters}
      />

      {/* ✅ SHOW ADD INVOICE AS MODAL OVER LIST */}
      {mode === "add" && (
        <AddInvoice
          id={editId}
          onBack={goBack}
        />
      )}
    </Base>
  );
}