/**
 * @file overtime.controller.js
 * @description CRUD controller for OvertimeRecord.
 *
 *  POST  /api/overtime           — Upsert (creates or updates) an OT record
 *  GET   /api/overtime           — List records, filterable by month/year/employeeId
 *  PUT   /api/overtime/:id       — Update hours / otType / remarks; recalculates totalAmount
 *  DELETE /api/overtime/:id      — Hard delete
 *
 *  Business rules:
 *    - ratePerHour is fetched at POST time from employee's DepartmentPolicy.otRates[otType]
 *    - If policy has no otRates, rate defaults to 0 (no crash)
 *    - On PUT, ratePerHour is recalculated from current policy (new type may have different rate)
 *    - totalAmount = hours × ratePerHour (rounded to 2 dp)
 *    - POST uses upsert on (employeeId, month, year, otType) — re-submitting updates the record
 */

import mongoose from "mongoose";
import OvertimeRecord  from "../model/overtimeRecord.model.js";
import Employee        from "../model/employee.model.js";
import Department      from "../model/department.model.js";
import DepartmentPolicy from "../model/departmentPolicy.model.js";
import { OT_TYPES }   from "../model/overtimeRecord.model.js";
import { sendSuccess, sendError, isDuplicateKeyError, duplicateKeyMessage } from "../util/apiError.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const round2    = (n) => Math.round(n * 100) / 100;

/* ── Human-readable OT type labels ── */
const OT_LABELS = {
  dailyOT:     "Daily OT",
  weeklyOffOT: "Weekly Off OT",
  holidayOT:   "Holiday OT",
};

/* ── Fetch OT rate from department policy ── */
const getOTRate = async (employee, otType) => {
  try {
    const dept = await Department.findOne({
      departmentName: { $regex: `^${employee.department.trim()}$`, $options: "i" },
      isActive: true,
    });
    if (!dept) return 0;

    const policy = await DepartmentPolicy.findOne({ departmentId: dept._id });
    return policy?.otRates?.[otType] ?? 0;
  } catch {
    return 0;
  }
};

