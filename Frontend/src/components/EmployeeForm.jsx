/**
 * @file EmployeeForm.jsx
 * @description Reusable employee form used by both AddEmployee and EditEmployee.
 *
 *  Props:
 *    initialData  {object}   pre-filled values (for edit)
 *    onSubmit     {fn}       async fn(formData) called on valid submit
 *    loading      {boolean}  disables form during submission
 *    isEdit       {boolean}  hides employeeId field and adjusts labels
 *    error        {string}   server-side error to display
 */

import { useState } from "react";

const FIELD_CONFIGS = [
  { name: "employeeId",  label: "Employee ID",   type: "text",   placeholder: "e.g. EMP001",          editOnly: false, required: true },
  { name: "name",        label: "Full Name",      type: "text",   placeholder: "e.g. Aditya Sharma",   editOnly: true,  required: true },
  { name: "department",  label: "Department",     type: "text",   placeholder: "e.g. IT, HR, Finance", editOnly: true,  required: true },
  { name: "designation", label: "Designation",    type: "text",   placeholder: "e.g. Developer",       editOnly: true,  required: true },
  { name: "joiningDate", label: "Joining Date",   type: "date",   placeholder: "",                     editOnly: false, required: true },
  { name: "basicSalary", label: "Basic Salary (₹)", type: "number", placeholder: "e.g. 35000",        editOnly: true,  required: true },
  { name: "pfNumber",    label: "PF Number",      type: "text",   placeholder: "e.g. PF12345",         editOnly: true,  required: false },
  { name: "esiNumber",   label: "ESI Number",     type: "text",   placeholder: "e.g. ESI12345",        editOnly: true,  required: false },
];

const EMPTY = {
  employeeId:  "",
  name:        "",
  department:  "",
  designation: "",
  joiningDate: "",
  basicSalary: "",
  pfNumber:    "",
  esiNumber:   "",
};

/* ── Field wrapper ── */
const Field = ({ config, value, onChange, disabled }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={config.name} className="text-[13px] font-medium text-slate-400">
      {config.label}
      {config.required && <span className="ml-0.5 text-red-400">*</span>}
    </label>
    <input
      id={config.name}
      name={config.name}
      type={config.type}
      placeholder={config.placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      min={config.type === "number" ? 0 : undefined}
      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none
                 transition-all duration-200
                 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15
                 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

const EmployeeForm = ({ initialData = EMPTY, onSubmit, loading = false, isEdit = false, error = "" }) => {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...initialData,
    // Normalise joiningDate to YYYY-MM-DD for <input type="date">
    joiningDate: initialData.joiningDate
      ? new Date(initialData.joiningDate).toISOString().slice(0, 10)
      : "",
  }));
  const [localError, setLocalError] = useState("");

  const handleChange = (e) => {
    setLocalError("");
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const required = FIELD_CONFIGS.filter((f) => f.required && (!isEdit || f.editOnly || f.name === "joiningDate"));
    for (const f of required) {
      if (isEdit && f.name === "employeeId") continue; // never required on edit
      if (!form[f.name]?.toString().trim()) return `${f.label} is required.`;
    }
    if (form.basicSalary !== "" && Number(form.basicSalary) < 0) {
      return "Basic Salary cannot be negative.";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setLocalError(err); return; }
    setLocalError("");
    await onSubmit(form);
  };

  const displayedError = localError || error;

  /* Determine which fields to show */
  const visibleFields = isEdit
    ? FIELD_CONFIGS.filter((f) => f.name !== "employeeId")
    : FIELD_CONFIGS;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Error */}
      {displayedError && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-500/30
                                      bg-red-500/10 px-4 py-3 text-[13.5px] text-red-300">
          <svg className="mt-0.5 flex-shrink-0" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {displayedError}
        </div>
      )}

      {/* Fields grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleFields.map((config) => (
          <Field
            key={config.name}
            config={config}
            value={form[config.name]}
            onChange={handleChange}
            disabled={loading}
          />
        ))}
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          id="employee-form-submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600
                     px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(99,102,241,0.3)]
                     transition-all hover:opacity-90 hover:-translate-y-px
                     disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {isEdit ? "Update Employee" : "Create Employee"}
        </button>
      </div>
    </form>
  );
};

export default EmployeeForm;
