/**
 * @file payroll.route.js
 * @description Express Router for the Payroll resource.
 *
 *  Base path (mounted in App.js): /api/payroll
 *
 *  Generation:
 *    POST   /api/payroll/generate                      → generateBulkPayroll
 *    POST   /api/payroll/generate/:employeeId          → generateSinglePayroll
 *
 *  Query:
 *    GET    /api/payroll?month=&year=[&department=]    → getPayrollByPeriod
 *    GET    /api/payroll/employee/:employeeId           → getEmployeePayrollHistory
 *    GET    /api/payroll/:id                           → getPayrollById
 *
 *  Mutation:
 *    DELETE /api/payroll/:id                           → deletePayroll
 *
 *  Route ordering note:
 *    /generate  and  /employee/:employeeId  must be declared BEFORE  /:id
 *    to prevent Express from treating "generate" or "employee" as an :id param.
 */

import express from "express";
import {
  generateBulkPayroll,
  generateSinglePayroll,
  getPayrollByPeriod,
  getPayrollById,
  getEmployeePayrollHistory,
  deletePayroll,
} from "../controller/payroll.controller.js";

const router = express.Router();

// ── Generation ───────────────────────────────────────────────────────────────
router.post("/generate",              generateBulkPayroll);
router.post("/generate/:employeeId",  generateSinglePayroll);

// ── Employee history (specific path before /:id) ─────────────────────────────
router.get("/employee/:employeeId",   getEmployeePayrollHistory);

// ── Period listing & single record ───────────────────────────────────────────
router.get("/",   getPayrollByPeriod);
router.get("/:id", getPayrollById);

// ── Delete / void ────────────────────────────────────────────────────────────
router.delete("/:id", deletePayroll);

export default router;
