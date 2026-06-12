/**
 * @file Login.jsx
 * @description Admin login page — built with Tailwind CSS v4.
 */

import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { loginRequest } from "../api/authService.js";

const Login = () => {
  const navigate = useNavigate();

  // Already authenticated → bounce to dashboard
  if (localStorage.getItem("payroll_token")) {
    return <Navigate to="/" replace />;
  }

  const [formData, setFormData]         = useState({ username: "", password: "" });
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setError("");
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.password.trim()) {
      setError("Both username and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await loginRequest(formData);
      if (data.success && data.token) {
        localStorage.setItem("payroll_token", data.token);
        navigate("/", { replace: true });
      } else {
        setError(data.message || "Login failed. Please try again.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to reach the server. Check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    /* ── Full-page dark background ── */
    <div className="relative min-h-screen flex items-center justify-center bg-[#080b12] overflow-hidden px-4 py-8 font-[Inter,system-ui,sans-serif]">

      {/* ── Decorative gradient blobs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full
                   bg-[radial-gradient(circle,rgba(99,102,241,0.25)_0%,transparent_70%)]
                   animate-pulse"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 w-[380px] h-[380px] rounded-full
                   bg-[radial-gradient(circle,rgba(139,92,246,0.2)_0%,transparent_70%)]
                   animate-pulse"
        style={{ animationDuration: "3s", animationDelay: "1.5s" }}
      />

      {/* ── Glass card ── */}
      <div
        className="relative z-10 w-full max-w-[440px] rounded-2xl border border-white/10
                   bg-white/[0.04] backdrop-blur-2xl shadow-[0_25px_50px_rgba(0,0,0,0.5)]
                   px-10 py-11"
        style={{ animation: "slideUp 0.45s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* ── Brand ── */}
        <div className="flex items-center gap-3.5 mb-9">
          <div className="w-13 h-13 flex-shrink-0 rounded-[14px] flex items-center justify-center
                          bg-gradient-to-br from-indigo-500 to-violet-600
                          shadow-[0_8px_24px_rgba(99,102,241,0.4)]"
               style={{ width: 52, height: 52 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              <line x1="12" y1="12" x2="12" y2="16"/>
              <line x1="10" y1="14" x2="14" y2="14"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight leading-none">PayrollPro</h1>
            <p className="text-xs text-slate-500 mt-1">Payroll Management System</p>
          </div>
        </div>

        {/* ── Heading ── */}
        <h2 className="text-[26px] font-bold text-slate-100 tracking-tight mb-1.5">Welcome back</h2>
        <p className="text-sm text-slate-500 mb-7">Sign in to your admin account</p>

        {/* ── Error banner ── */}
        {error && (
          <div
            id="login-error"
            role="alert"
            className="flex items-center gap-2 rounded-[10px] border border-red-500/30
                       bg-red-500/10 px-3.5 py-3 text-[13.5px] text-red-300 mb-5
                       animate-[shakeIn_0.35s_ease]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ── Form ── */}
        <form id="login-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-[13px] font-medium text-slate-400">
              Username
            </label>
            <div className="relative flex items-center">
              <svg className="absolute left-3.5 text-slate-600 pointer-events-none" width="18" height="18"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
                aria-describedby={error ? "login-error" : undefined}
                className="w-full rounded-[10px] border border-white/10 bg-white/5 px-4 py-3
                           pl-10 text-[14.5px] text-slate-200 placeholder-slate-600 outline-none
                           transition-all duration-200
                           focus:border-indigo-500/60 focus:bg-indigo-500/[0.06] focus:ring-[3px] focus:ring-indigo-500/15
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-slate-400">
              Password
            </label>
            <div className="relative flex items-center">
              <svg className="absolute left-3.5 text-slate-600 pointer-events-none" width="18" height="18"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                className="w-full rounded-[10px] border border-white/10 bg-white/5 px-4 py-3
                           pl-10 pr-11 text-[14.5px] text-slate-200 placeholder-slate-600 outline-none
                           transition-all duration-200
                           focus:border-indigo-500/60 focus:bg-indigo-500/[0.06] focus:ring-[3px] focus:ring-indigo-500/15
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                id="toggle-password"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 flex items-center p-1 rounded-md text-slate-600
                           hover:text-slate-400 transition-colors"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            className="mt-1.5 flex w-full items-center justify-center gap-2.5 rounded-[10px] py-3.5
                       bg-gradient-to-r from-indigo-500 to-violet-600 font-semibold text-[15px] text-white
                       shadow-[0_4px_20px_rgba(99,102,241,0.35)]
                       transition-all duration-200 hover:opacity-90 hover:-translate-y-px
                       hover:shadow-[0_8px_28px_rgba(99,102,241,0.45)]
                       active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Signing in…
              </>
            ) : "Sign In"}
          </button>
        </form>

        {/* ── Footer note ── */}
        <p className="mt-6 text-center text-xs text-slate-700">🔒 Secured with JWT Authentication</p>
      </div>

      {/* ── Slide-up keyframe ── */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shakeIn {
          0%   { transform: translateX(-6px); }
          25%  { transform: translateX(6px); }
          50%  { transform: translateX(-3px); }
          75%  { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;
