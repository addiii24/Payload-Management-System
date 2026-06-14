/**
 * @file GeneratePayroll.jsx
 * @description Payroll Generation page.
 *
 *  Workflow:
 *    1. Admin picks Month + Year
 *    2. Clicks "Generate Payroll"
 *    3. Backend processes all employees → returns results + per-employee errors
 *    4. Page shows a summary table of generated records
 *    5. Admin can re-generate (force) or navigate to Payroll Records
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { generateBulkPayroll } from "../services/payrollService.js";

/* ── Month names ── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

/* ── Currency formatter ── */
const INR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/* ── Status chip ── */
const Chip = ({ label, color }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${color}`}>
    {label}
  </span>
);

/* ════════════════════════════════════════════════════════════ */
const GeneratePayroll = () => {
  const navigate = useNavigate();

  const [month,      setMonth]      = useState(currentMonth);
  const [year,       setYear]       = useState(currentYear);
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState(null);   // last API response data
  const [error,      setError]      = useState("");

  /* ── Years list: 5 years back → 1 year forward ── */
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  /* ── Generate ── */
  const handleGenerate = async (force = false) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await generateBulkPayroll({ month, year }, force);
      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.message || "Generation failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <Layout title="Generate Payroll">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Generate Payroll</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a pay period and process salaries for all employees.
          </p>
        </div>
        {result && (
          <button
            onClick={() => navigate("/payroll/records")}
            className="flex items-center gap-2 rounded-xl border border-indigo-500/30
                       bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300
                       hover:bg-indigo-500/20 transition-all"
          >
            View Payroll Records
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Period selector card ── */}
      <div className="w-full max-w-2xl rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
        <h3 className="mb-5 text-[13px] font-semibold uppercase tracking-widest text-slate-600">
          Select Pay Period
        </h3>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {/* Month */}
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label className="text-[13px] font-medium text-slate-400">Month</label>
            <select
              id="select-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              disabled={loading}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                         px-4 py-2.5 text-sm text-slate-200 outline-none
                         focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15
                         disabled:opacity-50 transition-all"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1} className="bg-[#0d1117]">{m}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-400">Year</label>
            <select
              id="select-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={loading}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                         px-4 py-2.5 text-sm text-slate-200 outline-none
                         focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15
                         disabled:opacity-50 transition-all"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-[#0d1117]">{y}</option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <div className="flex items-end">
            <button
              id="generate-payroll-btn"
              type="button"
              onClick={() => handleGenerate(false)}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl
                         bg-gradient-to-r from-indigo-500 to-violet-600
                         px-5 py-2.5 text-sm font-semibold text-white
                         shadow-[0_4px_20px_rgba(99,102,241,0.3)]
                         hover:opacity-90 hover:-translate-y-px
                         disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/30
                          bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <svg className="mt-0.5 flex-shrink-0" width="15" height="15" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {result && (
        <div className="flex flex-col gap-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Generated",   value: result.generated, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { label: "Skipped",     value: result.skipped,   color: "text-slate-400",   bg: "bg-white/[0.03] border-white/[0.07]" },
              { label: "Failed",      value: result.failed,    color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
              { label: "Pay Period",  value: periodLabel,      color: "text-indigo-300",  bg: "bg-indigo-500/10 border-indigo-500/20" },
            ].map((s) => (
              <div key={s.label}
                   className={`flex flex-col gap-1.5 rounded-xl border p-4 ${s.bg}`}>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{s.label}</span>
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Re-generate warning banner */}
          {result.skipped > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl
                            border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
              <p className="text-sm text-amber-300">
                <span className="font-semibold">{result.skipped}</span> employee(s) were already processed
                and skipped. Use Re-generate to overwrite.
              </p>
              <button
                id="force-generate-btn"
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/30
                           bg-amber-500/10 px-3.5 py-1.5 text-[13px] font-medium text-amber-300
                           hover:bg-amber-500/20 transition-all disabled:opacity-50"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                Re-generate All
              </button>
            </div>
          )}

          {/* Per-employee errors */}
          {result.errors?.length > 0 && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05]">
              <div className="border-b border-red-500/20 px-5 py-3.5">
                <h4 className="text-sm font-semibold text-red-400">
                  {result.errors.length} Employee(s) Failed
                </h4>
              </div>
              <ul className="divide-y divide-red-500/10">
                {result.errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-3 px-5 py-3 text-sm">
                    <span className="font-mono text-red-400/70">{e.employeeCode}</span>
                    <span className="flex-1 text-slate-400">{e.name}</span>
                    <span className="text-red-400">{e.error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Generated payrolls table */}
          {result.payrolls?.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07]">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
                <h4 className="text-sm font-semibold text-slate-300">
                  {result.payrolls.length} Records Generated — {periodLabel}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      {["Emp ID","Name","Department","Gross","Deduction","Net Salary","Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold
                                               uppercase tracking-wider text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {result.payrolls.map((p) => (
                      <tr key={p._id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-4 py-3">
                          <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[12px] text-indigo-400">
                            {p.employeeCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-200">{p.employeeName}</td>
                        <td className="px-4 py-3 text-slate-400">{p.department}</td>
                        <td className="px-4 py-3 text-slate-300">{INR(p.grossSalary)}</td>
                        <td className="px-4 py-3 text-red-400">−{INR(p.totalDeduction)}</td>
                        <td className="px-4 py-3 font-bold text-emerald-400">{INR(p.netSalary)}</td>
                        <td className="px-4 py-3">
                          <Chip
                            label={p.status === "revised" ? "Revised" : "Processed"}
                            color={p.status === "revised"
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-emerald-500/15 text-emerald-400"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default GeneratePayroll;
