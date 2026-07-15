import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Base from '../Base';  // ✅ Correct: go up one level
import axios from 'axios';

const ProductForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const BASE_API = import.meta.env.VITE_BASE_API_URL;
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        hsn_code: '',
        gst_type: 'GST',
        gst_percentage: 18,
        category: '',
        is_active: true,
        is_service: false,
        extra_attributes: {}
    });

    const authHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem("access")}` }
    });

    useEffect(() => {
        if (id) {
            fetchProduct();
        }
    }, [id]);

    const fetchProduct = async () => {
        try {
            const response = await axios.get(`${BASE_API}/product/products/${id}/`, authHeaders());
            setFormData(response.data);
        } catch (error) {
            console.error('Error fetching product:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (id) {
                await axios.put(`${BASE_API}/product/products/${id}/`, formData, authHeaders());
            } else {
                await axios.post(`${BASE_API}/product/products/`, formData, authHeaders());
            }
            navigate('/products');
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Error saving product. Please check the form.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Base title={id ? 'Edit Product' : 'Add Product'}>
            <div className="p-6 max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">
                    {id ? 'Edit Product' : 'Add New Product'}
                </h2>

                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Description */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price (₹) *
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                required
                                step="0.01"
                                min="0"
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* HSN Code */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                HSN Code
                            </label>
                            <input
                                type="text"
                                name="hsn_code"
                                value={formData.hsn_code}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* GST Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                GST Type
                            </label>
                            <select
                                name="gst_type"
                                value={formData.gst_type}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="GST">GST</option>
                                <option value="IGST">IGST</option>
                                <option value="CGST_SGST">CGST + SGST</option>
                                <option value="EXEMPT">Exempt</option>
                                <option value="NIL">Nil Rated</option>
                            </select>
                        </div>

                        {/* GST Percentage */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                GST Percentage (%)
                            </label>
                            <input
                                type="number"
                                name="gst_percentage"
                                value={formData.gst_percentage}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                max="100"
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category
                            </label>
                            <input
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                placeholder="e.g., AC, TV, Software, Service"
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Checkboxes */}
                        <div className="col-span-2 flex gap-6">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    className="mr-2"
                                />
                                Active
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    name="is_service"
                                    checked={formData.is_service}
                                    onChange={handleChange}
                                    className="mr-2"
                                />
                                Service Product (AMC)
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (id ? 'Update' : 'Create')}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/products')}
                            className="px-6 py-2 border rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </Base>
    );
};

export default ProductForm;