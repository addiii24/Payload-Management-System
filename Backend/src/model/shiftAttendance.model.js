/**
 * @file shiftAttendance.model.js
 * @description Mongoose schema for the ShiftAttendance collection.
 *
 *  One document = one employee's attendance in one shift for one month/year.
 *  The compound unique index prevents duplicate entries for the same
 *  (employee, shift, month, year) combination.
 *
 *  At payroll generation time, the payroll service queries this collection
 *  to sum shift allowances for each employee.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const shiftAttendanceSchema = new Schema(
  {
    /** Reference to the Employee document */
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee ID is required"],
    },

    /** Reference to the Shift master document */
    shiftId: {
      type: Schema.Types.ObjectId,
      ref: "Shift",
      required: [true, "Shift ID is required"],
    },

    /** Calendar month (1 = January … 12 = December) */
    month: {
      type: Number,
      required: [true, "Month is required"],
      min: 1,
      max: 12,
    },

    /** 4-digit calendar year, e.g. 2026 */
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: 2000,
    },

    /** Number of days the employee worked this shift in this month */
    daysWorked: {
      type: Number,
      required: [true, "Days worked is required"],
      min: [0, "Days worked cannot be negative"],
      max: [31, "Days worked cannot exceed 31"],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ── Compound unique index — one record per employee+shift+period ── */
shiftAttendanceSchema.index(
  { employeeId: 1, shiftId: 1, month: 1, year: 1 },
  { unique: true }
);

/* ── Fast lookups by period ── */
shiftAttendanceSchema.index({ month: 1, year: 1 });

/* ── Fast lookups by employee ── */
shiftAttendanceSchema.index({ employeeId: 1 });

const ShiftAttendance = model("ShiftAttendance", shiftAttendanceSchema);

export default ShiftAttendance;
