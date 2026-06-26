/**
 * @file attendancePolicy.controller.js
 * @description CRUD controller for Department Attendance Policy.
 *
 *  POST   /api/attendance-policy               → createOrUpdatePolicy  (upsert)
 *  GET    /api/attendance-policy               → getAllPolicies
 *  GET    /api/attendance-policy/:departmentId → getPolicyByDepartment
 *  PUT    /api/attendance-policy/:departmentId → updatePolicy
 *  DELETE /api/attendance-policy/:departmentId → deletePolicy
 */

import mongoose from "mongoose";
import AttendancePolicy, {
  ATTENDANCE_CALC_METHODS,
} from "../model/attendancePolicy.model.js";
import Department from "../model/department.model.js";
import { sendSuccess, sendError } from "../util/apiError.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ══════════════════════════════════════════════════════════════
   UPSERT (Create or update in one call)
   POST /api/attendance-policy
   Body: { departmentId, ...policyFields }
   If a policy already exists for that department, it is updated.
══════════════════════════════════════════════════════════════ */
export const createOrUpdatePolicy = async (req, res) => {
  try {
    const { departmentId, ...rest } = req.body;

    if (!departmentId || !isValidId(departmentId))
      return sendError(res, 400, "Valid departmentId is required.");

    // Validate department exists
    const dept = await Department.findById(departmentId);
    if (!dept) return sendError(res, 404, "Department not found.");

    // Validate enums if provided
    if (
      rest.attendanceCalculationMethod &&
      !ATTENDANCE_CALC_METHODS.includes(rest.attendanceCalculationMethod)
    )
      return sendError(
        res,
        400,
        `attendanceCalculationMethod must be one of: ${ATTENDANCE_CALC_METHODS.join(", ")}.`
      );

    if (rest.weeklyOffDays) {
      if (
        !Array.isArray(rest.weeklyOffDays) ||
        rest.weeklyOffDays.some((d) => d < 0 || d > 6)
      )
        return sendError(
          res,
          400,
          "weeklyOffDays must be an array of integers between 0 (Sun) and 6 (Sat)."
        );
    }

    const allowed = [
      "maxPaidLeavePerMonth",
      "weeklyOffDays",
      "alternateSaturdayPattern",
      "canteenRatePerDay",
      "shiftAllowanceEnabled",
      "overtimeEnabled",
      "lateMarkEnabled",
      "graceMinutes",
      "attendanceCalculationMethod",
    ];
    const update = { departmentName: dept.departmentName };
    for (const key of allowed) {
      if (rest[key] !== undefined) update[key] = rest[key];
    }

    const policy = await AttendancePolicy.findOneAndUpdate(
      { departmentId },
      { $set: { departmentId, ...update } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, 200, "Attendance policy saved successfully.", policy);
  } catch (err) {
    console.error("[createOrUpdatePolicy]", err);
    return sendError(res, 500, "Failed to save attendance policy.");
  }
};

/* ══════════════════════════════════════════════════════════════
   LIST ALL
   GET /api/attendance-policy
══════════════════════════════════════════════════════════════ */
export const getAllPolicies = async (req, res) => {
  try {
    const policies = await AttendancePolicy.find()
      .populate("departmentId", "departmentName isActive")
      .sort({ departmentName: 1 });

    return sendSuccess(res, 200, "Attendance policies fetched.", {
      total: policies.length,
      policies,
    });
  } catch (err) {
    console.error("[getAllPolicies]", err);
    return sendError(res, 500, "Failed to fetch attendance policies.");
  }
};

/* ══════════════════════════════════════════════════════════════
   GET ONE by departmentId
   GET /api/attendance-policy/:departmentId
══════════════════════════════════════════════════════════════ */
export const getPolicyByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    if (!isValidId(departmentId))
      return sendError(res, 400, "Invalid department ID.");

    const policy = await AttendancePolicy.findOne({ departmentId })
      .populate("departmentId", "departmentName isActive");

    if (!policy) return sendError(res, 404, "No attendance policy found for this department.");

    return sendSuccess(res, 200, "Attendance policy fetched.", policy);
  } catch (err) {
    console.error("[getPolicyByDepartment]", err);
    return sendError(res, 500, "Failed to fetch attendance policy.");
  }
};

/* ══════════════════════════════════════════════════════════════
   UPDATE
   PUT /api/attendance-policy/:departmentId
   Body: any subset of policy fields
══════════════════════════════════════════════════════════════ */
export const updatePolicy = async (req, res) => {
  try {
    const { departmentId } = req.params;
    if (!isValidId(departmentId))
      return sendError(res, 400, "Invalid department ID.");

    const dept = await Department.findById(departmentId);
    if (!dept) return sendError(res, 404, "Department not found.");

    const {
      maxPaidLeavePerMonth,
      weeklyOffDays,
      alternateSaturdayPattern,
      canteenRatePerDay,
      shiftAllowanceEnabled,
      overtimeEnabled,
      lateMarkEnabled,
      graceMinutes,
      attendanceCalculationMethod,
    } = req.body;

    const update = {};
    if (maxPaidLeavePerMonth !== undefined)      update.maxPaidLeavePerMonth     = maxPaidLeavePerMonth;
    if (weeklyOffDays !== undefined) {
      if (!Array.isArray(weeklyOffDays) || weeklyOffDays.some((d) => d < 0 || d > 6))
        return sendError(res, 400, "weeklyOffDays must be an array of 0–6.");
      update.weeklyOffDays = weeklyOffDays;
    }
    if (alternateSaturdayPattern !== undefined)  update.alternateSaturdayPattern = alternateSaturdayPattern;
    if (canteenRatePerDay !== undefined)         update.canteenRatePerDay        = canteenRatePerDay;
    if (shiftAllowanceEnabled !== undefined)     update.shiftAllowanceEnabled    = Boolean(shiftAllowanceEnabled);
    if (overtimeEnabled !== undefined)           update.overtimeEnabled          = Boolean(overtimeEnabled);
    if (lateMarkEnabled !== undefined)           update.lateMarkEnabled          = Boolean(lateMarkEnabled);
    if (graceMinutes !== undefined)              update.graceMinutes             = graceMinutes;
    if (attendanceCalculationMethod !== undefined) {
      if (!ATTENDANCE_CALC_METHODS.includes(attendanceCalculationMethod))
        return sendError(res, 400, `attendanceCalculationMethod must be one of: ${ATTENDANCE_CALC_METHODS.join(", ")}.`);
      update.attendanceCalculationMethod = attendanceCalculationMethod;
    }

    const policy = await AttendancePolicy.findOneAndUpdate(
      { departmentId },
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!policy) return sendError(res, 404, "No attendance policy found for this department.");

    return sendSuccess(res, 200, "Attendance policy updated.", policy);
  } catch (err) {
    console.error("[updatePolicy]", err);
    return sendError(res, 500, "Failed to update attendance policy.");
  }
};

/* ══════════════════════════════════════════════════════════════
   DELETE
   DELETE /api/attendance-policy/:departmentId
══════════════════════════════════════════════════════════════ */
export const deletePolicy = async (req, res) => {
  try {
    const { departmentId } = req.params;
    if (!isValidId(departmentId))
      return sendError(res, 400, "Invalid department ID.");

    const deleted = await AttendancePolicy.findOneAndDelete({ departmentId });
    if (!deleted) return sendError(res, 404, "No attendance policy found for this department.");

    return sendSuccess(res, 200, "Attendance policy deleted.", { deleted });
  } catch (err) {
    console.error("[deletePolicy]", err);
    return sendError(res, 500, "Failed to delete attendance policy.");
  }
};
