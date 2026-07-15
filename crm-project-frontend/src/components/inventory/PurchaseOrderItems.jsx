import React, { useState, useEffect } from "react";
import { MdDelete } from "react-icons/md";
import AcMaterialList from "../AcMaterialList";

export default function PurchaseOrderItems({
  baseApi,
  token,
  initialProducts = [],
  onProductsChange
}) {
  const [products, setProducts] = useState(initialProducts || []);
  const LENGTH_UNITS = ["Rmt", "Ft", "Smtr", "Meter", "Sqft", "Nos", "Kg", "Lot"];

  useEffect(() => {
    setProducts(initialProducts || []);
  }, [initialProducts]);

  // ===================== SECTION STATES =====================

  const [sectionTitle, setSectionTitle] = useState("");
  const [activeSection, setActiveSection] = useState(null);

  // ===================== HIGH SIDE STATES (MANUAL INPUT) =====================

  const [highForm, setHighForm] = useState({
    product_name: "",
    sku: "",
    quantity: "",
    rate: "",
    uom: "Nos",
    description: "",
    hsn_code: "",
    category: ""
  });

  // ===================== LOW SIDE STATES =====================

  const [brands, setBrands] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [resetMaterials, setResetMaterials] = useState(0);

  const [lowForm, setLowForm] = useState({
    brand: "",
    quantity: "",
    rate: "",
    uom: LENGTH_UNITS[0],
    description: ""
  });

  const DEFAULT_HIGH_FORM = {
    product_name: "",
    sku: "",
    quantity: "",
    rate: "",
    uom: "Nos",
    description: "",
    hsn_code: "",
    category: ""
  };

  const DEFAULT_LOW_FORM = {
    brand: "",
    quantity: "",
    rate: "",
    uom: LENGTH_UNITS[0],
    description: ""
  };

  // ===================== LOAD BRANDS =====================

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      // Fetch items to extract brands
      const response = await fetch(`${baseApi}/product/item/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = Array.isArray(data) ? data : (data.results || []);
        
        // Extract unique brands
        const uniqueBrands = [];
        const seenBrands = new Set();
        
        items.forEach(item => {
          if (item.brand_id && item.brand_name && !seenBrands.has(item.brand_id)) {
            uniqueBrands.push({
              id: item.brand_id,
              name: item.brand_name
            });
            seenBrands.add(item.brand_id);
          }
        });
        
        setBrands(uniqueBrands);
      }
    } catch (err) {
      console.error("Error loading brands:", err);
      setBrands([]);
    }
  };

  // Auto-populate brand when material is selected
  useEffect(() => {
    if (selectedMaterials.length > 0) {
      const uniqueBrands = [...new Set(selectedMaterials.map(mat => mat.brand_id).filter(Boolean))];
      
      if (uniqueBrands.length === 1) {
        setLowForm(prev => ({ ...prev, brand: uniqueBrands[0] }));
      } else if (uniqueBrands.length > 1) {
        setLowForm(prev => ({ ...prev, brand: "" }));
      } else {
        setLowForm(prev => ({ ...prev, brand: "" }));
      }
    }
  }, [selectedMaterials]);

  // ===================== ADD SECTION =====================

  const addSection = () => {
    if (!sectionTitle.trim()) return;

    const sectionCount = products.filter(p => p.is_section).length + 1;
    const serial = sectionCount.toString();

    const newSection = {
      serial_no: serial,
      sort_order: products.length + 1,
      is_section: true,
      section_title: sectionTitle,
      product_data: {},
      description: null,
      quantity: 0,
      uom: null,
      rate: 0
    };

    const updated = [...products, newSection];
    updateProducts(updated);
    setActiveSection(serial);
    setSectionTitle("");
  };

  // ===================== HELPERS =====================

  const generateItemSerial = () => {
    if (!activeSection) return null;

    const childCount = products.filter(
      p =>
        !p.is_section &&
        p.serial_no.startsWith(activeSection + ".")
    ).length;

    return `${activeSection}.${childCount + 1}`;
  };

  const updateProducts = (updated) => {
    setProducts(updated);
    onProductsChange(updated);
  };

  // ===================== ADD HIGH PRODUCT (MANUAL INPUT) =====================

  const addHighProduct = () => {
    if (!highForm.product_name.trim()) {
      alert("Please enter a product name");
      return;
    }
    if (!activeSection) {
      alert("Please create or select a section first.");
      return;
    }

    const newProduct = {
      serial_no: generateItemSerial(),
      sort_order: products.length + 1,
      is_section: false,
      section_title: null,
      product_data: {
        name: highForm.product_name,
        sku: highForm.sku || "",
        category: highForm.category || "",
        hsn_code: highForm.hsn_code || "",
      },
      description: highForm.description,
      quantity: parseFloat(highForm.quantity) || 0,
      uom: highForm.uom,
      rate: parseFloat(highForm.rate) || 0
    };

    const insertIndex = products.reduce((lastIndex, p, i) => {
      if (p.serial_no.startsWith(activeSection + ".")) {
        return i + 1;
      }
      if (p.serial_no === activeSection) {
        return i + 1;
      }
      return lastIndex;
    }, products.length);

    const updated = [...products];
    updated.splice(insertIndex, 0, newProduct);

    updateProducts(updated);

    // ✅ RESET FORM
    setHighForm(DEFAULT_HIGH_FORM);
  };

  // ===================== ADD LOW ITEM =====================

  const addLowItem = () => {
    if (selectedMaterials.length === 0) {
      alert("Please select at least one material");
      return;
    }
    if (!activeSection) {
      alert("Please create or select a section first.");
      return;
    }

    const insertIndex = products.reduce((lastIndex, p, i) => {
      if (p.serial_no.startsWith(activeSection + ".")) return i + 1;
      if (p.serial_no === activeSection) return i + 1;
      return lastIndex;
    }, products.length);

    const updated = [...products];

    selectedMaterials.forEach((mat, idx) => {
      let brandToUse = mat.brand_id;
      let brandNameToUse = mat.brand_name;
      
      if (!mat.brand_id || lowForm.brand) {
        brandToUse = lowForm.brand;
        const selectedBrand = brands.find(b => b.id == lowForm.brand);
        brandNameToUse = selectedBrand?.name || "";
      }

      const newProduct = {
        serial_no: generateItemSerial(),
        sort_order: updated.length + 1,
        is_section: false,
        section_title: null,
        product_data: {
          id: mat.id,
          name: mat.material_name || `Material ${mat.id}`,
          sku: mat.item_code || "",
          category: mat.category || "",
          hsn_code: mat.hsn_sac || "",
        },
        item: mat.id,
        item_code: mat.material_name || `Material ${mat.id}`,
        brand: brandToUse,
        brand_name: brandNameToUse,
        description: lowForm.description,
        quantity: parseFloat(lowForm.quantity || 1),
        uom: lowForm.uom,
        rate: parseFloat(lowForm.rate || 0)
      };

      updated.splice(insertIndex + idx, 0, newProduct);
    });

    updateProducts(updated);

    // ✅ RESET AFTER ADD
    setSelectedMaterials([]);
    setLowForm(DEFAULT_LOW_FORM);
    setResetMaterials(prev => prev + 1);
  };

  // ===================== EDIT ROW =====================

  const handleEdit = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;
    updateProducts(updated);
  };

  const handleProductDataEdit = (index, field, value) => {
    const updated = [...products];
    updated[index].product_data = {
      ...updated[index].product_data,
      [field]: value
    };
    updateProducts(updated);
  };

  const removeRow = (index) => {
    const updated = products.filter((_, i) => i !== index);

    // Recalculate numbering per section
    let sectionCounter = 0;
    const finalList = [];
    
    updated.forEach(p => {
      if (p.is_section) {
        sectionCounter++;
        p.serial_no = sectionCounter.toString();
        finalList.push(p);
      } else {
        const parent = finalList
          .slice()
          .reverse()
          .find(s => s.is_section);

        if (parent) {
          const childCount = finalList.filter(
            x =>
              !x.is_section &&
              x.serial_no.startsWith(parent.serial_no + ".")
          ).length;

          p.serial_no = `${parent.serial_no}.${childCount + 1}`;
        }

        finalList.push(p);
      }
    });

    updateProducts(finalList);
  };

  // ===================== UI =====================

  return (
    <div className="space-y-8">
      <style>
        {`
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>

      {/* ================= ADD SECTION ================= */}
      <div className="border rounded-xl p-4 bg-gray-50 shadow-sm">
        <h4 className="font-semibold mb-2">Add Section</h4>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter Section Title (e.g. Air Conditioners)"
            className="border rounded-md px-3 py-2 flex-1"
            value={sectionTitle}
            onChange={e => setSectionTitle(e.target.value)}
          />
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            onClick={addSection}
          >
            + Add Section
          </button>
        </div>
      </div>

      {/* ================= HIGH SIDE (MANUAL INPUT) ================= */}
      <div className="border rounded-xl p-5 shadow-sm bg-white">
        <h4 className="font-semibold text-gray-700 mb-4 border-b pb-2">
          High Side Products
        </h4>

        <div className="space-y-4">
          {/* Row 1 - Product Name, SKU, Category, HSN */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Product Name *"
              className="border rounded-md px-3 py-2"
              value={highForm.product_name}
              onChange={e => setHighForm({ ...highForm, product_name: e.target.value })}
            />
            <input
              type="text"
              placeholder="SKU (optional)"
              className="border rounded-md px-3 py-2"
              value={highForm.sku}
              onChange={e => setHighForm({ ...highForm, sku: e.target.value })}
            />
            <input
              type="text"
              placeholder="Category"
              className="border rounded-md px-3 py-2"
              value={highForm.category}
              onChange={e => setHighForm({ ...highForm, category: e.target.value })}
            />
            <input
              type="text"
              placeholder="HSN Code"
              className="border rounded-md px-3 py-2"
              value={highForm.hsn_code}
              onChange={e => setHighForm({ ...highForm, hsn_code: e.target.value })}
            />
          </div>

          {/* Row 2 - Qty, Rate, UOM, Add Button */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input
              type="number"
              placeholder="Qty"
              className="border rounded-md px-3 py-2"
              value={highForm.quantity}
              onChange={e => setHighForm({ ...highForm, quantity: e.target.value })}
            />

            <input
              type="number"
              placeholder="Rate"
              className="border rounded-md px-3 py-2"
              value={highForm.rate}
              onChange={e => setHighForm({ ...highForm, rate: e.target.value })}
            />

            <select
              className="border rounded-md px-3 py-2"
              value={highForm.uom}
              onChange={e => setHighForm({ ...highForm, uom: e.target.value })}
            >
              {LENGTH_UNITS.map((unit, index) => (
                <option key={index} value={unit}>{unit}</option>
              ))}
            </select>

            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md whitespace-nowrap"
              onClick={addHighProduct}
            >
              + Add
            </button>
          </div>

          {/* Row 3 - Description */}
          <div className="flex gap-3 items-start">
            <textarea
              placeholder="Description"
              className="border rounded-md px-3 py-2 flex-1"
              rows={2}
              value={highForm.description}
              onChange={e => setHighForm({ ...highForm, description: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* ================= LOW SIDE ================= */}
      <div className="border rounded-xl p-5 shadow-sm bg-white">
        <h4 className="font-semibold text-gray-700 mb-4 border-b pb-2">
          Low Side Items
        </h4>

        <div className="space-y-4">
          {/* Material Selection */}
          <div className="space-y-3">
            <AcMaterialList
              base_api={baseApi}
              resetTrigger={resetMaterials}
              onSelectionChange={(data) => {
                setSelectedMaterials(data.materials || []);
              }}
            />
          </div>

          {/* Row 2 - Qty, Rate, Brand, UOM, Add Button */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <input
              type="number"
              placeholder="Qty"
              className="border rounded-md px-3 py-2"
              value={lowForm.quantity}
              onChange={e => setLowForm({ ...lowForm, quantity: e.target.value })}
            />

            <input
              type="number"
              placeholder="Rate"
              className="border rounded-md px-3 py-2"
              value={lowForm.rate}
              onChange={e => setLowForm({ ...lowForm, rate: e.target.value })}
            />

            {/* Brand Dropdown */}
            <select
              className="border rounded-md px-3 py-2"
              value={lowForm.brand}
              onChange={e => setLowForm({ ...lowForm, brand: e.target.value })}
              disabled={selectedMaterials.length > 0 && 
                       [...new Set(selectedMaterials.map(mat => mat.brand_id).filter(Boolean))].length === 1}
              title={
                selectedMaterials.length > 0 && 
                [...new Set(selectedMaterials.map(mat => mat.brand_id).filter(Boolean))].length === 1 
                  ? "Brand auto-populated from item" 
                  : selectedMaterials.length > 0 && 
                    [...new Set(selectedMaterials.map(mat => mat.brand_id).filter(Boolean))].length > 1
                    ? "Multiple brands detected - please select one"
                    : ""
              }
            >
              <option value="">Select Brand</option>
              {(() => {
                if (selectedMaterials.length > 0) {
                  const materialBrands = selectedMaterials
                    .filter(mat => mat.brand_id && mat.brand_name)
                    .map(mat => ({ id: mat.brand_id, name: mat.brand_name }));
                  
                  const uniqueBrands = materialBrands.filter((brand, index, self) => 
                    index === self.findIndex(b => b.id === brand.id)
                  );
                  
                  return uniqueBrands.map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ));
                } else {
                  return brands.map(brand => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ));
                }
              })()}
            </select>

            <select
              className="border rounded-md px-3 py-2"
              value={lowForm.uom}
              onChange={e => setLowForm({ ...lowForm, uom: e.target.value })}
            >
              {LENGTH_UNITS.map((unit, index) => (
                <option key={index} value={unit}>{unit}</option>
              ))}
            </select>

            <button
              type="button"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md whitespace-nowrap"
              onClick={addLowItem}
            >
              + Add
            </button>
          </div>

          {/* Row 3 - Description */}
          <textarea
            placeholder="Description"
            className="border rounded-md px-3 py-2 w-full"
            rows={2}
            value={lowForm.description}
            onChange={e => setLowForm({ ...lowForm, description: e.target.value })}
          />

          {/* Selected Materials Count */}
          {selectedMaterials.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedMaterials.length} material(s) selected
            </div>
          )}
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="border rounded-xl shadow-sm bg-white p-4 overflow-x-auto">
        <h4 className="font-semibold text-gray-700 mb-3">Selected Items</h4>

        <table className="min-w-full text-sm border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left">S.No</th>
              <th className="border px-3 py-2 text-left">Product / Description</th>
              <th className="border px-3 py-2 text-left">SKU</th>
              <th className="border px-3 py-2 text-left">Qty</th>
              <th className="border px-3 py-2 text-left">UOM</th>
              <th className="border px-3 py-2 text-left">Rate</th>
              <th className="border px-3 py-2 text-left">Amount</th>
              <th className="border px-3 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, index) => (
              <tr
                key={index}
                onClick={() => p.is_section && setActiveSection(p.serial_no)}
                className={
                  p.is_section
                    ? `bg-gray-200 font-semibold cursor-pointer ${activeSection === p.serial_no
                      ? "ring-2 ring-blue-500"
                      : ""
                    }`
                    : "hover:bg-gray-50"
                }
              >
                <td className="border px-3 py-2">{p.serial_no}</td>

                {p.is_section ? (
                  <>
                    <td colSpan="6" className="border px-3 py-2">
                      {p.section_title}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() => removeRow(index)}
                      >
                        <MdDelete />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border px-3 py-2">
                      {/* Product Name with edit capability */}
                      <input
                        type="text"
                        className="border rounded px-2 py-1 w-full mb-1"
                        value={p.product_data?.name || p.item_code || ""}
                        onChange={e => handleProductDataEdit(index, "name", e.target.value)}
                        placeholder="Product Name"
                      />
                      {p.description && (
                        <div className="text-xs text-gray-500">{p.description}</div>
                      )}
                    </td>
                    <td className="border px-3 py-2">
                      <input
                        type="text"
                        className="border rounded px-2 py-1 w-full"
                        value={p.product_data?.sku || p.item_code || ""}
                        onChange={e => handleProductDataEdit(index, "sku", e.target.value)}
                        placeholder="SKU"
                      />
                    </td>
                    <td className="border px-3 py-2">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-20"
                        value={p.quantity}
                        onChange={e =>
                          handleEdit(index, "quantity", parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="border px-3 py-2">
                      <select
                        className="border rounded px-2 py-1 w-full"
                        value={p.uom || "Nos"}
                        onChange={e => handleEdit(index, "uom", e.target.value)}
                      >
                        {LENGTH_UNITS.map((unit, idx) => (
                          <option key={idx} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border px-3 py-2">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-24"
                        value={p.rate}
                        onChange={e =>
                          handleEdit(index, "rate", parseFloat(e.target.value) || 0)
                        }
                      />
                    </td>
                    <td className="border px-3 py-2 font-medium">
                      {(p.quantity * p.rate).toFixed(2)}
                    </td>
                    <td className="border px-3 py-2 text-center">
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() => removeRow(index)}
                      >
                        <MdDelete />
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}