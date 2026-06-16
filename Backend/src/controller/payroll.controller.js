/**
 * @file payroll.controller.js
 * @description HTTP controller for the Payroll resource.
 *
 *  Endpoints:
 *
 *    POST  /api/payroll/generate
 *      Generate payroll for ALL active employees for a given month/year.
 *      Already-processed employees are skipped (or force-regenerated with ?force=true).
 *
 *    POST  /api/payroll/generate/:employeeId
 *      Generate payroll for a SINGLE employee for a given month/year.
 *
 *    GET   /api/payroll?month=&year=
 *      List all payroll records for a pay period (with optional dept filter).
 *
 *    GET   /api/payroll/:id
 *      Fetch one payroll record by its MongoDB _id.
 *
 *    GET   /api/payroll/employee/:employeeId
 *      Full payroll history for one employee.
 *
 *    DELETE /api/payroll/:id
 *      Delete (void) a single payroll record.
 */

import mongoose from "mongoose";
import Employee from "../model/employee.model.js";
import Payroll  from "../model/payroll.model.js";
import { calculatePayroll, calculateBulkPayroll } from "../service/payroll.service.js";
import { sendSuccess, sendError } from "../util/apiError.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ── Validate month / year from request body or query ── */
const parseMonthYear = (source) => {
  const month = parseInt(source.month, 10);
  const year  = parseInt(source.year,  10);
  if (!month || month < 1 || month > 12)   return { error: "month must be an integer between 1 and 12." };
  if (!year  || year  < 2000 || year > 2100) return { error: "year must be a 4-digit year (2000–2100)." };
  return { month, year };
};

/* ══════════════════════════════════════════════════════════════
   GENERATE — ALL EMPLOYEES
   POST /api/payroll/generate
   Body: { month, year }
   Query: ?force=true  →  re-generate even if already processed
══════════════════════════════════════════════════════════════ */
export const generateBulkPayroll = async (req, res) => {
  try {
    const { month, year, error: parseErr } = parseMonthYear(req.body);
    if (parseErr) return sendError(res, 400, parseErr);

    const force = req.query.force === "true";

    /* 1. Load all employees */
    const employees = await Employee.find().sort({ employeeId: 1 });
    if (employees.length === 0) {
      return sendError(res, 404, "No employees found in the system.");
    }

    /* 2. If NOT force-mode, skip employees already processed */
    let targets = employees;
    if (!force) {
      const existing = await Payroll.find({ month, year }).select("employeeId");
      const processed = new Set(existing.map((p) => p.employeeId.toString()));
      targets = employees.filter((e) => !processed.has(e._id.toString()));
    }

    if (targets.length === 0) {
      return sendSuccess(res, 200, "All employees are already processed for this period.", {
        month, year, generated: 0, skipped: employees.length, errors: [],
      });
    }

    /* 3. Calculate payroll for each target */
    const { results, errors } = await calculateBulkPayroll(targets, month, year);

    /* 4. Persist results — upsert so force-mode replaces existing records */
    const saved    = [];
    const saveErrs = [];

    for (const data of results) {
      try {
        const record = await Payroll.findOneAndUpdate(
          { employeeId: data.employeeId, month, year },
          { $set: { ...data, status: force ? "revised" : "processed" } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        saved.push(record);
      } catch (err) {
        saveErrs.push({
          employeeCode: data.employeeCode,
          name:         data.employeeName,
          error:        err.code === 11000 ? "Duplicate record (already exists)." : err.message,
        });
      }
    }

    const allErrors = [...errors, ...saveErrs];

    return sendSuccess(res, 201, "Payroll generation complete.", {
      month,
      year,
      generated: saved.length,
      skipped:   employees.length - targets.length,
      failed:    allErrors.length,
      errors:    allErrors,
      payrolls:  saved,
    });
  } catch (err) {
    console.error("[generateBulkPayroll]", err);
    return sendError(res, 500, "Failed to generate payroll. Please try again.");
  }
};

/* ══════════════════════════════════════════════════════════════
   GENERATE — SINGLE EMPLOYEE
   POST /api/payroll/generate/:employeeId
   Body: { month, year }
   :employeeId = MongoDB _id of the employee
══════════════════════════════════════════════════════════════ */
export const generateSinglePayroll = async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!isValidId(employeeId)) return sendError(res, 400, "Invalid employee ID.");

    const { month, year, error: parseErr } = parseMonthYear(req.body);
    if (parseErr) return sendError(res, 400, parseErr);

    const force = req.query.force === "true";

    /* 1. Load employee */
    const employee = await Employee.findById(employeeId);
    if (!employee) return sendError(res, 404, "Employee not found.");

    /* 2. Check if already processed */
    if (!force) {
      const existing = await Payroll.findOne({ employeeId, month, year });
      if (existing) {
        return sendError(
          res, 409,
          `Payroll for "${employee.name}" (${employee.employeeId}) is already ` +
          `processed for ${month}/${year}. Use ?force=true to regenerate.`
        );
      }
    }

    /* 3. Calculate */
    const data = await calculatePayroll(employee, month, year);
    if (force) data.status = "revised";

    /* 4. Upsert */
    const record = await Payroll.findOneAndUpdate(
      { employeeId, month, year },
      { $set: data },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, 201, "Payroll generated successfully.", record);
  } catch (err) {
    console.error("[generateSinglePayroll]", err);
    // Surface domain errors (e.g. department not found) as 422
    if (err.message?.includes("not found") || err.message?.includes("inactive")) {
      return sendError(res, 422, err.message);
    }
    return sendError(res, 500, "Failed to generate payroll. Please try again.");
  }
};

