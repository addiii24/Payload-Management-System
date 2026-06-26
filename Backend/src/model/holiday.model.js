/**
 * @file holiday.model.js
 * @description Mongoose schema for the Company Holiday Calendar collection.
 *
 *  One document = one company holiday.
 *  Unique index on `date` prevents duplicate holidays on the same calendar date.
 *
 *  Holiday types match manufacturing / automotive HR terminology.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

export const HOLIDAY_TYPES = [
  "National",
  "Festival",
  "Company Holiday",
  "Maintenance Shutdown",
  "Optional Holiday",
];

const holidaySchema = new Schema(
  {
    /** Human-readable name  e.g. "Republic Day", "Diwali", "Annual Shutdown" */
    name: {
      type: String,
      required: [true, "Holiday name is required"],
      trim: true,
    },

    /**
     * The calendar date of the holiday.
     * Stored as a Date (midnight UTC).  Unique per date — no two holidays on the same day.
     */
    date: {
      type: Date,
      required: [true, "Holiday date is required"],
    },

    /** Holiday category — governs payroll treatment in future integration */
    type: {
      type: String,
      required: [true, "Holiday type is required"],
      enum: {
        values: HOLIDAY_TYPES,
        message: `{VALUE} is not a valid holiday type. Must be one of: ${HOLIDAY_TYPES.join(", ")}`,
      },
    },

    /**
     * Whether employees are paid for this holiday.
     * Paid = true  →  counts as a Paid Day in attendance summary.
     * Paid = false →  LOP treatment (e.g. Optional Holiday not availed).
     */
    isPaid: {
      type: Boolean,
      default: true,
    },

    /** Optional free-text notes  e.g. "Factory closed – government order" */
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

/** Prevent two holidays on the same calendar date */
holidaySchema.index({ date: 1 }, { unique: true });

/** Fast year-range queries  e.g. "all holidays in 2026" */
holidaySchema.index({ date: 1, type: 1 });

const Holiday = model("Holiday", holidaySchema);
export default Holiday;
