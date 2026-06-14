/**
 * @file Departments.jsx
 * @description Department Management page.
 *
 *  Features:
 *    • List all departments with status badge
 *    • Create department (modal)
 *    • Edit department (modal)
 *    • Delete department (confirmation modal)
 *    • Navigate to department policy → /departments/:id/policy
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import DepartmentForm from "./DepartmentForm.jsx";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../services/departmentService.js";

/* ── Delete confirmation modal ── */
const DeleteModal = ({ dept, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.1]
                    bg-[#111827] p-6 shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </div>
      <h3 className="mb-1.5 text-lg font-semibold text-slate-100">Delete Department</h3>
      <p className="mb-6 text-sm text-slate-400">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-slate-200">{dept?.departmentName}</span>?
        Its policy will also be permanently removed.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5
                     text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50">
          Cancel
        </button>
        <button id="confirm-delete-dept" onClick={onConfirm} disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5
                     text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

/* ── Status badge ── */
const StatusBadge = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[12px] font-medium text-emerald-400 border border-emerald-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[12px] font-medium text-slate-500 border border-slate-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Inactive
    </span>
  );

/* ── Page ── */
const Departments = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);   // dept being edited
  const [deleteTarget, setDeleteTarget] = useState(null); // dept to confirm delete
  const [deleting,    setDeleting]    = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState("");
  const [toast,       setToast]       = useState(null);

  /* ── Consume toast passed via navigation state ── */
  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast);
      setTimeout(() => setToast(null), 3500);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch ── */
  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await getDepartments();
      if (res.success) setDepartments(res.data.departments);
    } catch {
      showToast("error", "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepts(); }, []);

  /* ── Create ── */
  const handleCreate = async (formData) => {
    setSubmitting(true);
    setFormError("");
    try {
      const res = await createDepartment(formData);
      if (res.success) {
        setShowForm(false);
        showToast("success", `Department "${formData.departmentName}" created.`);
        fetchDepts();
      } else setFormError(res.message);
    } catch (err) {
      setFormError(err.response?.data?.message || "Creation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Update ── */
  const handleUpdate = async (formData) => {
    setSubmitting(true);
    setFormError("");
    try {
      const res = await updateDepartment(editTarget._id, formData);
      if (res.success) {
        setEditTarget(null);
        showToast("success", `Department "${formData.departmentName}" updated.`);
        fetchDepts();
      } else setFormError(res.message);
    } catch (err) {
      setFormError(err.response?.data?.message || "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteDepartment(deleteTarget._id);
      if (res.success) {
        showToast("success", `Department "${deleteTarget.departmentName}" deleted.`);
        setDeleteTarget(null);
        fetchDepts();
      }
    } catch (err) {
      showToast("error", err.response?.data?.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout title="Departments">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Departments</h2>
          <p className="mt-1 text-sm text-slate-500">
            Total: <span className="font-semibold text-indigo-400">{departments.length}</span>
          </p>
        </div>
        <button
          id="add-dept-btn"
          onClick={() => { setFormError(""); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600
                     px-5 py-2.5 text-sm font-semibold text-white
                     shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:opacity-90 hover:-translate-y-px transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Department
        </button>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              {["Department Name", "Description", "Status", "Actions"].map((col) => (
                <th key={col} className="px-5 py-3.5 text-left text-[11.5px] font-semibold
                                         uppercase tracking-wider text-slate-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {/* Loading skeletons */}
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {[60, 40, 20, 30].map((w, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className={`h-3.5 rounded-full bg-white/[0.06] animate-pulse`} style={{ width: `${w}%` }} />
                  </td>
                ))}
              </tr>
            ))}

            {/* Empty */}
            {!loading && departments.length === 0 && (
              <tr>
                <td colSpan={4} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-600">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="7" width="20" height="14" rx="2"/>
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                    <p className="text-sm">No departments yet. Create one to get started.</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Rows */}
            {!loading && departments.map((dept) => (
              <tr key={dept._id} className="group transition-colors hover:bg-white/[0.03]">
                <td className="px-5 py-4 font-semibold text-slate-200">{dept.departmentName}</td>
                <td className="px-5 py-4 text-slate-400 max-w-xs truncate">
                  {dept.description || <span className="text-slate-600">—</span>}
                </td>
                <td className="px-5 py-4"><StatusBadge active={dept.isActive} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    {/* Policy */}
                    <button
                      id={`policy-${dept._id}`}
                      onClick={() => navigate(`/departments/${dept._id}/policy`)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                                 bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-slate-400
                                 hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-300 transition-all"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                      Policy
                    </button>
                    {/* Edit */}
                    <button
                      id={`edit-dept-${dept._id}`}
                      onClick={() => { setFormError(""); setEditTarget(dept); }}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                                 bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-slate-400
                                 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    {/* Delete */}
                    <button
                      id={`delete-dept-${dept._id}`}
                      onClick={() => setDeleteTarget(dept)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                                 bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-slate-400
                                 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Modals ── */}
      {showForm && (
        <DepartmentForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={submitting}
          error={formError}
          isEdit={false}
        />
      )}

      {editTarget && (
        <DepartmentForm
          initialData={editTarget}
          onSubmit={handleUpdate}
          onCancel={() => setEditTarget(null)}
          loading={submitting}
          error={formError}
          isEdit={true}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          dept={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 rounded-xl px-5 py-3.5
                         text-sm font-medium text-white shadow-2xl
                         ${toast.type === "success" ? "bg-emerald-600 border border-emerald-500/50" : "bg-red-600 border border-red-500/50"}`}>
          {toast.type === "success"
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          }
          {toast.msg}
        </div>
      )}
    </Layout>
  );
};

export default Departments;
