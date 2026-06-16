/**
 * @file ShiftAttendance.jsx
 * @description Shift Attendance Entry page.
 *
 *  Features:
 *    • Filter bar: Month + Year + optional Employee ID search
 *    • Table: Employee | Shift | Days Worked | Allowance Amount
 *    • Add / Edit modal: Employee dropdown, Shift dropdown, Month, Year, Days Worked
 *      with computed (read-only) allowance amount
 *    • Delete confirmation
 */

import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { getShifts, getAttendance, upsertAttendance, updateAttendance, deleteAttendance } from "../services/shiftService.js";
import api from "../api/api.js";

/* ── Constants ── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

const INR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

/* ── Attendance Form Modal ── */
const EMPTY_FORM = {
  employeeId: "", shiftId: "", month: currentMonth, year: currentYear, daysWorked: "",
};

const AttendanceFormModal = ({
  initial = EMPTY_FORM, isEdit, recordId,
  employees, shifts, onSubmit, onCancel, loading, serverError,
}) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [err,  setErr]  = useState("");

  /* Compute allowance preview */
  const selectedShift = shifts.find((s) => s._id === form.shiftId);
  const allowancePreview = selectedShift && form.daysWorked !== ""
    ? Math.round(Number(form.daysWorked) * selectedShift.allowancePerDay * 100) / 100
    : null;

  const handle = (e) => {
    setErr("");
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!isEdit && !form.employeeId) { setErr("Select an employee."); return; }
    if (!form.shiftId) { setErr("Select a shift."); return; }
    if (form.daysWorked === "" || isNaN(Number(form.daysWorked))) { setErr("Enter days worked."); return; }
    const days = Number(form.daysWorked);
    if (days < 0 || days > 31) { setErr("Days worked must be between 0 and 31."); return; }
    setErr("");
    await onSubmit({
      ...form,
      month: Number(form.month),
      year:  Number(form.year),
      daysWorked: days,
    });
  };

  const displayErr = err || serverError;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0f1422]
                      shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <h2 className="text-base font-semibold text-slate-100">
            {isEdit ? "Edit Attendance" : "Add Attendance Entry"}
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

          {/* Employee dropdown (disabled in edit mode) */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">
                Employee <span className="text-red-400">*</span>
              </label>
              <select name="employeeId" value={form.employeeId} onChange={handle}
                disabled={loading}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                           px-4 py-2.5 text-sm text-slate-200 outline-none
                           focus:border-indigo-500/50 disabled:opacity-50">
                <option value="" className="bg-[#0d1117]">— Select Employee —</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id} className="bg-[#0d1117]">
                    {e.employeeId} — {e.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Shift dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">
              Shift <span className="text-red-400">*</span>
            </label>
            <select name="shiftId" value={form.shiftId} onChange={handle}
              disabled={loading}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                         px-4 py-2.5 text-sm text-slate-200 outline-none
                         focus:border-indigo-500/50 disabled:opacity-50">
              <option value="" className="bg-[#0d1117]">— Select Shift —</option>
              {shifts.map((s) => (
                <option key={s._id} value={s._id} className="bg-[#0d1117]">
                  {s.shiftName} ({s.shiftCode}) — {INR(s.allowancePerDay)}/day
                </option>
              ))}
            </select>
          </div>

          {/* Month + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">Month</label>
              <select name="month" value={form.month} onChange={handle}
                disabled={loading || isEdit}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                           px-4 py-2.5 text-sm text-slate-200 outline-none
                           focus:border-indigo-500/50 disabled:opacity-50">
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1} className="bg-[#0d1117]">{m}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">Year</label>
              <select name="year" value={form.year} onChange={handle}
                disabled={loading || isEdit}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                           px-4 py-2.5 text-sm text-slate-200 outline-none
                           focus:border-indigo-500/50 disabled:opacity-50">
                {years.map((y) => (
                  <option key={y} value={y} className="bg-[#0d1117]">{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Days worked */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">
              Days Worked <span className="text-red-400">*</span>
            </label>
            <input type="number" name="daysWorked" value={form.daysWorked} onChange={handle}
              min="0" max="31" placeholder="0–31" disabled={loading}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                         px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none
                         focus:border-indigo-500/50 disabled:opacity-50 transition-all" />
          </div>

          {/* Allowance preview (read-only) */}
          {allowancePreview !== null && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20
                            bg-emerald-500/[0.07] px-4 py-3">
              <span className="text-[12px] font-medium text-slate-400">Computed Allowance</span>
              <span className="text-base font-bold text-emerald-400">{INR(allowancePreview)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} disabled={loading}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5
                         text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" id="att-submit-btn" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl
                         bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5
                         text-sm font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)]
                         hover:opacity-90 disabled:opacity-60 transition-all">
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {isEdit ? "Update" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ── Delete confirmation ── */
const DeleteModal = ({ record, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.1]
                    bg-[#111827] p-6 shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
      <h3 className="mb-1.5 text-base font-semibold text-slate-100">Delete Entry</h3>
      <p className="mb-5 text-sm text-slate-400">
        Remove attendance for <span className="font-semibold text-slate-200">
          {record?.employeeId?.name ?? record?.employeeName}
        </span>? This cannot be undone.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5
                     text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50">
          Cancel
        </button>
        <button id="confirm-delete-att" onClick={onConfirm} disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5
                     text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════ */
const ShiftAttendancePage = () => {
  const [month,        setMonth]        = useState(currentMonth);
  const [year,         setYear]         = useState(currentYear);
  const [records,      setRecords]      = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [shifts,       setShifts]       = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [formError,    setFormError]    = useState("");
  const [toast,        setToast]        = useState(null);
  const [fetched,      setFetched]      = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* Pagination and Search state */
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  /* Load employees + active shifts once */
  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, shiftRes] = await Promise.all([
          api.get("/api/employees?limit=1000"),
          getShifts(true),
        ]);
        if (empRes.data.success) setEmployees(empRes.data.data?.employees ?? []);
        if (shiftRes.success)   setShifts(shiftRes.data.shifts);
      } catch { /* non-blocking */ }
    };
    load();
  }, []);

  /* Debounce search query */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page to 1 when search query changes
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* Fetch records */
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAttendance({ month, year, page, limit: 10, search: debouncedSearch });
      if (res.success) {
        setRecords(res.data);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalRecords(res.pagination?.total || 0);
      }
      else showToast("error", res.message || "Fetch failed.");
    } catch { showToast("error", "Could not load attendance records."); }
    finally  { setLoading(false); setFetched(true); }
  }, [month, year, page, debouncedSearch]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleUpsert = async (data) => {
    setSubmitting(true); setFormError("");
    try {
      const res = await upsertAttendance(data);
      if (res.success) { setShowForm(false); showToast("success", "Attendance saved."); fetchRecords(); }
      else setFormError(res.message);
    } catch (e) { setFormError(e.response?.data?.message || "Save failed."); }
    finally     { setSubmitting(false); }
  };

  const handleUpdate = async (data) => {
    setSubmitting(true); setFormError("");
    try {
      const res = await updateAttendance(editTarget._id, data.daysWorked);
      if (res.success) { setEditTarget(null); showToast("success", "Updated."); fetchRecords(); }
      else setFormError(res.message);
    } catch (e) { setFormError(e.response?.data?.message || "Update failed."); }
    finally     { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteAttendance(deleteTarget._id);
      if (res.success) { showToast("success", "Entry deleted."); setDeleteTarget(null); fetchRecords(); }
      else showToast("error", res.message || "Delete failed.");
    } catch (e) { showToast("error", e.response?.data?.message || "Delete failed."); }
    finally     { setDeleting(false); }
  };

  return (
    <Layout title="Shift Attendance">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Shift Attendance</h2>
          <p className="mt-1 text-sm text-slate-500">
            Record how many days each employee worked in each shift for a given month.
          </p>
        </div>
        <button id="add-att-btn" onClick={() => { setFormError(""); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600
                     px-5 py-2.5 text-sm font-semibold text-white
                     shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:opacity-90 hover:-translate-y-px transition-all">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Entry
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-500">Month</label>
          <select id="att-month" value={month} onChange={(e) => { setMonth(Number(e.target.value)); setPage(1); }}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2
                       text-sm text-slate-200 outline-none focus:border-indigo-500/50">
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1} className="bg-[#0d1117]">{m}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-500">Year</label>
          <select id="att-year" value={year} onChange={(e) => { setYear(Number(e.target.value)); setPage(1); }}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2
                       text-sm text-slate-200 outline-none focus:border-indigo-500/50">
            {years.map((y) => (
              <option key={y} value={y} className="bg-[#0d1117]">{y}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="text-[12px] font-medium text-slate-500">Search</label>
          <input
            type="text"
            placeholder="Search by Employee ID or Shift..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2
                       text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 w-full"
          />
        </div>
        <button id="att-search-btn" onClick={fetchRecords} disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10
                     px-4 py-2 text-sm font-medium text-indigo-300
                     hover:bg-indigo-500/20 disabled:opacity-50 transition-all">
          {loading
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
          }
          Refresh
        </button>
      </div>

      {/* Table */}
      {fetched && (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {["Emp ID","Employee Name","Shift","Days Worked","Allowance Amount","Actions"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold
                                         uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{[20,35,25,15,20,15].map((w, j) => (
                  <td key={j} className="px-4 py-4">
                    <div className="h-3 rounded-full bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />
                  </td>
                ))}</tr>
              ))}

              {!loading && records.length === 0 && (
                <tr><td colSpan={6} className="py-20 text-center text-sm text-slate-600">
                  No attendance records found. Select a month and click Search.
                </td></tr>
              )}

              {!loading && records.map((r) => {
                const emp   = r.employeeId;
                const shift = r.shiftId;
                return (
                  <tr key={r._id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[12px] text-indigo-400">
                        {emp?.employeeId ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-200">{emp?.name ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-slate-300">{shift?.shiftName ?? "—"}</span>
                      {shift?.shiftCode && (
                        <span className="ml-1.5 rounded bg-violet-500/10 px-1 py-0.5
                                         font-mono text-[11px] text-violet-400">
                          {shift.shiftCode}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-200">{r.daysWorked}</td>
                    <td className="px-4 py-3.5 font-bold text-emerald-400">{INR(r.allowanceAmount)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button id={`edit-att-${r._id}`}
                          onClick={() => {
                            setFormError("");
                            setEditTarget({
                              ...r,
                              shiftId: shift?._id,
                              month: r.month, year: r.year,
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                                     bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-slate-400
                                     hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Edit
                        </button>
                        <button id={`del-att-${r._id}`}
                          onClick={() => setDeleteTarget(r)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                                     bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-slate-400
                                     hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {fetched && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/[0.07] pt-4">
          <p className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-300">{page}</span> of{" "}
            <span className="font-semibold text-slate-300">{totalPages}</span> ({totalRecords} records)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1 || loading}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold
                         text-slate-400 hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages || loading}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold
                         text-slate-400 hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <AttendanceFormModal
          employees={employees} shifts={shifts}
          onSubmit={handleUpsert} onCancel={() => setShowForm(false)}
          loading={submitting} serverError={formError} isEdit={false}
        />
      )}
      {editTarget && (
        <AttendanceFormModal
          initial={{ shiftId: editTarget.shiftId, month: editTarget.month,
                     year: editTarget.year, daysWorked: editTarget.daysWorked }}
          employees={employees} shifts={shifts}
          onSubmit={handleUpdate} onCancel={() => setEditTarget(null)}
          loading={submitting} serverError={formError} isEdit={true}
          recordId={editTarget._id}
        />
      )}
      {deleteTarget && (
        <DeleteModal record={deleteTarget} onConfirm={handleDelete}
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
    </Layout>
  );
};

export default ShiftAttendancePage;
