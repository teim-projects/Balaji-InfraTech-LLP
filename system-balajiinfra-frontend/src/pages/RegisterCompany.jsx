import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import Base from '../components/Base';
import { Save, ArrowLeft, Building, Receipt } from 'lucide-react';

export default function RegisterCompany() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const baseApi = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const token = useMemo(() => localStorage.getItem("access") || localStorage.getItem("access_token") || localStorage.getItem("token") || "", []);

  const [loading, setLoading] = useState(false);
  const [initialFetch, setInitialFetch] = useState(isEditing);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    vendor: "",
    gst: "",
    pf: "",
    esic: "",
    uniform_charge: "",
    admin_charge: "",
    ctc: "",
    salary_type: "monthly",
    is_active: true
  });

  // Fetch company details if editing
  useEffect(() => {
    if (isEditing) {
      fetchCompanyDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseApi.replace(/\/$/, "")}/lead/companies/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch company details");
      const data = await res.json();
      
      setFormData({
        name: data.name || "",
        address: data.address || "",
        vendor: data.vendor || "",
        gst: data.gst || "",
        pf: data.pf || "",
        esic: data.esic || "",
        uniform_charge: data.uniform_charge || "",
        admin_charge: data.admin_charge || "",
        ctc: data.ctc || "",
        salary_type: data.salary_type || "monthly",
        is_active: data.is_active !== undefined ? data.is_active : true
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to load company details', 'error');
    } finally {
      setLoading(false);
      setInitialFetch(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      Swal.fire({ icon: "error", title: "Validation", text: "Company Name is required" });
      return;
    }

    try {
      setLoading(true);
      const url = isEditing 
        ? `${baseApi.replace(/\/$/, "")}/lead/companies/${id}/` 
        : `${baseApi.replace(/\/$/, "")}/lead/companies/`;
      const method = isEditing ? 'PUT' : 'POST';

      const payload = { ...formData };
      
      // Ensure empty strings for decimals become null to prevent backend validation errors
      ['pf', 'esic', 'uniform_charge', 'admin_charge', 'ctc'].forEach(key => {
        if (payload[key] === "") {
          payload[key] = null;
        }
      });

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to save company");
      }

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: isEditing ? 'Company updated successfully' : 'Company registered successfully',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        navigate('/companies');
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
      <Base title="Companies">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Base>
    );
  }

  return (
    <Base title="Companies">
      <div className="space-y-6 max-w-7xl mx-auto pb-12 mt-4">
        {/* Top Header & Breadcrumbs */}
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/companies')}
              className="p-1.5 rounded-md hover:bg-slate-200 transition-colors"
              title="Back to Companies list"
            >
              <ArrowLeft className="w-6 h-6 text-slate-700" />
            </button>
            <h1 className="text-3xl font-bold text-slate-900">
              {isEditing ? "Edit Company" : "Register a new company"}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-10">
            Company information and billing details can be entered manually or updated here.
          </p>

          {/* Breadcrumb */}
          <nav className="text-sm font-medium text-slate-600 mt-3 ml-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/companies')}
              className="hover:underline text-slate-700"
            >
              Companies
            </button>
            <span>/</span>
            <span className="text-slate-900 font-semibold">
              {isEditing ? "Edit Company" : "Register Company"}
            </span>
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-xs border border-slate-200 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Building className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">Company Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="col-span-full md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div className="col-span-full md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Detailed address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Vendor</label>
                <input
                  type="text"
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Vendor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company GST</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Salary Type</label>
                <select
                  name="salary_type"
                  value={formData.salary_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 mt-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6">
                <Receipt className="w-5 h-5 text-sky-600" />
                <h3 className="text-lg font-bold text-slate-900">Billing Section</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PF (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="pf"
                    value={formData.pf}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ESIC (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="esic"
                    value={formData.esic}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Uniform Charge (Amt)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="uniform_charge"
                    value={formData.uniform_charge}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Admin Charge (Amt)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="admin_charge"
                    value={formData.admin_charge}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CTC (Amt)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="ctc"
                    value={formData.ctc}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => navigate('/companies')}
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
                {loading ? "Saving..." : isEditing ? "Update Company" : "Register Company"}
              </button>
            </div>

          </div>
        </form>
      </div>
    </Base>
  );
}
