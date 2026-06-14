/**
 * @file PayrollRecords.jsx
 * @description Payroll Records page — view, filter, and inspect payroll slips.
 *
 *  Features:
 *    • Filter by Month + Year + Department
 *    • Summary totals (Gross, Total Deduction, Net)
 *    • Full payroll table with per-row slip modal
 *    • Payslip modal: employee snapshot + deduction breakdown
 *    • Delete (void) a record with confirmation
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { getPayrollByPeriod, deletePayroll } from "../services/payrollService.js";

/* ── Helpers ── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const INR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const pct = (n) => `${Number(n ?? 0).toFixed(2)}%`;

/* ── Payslip Modal ─────────────────────────────────────────── */
const PayslipModal = ({ record, onClose, onDelete }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(record._id);
    setDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 my-auto w-full max-w-lg rounded-2xl border border-white/[0.1]
                      bg-[#0d1117] shadow-[0_30px_60px_rgba(0,0,0,0.7)]">

        {/* ── Payslip header ── */}
        <div className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 font-mono text-xs font-bold text-indigo-400">
                {record.employeeCode}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold
                ${record.status === "revised" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                {record.status === "revised" ? "Revised" : "Processed"}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-100">{record.employeeName}</h3>
            <p className="text-sm text-slate-500">
              {record.designation} · {record.department}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── Pay period ── */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-3">
          <span className="text-sm text-slate-500">Pay Period</span>
          <span className="text-sm font-semibold text-slate-200">
            {MONTHS[record.month - 1]} {record.year}
          </span>
        </div>

        {/* ── Earnings ── */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center justify-between rounded-xl bg-emerald-500/[0.07]
                          border border-emerald-500/15 px-4 py-3">
            <span className="text-sm font-medium text-slate-400">Gross Salary (Basic)</span>
            <span className="text-lg font-bold text-emerald-400">{INR(record.grossSalary)}</span>
          </div>
        </div>

        {/* ── Deductions table ── */}
        <div className="px-6 py-4">
          <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            Deductions
          </h4>
          {record.deductions?.length > 0 ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="pb-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">Name</th>
                  <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">Rate</th>
                  <th className="pb-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {record.deductions.map((d, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-slate-300">{d.name}</td>
                    <td className="py-2.5 text-right text-slate-500">{pct(d.percentage)}</td>
                    <td className="py-2.5 text-right font-medium text-red-400">−{INR(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.07]">
                  <td colSpan={2} className="pt-3 text-sm font-semibold text-slate-400">Total Deduction</td>
                  <td className="pt-3 text-right font-bold text-red-400">−{INR(record.totalDeduction)}</td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="text-center text-sm text-slate-600 py-4">No deductions applied.</p>
          )}
        </div>

        {/* ── Net salary ── */}
        <div className="mx-6 mb-5 flex items-center justify-between rounded-xl
                        bg-indigo-500/10 border border-indigo-500/20 px-5 py-4">
          <span className="text-base font-bold text-slate-200">Net Salary</span>
          <span className="text-2xl font-bold text-indigo-300">{INR(record.netSalary)}</span>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-3 border-t border-white/[0.07] px-6 py-4">
          <button onClick={onClose}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5
                       text-sm font-medium text-slate-400 hover:bg-white/[0.07] transition-all">
            Close
          </button>

          {!confirmDelete ? (
            <button
              id={`void-${record._id}`}
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/25
                         bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400
                         hover:bg-red-500/20 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
              Void Record
            </button>
          ) : (
            <button
              id={`confirm-void-${record._id}`}
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5
                         text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60 transition-all"
            >
              {deleting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              Confirm Void
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Summary card ── */
const SummaryCard = ({ label, value, color, bg }) => (
  <div className={`rounded-xl border p-4 ${bg}`}>
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
    <p className={`mt-1.5 text-xl font-bold ${color}`}>{value}</p>
  </div>
);

/* ════════════════════════════════════════════════════════════ */
const PayrollRecords = () => {
  const navigate = useNavigate();

  const [month,      setMonth]      = useState(currentMonth);
  const [year,       setYear]       = useState(currentYear);
  const [dept,       setDept]       = useState("");
  const [loading,    setLoading]    = useState(false);
  const [data,       setData]       = useState(null);    // full API response
  const [selected,   setSelected]   = useState(null);    // payroll record in slip modal
  const [toast,      setToast]      = useState(null);

  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch records ── */
  const handleFetch = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const res = await getPayrollByPeriod({ month, year, department: dept });
      if (res.success) setData(res.data);
      else showToast("error", res.message || "Fetch failed.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not load payroll records.");
    } finally {
      setLoading(false);
    }
  }, [month, year, dept]);

  /* ── Void handler (called from modal) ── */
  const handleVoid = async (id) => {
    try {
      const res = await deletePayroll(id);
      if (res.success) {
        showToast("success", "Payroll record voided.");
        handleFetch();
      } else {
        showToast("error", res.message || "Delete failed.");
      }
    } catch {
      showToast("error", "Failed to void record.");
    }
  };

  const periodLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <Layout title="Payroll Records">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Payroll Records</h2>
          <p className="mt-1 text-sm text-slate-500">View and inspect payroll slips by pay period.</p>
        </div>
        <button
          onClick={() => navigate("/payroll/generate")}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600
                     px-5 py-2.5 text-sm font-semibold text-white
                     shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:opacity-90 hover:-translate-y-px transition-all"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Generate Payroll
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/[0.07]
                      bg-white/[0.03] px-5 py-4">
        {/* Month */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-500">Month</label>
          <select
            id="filter-month" value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04]
                       px-3 py-2 text-sm text-slate-200 outline-none
                       focus:border-indigo-500/50 transition-all"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1} className="bg-[#0d1117]">{m}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-500">Year</label>
          <select
            id="filter-year" value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04]
                       px-3 py-2 text-sm text-slate-200 outline-none
                       focus:border-indigo-500/50 transition-all"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-[#0d1117]">{y}</option>
            ))}
          </select>
        </div>

        {/* Department */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
          <label className="text-[12px] font-medium text-slate-500">Department (optional)</label>
          <input
            id="filter-dept" type="text"
            placeholder="Filter by department…"
            value={dept} onChange={(e) => setDept(e.target.value)}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                       px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none
                       focus:border-indigo-500/50 transition-all"
          />
        </div>

        {/* Search button */}
        <button
          id="fetch-records-btn"
          onClick={handleFetch}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-indigo-500/30
                     bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300
                     hover:bg-indigo-500/20 disabled:opacity-50 transition-all"
        >
          {loading
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          }
          Search
        </button>
      </div>

      {/* ── Results ── */}
      {data && (
        <div className="flex flex-col gap-5">

          {/* Summary cards */}
          {data.count > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="Records"         value={data.count}                          color="text-slate-200"   bg="bg-white/[0.03] border-white/[0.07]" />
              <SummaryCard label="Total Gross"     value={INR(data.summary?.totalGross)}       color="text-slate-300"   bg="bg-white/[0.03] border-white/[0.07]" />
              <SummaryCard label="Total Deduction" value={INR(data.summary?.totalDeduction)}   color="text-red-400"     bg="bg-red-500/[0.06] border-red-500/15" />
              <SummaryCard label="Total Net"       value={INR(data.summary?.totalNet)}         color="text-emerald-400" bg="bg-emerald-500/[0.06] border-emerald-500/15" />
            </div>
          )}

          {/* Empty state */}
          {data.count === 0 && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.07]
                            bg-white/[0.03] py-20 text-slate-600">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p className="text-sm">No payroll records found for {periodLabel}.</p>
              <button onClick={() => navigate("/payroll/generate")}
                className="text-sm text-indigo-400 hover:underline">
                Generate payroll →
              </button>
            </div>
          )}

          {/* Records table */}
          {data.count > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                    {["Emp ID","Name","Department","Gross","Deduction","Net Salary","Status","Payslip"].map((h) => (
                      <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold
                                             uppercase tracking-wider text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {data.payrolls.map((p) => (
                    <tr key={p._id} className="group hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3.5">
                        <span className="rounded bg-indigo-500/10 px-1.5 py-0.5
                                         font-mono text-[12px] text-indigo-400">
                          {p.employeeCode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-200">{p.employeeName}</td>
                      <td className="px-4 py-3.5 text-slate-400">{p.department}</td>
                      <td className="px-4 py-3.5 text-slate-300">{INR(p.grossSalary)}</td>
                      <td className="px-4 py-3.5 text-red-400">−{INR(p.totalDeduction)}</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-400">{INR(p.netSalary)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold
                          ${p.status === "revised"
                            ? "bg-amber-500/15 text-amber-400"
                            : "bg-emerald-500/15 text-emerald-400"}`}>
                          {p.status === "revised" ? "Revised" : "Processed"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          id={`view-slip-${p._id}`}
                          onClick={() => setSelected(p)}
                          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                                     bg-white/[0.04] px-2.5 py-1.5 text-[12px] font-medium text-slate-400
                                     hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-300
                                     transition-all"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Payslip modal ── */}
      {selected && (
        <PayslipModal
          record={selected}
          onClose={() => setSelected(null)}
          onDelete={handleVoid}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 rounded-xl
                         px-5 py-3.5 text-sm font-medium text-white shadow-2xl
                         ${toast.type === "success"
                           ? "bg-emerald-600 border border-emerald-500/50"
                           : "bg-red-600 border border-red-500/50"}`}>
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

export default PayrollRecords;
