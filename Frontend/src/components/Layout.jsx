/**
 * @file Layout.jsx
 * @description Reusable sidebar + page layout shell.
 *              All protected pages wrap their content with this component
 *              to get the sidebar, top navbar, and consistent dark chrome.
 */

import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

const NAV_ITEMS = [
  {
    to: "/",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: "/employees",
    label: "Employees",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: "/departments",
    label: "Departments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
  },
  {
    to: "/payroll/generate",
    label: "Generate Payroll",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    ),
  },
  {
    to: "/payroll/records",
    label: "Payroll Records",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    to: "/payroll/history",
    label: "Payroll History",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: "/reports",
    label: "Reports",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];


const Layout = ({ children, title = "Dashboard" }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("payroll_token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-[#080b12] font-[Inter,system-ui,sans-serif] text-slate-200">

      {/* ══ SIDEBAR ══════════════════════════════════════════════════════════ */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-[100] flex w-60 flex-col
          border-r border-white/[0.06] bg-[#0d1117]
          transition-transform duration-300 ease-in-out
          md:static md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-6">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center
                          rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <line x1="12" y1="12" x2="12" y2="16" />
              <line x1="10" y1="14" x2="14" y2="14" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-slate-100">PayrollPro</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`
                  flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-all duration-150
                  ${active
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"}
                `}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mx-3 mb-6 flex items-center gap-2.5 rounded-lg px-3 py-2.5
                     text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 text-left"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm md:hidden"
        />
      )}

      {/* ══ MAIN ════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top navbar */}
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4
                           border-b border-white/[0.06] bg-[#0d1117] px-6">
          <button
            aria-label="Toggle sidebar"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center rounded-lg p-1.5 text-slate-500
                       transition-colors hover:bg-white/[0.06] hover:text-slate-300 md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6"  x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <h1 className="flex-1 text-lg font-semibold tracking-tight text-slate-100">{title}</h1>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full
                              bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                A
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-semibold text-slate-200">Admin</span>
                <span className="text-[11px] text-slate-500">Super Admin</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/25
                         bg-red-500/10 px-3.5 py-2 text-[13px] font-medium text-red-400
                         transition-all hover:bg-red-500/18 hover:border-red-500/40 whitespace-nowrap"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex flex-col gap-6 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
