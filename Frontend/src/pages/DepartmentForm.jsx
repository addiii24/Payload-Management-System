/**
 * @file DepartmentForm.jsx
 * @description Modal form for creating or editing a department.
 *
 *  Props:
 *    initialData  {object}   pre-filled data for edit mode
 *    onSubmit     {fn}       async fn(formData)
 *    onCancel     {fn}       closes the modal
 *    loading      {boolean}
 *    error        {string}   server error message
 *    isEdit       {boolean}
 */

import { useState } from "react";

const EMPTY = { departmentName: "", description: "", isActive: true };

const DepartmentForm = ({ initialData = EMPTY, onSubmit, onCancel, loading = false, error = "", isEdit = false }) => {
  const [form, setForm] = useState({ ...EMPTY, ...initialData });
  const [localErr, setLocalErr] = useState("");

  const handleChange = (e) => {
    setLocalErr("");
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.departmentName.trim()) {
      setLocalErr("Department name is required.");
      return;
    }
    setLocalErr("");
    await onSubmit({ ...form, departmentName: form.departmentName.trim() });
  };

  const displayErr = localErr || error;

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.1]
                      bg-[#0f1422] shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-100">
            {isEdit ? "Edit Department" : "New Department"}
          </h2>
          <button
            type="button" onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 px-6 py-5">
          {displayErr && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30
                            bg-red-500/10 px-4 py-3 text-[13.5px] text-red-300">
              <svg className="mt-0.5 flex-shrink-0" width="15" height="15" viewBox="0 0 24 24"
                   fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {displayErr}
            </div>
          )}

          {/* Department Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="departmentName" className="text-[13px] font-medium text-slate-400">
              Department Name <span className="text-red-400">*</span>
            </label>
            <input
              id="departmentName" name="departmentName" type="text"
              placeholder="e.g. Production, IT, HR"
              value={form.departmentName} onChange={handleChange} disabled={loading}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                         px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none
                         focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15
                         disabled:opacity-50 transition-all"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-[13px] font-medium text-slate-400">
              Description
            </label>
            <textarea
              id="description" name="description" rows={3}
              placeholder="Optional notes about this department…"
              value={form.description} onChange={handleChange} disabled={loading}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04]
                         px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none
                         focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15
                         disabled:opacity-50 transition-all"
            />
          </div>

          {/* isActive toggle */}
          <label className="flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input
                type="checkbox" name="isActive" id="isActive"
                checked={form.isActive} onChange={handleChange}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full border border-white/10 bg-white/[0.08]
                              peer-checked:bg-indigo-600 transition-colors" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-slate-500
                              peer-checked:translate-x-5 peer-checked:bg-white transition-all" />
            </div>
            <span className="text-sm text-slate-400">Active Department</span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button" onClick={onCancel} disabled={loading}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5
                         text-sm font-medium text-slate-400 hover:bg-white/[0.07] disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit" id="dept-form-submit" disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl
                         bg-gradient-to-r from-indigo-500 to-violet-600 py-2.5
                         text-sm font-semibold text-white
                         shadow-[0_4px_16px_rgba(99,102,241,0.3)]
                         hover:opacity-90 disabled:opacity-60 transition-all"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentForm;
