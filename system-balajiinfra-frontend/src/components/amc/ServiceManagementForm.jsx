import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { MdClose } from 'react-icons/md';

const BASE_API = import.meta.env.VITE_BASE_API_URL ?? 'http://127.0.0.1:8000';

const getInitialFormData = () => ({
  customer_contact: '',
  customer_name: '',
  customer_email: '',
  subject: '',
  contract_type: 'one_time',
  contract_status: 'active',
  amc_service_type: '',
  segment: 'residential',
  service_start_date: '',
  service_end_date: '',
  state: '',
  city: '',
  pincode: '',
  address: '',
  apply_gst: true,
  gst_percentage: 18,
  products: [],
});

const getInitialNewMaterial = () => ({
  product_name: '',
  sku: '',
  quantity: '',
  unit: 'Nos',
  rate: 0,
  description: '',
  category: '',
  gst_percent: 18,
  mathadi_charges: 0,
  hsn_sac: '',
});

export default function ServiceManagementForm({
  open = false,
  onClose,
  onSuccess,
  baseApi = BASE_API,
  token: tokenProp,
  service = null,
}) {
  const token = tokenProp || localStorage.getItem('access');
  const isEdit = Boolean(service?.id);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  const [formData, setFormData] = useState(getInitialFormData);
  const [newMaterial, setNewMaterial] = useState(getInitialNewMaterial);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const handleClose = () => {
    onClose?.();
  };

  const resetForm = () => {
    setStep(1);
    setFormData(getInitialFormData());
    setNewMaterial(getInitialNewMaterial());
    setCustomerSearchInput('');
    setSelectedCustomer(null);
    setSelectedQuotation(null);
    setQuotations([]);
    setCustomers([]);
    setShowCustomerDropdown(false);
  };

  const mapQuotationProducts = (lowSideItems) => {
    return (lowSideItems || []).map((item, index) => ({
      id: `q-low-${item.id ?? index}-${Date.now()}`,
      product_data: {
        name: item.product_data?.name || item.description || item.item_code || 'Unknown',
        sku: item.product_data?.sku || item.item_code || '',
        category: item.product_data?.category || '',
        hsn_code: item.hsn_sac || '',
      },
      product_name: item.product_data?.name || item.description || item.item_code || 'Unknown',
      sku: item.product_data?.sku || item.item_code || '',
      quantity: item.quantity ?? 1,
      unit: item.unit || 'Nos',
      rate: parseFloat(item.unit_price) || 0,
      description: item.description || '',
      gst_percent: parseFloat(item.gst_percent) || 18,
      mathadi_charges: parseFloat(item.mathadi_charges) || 0,
      hsn_sac: item.hsn_sac || '',
      from_quotation: true,
    }));
  };

  const loadServiceForEdit = async (recordId) => {
    try {
      const recordRes = await axios.get(`${baseApi}/amc/service-records/${recordId}/`, { headers: authHeaders });
      const data = recordRes.data;

      setCustomerSearchInput(data.customer_name || '');
      if (data.customer) {
        setSelectedCustomer({ id: data.customer, name: data.customer_name });
      }

      // Map materials from service record
      const products = (data.materials || []).map((m) => ({
        id: m.id,
        product_data: m.product_data || {},
        product_name: m.product_data?.name || 'Unknown',
        sku: m.product_data?.sku || '',
        quantity: m.quantity || 1,
        unit: m.unit || 'Nos',
        rate: parseFloat(m.rate) || 0,
        description: m.description || '',
        gst_percent: 18,
        mathadi_charges: 0,
        hsn_sac: '',
      }));

      setFormData({
        customer_contact: data.customer_contact || '',
        customer_name: data.customer_name || '',
        customer_email: data.customer_email || '',
        subject: data.subject || '',
        contract_type: data.contract_type || 'one_time',
        contract_status: data.contract_status || 'active',
        amc_service_type: data.amc_service_type || '',
        segment: data.segment || 'residential',
        service_start_date: data.service_start_date || '',
        service_end_date: data.service_end_date || '',
        state: data.state || '',
        city: data.city || '',
        pincode: data.pincode || '',
        address: data.address || '',
        apply_gst: data.apply_gst ?? true,
        gst_percentage: parseFloat(data.gst_percentage) || 18,
        products: products,
      });
    } catch (error) {
      console.error('Error loading service record:', error);
      Swal.fire('Error', 'Failed to load service record for editing', 'error');
      handleClose();
    }
  };

  useEffect(() => {
    if (!open) return;

    setStep(1);
    if (service?.id) {
      loadServiceForEdit(service.id);
    } else {
      resetForm();
    }
  }, [open, service?.id]);

  // Search customers
  const handleCustomerSearch = async (searchTerm) => {
    setCustomerSearchInput(searchTerm);

    if (searchTerm.length < 2) {
      setCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }

    try {
      const response = await axios.get(
        `${baseApi}/lead/customer/?search=${searchTerm}`,
        { headers: authHeaders }
      );

      let customerList = [];
      if (Array.isArray(response.data)) {
        customerList = response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        customerList = response.data.results;
      }

      setCustomers(Array.isArray(customerList) ? customerList : []);
      setShowCustomerDropdown(true);
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomers([]);
    }
  };

  // Select customer
  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchInput(customer.name || '');
    setShowCustomerDropdown(false);

    // Auto-fill customer fields
    setFormData(prev => ({
      ...prev,
      customer_name: customer.name || '',
      customer_contact: customer.contact_number || '',
      customer_email: customer.email || '',
    }));

    // Fetch quotations for this customer
    try {
      const response = await axios.get(
        `${baseApi}/quotation/quotation/?customer=${customer.id}`,
        { headers: authHeaders }
      );

      let quotationList = [];
      if (Array.isArray(response.data)) {
        quotationList = response.data;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        quotationList = response.data.results;
      }

      setQuotations(Array.isArray(quotationList) ? quotationList : []);
      setSelectedQuotation(null);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      setQuotations([]);
    }
  };

  // Select quotation and auto-fill data
  const handleSelectQuotation = async (quotation) => {
    setSelectedQuotation(quotation);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const quoteRes = await axios.get(`${baseApi}/quotation/quotation/${quotation.id}/`, { headers });
      const quoteData = quoteRes.data;

      const activeVersion =
        quoteData.versions?.find((v) => v.is_active) ||
        quoteData.versions?.[quoteData.versions.length - 1];

      if (!activeVersion) {
        Swal.fire('Info', 'No quotation version found', 'info');
        return;
      }

      const lowSideItems = activeVersion.low_side_items || [];
      const quotationProducts = mapQuotationProducts(lowSideItems);

      setFormData((prev) => ({
        ...prev,
        subject: quoteData.subject || prev.subject,
        state: selectedCustomer?.state || prev.state,
        city: quoteData.site_city || selectedCustomer?.city || prev.city,
        pincode: String(
          quoteData.site_pincode ||
          selectedCustomer?.pin_code ||
          prev.pincode
        ),
        address: quoteData.site_address || selectedCustomer?.address || prev.address,
        products: quotationProducts,
      }));

      if (quotationProducts.length > 0) {
        Swal.fire({
          icon: 'success',
          title: 'Quotation loaded',
          text: `${quotationProducts.length} item(s) added from quotation ${quoteData.quotation_no || ''}`,
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        Swal.fire('Info', 'This quotation has no low-side items to import', 'info');
      }
    } catch (error) {
      console.error('Error fetching quotation details:', error);
      Swal.fire('Error', 'Failed to load quotation details', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      if (name === 'contract_type' && value !== 'amc') {
        next.amc_service_type = '';
      }
      return next;
    });
  };

  const handleMaterialChange = (e) => {
    const { name, value } = e.target;
    setNewMaterial(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'rate' ? (value === '' ? 0 : parseFloat(value)) : value
    }));
  };

  const handleAddMaterial = () => {
    if (!newMaterial.product_name) {
      Swal.fire('Error', 'Please enter Product Name', 'error');
      return;
    }

    if (newMaterial.rate <= 0 || newMaterial.quantity <= 0) {
      Swal.fire('Error', 'Please fill Quantity and Price correctly', 'error');
      return;
    }

    // Build product_data object
    const productData = {
      name: newMaterial.product_name,
      sku: newMaterial.sku || '',
      category: newMaterial.category || '',
      hsn_code: newMaterial.hsn_sac || '',
    };

    setFormData(prev => ({
      ...prev,
      products: [...prev.products, {
        ...newMaterial,
        product_data: productData,
        id: Date.now(),
        product_name: newMaterial.product_name,
      }]
    }));

    setNewMaterial(getInitialNewMaterial());
  };

  const buildRecordPayload = (totals) => {
    const { products, ...fields } = formData;
    return {
      ...fields,
      customer: selectedCustomer?.id || null,
      amc_service_type: fields.contract_type === 'amc' ? fields.amc_service_type : '',
      service_start_date: fields.service_start_date || null,
      service_end_date: fields.service_end_date || null,
      total_price_without_gst: totals.subtotal,
      gst_amount: totals.gst,
      total_price_with_gst: totals.total,
    };
  };

  const addMaterialsToRecord = async (recordId, products) => {
    for (const product of products) {
      await axios.post(
        `${baseApi}/amc/service-records/${recordId}/add_material/`,
        {
          product_data: product.product_data || {
            name: product.product_name,
            sku: product.sku || '',
            category: product.category || '',
          },
          quantity: product.quantity,
          unit: product.unit,
          rate: product.rate,
          description: product.description,
        },
        { headers: authHeaders }
      );
    }
  };

  const syncMaterialsForEdit = async (recordId, products) => {
    const recordRes = await axios.get(`${baseApi}/amc/service-records/${recordId}/`, {
      headers: authHeaders,
    });
    const existing = recordRes.data.materials || [];

    for (const material of existing) {
      await axios.delete(`${baseApi}/amc/service-records/${recordId}/material/${material.id}/`, {
        headers: authHeaders,
      });
    }

    await addMaterialsToRecord(recordId, products);
  };

  const handleRemoveMaterial = (id) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id)
    }));
  };

  const validateStep1 = () => {
    if (!formData.customer_name || !formData.customer_contact) {
      Swal.fire('Error', 'Please fill all customer fields', 'error');
      return false;
    }
    if (!formData.service_start_date) {
      Swal.fire('Error', 'Please select service start date', 'error');
      return false;
    }
    if (
      formData.service_end_date &&
      formData.service_start_date &&
      formData.service_end_date < formData.service_start_date
    ) {
      Swal.fire('Error', 'Service end date cannot be before start date', 'error');
      return false;
    }
    if (formData.contract_type === 'amc' && !formData.amc_service_type) {
      Swal.fire('Error', 'Please select AMC service type (Comprehensive or Non-Comprehensive)', 'error');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.state || !formData.city || !formData.pincode || !formData.address) {
      Swal.fire('Error', 'Please fill all location fields', 'error');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (formData.products.length === 0) {
      Swal.fire('Error', 'Please add at least one material', 'error');
      return false;
    }
    return true;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;

    if (!Array.isArray(formData.products)) {
      return { subtotal: 0, gst: 0, total: 0 };
    }

    formData.products.forEach(p => {
      try {
        const quantity = parseFloat(p.quantity) || 0;
        const rate = parseFloat(p.rate) || 0;
        const gstPercent = parseFloat(p.gst_percent) || 18;
        
        const itemSubtotal = quantity * rate;
        const itemGst = (itemSubtotal * gstPercent) / 100;
        
        subtotal += itemSubtotal;
        totalGst += itemGst;
      } catch (e) {
        console.error('Error calculating totals:', e, p);
      }
    });

    return { 
      subtotal, 
      gst: totalGst, 
      total: subtotal + totalGst 
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async () => {
    if (!validateStep3()) return;

    setLoading(true);
    try {
      const payload = buildRecordPayload(totals);

      if (isEdit) {
        await axios.put(`${baseApi}/amc/service-records/${service.id}/`, payload, {
          headers: authHeaders,
        });
        await syncMaterialsForEdit(service.id, formData.products);
        Swal.fire('Success', 'Service record updated successfully', 'success');
      } else {
        const recordResponse = await axios.post(`${baseApi}/amc/service-records/`, payload, {
          headers: authHeaders,
        });
        await addMaterialsToRecord(recordResponse.data.id, formData.products);
        Swal.fire('Success', 'Service record created successfully', 'success');
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      const errMsg =
        error.response?.data?.detail ||
        JSON.stringify(error.response?.data) ||
        'Failed to save';
      Swal.fire('Error', errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-slate-800">
            {isEdit ? 'Edit Service Record' : 'Service Management Record'}
          </h2>
          <button type="button" onClick={handleClose} className="text-slate-500 hover:text-slate-700">
            <MdClose size={24} />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="flex bg-slate-100 px-6 pt-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1">
              <button
                onClick={() => {
                  if (s === 1 || (s === 2 && validateStep1()) || (s === 3 && validateStep2())) {
                    setStep(s);
                  }
                }}
                className={`w-full pb-4 text-center font-semibold border-b-2 transition ${step === s ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent'
                  }`}
              >
                Step {s}
              </button>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP 1: Customer Details with Search */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Customer Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name <span className="text-red-600">*</span></label>
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={customerSearchInput}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />

                {/* Customer Dropdown */}
                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                    {customers.map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0"
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-slate-500">{customer.email || customer.contact_number}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quotation Selection */}
              {selectedCustomer && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Select Quotation <span className="text-slate-400 font-normal">(auto-fills items table)</span>
                  </label>
                  <select
                    value={selectedQuotation?.id || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (!value) {
                        setSelectedQuotation(null);
                        setFormData((prev) => ({ ...prev, products: [] }));
                        return;
                      }
                      const quot = quotations.find((q) => q.id === parseInt(value));
                      if (quot) handleSelectQuotation(quot);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Select Quotation --</option>
                    {quotations.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.quotation_no} ({new Date(q.created_at || q.quotation_date).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                  {quotations.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1">No quotations found for this customer.</p>
                  )}
                </div>
              )}

              {/* Auto-filled Customer Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact <span className="text-red-600">*</span></label>
                  <input type="text" name="customer_contact" value={formData.customer_contact} onChange={handleInputChange} placeholder="10-digit mobile" maxLength="15" className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email </label>
                  <input type="email" name="customer_email" value={formData.customer_email} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject <span className="text-red-600">*</span></label>
                <input type="text" name="subject" value={formData.subject} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contract Type</label>
                  <select name="contract_type" value={formData.contract_type} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="one_time">One Time</option>
                    <option value="amc">AMC</option>
                    <option value="warranty">Warranty</option>
                  </select>
                </div>
                {formData.contract_type === 'amc' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      AMC Service Type <span className="text-red-600">*</span>
                    </label>
                    <select
                      name="amc_service_type"
                      value={formData.amc_service_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="COMPREHENSIVE">Comprehensive</option>
                      <option value="NON_COMPREHENSIVE">Non-Comprehensive</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select name="contract_status" value={formData.contract_status} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Segment</label>
                  <select name="segment" value={formData.segment} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Service Start Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    name="service_start_date"
                    value={formData.service_start_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service End Date</label>
                  <input
                    type="date"
                    name="service_end_date"
                    value={formData.service_end_date}
                    onChange={handleInputChange}
                    min={formData.service_start_date || undefined}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Location Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State <span className="text-red-600">*</span></label>
                  <input type="text" name="state" value={formData.state} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City <span className="text-red-600">*</span></label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pincode <span className="text-red-600">*</span></label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} maxLength="10" className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address <span className="text-red-600">*</span></label>
                <textarea name="address" value={formData.address} onChange={handleInputChange} rows="3" className="w-full px-3 py-2 border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
              </div>
            </div>
          )}

          {/* STEP 3: Materials */}
          {step === 3 && (
            <div className="space-y-4">
              {selectedQuotation && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-2 rounded-lg">
                  Items loaded from quotation <strong>{selectedQuotation.quotation_no}</strong>.
                  You can edit values in the table or add more items below.
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Items</h3>
                </div>
                <button
                  type="button"
                  onClick={handleAddMaterial}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  + Add Product
                </button>
              </div>

              {/* Materials Form */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                {/* Row 1: Product Name & SKU */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Product Name <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={newMaterial.product_name}
                      onChange={(e) => setNewMaterial(prev => ({ ...prev, product_name: e.target.value }))}
                      placeholder="e.g., Split AC 1.5 Ton"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      SKU (optional)
                    </label>
                    <input
                      type="text"
                      value={newMaterial.sku}
                      onChange={(e) => setNewMaterial(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="Enter SKU"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                    />
                  </div>
                </div>

                {/* Row 2: Qty, Price, GST%, Category */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <input
                    type="number"
                    name="quantity"
                    placeholder="Qty"
                    value={newMaterial.quantity || ''}
                    onChange={handleMaterialChange}
                    min="0.01"
                    step="0.01"
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                  />

                  <input
                    type="number"
                    name="rate"
                    placeholder="Price"
                    value={newMaterial.rate || ''}
                    onChange={handleMaterialChange}
                    min="0"
                    step="0.01"
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                  />

                  <input
                    type="number"
                    name="gst_percent"
                    placeholder="GST%"
                    value={newMaterial.gst_percent || ''}
                    onChange={(e) => setNewMaterial(prev => ({ ...prev, gst_percent: e.target.value || 18 }))}
                    min="0"
                    step="0.01"
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                  />

                  <input
                    type="text"
                    name="category"
                    placeholder="Category"
                    value={newMaterial.category || ''}
                    onChange={(e) => setNewMaterial(prev => ({ ...prev, category: e.target.value }))}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                  />
                </div>

                {/* Row 3: HSN & Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="hsn_sac"
                    placeholder="HSN/SAC"
                    value={newMaterial.hsn_sac || ''}
                    onChange={(e) => setNewMaterial(prev => ({ ...prev, hsn_sac: e.target.value }))}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                  />

                  <select
                    name="unit"
                    value={newMaterial.unit}
                    onChange={handleMaterialChange}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                  >
                    <option>Rmt</option>
                    <option>Ft</option>
                    <option>Smtr</option>
                    <option>Sqft</option>
                    <option>Nos</option>
                    <option>Kg</option>
                    <option>Lot</option>
                    <option>m</option>
                    <option>in</option>
                  </select>
                </div>

                {/* Row 4: Description */}
                <div>
                  <textarea
                    name="description"
                    placeholder="Enter item description..."
                    value={newMaterial.description}
                    onChange={handleMaterialChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                  />
                </div>
              </div>

              {/* Materials Table */}
              {formData.products.length > 0 && (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Product Name</th>
                        <th className="px-4 py-2 text-left">SKU</th>
                        <th className="px-4 py-2 text-center">Qty</th>
                        <th className="px-4 py-2 text-center">Unit</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-right">GST%</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.products.map((p) => {
                        const itemSubtotal = (parseFloat(p.quantity) || 0) * (parseFloat(p.rate) || 0);
                        const gstPercent = parseFloat(p.gst_percent) || 18;
                        const itemGst = (itemSubtotal * gstPercent) / 100;
                        const itemTotal = itemSubtotal + itemGst;
                        
                        return (
                          <tr key={p.id} className="border-t hover:bg-slate-50">
                            <td className="px-4 py-2">{p.product_data?.name || p.product_name || 'Unknown'}</td>
                            <td className="px-4 py-2">{p.product_data?.sku || p.sku || '-'}</td>
                            <td className="px-4 py-2 text-center">{p.quantity}</td>
                            <td className="px-4 py-2 text-center">{p.unit}</td>
                            <td className="px-4 py-2 text-right">₹{(parseFloat(p.rate) || 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">{gstPercent.toFixed(2)}%</td>
                            <td className="px-4 py-2 text-right font-semibold">₹{itemTotal.toFixed(2)}</td>
                            <td className="px-4 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveMaterial(p.id)}
                                className="text-red-600 hover:text-red-800 font-bold"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 border">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹ {totals.subtotal.toFixed(2)}</span>
                </div>
                {formData.apply_gst && (
                  <div className="flex justify-between">
                    <span>GST :</span>
                    <span className="font-semibold">₹ {totals.gst.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-lg font-bold">
                  <span>Total:</span>
                  <span>₹ {totals.total.toFixed(2)}</span>
                </div>
                <label className="flex items-center gap-2 mt-4">
                  <input type="checkbox" name="apply_gst" checked={formData.apply_gst} onChange={handleInputChange} />
                  <span className="text-sm">Apply GST</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-slate-50">
          <button type="button" onClick={handleClose} className="px-6 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium">
            Cancel
          </button>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-6 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium">
              Previous
            </button>
          )}
          {step < 3 && (
            <button
              onClick={() => {
                if (step === 1 && validateStep1()) setStep(2);
                if (step === 2 && validateStep2()) setStep(3);
              }}
              className="ml-auto px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Next
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="ml-auto px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Record' : 'Create Record'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}