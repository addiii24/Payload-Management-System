/**
 * @file App.jsx
 * @description Root React component — sets up all application routes.
 *
 *  Route tree:
 *    /login                    → <Login />         (public)
 *    /                         → <Dashboard />     (protected)
 *    /employees                → <Employees />     (protected)
 *    /employees/add            → <AddEmployee />   (protected)
 *    /employees/:id/edit       → <EditEmployee />  (protected)
 *    *                         → redirect to /login
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Eagerly loaded (always needed immediately)
import Login from "./pages/Login.jsx";

// Lazily loaded (only fetched when user navigates there)
const Dashboard   = lazy(() => import("./pages/Dashboard.jsx"));
const Employees   = lazy(() => import("./pages/Employees.jsx"));
const AddEmployee = lazy(() => import("./pages/AddEmployee.jsx"));
const EditEmployee = lazy(() => import("./pages/EditEmployee.jsx"));

/* ── Full-page loading fallback shown during chunk download ── */
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#080b12]">
    <div className="flex flex-col items-center gap-4 text-slate-500">
      <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-indigo-500" />
      <span className="text-sm">Loading…</span>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ── Public ───────────────────────────────── */}
          <Route path="/login" element={<Login />} />

          {/* ── Protected ────────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/"                        element={<Dashboard />} />
            <Route path="/employees"               element={<Employees />} />
            <Route path="/employees/add"           element={<AddEmployee />} />
            <Route path="/employees/:id/edit"      element={<EditEmployee />} />
          </Route>

          {/* ── Catch-all ─────────────────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
