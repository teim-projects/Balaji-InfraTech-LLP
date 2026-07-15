import React, { useEffect, useState, useMemo } from "react";

/**
 * Reusable AddRoleForm
 *
 * Props:
 * - open: boolean
 * - onClose: fn()
 * - onSuccess: fn(createdOrUpdatedRole)
 * - baseApi: optional base url string
 * - initialName: optional string (for edit)
 * - roleId: optional id (for edit) — when provided, form does PUT /roles/{id}/
 */
export default function AddRoleForm({ open, onClose, onSuccess, baseApi, initialName = "", roleId = null }) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const BASE_API = baseApi ?? "http://127.0.0.1:8000";

  const token = useMemo(() => {
    return (
      localStorage.getItem("access") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  }, []);

  // sync initialName when editing different roles
  useEffect(() => {
    setName(initialName ?? "");
    setError(null);
  }, [initialName, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Role name is required");
      return;
    }

    setLoading(true);
    try {
      const url = roleId ? `${BASE_API}/auth/roles/${roleId}/` : `${BASE_API}/auth/roles/`;
      const method = roleId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.detail || data?.name || JSON.stringify(data) || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }

      onSuccess && onSuccess(data);
      onClose && onClose();
      setName("");
    } catch (err) {
      setError(err.message || "Failed to save role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-slate-600 hover:text-slate-900"
          aria-label="Close"
        >
          ✕
        </button>

        <h3 className="text-lg font-semibold mb-3">{roleId ? "Edit Role" : "Add Role"}</h3>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Role name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. account"
              className="w-full px-3 py-2 rounded-md border border-slate-200 focus:ring-2 focus:ring-sky-300"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-100 text-sm"
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm"
              disabled={loading}
            >
              {loading ? (roleId ? "Updating..." : "Saving...") : (roleId ? "Update" : "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
