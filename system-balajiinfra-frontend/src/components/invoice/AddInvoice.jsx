import { useEffect, useState } from "react";
import axios from "axios";
import ItemSelectionEngine from "../ItemSelectionEngine";
import TermsMultiSelect from "../TermsMultiSelect";
import useTermTypes from "../../hooks/useTermTypes";
import ReusableForm from "../Form";
import Swal from "sweetalert2";


const BASE_API =
  import.meta.env.VITE_BASE_API_URL;

const api = axios.create({
  baseURL: `${BASE_API}/`,
});



api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access") ||
    localStorage.getItem("access_token");

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const normalize = (data) =>
  Array.isArray(data) ? data : data?.results || [];



const STATES = [
  { name: "Andhra Pradesh", code: "37" },
  { name: "Arunachal Pradesh", code: "12" },
  { name: "Assam", code: "18" },
  { name: "Bihar", code: "10" },
  { name: "Chhattisgarh", code: "22" },
  { name: "Goa", code: "30" },
  { name: "Gujarat", code: "24" },
  { name: "Haryana", code: "06" },
  { name: "Himachal Pradesh", code: "02" },
  { name: "Jharkhand", code: "20" },
  { name: "Karnataka", code: "29" },
  { name: "Kerala", code: "32" },
  { name: "Madhya Pradesh", code: "23" },
  { name: "Maharashtra", code: "27" },
  { name: "Manipur", code: "14" },
  { name: "Meghalaya", code: "17" },
  { name: "Mizoram", code: "15" },
  { name: "Nagaland", code: "13" },
  { name: "Odisha", code: "21" },
  { name: "Punjab", code: "03" },
  { name: "Rajasthan", code: "08" },
  { name: "Sikkim", code: "11" },
  { name: "Tamil Nadu", code: "33" },
  { name: "Telangana", code: "36" },
  { name: "Tripura", code: "16" },
  { name: "Uttar Pradesh", code: "09" },
  { name: "Uttarakhand", code: "05" },
  { name: "West Bengal", code: "19" },
];


