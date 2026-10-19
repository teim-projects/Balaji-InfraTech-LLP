import React, { useCallback, useEffect, useMemo, useState } from "react";
import Base from "../components/Base";
import TableView from "../components/TableView";
import { MdEdit, MdDelete } from "react-icons/md";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  History,
  Eye,
  Download,
  X,
  Building,
  ExternalLink,
  Search,
  Filter,
  Users,
  Briefcase,
  FileSpreadsheet,
  Loader2,
  Calendar,
  CreditCard,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export default function Companies() {
  const navigate = useNavigate();
  const BASE_API = import.meta.env.VITE_BASE_API_URL ?? "http://127.0.0.1:8000";
  const API_URL = `${BASE_API.replace(/\/$/, "")}/payroll/companies/`;
  
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Monthly History modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryCompany, setSelectedHistoryCompany] = useState(null);
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingPeriod, setDownloadingPeriod] = useState(null);

  // Month Sheet Viewer states (opened via "View" on a month)
  const [viewingMonthItem, setViewingMonthItem] = useState(null);
  const [monthWorkers, setMonthWorkers] = useState([]);
  const [loadingMonthWorkers, setLoadingMonthWorkers] = useState(false);
  const [workerSearchQuery, setWorkerSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [viewerPage, setViewerPage] = useState(1);
  const VIEWER_PAGE_SIZE = 12;

  // Individual worker detail modal
  const [selectedWorkerDetail, setSelectedWorkerDetail] = useState(null);

  // pagination for companies list
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE_FALLBACK = 10;

  const handleOpenHistory = useCallback(async (company) => {
    setSelectedHistoryCompany(company);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    setViewingMonthItem(null);
    setSelectedWorkerDetail(null);

    try {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";

      const res = await fetch(`${API_URL}${company.id}/monthly-history/`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load company monthly history");
      }

      const data = await res.json();
      setMonthlyHistory(data.history || []);
    } catch (err) {
      console.error("Monthly History Fetch Error:", err);
      Swal.fire("Error", err.message || "Failed to load monthly history", "error");
      setMonthlyHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [API_URL]);

  const handleViewMonth = useCallback(async (monthItem) => {
    setViewingMonthItem(monthItem);
    setLoadingMonthWorkers(true);
    setWorkerSearchQuery("");
    setSelectedDepartment("All");
    setViewerPage(1);

    try {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";

      const url = `${API_URL}${selectedHistoryCompany.id}/workers/?month=${encodeURIComponent(monthItem.period)}`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load workers for this month");
      }

      const data = await res.json();
      setMonthWorkers(data.workers || []);
    } catch (err) {
      console.error("Worker fetch error:", err);
      Swal.fire("Error", err.message || "Failed to load workers", "error");
      setMonthWorkers([]);
    } finally {
      setLoadingMonthWorkers(false);
    }
  }, [API_URL, selectedHistoryCompany]);

  const handleDownloadMonthMasterRbu = async (monthItem) => {
    if (!selectedHistoryCompany || !monthItem) return;
    try {
      setDownloadingPeriod(monthItem.period);
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";

      const url = `${API_URL}${selectedHistoryCompany.id}/export-master-rbu/?month=${encodeURIComponent(monthItem.period)}`;
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Export failed (${res.status} ${res.statusText})`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      const cleanName = (selectedHistoryCompany.name || "Company").replace(/\s+/g, "_");
      const cleanMonth = (monthItem.name || monthItem.period).replace(/\s+/g, "_");
      a.download = `${cleanName}_${cleanMonth}_MASTER_RBU.xlsm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      Swal.fire({
        icon: "success",
        title: "Master RBU Downloaded",
        text: `Excel sheet for ${selectedHistoryCompany.name} (${monthItem.name}) matching MASTER RBU format downloaded successfully.`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Download Error:", err);
      Swal.fire("Download Failed", err.message || "Failed to export Master RBU file", "error");
    } finally {
      setDownloadingPeriod(null);
    }
  };

  const uniqueMonthDepartments = useMemo(() => {
    const set = new Set();
    monthWorkers.forEach((w) => {
      if (w.department && String(w.department).trim()) set.add(String(w.department).trim());
    });
    return ["All", ...Array.from(set).sort()];
  }, [monthWorkers]);

  const filteredMonthWorkers = useMemo(() => {
    let list = monthWorkers;
    if (selectedDepartment !== "All") {
      list = list.filter((w) => (w.department || "").toLowerCase() === selectedDepartment.toLowerCase());
    }
    if (workerSearchQuery.trim()) {
      const q = workerSearchQuery.toLowerCase().trim();
      list = list.filter((w) =>
        (w.name || "").toLowerCase().includes(q) ||
        (w.emp_code || "").toLowerCase().includes(q) ||
        (w.department || "").toLowerCase().includes(q) ||
        (w.designation || "").toLowerCase().includes(q) ||
        (w.mobile_no || "").includes(q) ||
        (w.adhar_no || "").includes(q) ||
        (w.account_no || "").includes(q) ||
        (w.bank_name || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [monthWorkers, selectedDepartment, workerSearchQuery]);

  const totalViewerPages = useMemo(
    () => Math.max(1, Math.ceil(filteredMonthWorkers.length / VIEWER_PAGE_SIZE)),
    [filteredMonthWorkers.length, VIEWER_PAGE_SIZE]
  );

  const paginatedMonthWorkers = useMemo(() => {
    const start = (viewerPage - 1) * VIEWER_PAGE_SIZE;
    return filteredMonthWorkers.slice(start, start + VIEWER_PAGE_SIZE);
  }, [filteredMonthWorkers, viewerPage, VIEWER_PAGE_SIZE]);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";
      if (!token) throw new Error("No bearer token found.");

      const params = new URLSearchParams();
      params.set("page", String(page));

      const url = `${API_URL}?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${body ? " - " + body : ""}`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.results)) {
        setRows(data.results);
        const count = Number.isFinite(data.count) ? data.count : data.results.length;
        const pageSize = data.results.length || PAGE_SIZE_FALLBACK;
        const calculatedPages = Math.max(1, Math.ceil(count / pageSize));

        setRows(data.results);
        setTotalPages(calculatedPages);

        if (page > calculatedPages && calculatedPages > 0) {
          setCurrentPage(calculatedPages);
        } else {
          setCurrentPage(page);
        }
      } else if (Array.isArray(data)) {
        setRows(data);
        setTotalPages(Math.max(1, Math.ceil(data.length / PAGE_SIZE_FALLBACK)));
        setCurrentPage(1);
      } else {
        throw new Error("Unexpected API response format");
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  const handleDelete = useCallback(async (id) => {
    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
      });

      if (!result.isConfirmed) return;

      const token =
        localStorage.getItem("access") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token") ||
        "";

      const res = await fetch(`${API_URL}${id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Failed to delete company");
      }

      Swal.fire("Deleted!", "Company has been deleted.", "success");
      
      if (rows.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else {
        fetchData(currentPage);
      }
    } catch (err) {
      console.error("Delete Error:", err);
      Swal.fire("Error", err.message || "Failed to delete", "error");
    }
  }, [API_URL, currentPage, rows.length, fetchData]);

  const columns = [
    { key: "sr", label: "Sr.No", render: (_, idx) => (currentPage - 1) * PAGE_SIZE_FALLBACK + (idx + 1) },
    { key: "name", label: "Company Name", render: (r) => r.name || "-" },
    { key: "address", label: "Address", render: (r) => r.address || "-" },
    { key: "vendor", label: "Vendor", render: (r) => r.vendor || "-" },
    { key: "gst", label: "GST", render: (r) => r.gst || "-" },
    {
      key: "billing",
      label: "Billing Configuration",
      render: (r) => (
        <div className="flex flex-wrap gap-1 text-[11px] max-w-xs">
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
            PF: {r.pf != null ? `${r.pf}%` : "13%"}
          </span>
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
            ESIC: {r.esic != null ? `${r.esic}%` : "3.25%"}
          </span>
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
            LWF: ₹{r.lwf != null ? r.lwf : "75"}
          </span>
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
            Uniform: ₹{r.uniform_charge != null ? r.uniform_charge : "300"}
          </span>
          <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-medium">
            Admin: {r.admin_charge != null ? `${r.admin_charge}%` : "7%"}
          </span>
        </div>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/companies/edit/${r.id}`)}
            className="px-2 py-1 bg-sky-100 text-sky-700 rounded hover:bg-sky-200 transition-colors"
            title="Edit Company"
          >
            <MdEdit />
          </button>
          <button
            onClick={() => handleOpenHistory(r)}
            className="px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors cursor-pointer"
            title="Company History & Master RBU"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(r.id)}
            className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            title="Delete Company"
          >
            <MdDelete />
          </button>
        </div>
      )
    },
  ];

  return (
    <Base title="Companies">
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-md shadow flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Companies</h2>
            <p className="text-sm text-slate-500 mt-1">Manage all registered companies and billing details.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/companies/register')}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Company
            </button>
          </div>
        </div>

        <TableView
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          page={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => {
            if (p < 1 || p > totalPages) {
              console.warn(`Invalid page ${p}. Total pages: ${totalPages}`);
              return;
            }
            setCurrentPage(p);
          }}
        />
      </div>

      {/* Monthly History Modal: Rows based on Month (e.g. August-Sept) with View & Download Actions */}
      {showHistoryModal && selectedHistoryCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-4 border border-slate-100 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-xs">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Company History & Records
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      {monthlyHistory.length} {monthlyHistory.length === 1 ? "Record" : "Records"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Company: <strong className="text-slate-800 text-xs">{selectedHistoryCompany.name}</strong>
                    {selectedHistoryCompany.vendor && (
                      <span className="ml-1 text-slate-500">• Vendor: {selectedHistoryCompany.vendor}</span>
                    )}
                    {selectedHistoryCompany.gst && (
                      <span className="ml-1 text-slate-400">• GST: {selectedHistoryCompany.gst}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/attendance/company/${selectedHistoryCompany.id}`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                  title="Open Attendance & Deduction Sheet for this company"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Attendance Sheet</span>
                  <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
                </button>

                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedHistoryCompany(null);
                    setViewingMonthItem(null);
                    setSelectedWorkerDetail(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Monthly History Table */}
            <div className="py-3 overflow-y-auto grow">
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-500">
                  <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600 mb-2"></div>
                  <p className="text-xs font-medium">Loading history records...</p>
                </div>
              ) : monthlyHistory.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">#</th>
                        <th className="py-2.5 px-4 font-semibold">Name</th>
                        <th className="py-2.5 px-4">Period</th>
                        <th className="py-2.5 px-4">Total Workers</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-4 text-center w-36">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyHistory.map((item, idx) => (
                        <tr key={item.period || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 text-center font-medium text-slate-400 text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 text-xs">
                            <span className="text-purple-900 font-bold bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md">
                              {item.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {item.period}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Users className="w-3 h-3 text-blue-600" />
                              {item.worker_count} Workers
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Master RBU Ready
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleViewMonth(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                                title={`View Master RBU Sheet for ${item.name}`}
                              >
                                <Eye className="w-3 h-3 text-slate-600" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMonthMasterRbu(item)}
                                disabled={downloadingPeriod === item.period}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-md transition-colors shadow-2xs cursor-pointer"
                                title={`Download Excel Sheet exactly like MASTER RBU for ${item.name}`}
                              >
                                {downloadingPeriod === item.period ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Download className="w-3 h-3" />
                                )}
                                <span>Download</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2.5 border border-purple-100">
                    <History className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">No Monthly History Records Found</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    When attendance and workers are recorded under this company, their monthly Master RBU sheets will appear here with View and Download actions.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 text-[11px] text-slate-400">
              <span>View or Download Excel matching <strong>11JUN 2026 NEW MASTER RBU (.xlsm)</strong></span>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedHistoryCompany(null);
                  setViewingMonthItem(null);
                  setSelectedWorkerDetail(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master RBU Month Sheet Viewer Modal (Opened by clicking "View" on a month) */}
      {viewingMonthItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full p-4 border border-slate-200 flex flex-col max-h-[92vh]">
            {/* Viewer Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 shrink-0 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedHistoryCompany?.name} • <span className="text-purple-700">{viewingMonthItem.name}</span>
                    </h3>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Master RBU Sheet Preview ({filteredMonthWorkers.length} Workers)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Period: <strong className="text-slate-700">{viewingMonthItem.period}</strong> • Structure matches 11JUN 2026 NEW MASTER RBU format
                  </p>
                </div>
              </div>

              {/* Action Buttons in Viewer Header */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadMonthMasterRbu(viewingMonthItem)}
                  disabled={downloadingPeriod === viewingMonthItem.period}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg shadow-sm transition-all cursor-pointer"
                  title="Download Excel Sheet (.xlsm)"
                >
                  {downloadingPeriod === viewingMonthItem.period ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download Excel (.xlsm)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingMonthItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Search & Department Toolbar */}
            <div className="py-2.5 px-3 my-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={workerSearchQuery}
                    onChange={(e) => {
                      setWorkerSearchQuery(e.target.value);
                      setViewerPage(1);
                    }}
                    placeholder="Search workers by name, biometric ID, department, mobile, Aadhar..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                  />
                  {workerSearchQuery && (
                    <button
                      onClick={() => setWorkerSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Dept:</span>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setViewerPage(1);
                    }}
                    className="py-1 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none text-slate-700"
                  >
                    {uniqueMonthDepartments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Viewer Table */}
            <div className="py-1 overflow-y-auto grow">
              {loadingMonthWorkers ? (
                <div className="py-16 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div>
                  <p className="text-xs font-semibold text-slate-600">Loading Master RBU worker data for {viewingMonthItem.name}...</p>
                </div>
              ) : paginatedMonthWorkers.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-2.5 text-center w-10">#</th>
                        <th className="py-2 px-3">Biometric ID</th>
                        <th className="py-2 px-3">Worker Name</th>
                        <th className="py-2 px-2.5">Gender</th>
                        <th className="py-2 px-2.5">DOB / DOJ</th>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-2.5">Designation</th>
                        <th className="py-2 px-2.5">Grade</th>
                        <th className="py-2 px-3">PF UAN / ESIC</th>
                        <th className="py-2 px-3">Bank A/C</th>
                        <th className="py-2 px-3">Mandays</th>
                        <th className="py-2 px-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedMonthWorkers.map((w, idx) => {
                        const actualIdx = (viewerPage - 1) * VIEWER_PAGE_SIZE + (idx + 1);
                        return (
                          <tr key={w.id || w.emp_code || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2 px-2.5 text-center font-medium text-slate-400 text-xs">
                              {actualIdx}
                            </td>
                            <td className="py-2 px-3 font-bold text-blue-700">
                              <span className="px-1.5 py-0.5 bg-blue-50 rounded border border-blue-200">
                                {w.emp_code || `EMP${String(actualIdx).padStart(3, '0')}`}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              <div>{w.salutation ? `${w.salutation} ` : ""}{w.name}</div>
                              {w.mobile_no && (
                                <div className="text-[10px] text-slate-400 font-normal">📱 {w.mobile_no}</div>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-slate-600">
                              {w.gender ? w.gender.replace(/^\d+\s*/, '') : "Male"}
                            </td>
                            <td className="py-2 px-2.5 text-slate-500 text-[11px]">
                              <div>DOB: {w.dob || "—"}</div>
                              <div className="text-[10px] text-slate-400">DOJ: {w.doj || "—"}</div>
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700">
                                {w.department || "Production"}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-slate-600 text-[11px]">
                              {w.designation || "Worker"}
                            </td>
                            <td className="py-2 px-2.5">
                              <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200 text-[10px] font-semibold">
                                {w.category || "SKILLED"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600">
                              <div>UAN: <strong className="text-slate-800">{w.uan_no || "—"}</strong></div>
                              <div className="text-[10px] text-slate-400">ESIC: {w.esic_no || "—"}</div>
                            </td>
                            <td className="py-2 px-3 text-[11px]">
                              {w.account_no ? (
                                <div>
                                  <div className="font-medium text-slate-800">{w.bank_name || "Bank"}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">A/C: {w.account_no}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No Bank Info</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-[11px]">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {w.total_mandays || 0} Mandays
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedWorkerDetail(w)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer border border-slate-200 shadow-2xs"
                                title="View Complete Master RBU Worker Profile"
                              >
                                <Eye className="w-3 h-3 text-slate-600" />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2.5 border border-purple-100">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">No Workers Found</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                    No workers matched your search criteria in this period.
                  </p>
                </div>
              )}
            </div>

            {/* Viewer Footer with Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-200 shrink-0 text-xs text-slate-500 gap-2">
              <div>
                Showing <strong>{filteredMonthWorkers.length === 0 ? 0 : (viewerPage - 1) * VIEWER_PAGE_SIZE + 1}</strong> to{" "}
                <strong>{Math.min(viewerPage * VIEWER_PAGE_SIZE, filteredMonthWorkers.length)}</strong> of{" "}
                <strong>{filteredMonthWorkers.length}</strong> workers
              </div>

              <div className="flex items-center gap-2">
                {totalViewerPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      disabled={viewerPage <= 1}
                      onClick={() => setViewerPage((p) => Math.max(1, p - 1))}
                      className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-xs">
                      Page {viewerPage} of {totalViewerPages}
                    </span>
                    <button
                      disabled={viewerPage >= totalViewerPages}
                      onClick={() => setViewerPage((p) => Math.min(totalViewerPages, p + 1))}
                      className="p-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setViewingMonthItem(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  Back to Monthly List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Master RBU Worker Detail View Modal */}
      {selectedWorkerDetail && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {selectedWorkerDetail.salutation ? `${selectedWorkerDetail.salutation} ` : ""}
                    {selectedWorkerDetail.name}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                      {selectedWorkerDetail.emp_code || "Biometric ID"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedWorkerDetail.designation || "Worker"} • {selectedWorkerDetail.department || "Production"} • {selectedWorkerDetail.job_location || selectedHistoryCompany?.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWorkerDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: 46 Master RBU Fields Organized in Dossier */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Section 1: Personal & Biometric Details */}
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-2.5 flex items-center gap-1.5 text-xs text-purple-700">
                  <Users className="w-3.5 h-3.5" />
                  <span>Personal & Biometric Information</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Biometric ID</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.emp_code || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Salutation</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.salutation || "Mr."}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">First Name</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.first_name || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Last Name</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.last_name || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Gender</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.gender || "1 Male"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Date of Birth</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.dob || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Date of Joining</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.doj || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Marital Status</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.marital_status || "MARRIED"}</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Deployment & Service Specifications */}
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-2.5 flex items-center gap-1.5 text-xs text-blue-700">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Deployment & Service Specifications</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Job Location</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.job_location || "5 RBU Dhule"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Department</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.department || "4 Production"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Designation</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.designation || "Worker"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Grade & Category</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.grade || "1 L1"} ({selectedWorkerDetail.category || "SKILLED"})</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Employee Type</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.employee_type || "9 Contactor Workers"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Working Hours</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.working_hr || "12HR"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Holiday Group & Shift</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.holiday_group || "4 Dhule"} • {selectedWorkerDetail.shift || "11 G Shift"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Week Off</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.week_off || "4 Sunday"}</strong>
                  </div>
                </div>
              </div>

              {/* Section 3: Statutory Numbers & Identification */}
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-2.5 flex items-center gap-1.5 text-xs text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Statutory Identification & Contact</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Aadhar Number</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.adhar_no || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">PAN Number</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.pan_number || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">PF UAN</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.uan_no || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">ESIC Number</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.esic_no || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Mobile Number</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.mobile_no || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Emergency Contact</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.emergency_contact_person || "—"} ({selectedWorkerDetail.emergency_contact_no || "—"})</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Mandays in Period</span>
                    <strong className="text-emerald-700 font-bold">{selectedWorkerDetail.total_mandays || 0} Days</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Recorded Periods</span>
                    <strong className="text-slate-800">{selectedWorkerDetail.attendance_dates?.join(", ") || "Active"}</strong>
                  </div>
                </div>
              </div>

              {/* Section 4: Bank Account & Address */}
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-800 mb-2.5 flex items-center gap-1.5 text-xs text-amber-700">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Bank & Address Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                  <div className="p-2.5 bg-white rounded border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">Banking Information</span>
                    <div className="space-y-0.5">
                      <div>Bank: <strong className="text-slate-800">{selectedWorkerDetail.bank_name || "—"}</strong></div>
                      <div>A/C No: <strong className="text-slate-800 font-mono">{selectedWorkerDetail.account_no || "—"}</strong></div>
                      <div>IFSC: <strong className="text-slate-800 font-mono">{selectedWorkerDetail.ifsc_code || "—"}</strong></div>
                      <div>Name in Bank: <strong className="text-slate-800">{selectedWorkerDetail.bank_holder_name || selectedWorkerDetail.name}</strong></div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded border border-slate-200/80">
                    <span className="text-[10px] text-slate-400 font-semibold block mb-1">Residential Address</span>
                    <div className="space-y-0.5 text-slate-700">
                      <div>
                        {selectedWorkerDetail.current_address_line1 || selectedWorkerDetail.current_address_city || "No address on record"}
                      </div>
                      {selectedWorkerDetail.current_address_line2 && (
                        <div>{selectedWorkerDetail.current_address_line2}</div>
                      )}
                      <div>
                        {selectedWorkerDetail.current_address_city && `${selectedWorkerDetail.current_address_city}, `}
                        {selectedWorkerDetail.current_address_state && `${selectedWorkerDetail.current_address_state} `}
                        {selectedWorkerDetail.current_address_pincode && ` - ${selectedWorkerDetail.current_address_pincode}`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Data formatted in conformance with <strong>11JUN 2026 NEW MASTER RBU</strong> standards
              </span>
              <button
                type="button"
                onClick={() => setSelectedWorkerDetail(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </Base>
  );
}
