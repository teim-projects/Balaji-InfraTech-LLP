import { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import { MdClose } from "react-icons/md";

// Local reusable component for Followup History Modal
const FollowupHistoryModal = ({ open, onClose, lead }) => {
  if (!open || !lead) return null;

  return (
    <div className="bg-white rounded-md shadow-lg w-full max-w-3xl relative max-h-[85vh] flex flex-col">
      <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Followup History</h2>
        <button
          onClick={onClose}
          className="text-xl font-bold hover:text-red-500"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="px-6 py-4 overflow-y-auto flex-1">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Follow-up Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
            <div>
              <span className="font-medium text-slate-600">Enquiry date:</span>{" "}
              {lead.enquiry_date || "—"}
            </div>
            <div>
              <span className="font-medium text-slate-600">Next followup:</span>{" "}
              {lead.followup_date || "—"}
            </div>
            <div>
              <span className="font-medium text-slate-600">Current status:</span>{" "}
              {lead.status || "—"}
            </div>
          </div>

          <div>
            <div className="font-medium text-slate-600 mb-2">Followup history</div>

            {lead.followups && lead.followups.length > 0 ? (
              <table className="w-full text-sm border border-slate-200 rounded-md overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Followup Date</th>
                    <th className="p-2 text-left">Next Followup</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {lead.followups.map((fu, idx) => (
                    <tr key={fu.id} className="border-t align-top">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2">{fu.followup_date || "—"}</td>
                      <td className="p-2">{fu.next_followup_date || "—"}</td>
                      <td className="p-2">{fu.status || "—"}</td>
                      <td className="p-2">
                        <div>{fu.remarks || "—"}</div>

                        {fu.faq_answers && fu.faq_answers.length > 0 && (
                          <div className="mt-2 text-xs text-slate-600">
                            <div className="font-semibold mb-1">FAQs:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {fu.faq_answers.map((faq) => (
                                <li key={faq.id}>
                                  <span className="font-medium">
                                    {faq.faq_question}:
                                  </span>{" "}
                                  {faq.answer || "—"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-sm text-slate-500">
                No followups recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * AddLeadFollowUpForm
 *
 * Props:
 * - open: boolean
 * - onClose: fn()
 * - onSuccess: fn(data)
 * - baseApi: optional base url string
 * - leadId: number (required for creating followup)
 * - followup: optional object (when provided → edit mode)
 */
export default function AddLeadFollowUpForm({
  open,
  onClose,
  onSuccess,
  baseApi,
  leadId,
  followup = null,
}) {
  const DEFAULT_API = "http://127.0.0.1:8000";
  const BASE_API = baseApi ?? DEFAULT_API;

  // --- Form state ---
  const [followupDate, setFollowupDate] = useState(followup?.followup_date ?? "");
  const [nextFollowupDate, setNextFollowupDate] = useState(
    followup?.next_followup_date ?? ""
  );
  const [status, setStatus] = useState(followup?.status ?? "in_process");
  const [remarks, setRemarks] = useState(followup?.remarks ?? "");
  const [showHistory, setShowHistory] = useState(false);

  // FAQ state
  const [faqList, setFaqList] = useState([]);
  const [faqAnswers, setFaqAnswers] = useState({});

  const [loading, setLoading] = useState(false);
  const [faqLoading, setFaqLoading] = useState(false);
  const [leadData, setLeadData] = useState(null);

  const token = useMemo(
    () =>
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "",
    []
  );

  useEffect(() => {
    if (!open || !leadId) return;

    const fetchLead = async () => {
      try {
        const res = await fetch(
          `${BASE_API}/lead/lead/${leadId}/`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        if (!res.ok) throw new Error("Failed to load lead");

        const data = await res.json();
        setLeadData(data);
      } catch (err) {
        console.error("Lead fetch error:", err);
        setLeadData(null);
      }
    };

    fetchLead();
  }, [open, leadId, BASE_API, token]);

  // sync when followup or modal open changes
  useEffect(() => {
    setFollowupDate(followup?.followup_date ?? "");
    setNextFollowupDate(followup?.next_followup_date ?? "");
    setStatus(followup?.status ?? "in_process");
    setRemarks(followup?.remarks ?? "");

    // prefill FAQ answers when editing
    if (followup?.faq_answers?.length) {
      const initial = {};
      followup.faq_answers.forEach((item) => {
        initial[item.faq] = item.answer || "";
      });
      setFaqAnswers(initial);
    } else {
      setFaqAnswers({});
    }

    setLoading(false);
  }, [followup, open]);

  // load FAQ master list when modal opens
  useEffect(() => {
    if (!open) return;

    const fetchFaqs = async () => {
      setFaqLoading(true);
      try {
        const res = await fetch(`${BASE_API}/lead/lead-faqs/`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          console.error("Failed to load FAQs", await res.text());
          return;
        }

        const data = await res.json();
        const items = Array.isArray(data?.results) ? data.results : data;

        setFaqList(items || []);

        setFaqAnswers((prev) => {
          const next = { ...prev };
          (items || []).forEach((faq) => {
            if (next[faq.id] === undefined) next[faq.id] = "";
          });
          return next;
        });
      } catch (err) {
        console.error("FAQ fetch error", err);
      } finally {
        setFaqLoading(false);
      }
    };

    fetchFaqs();
  }, [open, BASE_API, token]);

  if (!open) return null;

  const validate = () => {
    if (!leadId && !followup) {
      Swal.fire({
        icon: "error",
        title: "Validation",
        text: "Lead is required to create follow-up.",
      });
      return false;
    }

    if (!followupDate) {
      Swal.fire({
        icon: "error",
        title: "Validation",
        text: "Follow-up date is required",
      });
      return false;
    }

    if (!status) {
      Swal.fire({
        icon: "error",
        title: "Validation",
        text: "Status is required",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // Build FAQ payload (only non-empty answers)
      const faqPayload = Object.entries(faqAnswers)
        .filter(([, ans]) => ans && ans.toString().trim() !== "")
        .map(([faqId, ans]) => ({
          faq: Number(faqId),
          answer: ans.toString().trim(),
        }));

      const payload = {
        lead: leadId,
        followup_date: followupDate,
        next_followup_date: nextFollowupDate || null,
        status,
        remarks: remarks.trim(),
      };

      if (faqPayload.length) {
        payload.faq_answers = faqPayload;
      }

      const url = followup
        ? `${BASE_API}/lead/lead-followups/${followup.id}/`
        : `${BASE_API}/lead/lead-followups/`;
      const method = followup ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (!res.ok) {
        const msg =
          data?.detail || JSON.stringify(data) || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      Swal.fire({
        icon: "success",
        text: followup
          ? "Follow-up updated successfully"
          : "Follow-up added successfully",
        timer: 1200,
        showConfirmButton: false,
      });

      onSuccess && onSuccess(data);
      onClose && onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "Failed to save follow-up",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center z-50">
        <div className={`flex gap-4 transition-all duration-300 ${showHistory ? "max-w-6xl" : "max-w-3xl"} w-full`}>
          <div className={`bg-white rounded-md shadow-lg w-full relative max-h-[85vh] flex flex-col transition-all duration-300 ${showHistory ? "max-w-3xl" : "max-w-3xl mx-auto"}`}>
            {/* ---- FIXED HEADER ---- */}
            <div className="sticky top-0 bg-white z-10 border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {followup ? "Edit Follow-up" : "Add Follow-up"}
              </h2>

              <div className="flex items-center gap-3">
                {/* Followup History BUTTON */}
                <button
                  onClick={() => setShowHistory(true)}
                  className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                >
                  Followup History
                </button>

                {/* CLOSE BUTTON */}
                <button
                  onClick={onClose}
                  className="text-xl font-bold hover:text-red-500"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ---- SCROLLABLE FORM BODY ---- */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* Follow-up Date + Next Follow-up Date in one row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-700 mb-1 block">
                      Follow-up Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={followupDate}
                      onChange={(e) => setFollowupDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-700 mb-1 block">
                      Next Follow-up Date (optional)
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={nextFollowupDate}
                      onChange={(e) => setNextFollowupDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="in_process">In Process</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                {/* Remarks */}
                <div>
                  <label className="text-sm text-slate-700 mb-1 block">Remarks</label>
                  <textarea
                    className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter your remarks here..."
                  />
                </div>

                {/* FAQ section */}
                {faqList.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-md font-semibold">Standard Questions</h3>
                      {faqLoading && (
                        <span className="text-xs text-slate-500">Loading…</span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {faqList.map((faq) => (
                        <div key={faq.id}>
                          <label className="text-sm text-slate-700 mb-1 block">
                            {faq.question}
                          </label>
                          <textarea
                            className="w-full px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            value={faqAnswers[faq.id] ?? ""}
                            onChange={(e) =>
                              setFaqAnswers((prev) => ({
                                ...prev,
                                [faq.id]: e.target.value,
                              }))
                            }
                            placeholder="Enter your answer..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading
                      ? followup
                        ? "Updating..."
                        : "Saving..."
                      : followup
                        ? "Update"
                        : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* History Modal */}
          {showHistory && (
            <FollowupHistoryModal
              open={showHistory}
              onClose={() => setShowHistory(false)}
              lead={leadData}
            />
          )}
        </div>
      </div>
    </>
  );
}