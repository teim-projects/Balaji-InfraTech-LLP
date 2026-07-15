import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import ReusableForm from "../Form";

const AMC_TYPE_OPTIONS = [
  { value: "COMPREHENSIVE", label: "Comprehensive" },
  { value: "NON_COMPREHENSIVE", label: "Non-Comprehensive" },
];

const VISIT_FREQUENCY_OPTIONS = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "HALF_YEARLY", label: "Half Yearly" },
  { value: "YEARLY", label: "Yearly" },
];

const formatAmcTypeLabel = (type) =>
  AMC_TYPE_OPTIONS.find((o) => o.value === type)?.label || type;

const normalizePhone = (phone) => (phone || "").replace(/\D/g, "").slice(-10);

const matchCustomerId = (record, customers) => {
  if (record.customer) return record.customer;

  const recordPhone = normalizePhone(record.customer_contact);
  if (!recordPhone) return null;

  const match = customers.find((c) => {
    const phones = [
      normalizePhone(c.contact_number),
      normalizePhone(c.secondary_contact_number),
      normalizePhone(c.poc_contact_number),
    ].filter(Boolean);
    return phones.includes(recordPhone);
  });

  return match?.id ?? null;
};

const buildAmcCustomerMap = (serviceRecords, customers) => {
  const map = new Map();

  for (const record of serviceRecords) {
    if (record.contract_type !== "amc") continue;

    const customerId = matchCustomerId(record, customers);
    if (!customerId || map.has(customerId)) continue;

    const customer = customers.find((c) => c.id === customerId);
    const name = customer?.name || record.customer_name;
    const typeLabel = record.amc_service_type
      ? formatAmcTypeLabel(record.amc_service_type)
      : "";

    map.set(customerId, {
      customerId,
      customerName: name,
      amcType: record.amc_service_type || "",
      label: typeLabel ? `${name} (${typeLabel})` : name,
    });
  }

  return map;
};

const emptyFormData = {
  customer: "",
  amc_type: "",
  visit_frequency: "QUARTERLY",
  product_name: "",
  product_sku: "",
  product_category: "",
  sale_date: "",
  warranty_end_date: "",
  amc_start_date: "",
  amc_end_date: "",
  status: "ACTIVE",
  amc_cost: "",
  is_renewal: false,
};

