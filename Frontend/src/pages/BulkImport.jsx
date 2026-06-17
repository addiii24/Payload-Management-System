/**
 * @file BulkImport.jsx
 * @description Bulk Employee Import page — 3 states:
 *   State 1 — Upload  : Download template + drag/drop .xlsx upload
 *   State 2 — Preview : Validation results table, confirm import
 *   State 3 — Success : Import complete confirmation
 */

import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import api from "../api/api.js";

/* ── Helpers ── */
const INR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

/* ══════════════════════════════════════════════════════════════
   STATE 1 — Upload Screen
══════════════════════════════════════════════════════════════ */
const UploadScreen = ({ onValidated }) => {
  const [dragging,    setDragging]    = useState(false);
  const [validating,  setValidating]  = useState(false);
  const [error,       setError]       = useState("");
  const [downloading, setDownloading] = useState(false);
  const fileRef = useRef(null);

  /* Download template */
  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await api.get("/api/employees/template", { responseType: "blob" });
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href     = url;
      link.download = "employee_import_template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download template. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  /* Send file to backend for validation */
  const uploadFile = useCallback(async (file) => {
    if (!file) return;

    if (!file.name.endsWith(".xlsx")) {
      setError("Only .xlsx files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB.");
      return;
    }

    setError("");
    setValidating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/api/employees/bulk-import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        onValidated(res.data.data);
      } else {
        setError(res.data.message || "Validation failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to validate the file.");
    } finally {
      setValidating(false);
    }
  }, [onValidated]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.07] px-5 py-4">
        <svg className="mt-0.5 flex-shrink-0 text-indigo-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-sm text-slate-400 leading-relaxed">
          Download the template, fill your employee data starting from Row 3, then upload to import in bulk.
          <br />
          <span className="text-slate-500 text-xs">Row 1 = Headers &nbsp;·&nbsp; Row 2 = Example (do not delete) &nbsp;·&nbsp; Row 3+ = Your data</span>
        </p>
      </div>

      {/* Download template button */}
      <button
        id="download-template-btn"
        onClick={handleDownloadTemplate}
        disabled={downloading}
        className="flex items-center gap-2.5 self-start rounded-xl border border-emerald-500/30
                   bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400
                   hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
      >
        {downloading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        )}
        {downloading ? "Downloading…" : "Download Template"}
      </button>

      {/* Drop zone */}
      <div
        id="upload-dropzone"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !validating && fileRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed
                    py-16 px-8 text-center cursor-pointer transition-all duration-200
                    ${dragging
                      ? "border-indigo-400/60 bg-indigo-500/10 scale-[1.01]"
                      : "border-white/[0.12] bg-white/[0.02] hover:border-indigo-500/40 hover:bg-white/[0.04]"
                    }
                    ${validating ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleFileChange}
        />

        {validating ? (
          <>
            <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-indigo-500" />
            <p className="text-sm font-medium text-slate-400">Validating your file…</p>
          </>
        ) : (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-300">Click to upload or drag &amp; drop</p>
              <p className="mt-1 text-xs text-slate-600">Accepts .xlsx files only &nbsp;·&nbsp; Max 5MB</p>
            </div>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div id="upload-error" className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   STATE 2 — Preview Screen
══════════════════════════════════════════════════════════════ */
const PreviewScreen = ({ data, onImported, onCancel }) => {
  const [importing, setImporting] = useState(false);
  const [error,     setError]     = useState("");

  const { valid, errors, summary } = data;
  const allRows = [
    ...valid.map((r)  => ({ ...r, _valid: true  })),
    ...errors.map((r) => ({ ...r, _valid: false })),
  ].sort((a, b) => a._row - b._row);

  const handleImport = async () => {
    if (valid.length === 0) return;
    setImporting(true);
    setError("");
    try {
      const res = await api.post("/api/employees/bulk-import/confirm", { employees: valid });
      if (res.data.success) {
        onImported(res.data.data);
      } else {
        setError(res.data.message || "Import failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Import failed. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Summary chips */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          {summary.valid} Valid
        </span>
        {summary.errorCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-sm font-semibold text-red-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {summary.errorCount} Errors
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-slate-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          {summary.total} Total
        </span>
      </div>

      {/* Error info */}
      {summary.errorCount > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-300">
          <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Error rows will be skipped. Fix them in Excel and re-upload to import them.
        </div>
      )}

      {/* Preview table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              {["Row", "Emp ID", "Full Name", "Department", "Basic Salary", "Status"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {allRows.map((row) => (
              <tr
                key={`${row._row}-${row.employeeId}`}
                className={`group transition-colors border-l-2
                  ${row._valid
                    ? "border-l-emerald-500/60 hover:bg-emerald-500/[0.03]"
                    : "border-l-red-500/60 hover:bg-red-500/[0.03] bg-red-500/[0.02]"
                  }`}
              >
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">{row._row}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[12px] text-indigo-400">
                    {row.employeeId || "—"}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-200">{row.name || "—"}</td>
                <td className="px-4 py-3 text-slate-400">{row.department || "—"}</td>
                <td className="px-4 py-3 text-slate-300">{row.basicSalary ? INR(row.basicSalary) : "—"}</td>
                <td className="px-4 py-3">
                  {row._valid ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Ready
                    </span>
                  ) : (
                    <span className="text-red-400 text-xs font-semibold">
                      ❌ {row.errors?.join("; ")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Error feedback */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <svg className="mt-0.5 flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {valid.length > 0 && (
          <button
            id="confirm-import-btn"
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600
                       px-6 py-2.5 text-sm font-semibold text-white
                       shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:opacity-90 disabled:opacity-60 transition-all"
          >
            {importing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            )}
            {importing ? "Importing…" : `Import ${valid.length} Valid Employee${valid.length !== 1 ? "s" : ""}`}
          </button>
        )}
        <button
          id="cancel-import-btn"
          onClick={onCancel}
          disabled={importing}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04]
                     px-5 py-2.5 text-sm font-medium text-slate-400
                     hover:bg-white/[0.07] disabled:opacity-50 transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Cancel
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   STATE 3 — Success Screen
══════════════════════════════════════════════════════════════ */
const SuccessScreen = ({ imported, onImportMore }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center gap-8 py-16 text-center max-w-md mx-auto">
      {/* Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-emerald-400">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-slate-100">
          {imported} Employee{imported !== 1 ? "s" : ""} Imported Successfully
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          All records have been saved to the database.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          id="view-employees-btn"
          onClick={() => navigate("/employees")}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600
                     px-6 py-2.5 text-sm font-semibold text-white
                     shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:opacity-90 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          View All Employees
        </button>
        <button
          id="import-more-btn"
          onClick={onImportMore}
          className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04]
                     px-5 py-2.5 text-sm font-medium text-slate-400
                     hover:bg-white/[0.07] transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Import More
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE — BulkImport
   Manages 3 states: "upload" | "preview" | "success"
══════════════════════════════════════════════════════════════ */
const BulkImport = () => {
  const [state,    setState]    = useState("upload");   // "upload" | "preview" | "success"
  const [previewData, setPreviewData] = useState(null);
  const [importedCount, setImportedCount] = useState(0);

  const handleValidated = (data) => {
    setPreviewData(data);
    setState("preview");
  };

  const handleImported = (result) => {
    setImportedCount(result.imported ?? 0);
    setState("success");
  };

  const handleReset = () => {
    setPreviewData(null);
    setImportedCount(0);
    setState("upload");
  };

  const subtitle =
    state === "upload"  ? "Download the template, fill your data, then upload to import employees in bulk." :
    state === "preview" ? "Review the validation results before confirming the import." :
                          "Import completed successfully.";

  return (
    <Layout title="Bulk Import">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Bulk Employee Import</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {["Upload", "Preview", "Done"].map((step, i) => {
            const idx = state === "upload" ? 0 : state === "preview" ? 1 : 2;
            const active  = i === idx;
            const done    = i < idx;
            return (
              <div key={step} className="flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold
                  ${active ? "bg-indigo-500 text-white" :
                    done   ? "bg-emerald-500 text-white" :
                             "bg-white/[0.06] text-slate-600"}`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`text-xs font-medium ${active ? "text-slate-300" : done ? "text-emerald-400" : "text-slate-600"}`}>
                  {step}
                </span>
                {i < 2 && <div className="h-px w-8 bg-white/[0.08]" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Render current state */}
      {state === "upload"  && <UploadScreen onValidated={handleValidated} />}
      {state === "preview" && <PreviewScreen data={previewData} onImported={handleImported} onCancel={handleReset} />}
      {state === "success" && <SuccessScreen imported={importedCount} onImportMore={handleReset} />}
    </Layout>
  );
};

export default BulkImport;
