/**
 * @file shift.controller.js
 * @description CRUD controller for the Shift master resource.
 *
 *  DELETE is a soft-delete (sets isActive: false) to preserve historical
 *  ShiftAttendance records that reference this shift.
 */

import mongoose from "mongoose";
import Shift from "../model/shift.model.js";
import {
  sendSuccess,
  sendError,
  isDuplicateKeyError,
  duplicateKeyMessage,
} from "../util/apiError.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ══════════════════════════════════════════════════════════════
   CREATE   POST /api/shifts
══════════════════════════════════════════════════════════════ */
export const createShift = async (req, res) => {
  try {
    const { shiftName, shiftCode, startTime, endTime, allowancePerDay, isActive } = req.body;

    if (!shiftName?.trim())   return sendError(res, 400, "Shift name is required.");
    if (!shiftCode?.trim())   return sendError(res, 400, "Shift code is required.");
    if (allowancePerDay === undefined || isNaN(Number(allowancePerDay))) {
      return sendError(res, 400, "A valid allowance per day is required.");
    }
    if (Number(allowancePerDay) < 0) {
      return sendError(res, 400, "Allowance per day cannot be negative.");
    }

    const shift = await Shift.create({
      shiftName:      shiftName.trim(),
      shiftCode:      shiftCode.trim().toUpperCase(),
      startTime:      startTime?.trim() || "",
      endTime:        endTime?.trim()   || "",
      allowancePerDay: Number(allowancePerDay),
      isActive:       isActive !== undefined ? Boolean(isActive) : true,
    });

    return sendSuccess(res, 201, "Shift created successfully.", shift);
  } catch (err) {
    if (isDuplicateKeyError(err)) return sendError(res, 409, duplicateKeyMessage(err));
    console.error("[createShift]", err);
    return sendError(res, 500, "Failed to create shift.");
  }
};

/* ══════════════════════════════════════════════════════════════
   READ ALL   GET /api/shifts[?isActive=true]
══════════════════════════════════════════════════════════════ */
export const getShifts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    const shifts = await Shift.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Shifts fetched successfully.", {
      total: shifts.length,
      shifts,
    });
  } catch (err) {
    console.error("[getShifts]", err);
    return sendError(res, 500, "Failed to fetch shifts.");
  }
};

/* ══════════════════════════════════════════════════════════════
   READ ONE   GET /api/shifts/:id
══════════════════════════════════════════════════════════════ */
export const getShiftById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid shift ID.");

    const shift = await Shift.findById(id);
    if (!shift) return sendError(res, 404, "Shift not found.");

    return sendSuccess(res, 200, "Shift fetched successfully.", shift);
  } catch (err) {
    console.error("[getShiftById]", err);
    return sendError(res, 500, "Failed to fetch shift.");
  }
};

/* ══════════════════════════════════════════════════════════════
   UPDATE   PUT /api/shifts/:id
══════════════════════════════════════════════════════════════ */
export const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid shift ID.");

    const allowed = ["shiftName", "shiftCode", "startTime", "endTime", "allowancePerDay", "isActive"];
    const update  = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    }

    if (update.shiftCode) update.shiftCode = update.shiftCode.trim().toUpperCase();
    if (update.allowancePerDay !== undefined) {
      const pct = Number(update.allowancePerDay);
      if (isNaN(pct) || pct < 0) return sendError(res, 400, "Allowance per day must be a non-negative number.");
      update.allowancePerDay = pct;
    }

    const updated = await Shift.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!updated) return sendError(res, 404, "Shift not found.");

    return sendSuccess(res, 200, "Shift updated successfully.", updated);
  } catch (err) {
    if (isDuplicateKeyError(err)) return sendError(res, 409, duplicateKeyMessage(err));
    console.error("[updateShift]", err);
    return sendError(res, 500, "Failed to update shift.");
  }
};

/* ══════════════════════════════════════════════════════════════
   SOFT DELETE   DELETE /api/shifts/:id
   Sets isActive: false — preserves historical attendance records.
══════════════════════════════════════════════════════════════ */
export const deleteShift = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid shift ID.");

    const shift = await Shift.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );
    if (!shift) return sendError(res, 404, "Shift not found.");

    return sendSuccess(res, 200, `Shift "${shift.shiftName}" deactivated successfully.`, shift);
  } catch (err) {
    console.error("[deleteShift]", err);
    return sendError(res, 500, "Failed to deactivate shift.");
  }
};
