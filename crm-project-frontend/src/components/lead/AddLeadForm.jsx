import React, { useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";
import { RxCross2 } from "react-icons/rx";
import Swal from "sweetalert2";
import { fetchCustomerByQuery } from "../customers/customerLookup";
import { useUserRole } from '../../hooks/useAuth';
import AddCustomerForm from "../customers/AddCustomerForm";
import { State, City } from "country-state-city";
import CreatableSelect from "react-select/creatable";
import GooglePlacesInput from "../common/GooglePlacesInput";
import LeadQualifyingPanel from "./LeadQualifyingPanel";

export default function AddLeadForm({
  open,
  onClose,
  onSuccess,
  baseApi,
  token = "",
  lead = null,
}) {
  const contactRef = useRef("");
  const states = useMemo(() => State.getStatesOfCountry("IN"), []);
  const API_URL = `${baseApi.replace(/\/$/, "")}/lead/lead/`;
  const { userRole, isLoading: loadingRole } = useUserRole(baseApi);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    enquiry_date: "",
    clientName: "",
    contactNumber: "",
    secondaryContactNumber: "",
    email: "",
    secondary_email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    projectName: "",
    enquiryType: "",
    serviceEnquiry: "",
    projectAddress: "",
    requirementDetails: "",
    contact_person_name: "",
    contact_person_number: "",
    serviceCategory: [],
    customService: "",
    leadSource: "",
    leadSourceDetails: {
      name: "",
      mobile: "",
      email: "",
      address: ""
    },
    status: "open",
    assignTo: "",
    creditedBy: "",
    followupDate: "",
    remarks: "",
  });

  const cities = useMemo(() => {
    if (!formData.state) return [];
    const selectedState = states.find(state => state.name === formData.state);
    return selectedState ? City.getCitiesOfState("IN", selectedState.isoCode) : [];
  }, [formData.state, states]);

  const [customerId, setCustomerId] = useState(null);
  const [assignOptions, setAssignOptions] = useState([]);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [assignId, setAssignId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [referenceOptions, setReferenceOptions] = useState([]);
  const [loadingReference, setLoadingReference] = useState(false);
  const [showLeadSourceInput, setShowLeadSourceInput] = useState(false);
  const [latestLead, setLatestLead] = useState(null);
  const [loadingLatestLead, setLoadingLatestLead] = useState(false);

  // Lead Qualifying Questions
  const [isQualified, setIsQualified] = useState(false);
  const [qualifyingAnswers, setQualifyingAnswers] = useState({});
  const canApprove = useMemo(() => {
    const role = userRole?.name?.toLowerCase();
    return role === "admin" || role === "manager";
  }, [userRole]);

  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [serviceOptions, setServiceOptions] = useState([
    { id: "service", name: "Service" },
    { id: "remove", name: "Remove" },
    { id: "reinstall", name: "Reinstall" },
    { id: "other", name: "Other" }
  ]);

  const serviceSelectOptions = serviceOptions.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const leadSourceOptions = [
    { id: "google_ads", name: "Google Ads", needsInput: false },
    { id: "indiamart", name: "IndiaMART", needsInput: false },
    { id: "bni", name: "BNI", needsInput: true },
    { id: "justdial", name: "Justdial", needsInput: false },
    { id: "reference", name: "Reference", needsInput: true },
    { id: "architect/interior_designer", name: "Architect Interior Designer", needsInput: true },
    { id: "builder", name: "Builder", needsInput: true },
    { id: "existing_customer", name: "Existing Customer", needsInput: true },
    { id: "scgt", name: "SCGT", needsInput: false },
    { id: "ka_staff", name: "KHL Staff", needsInput: true },
    { id: "other", name: "Other", needsInput: true },
  ];

  const authToken = useMemo(
    () =>
      token ||
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "",
    [token]
  );

  const lookupTimerRef = useRef(null);
  const lookupAbortRef = useRef(null);

  useEffect(() => {
    if (open) {
      setStep(1);
    }
  }, [open]);

  // Fetch all staff records
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoadingReference(true);

    const url = `${baseApi.replace(/\/$/, "")}/auth/staff/all/`;

    fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText} ${txt}`);
        }
        return res.json();
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.results ?? [];
        setReferenceOptions(
          items.map((u) => ({
            id: u.id,
            name: `${u.first_name} ${u.last_name}`,
          }))
        );
      })
      .catch((err) => {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch reference staff:", err);
          setReferenceOptions([]);
        }
      })
      .finally(() => setLoadingReference(false));

    return () => controller.abort();
  }, [open, baseApi, authToken]);

  // Fetch sales staff when modal opens
  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setLoadingAssign(true);

    const url = `${baseApi.replace(/\/$/, "")}/auth/staff/?search=sales`;

    fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText} ${txt}`);
        }
        return res.json();
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.results ?? [];
        const mapped = items.map((u) => ({
          id: u.id,
          name: u.first_name,
          last_name: u.last_name,
        }));
        setAssignOptions(mapped);
      })
      .catch((err) => {
        if (err?.name === "AbortError") {
          // aborted — fine
        } else {
          console.error("Failed to fetch staff:", err);
          setAssignOptions([]);
        }
      })
      .finally(() => setLoadingAssign(false));

    return () => controller.abort();
  }, [open, baseApi, authToken]);

  // Populate on open / when editing
  useEffect(() => {
    if (!open) return;

    if (lead) {
      const selected = leadSourceOptions.find(
        opt => opt.id === lead.lead_source
      );

      setFormData({
        enquiry_date: lead.enquiry_date || "",
        clientName: lead.customer_name || "",
        contactNumber: lead.customer_contact || "",
        secondaryContactNumber: lead.customer_secondary_contact || "",
        email: lead.customer_email || "",
        secondary_email: lead.customer_secondary_email || "",
        address: lead.customer_address || "",
        city: lead.customer_city || "",
        state: lead.customer_state || "",
        pincode: lead.customer_pincode || "",
        projectName: lead.project_name || "",
        projectAddress: lead.project_adderess || "",
        requirementDetails: lead.requirements_details || "",
        enquiryType: lead.lead_type || "individual",
        serviceEnquiry: lead.is_service_lead || "",
        serviceCategory: Array.isArray(lead.service_type)
          ? lead.service_type
          : lead.service_type
            ? [lead.service_type]
            : [],
        contact_person_name: lead.contact_person_name || "",
        contact_person_number: lead.contact_person_number || "",
        leadSource: lead.lead_source || "",
        leadSourceDetails: lead.lead_source_input || {
          name: "",
          mobile: "",
          email: "",
          address: ""
        },
        status: lead.status || "open",
        assignTo: lead.assign_to || "",
        creditedBy: lead.creatd_by_details?.full_name || "",
        followupDate: lead.followup_date || "",
        remarks: lead.remarks || "",
      });
      contactRef.current = lead.customer_contact || "";
      setCustomerId(lead.customer ?? null);
      setAssignId(lead.assign_to ?? null);
      setShowLeadSourceInput(!!selected?.needsInput);
      setIsQualified(lead.is_qualified || false);
      setQualifyingAnswers(lead.qualifying_answers || {});
    } else {
      setFormData({
        enquiry_date: "",
        clientName: "",
        contactNumber: "",
        email: "",
        secondary_email: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        projectName: "",
        project_adderess: "",
        requirementDetails: "",
        enquiryType: "",
        serviceCategory: [],
        serviceEnquiry: "",
        customService: "",
        leadSource: "",
        leadSourceDetails: {
          name: "",
          mobile: "",
          email: "",
          address: ""
        },
        assignTo: "",
        creditedBy: "",
        followupDate: "",
        remarks: "",
      });
      setCustomerId(null);
      setIsQualified(false);
      setQualifyingAnswers({});
    }
    setLoading(false);
    if (lookupTimerRef.current) {
      clearTimeout(lookupTimerRef.current);
      lookupTimerRef.current = null;
    }
    if (lookupAbortRef.current) {
      try {
        lookupAbortRef.current.abort();
      } catch { }
      lookupAbortRef.current = null;
    }
  }, [open, lead]);

  const handleCreateService = (inputValue) => {
    const newOption = {
      value: inputValue.toLowerCase().replace(/\s+/g, "_"),
      label: inputValue
    };

    setServiceOptions(prev => [
      ...prev,
      { id: newOption.value, name: newOption.label }
    ]);

    setFormData(prev => ({
      ...prev,
      serviceCategory: [...prev.serviceCategory, newOption.value]
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "assignTo") {
      setAssignId(value === "" ? null : Number(value));
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const clearError = (e) => {
    e.target.classList.remove("input-error");
  };

  const handleContactChange = (e) => {
    const phone = e.target.value;

    contactRef.current = phone;
    setFormData((prev) => ({ ...prev, contactNumber: phone }));

    if (lookupTimerRef.current) {
      clearTimeout(lookupTimerRef.current);
      lookupTimerRef.current = null;
    }
    if (lookupAbortRef.current) {
      try {
        lookupAbortRef.current.abort();
      } catch { }
      lookupAbortRef.current = null;
    }

    if (!phone || phone === "") {
      setCustomerId(null);
      setFormData((prev) => ({ ...prev, clientName: "", email: "", secondary_email: "", secondaryContactNumber: "", address: "", city: "", state: "", pincode: "" }));
      setCustomerSuggestions([]);
      setLoadingLookup(false);
      return;
    }

    lookupTimerRef.current = setTimeout(async () => {
      lookupTimerRef.current = null;
      setLoadingLookup(true);

      const controller = new AbortController();
      lookupAbortRef.current = controller;

      try {
        const customer = await fetchCustomerByQuery(baseApi, authToken, phone, {
          signal: controller.signal,
        });

        if (customer) {
          setCustomerId(customer.id ?? null);
          setFormData((prev) => ({
            ...prev,
            clientName: customer.full_name ?? customer.name ?? "",
            secondaryContactNumber: customer.secondary_contact_number ?? "",
            email: customer.email ?? "",
            secondary_email: customer.secondary_email ?? "",
            address: customer.address ?? "",
            city: customer.city ?? "",
            state: customer.state ?? "",
            pincode: customer.pin_code ?? "",
          }));

          fetchLatestLeadByMobile(phone);
        } else {
          setCustomerId(null);
          setFormData((prev) => ({ ...prev, clientName: "", secondaryContactNumber: "", email: "", secondary_email: "", address: "", city: "", state: "", pincode: "" }));
        }
      } catch (err) {
        if (err?.name === "AbortError") {
          // aborted by typing — ignore
        } else {
          console.error("Customer lookup error:", err);
          setCustomerId(null);
          setFormData((prev) => ({ ...prev, clientName: "", email: "", secondary_email: "" }));
        }
      } finally {
        lookupAbortRef.current = null;
        setLoadingLookup(false);
      }
    }, 500);
  };

  const showError = (field, message) => {
    Swal.fire({
      icon: "error",
      title: "Validation",
      text: message,
    });

    const el = document.querySelector(`[name="${field}"]`);
    if (el) {
      el.classList.add("input-error");
      el.focus();
    }
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    if (!contactRef.current.trim()) {
      showError("contactNumber", "Contact Number is required");
      return false;
    }
    if (!/^\d{10}$/.test(contactRef.current)) {
      showError("contactNumber", "Please enter a valid 10-digit mobile number");
      return false;
    }

    if (!formData.clientName && !customerId) {
      showError("clientName", "Client Name is required");
      return false;
    }

    if (formData.email && !emailRegex.test(formData.email)) {
      showError("email", "Please enter a valid email address");
      return false;
    }

    if (!formData.address && !customerId) {
      showError("address", "Address is required");
      return false;
    }

    if (!formData.enquiry_date) {
      showError("enquiry_date", "Enquiry Date is required");
      return false;
    }

    if (!formData.leadSource) {
      showError("leadSource", "Lead source is required");
      return false;
    }

    return true;
  };

  const validateStep1 = () => {
    if (!contactRef.current.trim()) {
      showError("contactNumber", "Contact Number is required");
      return false;
    }

    if (!/^\d{10}$/.test(contactRef.current)) {
      showError("contactNumber", "Please enter a valid 10-digit mobile number");
      return false;
    }

    if (!formData.clientName && !customerId) {
      showError("clientName", "Customer Name is required");
      return false;
    }

    if (formData.email && !emailRegex.test(formData.email)) {
      showError("email", "Invalid email format");
      return false;
    }

    if (!formData.address && !customerId) {
      showError("address", "Address is required");
      return false;
    }

    if (!formData.enquiryType) {
      showError("enquiryType", "Customer Type is required");
      return false;
    }

    if (formData.enquiryType === "organization") {
      if (!formData.contact_person_name) {
        showError("contact_person_name", "Contact Person Name is required");
        return false;
      }

      if (!formData.contact_person_number) {
        showError("contact_person_number", "Contact Person Number is required");
        return false;
      }
    }

    if (!formData.serviceEnquiry) {
      showError("serviceEnquiry", "Enquiry Type is required");
      return false;
    }

    if (
      (formData.serviceEnquiry === "service" ||
        formData.serviceEnquiry === "both") &&
      (!formData.serviceCategory || formData.serviceCategory.length === 0)
    ) {
      Swal.fire({
        icon: "error",
        title: "Validation",
        text: "Please select at least one service",
      });
      return false;
    }

    return true;
  };

  const fetchLatestLeadByMobile = async (mobile) => {
    if (!mobile) return;

    setLoadingLatestLead(true);
    try {
      const res = await fetch(
        `${baseApi.replace(/\/$/, "")}/lead/lead/latest-lead-by-mobile/?mobile=${mobile}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        }
      );

      if (!res.ok) {
        setLatestLead(null);
        return;
      }

      const data = await res.json();
      setLatestLead(data);

      setFormData((prev) => ({
        projectName: data.project_name || prev.projectName,
        projectAddress: data.project_adderess || prev.projectAddress,
      }));
    } catch (err) {
      console.error("Latest lead fetch error:", err);
      setLatestLead(null);
    } finally {
      setLoadingLatestLead(false);
    }
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      let finalCustomerId = customerId;

      if (!finalCustomerId) {
        if (!formData.clientName) {
          throw new Error("Customer name is required");
        }

        const customerRes = await fetch(
          `${baseApi.replace(/\/$/, "")}/lead/customer/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({
              contact_number: formData.contactNumber,
              name: formData.clientName,
              email: formData.email,
              secondary_email: formData.secondary_email,
              secondary_contact_number: formData.secondaryContactNumber,
              address: formData.address,
              city: formData.city,
              state: formData.state,
              pin_code: formData.pincode,
            }),
          }
        );

        if (!customerRes.ok) {
          const txt = await customerRes.text();
          throw new Error(txt || "Failed to create customer");
        }

        const newCustomer = await customerRes.json();
        finalCustomerId = newCustomer.id;
      }

      const payload = {
        project_name: formData.projectName || "",
        project_adderess: formData.projectAddress || "",
        requirements_details: formData.requirementDetails || "",
        lead_type: formData.enquiryType || "",
        is_service_lead: formData.serviceEnquiry || null,
        service_type: formData.serviceCategory || [],
        contact_person_name: formData.contact_person_name || "",
        contact_person_number: formData.contact_person_number || "",
        lead_source: formData.leadSource || null,
        lead_source_input: showLeadSourceInput
          ? formData.leadSourceDetails
          : null,
        status: lead ? formData.status : "open",
        enquiry_date: formData.enquiry_date || null,
        followup_date: formData.followupDate || null,
        remarks: formData.remarks || "",
        is_qualified: isQualified,
        qualifying_answers: qualifyingAnswers,
      };

      if (lead) {
        payload.customer = finalCustomerId;
        payload.assign_to = assignId;
      } else {
        payload.customer = finalCustomerId;
        payload.assign_to = assignId;
      }

      const url = lead ? `${API_URL}${lead.id}/` : API_URL;
      const method = lead ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        const msg =
          data?.detail || JSON.stringify(data) || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      Swal.fire({
        icon: "success",
        text: lead ? "Lead updated successfully" : "Lead added successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      onSuccess && onSuccess(data);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to save lead",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = async (e) => {
    const name = e.target.value;
    clearError(e);

    const prevName = formData.clientName;

    setFormData(prev => ({ ...prev, clientName: name }));
    setShowSuggestions(true);

    if (customerId && name !== prevName) {
      setCustomerId(null);
      setFormData(prev => ({
        ...prev,
        clientName: name,
        contactNumber: "",
        secondaryContactNumber: "",
        email: "",
        secondary_email: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
      }));
      contactRef.current = "";
    }

    if (!name || name.trim() === "") {
      setCustomerId(null);
      setFormData(prev => ({
        ...prev,
        clientName: "",
        contactNumber: "",
        secondaryContactNumber: "",
        email: "",
        secondary_email: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
      }));
      contactRef.current = "";
      setCustomerSuggestions([]);
      return;
    }

    if (name.length < 2) {
      setCustomerSuggestions([]);
      return;
    }

    try {
      const res = await fetch(
        `${baseApi.replace(/\/$/, "")}/lead/customer/?search=${name}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        }
      );

      if (!res.ok) return;

      const data = await res.json();
      const results = Array.isArray(data) ? data : data.results ?? [];

      setCustomerSuggestions(results);
    } catch (err) {
      console.error("Customer search error:", err);
      setCustomerSuggestions([]);
    }
  };

  const handleSelectCustomer = (customer) => {
    setCustomerId(customer.id);

    setFormData(prev => ({
      ...prev,
      clientName: customer.name || "",
      contactNumber: customer.contact_number || "",
      secondaryContactNumber: customer.secondary_contact_number || "",
      email: customer.email || "",
      secondary_email: customer.secondary_email || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      pincode: customer.pin_code || "",
    }));

    contactRef.current = customer.contact_number || "";

    setShowSuggestions(false);
    setCustomerSuggestions([]);
  };

  if (!open) return null;

  return (
    <>
      <style>
        {`
      .input-error {
        border: 1px solid red !important;
      }
    `}
      </style>
      <div className="fixed inset-0 bg-black/40 flex justify-center items-start sm:items-center p-6 z-50 mt-15">
        <div className="relative w-full max-w-2xl p-6 bg-white rounded-md shadow-lg max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-xl text-gray-500 hover:text-black"
          >
            <RxCross2 />
          </button>

          <h1 className="text-2xl font-bold text-center mb-4">
            {lead ? "Edit Enquiry" : "Add Enquiry"}
          </h1>

          {loadingLatestLead && (
            <div className="text-xs text-blue-500 mt-1">
              Fetching latest enquiry...
            </div>
          )}

          {latestLead && (
            <div className="text-xs text-green-600 mt-1">
              Last Project: {latestLead.project_name} | {latestLead.address}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* CUSTOMER DETAILS */}
            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Contact Number */}
                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      name="contactNumber"
                      placeholder="Enter Contact Number"
                      value={formData.contactNumber}
                      maxLength={10}
                      onChange={(e) => {
                        clearError(e);
                        const cleaned = e.target.value.replace(/\D/g, "");
                        if (cleaned.length <= 10) {
                          handleContactChange({ target: { value: cleaned } });
                        }
                        const input = e.target;
                        if (cleaned.length > 0 && cleaned.length < 10) {
                          input.classList.add("input-error");
                        } else {
                          input.classList.remove("input-error");
                        }
                      }}
                      className="w-full px-3 py-2 rounded-md border border-slate-300 placeholder-slate-400"
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {loadingLookup ? "Looking up customer..." : customerId ? `Matched customer id: ${customerId}` : ""}
                  </div>
                </div>

                {/* Customer Name */}
                <div className="relative">
                  <label className="text-sm font-normal text-gray-600">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleNameChange}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                  />

                  {showSuggestions && customerSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                      {customerSuggestions.map((c) => (
                        <div
                          key={c.id}
                          onMouseDown={() => handleSelectCustomer(c)}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-gray-500">
                            {c.contact_number} {c.email && `| ${c.email}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Secondary Contact Number
                  </label>
                  <input
                    name="secondaryContactNumber"
                    placeholder="Secondary Contact Number"
                    maxLength={10}
                    value={formData.secondaryContactNumber}
                    onChange={(e) => {
                      clearError(e);
                      const cleaned = e.target.value.replace(/\D/g, "");
                      if (cleaned.length <= 10) {
                        setFormData((prev) => ({
                          ...prev,
                          secondaryContactNumber: cleaned
                        }));
                      }
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={(e) => {
                      clearError(e);
                      handleChange(e);
                    }}
                    readOnly={!!customerId}
                    className={`w-full mt-1 px-3 py-2 rounded-md border border-slate-300 placeholder-slate-400 ${customerId ? "bg-gray-100" : ""
                      }`}
                  />
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Customer Secondary Email
                  </label>
                  <input
                    type="email"
                    name="secondary_email"
                    placeholder="Email Address"
                    value={formData.secondary_email}
                    onChange={(e) => {
                      clearError(e);
                      handleChange(e);
                    }}
                    readOnly={!!customerId}
                    className={`w-full mt-1 px-3 py-2 rounded-md border border-slate-300 placeholder-slate-400 ${customerId ? "bg-gray-100" : ""
                      }`}
                  />
                </div>

                <div className={formData.enquiryType === "organization" ? "md:col-span-2" : ""}>
                  <div
                    className={`grid gap-4 ${formData.enquiryType === "organization"
                      ? "grid-cols-1 md:grid-cols-3"
                      : "grid-cols-1 md:grid-cols-2"
                      }`}
                  >
                    <div className={formData.enquiryType !== "organization" ? "md:col-span-2" : ""}>
                      <label className="text-sm font-normal text-gray-600">
                        Customer Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="enquiryType"
                        className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                        value={formData.enquiryType}
                        onChange={(e) => {
                          handleChange(e);
                          if (e.target.value !== "organization") {
                            setFormData(prev => ({
                              ...prev,
                              contact_person_name: "",
                              contact_person_number: ""
                            }));
                          }
                        }}
                      >
                        <option value="">Select Customer Type</option>
                        <option value="individual">Individual</option>
                        <option value="organization">Organization</option>
                      </select>
                    </div>

                    {formData.enquiryType === "organization" && (
                      <>
                        <div>
                          <label className="text-sm font-normal text-gray-600">
                            Contact Person Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            name="contact_person_name"
                            placeholder="Contact Person Name"
                            value={formData.contact_person_name}
                            onChange={(e) => {
                              clearError(e);
                              handleChange(e);
                            }}
                            className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-normal text-gray-600">
                            Contact Person Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            name="contact_person_number"
                            placeholder="Contact Person Number"
                            maxLength={10}
                            value={formData.contact_person_number}
                            onChange={(e) => {
                              clearError(e);
                              handleChange(e);
                            }}
                            className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    placeholder="Address"
                    value={formData.address}
                    onChange={(e) => {
                      clearError(e);
                      handleChange(e);
                    }}
                    readOnly={!!customerId}
                    rows={1}
                    className={`w-full mt-1 px-3 py-2 rounded-md border border-slate-300 placeholder-slate-400 
                  ${customerId ? "bg-gray-100" : ""}`}
                  />
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={(e) => {
                      clearError(e);
                      handleChange(e);
                      setFormData(prev => ({ ...prev, city: "" }));
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                  >
                    <option value="">Select State</option>
                    {states.map((state) => (
                      <option key={state.isoCode} value={state.name}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    City <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="city"
                    value={formData.city}
                    onChange={(e) => {
                      clearError(e);
                      handleChange(e);
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                    disabled={!formData.state}
                  >
                    <option value="">
                      {!formData.state ? "Select State First" : "Select City"}
                    </option>
                    {cities.map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Pincode
                  </label>
                  <input
                    name="pincode"
                    placeholder="Pincode"
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => {
                      clearError(e);
                      const cleaned = e.target.value.replace(/\D/g, "");
                      if (cleaned.length <= 6) {
                        setFormData((prev) => ({
                          ...prev,
                          pincode: cleaned
                        }));
                      }
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Enquiry Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="serviceEnquiry"
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                    value={formData.serviceEnquiry || ""}
                    onChange={(e) => {
                      handleChange(e);
                      if (e.target.value === "sales") {
                        setFormData(prev => ({
                          ...prev,
                          serviceCategory: [],
                          customService: ""
                        }));
                      }
                    }}
                  >
                    <option value="">Select Enquiry Type</option>
                    <option value="sales">Sales</option>
                    <option value="service">Service</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                {(formData.serviceEnquiry === "service" || formData.serviceEnquiry === "both") && (
                  <div>
                    <label className="text-sm font-normal text-gray-600">
                      Service Category <span className="text-red-500">*</span>
                    </label>
                    <CreatableSelect
                      isMulti
                      options={serviceSelectOptions}
                      value={serviceSelectOptions.filter(option =>
                        (formData.serviceCategory || []).includes(option.value)
                      )}
                      onChange={(selectedOptions) => {
                        const values = selectedOptions
                          ? selectedOptions.map((opt) => opt.value)
                          : [];
                        setFormData(prev => ({
                          ...prev,
                          serviceCategory: values
                        }));
                      }}
                      onCreateOption={handleCreateService}
                      placeholder="Select or type service..."
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Project Name
                  </label>
                  <input
                    name="projectName"
                    placeholder="Project Name"
                    value={formData.projectName}
                    onChange={(e) => {
                      clearError(e);
                      handleChange(e);
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Project Address
                    <span className="ml-1 text-xs text-blue-500 font-normal">(Google Maps)</span>
                  </label>
                  <GooglePlacesInput
                    name="projectAddress"
                    value={formData.projectAddress}
                    onChange={(address) =>
                      setFormData((prev) => ({ ...prev, projectAddress: address }))
                    }
                    placeholder="Search project location on map..."
                    className="w-full mt-1 py-2 rounded-md border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                </div>
              </div>
            )}

            {/* LEAD DETAILS */}
            {step === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Enquiry Source <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="leadSource"
                    value={formData.leadSource}
                    onChange={(e) => {
                      clearError(e);
                      const selected = leadSourceOptions.find(
                        opt => opt.id === e.target.value
                      );
                      setFormData(prev => ({
                        ...prev,
                        leadSource: e.target.value,
                        leadSourceDetails: {
                          name: "",
                          mobile: "",
                          email: "",
                          address: ""
                        }
                      }));
                      setShowLeadSourceInput(!!selected?.needsInput);
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                  >
                    <option value="">Select Enquiry Source</option>
                    {leadSourceOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {userRole.name !== "sales" && (
                  <div>
                    <label className="text-sm font-normal text-gray-600">
                      Assign To <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="assignTo"
                      value={formData.assignTo}
                      onChange={(e) => {
                        clearError(e);
                        handleChange(e);
                      }}
                      className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                    >
                      <option value="">Assign To</option>
                      {assignOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} {o.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {showLeadSourceInput && (
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={formData.leadSourceDetails.name}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          leadSourceDetails: {
                            ...prev.leadSourceDetails,
                            name: e.target.value
                          }
                        }))
                      }
                      className="px-3 py-2 rounded-md border border-slate-300"
                    />

                    <input
                      type="text"
                      placeholder="Mobile"
                      maxLength={10}
                      value={formData.leadSourceDetails.mobile}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          leadSourceDetails: {
                            ...prev.leadSourceDetails,
                            mobile: e.target.value.replace(/\D/g, "")
                          }
                        }))
                      }
                      className="px-3 py-2 rounded-md border border-slate-300"
                    />

                    <input
                      type="email"
                      placeholder="Email"
                      value={formData.leadSourceDetails.email}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          leadSourceDetails: {
                            ...prev.leadSourceDetails,
                            email: e.target.value
                          }
                        }))
                      }
                      className="px-3 py-2 rounded-md border border-slate-300"
                    />

                    <input
                      type="text"
                      placeholder="Address"
                      value={formData.leadSourceDetails.address}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          leadSourceDetails: {
                            ...prev.leadSourceDetails,
                            address: e.target.value
                          }
                        }))
                      }
                      className="px-3 py-2 rounded-md border border-slate-300 md:col-span-3"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm font-normal text-gray-600">Enquiry Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="enquiry_date"
                    value={formData.enquiry_date}
                    onChange={(e) => {
                      clearError(e);
                      handleChange(e);
                    }}
                    readOnly={!!lead}
                    className={`w-full mt-1 px-3 py-2 rounded-md border border-slate-300 
                  ${lead ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  />
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Follow-up Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="followupDate"
                    value={formData.followupDate}
                    onChange={(e) => {
                      clearError(e);
                      handleChange(e);
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                  />
                </div>
              </div>
            )}

            {/* REQUIREMENTS */}
            {step === 2 && (
              <>
                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Requirement Details
                  </label>
                  <textarea
                    name="requirementDetails"
                    placeholder="Enter requirement"
                    value={formData.requirementDetails}
                    onChange={(e) => {
                      clearError(e);
                      handleChange(e);
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-normal text-gray-600">
                    Remarks
                  </label>
                  <textarea
                    name="remarks"
                    placeholder="Enter remarks"
                    value={formData.remarks}
                    onChange={(e) => {
                      clearError(e);
                      handleChange(e);
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-slate-300"
                  />
                </div>
              </>
            )}

            {/* Lead Qualifying Questions */}
            {step === 2 && (
              <LeadQualifyingPanel
                baseApi={baseApi}
                token={authToken}
                isQualified={isQualified}
                answers={qualifyingAnswers}
                onChange={setQualifyingAnswers}
                canApprove={canApprove}
                onToggleQualify={() => setIsQualified((v) => !v)}
              />
            )}

            {/* BUTTONS */}
            <div className="flex justify-between mt-6">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-400 rounded-md"
                >
                  Back
                </button>
              )}

              <div className="flex gap-4 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-400 rounded-md"
                >
                  Cancel
                </button>

                {step === 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) {
                        setStep(2);
                      }
                    }}
                    className="px-5 py-2 bg-blue-600 text-white rounded-md"
                  >
                    Next
                  </button>
                )}

                {step === 2 && (
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white rounded-md"
                    disabled={loading}
                  >
                    {loading ? (lead ? "Updating..." : "Saving...") : lead ? "Update" : "Submit"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        <AddCustomerForm
          open={showCustomerForm}
          onClose={() => setShowCustomerForm(false)}
          baseApi={baseApi}
          token={authToken}
          initialData={{
            contact: formData.contactNumber,
            email: formData.email,
            name: formData.clientName
          }}
          onSuccess={(newCustomer) => {
            setShowCustomerForm(false);
            if (newCustomer?.id) {
              setCustomerId(newCustomer.id);
              setFormData(prev => ({
                ...prev,
                clientName: newCustomer.name,
                contactNumber: newCustomer.contact_number,
                email: newCustomer.email
              }));
            }
          }}
        />
      </div>
    </>
  );
}