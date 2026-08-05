import React, { useEffect, useState } from "react";
import axios from "axios";
import { CiCircleRemove } from "react-icons/ci";

const AddLeadProductForm = ({
  products,
  setProducts,
  baseApi,
  authToken,
  deletedProductIds,
  setDeletedProductIds,
}) => {
  const [productOptions, setProductOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch generic products
  useEffect(() => {
    if (!baseApi || !authToken) return;
    fetchProducts();
  }, [baseApi, authToken]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${baseApi.replace(/\/$/, "")}/product/products/?is_active=true`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const data = res.data.results || res.data || [];
      setProductOptions(data);
    } catch (err) {
      console.error("Product fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const addProductRow = () => {
    const last = products[products.length - 1];
    if (!last?.product_data?.id) {
      // Show a warning or just return
      return;
    }

    setProducts(prev => [
      ...prev,
      {
        product_data: {},
        quantity: 1,
        expected_price: "",
        remarks: "",
      }
    ]);
  };

  const removeProductRow = (index) => {
    setProducts(prev => {
      const p = prev[index];
      if (p.id) {
        setDeletedProductIds(ids => [...ids, p.id]);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateProduct = (index, field, value) => {
    setProducts(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleProductSelect = (index, productId) => {
    const selected = productOptions.find(p => p.id === Number(productId));
    if (selected) {
      // Store complete product data as snapshot
      const productData = {
        id: selected.id,
        name: selected.name,
        sku: selected.sku,
        price: selected.price,
        category: selected.category,
        hsn_code: selected.hsn_code,
        gst_percentage: selected.gst_percentage,
      };
      updateProduct(index, "product_data", productData);
    } else {
      updateProduct(index, "product_data", {});
    }
  };

  const lastIndex = products.length - 1;

  return (
    <div className="border border-slate-300 rounded-md p-2 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-md font-semibold">Product Details</h2>
        <button
          type="button"
          onClick={addProductRow}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm"
        >
          + Add Product
        </button>
      </div>

      {/* ===== FORM (ONLY LAST PRODUCT) ===== */}
      {products.map((product, index) =>
        index === lastIndex ? (
          <div key={index} className="rounded-md p-3 mb-3 border border-slate-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* PRODUCT SELECT */}
              <div>
                <select
                  value={product.product_data?.id || ""}
                  onChange={(e) => handleProductSelect(index, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="">Select Product</option>
                  {productOptions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.sku} (₹{p.price})
                    </option>
                  ))}
                </select>
                {loading && <div className="text-xs text-slate-500 mt-1">Loading products...</div>}
              </div>

              {/* QUANTITY */}
              <input
                type="number"
                min="1"
                placeholder="Quantity"
                value={product.quantity}
                onChange={(e) =>
                  updateProduct(index, "quantity", e.target.value)
                }
                className="px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {/* EXPECTED PRICE */}
              <input
                type="number"
                step="0.01"
                placeholder="Expected Price"
                value={product.expected_price}
                onChange={(e) =>
                  updateProduct(index, "expected_price", e.target.value)
                }
                className="px-3 py-2 border border-slate-300 rounded-md"
              />

              {/* REMARKS */}
              <input
                type="text"
                placeholder="Product Remarks"
                value={product.remarks}
                onChange={(e) =>
                  updateProduct(index, "remarks", e.target.value)
                }
                className="px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>

            {/* Selected product info */}
            {product.product_data?.id && (
              <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <span className="font-medium">SKU:</span> {product.product_data.sku} | 
                <span className="font-medium ml-2">Category:</span> {product.product_data.category || 'N/A'} |
                <span className="font-medium ml-2">Price:</span> ₹{product.product_data.price}
                {product.product_data.hsn_code && (
                  <><span className="font-medium ml-2">HSN:</span> {product.product_data.hsn_code}</>
                )}
              </div>
            )}
          </div>
        ) : null
      )}

      {/* ===== TABLE (OLD PRODUCTS) ===== */}
      {products.length > 1 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border border-slate-300 text-sm border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-300 p-2">#</th>
                <th className="border border-slate-300 p-2">Product</th>
                <th className="border border-slate-300 p-2">SKU</th>
                <th className="border border-slate-300 p-2">Category</th>
                <th className="border border-slate-300 p-2">Qty</th>
                <th className="border border-slate-300 p-2">Expected Price</th>
                <th className="border border-slate-300 p-2">Action</th>
              </tr>
            </thead>

            <tbody>
              {products.slice(0, -1).map((p, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center">{i + 1}</td>
                  <td className="border border-slate-300 p-2">{p.product_data?.name || '—'}</td>
                  <td className="border border-slate-300 p-2">{p.product_data?.sku || '—'}</td>
                  <td className="border border-slate-300 p-2">{p.product_data?.category || '—'}</td>
                  <td className="border border-slate-300 p-2 text-center">
                    <input
                      type="number"
                      min="1"
                      value={p.quantity}
                      onChange={(e) =>
                        updateProduct(i, "quantity", e.target.value)
                      }
                      className="w-16 px-2 py-1 border rounded-md text-center"
                    />
                  </td>
                  <td className="border border-slate-300 p-2">
                    <input
                      type="number"
                      step="0.01"
                      value={p.expected_price}
                      onChange={(e) =>
                        updateProduct(i, "expected_price", e.target.value)
                      }
                      className="w-24 px-2 py-1 border rounded-md"
                    />
                  </td>
                  <td className="border border-slate-300 p-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeProductRow(i)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <CiCircleRemove size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AddLeadProductForm;