/* ══════════════════════════════════════════════════════════════
   CREATE / UPSERT
   POST /api/overtime
   Body: { employeeId, month, year, otType, hours, remarks? }
══════════════════════════════════════════════════════════════ */
export const upsertOT = async (req, res) => {
  try {
    const { employeeId, month, year, otType, hours, remarks } = req.body;

    if (!isValidId(employeeId)) return sendError(res, 400, "Invalid employee ID.");

    const m = parseInt(month, 10);
    const y = parseInt(year,  10);
    if (!m || m < 1 || m > 12)        return sendError(res, 400, "month must be 1–12.");
    if (!y || y < 2000 || y > 2100)   return sendError(res, 400, "year must be a 4-digit year.");
    if (!OT_TYPES.includes(otType))    return sendError(res, 400, `otType must be one of: ${OT_TYPES.join(", ")}.`);
    if (hours === undefined || isNaN(Number(hours))) return sendError(res, 400, "hours is required and must be a number.");
    const h = Number(hours);
    if (h < 0) return sendError(res, 400, "hours cannot be negative.");

    const employee = await Employee.findById(employeeId).select("name employeeId department");
    if (!employee) return sendError(res, 404, "Employee not found.");

    /* Fetch rate from policy — graceful 0 if not configured */
    const ratePerHour = await getOTRate(employee, otType);
    const totalAmount = round2(h * ratePerHour);

    const record = await OvertimeRecord.findOneAndUpdate(
      { employeeId, month: m, year: y, otType },
      { $set: { hours: h, ratePerHour, totalAmount, remarks: (remarks ?? "").trim() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, 201, "OT record saved.", {
      ...record.toObject(),
      employeeName: employee.name,
      employeeCode: employee.employeeId,
      otLabel:      OT_LABELS[otType],
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) return sendError(res, 409, duplicateKeyMessage(err));
    console.error("[upsertOT]", err);
    return sendError(res, 500, "Failed to save OT record.");
  }
};

/* ══════════════════════════════════════════════════════════════
   LIST  GET /api/overtime?month=&year=&employeeId=
══════════════════════════════════════════════════════════════ */
export const getOTRecords = async (req, res) => {
  try {
    const filter = {};
    const { month, year, employeeId } = req.query;

    if (employeeId) {
      if (!isValidId(employeeId)) return sendError(res, 400, "Invalid employee ID.");
      filter.employeeId = employeeId;
    }
    if (month) {
      const m = parseInt(month, 10);
      if (m < 1 || m > 12) return sendError(res, 400, "month must be 1–12.");
      filter.month = m;
    }
    if (year) {
      const y = parseInt(year, 10);
      if (y < 2000 || y > 2100) return sendError(res, 400, "year must be a 4-digit year.");
      filter.year = y;
    }

    const records = await OvertimeRecord.find(filter)
      .populate("employeeId", "name employeeId department")
      .sort({ year: -1, month: -1, createdAt: -1 });

    const enriched = records.map((r) => ({
      ...r.toObject(),
      otLabel: OT_LABELS[r.otType] ?? r.otType,
    }));

    /* Monthly per-employee summary */
    const employeeTotals = {};
    enriched.forEach((r) => {
      const key = r.employeeId?._id?.toString() ?? r.employeeId?.toString();
      if (!employeeTotals[key]) {
        employeeTotals[key] = {
          employeeId:   r.employeeId,
          totalAmount:  0,
          totalHours:   0,
        };
      }
      employeeTotals[key].totalAmount = round2(employeeTotals[key].totalAmount + r.totalAmount);
      employeeTotals[key].totalHours  = round2(employeeTotals[key].totalHours  + r.hours);
    });

    return sendSuccess(res, 200, "OT records fetched.", {
      total: enriched.length,
      records: enriched,
      employeeTotals: Object.values(employeeTotals),
    });
  } catch (err) {
    console.error("[getOTRecords]", err);
    return sendError(res, 500, "Failed to fetch OT records.");
  }
};

/* ══════════════════════════════════════════════════════════════
   UPDATE  PUT /api/overtime/:id
   Allows changing: hours, otType, remarks
   Recalculates ratePerHour from current policy and recomputes totalAmount.
══════════════════════════════════════════════════════════════ */
export const updateOT = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid OT record ID.");

    const existing = await OvertimeRecord.findById(id)
      .populate("employeeId", "name employeeId department");
    if (!existing) return sendError(res, 404, "OT record not found.");

    const { hours, otType, remarks } = req.body;
    const update = {};

    const newOtType = otType ?? existing.otType;
    if (otType !== undefined && !OT_TYPES.includes(otType)) {
      return sendError(res, 400, `otType must be one of: ${OT_TYPES.join(", ")}.`);
    }
    update.otType = newOtType;

    const newHours = hours !== undefined ? Number(hours) : existing.hours;
    if (hours !== undefined) {
      if (isNaN(newHours) || newHours < 0) return sendError(res, 400, "hours must be a non-negative number.");
    }
    update.hours = newHours;

    if (remarks !== undefined) update.remarks = remarks.trim();

    /* Re-fetch rate (type or dept policy may have changed) */
    const ratePerHour = await getOTRate(existing.employeeId, newOtType);
    update.ratePerHour = ratePerHour;
    update.totalAmount = round2(newHours * ratePerHour);

    const updated = await OvertimeRecord.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).populate("employeeId", "name employeeId department");

    return sendSuccess(res, 200, "OT record updated.", {
      ...updated.toObject(),
      otLabel: OT_LABELS[updated.otType] ?? updated.otType,
    });
  } catch (err) {
    console.error("[updateOT]", err);
    return sendError(res, 500, "Failed to update OT record.");
  }
};

/* ══════════════════════════════════════════════════════════════
   DELETE  DELETE /api/overtime/:id
══════════════════════════════════════════════════════════════ */
export const deleteOT = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid OT record ID.");

    const deleted = await OvertimeRecord.findByIdAndDelete(id);
    if (!deleted) return sendError(res, 404, "OT record not found.");

    return sendSuccess(res, 200, "OT record deleted.", { deleted });
  } catch (err) {
    console.error("[deleteOT]", err);
    return sendError(res, 500, "Failed to delete OT record.");
  }
};
