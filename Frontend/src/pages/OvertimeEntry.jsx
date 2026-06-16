/**
 * @file OvertimeEntry.jsx
 * @description Overtime Management & Entry page.
 *
 *  Features:
 *    • Filter bar: Month + Year selectors
 *    • Table: Employee | OT Type | Hours | Rate/Hr | Amount | Remarks | Actions
 *    • Add OT Entry modal:
 *      - Searchable employee dropdown
 *      - OT Type dropdown
 *      - Auto-filled Rate/Hr fetched from department policy
 *      - Live computed amount preview
 *      - Remarks (optional)
 *    • Edit OT Entry (modal)
 *    • Delete OT Entry (with confirmation)
 *    • Bottom: Per-employee monthly OT total summary card grid
 */

import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import { getOTRecords, upsertOT, updateOT, deleteOT } from "../services/overtimeService.js";
import { getDepartments, getPolicy } from "../services/departmentService.js";
import api from "../api/api.js";

/* ── Constants ── */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

const INR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const OT_LABELS = {
  dailyOT: "Daily OT",
  weeklyOffOT: "Weekly Off OT",
  holidayOT: "Holiday OT",
};

const EMPTY_FORM = {
  employeeId: "",
  otType: "dailyOT",
  hours: "",
  remarks: "",
  month: currentMonth,
  year: currentYear,
};

