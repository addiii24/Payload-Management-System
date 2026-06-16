/**
 * @file overtimeRecord.model.js
 * @description Mongoose schema for OvertimeRecord collection.
 *
 *  One document = one employee's OT of a specific type for one month/year.
 *  The compound unique index prevents duplicate entries for the same
 *  (employee, month, year, otType) combination — enforced at DB level.
 *
 *  ratePerHour is snapshotted at entry time from DepartmentPolicy.otRates
 *  so historical payroll accuracy is maintained even when rates change later.
 *
 *  totalAmount = hours × ratePerHour  (computed and stored, not virtual)
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const OT_TYPES = ["dailyOT", "weeklyOffOT", "holidayOT"];

const overtimeRecordSchema = new Schema(
  {
    /** Reference to the Employee document */
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee ID is required"],
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
      max: 2100,
    },

    /**
     * OT type key — must match a key in DepartmentPolicy.otRates.
     * dailyOT     — extra hours on a normal working day
     * weeklyOffOT — working on a weekly-off day
     * holidayOT   — working on a national / festival holiday
     */
    otType: {
      type: String,
      required: [true, "OT type is required"],
      enum: OT_TYPES,
    },

    /** Number of overtime hours claimed this month for this OT type */
    hours: {
      type: Number,
      required: [true, "Hours are required"],
      min: [0, "Hours cannot be negative"],
    },

    /**
     * Snapshot of the rate at time of entry (from DepartmentPolicy.otRates).
     * Stored so historical payslips remain accurate after policy changes.
     */
    ratePerHour: {
      type: Number,
      required: [true, "Rate per hour is required"],
      min: [0, "Rate cannot be negative"],
    },

    /**
     * Pre-computed amount = hours × ratePerHour.
     * Stored (not virtual) for fast aggregations in the payroll engine.
     */
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: 0,
    },

    /** Optional free-text remarks, e.g. "Diwali production line" */
    remarks: {
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

/* ── Indexes ── */

// One record per employee+period+type — prevents duplicate entries
overtimeRecordSchema.index(
  { employeeId: 1, month: 1, year: 1, otType: 1 },
  { unique: true }
);

// Fast period-level queries (payroll generation, period listing)
overtimeRecordSchema.index({ month: 1, year: 1 });

// Fast per-employee history
overtimeRecordSchema.index({ employeeId: 1 });

export { OT_TYPES };
export default model("OvertimeRecord", overtimeRecordSchema);
