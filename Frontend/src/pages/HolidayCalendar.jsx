/**
 * @file HolidayCalendar.jsx
 * @description Company Holiday Calendar page.
 *
 *  Features:
 *    • Year filter + Type filter
 *    • List table of all holidays for selected year
 *    • Add / Edit modal form (name, date, type, isPaid, description)
 *    • Delete with confirmation modal
 *    • Type badges with distinct colours
 *    • Toast notifications
 */

import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../services/holidayService.js";

/* ── Constants ──────────────────────────────────────────────── */
const HOLIDAY_TYPES = [
  "National",
  "Festival",
  "Company Holiday",
  "Maintenance Shutdown",
  "Optional Holiday",
];

const TYPE_COLORS = {
  "National":             "bg-red-500/10    border-red-500/25    text-red-400",
  "Festival":             "bg-amber-500/10  border-amber-500/25  text-amber-400",
  "Company Holiday":      "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
  "Maintenance Shutdown": "bg-slate-500/10  border-slate-500/25  text-slate-400",
  "Optional Holiday":     "bg-indigo-500/10 border-indigo-500/25 text-indigo-400",
};

const MONTH_NAMES = [
  "","Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTH_NAMES[d.getUTCMonth() + 1]} ${d.getUTCFullYear()}`;
};

/* ── Empty form ─────────────────────────────────────────────── */
const EMPTY = {
  name: "",
  date: "",
  type: "National",
  isPaid: true,
  description: "",
};

/* ── Shared input/select CSS ────────────────────────────────── */
const INPUT =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 " +
  "text-sm text-slate-200 placeholder-slate-600 outline-none transition-all " +
  "focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-50";

