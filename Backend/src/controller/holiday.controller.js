/**
 * @file holiday.controller.js
 * @description CRUD controller for the Company Holiday Calendar.
 *
 *  Whenever a holiday is created, updated (date changed), or deleted, the system
 *  automatically propagates the change to every existing Attendance record that
 *  covers the affected month/year — keeping all sheets in sync without any
 *  manual intervention.
 *
 *  Sync rules
 *  ──────────
 *  • CREATE → mark that day "H" in every attendance record for that month/year.
 *             Only cells that are NOT already locked by another status are updated
 *             (we always overwrite — company holiday takes priority).
 *  • DELETE → remove "H" from that day in every attendance record for that month/year.
 *             The cell is deleted (day removed from map) so HR can re-enter manually.
 *  • UPDATE → if the date changed:  revert old day + apply new day across all records.
 *             If only metadata changed (name, type, isPaid), no attendance sync needed.
 */

import mongoose from "mongoose";
import Holiday, { HOLIDAY_TYPES } from "../model/holiday.model.js";
import Attendance from "../model/attendance.model.js";
import {
  sendSuccess,
  sendError,
  isDuplicateKeyError,
} from "../util/apiError.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Normalise a date to midnight UTC so comparisons are day-accurate */
const toMidnightUTC = (dateStr) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/* ──────────────────────────────────────────────────────────────
   INTERNAL SYNC HELPERS
   These functions run after a successful DB write.
   They use bulkWrite for efficiency and never block the response.
────────────────────────────────────────────────────────────── */

/**
 * Mark a specific day as "H" (Holiday) in ALL attendance records for
 * the given month/year.
 * Uses MongoDB's dot-notation to update a single key in the attendance Map.
 */
const markHolidayInAttendance = async (year, month, day) => {
  try {
    const dayKey = String(day);
    // Update all records: set attendance.<day> = "H"
    const result = await Attendance.updateMany(
      { year, month },
      { $set: { [`attendance.${dayKey}`]: "H" } }
    );

    // Re-calculate summary for each affected record (pre-save hook fires only on .save())
    // So we pull the records and save them one-by-one to trigger the hook.
    if (result.modifiedCount > 0) {
      await recalculateSummaries(year, month);
    }
    console.log(`[holidaySync] Marked day ${day} as H in ${result.modifiedCount} records (${month}/${year})`);
  } catch (err) {
    console.error("[holidaySync:markHoliday]", err);
  }
};

/**
 * Unmark "H" from a specific day in ALL attendance records for
 * the given month/year.  The key is deleted from the map so
 * HR can re-enter the status manually.
 */
const unmarkHolidayInAttendance = async (year, month, day) => {
  try {
    const dayKey = String(day);
    const result = await Attendance.updateMany(
      { year, month, [`attendance.${dayKey}`]: "H" }, // only revert cells that are still "H"
      { $unset: { [`attendance.${dayKey}`]: "" } }
    );
    if (result.modifiedCount > 0) {
      await recalculateSummaries(year, month);
    }
    console.log(`[holidaySync] Unmarked day ${day} from ${result.modifiedCount} records (${month}/${year})`);
  } catch (err) {
    console.error("[holidaySync:unmarkHoliday]", err);
  }
};

/**
 * Re-run the summary calculation for all attendance records in a given month/year.
 * This mirrors the pre-save hook logic so the stored summary stays accurate.
 */
const recalculateSummaries = async (year, month) => {
  const records = await Attendance.find({ year, month });
  const bulkOps = records.map((rec) => {
    let present = 0, absent = 0, weeklyOff = 0, holidays = 0, paidLeave = 0;
    const map = rec.attendance || new Map();
    const values = typeof map.values === "function" ? [...map.values()] : Object.values(map);
    for (const v of values) {
      if (v === "P")   present++;
      else if (v === "A")  absent++;
      else if (v === "WO") weeklyOff++;
      else if (v === "H")  holidays++;
      else if (v === "CL" || v === "SL" || v === "PL") paidLeave++;
    }
    return {
      updateOne: {
        filter: { _id: rec._id },
        update: {
          $set: {
            "summary.present":   present,
            "summary.absent":    absent,
            "summary.weeklyOff": weeklyOff,
            "summary.holidays":  holidays,
            "summary.paidLeave": paidLeave,
            "summary.paidDays":  present + weeklyOff + holidays + paidLeave,
          },
        },
      },
    };
  });
  if (bulkOps.length) await Attendance.bulkWrite(bulkOps);
};

