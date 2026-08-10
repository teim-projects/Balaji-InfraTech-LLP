import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import Base from '../components/Base';
import { Save, ArrowLeft, UserCheck, MapPin, Receipt, PhoneCall } from 'lucide-react';
import { GetState, GetCity } from "react-country-state-city";
import "react-country-state-city/dist/react-country-state-city.css";

export default function RegisterCustomer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const token = useMemo(() => (
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    ""
  ), []);

  const [loading, setLoading] = useState(false);
  const [initialFetch, setInitialFetch] = useState(isEditing);

  const INDIA_ID = 101;
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [siteCitiesList, setSiteCitiesList] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    contact_number: "",
    secondary_contact_number: "",
    land_line_no: "",
    email: "",
    secondary_email: "",
    poc_name: "",
    poc_contact_number: "",
    address: "",
    city: "",
    state: "",
    pin_code: "",
    both_address_is_same: false,
    site_address: "",
    site_city: "",
    site_state: "",
    site_pin_code: "",
    gst: "",
    pan: "",
  });

  // Load States for India
  useEffect(() => {
    GetState(INDIA_ID).then((states) => {
      setStatesList(states || []);
    });
  }, []);

  // Fetch Customer details if editing
  useEffect(() => {
    if (isEditing) {
      fetchCustomerDetails();
    }
  }, [isEditing]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseApi.replace(/\/$/, "")}/lead/customer/${id}/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Failed to fetch customer details");
      const data = await res.json();

      setFormData({
        name: data.name || "",
        contact_number: data.contact_number || "",
        secondary_contact_number: data.secondary_contact_number || "",
        land_line_no: data.land_line_no || "",
        email: data.email || "",
        secondary_email: data.secondary_email || "",
        poc_name: data.poc_name || "",
        poc_contact_number: data.poc_contact_number || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        pin_code: data.pin_code || "",
        both_address_is_same: Boolean(data.both_address_is_same),
        site_address: data.site_address || "",
        site_city: data.site_city || "",
        site_state: data.site_state || "",
        site_pin_code: data.site_pin_code || "",
        gst: data.gst || "",
        pan: data.pan || "",
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to load customer details', 'error');
    } finally {
      setLoading(false);
      setInitialFetch(false);
    }
  };

  // Load cities when state changes
  const handleStateChange = (stateName) => {
    const stObj = statesList.find(s => s.name.toLowerCase() === stateName.toLowerCase());
    setFormData(prev => ({ ...prev, state: stateName, city: "" }));
    if (stObj) {
      GetCity(INDIA_ID, stObj.id).then(ctList => setCitiesList(ctList || []));
    } else {
      setCitiesList([]);
    }
  };

  const handleSiteStateChange = (stateName) => {
    const stObj = statesList.find(s => s.name.toLowerCase() === stateName.toLowerCase());
    setFormData(prev => ({ ...prev, site_state: stateName, site_city: "" }));
    if (stObj) {
      GetCity(INDIA_ID, stObj.id).then(ctList => setSiteCitiesList(ctList || []));
    } else {
      setSiteCitiesList([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validate = () => {
    if (!formData.name.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Customer Name is required" });
      return false;
    }
    if (formData.contact_number) {
      const cleanNumber = formData.contact_number.replace(/\D/g, "");
      if (cleanNumber.length !== 10) {
        Swal.fire({ icon: "error", title: "Validation", text: "Contact number must be exactly 10 digits" });
        return false;
      }
    }
    if (formData.poc_contact_number) {
      const cleanPocNumber = formData.poc_contact_number.replace(/\D/g, "");
      if (cleanPocNumber.length !== 10) {
        Swal.fire({ icon: "error", title: "Validation", text: "POC contact number must be exactly 10 digits" });
        return false;
      }
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Swal.fire({ icon: "error", title: "Validation", text: "Email address is invalid" });
      return false;
    }
    if (formData.gst) {
      const gstTrimmed = formData.gst.trim().toUpperCase();
      if (gstTrimmed.length !== 15) {
        Swal.fire({ icon: "error", title: "Validation", text: "GST number must be exactly 15 characters" });
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const url = isEditing 
        ? `${baseApi.replace(/\/$/, "")}/lead/customer/${id}/` 
        : `${baseApi.replace(/\/$/, "")}/lead/customer/`;
      const method = isEditing ? 'PATCH' : 'POST';

      const payload = {
        ...formData,
        name: formData.name.trim(),
        gst: formData.gst.trim().toUpperCase(),
        pan: formData.pan.trim().toUpperCase(),
      };

      if (formData.both_address_is_same) {
        payload.site_address = formData.address;
        payload.site_city = formData.city;
        payload.site_state = formData.state;
        payload.site_pin_code = formData.pin_code;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to save customer");
      }

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: isEditing ? 'Customer updated successfully' : 'Customer registered successfully',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        navigate('/customer');
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Error', err.message || 'An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (initialFetch) {
    return (
      <Base title="Customers">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Base>
    );
  }

  return (
    <Base title="Customers">
      <div className="space-y-6 max-w-7xl mx-auto pb-12 mt-4">
        {/* Top Header & Breadcrumbs */}
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/customer')}
              className="p-1.5 rounded-md hover:bg-slate-200 transition-colors"
              title="Back to Customers list"
            >
              <ArrowLeft className="w-6 h-6 text-slate-700" />
            </button>
            <h1 className="text-3xl font-bold text-slate-900">
              {isEditing ? "Edit Customer" : "Register a new customer"}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-10">
            Customer details, contact info, site addresses, and tax specifications.
          </p>

          {/* Breadcrumb */}
          <nav className="text-sm font-medium text-slate-600 mt-3 ml-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/customer')}
              className="hover:underline text-slate-700"
            >
              Customers
            </button>
            <span>/</span>
            <span className="text-slate-900 font-semibold">
              {isEditing ? "Edit Customer" : "Register Customer"}
            </span>
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Information Section */}
          <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <UserCheck className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">General Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Customer / Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. John Doe / Acme Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="10-digit mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Landline Number</label>
                <input
                  type="text"
                  name="land_line_no"
                  value={formData.land_line_no}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Landline number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Primary Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Secondary Email</label>
                <input
                  type="email"
                  name="secondary_email"
                  value={formData.secondary_email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="secondary@example.com"
                />
              </div>
            </div>
          </div>

          {/* POC Section */}
          <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <PhoneCall className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">Point of Contact (POC)</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">POC Name</label>
                <input
                  type="text"
                  name="poc_name"
                  value={formData.poc_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="POC Full Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">POC Contact Number</label>
                <input
                  type="text"
                  name="poc_contact_number"
                  value={formData.poc_contact_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>
          </div>

          {/* Tax Information Section */}
          <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Receipt className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">Tax Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
                <input
                  type="text"
                  name="gst"
                  value={formData.gst}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase"
                  placeholder="e.g. 22AAAAA0000A1Z5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase"
                  placeholder="e.g. ABCDE1234F"
                />
              </div>
            </div>
          </div>

          {/* Address Information Section */}
          <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <MapPin className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">Address Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-full">
                <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                <textarea
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Full street address..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">Select State</option>
                  {statesList.map(st => (
                    <option key={st.id} value={st.name}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="City name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pin Code</label>
                <input
                  type="text"
                  name="pin_code"
                  value={formData.pin_code}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="6-digit PIN"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="both_address_is_same"
                  checked={formData.both_address_is_same}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                />
                <span className="ml-2 text-sm font-medium text-slate-700">Site address is same as billing address</span>
              </label>
            </div>

            {!formData.both_address_is_same && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                <div className="col-span-full">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site Address</label>
                  <textarea
                    name="site_address"
                    rows={3}
                    value={formData.site_address}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Full site address..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site State</label>
                  <select
                    name="site_state"
                    value={formData.site_state}
                    onChange={(e) => handleSiteStateChange(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="">Select State</option>
                    {statesList.map(st => (
                      <option key={st.id} value={st.name}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site City</label>
                  <input
                    type="text"
                    name="site_city"
                    value={formData.site_city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Site city name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Site Pin Code</label>
                  <input
                    type="text"
                    name="site_pin_code"
                    value={formData.site_pin_code}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="6-digit PIN"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/customer')}
              className="px-6 py-2.5 text-slate-600 font-medium hover:text-slate-900 transition-colors mr-4"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
            >
              <Save className="w-5 h-5" />
              {loading ? "Saving..." : isEditing ? "Update Customer" : "Register Customer"}
            </button>
          </div>
        </form>
      </div>
    </Base>
  );
}
