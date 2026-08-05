import React, { useState, useEffect, use } from "react";
import ReusableForm from "../Form";
import axios from "axios";
import TermsMultiSelect from "../TermsMultiSelect";
import useTermTypes from "../../hooks/useTermTypes";
// import ItemSelectionEngine from "../ItemSelectionEngine";
import PurchaseOrderItems from "./PurchaseOrderItems";

const AddPoForm = ({ open, onClose, baseApi, po, onSuccess, token }) => {

    // term types are needed to get the correct terms for payment and delivery
    const { getOrCreateTermTypeId } = useTermTypes({ baseApi, token });
    const [loading, setLoading] = useState(false);
    const [paymentTypeId, setPaymentTypeId] = useState(null);
    const [deliveryTypeId, setDeliveryTypeId] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [branches, setBranches] = useState([]);
    const [sites, setSites] = useState([]);
    const [step, setStep] = useState(1);
    const [poNumber, setPoNumber] = useState("");  // Add state for PO number
    const [poVersion, setPoVersion] = useState(1);  // Add state for PO version

    // Reset step when modal opens
    useEffect(() => {
        if (open) {
            setStep(1);
        }
    }, [open]);

        // Step validation functions
    const validateStep1 = () => {
        if (!formData.vendor) {
            alert("Vendor is required");
            return false;
        }
        if (!formData.branch) {
            alert("Branch is required");
            return false;
        }
        if (!formData.book_no) {
            alert("Book No is required");
            return false;
        }
        if (!formData.po_date) {
            alert("PO Date is required");
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        if (!formData.products || formData.products.length === 0) {
            alert("At least one product is required");
            return false;
        }
        return true;
    };

    useEffect(() => {
        const initTypes = async () => {
            const paymentId = await getOrCreateTermTypeId("Po Payment", "Terms of Payment");
            const deliveryId = await getOrCreateTermTypeId("Delivery", "Terms of Delivery");

            setPaymentTypeId(paymentId);
            setDeliveryTypeId(deliveryId);
        };

        if (open) {
            initTypes();
        }
    }, [open]);
    // ------------------------------


    const [formData, setFormData] = useState({
        vendor: "",
        branch: "",
        site: "",
        delivery_destination: "",
        book_no: "",
        po_date: "",
        quotation_ref_no: "",
        quotation_date: "",
        contact_name: "",
        contact_no: "",
        note:"",
        gst_percentage: 18,
        gst_type: "exclusive",
        transport_charges: 0,
        round_off: 0,

        products: [],

        payment_terms: [],
        delivery_terms: [],
    });

    // If editing existing PO
    useEffect(() => {
        if (po) {
            // Set PO number and version for heading
            setPoNumber(po.purchase_order_no || "");
            setPoVersion(po.version || 1);

            const paymentTerms =
                po.terms_conditions_details
                    ?.filter(t => t.terms_condition_type_name === "Po Payment")
                    .map(t => t.id) || [];

            const deliveryTerms =
                po.terms_conditions_details
                    ?.filter(t => t.terms_condition_type_name === "Delivery")
                    .map(t => t.id) || [];

            setFormData({
                vendor: po.vendor || "",
                branch: po.branch || "",
                delivery_destination: po.delivery_destination || "",
                site: po.site || "",
                book_no: po.book_no || "",
                po_date: po.po_date || "",
                quotation_ref_no: po.quotation_ref_no || "",
                quotation_date: po.quotation_date || "",
                contact_name: po.contact_name || "",
                contact_no: po.contact_no || "",
                gst_percentage: po.gst_percentage || 18,
                gst_type: po.gst_type || "exclusive",
                transport_charges: po.transport_charges || 0,
                round_off: po.round_off || 0,
                note: po.note || "",
                products: po.products || [],
                payment_terms: paymentTerms,
                delivery_terms: deliveryTerms,
            });
        } else {
            setFormData({
                vendor: "",
                branch: "",
                delivery_destination: "",
                site: "",
                book_no: "",
                po_date: "",
                quotation_ref_no: "",
                quotation_date: "",
                contact_name: "",
                contact_no: "",
                gst_percentage: 18,
                gst_type: "exclusive",
                transport_charges: 0,
                round_off: 0,
                products: [],
                payment_terms: [],
                delivery_terms: [],
                note: "",
            });
        }
    }, [po, open]);

    // Fetch vendors, branches, sites for select options (if needed)
    const fetchVendors = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${baseApi}/inventory/vendors/`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });

            // Handle both paginated (results) and non-paginated (direct array) responses
            const vendorData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setVendors(vendorData);
            console.log("vendors", vendorData);
        } catch (error) {
            console.error("Error fetching vendors:", error);
        } finally {
            setLoading(false);
        }
    }

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${baseApi}/auth/branch/`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            // Handle both paginated (results) and non-paginated (direct array) responses
            const branchData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setBranches(branchData);
            
            // Set first branch as default if not editing and branches exist
            if (!po && branchData.length > 0 && !formData.branch) {
                setFormData(prev => ({
                    ...prev,
                    branch: branchData[0].id
                }));
            }
        } catch (error) {
            console.error("Error fetching branches:", error);
        }

        finally {
            setLoading(false);
        }
    }


    const fetchSites = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${baseApi}/auth/site/`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
            setSites(response.data.results || response.data); // Handle both paginated (results) and non-paginated (direct array) responses
            const siteData = Array.isArray(response.data) ? response.data : (response.data.results || []);
            setSites(siteData);
        } catch (error) {
            console.error("Error fetching sites:", error);
        }

        finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        if (open) {
            fetchVendors();
            fetchBranches();
            fetchSites();
        }
    }, [open]);

    // Define form fields configuration

    // Step 1 Fields - Basic Information
    const step1Fields = [
        {
            name: "vendor",
            label: "Vendor",
            type: "select",
            required: true,
            placeholder: "Select Vendor",
            options: vendors.map(vendor => ({
                value: vendor.id,
                label: vendor.name
            })),
        },
        {
            name: "branch",
            label: "Branch",  // Add required indicator
            type: "select",
            placeholder: "Select Branch",
            required: true,  // Mark as required
            options: branches.map(branch => ({
                value: branch.id,
                label: branch.name
            })),
        },
        {
            name: "delivery_destination",
            label: "Delivery Destination",
            type: "select",
            options: [
                { value: "branch", label: "Branch" },
                { value: "site", label: "Site" },
            ],
            required: true,

        },
        {
            name: "site",
            label: "Site",
            type: "select",
            required: false,
            placeholder: "Select Site",
            options: sites.map(site => ({
                value: site.id,
                label: site.name
            })),
        },
        {
            name: "book_no",
            label: "Book No",
            type: "text",
            required: true,
            placeholder: "Enter Book No",
        },
        {
            name: "po_date",
            label: "PO Date",
            type: "date",
            required: true,
        },
        {
            name: "quotation_ref_no",
            label: "Quotation Ref No",
            type: "text",
            required: false,
            placeholder: "Enter Quotation Ref No",
        },
        {
            name: "quotation_date",
            label: "Vendor Quotation Date",
            type: "date",
            required: false,
        },
        {
            name: "contact_name",
            label: "Contact Name",
            type: "text",
            required: false,
            placeholder: "Enter Contact Name",
        },
        {
            name: "contact_no",
            label: "Contact No",
            type: "text",
            required: false,
            placeholder: "Enter 10-digit Contact No",
            pattern: "^[0-9]{10}$",
            minLength: 10,
            maxLength: 10,
            validation: (value) => {
                if (!value) return true; // Optional field
                if (!/^\d{10}$/.test(value)) {
                    return "Contact number must be exactly 10 digits";
                }
                return true;
            }
        },
    ];

    // Step 2 Fields - Products
    const step2Fields = [
        {
            name: "products_section",
            label: "Items",
            component: () => (
                <PurchaseOrderItems
                    baseApi={baseApi}
                    token={token}
                    initialProducts={formData.products || []}
                    onProductsChange={(products) =>
                        setFormData(prev => ({
                            ...prev,
                            products
                        }))
                    }
                />
            ),
            gridCols: 2,
        },
    ];

    // Step 3 Fields - Financial & Terms
    const step3Fields = [
        {
            name: "gst_percentage",
            label: "GST %",
            type: "number",
        },
        {
            name: "gst_type",
            label: "GST Type",
            type: "select",
            options: [
                { value: "exclusive", label: "Exclusive" },
                { value: "inclusive", label: "Inclusive" },
            ],
        },
        {
            name: "transport_charges",
            label: "Transport Charges",
            type: "number",
        },
        {
            name: "round_off",
            label: "Round Off",
            type: "number",
        },
        {
            name: "note",
            label: "Note",
            type: "textarea",
             gridCols: 2,
        },

        // Terms MultiSelects
        {
            name: "payment_terms",
            component: ({ value, onChange }) => (
                <TermsMultiSelect
                    label="Payment Terms"
                    value={value}
                    onChange={onChange}
                    termsType={paymentTypeId}
                    baseApi={baseApi}
                    token={token}
                    display = "Terms of Payment"
                />
            ),
            gridCols: 2,
        },
        {
            name: "delivery_terms",
            component: ({ value, onChange }) => (
                <TermsMultiSelect
                    label= "Delivery Terms"
                    value={value}
                    onChange={onChange}
                    termsType={deliveryTypeId}
                    baseApi={baseApi}
                    token={token}
                    display = "Terms of Delivery"
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
    // const handleSubmit = async (data) => {
    //     try {
    //         setLoading(true);

    //         const payload = {
    //             vendor: data.vendor,
    //             branch: data.branch,
    //             site: data.site,
    //             book_no: data.book_no,
    //             po_date: data.po_date,
    //             quotation_ref_no: data.quotation_ref_no,
    //             quotation_date: data.quotation_date,
    //             contact_name: data.contact_name,
    //             contact_no: data.contact_name,

    //             gst_percentage: data.gst_percentage,
    //             gst_type: data.gst_type,
    //             transport_charges: data.transport_charges,
    //             round_off: data.round_off,

    //             terms_conditions: [
    //                 ...(data.payment_terms || []),
    //                 ...(data.delivery_terms || [])
    //             ],

    //             products: data.products
    //         };

    //         const config = {
    //             headers: {
    //                 "Content-Type": "application/json",
    //                 ...(token ? { Authorization: `Bearer ${token}` } : {})
    //             }
    //         };

    //         if (po) {
    //             await axios.put(`${baseApi}/inventory/purchase-orders/${po.id}/`, payload, config);

    //         } else {
    //             await axios.post(`${baseApi}/inventory/purchase-orders/`, payload, config);
    //         }

    //         onSuccess && onSuccess();
    //         onClose && onClose();

    //     } catch (error) {
    //         console.error("Error saving PO:", error.response?.data || error);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const handleSubmit = async (data) => {
        try {
            setLoading(true);

            const payload = {
                vendor: data.vendor,
                branch: data.branch || null,
                delivery_destination: data.delivery_destination,
                site: data.site || null,
                book_no: data.book_no,
                po_date: data.po_date,
                quotation_ref_no: data.quotation_ref_no || null,
                quotation_date: data.quotation_date || null,
                contact_name: data.contact_name,
                contact_no: data.contact_no,
                note: data.note,
                gst_percentage: data.gst_percentage,
                gst_type: data.gst_type,
                transport_charges: data.transport_charges,
                round_off: data.round_off,

                terms_conditions: [
                    ...(data.payment_terms || []).map(t => t.id || t),
                    ...(data.delivery_terms || []).map(t => t.id || t)
                ],

                products: formData.products
            };

            console.log("PO PAYLOAD:", payload);

            const config = {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            };

            let response;

            if (po) {
                response = await axios.put(`${baseApi}/inventory/purchase-orders/${po.id}/`, payload, config);
            } else {
                response = await axios.post(`${baseApi}/inventory/purchase-orders/`, payload, config);
            }

            onSuccess && onSuccess(response.data);
            onClose && onClose();

        } catch (error) {
            console.error("Error saving PO:", error.response?.data || error);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

       return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg max-h-[90vh] flex flex-col">

                {/* Header with Step Indicator */}
                <div className="sticky top-0 bg-white z-10 border-b px-6 py-4">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold">
                            {po ? (poNumber ? `${poNumber} (v${poVersion}) - Edit Purchase Order` : "Edit Purchase Order") : "Add Purchase Order"}
                        </h2>
                        <button
                            onClick={onClose}
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
                            <span className="ml-2">Basic Info</span>
                        </div>
                        <div className={`w-8 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                        <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                                2
                            </div>
                            <span className="ml-2">Products</span>
                        </div>
                        <div className={`w-8 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                        <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                                3
                            </div>
                            <span className="ml-2">Terms & Pricing</span>
                        </div>
                    </div>
                </div>

                {/* Scrollable Body */}
                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <ReusableForm
                        fields={getCurrentFields()}
                        formData={formData}
                        onChange={setFormData}
                        onSubmit={step === 3 ? handleSubmit : (step === 1 && validateStep1) ? () => setStep(2) : (step === 2 && validateStep2) ? () => setStep(3) : () => {}}
                        loading={loading}
                        showCancel={true}
                        onCancel={step > 1 ? () => setStep(step - 1) : onClose}
                        submitText={step === 3 ? (po ? "Update" : "Submit") : "Next"}
                        cancelText={step > 1 ? "Back" : "Cancel"}
                    />
                </div>

            </div>
        </div>
    );
};

export default AddPoForm;