/* ══════════════════════════════════════════════════════════════
   CREATE
   POST /api/holidays
   Body: { name, date, type, isPaid?, description? }
══════════════════════════════════════════════════════════════ */
export const createHoliday = async (req, res) => {
  try {
    const { name, date, type, isPaid, description } = req.body;

    if (!name?.trim()) return sendError(res, 400, "Holiday name is required.");
    if (!date) return sendError(res, 400, "Holiday date is required.");
    if (!HOLIDAY_TYPES.includes(type))
      return sendError(res, 400, `Holiday type must be one of: ${HOLIDAY_TYPES.join(", ")}.`);

    const normalised = toMidnightUTC(date);
    if (!normalised) return sendError(res, 400, "Invalid date format.");

    const holiday = await Holiday.create({
      name: name.trim(),
      date: normalised,
      type,
      isPaid: isPaid !== undefined ? Boolean(isPaid) : true,
      description: description?.trim() || "",
    });

    // ── Sync to all existing attendance records ──────────────────
    const month = normalised.getUTCMonth() + 1; // 1-based
    const year  = normalised.getUTCFullYear();
    const day   = normalised.getUTCDate();
    markHolidayInAttendance(year, month, day); // fire-and-forget

    return sendSuccess(res, 201, "Holiday created successfully. All attendance sheets updated.", holiday);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return sendError(res, 409, "A holiday already exists on this date.");
    }
    console.error("[createHoliday]", err);
    return sendError(res, 500, "Failed to create holiday.");
  }
};

/* ══════════════════════════════════════════════════════════════
   LIST
   GET /api/holidays?year=&type=
══════════════════════════════════════════════════════════════ */
export const getHolidays = async (req, res) => {
  try {
    const { year, type } = req.query;
    const filter = {};

    if (year) {
      const y = parseInt(year, 10);
      if (isNaN(y) || y < 2000 || y > 2100)
        return sendError(res, 400, "year must be a 4-digit number between 2000 and 2100.");
      filter.date = {
        $gte: new Date(Date.UTC(y, 0, 1)),
        $lte: new Date(Date.UTC(y, 11, 31, 23, 59, 59)),
      };
    }

    if (type) {
      if (!HOLIDAY_TYPES.includes(type))
        return sendError(res, 400, `type must be one of: ${HOLIDAY_TYPES.join(", ")}.`);
      filter.type = type;
    }

    const holidays = await Holiday.find(filter).sort({ date: 1 });

    return sendSuccess(res, 200, "Holidays fetched successfully.", {
      total: holidays.length,
      holidays,
    });
  } catch (err) {
    console.error("[getHolidays]", err);
    return sendError(res, 500, "Failed to fetch holidays.");
  }
};

/* ══════════════════════════════════════════════════════════════
   GET BY MONTH  — used internally by the Attendance engine
   GET /api/holidays/by-month?year=&month=
   Returns array of day-numbers (1–31) that are holidays in that month/year.
══════════════════════════════════════════════════════════════ */
export const getHolidaysByMonth = async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (isNaN(y) || y < 2000 || y > 2100)
      return sendError(res, 400, "year must be 2000–2100.");
    if (isNaN(m) || m < 1 || m > 12)
      return sendError(res, 400, "month must be 1–12.");

    const start = new Date(Date.UTC(y, m - 1, 1));
    const end   = new Date(Date.UTC(y, m, 0, 23, 59, 59)); // last day of month

    const holidays = await Holiday.find({ date: { $gte: start, $lte: end } }).sort({ date: 1 });

    // Return lightweight day-info so frontend can auto-mark days
    const days = holidays.map((h) => ({
      _id:    h._id,
      name:   h.name,
      day:    h.date.getUTCDate(),
      type:   h.type,
      isPaid: h.isPaid,
    }));

    return sendSuccess(res, 200, "Holidays for month fetched.", {
      year: y,
      month: m,
      holidays: days,
    });
  } catch (err) {
    console.error("[getHolidaysByMonth]", err);
    return sendError(res, 500, "Failed to fetch holidays for month.");
  }
};

