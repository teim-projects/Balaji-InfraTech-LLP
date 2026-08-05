import { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import ReusableForm from "../Form";
import { StateSelect } from "react-country-state-city";
import "react-country-state-city/dist/react-country-state-city.css";
import { GetState } from "react-country-state-city";

export default function AddSiteForm({
  open,
  onClose,
  onSuccess,
  base_api,
  site = null
}) {

  const BASE_API = base_api;
  const INDIA_ID = 101;

  const [formData, setFormData] = useState({
    name: "",
    // site_shortcut: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    owner_name: "",
    owner_contact: "",
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
    if (!site || !open) {
      setFormData({
        name: "",
        // site_shortcut: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        owner_name: "",
        owner_contact: "",
      });
      setStateid(0);
      return;
    }

    setFormData({
      name: site.name || "",
      // site_shortcut: site.site_shortcut || "",
      address: site.address || "",
      city: site.city || "",
      state: site.state || "",
      pincode: site.pincode || "",
      owner_name: site.owner_name || "",
      owner_contact: site.owner_contact || "",
    });

    if (site.state) {
      GetState(INDIA_ID).then((states) => {
        const matchedState = states.find(
          s => s.name.toLowerCase() === site.state?.toLowerCase()
        );
        if (matchedState) {
          setStateid(matchedState.id);
        }
      });
    }
  }, [site, open]);

  if (!open) return null;

  const validate = () => {
    if (!formData.name.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Site name is required" });
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
    //wrap it in string becuase it gives validation error when editing. becuase payload converts pincode from string to integer but validation checks the string lenght.
    if (!formData.pincode || String(formData.pincode).length !== 6) {
      Swal.fire({ icon: "error", title: "Validation", text: "Pincode must be 6 digits" });
      return false;
    }
    // if (!formData.owner_name.trim()) {
    //   Swal.fire({ icon: "error", title: "Validation", text: "Owner name is required" });
    //   return false;
    // }
    // if (!formData.owner_contact.trim() || formData.owner_contact.length !== 10) {
    //   Swal.fire({ icon: "error", title: "Validation", text: "Owner contact must be 10 digits" });
    //   return false;
    // }
    return true;
  };

  const handleSubmit = async (data) => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        ...data,
        pincode: parseInt(data.pincode),
        owner_name: data.owner_name || null,
        owner_contact: data.owner_contact || null,
      };

    
      const url = site ? `${BASE_API}/auth/site/${site.id}/` : `${BASE_API}/auth/site/`;
      const method = site ? "PATCH" : "POST";

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
        text: site ? "Site updated successfully" : "Site added successfully",
        timer: 1200,
        showConfirmButton: false
      });

      onSuccess && onSuccess(responseData);
      onClose && onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to save site" });
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: "name", label: "Site Name", type: "text", required: true, gridCols: 1, placeholder: "Enter site name" },
    // { name: "site_shortcut", label: "Site Shortcut", type: "text", gridCols: 1, placeholder: "Auto-generated if empty", disabled: !!site },
    { name: "address", label: "Address", type: "textarea", required: true, rows: 2, gridCols: 2, placeholder: "Enter site address" },
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
            defaultValue={site && stateid ? { id: stateid, name: value } : null}
            onChange={(e) => {
              setStateid(e.id);
              onChange(e.name);
            }}
            placeHolder="Select State"
          />
        </div>
      )
    },
    { name: "pincode", label: "Pincode", type: "text", required: true, maxLength: 6, gridCols: 1, placeholder: "123456" },
    { name: "owner_name", label: "Owner Name", type: "text", gridCols: 1, placeholder: "Enter owner name" },
    { name: "owner_contact", label: "Owner Contact", type: "phone", maxLength: 10, gridCols: 1, placeholder: "9876543210" },
  ];

  return (
    <>
      <div className="fixed inset-0 mt-8 bg-black/40 flex items-start sm:items-center justify-center z-50">
        <div className="bg-white rounded-md shadow-lg w-full max-w-2xl relative max-h-[85vh] flex flex-col">

          {/* FIXED HEADER */}
          <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {site ? "Edit Site" : "Add Site"}
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
              submitText={site ? "Update" : "Save"}
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