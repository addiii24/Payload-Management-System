/**
 * @file ShiftMaster.jsx
 * @description Shift Master management page.
 *
 *  Features:
 *    • Table listing all shifts (name, code, time, rate, status)
 *    • Add / Edit modal form
 *    • Soft-delete (deactivate) with confirmation
 *    • Active / All toggle filter
 */

import { useState, useEffect } from "react";
import Layout from "../components/Layout.jsx";
import {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
} from "../services/shiftService.js";

/* ── Helpers ── */
const INR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

/* ── Shift form modal ── */
const EMPTY_FORM = {
  shiftName: "", shiftCode: "", startTime: "", endTime: "",
  allowancePerDay: "", isActive: true,
};

const ShiftFormModal = ({ initial = EMPTY_FORM, isEdit, onSubmit, onCancel, loading, serverError }) => {
  const [form, setForm]   = useState({ ...EMPTY_FORM, ...initial });
  const [err,  setErr]    = useState("");

  const handle = (e) => {
    setErr("");
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.shiftName.trim())     { setErr("Shift name is required."); return; }
    if (!form.shiftCode.trim())     { setErr("Shift code is required."); return; }
    if (form.allowancePerDay === "" || isNaN(Number(form.allowancePerDay))) {
      setErr("Valid allowance per day is required."); return;
    }
    if (Number(form.allowancePerDay) < 0) { setErr("Allowance cannot be negative."); return; }
    setErr("");
    await onSubmit({ ...form, allowancePerDay: Number(form.allowancePerDay) });
  };

  const displayErr = err || serverError;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0f1422]
                      shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <h2 className="text-base font-semibold text-slate-100">
            {isEdit ? "Edit Shift" : "New Shift"}
          </h2>
          <button onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-colors">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-6 py-5">
          {displayErr && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10
                            px-4 py-3 text-[13px] text-red-300">
              <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {displayErr}
            </div>
          )}

          {/* Row: name + code */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">
                Shift Name <span className="text-red-400">*</span>
              </label>
              <input name="shiftName" value={form.shiftName} onChange={handle}
                placeholder="e.g. Night Shift" disabled={loading}
                className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">
                Code <span className="text-red-400">*</span>
              </label>
              <input name="shiftCode" value={form.shiftCode} onChange={handle}
                placeholder="e.g. NS" disabled={loading} style={{ textTransform: "uppercase" }}
                className="input-field" />
            </div>
          </div>

          {/* Row: times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">Start Time</label>
              <input type="time" name="startTime" value={form.startTime} onChange={handle}
                disabled={loading} className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">End Time</label>
              <input type="time" name="endTime" value={form.endTime} onChange={handle}
                disabled={loading} className="input-field" />
            </div>
          </div>

          {/* Allowance per day */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">
              Allowance Per Day (₹) <span className="text-red-400">*</span>
            </label>
            <input type="number" name="allowancePerDay" value={form.allowancePerDay} onChange={handle}
              placeholder="e.g. 150" min="0" disabled={loading} className="input-field" />
          </div>

          {/* isActive toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input type="checkbox" name="isActive" checked={form.isActive}
                onChange={handle} className="peer sr-only" />
              <div className="h-6 w-11 rounded-full border border-white/10 bg-white/[0.08]
                              peer-checked:bg-indigo-600 transition-colors" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-slate-500
                              peer-checked:translate-x-5 peer-checked:bg-white transition-all" />
            </div>
            <span className="text-sm text-slate-400">Active Shift</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} disabled={loading}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5
                         text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50 transition-all">
              Cancel
            </button>
            <button type="submit" id="shift-submit-btn" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl
                         bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5
                         text-sm font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)]
                         hover:opacity-90 disabled:opacity-60 transition-all">
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Delete confirmation modal ── */
const DeleteModal = ({ shift, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.1]
                    bg-[#111827] p-6 shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-slate-100">Deactivate Shift</h3>
      <p className="mb-5 text-sm text-slate-400">
        <span className="font-semibold text-slate-200">{shift?.shiftName}</span> will be marked
        inactive. Existing attendance records are preserved.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5
                     text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50">
          Cancel
        </button>
        <button id="confirm-deactivate-shift" onClick={onConfirm} disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5
                     text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60">
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          Deactivate
        </button>
      </div>
    </div>
  </div>
);

/* ── Status badge ── */
const Badge = ({ active }) => active
  ? <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20
                     bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
    </span>
  : <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/20
                     bg-slate-500/10 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" /> Inactive
    </span>;

/* ════════════════════════════════════════════════════════════ */
const ShiftMaster = () => {
  const [shifts,      setShifts]      = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [onlyActive,  setOnlyActive]  = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [formError,   setFormError]   = useState("");
  const [toast,       setToast]       = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await getShifts(onlyActive);
      if (res.success) setShifts(res.data.shifts);
      else showToast("error", res.message || "Failed to load shifts.");
    } catch { showToast("error", "Could not load shifts."); }
    finally   { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [onlyActive]);

  const handleCreate = async (data) => {
    setSubmitting(true); setFormError("");
    try {
      const res = await createShift(data);
      if (res.success) { setShowForm(false); showToast("success", "Shift created."); fetch(); }
      else setFormError(res.message);
    } catch (e) { setFormError(e.response?.data?.message || "Create failed."); }
    finally     { setSubmitting(false); }
  };

  const handleUpdate = async (data) => {
    setSubmitting(true); setFormError("");
    try {
      const res = await updateShift(editTarget._id, data);
      if (res.success) { setEditTarget(null); showToast("success", "Shift updated."); fetch(); }
      else setFormError(res.message);
    } catch (e) { setFormError(e.response?.data?.message || "Update failed."); }
    finally     { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteShift(deleteTarget._id);
      if (res.success) { showToast("success", "Shift deactivated."); setDeleteTarget(null); fetch(); }
      else showToast("error", res.message || "Failed.");
    } catch (e) { showToast("error", e.response?.data?.message || "Deactivate failed."); }
    finally     { setDeleting(false); }
  };

  return (
    <Layout title="Shift Master">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Shift Master</h2>
          <p className="mt-1 text-sm text-slate-500">Configure shift types and daily allowance rates.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Active toggle */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
            <div className="relative">
              <input type="checkbox" className="peer sr-only"
                checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
              <div className="h-5 w-9 rounded-full border border-white/10 bg-white/[0.08]
                              peer-checked:bg-indigo-600 transition-colors" />
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-500
                              peer-checked:translate-x-4 peer-checked:bg-white transition-all" />
            </div>
            Active only
          </label>
          <button id="add-shift-btn" onClick={() => { setFormError(""); setShowForm(true); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600
                       px-5 py-2.5 text-sm font-semibold text-white
                       shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:opacity-90 hover:-translate-y-px transition-all">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Shift
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              {["Shift Name","Code","Timing","Allowance / Day","Status","Actions"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold
                                       uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <tr key={i}>{[60,15,25,20,15,20].map((w, j) => (
                <td key={j} className="px-5 py-4">
                  <div className="h-3.5 rounded-full bg-white/[0.06] animate-pulse"
                       style={{ width: `${w}%` }} />
                </td>
              ))}</tr>
            ))}

            {!loading && shifts.length === 0 && (
              <tr><td colSpan={6} className="py-20 text-center text-sm text-slate-600">
                No shifts found. Create one to get started.
              </td></tr>
            )}

            {!loading && shifts.map((s) => (
              <tr key={s._id} className="group hover:bg-white/[0.03] transition-colors">
                <td className="px-5 py-3.5 font-semibold text-slate-200">{s.shiftName}</td>
                <td className="px-5 py-3.5">
                  <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[12px] text-indigo-400">
                    {s.shiftCode}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  {s.startTime && s.endTime ? `${s.startTime} – ${s.endTime}` : "—"}
                </td>
                <td className="px-5 py-3.5 font-semibold text-emerald-400">{INR(s.allowancePerDay)}</td>
                <td className="px-5 py-3.5"><Badge active={s.isActive} /></td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button id={`edit-shift-${s._id}`}
                      onClick={() => { setFormError(""); setEditTarget(s); }}
                      className="btn-row-action hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    {s.isActive && (
                      <button id={`deactivate-shift-${s._id}`}
                        onClick={() => setDeleteTarget(s)}
                        className="btn-row-action hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-400">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        Deactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showForm && (
        <ShiftFormModal onSubmit={handleCreate} onCancel={() => setShowForm(false)}
          loading={submitting} serverError={formError} isEdit={false} />
      )}
      {editTarget && (
        <ShiftFormModal initial={editTarget} onSubmit={handleUpdate}
          onCancel={() => setEditTarget(null)} loading={submitting}
          serverError={formError} isEdit={true} />
      )}
      {deleteTarget && (
        <DeleteModal shift={deleteTarget} onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)} loading={deleting} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 rounded-xl
                         px-5 py-3.5 text-sm font-medium text-white shadow-2xl
                         ${toast.type === "success" ? "bg-emerald-600 border border-emerald-500/50" : "bg-red-600 border border-red-500/50"}`}>
          {toast.type === "success"
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* Inline styles for reused button class */}
      <style>{`
        .input-field {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          color: #e2e8f0;
          outline: none;
          transition: all 0.15s;
        }
        .input-field:focus {
          border-color: rgba(99,102,241,0.5);
          box-shadow: 0 0 0 2px rgba(99,102,241,0.15);
        }
        .input-field:disabled { opacity: 0.5; }
        .input-field::placeholder { color: #475569; }

        .btn-row-action {
          display: flex; align-items: center; gap: 0.375rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem; font-weight: 500;
          color: #94a3b8;
          transition: all 0.15s;
        }
      `}</style>
    </Layout>
  );
};

export default ShiftMaster;
