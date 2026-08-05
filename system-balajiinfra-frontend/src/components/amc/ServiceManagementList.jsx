import { useState, useEffect } from "react";
import { MdEdit, MdDelete } from "react-icons/md";
import Swal from "sweetalert2";
import ServiceManagementForm from "./ServiceManagementForm";

export default function ServiceManagementList({ baseApi, token, filters = {} }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const fetchServices = async () => {
    setLoading(true);
    try {
      let url = `${baseApi}/amc/service-records/`;
      if (filters?.search) {
        url += `?search=${encodeURIComponent(filters.search)}`;
      }
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data.results || data);
      } else {
        throw new Error("Failed to load services");
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed to fetch services" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [baseApi, token, filters]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This will permanently delete this service record",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      confirmButtonColor: "#d33"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${baseApi}/amc/service-records/${id}/`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        Swal.fire({ icon: "success", text: "Service record deleted successfully", timer: 1200 });
        fetchServices();
      } else {
        throw new Error("Failed to delete service record");
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    }
  };

  const getStatusBadgeClass = (status) => {
    return status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-6">
      {/* Header card matching PackageList */}
      <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Service Management Records</h2>
          <div className="text-sm text-slate-600">
            {loading ? "Loading..." : `${services.length} service(s) found`}
          </div>
        </div>
        <div>
          <button
            onClick={() => {
              setSelectedService(null);
              setShowAddForm(true);
            }}
            className="px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700"
          >
            + Add Service
          </button>
        </div>
      </div>

      {/* Table Card matching PackageList */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Sr.No</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Customer Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Contact</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Subject</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Start Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">End Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Total Amount</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="px-4 py-8 text-center text-slate-500">
                  Loading services...
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-4 py-8 text-center text-slate-500">
                  No services found. Click "+ Add Service" to create one.
                </td>
              </tr>
            ) : (
              services.map((item, index) => (
                <tr key={item.id} className="border-b hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{index + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium">{item.customer_name}</td>
                  <td className="px-4 py-3 text-sm">{item.customer_contact}</td>
                  <td className="px-4 py-3 text-sm">{item.subject}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                      {item.contract_type === "one_time" ? "One Time" : item.contract_type?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadgeClass(item.contract_status)}`}>
                      {item.contract_status?.charAt(0).toUpperCase() + item.contract_status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.service_start_date
                      ? new Date(item.service_start_date).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.service_end_date
                      ? new Date(item.service_end_date).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">₹{parseFloat(item.total_price_with_gst || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedService(item);
                          setShowAddForm(true);
                        }}
                        className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
                        title="Edit"
                      >
                        <MdEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-2 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300"
                        title="Delete"
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form - Only shows when button is clicked */}
      {showAddForm && (
        <ServiceManagementForm
          key={selectedService?.id ?? 'new'}
          open={showAddForm}
          onClose={() => {
            setShowAddForm(false);
            setSelectedService(null);
          }}
          onSuccess={() => {
            setShowAddForm(false);
            setSelectedService(null);
            fetchServices();
          }}
          baseApi={baseApi}
          service={selectedService}
          token={token}
        />
      )}
    </div>
  );
}
