/**
 * @file DepartmentPolicy.jsx
 * @description Department Policy page — manage deductions for a department.
 *
 *  Features:
 *    • Load existing policy deductions from backend
 *    • Add new deduction rows dynamically
 *    • Inline edit deduction name & percentage
 *    • Delete individual deduction rows
 *    • Bulk Save (PUT all deductions at once)
 *    • Validation: 0–100%, total ≤ 100%
 *    • Live total percentage display
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { getPolicy, savePolicy } from "../services/departmentService.js";

/* ── Helper: generate a client-side temp id for new rows ── */
let _uid = 0;
const uid = () => `new_${++_uid}`;

/* ── Deduction row ── */
const DeductionRow = ({ row, index, onChange, onDelete, disabled }) => (
  <tr className="group border-b border-white/[0.04] last:border-0">
    {/* Name */}
    <td className="px-4 py-3">
      <input
        type="text"
        value={row.name}
        onChange={(e) => onChange(index, "name", e.target.value)}
        placeholder="e.g. PF, ESI, Professional Tax"
        disabled={disabled}
        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04]
                   px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none
                   focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15
                   disabled:opacity-50 transition-all"
      />
    </td>
    {/* Percentage */}
    <td className="px-4 py-3 w-40">
      <div className="relative flex items-center">
        <input
          type="number"
          value={row.percentage}
          onChange={(e) => onChange(index, "percentage", e.target.value)}
          min="0" max="100" step="0.01"
          placeholder="0.00"
          disabled={disabled}
          className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04]
                     px-3 py-2 pr-8 text-sm text-slate-200 placeholder-slate-600 outline-none
                     focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15
                     disabled:opacity-50 transition-all"
        />
        <span className="absolute right-3 text-sm text-slate-600 pointer-events-none">%</span>
      </div>
    </td>
    {/* Delete */}
    <td className="px-4 py-3 w-14 text-center">
      <button
        type="button"
        onClick={() => onDelete(index)}
        disabled={disabled}
        className="rounded-lg p-1.5 text-slate-600 opacity-0 group-hover:opacity-100
                   hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-30"
        aria-label="Remove deduction"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
        </svg>
      </button>
    </td>
  </tr>
);