/* ── Overtime Form Modal ── */
const OvertimeFormModal = ({
  initial = EMPTY_FORM,
  isEdit,
  employees,
  departments,
  onSubmit,
  onCancel,
  loading,
  serverError,
}) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [empSearch, setEmpSearch] = useState("");
  const [rate, setRate] = useState(0);
  const [loadingRate, setLoadingRate] = useState(false);
  const [err, setErr] = useState("");

  // Filter employees for searchable dropdown
  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.employeeId.toLowerCase().includes(empSearch.toLowerCase())
  );

  // Auto-fetch OT rate from department policy when employee + type are selected
  useEffect(() => {
    if (!form.employeeId || !form.otType) {
      setRate(0);
      return;
    }
    const fetchRate = async () => {
      setLoadingRate(true);
      try {
        const emp = employees.find((e) => e._id === form.employeeId);
        if (emp && departments.length > 0) {
          const dept = departments.find(
            (d) => d.departmentName.toLowerCase() === emp.department.toLowerCase()
          );
          if (dept) {
            const res = await getPolicy(dept._id);
            if (res.success) {
              const rates = res.data.policy?.otRates || {};
              setRate(rates[form.otType] ?? 0);
            } else {
              setRate(0);
            }
          } else {
            setRate(0);
          }
        }
      } catch (e) {
        console.error("Failed to fetch OT rate", e);
        setRate(0);
      } finally {
        setLoadingRate(false);
      }
    };
    fetchRate();
  }, [form.employeeId, form.otType, employees, departments]);

  const handle = (e) => {
    setErr("");
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!isEdit && !form.employeeId) { setErr("Select an employee."); return; }
    if (!form.otType) { setErr("Select an overtime type."); return; }
    if (form.hours === "" || isNaN(Number(form.hours))) { setErr("Enter overtime hours."); return; }
    const hrs = Number(form.hours);
    if (hrs <= 0) { setErr("Hours must be greater than 0."); return; }
    setErr("");
    await onSubmit({
      ...form,
      month: Number(form.month),
      year: Number(form.year),
      hours: hrs,
    });
  };

  const displayErr = err || serverError;
  const amountPreview = Number(form.hours || 0) * rate;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0f1422]
                      shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <h2 className="text-base font-semibold text-slate-100">
            {isEdit ? "Edit Overtime Entry" : "Add Overtime Entry"}
          </h2>
          <button onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-colors">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-6 py-5 max-h-[80vh] overflow-y-auto">
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

          {/* Employee search + dropdown (hidden/disabled in edit mode) */}
          {!isEdit ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">
                Employee <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Type name or code to search..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                           px-4 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none
                           focus:border-indigo-500/50 mb-1"
              />
              <select name="employeeId" value={form.employeeId} onChange={handle}
                disabled={loading}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                           px-4 py-2.5 text-sm text-slate-200 outline-none
                           focus:border-indigo-500/50 disabled:opacity-50">
                <option value="" className="bg-[#0d1117]">— Select Employee —</option>
                {filteredEmployees.map((e) => (
                  <option key={e._id} value={e._id} className="bg-[#0d1117]">
                    {e.employeeId} — {e.name} ({e.department})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">Employee</label>
              <div className="w-full rounded-xl border border-white/[0.04] bg-white/[0.02]
                              px-4 py-2.5 text-sm text-slate-500 font-medium">
                {initial.employeeName} ({initial.employeeCode})
              </div>
            </div>
          )}

          {/* OT Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">
              Overtime Type <span className="text-red-400">*</span>
            </label>
            <select name="otType" value={form.otType} onChange={handle}
              disabled={loading || isEdit}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                         px-4 py-2.5 text-sm text-slate-200 outline-none
                         focus:border-indigo-500/50 disabled:opacity-50">
              <option value="dailyOT" className="bg-[#0d1117]">Daily OT</option>
              <option value="weeklyOffOT" className="bg-[#0d1117]">Weekly Off OT</option>
              <option value="holidayOT" className="bg-[#0d1117]">Holiday OT</option>
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

          {/* Hours Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">
              OT Hours <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              name="hours"
              value={form.hours}
              onChange={handle}
              min="0.5"
              step="0.5"
              placeholder="e.g. 2.5"
              disabled={loading}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                         px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none
                         focus:border-indigo-500/50 disabled:opacity-50 transition-all"
            />
          </div>

          {/* Rate/Hr & computed amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-slate-400">Rate / Hour</span>
              <div className="w-full rounded-xl border border-white/[0.04] bg-white/[0.02]
                              px-4 py-2.5 text-sm text-slate-300 font-semibold flex items-center justify-between">
                {loadingRate ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500/30 border-t-slate-500" />
                ) : (
                  <span>{INR(rate)}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-slate-400">Calculated Amount</span>
              <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07]
                              px-4 py-2.5 text-sm text-emerald-400 font-bold">
                {INR(amountPreview)}
              </div>
            </div>
          </div>

          {/* Remarks (optional) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">Remarks</label>
            <input
              type="text"
              name="remarks"
              value={form.remarks}
              onChange={handle}
              placeholder="e.g. Production support on Sunday"
              disabled={loading}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                         px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none
                         focus:border-indigo-500/50 disabled:opacity-50 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onCancel} disabled={loading}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5
                         text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
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

/* ── Delete confirmation modal ── */
const DeleteModal = ({ record, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.1]
                    bg-[#111827] p-6 shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
      <h3 className="mb-1.5 text-base font-semibold text-slate-100">Delete Entry</h3>
      <p className="mb-5 text-sm text-slate-400">
        Remove overtime entry for <span className="font-semibold text-slate-200">
          {record?.employeeId?.name ?? "this employee"}
        </span>? This will deduct the OT addition from their salary.
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={loading}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5
                     text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5
                     text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

/* ── Page ── */
const OvertimeEntry = () => {
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [records, setRecords] = useState([]);
  const [employeeTotals, setEmployeeTotals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState(null);
  const [fetched, setFetched] = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Preload employees and departments for form dropdowns
  useEffect(() => {
    const load = async () => {
      try {
        const [empRes, deptRes] = await Promise.all([
          api.get("/api/employees?limit=1000"), // get all employees
          getDepartments(),
        ]);
        if (empRes.data.success) {
          setEmployees(empRes.data.data?.employees ?? []);
        }
        if (deptRes.success) {
          setDepartments(deptRes.data.departments ?? []);
        }
      } catch (e) {
        console.error("Failed to preload form data", e);
      }
    };
    load();
  }, []);

  // Fetch OT records for filtered month & year
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOTRecords({ month, year });
      if (res.success) {
        setRecords(res.data.records ?? []);
        setEmployeeTotals(res.data.employeeTotals ?? []);
      } else {
        showToast("error", res.message || "Failed to fetch records.");
      }
    } catch (e) {
      showToast("error", "Could not load overtime records.");
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [month, year]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleUpsert = async (data) => {
    setSubmitting(true);
    setFormError("");
    try {
      const res = await upsertOT(data);
      if (res.success) {
        setShowForm(false);
        showToast("success", "Overtime record saved.");
        fetchRecords();
      } else {
        setFormError(res.message);
      }
    } catch (e) {
      setFormError(e.response?.data?.message || "Failed to save record.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data) => {
    setSubmitting(true);
    setFormError("");
    try {
      const res = await updateOT(editTarget._id, {
        hours: data.hours,
        remarks: data.remarks,
      });
      if (res.success) {
        setEditTarget(null);
        showToast("success", "Overtime record updated.");
        fetchRecords();
      } else {
        setFormError(res.message);
      }
    } catch (e) {
      setFormError(e.response?.data?.message || "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteOT(deleteTarget._id);
      if (res.success) {
        showToast("success", "Overtime record deleted.");
        setDeleteTarget(null);
        fetchRecords();
      } else {
        showToast("error", res.message || "Delete failed.");
      }
    } catch (e) {
      showToast("error", e.response?.data?.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout title="Overtime Entry">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Overtime Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Log employee overtime hours and calculate post-deduction additions.
          </p>
        </div>
        <button onClick={() => { setFormError(""); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600
                     px-5 py-2.5 text-sm font-semibold text-white
                     shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:opacity-90 hover:-translate-y-px transition-all">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add OT Entry
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-500">Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2
                       text-sm text-slate-200 outline-none focus:border-indigo-500/50">
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1} className="bg-[#0d1117]">{m}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-500">Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2
                       text-sm text-slate-200 outline-none focus:border-indigo-500/50">
            {years.map((y) => (
              <option key={y} value={y} className="bg-[#0d1117]">{y}</option>
            ))}
          </select>
        </div>
        <button onClick={fetchRecords} disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10
                     px-4 py-2 text-sm font-medium text-indigo-300
                     hover:bg-indigo-500/20 disabled:opacity-50 transition-all">
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          )}
          Refresh
        </button>
      </div>

      {/* Table */}
      {fetched && (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {["Emp ID", "Employee Name", "OT Type", "Hours", "Rate/Hr", "Amount", "Remarks", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold
                                         uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>{[15, 25, 15, 10, 10, 10, 15, 15].map((w, j) => (
                  <td key={j} className="px-4 py-4">
                    <div className="h-3 rounded-full bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />
                  </td>
                ))}</tr>
              ))}

              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-sm text-slate-600">
                    No overtime records found for this month.
                  </td>
                </tr>
              )}

              {!loading && records.map((r) => {
                const emp = r.employeeId;
                return (
                  <tr key={r._id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[12px] text-indigo-400">
                        {emp?.employeeId ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-200">{emp?.name ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-slate-300">{r.otLabel}</span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-200">{r.hours} hrs</td>
                    <td className="px-4 py-3.5 text-slate-400">{INR(r.ratePerHour)}</td>
                    <td className="px-4 py-3.5 font-bold text-emerald-400">{INR(r.totalAmount)}</td>
                    <td className="px-4 py-3.5 text-slate-400 italic max-w-xs truncate">
                      {r.remarks || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setFormError("");
                            setEditTarget({
                              ...r,
                              employeeName: emp?.name,
                              employeeCode: emp?.employeeId,
                            });
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                                     bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-slate-400
                                     hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                                     bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-slate-400
                                     hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
                        >
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

      {/* Per-Employee OT Summary Grid */}
      {fetched && employeeTotals.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-base font-semibold text-slate-300">Monthly Employee Overtime Totals</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {employeeTotals.map((t) => (
              <div key={t.employeeId?._id || t.employeeId}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-slate-200">{t.employeeId?.name || "Unknown"}</h4>
                  <p className="text-xs text-slate-500">{t.employeeId?.employeeId || "—"}</p>
                </div>
                <div className="text-right">
                  <span className="block text-xs text-slate-500 font-medium">{t.totalHours} hrs</span>
                  <span className="text-sm font-bold text-emerald-400">{INR(t.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <OvertimeFormModal
          employees={employees}
          departments={departments}
          onSubmit={handleUpsert}
          onCancel={() => setShowForm(false)}
          loading={submitting}
          serverError={formError}
          isEdit={false}
        />
      )}
      {editTarget && (
        <OvertimeFormModal
          initial={{
            employeeId: editTarget.employeeId?._id,
            employeeName: editTarget.employeeName,
            employeeCode: editTarget.employeeCode,
            otType: editTarget.otType,
            hours: editTarget.hours,
            remarks: editTarget.remarks,
            month: editTarget.month,
            year: editTarget.year,
          }}
          employees={employees}
          departments={departments}
          onSubmit={handleUpdate}
          onCancel={() => setEditTarget(null)}
          loading={submitting}
          serverError={formError}
          isEdit={true}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          record={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 rounded-xl
                         px-5 py-3.5 text-sm font-medium text-white shadow-2xl
                         ${toast.type === "success" ? "bg-emerald-600 border border-emerald-500/50" : "bg-red-600 border border-red-500/50"}`}>
          {toast.type === "success" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          )}
          {toast.msg}
        </div>
      )}
    </Layout>
  );
};

export default OvertimeEntry;
