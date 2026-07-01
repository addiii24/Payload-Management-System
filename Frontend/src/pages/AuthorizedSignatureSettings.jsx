/**
 * @file AuthorizedSignatureSettings.jsx
 * @description Settings page for Authorized Signature.
 *              Manages authority name, designation, signature image and footer message.
 *              Changes here are dynamically reflected in all future payslip PDFs.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import {
  getAuthorizedSignature,
  upsertAuthorizedSignature,
} from "../services/settingsService.js";

/* ── Toast ──────────────────────────────────────────────────────────────────── */
const Toast = ({ message, type }) => {
  if (!message) return null;
  const isError = type === "error";
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-4 shadow-2xl
                     backdrop-blur-sm transition-all
                     ${isError
                       ? "border-red-500/30 bg-red-500/10 text-red-300"
                       : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
      <span className="text-lg">{isError ? "✕" : "✓"}</span>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

/* ── Main Component ─────────────────────────────────────────────────────────── */
const AuthorizedSignatureSettings = () => {
  const navigate = useNavigate();

  const [form, setForm]         = useState({
    authorityName:        "",
    authorityDesignation: "",
    footerMessage:        "This is a system-generated payslip and does not require a physical signature.",
  });
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [toast,   setToast]     = useState({ message: "", type: "success" });

  const [sigPreview,  setSigPreview]  = useState("");
  const [sigFile,     setSigFile]     = useState(null);
  const [clearSig,    setClearSig]    = useState(false);

  /* ── Fetch on mount ──────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAuthorizedSignature();
        if (res.success && res.data) {
          const d = res.data;
          setForm({
            authorityName:        d.authorityName        ?? "",
            authorityDesignation: d.authorityDesignation ?? "",
            footerMessage:        d.footerMessage        ?? "",
          });
          if (d.signatureImage) setSigPreview(d.signatureImage);
        }
      } catch {
        showToast("Failed to load authorized signature.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ── Helpers ─────────────────────────────────────────────────── */
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSigChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSigFile(file);
    setClearSig(false);
    setSigPreview(URL.createObjectURL(file));
  };

  const handleClearSig = () => {
    setSigFile(null);
    setSigPreview("");
    setClearSig(true);
  };

  /* ── Submit ──────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      if (sigFile)   formData.append("signatureImage", sigFile);
      if (clearSig)  formData.append("clearSignatureImage", "true");

      const res = await upsertAuthorizedSignature(formData);
      if (res.success) {
        if (!sigFile && res.data?.signatureImage) setSigPreview(res.data.signatureImage);
        setSigFile(null);
        setClearSig(false);
        showToast("Authorized signature saved successfully.", "success");
      } else {
        showToast(res.message || "Failed to save.", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save authorized signature.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <Layout title="Authorized Signature">
      <Toast {...toast} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate("/settings")} className="hover:text-slate-300 transition-colors">
          Settings
        </button>
        <span>/</span>
        <span className="text-slate-300">Authorized Signature</span>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-100">Authorized Signature</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          This signature block is printed on every payslip. Changes take effect immediately on the next PDF generated.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-sky-500" />
          Loading…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

          {/* ── Authority Details ── */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-600">
              Authority Details
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="authorityName" className="text-sm font-medium text-slate-300">
                  Authority Name
                </label>
                <input
                  id="authorityName"
                  name="authorityName"
                  type="text"
                  value={form.authorityName}
                  onChange={handleChange}
                  placeholder="e.g. Rajesh Kumar"
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5
                             text-sm text-slate-200 placeholder-slate-600
                             outline-none transition-colors
                             focus:border-sky-500/50 focus:bg-white/[0.06]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="authorityDesignation" className="text-sm font-medium text-slate-300">
                  Designation
                </label>
                <input
                  id="authorityDesignation"
                  name="authorityDesignation"
                  type="text"
                  value={form.authorityDesignation}
                  onChange={handleChange}
                  placeholder="e.g. HR Manager"
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5
                             text-sm text-slate-200 placeholder-slate-600
                             outline-none transition-colors
                             focus:border-sky-500/50 focus:bg-white/[0.06]"
                />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label htmlFor="footerMessage" className="text-sm font-medium text-slate-300">
                  Footer Message
                </label>
                <textarea
                  id="footerMessage"
                  name="footerMessage"
                  rows={3}
                  value={form.footerMessage}
                  onChange={handleChange}
                  placeholder="Message printed at the bottom of every payslip"
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5
                             text-sm text-slate-200 placeholder-slate-600
                             outline-none resize-none transition-colors
                             focus:border-sky-500/50 focus:bg-white/[0.06]"
                />
                <p className="text-[11px] text-slate-600">
                  e.g. "This is a system-generated payslip and does not require a physical signature."
                </p>
              </div>
            </div>
          </section>

          {/* ── Signature Image ── */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-600">
              Signature Image
              <span className="ml-2 font-normal normal-case tracking-normal text-slate-600">(optional)</span>
            </h3>

            <div className="flex flex-col gap-4">
              {/* Preview */}
              {sigPreview ? (
                <div className="relative inline-block">
                  <img
                    src={sigPreview}
                    alt="Signature preview"
                    className="h-24 max-w-[280px] rounded-lg border border-white/[0.08] bg-white/[0.04] object-contain p-3"
                  />
                  <button
                    type="button"
                    onClick={handleClearSig}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full
                               bg-red-500/80 text-white hover:bg-red-500 transition-colors text-xs font-bold"
                    title="Remove signature"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex h-24 w-64 items-center justify-center rounded-lg border border-dashed border-white/[0.12]
                                bg-white/[0.02] text-xs text-slate-600">
                  No signature image
                </div>
              )}

              {/* Upload */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="signature-image-input"
                  className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08]
                             bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.07] transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Choose Signature Image
                </label>
                <input
                  id="signature-image-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleSigChange}
                />
                <p className="text-[11px] text-slate-600">JPEG, PNG, WEBP or SVG · Max 2 MB · Use a transparent background for best results</p>
              </div>

              {/* Live preview of the payslip footer block */}
              {(form.authorityName || form.authorityDesignation || sigPreview) && (
                <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#0d1117] p-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Payslip Footer Preview
                  </p>
                  <div className="flex flex-col items-end gap-1 border-t border-slate-700/50 pt-4">
                    {sigPreview && (
                      <img src={sigPreview} alt="Sig" className="mb-1 h-12 object-contain" />
                    )}
                    {form.authorityName && (
                      <span className="text-sm font-bold text-slate-200">{form.authorityName}</span>
                    )}
                    {form.authorityDesignation && (
                      <span className="text-xs text-slate-500">{form.authorityDesignation}</span>
                    )}
                  </div>
                  {form.footerMessage && (
                    <p className="mt-4 border-t border-slate-700/50 pt-3 text-center text-[11px] text-slate-600">
                      {form.footerMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Actions ── */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              id="save-signature-btn"
              className="flex items-center gap-2.5 rounded-xl bg-sky-500 px-6 py-2.5
                         text-sm font-semibold text-white shadow-lg shadow-sky-500/20
                         transition-all hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              )}
              {saving ? "Saving…" : "Save Signature"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm text-slate-400
                         transition-colors hover:bg-white/[0.04] hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </Layout>
  );
};

export default AuthorizedSignatureSettings;
