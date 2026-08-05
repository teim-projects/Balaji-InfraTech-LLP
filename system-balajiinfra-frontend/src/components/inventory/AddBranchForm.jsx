import { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import ReusableForm from "../Form";
import { StateSelect } from "react-country-state-city";
import "react-country-state-city/dist/react-country-state-city.css";
import { GetState } from "react-country-state-city";

// ========== GST State Code Mapping ==========
const INDIAN_STATES_GST = {
  "Jammu and Kashmir": { code: "JK", gst: "01" },
  "Himachal Pradesh": { code: "HP", gst: "02" },
  "Punjab": { code: "PB", gst: "03" },
  "Chandigarh": { code: "CH", gst: "04" },
  "Uttarakhand": { code: "UK", gst: "05" },
  "Haryana": { code: "HR", gst: "06" },
  "Delhi": { code: "DL", gst: "07" },
  "Rajasthan": { code: "RJ", gst: "08" },
  "Uttar Pradesh": { code: "UP", gst: "09" },
  "Bihar": { code: "BR", gst: "10" },
  "Sikkim": { code: "SK", gst: "11" },
  "Arunachal Pradesh": { code: "AR", gst: "12" },
  "Nagaland": { code: "NL", gst: "13" },
  "Manipur": { code: "MN", gst: "14" },
  "Mizoram": { code: "MZ", gst: "15" },
  "Tripura": { code: "TR", gst: "16" },
  "Meghalaya": { code: "ML", gst: "17" },
  "Assam": { code: "AS", gst: "18" },
  "West Bengal": { code: "WB", gst: "19" },
  "Jharkhand": { code: "JH", gst: "20" },
  "Odisha": { code: "OR", gst: "21" },
  "Chhattisgarh": { code: "CG", gst: "22" },
  "Madhya Pradesh": { code: "MP", gst: "23" },
  "Gujarat": { code: "GJ", gst: "24" },
  "Daman and Diu": { code: "DD", gst: "25" },
  "Dadra and Nagar Haveli": { code: "DN", gst: "26" },
  "Maharashtra": { code: "MH", gst: "27" },
  "Andhra Pradesh": { code: "AP", gst: "28" },
  "Karnataka": { code: "KA", gst: "29" },
  "Goa": { code: "GA", gst: "30" },
  "Lakshadweep": { code: "LD", gst: "31" },
  "Kerala": { code: "KL", gst: "32" },
  "Tamil Nadu": { code: "TN", gst: "33" },
  "Puducherry": { code: "PY", gst: "34" },
  "Andaman and Nicobar Islands": { code: "AN", gst: "35" },
  "Telangana": { code: "TG", gst: "36" },
  "Andhra Pradesh (New)": { code: "AD", gst: "37" },
  "Ladakh": { code: "LA", gst: "38" }
};

// Helper function to get state code with GST
const getStateCode = (stateName) => {
  const state = INDIAN_STATES_GST[stateName];
  if (!state) return "";
  return `${state.code}-${state.gst}`;
};

export default function AddBranchForm({
  open,
  onClose,
  onSuccess,
  base_api,
  branch = null
}) {
  const BASE_API = base_api;
  const INDIA_ID = 101;

  const [formData, setFormData] = useState({
  name: "",
  email: "",
  secondary_email: "",
  primary_contact: "",
  secondary_contact: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  state_code: "",
  gst_no: "",
  company_pan: "",
  msme_number: "",
  is_head_office: false,
});

  const [loading, setLoading] = useState(false);
  const [stateid, setStateid] = useState(0);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  useEffect(() => {
    if (!branch || !open) {
      setFormData({
        name: "",
        email: "",
        secondary_email: "",
        primary_contact: "",
        secondary_contact: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        state_code: "",
        gst_no: "",
        company_pan: "",
        msme_number: "",
        is_head_office: false,
      });
      setStateid(0);
      return;
    }

    setFormData({
      name: branch.name || "",
      email: branch.email || "",
      secondary_email: branch.secondary_email || "",
      primary_contact: branch.primary_contact || "",
      secondary_contact: branch.secondary_contact || "",
      address: branch.address || "",
      city: branch.city || "",
      state: branch.state || "",
      pincode: branch.pincode || "",
      state_code: branch.state_code || "",
      gst_no: branch.gst_no || "",
      company_pan: branch.company_pan || "",
      msme_number: branch.msme_number || "",
      is_head_office: branch.is_head_office || false,
    });

    if (branch.state) {
      GetState(INDIA_ID).then((states) => {
        const matchedState = states.find(
          s => s.name.toLowerCase() === branch.state?.toLowerCase()
        );
        if (matchedState) {
          setStateid(matchedState.id);
        }
      });
    }
  }, [branch, open]);

  if (!open) return null;

  const validate = () => {
    if (!formData.name.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Branch name is required" });
      return false;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Swal.fire({ icon: "error", title: "Validation", text: "Valid email is required" });
      return false;
    }
    if (formData.secondary_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.secondary_email)) {
      Swal.fire({ icon: "error", title: "Validation", text: "Valid secondary email is required" });
      return false;
    }
    if (!formData.primary_contact.trim() || formData.primary_contact.length !== 10) {
      Swal.fire({ icon: "error", title: "Validation", text: "Primary contact must be 10 digits" });
      return false;
    }
    if (formData.secondary_contact && formData.secondary_contact.length !== 10) {
      Swal.fire({ icon: "error", title: "Validation", text: "Secondary contact must be 10 digits" });
      return false;
    }
    if (!formData.address.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Address is required" });
      return false;
    }
    if (!formData.city.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "City is required" });
      return false;
    }
    if (!formData.state.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "State is required" });
      return false;
    }
    if (!formData.pincode || String(formData.pincode).length !== 6) {
      Swal.fire({ icon: "error", title: "Validation", text: "Pincode must be 6 digits" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (data) => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...data,
        pincode: parseInt(data.pincode),
      };

      // Note: Update this URL when backend is ready
      const url = branch ? `${BASE_API}/auth/branch/${branch.id}/` : `${BASE_API}/auth/branch/`;
      const method = branch ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      let responseData;
      try { responseData = await res.json(); } catch (e) { responseData = {}; }

      if (!res.ok) {
        const msg = responseData?.detail || JSON.stringify(responseData) || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      Swal.fire({
        icon: "success",
        text: branch ? "Branch updated successfully" : "Branch added successfully",
        timer: 1200,
        showConfirmButton: false
      });

      onSuccess && onSuccess(responseData);
      onClose && onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to save branch" });
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: "name", label: "Branch Name", type: "text", required: true, gridCols: 1, placeholder: "Enter branch name" },
    { name: "email", label: "Email", type: "email", required: true, gridCols: 1, placeholder: "branch@example.com" },
    { name: "secondary_email", label: "Secondary Email", type: "email", gridCols: 1, placeholder: "secondary@example.com" },
    { name: "primary_contact", label: "Primary Contact", type: "phone", required: true, maxLength: 10, gridCols: 1, placeholder: "9876543210" },
    { name: "secondary_contact", label: "Secondary Contact", type: "phone", maxLength: 10, gridCols: 1, placeholder: "9876543210" },
    { name: "address", label: "Address", type: "textarea", required: true, rows: 2, gridCols: 2, placeholder: "Enter branch address" },
    { name: "city", label: "City", type: "text", required: true, gridCols: 1, placeholder: "Enter city" },
    {
      name: "state",
      label: "State",
      type: "component",
      required: true,
      gridCols: 1,
      component: ({ value, onChange }) => (
        <div className="input-like-select">
          <StateSelect
            countryid={INDIA_ID}
            defaultValue={branch && stateid ? { id: stateid, name: value } : null}
            onChange={(e) => {
              setStateid(e.id);
              onChange(e.name);
              // Use our GST code mapping
              const stateCode = getStateCode(e.name);
              setFormData(prev => ({ ...prev, state_code: stateCode }));
            }}
            placeHolder="Select State"
          />
        </div>
      )
    },
    { name: "pincode", label: "Pincode", type: "text", required: true, maxLength: 6, gridCols: 1, placeholder: "123456" },
    { name: "state_code", label: "State Code", type: "text", disabled: true, gridCols: 1, placeholder: "Auto-filled" },
    { 
      name: "gst_no", 
      label: "GST Number", 
      type: "text", 
      maxLength: 15, 
      gridCols: 1, 
      placeholder: "22AAAAA0000A1Z5",
      validation: (value) => {
        if (!value) return true; // Optional field
        if (value.length !== 15) return "GST must be 15 characters";
        
        const gst = value.toUpperCase();
        const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
        
        if (!gstPattern.test(gst)) {
          return "Invalid GST format. Expected: 22AAAAA0000A1Z5";
        }
        
        return true;
      }
    },
    { name: "company_pan",label: "Company PAN",type: "text",maxLength: 10,gridCols: 1,placeholder: "ABCDE1234F"},

    { name: "msme_number",  label: "MSME / Udyam Number", type: "text", gridCols: 1,placeholder: "UDYAM-XX-00-0000000"},
    { name: "is_head_office", label: "Is Head Office", type: "checkbox", gridCols: 2 },
  ];

  return (
    <>
      <div className="fixed inset-0 mt-8 bg-black/40 flex items-start sm:items-center justify-center z-50">
        <div className="bg-white rounded-md shadow-lg w-full max-w-2xl relative max-h-[85vh] flex flex-col">

          {/* FIXED HEADER */}
          <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {branch ? "Edit Branch" : "Add Branch"}
            </h2>
            <button
              onClick={onClose}
              className="text-xl font-bold hover:text-red-500"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* SCROLLABLE FORM BODY */}
          <div className="px-6 py-4 overflow-y-auto flex-1">
            <ReusableForm
              fields={fields}
              formData={formData}
              onChange={setFormData}
              onSubmit={handleSubmit}
              loading={loading}
              submitText={branch ? "Update" : "Save"}
              onCancel={onClose}
              showCancel={true}
            />
          </div>
        </div>
      </div>

      <style>
        {`
          .input-like-select .rsc-select-container {
            width: 100%;
          }
          
          .input-like-select input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border: 0px solid #e2e8f0;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            background-color: #fff;
          }
          
          .input-like-select input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 1px #6366f1;
          }
          
          .input-like-select svg {
            display: none !important;
          }
          
          .input-like-select .rsc-select-input {
            padding-right: 0.75rem !important;
          }
        `}
      </style>
    </>
  );
}
