/**
 * @file attendancePolicy.model.js
 * @description Mongoose schema for the Department Attendance Policy collection.
 *
 *  One document per department.
 *  This policy drives automatic attendance calculation — no values are hardcoded.
 *
 *  Design Rule: Policy contains ONLY department-level rules, never employee-specific data.
 *
 *  Hierarchy:
 *    Company Holiday  →  Department Attendance Policy  →  Employee Benefits  →  Attendance  →  Payroll
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

/* ── Weekly-off day codes ── */
// 0 = Sunday, 1 = Monday … 6 = Saturday
export const WEEK_DAYS = [
  { code: 0, label: "Sunday" },
  { code: 1, label: "Monday" },
  { code: 2, label: "Tuesday" },
  { code: 3, label: "Wednesday" },
  { code: 4, label: "Thursday" },
  { code: 5, label: "Friday" },
  { code: 6, label: "Saturday" },
];

export const ATTENDANCE_CALC_METHODS = [
  "Calendar Days",      // Paid Days / Calendar Days × Gross
  "Working Days",       // Paid Days / Working Days × Gross
];

const attendancePolicySchema = new Schema(
  {
    /** Reference to the parent department — one policy per department */
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department ID is required"],
      unique: true,
    },

    /** Snapshot name for display (avoids populate on every read) */
    departmentName: {
      type: String,
      trim: true,
      default: "",
    },

    // ─── Leave Entitlement ────────────────────────────────────────

    /** Maximum paid leaves allowed per month per employee in this department */
    maxPaidLeavePerMonth: {
      type: Number,
      default: 1,
      min: [0, "Cannot be negative"],
    },

    // ─── Weekly Off Configuration ──────────────────────────────────

    /**
     * Day-of-week codes for the regular weekly off.
     * [0] = Sunday only  |  [0, 6] = Sunday + Saturday  etc.
     * Each value must be 0-6 (JS getDay() convention).
     */
    weeklyOffDays: {
      type: [Number],
      default: [0], // Sunday by default
      validate: {
        validator: (arr) => arr.every((d) => d >= 0 && d <= 6),
        message: "Each weekly-off day must be between 0 (Sun) and 6 (Sat)",
      },
    },

    /**
     * Alternate Saturday pattern.
     * "none"       = no alternate Saturdays (all Saturdays either WO or working as per weeklyOffDays)
     * "even"       = even Saturdays are weekly off
     * "odd"        = odd Saturdays are weekly off
     * "first-last" = 1st and last Saturday of the month are weekly off
     */
    alternateSaturdayPattern: {
      type: String,
      enum: ["none", "even", "odd", "first-last"],
      default: "none",
    },

    // ─── Canteen ──────────────────────────────────────────────────

    /** Per-day canteen deduction amount (₹) — applied only to enrolled employees */
    canteenRatePerDay: {
      type: Number,
      default: 0,
      min: [0, "Rate cannot be negative"],
    },

    // ─── Feature Flags ────────────────────────────────────────────

    /** Whether shift allowance applies to this department */
    shiftAllowanceEnabled: {
      type: Boolean,
      default: false,
    },

    /** Whether overtime calculation is enabled for this department */
    overtimeEnabled: {
      type: Boolean,
      default: false,
    },

    // ─── Late Mark ────────────────────────────────────────────────

    /** Whether late-mark deductions are enabled */
    lateMarkEnabled: {
      type: Boolean,
      default: false,
    },

    /** Grace period (in minutes) before a late-mark is recorded */
    graceMinutes: {
      type: Number,
      default: 5,
      min: [0, "Grace minutes cannot be negative"],
    },

    // ─── Calculation Method ───────────────────────────────────────

    /**
     * How the monthly salary is prorated.
     * "Calendar Days"  = Gross × (PaidDays / daysInMonth)
     * "Working Days"   = Gross × (PaidDays / workingDaysInMonth)
     */
    attendanceCalculationMethod: {
      type: String,
      enum: {
        values: ATTENDANCE_CALC_METHODS,
        message: `Must be one of: ${ATTENDANCE_CALC_METHODS.join(", ")}`,
      },
      default: "Calendar Days",
    },

    /** Generic metadata store for future modules without database migrations */
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
attendancePolicySchema.index({ departmentId: 1 }, { unique: true });

const AttendancePolicy = model("AttendancePolicy", attendancePolicySchema);
export default AttendancePolicy;
