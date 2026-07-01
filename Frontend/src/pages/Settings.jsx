/**
 * @file Settings.jsx
 * @description Settings module landing page.
 *              Displays a card grid linking to each settings sub-section.
 *              Placeholder cards are shown for future modules.
 */

import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";

/* ── Card definitions ───────────────────────────────────────────────────────── */
const SETTINGS_CARDS = [
  // ── Active (navigable) ────────────────────────────────────────────────────
  {
    id: "settings-company-profile",
    to: "/settings/company-profile",
    label: "Company Profile",
    description: "Company name, address, GST, PAN, logo, seal and financial details.",
    status: "active",
    color: "indigo",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    id: "settings-branding",
    to: "/settings/branding",
    label: "Branding",
    description: "Primary logo, dark logo, watermark and brand theme colour.",
    status: "active",
    color: "violet",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },
  {
    id: "settings-authorized-signature",
    to: "/settings/authorized-signature",
    label: "Authorized Signature",
    description: "Authority name, designation, signature image and payslip footer message.",
    status: "active",
    color: "sky",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },

  // ── Placeholders (coming soon) ────────────────────────────────────────────
  {
    id: "settings-department-policies",
    to: null,
    label: "Department Policies",
    description: "Configure deductions and overtime rules per department.",
    status: "coming-soon",
    color: "slate",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: "settings-payroll-policies",
    to: null,
    label: "Payroll Policies",
    description: "Define payroll components, salary heads and calculation rules.",
    status: "coming-soon",
    color: "slate",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "settings-leave-policies",
    to: null,
    label: "Leave Policies",
    description: "Set leave types, accrual rules and carry-forward limits.",
    status: "coming-soon",
    color: "slate",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: "settings-holiday-calendar",
    to: null,
    label: "Holiday Calendar",
    description: "Manage national and company-declared holidays by year.",
    status: "coming-soon",
    color: "slate",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="15" x2="16" y2="15" />
      </svg>
    ),
  },
  {
    id: "settings-shift-policies",
    to: null,
    label: "Shift Policies",
    description: "Configure shift timings, allowances and eligibility criteria.",
    status: "coming-soon",
    color: "slate",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "settings-employee-benefits",
    to: null,
    label: "Employee Benefits",
    description: "Define benefit types — canteen, transport, hostel, uniform and more.",
    status: "coming-soon",
    color: "slate",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
];

/* ── Color maps ─────────────────────────────────────────────────────────────── */
const COLOR_BG    = { indigo: "bg-indigo-500/15", violet: "bg-violet-500/15", sky: "bg-sky-500/15", slate: "bg-slate-700/30" };
const COLOR_ICON  = { indigo: "text-indigo-400",  violet: "text-violet-400",  sky: "text-sky-400",  slate: "text-slate-500" };
const COLOR_BADGE = { indigo: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
                      violet: "bg-violet-500/15 text-violet-400 border-violet-500/20",
                      sky:    "bg-sky-500/15 text-sky-400 border-sky-500/20",
                      slate:  "bg-slate-700/40 text-slate-500 border-slate-600/30" };
const BORDER_HOVER = { indigo: "hover:border-indigo-500/30", violet: "hover:border-violet-500/30", sky: "hover:border-sky-500/30", slate: "" };

/* ── Component ──────────────────────────────────────────────────────────────── */
const Settings = () => {
  const navigate = useNavigate();

  const handleCardClick = (card) => {
    if (card.status === "active" && card.to) {
      navigate(card.to);
    }
  };

  return (
    <Layout title="Settings">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configuration centre for your payroll system — company, branding, signatures and policies.
        </p>
      </div>

      {/* Section label */}
      <div>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-600">
          All Sections
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SETTINGS_CARDS.map((card) => {
            const isActive = card.status === "active";
            return (
              <button
                key={card.id}
                id={card.id}
                type="button"
                onClick={() => handleCardClick(card)}
                disabled={!isActive}
                className={`
                  group relative flex flex-col gap-4 rounded-2xl border border-white/[0.07]
                  bg-white/[0.03] p-6 text-left
                  transition-all duration-200
                  ${isActive
                    ? `cursor-pointer ${BORDER_HOVER[card.color]} hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]`
                    : "cursor-default opacity-60"}
                `}
              >
                {/* Status badge */}
                {card.status === "coming-soon" && (
                  <span className={`absolute right-4 top-4 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${COLOR_BADGE[card.color]}`}>
                    Coming Soon
                  </span>
                )}
                {card.status === "active" && (
                  <span className={`absolute right-4 top-4 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${COLOR_BADGE[card.color]}`}>
                    Active
                  </span>
                )}

                {/* Icon */}
                <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${COLOR_BG[card.color]} ${COLOR_ICON[card.color]}`}>
                  {card.icon}
                </div>

                {/* Text */}
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[15px] font-semibold text-slate-100 group-hover:text-slate-50">
                    {card.label}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-slate-500">
                    {card.description}
                  </span>
                </div>

                {/* Arrow (active only) */}
                {isActive && (
                  <svg
                    className={`mt-auto self-end flex-shrink-0 text-slate-700 transition-colors ${COLOR_ICON[card.color].replace("text-", "group-hover:text-")}`}
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
