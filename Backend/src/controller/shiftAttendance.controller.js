/**
 * @file shiftAttendance.controller.js
 * @description CRUD + upsert controller for ShiftAttendance records.
 *
 *  POST uses findOneAndUpdate with upsert:true so re-submitting
 *  the same employee+shift+month+year updates daysWorked instead
 *  of throwing a duplicate-key error.
 */

import mongoose from "mongoose";
import ShiftAttendance from "../model/shiftAttendance.model.js";
import Shift           from "../model/shift.model.js";
import Employee        from "../model/employee.model.js";
import { sendSuccess, sendError } from "../util/apiError.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ── Helper: compute allowance amount from attendance record ── */
const computeAllowance = (daysWorked, allowancePerDay) =>
  Math.round(daysWorked * allowancePerDay * 100) / 100;

/* ══════════════════════════════════════════════════════════════
   CREATE / UPSERT   POST /api/shift-attendance
   Body: { employeeId, shiftId, month, year, daysWorked }
══════════════════════════════════════════════════════════════ */
export const upsertAttendance = async (req, res) => {
  try {
    const { employeeId, shiftId, month, year, daysWorked } = req.body;

    // Validate required fields
    if (!isValidId(employeeId)) return sendError(res, 400, "Invalid employee ID.");
    if (!isValidId(shiftId))    return sendError(res, 400, "Invalid shift ID.");

    const m = parseInt(month, 10);
    const y = parseInt(year,  10);
    if (!m || m < 1 || m > 12)         return sendError(res, 400, "month must be 1–12.");
    if (!y || y < 2000 || y > 2100)    return sendError(res, 400, "year must be a 4-digit year.");
    if (daysWorked === undefined || isNaN(Number(daysWorked))) {
      return sendError(res, 400, "daysWorked is required and must be a number.");
    }
    const days = Number(daysWorked);
    if (days < 0 || days > 31) return sendError(res, 400, "daysWorked must be between 0 and 31.");

    // Verify references exist
    const [employee, shift] = await Promise.all([
      Employee.findById(employeeId).select("name employeeId"),
      Shift.findById(shiftId).select("shiftName allowancePerDay isActive"),
    ]);
    if (!employee) return sendError(res, 404, "Employee not found.");
    if (!shift)    return sendError(res, 404, "Shift not found.");
    if (!shift.isActive) return sendError(res, 400, `Shift "${shift.shiftName}" is inactive.`);

    // Upsert
    const record = await ShiftAttendance.findOneAndUpdate(
      { employeeId, shiftId, month: m, year: y },
      { $set: { daysWorked: days } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const allowance = computeAllowance(days, shift.allowancePerDay);

    return sendSuccess(res, 201, "Attendance saved successfully.", {
      ...record.toObject(),
      shiftName:      shift.shiftName,
      allowancePerDay: shift.allowancePerDay,
      allowanceAmount: allowance,
    });
  } catch (err) {
    console.error("[upsertAttendance]", err);
    return sendError(res, 500, "Failed to save attendance.");
  }
};

/* ══════════════════════════════════════════════════════════════
   READ   GET /api/shift-attendance?employeeId=&month=&year=
   Populates shift name + allowancePerDay; computes allowanceAmount.
══════════════════════════════════════════════════════════════ */
export const getAttendance = async (req, res) => {
  try {
    const filter = {};
    const { employeeId, month, year, page, limit, search } = req.query;

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

    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      
      // Find matching employee IDs
      const matchingEmployees = await Employee.find({
        $or: [
          { employeeId: searchRegex },
          { name: searchRegex }
        ]
      }).select("_id");
      const employeeIds = matchingEmployees.map((e) => e._id);

      // Find matching shift IDs
      const matchingShifts = await Shift.find({
        shiftName: searchRegex
      }).select("_id");
      const shiftIds = matchingShifts.map((s) => s._id);

      filter.$or = [
        { employeeId: { $in: employeeIds } },
        { shiftId: { $in: shiftIds } }
      ];
    }

    const total = await ShiftAttendance.countDocuments(filter);

    const pageVal = Math.max(parseInt(page, 10) || 1, 1);
    const limitVal = Math.min(parseInt(limit, 10) || 10, 100);
    const skipVal = (pageVal - 1) * limitVal;

    const records = await ShiftAttendance.find(filter)
      .populate("employeeId", "name employeeId department")
      .populate("shiftId",    "shiftName shiftCode allowancePerDay")
      .sort({ year: -1, month: -1, createdAt: -1 })
      .skip(skipVal)
      .limit(limitVal);

    // Compute allowance amount for each record
    const enriched = records.map((r) => {
      const obj = r.toObject();
      obj.allowanceAmount = computeAllowance(
        obj.daysWorked,
        obj.shiftId?.allowancePerDay ?? 0
      );
      return obj;
    });

    return res.status(200).json({
      success: true,
      message: "Attendance records fetched.",
      data: enriched,
      pagination: {
        total,
        page: pageVal,
        limit: limitVal,
        totalPages: Math.ceil(total / limitVal)
      }
    });
  } catch (err) {
    console.error("[getAttendance]", err);
    return sendError(res, 500, "Failed to fetch attendance records.");
  }
};

/* ══════════════════════════════════════════════════════════════
   UPDATE   PUT /api/shift-attendance/:id
   Only daysWorked is updatable after creation.
══════════════════════════════════════════════════════════════ */
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid attendance record ID.");

    const { daysWorked } = req.body;
    if (daysWorked === undefined || isNaN(Number(daysWorked))) {
      return sendError(res, 400, "daysWorked is required.");
    }
    const days = Number(daysWorked);
    if (days < 0 || days > 31) return sendError(res, 400, "daysWorked must be 0–31.");

    const record = await ShiftAttendance.findByIdAndUpdate(
      id,
      { $set: { daysWorked: days } },
      { new: true }
    ).populate("shiftId", "shiftName allowancePerDay");

    if (!record) return sendError(res, 404, "Attendance record not found.");

    const allowanceAmount = computeAllowance(days, record.shiftId?.allowancePerDay ?? 0);

    return sendSuccess(res, 200, "Attendance updated successfully.", {
      ...record.toObject(),
      allowanceAmount,
    });
  } catch (err) {
    console.error("[updateAttendance]", err);
    return sendError(res, 500, "Failed to update attendance.");
  }
};

/* ══════════════════════════════════════════════════════════════
   DELETE   DELETE /api/shift-attendance/:id
══════════════════════════════════════════════════════════════ */
export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid attendance record ID.");

    const deleted = await ShiftAttendance.findByIdAndDelete(id);
    if (!deleted) return sendError(res, 404, "Attendance record not found.");

    return sendSuccess(res, 200, "Attendance record deleted.", { deleted });
  } catch (err) {
    console.error("[deleteAttendance]", err);
    return sendError(res, 500, "Failed to delete attendance record.");
  }
};