/* ── Page ── */
const DepartmentPolicy = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [department, setDepartment] = useState(null);
  const [rows,       setRows]       = useState([]);   // { _id?, name, percentage }
  const [otRates,    setOtRates]    = useState({      // Overtime rates (₹/hr)
    dailyOT: "",
    weeklyOffOT: "",
    holidayOT: "",
  });
  const [fetching,   setFetching]   = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [toast,      setToast]      = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Load policy ── */
  const loadPolicy = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const res = await getPolicy(id);
      if (res.success) {
        setDepartment(res.data.department);
        // Clone deductions into local state
        setRows(res.data.policy.deductions.map((d) => ({
          _key:       d._id,         // unique key for React
          name:       d.name,
          percentage: d.percentage,
        })));
        // Clone OT rates into local state
        const rates = res.data.policy.otRates || {};
        setOtRates({
          dailyOT: rates.dailyOT !== undefined ? rates.dailyOT : "",
          weeklyOffOT: rates.weeklyOffOT !== undefined ? rates.weeklyOffOT : "",
          holidayOT: rates.holidayOT !== undefined ? rates.holidayOT : "",
        });
      } else {
        setError(res.message || "Failed to load policy.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load policy.");
    } finally {
      setFetching(false);
    }
  }, [id]);

  useEffect(() => { loadPolicy(); }, [loadPolicy]);

  /* ── Row change handler ── */
  const handleChange = (index, field, value) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  /* ── Add row ── */
  const handleAddRow = () => {
    setRows((prev) => [...prev, { _key: uid(), name: "", percentage: "" }]);
  };

  /* ── Delete row ── */
  const handleDeleteRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── Validate locally before save ── */
  const validate = () => {
    for (const r of rows) {
      if (!r.name.trim()) return "All deductions must have a name.";
      const pct = Number(r.percentage);
      if (isNaN(pct) || r.percentage === "") return `Percentage for "${r.name}" is invalid.`;
      if (pct < 0 || pct > 100) return `Percentage for "${r.name}" must be between 0 and 100.`;
    }
    const total = rows.reduce((s, r) => s + Number(r.percentage), 0);
    if (total > 100) return `Total deductions (${total.toFixed(2)}%) exceed 100%.`;

    // Overtime rates validation
    const daily = Number(otRates.dailyOT);
    if (otRates.dailyOT !== "" && (isNaN(daily) || daily < 0)) {
      return "Daily OT rate must be a non-negative number.";
    }
    const weekly = Number(otRates.weeklyOffOT);
    if (otRates.weeklyOffOT !== "" && (isNaN(weekly) || weekly < 0)) {
      return "Weekly Off OT rate must be a non-negative number.";
    }
    const holiday = Number(otRates.holidayOT);
    if (otRates.holidayOT !== "" && (isNaN(holiday) || holiday < 0)) {
      return "Holiday OT rate must be a non-negative number.";
    }

    return "";
  };

  /* ── Save (bulk) ── */
  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setSaving(true);
    try {
      const deductions = rows.map(({ name, percentage }) => ({
        name: name.trim(),
        percentage: Number(percentage),
      }));
      const rates = {
        dailyOT: otRates.dailyOT === "" ? 0 : Number(otRates.dailyOT),
        weeklyOffOT: otRates.weeklyOffOT === "" ? 0 : Number(otRates.weeklyOffOT),
        holidayOT: otRates.holidayOT === "" ? 0 : Number(otRates.holidayOT),
      };
      const res = await savePolicy(id, deductions, rates);
      if (res.success) {
        showToast("success", "Policy saved successfully.");
        // Reload to get fresh _ids from DB
        loadPolicy();
      } else {
        setError(res.message || "Save failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Live total ── */
  const totalPct = rows.reduce((s, r) => s + (Number(r.percentage) || 0), 0);
  const totalOver = totalPct > 100;

  return (
    <Layout title="Department Policy">
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate("/departments")} className="hover:text-slate-300 transition-colors">
          Departments
        </button>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span className="text-slate-300">
          {department ? `${department.departmentName} — Policy` : "Policy"}
        </span>
      </div>

      {/* ── Skeleton ── */}
      {fetching && (
        <div className="w-full max-w-2xl rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-4">
          <div className="h-5 w-48 rounded-full bg-white/[0.06] animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-10 flex-1 rounded-xl bg-white/[0.04] animate-pulse" />
              <div className="h-10 w-32 rounded-xl bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {!fetching && error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10
                        px-4 py-3 text-sm text-red-300">
          <svg className="mt-0.5 flex-shrink-0" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* ── Policy card ── */}
      {!fetching && department && (
        <div className="w-full max-w-2xl rounded-2xl border border-white/[0.07] bg-white/[0.03]">
          {/* Card header */}
          <div className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-slate-100">{department.departmentName}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Configure payroll deductions and overtime rates for this department.
              </p>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  Daily: ₹{otRates.dailyOT || 0}/hr
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                  Weekly Off: ₹{otRates.weeklyOffOT || 0}/hr
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                  Holiday: ₹{otRates.holidayOT || 0}/hr
                </span>
              </div>
            </div>
            {/* Total badge */}
            <div className={`flex-shrink-0 rounded-xl border px-4 py-2 text-center
                             ${totalOver
                               ? "border-red-500/30 bg-red-500/10"
                               : "border-white/[0.08] bg-white/[0.03]"}`}>
              <span className="block text-[10px] uppercase tracking-wider text-slate-500">Total</span>
              <span className={`text-lg font-bold ${totalOver ? "text-red-400" : "text-slate-200"}`}>
                {totalPct.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Deductions table */}
          <div className="px-6 py-5">
            {rows.length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.07]">
                    <th className="pb-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-600 px-4">
                      Deduction Name
                    </th>
                    <th className="pb-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-slate-600 px-4 w-40">
                      Percentage
                    </th>
                    <th className="pb-3 w-14" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <DeductionRow
                      key={row._key || row._id || i}
                      row={row}
                      index={i}
                      onChange={handleChange}
                      onDelete={handleDeleteRow}
                      disabled={saving}
                    />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-slate-600">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <p className="text-sm">No deductions yet. Add one below.</p>
              </div>
            )}

            {/* Add row button */}
            <button
              id="add-deduction-btn"
              type="button"
              onClick={handleAddRow}
              disabled={saving}
              className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-white/[0.15]
                         px-4 py-2.5 text-sm text-slate-500
                         hover:border-indigo-500/40 hover:text-indigo-400 transition-all disabled:opacity-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Deduction
            </button>
          </div>

          {/* Overtime Rates Section */}
          <div className="border-t border-white/[0.07] px-6 py-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
              Overtime Rates (₹ / hour)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Daily OT */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="dailyOT" className="text-[12.5px] font-medium text-slate-400">
                  Daily OT Rate <span className="text-slate-600">(₹/hr)</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm text-slate-600 pointer-events-none">₹</span>
                  <input
                    id="dailyOT"
                    type="number"
                    value={otRates.dailyOT}
                    onChange={(e) => setOtRates(prev => ({ ...prev, dailyOT: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={saving}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04]
                               pl-7 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none
                               focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15
                               disabled:opacity-50 transition-all"
                  />
                </div>
              </div>

              {/* Weekly Off OT */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="weeklyOffOT" className="text-[12.5px] font-medium text-slate-400">
                  Weekly Off OT Rate <span className="text-slate-600">(₹/hr)</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm text-slate-600 pointer-events-none">₹</span>
                  <input
                    id="weeklyOffOT"
                    type="number"
                    value={otRates.weeklyOffOT}
                    onChange={(e) => setOtRates(prev => ({ ...prev, weeklyOffOT: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={saving}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04]
                               pl-7 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none
                               focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15
                               disabled:opacity-50 transition-all"
                  />
                </div>
              </div>

              {/* Holiday OT */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="holidayOT" className="text-[12.5px] font-medium text-slate-400">
                  Holiday OT Rate <span className="text-slate-600">(₹/hr)</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm text-slate-600 pointer-events-none">₹</span>
                  <input
                    id="holidayOT"
                    type="number"
                    value={otRates.holidayOT}
                    onChange={(e) => setOtRates(prev => ({ ...prev, holidayOT: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={saving}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04]
                               pl-7 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none
                               focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15
                               disabled:opacity-50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer — error + save */}
          <div className="flex items-center justify-between gap-4 border-t border-white/[0.07] px-6 py-4">
            {error && !fetching ? (
              <p className="text-[13px] text-red-400">{error}</p>
            ) : <span />}
            <button
              id="save-policy-btn"
              type="button"
              onClick={handleSave}
              disabled={saving || totalOver}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600
                         px-6 py-2.5 text-sm font-semibold text-white
                         shadow-[0_4px_16px_rgba(99,102,241,0.3)]
                         hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              Save Policy
            </button>
          </div>
        </div>
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

export default DepartmentPolicy;