/* ══════════════════════════════════════════════════════════════
   GET ONE
   GET /api/holidays/:id
══════════════════════════════════════════════════════════════ */
export const getHolidayById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid holiday ID.");

    const holiday = await Holiday.findById(id);
    if (!holiday) return sendError(res, 404, "Holiday not found.");

    return sendSuccess(res, 200, "Holiday fetched.", holiday);
  } catch (err) {
    console.error("[getHolidayById]", err);
    return sendError(res, 500, "Failed to fetch holiday.");
  }
};

/* ══════════════════════════════════════════════════════════════
   UPDATE
   PUT /api/holidays/:id
   Body: any subset of { name, date, type, isPaid, description }

   Sync logic:
   • If date changed → unmark old day, mark new day across all attendance records.
   • Metadata-only changes (name, type, isPaid) → no attendance sync.
══════════════════════════════════════════════════════════════ */
export const updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid holiday ID.");

    // Fetch the existing holiday so we know the old date for sync
    const existing = await Holiday.findById(id);
    if (!existing) return sendError(res, 404, "Holiday not found.");

    const { name, date, type, isPaid, description } = req.body;
    const update = {};

    if (name !== undefined) {
      if (!name.trim()) return sendError(res, 400, "Holiday name cannot be empty.");
      update.name = name.trim();
    }
    if (date !== undefined) {
      const normalised = toMidnightUTC(date);
      if (!normalised) return sendError(res, 400, "Invalid date format.");
      update.date = normalised;
    }
    if (type !== undefined) {
      if (!HOLIDAY_TYPES.includes(type))
        return sendError(res, 400, `type must be one of: ${HOLIDAY_TYPES.join(", ")}.`);
      update.type = type;
    }
    if (isPaid !== undefined) update.isPaid = Boolean(isPaid);
    if (description !== undefined) update.description = description.trim();

    const holiday = await Holiday.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );

    // ── Sync attendance if date changed ────────────────────────
    if (update.date) {
      const oldDate = existing.date;
      const newDate = update.date;
      const oldDateStr = oldDate.toISOString().slice(0, 10);
      const newDateStr = newDate.toISOString().slice(0, 10);

      if (oldDateStr !== newDateStr) {
        const oldYear  = oldDate.getUTCFullYear();
        const oldMonth = oldDate.getUTCMonth() + 1;
        const oldDay   = oldDate.getUTCDate();

        const newYear  = newDate.getUTCFullYear();
        const newMonth = newDate.getUTCMonth() + 1;
        const newDay   = newDate.getUTCDate();

        // Revert old date, apply new date
        unmarkHolidayInAttendance(oldYear, oldMonth, oldDay);
        markHolidayInAttendance(newYear, newMonth, newDay);
      }
    }

    return sendSuccess(res, 200, "Holiday updated successfully.", holiday);
  } catch (err) {
    if (isDuplicateKeyError(err))
      return sendError(res, 409, "Another holiday already exists on this date.");
    console.error("[updateHoliday]", err);
    return sendError(res, 500, "Failed to update holiday.");
  }
};

/* ══════════════════════════════════════════════════════════════
   DELETE
   DELETE /api/holidays/:id
   After deletion, reverts "H" from the affected day in all attendance records.
══════════════════════════════════════════════════════════════ */
export const deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid holiday ID.");

    const deleted = await Holiday.findByIdAndDelete(id);
    if (!deleted) return sendError(res, 404, "Holiday not found.");

    // ── Sync: remove "H" from that day in all attendance records ──
    const month = deleted.date.getUTCMonth() + 1;
    const year  = deleted.date.getUTCFullYear();
    const day   = deleted.date.getUTCDate();
    unmarkHolidayInAttendance(year, month, day); // fire-and-forget

    return sendSuccess(res, 200, "Holiday deleted. Attendance sheets reverted.", { deleted });
  } catch (err) {
    console.error("[deleteHoliday]", err);
    return sendError(res, 500, "Failed to delete holiday.");
  }
};