export default function AddAmcForm({
  open,
  onClose,
  onSuccess,
  baseApi,
  amc = null,
  token,
}) {
  const [formData, setFormData] = useState(emptyFormData);
  const [loading, setLoading] = useState(false);
  const [amcCustomerMap, setAmcCustomerMap] = useState(new Map());

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      try {
        const [recordsRes, customersRes] = await Promise.all([
          fetch(`${baseApi}/amc/service-records/?contract_type=amc`, { headers }),
          fetch(`${baseApi}/quotation/customer/`, { headers }),
        ]);

        let records = [];
        let customers = [];

        if (recordsRes.ok) {
          const data = await recordsRes.json();
          records = data.results || data || [];
        }
        if (customersRes.ok) {
          const data = await customersRes.json();
          customers = data.results || data || [];
        }

        setAmcCustomerMap(buildAmcCustomerMap(records, customers));
      } catch (err) {
        console.error("Error fetching dropdowns:", err);
      }
    };

    fetchData();
  }, [open, baseApi, token]);

  useEffect(() => {
    if (!amc || !open) {
      setFormData(emptyFormData);
      return;
    }

    setFormData({
      customer: amc.customer || "",
      amc_type: amc.amc_type || "",
      visit_frequency: amc.visit_frequency || "QUARTERLY",
      product_name: amc.product_data?.name || "",
      product_sku: amc.product_data?.sku || "",
      product_category: amc.product_data?.category || "",
      sale_date: amc.sale_date || "",
      warranty_end_date: amc.warranty_end_date || "",
      amc_start_date: amc.amc_start_date || "",
      amc_end_date: amc.amc_end_date || "",
      status: amc.status || "ACTIVE",
      amc_cost: amc.amc_cost || "",
      is_renewal: amc.is_renewal || false,
    });
  }, [amc, open]);

  useEffect(() => {
    if (formData.sale_date && !formData.warranty_end_date) {
      const sale = new Date(formData.sale_date);
      sale.setFullYear(sale.getFullYear() + 1);
      const formattedWarrantyEnd = sale.toISOString().split("T")[0];
      setFormData((prev) => ({
        ...prev,
        warranty_end_date: formattedWarrantyEnd,
        amc_start_date: formattedWarrantyEnd,
      }));
    }
  }, [formData.sale_date]);

  useEffect(() => {
    if (formData.amc_start_date && !formData.amc_end_date) {
      const start = new Date(formData.amc_start_date);
      start.setFullYear(start.getFullYear() + 1);
      start.setDate(start.getDate() - 1);
      const formattedAmcEnd = start.toISOString().split("T")[0];
      setFormData((prev) => ({
        ...prev,
        amc_end_date: formattedAmcEnd,
      }));
    }
  }, [formData.amc_start_date]);

  const handleFormChange = (newData) => {
    if (String(newData.customer) !== String(formData.customer)) {
      const entry = amcCustomerMap.get(parseInt(newData.customer, 10));
      if (entry?.amcType) {
        newData = { ...newData, amc_type: entry.amcType };
      }
    }
    setFormData(newData);
  };

  if (!open) return null;

  const customerOptions = (() => {
    const options = Array.from(amcCustomerMap.values()).map((entry) => ({
      value: entry.customerId,
      label: entry.label,
    }));

    if (amc?.customer && !options.some((o) => String(o.value) === String(amc.customer))) {
      options.unshift({
        value: amc.customer,
        label: amc.customer_name || `Customer #${amc.customer}`,
      });
    }

    return options;
  })();

  const validate = () => {
    if (!formData.customer) {
      Swal.fire({ icon: "error", title: "Validation", text: "Customer is required" });
      return false;
    }
    if (!formData.amc_type) {
      Swal.fire({ icon: "error", title: "Validation", text: "Type of AMC is required" });
      return false;
    }
    if (!formData.product_name) {
      Swal.fire({ icon: "error", title: "Validation", text: "Product Name is required" });
      return false;
    }
    if (!formData.amc_cost || isNaN(parseFloat(formData.amc_cost))) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please enter a valid AMC cost" });
      return false;
    }
    return true;
  };

  const formatBackendErrors = (errorData) => {
    if (typeof errorData === "string") return errorData;
    if (errorData.detail) return errorData.detail;
    if (typeof errorData === "object" && errorData !== null) {
      return Object.entries(errorData)
        .map(([field, msgs]) => {
          const fieldName = field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const message = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
          return `${fieldName}: ${message}`;
        })
        .join("\n");
    }
    return "An unexpected error occurred.";
  };

  const handleSubmit = async (data) => {
    if (!validate()) return;

    setLoading(true);
    try {
      const productData = {
        name: data.product_name,
        sku: data.product_sku || "",
        category: data.product_category || "",
      };

      const payload = {
        ...data,
        customer: parseInt(data.customer, 10),
        amc_type: data.amc_type,
        product_data: productData,
        amc_cost: parseFloat(data.amc_cost),
      };

      const url = amc ? `${baseApi}/amc/contracts/${amc.id}/` : `${baseApi}/amc/contracts/`;
      const method = amc ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(formatBackendErrors(errorData));
      }

      Swal.fire({
        icon: "success",
        text: amc ? "Contract updated successfully" : "Contract created successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      onSuccess && onSuccess();
      onClose && onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to save AMC contract" });
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      name: "customer",
      label: "Customer (AMC Service Records only)",
      type: "searchable_select",
      required: true,
      placeholder: customerOptions.length
        ? "Search customer from AMC service records..."
        : "No AMC service management customers found",
      options: customerOptions,
      gridCols: 1,
    },
    {
      name: "amc_type",
      label: "Type of AMC",
      type: "select",
      required: true,
      options: AMC_TYPE_OPTIONS,
      gridCols: 1,
    },
    {
      name: "visit_frequency",
      label: "Frequency of Visit",
      type: "select",
      required: true,
      options: VISIT_FREQUENCY_OPTIONS,
      gridCols: 1,
    },
    {
      name: "product_name",
      label: "Product Name",
      type: "text",
      required: true,
      placeholder: "e.g., Split AC 1.5 Ton",
      gridCols: 1,
    },
    {
      name: "product_sku",
      label: "Product SKU (optional)",
      type: "text",
      placeholder: "Enter SKU",
      gridCols: 1,
    },
    {
      name: "product_category",
      label: "Product Category (optional)",
      type: "text",
      placeholder: "e.g., AC, TV, Software",
      gridCols: 1,
    },
    {
      name: "amc_cost",
      label: "AMC Cost (INR)",
      type: "number",
      required: true,
      placeholder: "e.g., 5000",
      gridCols: 1,
    },
    {
      name: "sale_date",
      label: "Sale / Installation Date",
      type: "date",
      required: true,
      gridCols: 1,
    },
    {
      name: "warranty_end_date",
      label: "Warranty End Date",
      type: "date",
      required: true,
      gridCols: 1,
    },
    {
      name: "amc_start_date",
      label: "AMC Start Date",
      type: "date",
      required: true,
      gridCols: 1,
    },
    {
      name: "amc_end_date",
      label: "AMC End Date",
      type: "date",
      required: true,
      gridCols: 1,
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
        { value: "EXPIRED", label: "Expired" },
        { value: "CANCELLED", label: "Cancelled" },
      ],
      gridCols: 1,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-md shadow-lg w-full max-w-3xl relative max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">{amc ? "Edit AMC Contract" : "Create AMC Contract"}</h2>
          <button onClick={onClose} className="text-xl font-bold hover:text-red-500">✕</button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {customerOptions.length === 0 && !amc && (
            <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Add a Service Management record with Contract Type &quot;AMC&quot; first. Only those customers appear here.
            </p>
          )}
          <ReusableForm
            fields={fields}
            formData={formData}
            onChange={handleFormChange}
            onSubmit={handleSubmit}
            loading={loading}
            submitText={amc ? "Update" : "Save"}
            onCancel={onClose}
            showCancel={true}
          />
        </div>
      </div>
    </div>
  );
}