/* ══════════════════════════════════════════════════════════════
   HOLIDAY FORM MODAL
══════════════════════════════════════════════════════════════ */
const HolidayFormModal = ({ initial, isEdit, onSubmit, onCancel, loading, serverError }) => {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [err,  setErr]  = useState("");

  const handle = (e) => {
    setErr("");
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())  { setErr("Holiday name is required."); return; }
    if (!form.date)         { setErr("Date is required."); return; }
    if (!form.type)         { setErr("Holiday type is required."); return; }
    setErr("");
    await onSubmit({ ...form });
  };

  const displayErr = err || serverError;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0f1422] shadow-[0_25px_50px_rgba(0,0,0,0.6)]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <h2 className="text-base font-semibold text-slate-100">
            {isEdit ? "Edit Holiday" : "Add Holiday"}
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
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
              <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {displayErr}
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">
              Holiday Name <span className="text-red-400">*</span>
            </label>
            <input name="name" value={form.name} onChange={handle}
              placeholder="e.g. Republic Day" disabled={loading} className={INPUT} />
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">
              Date <span className="text-red-400">*</span>
            </label>
            <input type="date" name="date" value={form.date} onChange={handle}
              disabled={loading} className={INPUT} />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">
              Holiday Type <span className="text-red-400">*</span>
            </label>
            <select name="type" value={form.type} onChange={handle}
              disabled={loading} className={INPUT}>
              {HOLIDAY_TYPES.map((t) => (
                <option key={t} value={t} className="bg-[#0f1422]">{t}</option>
              ))}
            </select>
          </div>

          {/* isPaid toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input type="checkbox" name="isPaid" checked={form.isPaid} onChange={handle}
                className="peer sr-only" />
              <div className="h-6 w-11 rounded-full border border-white/10 bg-white/[0.08] peer-checked:bg-indigo-600 transition-colors" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-slate-500 peer-checked:translate-x-5 peer-checked:bg-white transition-all" />
            </div>
            <span className="text-sm text-slate-400">Paid Holiday <span className="text-slate-600 text-xs">(counts as paid day)</span></span>
          </label>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">Description <span className="text-slate-600">(optional)</span></label>
            <textarea name="description" value={form.description} onChange={handle}
              rows={2} placeholder="e.g. Government declared holiday..."
              disabled={loading}
              className={`${INPUT} resize-none`} />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} disabled={loading}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)] hover:opacity-90 disabled:opacity-60 transition-all">
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {isEdit ? "Update" : "Add Holiday"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   DELETE MODAL
══════════════════════════════════════════════════════════════ */
const DeleteModal = ({ holiday, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#111827] p-6 shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-400">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-slate-100">Delete Holiday</h3>
      <p className="mb-5 text-sm text-slate-400">
        Remove <span className="font-semibold text-slate-200">{holiday?.name}</span>
        {" "}({fmtDate(holiday?.date)})? This cannot be undone.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════
   TYPE BADGE
══════════════════════════════════════════════════════════════ */
const TypeBadge = ({ type }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${TYPE_COLORS[type] || "bg-slate-500/10 border-slate-500/25 text-slate-400"}`}>
    {type}
  </span>
);

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
const HolidayCalendar = () => {
  const [year,        setYear]        = useState(currentYear);
  const [typeFilter,  setTypeFilter]  = useState("");
  const [holidays,    setHolidays]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [formError,   setFormError]   = useState("");
  const [toast,       setToast]       = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHolidays({ year, type: typeFilter || undefined });
      if (res.success) setHolidays(res.data.holidays ?? []);
      else showToast("error", res.message || "Failed to load holidays.");
    } catch {
      showToast("error", "Could not load holidays.");
    } finally {
      setLoading(false);
    }
  }, [year, typeFilter]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  /* ── Create ── */
  const handleCreate = async (data) => {
    setSubmitting(true); setFormError("");
    try {
      const res = await createHoliday(data);
      if (res.success) {
        setShowForm(false);
        showToast("success", "Holiday added.");
        fetchHolidays();
      } else setFormError(res.message);
    } catch (e) { setFormError(e.response?.data?.message || "Create failed."); }
    finally     { setSubmitting(false); }
  };

  /* ── Update ── */
  const handleUpdate = async (data) => {
    setSubmitting(true); setFormError("");
    try {
      const res = await updateHoliday(editTarget._id, data);
      if (res.success) {
        setEditTarget(null);
        showToast("success", "Holiday updated.");
        fetchHolidays();
      } else setFormError(res.message);
    } catch (e) { setFormError(e.response?.data?.message || "Update failed."); }
    finally     { setSubmitting(false); }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteHoliday(deleteTarget._id);
      if (res.success) {
        showToast("success", "Holiday deleted.");
        setDeleteTarget(null);
        fetchHolidays();
      } else showToast("error", res.message || "Delete failed.");
    } catch (e) { showToast("error", e.response?.data?.message || "Delete failed."); }
    finally     { setDeleting(false); }
  };

  /* ── Edit prep: convert date to "YYYY-MM-DD" for <input type=date> ── */
  const prepEditData = (h) => ({
    ...h,
    date: h.date ? new Date(h.date).toISOString().slice(0, 10) : "",
  });

  return (
    <Layout title="Holiday Calendar">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Company Holiday Calendar</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage company holidays. Holidays auto-appear in Attendance and reduce working days.
          </p>
        </div>
        <button id="add-holiday-btn"
          onClick={() => { setFormError(""); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:opacity-90 hover:-translate-y-px transition-all">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Holiday
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
        {/* Year */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-500">Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50">
            {YEARS.map((y) => <option key={y} value={y} className="bg-[#0d1117]">{y}</option>)}
          </select>
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-500">Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500/50">
            <option value="" className="bg-[#0d1117]">All Types</option>
            {HOLIDAY_TYPES.map((t) => <option key={t} value={t} className="bg-[#0d1117]">{t}</option>)}
          </select>
        </div>

        <button onClick={fetchHolidays} disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 transition-all self-end">
          {loading
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          }
          Refresh
        </button>

        {/* Stats pill */}
        {!loading && (
          <div className="ml-auto flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm">
            <span className="text-slate-500">Total:</span>
            <span className="font-bold text-slate-200">{holidays.length}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">Paid:</span>
            <span className="font-bold text-emerald-400">{holidays.filter((h) => h.isPaid).length}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">Unpaid:</span>
            <span className="font-bold text-red-400">{holidays.filter((h) => !h.isPaid).length}</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              {["#", "Holiday Name", "Date", "Type", "Paid?", "Description", "Actions"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {loading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {[5, 30, 15, 20, 10, 25, 15].map((w, j) => (
                  <td key={j} className="px-5 py-4">
                    <div className="h-3.5 rounded-full bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />
                  </td>
                ))}
              </tr>
            ))}

            {!loading && holidays.length === 0 && (
              <tr>
                <td colSpan={7} className="py-20 text-center text-sm text-slate-600">
                  No holidays found for {year}. Add one to get started.
                </td>
              </tr>
            )}

            {!loading && holidays.map((h, idx) => (
              <tr key={h._id} className="group hover:bg-white/[0.03] transition-colors">
                <td className="px-5 py-3.5 text-slate-600 text-xs font-mono">{idx + 1}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-200">{h.name}</td>
                <td className="px-5 py-3.5 font-mono text-slate-300">{fmtDate(h.date)}</td>
                <td className="px-5 py-3.5"><TypeBadge type={h.type} /></td>
                <td className="px-5 py-3.5">
                  {h.isPaid
                    ? <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Yes</span>
                    : <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-medium"><span className="h-1.5 w-1.5 rounded-full bg-slate-500"/>No</span>
                  }
                </td>
                <td className="px-5 py-3.5 text-slate-400 max-w-xs truncate italic text-xs">
                  {h.description || <span className="text-slate-700">—</span>}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button id={`edit-holiday-${h._id}`}
                      onClick={() => { setFormError(""); setEditTarget(prepEditData(h)); }}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button id={`delete-holiday-${h._id}`}
                      onClick={() => setDeleteTarget(h)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
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

      {/* Modals */}
      {showForm && (
        <HolidayFormModal isEdit={false} onSubmit={handleCreate}
          onCancel={() => setShowForm(false)} loading={submitting} serverError={formError} />
      )}
      {editTarget && (
        <HolidayFormModal initial={editTarget} isEdit={true} onSubmit={handleUpdate}
          onCancel={() => setEditTarget(null)} loading={submitting} serverError={formError} />
      )}
      {deleteTarget && (
        <DeleteModal holiday={deleteTarget} onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)} loading={deleting} />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium text-white shadow-2xl ${toast.type === "success" ? "bg-emerald-600 border border-emerald-500/50" : "bg-red-600 border border-red-500/50"}`}>
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

export default HolidayCalendar;
