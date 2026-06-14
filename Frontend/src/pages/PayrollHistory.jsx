/**
 * @file PayrollHistory.jsx
 * @description Payroll History page — view payroll records by period and
 *              download individual payslips or a full ZIP.
 *
 *  Features:
 *    • Month + Year filter
 *    • Summary cards (count, gross, deduction, net)
 *    • Records table with per-row payslip download
 *    • "Download All Payslips" bulk ZIP button
 *    • Loading spinners on each download button (independent per row)
 *    • Inline payslip detail panel (deduction breakdown)
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import { getPayrollByPeriod } from "../services/payrollService.js";
import {
  downloadPayslip,
  bulkDownloadPayslips,
} from "../services/payslipService.js";

/* ── Constants ── */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

/* ── Formatters ── */
const INR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

const pct = (n) => `${Number(n ?? 0).toFixed(2)}%`;

/* ── Summary card ── */
const SCard = ({ label, value, sub, color, bg }) => (
  <div className={`rounded-xl border p-4 ${bg}`}>
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
    <p className={`mt-1.5 text-xl font-bold ${color}`}>{value}</p>
    {sub && <p className="mt-0.5 text-[11px] text-slate-600">{sub}</p>}
  </div>
);

/* ── Deduction breakdown modal ── */
const DeductionPanel = ({ record, onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
    <div className="relative z-10 my-auto w-full max-w-md rounded-2xl border border-white/[0.1]
                    bg-[#0d1117] shadow-[0_30px_60px_rgba(0,0,0,0.7)]">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-white/[0.07] px-6 py-4">
        <div>
          <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 font-mono text-xs font-bold text-indigo-400">
            {record.employeeCode}
          </span>
          <h3 className="mt-1.5 text-base font-bold text-slate-100">{record.employeeName}</h3>
          <p className="text-[12px] text-slate-500">{record.designation} · {record.department}</p>
        </div>
        <button onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-colors">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Period */}
      <div className="flex justify-between border-b border-white/[0.07] px-6 py-3 text-sm">
        <span className="text-slate-500">Pay Period</span>
        <span className="font-semibold text-slate-200">{MONTHS[record.month - 1]} {record.year}</span>
      </div>

      {/* Earnings */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/15
                        bg-emerald-500/[0.07] px-4 py-3">
          <span className="text-sm font-medium text-slate-400">Gross Salary</span>
          <span className="text-base font-bold text-emerald-400">{INR(record.grossSalary)}</span>
        </div>
      </div>

      {/* Deductions */}
      <div className="px-6 py-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-600">Deductions</p>
        {record.deductions?.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="pb-2 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                <th className="pb-2 text-center text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Rate</th>
                <th className="pb-2 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {record.deductions.map((d, i) => (
                <tr key={i}>
                  <td className="py-2.5 text-slate-300">{d.name}</td>
                  <td className="py-2.5 text-center text-slate-500">{pct(d.percentage)}</td>
                  <td className="py-2.5 text-right font-medium text-red-400">−{INR(d.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.07]">
                <td colSpan={2} className="pt-2.5 text-sm font-semibold text-slate-400">Total Deduction</td>
                <td className="pt-2.5 text-right font-bold text-red-400">−{INR(record.totalDeduction)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="text-center text-sm text-slate-600 py-4">No deductions applied.</p>
        )}
      </div>

      {/* Net Pay */}
      <div className="mx-6 mb-5 flex items-center justify-between rounded-xl
                      border border-indigo-500/20 bg-indigo-500/10 px-5 py-3.5">
        <span className="text-sm font-bold text-slate-200">Net Salary</span>
        <span className="text-xl font-bold text-indigo-300">{INR(record.netSalary)}</span>
      </div>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════ */
const PayrollHistory = () => {
  const navigate = useNavigate();

  const [month,         setMonth]         = useState(currentMonth);
  const [year,          setYear]          = useState(currentYear);
  const [loading,       setLoading]       = useState(false);
  const [data,          setData]          = useState(null);
  const [selected,      setSelected]      = useState(null);       // detail panel record
  const [downloading,   setDownloading]   = useState({});         // { [payrollId]: bool }
  const [bulkLoading,   setBulkLoading]   = useState(false);
  const [toast,         setToast]         = useState(null);

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
      const res = await getPayrollByPeriod({ month, year });
      if (res.success) setData(res.data);
      else showToast("error", res.message || "Failed to load records.");
    } catch (err) {
      showToast("error", err.response?.data?.message || "Could not load payroll records.");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  /* ── Single payslip download ── */
  const handleDownloadOne = async (record) => {
    setDownloading((prev) => ({ ...prev, [record._id]: true }));
    try {
      await downloadPayslip(record._id);
      showToast("success", `Payslip downloaded for ${record.employeeName}.`);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Download failed.");
    } finally {
      setDownloading((prev) => ({ ...prev, [record._id]: false }));
    }
  };

  /* ── Bulk ZIP download ── */
  const handleBulkDownload = async () => {
    setBulkLoading(true);
    try {
      await bulkDownloadPayslips({ month, year });
      showToast("success", `Bulk ZIP downloaded for ${MONTHS[month - 1]} ${year}.`);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Bulk download failed.");
    } finally {
      setBulkLoading(false);
    }
  };

  const periodLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <Layout title="Payroll History">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Payroll History</h2>
          <p className="mt-1 text-sm text-slate-500">
            View payroll records and download payslips by pay period.
          </p>
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
          <select id="hist-month" value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04]
                       px-3 py-2 text-sm text-slate-200 outline-none
                       focus:border-indigo-500/50 transition-all">
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1} className="bg-[#0d1117]">{m}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-500">Year</label>
          <select id="hist-year" value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04]
                       px-3 py-2 text-sm text-slate-200 outline-none
                       focus:border-indigo-500/50 transition-all">
            {years.map((y) => (
              <option key={y} value={y} className="bg-[#0d1117]">{y}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <button id="hist-search-btn" onClick={handleFetch} disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-indigo-500/30
                     bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300
                     hover:bg-indigo-500/20 disabled:opacity-50 transition-all">
          {loading
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
          }
          Search
        </button>

        {/* Bulk download — only shown when results exist */}
        {data?.count > 0 && (
          <button id="bulk-download-btn" onClick={handleBulkDownload} disabled={bulkLoading}
            className="ml-auto flex items-center gap-2 rounded-xl border border-violet-500/30
                       bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-300
                       hover:bg-violet-500/20 disabled:opacity-50 transition-all">
            {bulkLoading
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
            }
            Download All Payslips ({data.count})
          </button>
        )}
      </div>

      {/* ── Results ── */}
      {data && (
        <div className="flex flex-col gap-5">

          {/* Summary cards */}
          {data.count > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SCard label="Records"         value={data.count}                        color="text-slate-200"   bg="bg-white/[0.03] border-white/[0.07]" />
              <SCard label="Total Gross"     value={INR(data.summary?.totalGross)}     color="text-slate-300"   bg="bg-white/[0.03] border-white/[0.07]" />
              <SCard label="Total Deduction" value={INR(data.summary?.totalDeduction)} color="text-red-400"     bg="bg-red-500/[0.06] border-red-500/15" />
              <SCard label="Total Net Pay"   value={INR(data.summary?.totalNet)}       color="text-emerald-400" bg="bg-emerald-500/[0.06] border-emerald-500/15" />
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
                    {["Emp ID","Name","Department","Gross","Deduction","Net Salary","Status","Actions"].map((h) => (
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
                        <div className="flex items-center gap-2">
                          {/* View details */}
                          <button
                            id={`view-${p._id}`}
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
                            Details
                          </button>

                          {/* Download payslip */}
                          <button
                            id={`dl-${p._id}`}
                            onClick={() => handleDownloadOne(p)}
                            disabled={!!downloading[p._id]}
                            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25
                                       bg-emerald-500/10 px-2.5 py-1.5 text-[12px] font-medium text-emerald-400
                                       hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
                          >
                            {downloading[p._id]
                              ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
                              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                  <polyline points="7 10 12 15 17 10"/>
                                  <line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                            }
                            Payslip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Deduction detail panel ── */}
      {selected && (
        <DeductionPanel record={selected} onClose={() => setSelected(null)} />
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

export default PayrollHistory;
