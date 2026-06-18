/**
 * @file attendance.controller.js
 * @description Controller for the Attendance resource.
 */

import mongoose from "mongoose";
import Attendance from "../model/attendance.model.js";
import Employee from "../model/employee.model.js";
import { sendSuccess, sendError, isDuplicateKeyError } from "../util/apiError.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * Helper to calculate attendance summary fields from a plain JS object map.
 * This is used for additional validation and/or response preparation.
 */
const calculateSummary = (attendanceMap) => {
  let present = 0;
  let absent = 0;
  let weeklyOff = 0;
  let holidays = 0;
  let paidLeave = 0;

  if (attendanceMap) {
    for (const day in attendanceMap) {
      const status = attendanceMap[day];
      if (status === "P") present++;
      else if (status === "A") absent++;
      else if (status === "WO") weeklyOff++;
      else if (status === "H") holidays++;
      else if (status === "CL" || status === "SL" || status === "PL") paidLeave++;
    }
  }

  return {
    present,
    absent,
    weeklyOff,
    holidays,
    paidLeave,
    paidDays: present + weeklyOff + holidays + paidLeave,
  };
};

/**
 * Create a new Attendance record.
 * POST /api/attendance
 * Body: { employeeId, month, year, attendance }
 */
export const createAttendance = async (req, res) => {
  try {
    const { employeeId, month, year, attendance } = req.body;

    if (!employeeId || !isValidId(employeeId)) {
      return sendError(res, 400, "Valid Employee ID is required.");
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || m < 1 || m > 12) {
      return sendError(res, 400, "Month is required and must be between 1 and 12.");
    }
    if (isNaN(y) || y < 2000 || y > 2100) {
      return sendError(res, 400, "Year is required and must be between 2000 and 2100.");
    }

    // Verify employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return sendError(res, 404, "Employee not found.");
    }

    // Check if attendance already exists
    const existing = await Attendance.findOne({ employeeId, month: m, year: y });
    if (existing) {
      return sendError(
        res,
        409,
        `Attendance record already exists for employee ${employee.name} in ${m}/${y}.`
      );
    }

    // summary will be calculated automatically by model pre-save hook
    const newRecord = new Attendance({
      employeeId,
      month: m,
      year: y,
      attendance: attendance || {},
    });

    await newRecord.save();

    // Populate employee details for response consistency
    const populated = await Attendance.findById(newRecord._id).populate(
      "employeeId",
      "name employeeId department"
    );

    return sendSuccess(res, 201, "Attendance record created successfully.", populated);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return sendError(res, 409, "Attendance record for this employee and period already exists.");
    }
    return sendError(res, 500, "Failed to create attendance record.");
  }
};

/**
 * Get all Attendance records with filters.
 * GET /api/attendance?month=&year=&employeeId=
 */
export const getAttendances = async (req, res) => {
  try {
    const filter = {};
    const { month, year, employeeId } = req.query;

    if (employeeId) {
      if (!isValidId(employeeId)) {
        return sendError(res, 400, "Invalid employee ID.");
      }
      filter.employeeId = employeeId;
    }

    if (month) {
      const m = parseInt(month, 10);
      if (isNaN(m) || m < 1 || m > 12) {
        return sendError(res, 400, "Month must be between 1 and 12.");
      }
      filter.month = m;
    }

    if (year) {
      const y = parseInt(year, 10);
      if (isNaN(y) || y < 2000 || y > 2100) {
        return sendError(res, 400, "Year must be a 4-digit number between 2000 and 2100.");
      }
      filter.year = y;
    }

    const records = await Attendance.find(filter)
      .populate("employeeId", "name employeeId department")
      .sort({ year: -1, month: -1, createdAt: -1 });

    return sendSuccess(res, 200, "Attendance records fetched successfully.", {
      total: records.length,
      records,
    });
  } catch (err) {
    console.error("[getAttendances]", err);
    return sendError(res, 500, "Failed to fetch attendance records.");
  }
};

/**
 * Get a single Attendance record by MongoDB ID.
 * GET /api/attendance/:id
 */
export const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return sendError(res, 400, "Invalid attendance record ID.");
    }

    const record = await Attendance.findById(id).populate(
      "employeeId",
      "name employeeId department"
    );

    if (!record) {
      return sendError(res, 404, "Attendance record not found.");
    }

    return sendSuccess(res, 200, "Attendance record fetched successfully.", record);
  } catch (err) {
    console.error("[getAttendanceById]", err);
    return sendError(res, 500, "Failed to fetch attendance record.");
  }
};

/**
 * Update an Attendance record by MongoDB ID.
 * PUT /api/attendance/:id
 * Body: { attendance, month, year }
 */
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return sendError(res, 400, "Invalid attendance record ID.");
    }

    const record = await Attendance.findById(id);
    if (!record) {
      return sendError(res, 404, "Attendance record not found.");
    }

    const { attendance, month, year } = req.body;

    if (attendance !== undefined) {
      record.attendance = attendance;
    }
    if (month !== undefined) {
      const m = parseInt(month, 10);
      if (isNaN(m) || m < 1 || m > 12) {
        return sendError(res, 400, "Month must be between 1 and 12.");
      }
      record.month = m;
    }
    if (year !== undefined) {
      const y = parseInt(year, 10);
      if (isNaN(y) || y < 2000 || y > 2100) {
        return sendError(res, 400, "Year must be between 2000 and 2100.");
      }
      record.year = y;
    }

    // Save triggers the pre-save hook to automatically calculate summary fields
    await record.save();

    const populated = await Attendance.findById(record._id).populate(
      "employeeId",
      "name employeeId department"
    );

    return sendSuccess(res, 200, "Attendance record updated successfully.", populated);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return sendError(res, 409, "An attendance record already exists for this employee and period.");
    }
    console.error("[updateAttendance]", err);
    return sendError(res, 500, "Failed to update attendance record.");
  }
};

/**
 * Delete an Attendance record.
 * DELETE /api/attendance/:id
 */
export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return sendError(res, 400, "Invalid attendance record ID.");
    }

    const deleted = await Attendance.findByIdAndDelete(id);
    if (!deleted) {
      return sendError(res, 404, "Attendance record not found.");
    }

    return sendSuccess(res, 200, "Attendance record deleted successfully.", { deleted });
  } catch (err) {
    console.error("[deleteAttendance]", err);
    return sendError(res, 500, "Failed to delete attendance record.");
  }
};

/**
 * Get attendance for a specific employee, month, and year.
 * GET /api/attendance/employee/:employeeId?month=&year=
 */
export const getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    if (!isValidId(employeeId)) {
      return sendError(res, 400, "Invalid employee ID.");
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (isNaN(m) || m < 1 || m > 12) {
      return sendError(res, 400, "Month query parameter is required and must be between 1 and 12.");
    }
    if (isNaN(y) || y < 2000 || y > 2100) {
      return sendError(res, 400, "Year query parameter is required and must be between 2000 and 2100.");
    }

    const record = await Attendance.findOne({ employeeId, month: m, year: y })
      .populate("employeeId", "name employeeId department");

    // We return 200 with data null if not found, to help frontend handling.
    return sendSuccess(res, 200, "Attendance query completed.", record || null);
  } catch (err) {
    console.error("[getEmployeeAttendance]", err);
    return sendError(res, 500, "Failed to query employee attendance.");
  }
};
