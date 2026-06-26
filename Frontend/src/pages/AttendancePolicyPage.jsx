/**
 * @file AttendancePolicyPage.jsx
 * @description Department Attendance Policy management page.
 *
 *  Features:
 *    • List all department policies in a card grid
 *    • Add / Edit policy via a side-drawer form
 *    • Delete with confirmation modal
 *    • Toggle feature flags (OT, shift allowance, late mark, canteen)
 *    • Checkboxes for weekly-off days (0=Sun … 6=Sat)
 *    • Alternate Saturday pattern selector
 *    • Attendance calculation method picker
 */

import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import {
  savePolicy,
  getAllPolicies,
  deletePolicy,
} from "../services/attendancePolicyService.js";
import api from "../api/api.js";

/* ── Constants ──────────────────────────────────────────────── */
const WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ALT_SAT_OPTIONS = [
  { value: "none",       label: "No Alternate Saturday" },
  { value: "even",       label: "Even Saturdays Off" },
  { value: "odd",        label: "Odd Saturdays Off" },
  { value: "first-last", label: "1st & Last Saturday Off" },
];

const CALC_METHODS = ["Calendar Days", "Working Days"];

const EMPTY_FORM = {
  departmentId: "",
  maxPaidLeavePerMonth: 1,
  weeklyOffDays: [0],
  alternateSaturdayPattern: "none",
  canteenRatePerDay: 0,
  shiftAllowanceEnabled: false,
  overtimeEnabled: false,
  lateMarkEnabled: false,
  graceMinutes: 5,
  attendanceCalculationMethod: "Calendar Days",
};

/* ── Input CSS helpers ──────────────────────────────────────── */
const INPUT =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 " +
  "text-sm text-slate-200 placeholder-slate-600 outline-none transition-all " +
  "focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-50";