/* ══════════════════════════════════════════════════════════════
   LIST PAYROLLS FOR A PERIOD
   GET /api/payroll?month=6&year=2026&department=IT
══════════════════════════════════════════════════════════════ */
export const getPayrollByPeriod = async (req, res) => {
  try {
    const { month, year, error: parseErr } = parseMonthYear(req.query);
    if (parseErr) return sendError(res, 400, parseErr);

    const filter = { month, year };
    if (req.query.department) {
      filter.department = { $regex: req.query.department.trim(), $options: "i" };
    }

    const { page, limit, search } = req.query;
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { employeeName: searchRegex },
        { employeeCode: searchRegex }
      ];
    }

    // 1. Fetch ALL matching payrolls to calculate summary and total count
    const allMatching = await Payroll.find(filter);
    const total = allMatching.length;

    /* Aggregate summary over ALL matching records */
    const summary = allMatching.reduce(
      (acc, p) => {
        acc.totalGross     += p.grossSalary;
        acc.totalDeduction += p.totalDeduction;
        acc.totalNet       += p.netSalary;
        return acc;
      },
      { totalGross: 0, totalDeduction: 0, totalNet: 0 }
    );

    // Round summary fields
    Object.keys(summary).forEach((k) => {
      summary[k] = Math.round(summary[k] * 100) / 100;
    });

    // 2. Paginate payrolls for the table view
    const pageVal = Math.max(parseInt(page, 10) || 1, 1);
    const limitVal = Math.min(parseInt(limit, 10) || 10, 100);
    const skipVal = (pageVal - 1) * limitVal;

    const payrolls = await Payroll.find(filter)
      .sort({ employeeCode: 1 })
      .skip(skipVal)
      .limit(limitVal);

    // Return the response, keeping data structure compatible with frontend expectations
    return res.status(200).json({
      success: true,
      message: "Payroll records fetched.",
      data: {
        month,
        year,
        count: total,
        summary,
        payrolls,
        pagination: {
          total,
          page: pageVal,
          limit: limitVal,
          totalPages: Math.ceil(total / limitVal)
        }
      }
    });
  } catch (err) {
    console.error("[getPayrollByPeriod]", err);
    return sendError(res, 500, "Failed to fetch payroll records.");
  }
};

/* ══════════════════════════════════════════════════════════════
   GET SINGLE PAYROLL RECORD
   GET /api/payroll/:id
══════════════════════════════════════════════════════════════ */
export const getPayrollById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid payroll record ID.");

    const record = await Payroll.findById(id).populate("employeeId", "employeeId name department designation basicSalary pfNumber esiNumber");
    if (!record) return sendError(res, 404, "Payroll record not found.");

    return sendSuccess(res, 200, "Payroll record fetched.", record);
  } catch (err) {
    console.error("[getPayrollById]", err);
    return sendError(res, 500, "Failed to fetch payroll record.");
  }
};

/* ══════════════════════════════════════════════════════════════
   PAYROLL HISTORY FOR AN EMPLOYEE
   GET /api/payroll/employee/:employeeId
══════════════════════════════════════════════════════════════ */
export const getEmployeePayrollHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!isValidId(employeeId)) return sendError(res, 400, "Invalid employee ID.");

    const employee = await Employee.findById(employeeId).select("employeeId name department designation");
    if (!employee) return sendError(res, 404, "Employee not found.");

    const history = await Payroll
      .find({ employeeId })
      .sort({ year: -1, month: -1 });   // newest first

    return sendSuccess(res, 200, "Employee payroll history fetched.", {
      employee,
      count: history.length,
      history,
    });
  } catch (err) {
    console.error("[getEmployeePayrollHistory]", err);
    return sendError(res, 500, "Failed to fetch payroll history.");
  }
};

/* ══════════════════════════════════════════════════════════════
   DELETE (VOID) A PAYROLL RECORD
   DELETE /api/payroll/:id
══════════════════════════════════════════════════════════════ */
export const deletePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid payroll record ID.");

    const deleted = await Payroll.findByIdAndDelete(id);
    if (!deleted) return sendError(res, 404, "Payroll record not found.");

    return sendSuccess(res, 200,
      `Payroll record for "${deleted.employeeName}" (${deleted.month}/${deleted.year}) deleted.`,
      { deleted }
    );
  } catch (err) {
    console.error("[deletePayroll]", err);
    return sendError(res, 500, "Failed to delete payroll record.");
  }
};
