/**
 * @file payslip.route.js
 * @description Express router for payslip generation endpoints.
 *
 *  Base path (mounted in App.js): /api/payslips
 *
 *  Routes:
 *    GET /api/payslips/bulk-download?month=&year=  → bulkDownloadPayslips
 *    GET /api/payslips/:payrollId/download          → downloadPayslip
 *
 *  IMPORTANT: /bulk-download must be declared BEFORE /:payrollId
 *  to prevent Express matching "bulk-download" as a payrollId param.
 */

import express from "express";
import {
  downloadPayslip,
  bulkDownloadPayslips,
} from "../controller/payslip.controller.js";

const router = express.Router();

// ── Static path first ────────────────────────────────────────────────────────
router.get("/bulk-download", bulkDownloadPayslips);

// ── Dynamic path after ───────────────────────────────────────────────────────
router.get("/:payrollId/download", downloadPayslip);

export default router;
