/**
 * @file Dashboard.jsx
 * @description Main dashboard page using the shared Layout component.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout.jsx";
import api from "../api/api.js";

const INR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n ?? 0);

const QUICK_ACTIONS = [
  { id: "qa-employees", emoji: "👥", label: "Manage Employees",  desc: "Add, edit, or remove staff records",  to: "/employees" },
  { id: "qa-payroll",   emoji: "💰", label: "Run Payroll",        desc: "Process monthly salary disbursement", to: "/payroll/generate" },
  { id: "qa-payslips",  emoji: "📄", label: "Generate Payslips",  desc: "Create and download salary slips",     to: "/payroll/history" },
  { id: "qa-reports",   emoji: "📊", label: "View Reports",       desc: "Analytics and financial summaries",    to: "/payroll/records" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: "—",
    totalDepartments: "—",
    monthlyPayroll: "—",
    payslipsGenerated: "—",
  });

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/api/dashboard/stats");
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      id: "stat-employees", label: "Total Employees", value: stats.totalEmployees,
      iconBg: "bg-indigo-500/15", iconColor: "text-indigo-400",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      id: "stat-payroll", label: "Monthly Payroll", value: typeof stats.monthlyPayroll === "number" ? INR(stats.monthlyPayroll) : stats.monthlyPayroll,
      iconBg: "bg-violet-500/15", iconColor: "text-violet-400",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    },
    {
      id: "stat-departments", label: "Departments", value: stats.totalDepartments,
      iconBg: "bg-purple-500/15", iconColor: "text-purple-400",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
    },
    {
      id: "stat-payslips", label: "Payslips Generated", value: stats.payslipsGenerated,
      iconBg: "bg-sky-500/15", iconColor: "text-sky-400",
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    },
  ];

  return (
    <Layout title="Dashboard">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Welcome back, Sachin Sharma 👋</h2>
          <p className="mt-1 text-sm text-slate-500">Here's an overview of your payroll system.</p>
        </div>
        <span className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-[13px] text-slate-500">
          {today}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, i) => (
          <div
            key={stat.id}
            id={stat.id}
            className="flex items-center gap-4 rounded-2xl border border-white/[0.07]
                       bg-white/[0.03] p-5 transition-all duration-200
                       hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.3)]"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${stat.iconBg} ${stat.iconColor}`}>
              {stat.icon}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              {loading ? (
                <div className="h-6 w-20 animate-pulse rounded bg-white/10 mt-1" />
              ) : (
                <span className="text-[26px] font-bold leading-none text-slate-100">{stat.value}</span>
              )}
              <span className="truncate text-[12.5px] text-slate-500">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="mb-3 text-[11.5px] font-semibold uppercase tracking-widest text-slate-600">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              id={action.id}
              type="button"
              onClick={() => action.to && navigate(action.to)}
              className="group flex items-center gap-4 rounded-xl border border-white/[0.07]
                         bg-white/[0.03] px-5 py-4 text-left
                         transition-all duration-150
                         hover:border-indigo-500/25 hover:bg-indigo-500/[0.07] hover:translate-x-1"
            >
              <span className="text-2xl leading-none">{action.emoji}</span>
              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <span className="text-[14px] font-semibold text-slate-200">{action.label}</span>
                <span className="text-[12.5px] text-slate-500">{action.desc}</span>
              </div>
              <svg className="flex-shrink-0 text-slate-700 transition-colors group-hover:text-indigo-500"
                   width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/15
                      bg-emerald-500/[0.05] px-4 py-3.5 text-[13px] text-slate-500">
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        System is running normally. All services operational.
      </div>
    </Layout>
  );
};

export default Dashboard;
