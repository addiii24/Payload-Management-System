/**
 * @file App.jsx
 * @description Root React component — sets up all application routes.
 *
 *  Route tree:
 *    /login                     → <Login />            (public)
 *    /                          → <Dashboard />        (protected)
 *    /employees                 → <Employees />        (protected)
 *    /employees/add             → <AddEmployee />      (protected)
 *    /employees/:id/edit        → <EditEmployee />     (protected)
 *    /departments               → <Departments />      (protected)
 *    /departments/:id/policy    → <DepartmentPolicy /> (protected)
 *    /payroll/generate          → <GeneratePayroll />  (protected)
 *    /payroll/records           → <PayrollRecords />   (protected)
 *    *                          → redirect to /login
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";

import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Eagerly loaded (always needed immediately)
import Login from "./pages/Login.jsx";

// Lazily loaded (only fetched when user navigates there)
const Dashboard        = lazy(() => import("./pages/Dashboard.jsx"));
const Employees        = lazy(() => import("./pages/Employees.jsx"));
const AddEmployee      = lazy(() => import("./pages/AddEmployee.jsx"));
const EditEmployee     = lazy(() => import("./pages/EditEmployee.jsx"));
const Departments      = lazy(() => import("./pages/Departments.jsx"));
const DepartmentPolicy = lazy(() => import("./pages/DepartmentPolicy.jsx"));
const GeneratePayroll  = lazy(() => import("./pages/GeneratePayroll.jsx"));
const PayrollRecords   = lazy(() => import("./pages/PayrollRecords.jsx"));
const PayrollHistory   = lazy(() => import("./pages/PayrollHistory.jsx"));

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
            <Route path="/departments"             element={<Departments />} />
            <Route path="/departments/:id/policy"  element={<DepartmentPolicy />} />
            <Route path="/payroll/generate"        element={<GeneratePayroll />} />
            <Route path="/payroll/records"         element={<PayrollRecords />} />
            <Route path="/payroll/history"         element={<PayrollHistory />} />
          </Route>

          {/* ── Catch-all ─────────────────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
