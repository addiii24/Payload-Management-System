/**
 * @file app.js
 * @description Express application bootstrap.
 *
 *  Sets up global middleware and mounts feature routers.
 *  The HTTP server is created separately in server.js.
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// ─── Feature Routers ──────────────────────────────────────────────────────────
import authRouter            from "./route/auth.route.js";
import employeeRouter        from "./route/employee.route.js";
import departmentRouter      from "./route/department.route.js";
import payrollRouter         from "./route/payroll.route.js";
import payslipRouter         from "./route/payslip.route.js";
import shiftRouter           from "./route/shift.route.js";
import shiftAttendanceRouter from "./route/shiftAttendance.route.js";
import overtimeRouter        from "./route/overtime.route.js";
import dashboardRouter       from "./route/dashboard.route.js";
import attendanceRouter      from "./route/attendance.route.js";


// ─────────────────────────────────────────────
//  App Initialisation
// ─────────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────────
//  Global Middleware
// ─────────────────────────────────────────────

/**
 * CORS – allow all origins for development.
 * In production, restrict `origin` to your frontend domain.
 */
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);

/** Parse incoming JSON request bodies */
app.use(express.json());

/** Parse URL-encoded form data */
app.use(express.urlencoded({ extended: true }));

/** Parse cookies (needed for future session / auth work) */
app.use(cookieParser());

// ─────────────────────────────────────────────
//  API Routes
// ─────────────────────────────────────────────

/**
 * Health-check endpoint – useful for load-balancers and CI pipelines.
 * GET /api/health  →  { success: true, message: "Server is healthy" }
 */
app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy." });
});

/** Auth (login / verify)  →  /api/auth */
app.use("/api/auth", authRouter);

/** Employee CRUD  →  /api/employees */
app.use("/api/employees", employeeRouter);

/** Department CRUD + Policy  →  /api/departments */
app.use("/api/departments", departmentRouter);

/** Payroll Engine  →  /api/payroll */
app.use("/api/payroll", payrollRouter);

/** Payslip PDF generation  →  /api/payslips */
app.use("/api/payslips", payslipRouter);

/** Shift master CRUD  →  /api/shifts */
app.use("/api/shifts", shiftRouter);

/** Shift attendance CRUD  →  /api/shift-attendance */
app.use("/api/shift-attendance", shiftAttendanceRouter);

/** Overtime CRUD  →  /api/overtime */
app.use("/api/overtime", overtimeRouter);

/** Monthly Attendance CRUD  →  /api/attendance */
app.use("/api/attendance", attendanceRouter);

/** Dashboard Stats  →  /api/dashboard */
app.use("/api/dashboard", dashboardRouter);



// ─────────────────────────────────────────────
//  Global Error Handler  (must be last middleware)
// ─────────────────────────────────────────────

/**
 * Catch-all for unmatched routes.
 */
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

/**
 * Central error-handling middleware.
 * Any error passed via next(err) in a controller will land here.
 */
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[GlobalErrorHandler]", err);
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error.",
  });
});

export default app;