const TOGGLE = ({ checked, onChange, label, sub }) => (
  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
    <div>
      <span className="text-sm font-medium text-slate-300">{label}</span>
      {sub && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
    </div>
    <div className="relative shrink-0">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <div className="h-6 w-11 rounded-full border border-white/10 bg-white/[0.08] peer-checked:bg-indigo-600 transition-colors" />
      <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-slate-500 peer-checked:translate-x-5 peer-checked:bg-white transition-all" />
    </div>
  </label>
);

/* ── Delete Modal ───────────────────────────────────────────── */
const DeleteModal = ({ policy, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.1] bg-[#111827] p-6 shadow-2xl">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-400">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-slate-100">Delete Policy</h3>
      <p className="mb-5 text-sm text-slate-400">
        Remove attendance policy for <span className="font-semibold text-slate-200">{policy?.departmentName}</span>? This cannot be undone.
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

/* ════════════════════════════════════════════════════════════ */
/*  POLICY FORM DRAWER                                         */
/* ════════════════════════════════════════════════════════════ */
const PolicyDrawer = ({ initial, departments, onSubmit, onClose, loading, serverError }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [err, setErr] = useState("");

  const set = (key, val) => { setErr(""); setForm((p) => ({ ...p, [key]: val })); };

  const toggleWO = (day) => {
    setForm((p) => {
      const curr = p.weeklyOffDays || [];
      return {
        ...p,
        weeklyOffDays: curr.includes(day) ? curr.filter((d) => d !== day) : [...curr, day],
      };
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.departmentId) { setErr("Please select a department."); return; }
    setErr("");
    await onSubmit({ ...form });
  };

  const displayErr = err || serverError;
  const isEdit = Boolean(initial?.departmentId);

  return (
    <div className="fixed inset-0 z-[150] flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col border-l border-white/[0.08] bg-[#0a0e1a] shadow-[−20px_0_60px_rgba(0,0,0,0.7)]">

        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              {isEdit ? "Edit Attendance Policy" : "Add Attendance Policy"}
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5">Department-level attendance rules</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-colors">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={submit} noValidate className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {displayErr && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
              <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {displayErr}
            </div>
          )}

          {/* ── Department ── */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">
              Department <span className="text-red-400">*</span>
            </label>
            <select value={form.departmentId}
              onChange={(e) => set("departmentId", e.target.value)}
              disabled={isEdit || loading} className={INPUT}>
              <option value="" className="bg-[#0a0e1a]">— Select Department —</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id} className="bg-[#0a0e1a]">{d.departmentName}</option>
              ))}
            </select>
          </div>

          {/* ── Section: Leave ── */}
          <div className="rounded-xl border border-white/[0.06] p-4 flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Leave Settings</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">Max Paid Leave Per Month</label>
              <input type="number" min={0} max={31} value={form.maxPaidLeavePerMonth}
                onChange={(e) => set("maxPaidLeavePerMonth", Number(e.target.value))}
                disabled={loading} className={INPUT} />
            </div>
          </div>

          {/* ── Section: Weekly Off ── */}
          <div className="rounded-xl border border-white/[0.06] p-4 flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Weekly Off</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">Weekly Off Days</label>
              <div className="flex flex-wrap gap-2">
                {WEEK_LABELS.map((lbl, i) => {
                  const active = form.weeklyOffDays?.includes(i);
                  return (
                    <button key={i} type="button"
                      onClick={() => toggleWO(i)} disabled={loading}
                      className={`min-w-[44px] rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all ${
                        active
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                          : "border-white/[0.08] bg-white/[0.04] text-slate-500 hover:border-indigo-500/40 hover:text-slate-300"
                      }`}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">Alternate Saturday Pattern</label>
              <select value={form.alternateSaturdayPattern}
                onChange={(e) => set("alternateSaturdayPattern", e.target.value)}
                disabled={loading} className={INPUT}>
                {ALT_SAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#0a0e1a]">{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Section: Canteen ── */}
          <div className="rounded-xl border border-white/[0.06] p-4 flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Canteen</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-400">Canteen Rate Per Day (₹)</label>
              <input type="number" min={0} step={0.5} value={form.canteenRatePerDay}
                onChange={(e) => set("canteenRatePerDay", Number(e.target.value))}
                disabled={loading} className={INPUT} />
            </div>
          </div>

          {/* ── Section: Feature Flags ── */}
          <div className="rounded-xl border border-white/[0.06] p-4 flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Feature Flags</h3>
            <TOGGLE checked={form.shiftAllowanceEnabled}
              onChange={(e) => set("shiftAllowanceEnabled", e.target.checked)}
              label="Shift Allowance" sub="Enable shift allowance payments for this department" />
            <TOGGLE checked={form.overtimeEnabled}
              onChange={(e) => set("overtimeEnabled", e.target.checked)}
              label="Overtime (OT)" sub="Enable overtime calculation for this department" />
            <TOGGLE checked={form.lateMarkEnabled}
              onChange={(e) => set("lateMarkEnabled", e.target.checked)}
              label="Late Mark Deduction" sub="Deduct for late arrivals beyond grace period" />
            {form.lateMarkEnabled && (
              <div className="flex flex-col gap-1.5 pl-2">
                <label className="text-[12px] font-medium text-slate-400">Grace Period (minutes)</label>
                <input type="number" min={0} max={60} value={form.graceMinutes}
                  onChange={(e) => set("graceMinutes", Number(e.target.value))}
                  disabled={loading} className={INPUT} />
              </div>
            )}
          </div>

          {/* ── Section: Calculation Method ── */}
          <div className="rounded-xl border border-white/[0.06] p-4 flex flex-col gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Salary Calculation</h3>
            <div className="flex gap-3">
              {CALC_METHODS.map((m) => (
                <button key={m} type="button"
                  onClick={() => set("attendanceCalculationMethod", m)}
                  disabled={loading}
                  className={`flex-1 rounded-xl border px-4 py-3 text-[12px] font-semibold text-left transition-all ${
                    form.attendanceCalculationMethod === m
                      ? "border-indigo-500 bg-indigo-500/15 text-indigo-300"
                      : "border-white/[0.08] bg-white/[0.03] text-slate-500 hover:border-indigo-500/30"
                  }`}>
                  {m}
                  <p className="text-[10px] font-normal text-slate-600 mt-1">
                    {m === "Calendar Days" ? "Gross × PaidDays / daysInMonth" : "Gross × PaidDays / workingDays"}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="border-t border-white/[0.07] px-6 py-4 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.3)] hover:opacity-90 disabled:opacity-60 transition-all">
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {isEdit ? "Update Policy" : "Save Policy"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════ */
/*  POLICY CARD                                                */
/* ════════════════════════════════════════════════════════════ */
const PolicyCard = ({ policy, onEdit, onDelete }) => {
  const woDays = (policy.weeklyOffDays || []).map((d) => WEEK_LABELS[d]).join(", ");
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-indigo-500/25 hover:bg-white/[0.04] transition-all">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-100">{policy.departmentName}</h3>
          <p className="text-[12px] text-slate-600 mt-0.5">
            {policy.attendanceCalculationMethod}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button id={`edit-policy-${policy._id}`} onClick={() => onEdit(policy)}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit
          </button>
          <button id={`delete-policy-${policy._id}`} onClick={() => onDelete(policy)}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
          <p className="text-slate-600 mb-0.5">Weekly Off</p>
          <p className="font-semibold text-slate-200">{woDays || "—"}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
          <p className="text-slate-600 mb-0.5">Alt. Saturday</p>
          <p className="font-semibold text-slate-200 capitalize">{policy.alternateSaturdayPattern?.replace("-", " ") || "none"}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
          <p className="text-slate-600 mb-0.5">Max Paid Leave/Mo</p>
          <p className="font-semibold text-slate-200">{policy.maxPaidLeavePerMonth}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2.5">
          <p className="text-slate-600 mb-0.5">Canteen Rate</p>
          <p className="font-semibold text-slate-200">₹{policy.canteenRatePerDay}/day</p>
        </div>
      </div>

      {/* Feature flags row */}
      <div className="flex flex-wrap gap-1.5">
        {policy.shiftAllowanceEnabled && (
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-400">Shift Allowance</span>
        )}
        {policy.overtimeEnabled && (
          <span className="rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-400">Overtime</span>
        )}
        {policy.lateMarkEnabled && (
          <span className="rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-medium text-orange-400">Late Mark ({policy.graceMinutes}m grace)</span>
        )}
        {!policy.shiftAllowanceEnabled && !policy.overtimeEnabled && !policy.lateMarkEnabled && (
          <span className="text-[11px] text-slate-700 italic">No extra flags enabled</span>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                  */
/* ════════════════════════════════════════════════════════════ */
const AttendancePolicyPage = () => {
  const [policies,    setPolicies]    = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [showDrawer,  setShowDrawer]  = useState(false);
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

  // Load policies + departments in parallel
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [polRes, deptRes] = await Promise.all([
        getAllPolicies(),
        api.get("/api/departments"),
      ]);
      if (polRes.success) setPolicies(polRes.data.policies ?? []);
      // getDepartments returns { success, data: { total, departments: [...] } }
      if (deptRes.data?.success) setDepartments(deptRes.data?.data?.departments ?? []);
    } catch {
      showToast("error", "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Departments that don't yet have a policy (for "Add" mode)
  const unpoliciedDepts = departments.filter(
    (d) => !policies.some((p) => {
      const pid = p.departmentId?._id || p.departmentId;
      return String(pid) === String(d._id);
    })
  );

  const handleSave = async (data) => {
    setSubmitting(true); setFormError("");
    try {
      const res = await savePolicy(data);
      if (res.success) {
        setShowDrawer(false); setEditTarget(null);
        showToast("success", "Policy saved successfully.");
        fetchAll();
      } else setFormError(res.message);
    } catch (e) { setFormError(e.response?.data?.message || "Failed to save policy."); }
    finally     { setSubmitting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const deptId = deleteTarget.departmentId?._id || deleteTarget.departmentId;
      const res = await deletePolicy(deptId);
      if (res.success) {
        showToast("success", "Policy deleted.");
        setDeleteTarget(null);
        fetchAll();
      } else showToast("error", res.message);
    } catch (e) { showToast("error", e.response?.data?.message || "Delete failed."); }
    finally     { setDeleting(false); }
  };

  // Prep edit — populate departmentId as string for select
  const prepEdit = (p) => ({
    ...p,
    departmentId: String(p.departmentId?._id || p.departmentId),
  });

  return (
    <Layout title="Attendance Policy">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Department Attendance Policy</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configure attendance rules per department — weekly off, leaves, canteen, late marks, and salary calculation method.
          </p>
        </div>
        <button id="add-policy-btn"
          onClick={() => { setFormError(""); setEditTarget(null); setShowDrawer(true); }}
          disabled={unpoliciedDepts.length === 0 && !showDrawer}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:opacity-90 hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Policy
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Total Policies", value: policies.length, color: "text-slate-200" },
          { label: "With OT", value: policies.filter((p) => p.overtimeEnabled).length, color: "text-blue-400" },
          { label: "With Late Mark", value: policies.filter((p) => p.lateMarkEnabled).length, color: "text-orange-400" },
          { label: "Departments Without Policy", value: unpoliciedDepts.length, color: "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3 min-w-[130px]">
            <span className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</span>
            <span className="text-[11px] text-slate-600 mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-52 rounded-2xl border border-white/[0.06] bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-slate-600">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/>
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No policies configured yet</p>
          <p className="text-sm text-slate-700 mt-1">Add a policy for each department to enable attendance automation.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {policies.map((p) => (
            <PolicyCard key={p._id} policy={p}
              onEdit={(pol) => { setFormError(""); setEditTarget(prepEdit(pol)); setShowDrawer(true); }}
              onDelete={(pol) => setDeleteTarget(pol)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      {showDrawer && (
        <PolicyDrawer
          initial={editTarget}
          departments={editTarget ? departments : unpoliciedDepts}
          onSubmit={handleSave}
          onClose={() => { setShowDrawer(false); setEditTarget(null); }}
          loading={submitting}
          serverError={formError}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal policy={deleteTarget} onConfirm={handleDelete}
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

export default AttendancePolicyPage;