export default function AddInvoice({ id, onBack, initialDraft = null, amcContractId = null, sparePartIds = [] }) {

  const { getOrCreateTermTypeId, loading } = useTermTypes({
    baseApi: BASE_API,
    token: localStorage.getItem("access")
  });

  const isEdit = !!id;
  const isAmcDraft = Boolean(initialDraft && !isEdit);

  // Step state for multistep form
  const [step, setStep] = useState(1);

  // Reset step when component mounts
  useEffect(() => {
    setStep(1);
  }, [id]);

  // ================= FORM DATA STATE =================
  const [formData, setFormData] = useState({
    // Customer info
    customer_phone: "",
    customer_name: "",
    customer_id: "",

    // Invoice header
    invoice_date: new Date().toISOString().split('T')[0],
    branch: "",
    site: "",
    gst_type: "CGST_SGST",

    // Buyer information
    buyer_address: "",
    buyer_gstin: "",
    buyer_state: "",
    buyer_state_code: "",

    // Ship to
    ship_to_address: "",
    same_as_buyer: true,

    // Additional info
    delivery_note: "",
    delivery_note_date: "",
    delivery_chalan_date: "",
    supplier_ref: "",
    other_references: "",
    buyer_order_no: "",
    buyer_dated: "",
    dispatch_doc_no: "",
    dispatched_through: "",
    destination: "",
    work_description: "",

    // Company/Bank details
    bank_name: "",
    account_no: "",
    ifsc_code: "",
    declaration: ""
  });

  // ================= MASTER DATA =================
  const [sites, setSites] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading_form, setLoadingForm] = useState(false);


  // ================= TERMS AND CONDITIONS =================
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [deliveryTerms, setDeliveryTerms] = useState([]);
  const [otherTerms, setOtherTerms] = useState([]);
  const [paymentTypeId, setPaymentTypeId] = useState(null);
  const [deliveryTypeId, setDeliveryTypeId] = useState(null);
  const [otherTypeId, setOtherTypeId] = useState(null);

  // ================= ITEMS =================
  const [items, setItems] = useState([]);
  const [lowItems, setLowItems] = useState([]);

  // ================= STATE SEARCH =================
  const [stateSearch, setStateSearch] = useState("");
  const [showStateList, setShowStateList] = useState(false);
  const filteredStates = STATES.filter(s =>
    s.name.toLowerCase().includes(stateSearch.toLowerCase())
  );

  // ================= LOAD MASTER DATA =================
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        // Load sites
        const siteRes = await api.get("auth/site/");
        setSites(normalize(siteRes.data));

        // Load branches
        const branchRes = await api.get("auth/branch/");
        setBranches(normalize(branchRes.data));
      } catch (err) {
        console.log("Error loading master data:", err);
      }
    };

    loadMasterData();
  }, []);

  // ================= INITIALIZE TERM TYPES =================
  useEffect(() => {
    if (loading) return;

    const initTypes = async () => {
      const paymentId = await getOrCreateTermTypeId(
        "Invoice Payment",
        "Terms of Payment"
      );

      const deliveryId = await getOrCreateTermTypeId(
        "Invoice Delivery",
        "Terms of Delivery"
      );

      const otherId = await getOrCreateTermTypeId(
        "Invoice Other",
        "Other Terms"
      );

      setPaymentTypeId(paymentId);
      setDeliveryTypeId(deliveryId);
      setOtherTypeId(otherId);
    };

    initTypes();
  }, [loading]);

  // ================= EDIT LOAD =================
  useEffect(() => {
    if (!isEdit || !paymentTypeId || !deliveryTypeId || !otherTypeId) return;

    const loadInvoiceData = async () => {
      try {
        const res = await api.get(`invoice/invoice/${id}/`);
        const inv = res.data;

        // Set form data
        setFormData({
          customer_phone: inv.customer_phone || "",
          customer_name: inv.buyer_name || "",
          customer_id: inv.customer || "",
          invoice_date: inv.invoice_date,
          branch: inv.branch || "",
          site: inv.site || "",
          gst_type: inv.gst_type,
          buyer_address: inv.buyer_address || "",
          buyer_gstin: inv.buyer_gstin || "",
          buyer_state: inv.buyer_state || "",
          buyer_state_code: inv.buyer_state_code || "",
          ship_to_address: inv.ship_to_address || "",
          same_as_buyer: !inv.ship_to_address,
          delivery_note: inv.delivery_note || "",
          delivery_note_date: inv.delivery_note_date || "",
          delivery_chalan_date: inv.delivery_chalan_date || "",
          supplier_ref: inv.supplier_ref || "",
          other_references: inv.other_references || "",
          buyer_order_no: inv.buyer_order_no || "",
          dispatch_doc_no: inv.dispatch_doc_no || "",
          dispatched_through: inv.dispatched_through || "",
          destination: inv.destination || "",
          work_description: inv.work_description || "",
          bank_name: inv.bank_name || "",
          account_no: inv.account_no || "",
          ifsc_code: inv.ifsc_code || "",
          declaration: inv.declaration || ""
        });

        // Load Terms
        if (inv.terms_conditions_details) {
          const payment = inv.terms_conditions_details
            .filter(t => t.terms_condition_type_name === "Invoice Payment")
            .map(t => t.id);

          const delivery = inv.terms_conditions_details
            .filter(t => t.terms_condition_type_name === "Invoice Delivery")
            .map(t => t.id);

          const other = inv.terms_conditions_details
            .filter(t => t.terms_condition_type_name === "Invoice Other")
            .map(t => t.id);

          console.log("📋 Loading Terms:", {
            payment,
            delivery,
            other,
            allTerms: inv.terms_conditions_details
          });

          setPaymentTerms(payment);
          setDeliveryTerms(delivery);
          setOtherTerms(other);
        }

        // Set items
        const highItems = inv.high_side_items || [];
        const lowItemsList = inv.low_side_items || [];

        // In the loadInvoiceData function, update the items mapping:
setItems(highItems.map(i => ({
    product_id: i.product_data?.id || null,
    product_name: i.product_data?.name || i.ac_type_name || i.variant_sku || "",
    variant_sku: i.product_data?.sku || i.variant_sku || "",
    product_variant: i.product_data?.id || i.product_variant || "",
    description: i.description,
    hsn_sac: i.hsn_sac,
    quantity: i.quantity,
    unit: i.unit,
    rate: i.unit_price,
    gst_percent: i.gst_percent,
    category: i.product_data?.category || "",
    mathadi_charges: i.mathadi_charges || 0,
    transportation_charges: i.transportation_charges || 0
})));

setLowItems(lowItemsList.map(i => ({
    item: i.item_data?.id || i.item || "",
    item_code: i.item_data?.item_code || i.item_code || "",
    item_name: i.item_data?.name || "",
    description: i.description,
    hsn_sac: i.hsn_sac,
    quantity: i.quantity,
    unit: i.unit,
    rate: i.unit_price,
    gst_percent: i.gst_percent,
    mathadi_charges: i.mathadi_charges || 0
})));
      } catch (err) {
        console.log("Error loading invoice:", err);
      }
    };

    loadInvoiceData();
  }, [id, paymentTypeId, deliveryTypeId, otherTypeId]);

  // ================= AMC SPARE PARTS DRAFT PREFILL =================
  useEffect(() => {
    if (!initialDraft || isEdit) return;

    setFormData((prev) => ({
      ...prev,
      customer_phone: initialDraft.customer_phone || "",
      customer_name: initialDraft.customer_name || "",
      customer_id: initialDraft.customer_id || "",
      buyer_address: initialDraft.buyer_address || "",
      buyer_gstin: initialDraft.buyer_gstin || "",
      buyer_state: initialDraft.buyer_state || "",
      ship_to_address: initialDraft.buyer_address || "",
      same_as_buyer: true,
      work_description: initialDraft.work_description || "",
    }));

    setLowItems(
      (initialDraft.low_side_items || []).map((i) => ({
        item: i.item,
        item_code: i.item_code,
        description: i.description || "",
        hsn_sac: i.hsn_sac || "",
        quantity: i.quantity,
        unit: i.unit || "Nos",
        rate: i.rate,
        gst_percent: i.gst_percent,
      }))
    );
    setStep(1);
  }, [initialDraft, isEdit]);

  // ================= CUSTOMER SEARCH =================
  const handlePhoneSearch = async (phone) => {
    if (phone.length >= 10) {
      try {
        const res = await api.get(`lead/customer/?search=${phone}`);
        const data = normalize(res.data);

        if (data.length > 0) {
          const cust = data[0];
          setFormData(prev => ({
            ...prev,
            customer_phone: phone,
            customer_name: cust.name,
            customer_id: cust.id,
            buyer_address: cust.address || "",
            buyer_gstin: cust.gstin || "",
            buyer_state: cust.state || "",
            buyer_state_code: cust.state_code || "",
            ship_to_address: prev.same_as_buyer ? (cust.address || "") : prev.ship_to_address
          }));
        }
      } catch (err) {
        console.log("Error searching customer:", err);
      }
    }
  };

  // ================= STATE CHANGE HANDLER =================
  const handleStateChange = (value) => {
    setStateSearch(value);

    const found = STATES.find(
      s => s.name.toLowerCase() === value.toLowerCase()
    );

    if (found) {
      setFormData(prev => ({
        ...prev,
        buyer_state: found.name,
        buyer_state_code: found.code
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        buyer_state: value
      }));
    }
  };

  // ================= SHIP TO TOGGLE =================
  const handleShipToToggle = (checked) => {
    setFormData(prev => ({
      ...prev,
      same_as_buyer: checked,
      ship_to_address: checked ? prev.buyer_address : ""
    }));
  };

  // ================= RESET FORM =================
  const resetForm = () => {
    setFormData({
      customer_phone: "",
      customer_name: "",
      customer_id: "",
      invoice_date: new Date().toISOString().split('T')[0],
      branch: "",
      site: "",
      gst_type: "CGST_SGST",
      buyer_address: "",
      buyer_gstin: "",
      buyer_state: "",
      buyer_state_code: "",
      ship_to_address: "",
      same_as_buyer: true,
      delivery_note: "",
      delivery_note_date: "",
      delivery_chalan_date: "",
      supplier_ref: "",
      other_references: "",
      buyer_order_no: "",
      buyer_dated: "",
      dispatch_doc_no: "",
      dispatched_through: "",
      destination: "",
      work_description: "",
      bank_name: "",
      account_no: "",
      ifsc_code: "",
      declaration: ""
    });

    setPaymentTerms([]);
    setDeliveryTerms([]);
    setOtherTerms([]);

    setItems([{
      acType: "",
      subType: "",
      brand: "",
      model: "",
      product_variant: "",
      description: "",
      hsn_sac: "",
      quantity: 1,
      unit: "NOS",
      rate: 0,
      gst_percent: 18
    }]);

    setLowItems([{
      material_type_id: "",
      item_type_id: "",
      feature_type_id: "",
      item_class_id: "",
      item: "",
      description: "",
      hsn_sac: "",
      quantity: 1,
      unit: "NOS",
      rate: 0,
      gst_percent: 18
    }]);
  };

  // ================= SUBMIT =================
  const handleSubmit = async (data) => {
    // Validation
    if (!data.customer_id) {
        Swal.fire({ icon: "error", title: "Validation", text: "Please search and select a customer" });
        return;
    }
    if (items.length === 0 && lowItems.length === 0) {
        Swal.fire({ icon: "error", title: "Validation", text: "Please add at least one item" });
        return;
    }

    setLoadingForm(true);

    const payload = {
        customer: data.customer_id ? Number(data.customer_id) : null,
        site: data.site || null,
        branch: data.branch || null,
        terms_conditions: [
            ...paymentTerms,
            ...deliveryTerms,
            ...otherTerms
        ],

        invoice_date: data.invoice_date,

        // Buyer snapshot
        buyer_name: data.customer_name,
        buyer_address: data.buyer_address,
        buyer_gstin: data.buyer_gstin,
        buyer_state: data.buyer_state,
        buyer_state_code: data.buyer_state_code,

        // Ship to
        ship_to_address: data.ship_to_address,

        // Company snapshot
        bank_name: data.bank_name,
        account_no: data.account_no,
        ifsc_code: data.ifsc_code,
        declaration: data.declaration,

        // Header fields
        delivery_note: data.delivery_note || "",
        delivery_note_date: data.delivery_note_date || null,
        delivery_chalan_date: data.delivery_chalan_date || null,
        supplier_ref: data.supplier_ref || "",
        other_references: data.other_references || "",
        buyer_order_no: data.buyer_order_no || "",
        buyer_dated: data.buyer_dated || null,
        dispatch_doc_no: data.dispatch_doc_no || "",
        dispatched_through: data.dispatched_through || "",
        destination: data.destination || "",
        work_description: data.work_description || "",

        // GST Type
        gst_type: data.gst_type,

        high_side_items: items.map(i => ({
            product_data: {
                id: i.product_id || i.product_variant || null,
                name: i.product_name || i.variant_sku || i.ac_type_name || "",
                sku: i.variant_sku || "",
                category: i.category || "",
                hsn_code: i.hsn_sac || "",
                gst_percentage: i.gst_percent || 0,
            },
            quantity: Number(i.quantity),
            unit_price: Number(i.rate || i.unit_price || 0),
            gst_percent: Number(i.gst_percent || 0),
            unit: i.unit || "NOS",
            mathadi_charges: Number(i.mathadi_charges || 0),
            transportation_charges: Number(i.transportation_charges || 0),
            description: i.description || "",
            hsn_sac: i.hsn_sac || ""
        })),

        low_side_items: lowItems.map(l => ({
            item_data: {
                id: l.item || null,
                item_code: l.item_code || "",
                name: l.item_name || l.material_name || l.item_code || "",
                description: l.description || "",
            },
            quantity: Number(l.quantity),
            unit_price: Number(l.rate || l.unit_price || 0),
            gst_percent: Number(l.gst_percent || 0),
            unit: l.unit || "NOS",
            mathadi_charges: Number(l.mathadi_charges || 0),
            description: l.description || "",
            hsn_sac: l.hsn_sac || ""
        }))
    };

    try {
        if (isEdit) {
            await api.put(`invoice/invoice/${id}/`, payload);
        } else {
            const res = await api.post("invoice/invoice/", payload);

            if (amcContractId && sparePartIds.length > 0 && res.data?.id) {
                await api.post(
                    `amc/contracts/${amcContractId}/mark_spare_parts_invoiced/`,
                    {
                        invoice_id: res.data.id,
                        spare_part_ids: sparePartIds,
                    }
                );
            }
        }

        Swal.fire({
            icon: "success",
            text: isEdit ? "Invoice updated successfully" : "Invoice created successfully",
            timer: 1200,
            showConfirmButton: false
        });

        resetForm();
        if (onBack) onBack();

    } catch (err) {
        console.log("❌ Error saving invoice:", err.response?.data);
        
        let errorMessage = "Error saving invoice";
        
        if (err.response?.data) {
            const errorData = err.response.data;
            
            if (typeof errorData === 'object') {
                const errorFields = Object.entries(errorData)
                    .map(([field, messages]) => {
                        const msg = Array.isArray(messages) ? messages.join(", ") : messages;
                        return `${field}: ${msg}`;
                    })
                    .join("\n");
                
                errorMessage = errorFields || "Validation error occurred";
            } else if (typeof errorData === 'string') {
                errorMessage = errorData;
            }
        }
        
        Swal.fire({ 
            icon: "error", 
            title: "Error", 
            text: errorMessage,
            width: '600px'
        });
    } finally {
        setLoadingForm(false);
    }
};

  // ================= FIELD DEFINITIONS =================
  const basicInfoFields = [
    {
      name: "customer_phone",
      label: "Customer Phone",
      type: "phone",
      required: true,
      gridCols: 1,
      placeholder: "Enter customer phone",
      component: ({ value, onChange }) => (
        <input
          type="text"
          className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={value}
          onChange={(e) => {
            const phone = e.target.value.replace(/\D/g, "");
            onChange(phone);
            handlePhoneSearch(phone);
          }}
          placeholder="Enter customer phone"
          maxLength={10}
        />
      )
    },
    {
      name: "customer_name",
      label: "Customer Name",
      type: "text",
      disabled: true,
      gridCols: 1,
      placeholder: "Auto-filled from phone search"
    },
    // {
    //   name: "invoice_no",
    //   label: "Invoice Number",
    //   type: "text",
    //   required: true,
    //   gridCols: 1,
    //   placeholder: "Enter invoice number"
    // },
    {
      name: "invoice_date",
      label: "Invoice Date",
      type: "date",
      required: true,
      gridCols: 1
    },
    {
      name: "branch",
      label: "Branch",
      type: "select",
      gridCols: 1,
      placeholder: "Select Branch",
      options: branches.map(branch => ({ value: branch.id, label: branch.name }))
    },
    {
      name: "site",
      label: "Site",
      type: "select",
      gridCols: 1,
      placeholder: "Select Site",
      options: sites.map(site => ({ value: site.id, label: site.name }))
    },
    {
      name: "gst_type",
      label: "GST Type",
      type: "select",
      required: true,
      gridCols: 1,
      options: [
        { value: "CGST_SGST", label: "CGST + SGST" },
        { value: "IGST", label: "IGST" },
        { value: "NO_GST", label: "No GST" }
      ]
    }
  ];

  const buyerInfoFields = [
    {
      name: "buyer_address",
      label: "Buyer Address",
      type: "textarea",
      rows: 2,
      gridCols: 2,
      placeholder: "Enter buyer address"
    },
    {
      name: "buyer_gstin",
      label: "Buyer GSTIN",
      type: "text",
      required: true,
      gridCols: 1,
      placeholder: "Enter 15-character GSTIN",
      component: ({ value, onChange }) => (
        <input
          type="text"
          className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={value}
          onChange={(e) => {
            const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
            onChange(val.slice(0, 15));
          }}
          placeholder="Enter 15-character GSTIN"
          maxLength={15}
        />
      )
    },
    {
      name: "buyer_state",
      label: "Buyer State",
      type: "component",
      gridCols: 1,
      component: ({ value, onChange }) => (
        <div className="relative">
          <input
            className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Select State"
            value={stateSearch || value}
            onChange={(e) => {
              handleStateChange(e.target.value);
              setShowStateList(true);
            }}
            onFocus={() => setShowStateList(true)}
          />
          {showStateList && filteredStates.length > 0 && (
            <div className="absolute z-20 bg-white border w-full max-h-40 overflow-y-auto rounded-md shadow">
              {filteredStates.map((s, i) => (
                <div
                  key={i}
                  className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
                  onClick={() => {
                    setStateSearch(s.name);
                    onChange(s.name);
                    setFormData(prev => ({
                      ...prev,
                      buyer_state: s.name,
                      buyer_state_code: s.code
                    }));
                    setShowStateList(false);
                  }}
                >
                  {s.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      name: "buyer_state_code",
      label: "State Code",
      type: "text",
      disabled: true,
      gridCols: 1,
      placeholder: "Auto-filled"
    }
  ];

  const shipToFields = [
    {
      name: "same_as_buyer",
      label: "Same as Buyer Address",
      type: "checkbox",
      gridCols: 2,
      component: ({ value, onChange }) => (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => {
              onChange(e.target.checked);
              handleShipToToggle(e.target.checked);
            }}
          />
          Same as Buyer Address
        </label>
      )
    },
    {
      name: "ship_to_address",
      label: "Ship To Address",
      type: "textarea",
      rows: 2,
      gridCols: 2,
      disabled: formData.same_as_buyer,
      placeholder: "Enter shipping address"
    }
  ];

  const additionalInfoFields = [
    {
      name: "delivery_note",
      label: "Delivery Note",
      type: "text",
      gridCols: 1,
      placeholder: "Enter delivery note"
    },
    {
      name: "delivery_note_date",
      label: "Delivery Note Date",
      type: "date",
      gridCols: 1
    },
    {
      name: "delivery_chalan_date",
      label: "Delivery Challan Date",
      type: "date",
      gridCols: 1
    },
    {
      name: "supplier_ref",
      label: "Supplier Reference",
      type: "text",
      gridCols: 1,
      placeholder: "Enter supplier reference"
    },
    {
      name: "other_references",
      label: "Other References",
      type: "text",
      gridCols: 1,
      placeholder: "Enter other references"
    },
    {
      name: "buyer_order_no",
      label: "Buyer Order No",
      type: "text",
      gridCols: 1,
      placeholder: "Enter buyer order number"
    },
    {
      name: "buyer_dated",
      label: "Buyer Order Date",
      type: "date",
      gridCols: 1
    },
    {
      name: "dispatch_doc_no",
      label: "Dispatch Document No",
      type: "text",
      gridCols: 1,
      placeholder: "Enter dispatch document number"
    },
    {
      name: "dispatched_through",
      label: "Dispatched Through",
      type: "text",
      gridCols: 1,
      placeholder: "Enter dispatch method"
    },
    {
      name: "destination",
      label: "Destination",
      type: "text",
      gridCols: 1,
      placeholder: "Enter destination"
    },
    {
      name: "work_description",
      label: "Work Description",
      type: "textarea",
      rows: 3,
      gridCols: 2,
      placeholder: "Enter work description"
    }
  ];

  const companyBankFields = [
    {
      name: "bank_name",
      label: "Bank Name",
      type: "text",
      required: true,
      gridCols: 1,
      placeholder: "Enter bank name"
    },
    {
      name: "account_no",
      label: "Account Number",
      type: "text",
      required: true,
      gridCols: 1,
      placeholder: "Enter account number"
    },
    {
      name: "ifsc_code",
      label: "IFSC Code",
      type: "text",
      required: true,
      gridCols: 1,
      placeholder: "Enter IFSC code"
    },
    {
      name: "declaration",
      label: "Declaration",
      type: "textarea",
      rows: 2,
      gridCols: 2,
      placeholder: "Enter declaration"
    }
  ];

  // Step validation functions
  const validateStep1 = () => {
    if (!formData.customer_id) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please search and select a customer" });
      return false;
    }
    if (!formData.buyer_gstin || !formData.buyer_gstin.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Buyer GSTIN is required" });
      return false;
    }
    
    // GSTIN validation - must be exactly 15 characters
    const gstin = formData.buyer_gstin.trim();
    if (gstin.length !== 15) {
      Swal.fire({ icon: "error", title: "Validation", text: "GSTIN must be exactly 15 characters" });
      return false;
    }
    
    // GSTIN format validation (basic pattern check)
    // Format: 2 digits (state code) + 10 alphanumeric (PAN) + 1 digit + 1 letter + 1 alphanumeric
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinPattern.test(gstin)) {
      Swal.fire({ 
        icon: "error", 
        title: "Validation", 
        text: "Invalid GSTIN format. Please enter a valid GSTIN number" 
      });
      return false;
    }
    
    return true;
  };

  const validateStep2 = () => {
    if (items.length === 0 && lowItems.length === 0) {
      Swal.fire({ icon: "error", title: "Validation", text: "Please add at least one item" });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.bank_name || !formData.bank_name.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Bank Name is required" });
      return false;
    }
    if (!formData.account_no || !formData.account_no.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Account Number is required" });
      return false;
    }
    if (!formData.ifsc_code || !formData.ifsc_code.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "IFSC Code is required" });
      return false;
    }
    return true;
  };

  // Step 1 Fields - Basic & Buyer Information
  const step1Fields = [
    ...basicInfoFields,
    // Add a separator or section title
    {
      name: "buyer_section_title",
      label: "Buyer Information",
      type: "component",
      gridCols: 2,
      component: () => (
        <div className="col-span-2 border-t pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Buyer Information</h4>
        </div>
      )
    },
    ...buyerInfoFields,
    // Ship To section
    {
      name: "ship_to_section_title",
      label: "Ship To Information",
      type: "component",
      gridCols: 2,
      component: () => (
        <div className="col-span-2 border-t pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Ship To Information</h4>
        </div>
      )
    },
    ...shipToFields
  ];

  // Step 2 Fields - Items
  const step2Fields = [
    {
      name: "items_section",
      label: "Items",
      component: () => (
        <ItemSelectionEngine
          baseApi={BASE_API}
          authToken={localStorage.getItem("access")}
          items={items}
          setItems={setItems}
          lowItems={lowItems}
          setLowItems={setLowItems}
          mode="invoice"
          gstType={formData.gst_type}
        />
      ),
      gridCols: 2,
    },
  ];

  // Step 3 Fields - Additional Info & Terms
  const step3Fields = [
    // Additional Information section
    {
      name: "additional_section_title",
      label: "Additional Information",
      type: "component",
      gridCols: 2,
      component: () => (
        <div className="col-span-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Additional Information</h4>
        </div>
      )
    },
    ...additionalInfoFields,
    // Company/Bank Details section
    {
      name: "company_section_title",
      label: "Company/Bank Details",
      type: "component",
      gridCols: 2,
      component: () => (
        <div className="col-span-2 border-t pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Company/Bank Details</h4>
        </div>
      )
    },
    ...companyBankFields,
    // Terms & Conditions section
    {
      name: "terms_section_title",
      label: "Terms & Conditions",
      type: "component",
      gridCols: 2,
      component: () => (
        <div className="col-span-2 border-t pt-4 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Terms & Conditions</h4>
        </div>
      )
    },
    {
      name: "payment_terms",
      component: ({ value, onChange }) => (
        <TermsMultiSelect
          label="Payment Terms"
          value={paymentTerms}
          onChange={setPaymentTerms}
          termsType={paymentTypeId}
          baseApi={BASE_API}
          token={localStorage.getItem("access")}
        />
      ),
      gridCols: 2,
    },
    {
      name: "delivery_terms",
      component: ({ value, onChange }) => (
        <TermsMultiSelect
          label="Delivery Terms"
          value={deliveryTerms}
          onChange={setDeliveryTerms}
          termsType={deliveryTypeId}
          baseApi={BASE_API}
          token={localStorage.getItem("access")}
        />
      ),
      gridCols: 2,
    },
    {
      name: "other_terms",
      component: ({ value, onChange }) => (
        <TermsMultiSelect
          label="Other Terms"
          value={otherTerms}
          onChange={setOtherTerms}
          termsType={otherTypeId}
          baseApi={BASE_API}
          token={localStorage.getItem("access")}
        />
      ),
      gridCols: 2,
    },
  ];

  // Get current step fields
  const getCurrentFields = () => {
    switch (step) {
      case 1: return step1Fields;
      case 2: return step2Fields;
      case 3: return step3Fields;
      default: return step1Fields;
    }
  };

  // ================= UI =================
  return (
    <>
      <div className="fixed inset-0 mt-8 bg-black/40 flex items-start sm:items-center justify-center z-50">
        <div className="bg-white rounded-md shadow-lg w-full max-w-5xl relative max-h-[90vh] flex flex-col">

          {/* Header with Step Indicator */}
          <div className="sticky top-0 bg-white z-10 border-b px-6 py-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {isEdit ? "Edit Invoice" : "Create New Invoice"}
              </h2>
              <button
                onClick={onBack}
                className="text-xl font-bold hover:text-red-500"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  1
                </div>
                <span className="ml-2">Basic & Buyer Info</span>
              </div>
              <div className={`w-8 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  2
                </div>
                <span className="ml-2">Items</span>
              </div>
              <div className={`w-8 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                  3
                </div>
                <span className="ml-2">Additional Info & Terms</span>
              </div>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <ReusableForm
              fields={getCurrentFields()}
              formData={formData}
              onChange={setFormData}
              onSubmit={
                step === 1 
                  ? () => { if (validateStep1()) setStep(2); }
                  : step === 2 
                  ? () => { if (validateStep2()) setStep(3); }
                  : () => { if (validateStep3()) handleSubmit(formData); }
              }
              loading={loading_form}
              showCancel={true}
              onCancel={step > 1 ? () => setStep(step - 1) : onBack}
              submitText={step === 3 ? (isEdit ? "Update Invoice" : "Save Invoice") : "Next"}
              cancelText={step > 1 ? "Back" : "Cancel"}
            />
          </div>
        </div>
      </div>
    </>
  );
}