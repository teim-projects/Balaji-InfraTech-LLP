import React, { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import { CitySelect, CountrySelect, StateSelect, } from "react-country-state-city";
import "react-country-state-city/dist/react-country-state-city.css";
import { GetCountries, GetState, GetCity } from "react-country-state-city";


export default function AddCustomerForm({
  open,
  onClose,
  onSuccess,
  baseApi,
  customer = null
}) {
  // const DEFAULT_API = "http://127.0.0.1:8000";
  const BASE_API = baseApi;

  const [name, setName] = useState(customer?.name ?? "");
  const [contactNumber, setContactNumber] = useState(customer?.contact_number ?? "");
  const [landLineNumber, setLandLineNumber] = useState(customer?.land_line_no ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [secondary_email, setSecondary_email] = useState(customer?.secondary_email ?? "");
  const [pocName, setPocName] = useState(customer?.poc_name ?? "");
  const [pocContactNumber, setPocContactNumber] = useState(customer?.poc_contact_number ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [city, setCity] = useState(customer?.city ?? "");
  const [stateVal, setStateVal] = useState(customer?.state ?? "");
  const [pinCode, setPinCode] = useState(customer?.pin_code ?? "");
  const [bothAddressSame, setBothAddressSame] = useState(Boolean(customer?.both_address_is_same));
  const [siteAddress, setSiteAddress] = useState(customer?.site_address ?? "");
  const [siteCity, setSiteCity] = useState(customer?.site_city ?? "");
  const [siteState, setSiteState] = useState(customer?.site_state ?? "");
  const [sitePinCode, setSitePinCode] = useState(customer?.site_pin_code ?? "");
  const [gst, setGst] = useState(customer?.gst ?? "");
  const [pan, setPan] = useState(customer?.pan ?? "");

  const [loading, setLoading] = useState(false);
  // const [stateid, setstateid] = useState(null);
  const INDIA_ID = 101;
  const [cityid, setcityid] = useState(null);
  const [countryid, setCountryid] = useState(INDIA_ID);
  const [stateid, setstateid] = useState(0);
  const [siteStateid, setSiteStateid] = useState(0);
  const [siteCityid, setSiteCityid] = useState(0);

  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);



  useEffect(() => {
    if (!customer || !open) return;

    setName(customer.name || "");
    setContactNumber(customer.contact_number || "");
    setLandLineNumber(customer.land_line_no || "");
    setEmail(customer.email || "");
    setSecondary_email(customer.secondary_email || "");
    setPocName(customer.poc_name || "");
    setPocContactNumber(customer.poc_contact_number || "");
    setAddress(customer.address || "");
    setPinCode(customer.pin_code || "");
    setBothAddressSame(Boolean(customer.both_address_is_same));
    setSiteAddress(customer.site_address || "");
    setSitePinCode(customer.site_pin_code || "");
    setGst(customer.gst || "");
    setPan(customer.pan || "");

    // 🔥 LOAD ALL STATES ONCE
    GetState(INDIA_ID).then((states) => {

      // 1. Logic for Billing State/City
      const matchedState = states.find(
        s => s.name.toLowerCase() === customer.state?.toLowerCase()
      );

      if (matchedState) {
        setstateid(matchedState.id);
        setStateVal(matchedState.name);

        GetCity(INDIA_ID, matchedState.id).then((cities) => {
          const matchedCity = cities.find(
            c => c.name.toLowerCase() === customer.city?.toLowerCase()
          );
          if (matchedCity) {
            setcityid(matchedCity.id);
            setCity(matchedCity.name);
          }
        });
      }

      // 2. Logic for Site State/City (Now inside the same 'states' block)
      const matchedSiteState = states.find(
        s => s.name.toLowerCase() === customer.site_state?.toLowerCase()
      );

      if (matchedSiteState) {
        setSiteStateid(matchedSiteState.id);
        setSiteState(matchedSiteState.name);

        GetCity(INDIA_ID, matchedSiteState.id).then((cities) => {
          const matchedSiteCity = cities.find(
            c => c.name.toLowerCase() === customer.site_city?.toLowerCase()
          );
          if (matchedSiteCity) {
            setSiteCityid(matchedSiteCity.id);
            setSiteCity(matchedSiteCity.name);
          }
        });
      }
    });
  }, [customer, open]);

  if (!open) return null;

  const validate = () => {
    if (!name.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Name is required" });
      return false;
    }
    
    // Contact number validation - 10 digits if provided
    if (contactNumber && contactNumber.toString().trim()) {
      const cleanNumber = contactNumber.toString().replace(/\D/g, "");
      if (cleanNumber.length !== 10) {
        Swal.fire({ icon: "error", title: "Validation", text: "Contact number must be exactly 10 digits" });
        return false;
      }
    }
    
    // POC contact number validation - 10 digits if provided
    if (pocContactNumber && pocContactNumber.toString().trim()) {
      const cleanPocNumber = pocContactNumber.toString().replace(/\D/g, "");
      if (cleanPocNumber.length !== 10) {
        Swal.fire({ icon: "error", title: "Validation", text: "POC contact number must be exactly 10 digits" });
        return false;
      }
    }
    
    // Landline validation - if provided
    if (landLineNumber && landLineNumber.toString().trim()) {
      const cleanLandline = landLineNumber.toString().replace(/\D/g, "");
      if (cleanLandline.length < 6 || cleanLandline.length > 15) {
        Swal.fire({ icon: "error", title: "Validation", text: "Landline number must be between 6 and 15 digits" });
        return false;
      }
    }
    
    // Email validation (optional)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Swal.fire({ icon: "error", title: "Validation", text: "Email is invalid" });
      return false;
    }

    if (secondary_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secondary_email)) {
      Swal.fire({ icon: "error", title: "Validation", text: "Secondary email is invalid" });
      return false;
    }
    
    // GST validation - enhanced format validation
    if (gst && gst.trim()) {
      const gstTrimmed = gst.trim().toUpperCase();
      if (gstTrimmed.length !== 15) {
        Swal.fire({ icon: "error", title: "Validation", text: "GST number must be exactly 15 characters" });
        return false;
      }
      
      // Validate GST format
      const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
      if (!gstPattern.test(gstTrimmed)) {
        Swal.fire({ 
          icon: "error", 
          title: "GST Validation", 
          text: "Invalid GST format. Expected format: 22AAAAA0000A1Z5" 
        });
        return false;
      }
      
      // Extract and validate PAN from GST
      const panFromGST = gstTrimmed.substring(2, 12);
      const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panPattern.test(panFromGST)) {
        Swal.fire({ 
          icon: "error", 
          title: "GST Validation", 
          text: "Invalid PAN format within GST number" 
        });
        return false;
      }
      
      // If PAN is also provided separately, check if it matches
      if (pan && pan.trim().toUpperCase() !== panFromGST) {
        Swal.fire({ 
          icon: "error", 
          title: "Validation", 
          text: "PAN number doesn't match the PAN in GST number" 
        });
        return false;
      }
    }
    
    // PAN validation - 10 characters if provided
    if (pan && pan.trim()) {
      if (pan.trim().length !== 10) {
        Swal.fire({ icon: "error", title: "Validation", text: "PAN number must be exactly 10 characters" });
        return false;
      }
    }
    
    // Pin code validation - 6 digits if provided
    if (pinCode && pinCode.toString().trim()) {
      const cleanPin = pinCode.toString().replace(/\D/g, "");
      if (cleanPin.length !== 6) {
        Swal.fire({ icon: "error", title: "Validation", text: "Pin code must be exactly 6 digits" });
        return false;
      }
    }
    
    // Site pin code validation - 6 digits if provided
    if (!bothAddressSame && sitePinCode && sitePinCode.toString().trim()) {
      const cleanSitePin = sitePinCode.toString().replace(/\D/g, "");
      if (cleanSitePin.length !== 6) {
        Swal.fire({ icon: "error", title: "Validation", text: "Site pin code must be exactly 6 digits" });
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        contact_number: contactNumber.toString(),
        land_line_no: landLineNumber.toString(),
        email: email ? String(email).trim() : "",
        secondary_email: secondary_email ? String(secondary_email).trim() : "",
        poc_name: pocName.trim(),
        poc_contact_number: pocContactNumber.toString(),
        address: address.trim(),
        city: city.trim(),
        state: stateVal.trim(),
        pin_code: pinCode.toString().trim(),
        both_address_is_same: Boolean(bothAddressSame),
        gst: gst.trim().toUpperCase(),
        pan: pan.trim().toUpperCase(),
      };

      // include site fields only when not same OR when provided (for edit)
      if (!bothAddressSame) {
        payload.site_address = siteAddress.trim();
        payload.site_city = siteCity.trim();
        payload.site_state = siteState.trim();
        payload.site_pin_code = sitePinCode.toString().trim();
      } else {
        payload.site_address = address.trim();
        payload.site_city = city.trim();
        payload.site_state = stateVal.trim();
        payload.site_pin_code = pinCode.toString().trim();
      }

      // choose endpoint & method
      const url = customer ? `${BASE_API}/lead/customer/${customer.id}/` : `${BASE_API}/lead/customer/`;
      const method = customer ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      let data;
      try { data = await res.json(); } catch (e) { data = {}; }

      if (!res.ok) {
        let errorMessage = "";

        if (data) {
          // Handle DRF validation errors
          if (typeof data === "object") {
            errorMessage = Object.entries(data)
              .map(([field, messages]) => {
                const msg = Array.isArray(messages) ? messages.join(", ") : messages;
                return `${field}: ${msg}`;
              })
              .join("\n");
          } else {
            errorMessage = data.detail || "Something went wrong";
          }
        } else {
          errorMessage = `${res.status} ${res.statusText}`;
        }

        throw new Error(errorMessage);
      }

      Swal.fire({
        icon: "success",
        text: customer ? "Customer updated successfully" : "Customer added successfully",
        timer: 1200,
        showConfirmButton: false
      });

      onSuccess && onSuccess(data);
      onClose && onClose();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message || "Failed to save customer" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 mt-8  bg-black/40 flex items-start sm:items-center justify-center z-50">
        <div className="bg-white rounded-md shadow-lg w-full max-w-2xl relative max-h-[85vh] flex flex-col">

          {/* ---- FIXED HEADER ---- */}
          <div className="sticky top-0 bg-white z-10 border-b px-4 py-3 flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {customer ? "Edit Customer" : "Add Customer"}
            </h2>
            <button
              onClick={onClose}
              className="text-xl font-bold hover:text-red-500"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* ---- SCROLLABLE FORM BODY ---- */}
          <div className="px-4 py-3 overflow-y-auto flex-1">
            <form className="space-y-4" onSubmit={handleSubmit}>

              {/* Basic Information - 2 Column Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">Name <span className="text-red-500">*</span></label>
                  <input className="w-full px-3 py-2 rounded-md border border-slate-200"
                    value={name} onChange={e => setName(e.target.value)} />
                </div>

                {/* Contact Number */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">Contact Number</label>
                  <input 
                    className="w-full px-3 py-2 rounded-md border border-slate-200"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={contactNumber} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, "");
                      setContactNumber(value);
                    }}
                    placeholder="10-digit mobile number"
                  />
                </div>

                {/* Landline Number */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">Landline Number</label>
                  <input className="w-full px-3 py-2 rounded-md border border-slate-200"
                    value={landLineNumber} onChange={e => setLandLineNumber(e.target.value)} />
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">Email</label>
                  <input className="w-full px-3 py-2 rounded-md border border-slate-200"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                {/* Secondary Email */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">Secondary Email</label>
                  <input className="w-full px-3 py-2 rounded-md border border-slate-200"
                    value={secondary_email} onChange={e => setSecondary_email(e.target.value)} />
                </div>

                {/* POC name */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">POC Name</label>
                  <input className="w-full px-3 py-2 rounded-md border border-slate-200"
                    value={pocName} onChange={e => setPocName(e.target.value)} />
                </div>

                {/* POC contact number */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">POC Contact</label>
                  <input 
                    className="w-full px-3 py-2 rounded-md border border-slate-200"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={pocContactNumber} 
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, "");
                      setPocContactNumber(value);
                    }}
                    placeholder="10-digit mobile number"
                  />
                </div>

                {/* GST */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">GST Number</label>
                  <input 
                    className="w-full px-3 py-2 rounded-md border border-slate-200"
                    value={gst} 
                    onChange={e => setGst(e.target.value.toUpperCase())}
                    maxLength={15}
                    placeholder="Enter GST number"
                  />
                </div>

                {/* PAN */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">PAN Number</label>
                  <input 
                    className="w-full px-3 py-2 rounded-md border border-slate-200"
                    value={pan} 
                    onChange={e => setPan(e.target.value.toUpperCase())}
                    maxLength={10}
                    placeholder="Enter PAN number"
                  />
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <label className="text-sm text-slate-700 mb-1 block">Address</label>
                <textarea className="w-full px-3 py-2 rounded-md border border-slate-200"
                  value={address} onChange={e => setAddress(e.target.value)} />
              </div>

              {/* City / State / Pin */}
              <div className="grid grid-cols-3 gap-3">
                {/* Billing State */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">State</label>
                  <div className="input-like-select">
                    <StateSelect
                      countryid={INDIA_ID}
                      defaultValue={customer && stateid ? { id: stateid, name: stateVal } : null}
                      onChange={(e) => {
                        setstateid(e.id);
                        setStateVal(e.name);
                        setcityid(0);
                        setCity("");
                      }}
                      placeHolder="Select State"
                    />
                  </div>
                </div>

                {/* Billing City */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">City</label>
                  <div className="input-like-select">
                    <CitySelect
                      key={`city-billing-${stateid}`}
                      countryid={INDIA_ID}
                      stateid={stateid}
                      defaultValue={customer && cityid ? { id: cityid, name: city } : null}
                      onChange={(e) => {
                        setcityid(e.id);
                        setCity(e.name);
                      }}
                      placeHolder="Select City"
                    />
                  </div>
                </div>

                {/* Pin Code */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">Pin Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="\d{6}"
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 invalid:border-red-500"
                    value={pinCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setPinCode(value);
                    }}
                    placeholder="6-digit PIN"
                  />
                </div>
              </div>

              {/* Checkbox */}
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox"
                  checked={bothAddressSame}
                  onChange={(e) => setBothAddressSame(e.target.checked)} />
                Both address is same
              </label>

              {/* Site Address (Conditional Fields) */}
              {!bothAddressSame && (
                <>
                  <div>
                    <label className="text-sm text-slate-700 mb-1 block">Site Address</label>
                    <textarea className="w-full px-3 py-2 rounded-md border border-slate-200"
                      value={siteAddress} onChange={e => setSiteAddress(e.target.value)} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Site State */}
                    <div>
                      <label className="text-sm text-slate-700 mb-1 block">Site State</label>
                      <div className="input-like-select">
                        <StateSelect
                          countryid={INDIA_ID}
                          defaultValue={customer && siteStateid ? { id: siteStateid, name: siteState } : null}
                          onChange={(e) => {
                            setSiteStateid(e.id);
                            setSiteState(e.name);
                            setSiteCityid(0);
                            setSiteCity("");
                          }}
                          placeHolder="Select State"
                        />
                      </div>
                    </div>

                    {/* Site City */}
                    <div>
                      <label className="text-sm text-slate-700 mb-1 block">Site City</label>
                      <div className="input-like-select">
                        <CitySelect
                          key={`city-site-${siteStateid}`}
                          countryid={INDIA_ID}
                          stateid={siteStateid}
                          defaultValue={customer && siteCityid ? { id: siteCityid, name: siteCity } : null}
                          onChange={(e) => {
                            setSiteCityid(e.id);
                            setSiteCity(e.name);
                          }}
                          placeHolder="Select City"
                        />
                      </div>
                    </div>

                    {/* Site Pin */}
                    <div>
                      <label className="text-sm text-slate-700 mb-1 block">Site Pin</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={sitePinCode}
                        onChange={(e) => setSitePinCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="6-digit PIN"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded"
                  disabled={loading}>
                  {loading ? (customer ? "Updating..." : "Saving...") : (customer ? "Update" : "Save")}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      <style>
        {`
            
            /* 🔥 react-country-state-city → make it look like normal input */

            /* Container */
            .input-like-select .rsc-select-container {
              width: 100%;
            }
            
            /* Input field */
            .input-like-select input {
              width: 100%;
              padding: 0.5rem 0.75rem;
              border: 0px solid #e2e8f0; /* slate-200 */
              border-radius: 0.375rem;  /* rounded-md */
              font-size: 0.875rem;
              background-color: #fff;
            }
            
            /* Focus like normal input */
            .input-like-select input:focus {
              outline: none;
              border-color: #6366f1; /* indigo-500 */
              box-shadow: 0 0 0 1px #6366f1;
            }
            
            /* 🔥 REMOVE DROPDOWN ARROW (SVG ICON) */
            .input-like-select svg {
              display: none !important;
            }
            
            /* Remove extra right padding reserved for arrow */
            .input-like-select .rsc-select-input {
              padding-right: 0.75rem !important;
            }
        `}
      </style>
    </>
  );
}