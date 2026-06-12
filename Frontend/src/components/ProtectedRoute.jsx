/**
 * @file ProtectedRoute.jsx
 * @description Higher-order route guard component.
 *
 *  Usage:
 *    <Route element={<ProtectedRoute />}>
 *      <Route path="/" element={<Dashboard />} />
 *    </Route>
 *
 *  Behavior:
 *    • Token present in localStorage  →  render child routes
 *    • Token missing                  →  redirect to /login
 */

import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const token = localStorage.getItem("payroll_token");

  // If no token, redirect to login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Token exists — render the wrapped child route
  return <Outlet />;
};

export default ProtectedRoute;
