/**
 * @file CompanyProfileSettings.jsx
 * @description Settings page for Company Profile.
 *              Fetches the singleton on mount and allows full CRUD via a form.
 *              Images (logo + seal) are uploaded via FormData (multipart).
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import {
  getCompanyProfile,
  upsertCompanyProfile,
} from "../services/settingsService.js";

/* ── helpers ────────────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  companyName: "",
  companyAddress: "",
  corporateAddress: "",
  state: "",
  country: "India",
  phone: "",
  email: "",
  website: "",
  gstNumber: "",
  panNumber: "",
  financialYear: "",
  currency: "INR",
};

const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

/* ── Image upload field ─────────────────────────────────────────────────────── */
const ImageUploadField = ({ id, label, currentSrc, onFileChange, onClear, optional = false }) => (
  <div className="flex flex-col gap-2">
    <label htmlFor={id} className="text-sm font-medium text-slate-300">
      {label}
      {optional && <span className="ml-1 text-xs text-slate-600">(optional)</span>}
    </label>

    {/* Preview */}
    {currentSrc ? (
      <div className="relative inline-block">
        <img
          src={currentSrc}
          alt={label}
          className="h-20 max-w-[200px] rounded-lg border border-white/[0.08] bg-white/[0.04] object-contain p-2"
        />
        <button
          type="button"
          onClick={onClear}
          className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full
                     bg-red-500/80 text-white hover:bg-red-500 transition-colors text-xs font-bold"
          title="Remove image"
        >
          ✕
        </button>
      </div>
    ) : (
      <div className="flex h-20 w-40 items-center justify-center rounded-lg border border-dashed border-white/[0.12]
                      bg-white/[0.02] text-xs text-slate-600">
        No image
      </div>
    )}

    {/* File input */}
    <label
      htmlFor={id}
      className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08]
                 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400 hover:bg-white/[0.07] transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      Choose Image
    </label>
    <input
      id={id}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/svg+xml"
      className="hidden"
      onChange={onFileChange}
    />
    <p className="text-[11px] text-slate-600">JPEG, PNG, WEBP or SVG · Max 2 MB</p>
  </div>
);

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
const CompanyProfileSettings = () => {
  const navigate = useNavigate();
  const [form, setForm]         = useState(EMPTY_FORM);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState({ message: "", type: "success" });

  // Image state: preview URL, file object, and clear flag
  const [logoPreview,  setLogoPreview]  = useState("");
  const [logoFile,     setLogoFile]     = useState(null);
  const [clearLogo,    setClearLogo]    = useState(false);
  const [sealPreview,  setSealPreview]  = useState("");
  const [sealFile,     setSealFile]     = useState(null);
  const [clearSeal,    setClearSeal]    = useState(false);

  /* ── Fetch on mount ──────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getCompanyProfile();
        if (res.success && res.data) {
          const d = res.data;
          setForm({
            companyName:      d.companyName      ?? "",
            companyAddress:   d.companyAddress   ?? "",
            corporateAddress: d.corporateAddress ?? "",
            state:            d.state            ?? "",
            country:          d.country          ?? "India",
            phone:            d.phone            ?? "",
            email:            d.email            ?? "",
            website:          d.website          ?? "",
            gstNumber:        d.gstNumber        ?? "",
            panNumber:        d.panNumber        ?? "",
            financialYear:    d.financialYear    ?? "",
            currency:         d.currency         ?? "INR",
          });
          if (d.companyLogo) setLogoPreview(d.companyLogo);
          if (d.companySeal) setSealPreview(d.companySeal);
        }
      } catch (err) {
        showToast("Failed to load company profile.", "error");
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

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setClearLogo(false);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSealChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSealFile(file);
    setClearSeal(false);
    setSealPreview(URL.createObjectURL(file));
  };

  const handleClearLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    setClearLogo(true);
  };

  const handleClearSeal = () => {
    setSealFile(null);
    setSealPreview("");
    setClearSeal(true);
  };

  /* ── Submit ──────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));

      if (logoFile)    formData.append("companyLogo", logoFile);
      if (clearLogo)   formData.append("clearCompanyLogo", "true");
      if (sealFile)    formData.append("companySeal", sealFile);
      if (clearSeal)   formData.append("clearCompanySeal", "true");

      const res = await upsertCompanyProfile(formData);
      if (res.success) {
        // Refresh previews from saved Base64 if no new local file
        if (!logoFile && res.data?.companyLogo) setLogoPreview(res.data.companyLogo);
        if (!sealFile && res.data?.companySeal) setSealPreview(res.data.companySeal);
        setLogoFile(null);
        setSealFile(null);
        setClearLogo(false);
        setClearSeal(false);
        showToast("Company profile saved successfully.", "success");
      } else {
        showToast(res.message || "Failed to save.", "error");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save company profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Field component ─────────────────────────────────────────── */
  const Field = ({ label, name, type = "text", placeholder = "", required = false, optional = false }) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-slate-300">
        {label}
        {optional && <span className="ml-1 text-xs text-slate-600">(optional)</span>}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5
                   text-sm text-slate-200 placeholder-slate-600
                   outline-none transition-colors
                   focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-0"
      />
    </div>
  );

  const TextArea = ({ label, name, placeholder = "", rows = 3, optional = false }) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-slate-300">
        {label}
        {optional && <span className="ml-1 text-xs text-slate-600">(optional)</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={form[name]}
        onChange={handleChange}
        placeholder={placeholder}
        className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5
                   text-sm text-slate-200 placeholder-slate-600
                   outline-none resize-none transition-colors
                   focus:border-indigo-500/50 focus:bg-white/[0.06]"
      />
    </div>
  );

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <Layout title="Company Profile">
      <Toast {...toast} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button onClick={() => navigate("/settings")} className="hover:text-slate-300 transition-colors">
          Settings
        </button>
        <span>/</span>
        <span className="text-slate-300">Company Profile</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">Company Profile</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            This information appears on all generated payslips and documents.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-indigo-500" />
          Loading…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

          {/* ── Company Details ── */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-600">
              Company Details
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Company Name" name="companyName" placeholder="e.g. JAIHIND AUTOTECH INDUSTRIES" required />
              </div>
              <div className="sm:col-span-2">
                <TextArea label="Factory / Registered Address" name="companyAddress" placeholder="Full factory or registered address" />
              </div>
              <div className="sm:col-span-2">
                <TextArea label="Corporate Address" name="corporateAddress" placeholder="Head-office address (if different)" optional />
              </div>
              <Field label="State" name="state" placeholder="e.g. Maharashtra" />
              <Field label="Country" name="country" placeholder="e.g. India" />
            </div>
          </section>

          {/* ── Contact Information ── */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-600">
              Contact Information
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Phone" name="phone" type="tel" placeholder="+91 99999 00000" />
              <Field label="Email" name="email" type="email" placeholder="hr@company.com" />
              <div className="sm:col-span-2">
                <Field label="Website" name="website" placeholder="https://www.company.com" optional />
              </div>
            </div>
          </section>

          {/* ── Tax & Compliance ── */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-600">
              Tax &amp; Compliance
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="GST Number" name="gstNumber" placeholder="e.g. 27AAACH1234A1Z5" optional />
              <Field label="PAN Number" name="panNumber" placeholder="e.g. AAACH1234A" optional />
            </div>
          </section>

          {/* ── Financial Settings ── */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-600">
              Financial Settings
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Financial Year" name="financialYear" placeholder="e.g. 2025-2026" />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="currency" className="text-sm font-medium text-slate-300">Currency</label>
                <select
                  id="currency"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="rounded-lg border border-white/[0.08] bg-[#0d1117] px-4 py-2.5
                             text-sm text-slate-200 outline-none transition-colors
                             focus:border-indigo-500/50"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* ── Logos & Images ── */}
          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-widest text-slate-600">
              Logos &amp; Images
            </h3>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <ImageUploadField
                id="company-logo-input"
                label="Company Logo"
                currentSrc={logoPreview}
                onFileChange={handleLogoChange}
                onClear={handleClearLogo}
              />
              <ImageUploadField
                id="company-seal-input"
                label="Company Seal"
                currentSrc={sealPreview}
                onFileChange={handleSealChange}
                onClear={handleClearSeal}
                optional
              />
            </div>
          </section>

          {/* ── Actions ── */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              id="save-company-profile-btn"
              className="flex items-center gap-2.5 rounded-xl bg-indigo-500 px-6 py-2.5
                         text-sm font-semibold text-white shadow-lg shadow-indigo-500/20
                         transition-all hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
              {saving ? "Saving…" : "Save Profile"}
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

export default CompanyProfileSettings;
