import React, { useEffect, useState } from "react";
import axios from "axios";
import { formatMaterialLabel, materialSelectionPayload } from "../utils/materialLabel";

const AcMaterialList = ({ base_api, onSelectionChange, resetTrigger }) => {
    const [acTypes, setAcTypes] = useState([]);
    // const [items, setItems] = useState([]);
    const [mappedMaterials, setMappedMaterials] = useState([]);
    const [selectedAcType, setSelectedAcType] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);

    const [loading, setLoading] = useState(false);

    // Auth headers
    const authHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem("access")}` },
    });

    // 🔹 Fetch AC Types
    const fetchAcTypes = async () => {
        try {
            const res = await axios.get(
                `${base_api}/product/actype/`,
                authHeaders()
            );
            const data = res.data?.results || res.data;
            setAcTypes(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (!onSelectionChange) return;

        const selectedData = mappedMaterials
            .filter(mat => selectedItems.includes(mat.material_id))
            .map(materialSelectionPayload);

        onSelectionChange({ materials: selectedData });
    }, [selectedItems, mappedMaterials]);

    // 🔹 Fetch Selected Materials
    const fetchSelectedMaterials = async (acTypeId) => {
        try {
            const res = await axios.get(
                `${base_api}/product/ac-material/?ac_type=${acTypeId}`,
                authHeaders()
            );

            // Handle both paginated (results) and non-paginated (direct array) responses
            const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);

            setMappedMaterials(data);

            // ❌ REMOVE AUTO SELECT
            setSelectedItems([]);

        } catch (err) {
            console.error(err);
            setMappedMaterials([]);
            setSelectedItems([]);
        }
    };
    // 🔹 Initial Load
    useEffect(() => {
        fetchAcTypes();

    }, []);

    // 🔹 When AC Type changes
    useEffect(() => {
        if (selectedAcType) {
            fetchSelectedMaterials(selectedAcType);
        } else {
            setSelectedItems([]);
        }
    }, [selectedAcType]);

    // 🔹 Handle Checkbox Change
    const handleCheckboxChange = (itemId) => {
        setSelectedItems((prev) =>
            prev.includes(itemId)
                ? prev.filter((id) => id !== itemId)
                : [...prev, itemId]
        );
    };

    useEffect(() => {
        setSelectedItems([]);
    }, [resetTrigger]);



    return (
        // <div className="bg-white p-6 rounded-lg shadow">
        //     <h2 className="text-xl font-semibold mb-4">AC Material Mapping</h2>

        //     {/* AC TYPE */}
        //     <div className="mb-4">
        //         <label className="block text-sm font-medium mb-1">
        //             Select AC Type
        //         </label>
        //         <select
        //             value={selectedAcType}
        //             onChange={(e) => setSelectedAcType(e.target.value)}
        //             className="w-full border rounded px-3 py-2"
        //         >
        //             <option value="">-- Select AC Type --</option>
        //             {acTypes.map((ac) => (
        //                 <option key={ac.id} value={ac.id}>
        //                     {ac.name}
        //                 </option>
        //             ))}
        //         </select>
        //     </div>

        //     {/* MATERIAL LIST */}
        //     {selectedAcType && (
        //         <div className="border rounded p-4 max-h-[400px] overflow-auto">
        //             <h3 className="font-medium mb-3">
        //                 Select Materials ({selectedItems.length} selected)
        //             </h3>

        //             <div className="grid grid-cols-2 gap-2">
        //                 {mappedMaterials.map((mat) => (
        //                     <label
        //                         key={mat.id}
        //                         className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
        //                     >
        //                         <input
        //                             type="checkbox"
        //                             checked={selectedItems.includes(mat.material_id)}
        //                             onChange={() => handleCheckboxChange(mat.material_id)}
        //                         />

        //                         <span>
        //                             {mat.material_name}
        //                         </span>
        //                     </label>
        //                 ))}
        //             </div>
        //         </div>
        //     )}

        //     {/* SAVE BUTTON */}
        //     {/* <div className="mt-4 flex justify-end">
        //         <button
        //             onClick={handleSave}
        //             disabled={loading || !selectedAcType}
        //             className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        //         >
        //             {loading ? "Saving..." : "Save"}
        //         </button>
        //     </div> */}
        // </div>

        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                {/* AC TYPE */}
                <select
                    value={selectedAcType}
                    onChange={(e) => setSelectedAcType(e.target.value)}
                    className="border rounded-md px-3 py-2"
                >
                    <option value="">Select AC Type</option>
                    {acTypes.map((ac) => (
                        <option key={ac.id} value={ac.id}>
                            {ac.name}
                        </option>
                    ))}
                </select>

                {/* MATERIAL SELECT */}
                <div className="relative">
                    <select
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!selectedItems.includes(val)) {
                                setSelectedItems([...selectedItems, val]);
                            }
                        }}
                        className="border rounded-md px-3 py-2 w-full"
                    >
                        <option value="">Select Material</option>
                        {mappedMaterials.map((mat) => (
                                <option key={mat.id} value={mat.material_id}>
                                    {formatMaterialLabel(mat)}
                                </option>
                            ))}
                    </select>
                </div>
            </div>

            {/* SELECTED CHIPS */}
            <div className="flex flex-wrap gap-2 mt-2">
                {selectedItems.map((id) => {
                    const mat = mappedMaterials.find(m => m.material_id === id);

                    if (!mat) return null;

                    let chipText = formatMaterialLabel(mat);

                    return (
                        <div
                            key={id}
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                        >
                            {chipText}

                            <button
                                onClick={() =>
                                    setSelectedItems(selectedItems.filter(i => i !== id))
                                }
                                className="text-red-500 font-bold"
                            >
                                ✕
                            </button>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default AcMaterialList;