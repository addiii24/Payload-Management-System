/**
 * @file payroll.model.js
 * @description Mongoose schema for the Payroll collection.
 *
 *  Architecture (corrected — Phase 3+):
 *
 *    Gross          = basicSalary + hra + otherAllowances
 *    Deductions     = percentage-based rules applied to Gross only
 *    Additions      = Shift Allowance + Overtime (post-deduction, never inflate Gross)
 *    Net Pay        = Gross − Total Deductions + Total Additions
 *
 *  Nothing is hardcoded — all values come from DepartmentPolicy at generation time.
 *  PDF payslips are NOT stored here — generated on demand by payslip.service.js.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

/* ── Sub-schema: one applied percentage-based deduction ── */
const appliedDeductionSchema = new Schema(
  {
    name:       { type: String, required: true, trim: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    amount:     { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

/* ── Sub-schema: one shift allowance breakdown line ── */
const shiftBreakdownSchema = new Schema(
  {
    shiftName:  { type: String, required: true },
    daysWorked: { type: Number, required: true },
    ratePerDay: { type: Number, required: true },
    total:      { type: Number, required: true },
  },
  { _id: false }
);

/* ── Sub-schema: one overtime breakdown line ── */
const otBreakdownSchema = new Schema(
  {
    otType:      { type: String, required: true },   // e.g. "Daily OT", "Holiday OT"
    hours:       { type: Number, required: true },
    ratePerHour: { type: Number, required: true },
    total:       { type: Number, required: true },
  },
  { _id: false }
);

/* ── Main payroll schema ── */
const payrollSchema = new Schema(
  {
    /* ── Identity ── */
    employeeId:   { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    employeeName: { type: String, required: true, trim: true },   // snapshot
    employeeCode: { type: String, required: true, trim: true },   // snapshot e.g. "EMP001"
    department:   { type: String, required: true, trim: true },   // snapshot
    designation:  { type: String, required: true, trim: true },   // snapshot

    /* ── Period ── */
    month: { type: Number, required: true, min: 1, max: 12 },
    year:  { type: Number, required: true, min: 2000 },

    /* ─────────────────────────────────────────────────────────────────────
       SECTION A — EARNINGS
       Gross = basicSalary + hra + otherAllowances
       Deductions are applied only against grossSalary (never against additions).
    ───────────────────────────────────────────────────────────────────── */
    basicSalary:      { type: Number, required: true, min: 0 },
    hra:              { type: Number, default: 0,    min: 0 },
    otherAllowances:  { type: Number, default: 0,    min: 0 },
    grossSalary:      { type: Number, required: true, min: 0 },   // = basic + hra + other

    /* ── Attendance Summary Snapshot ── */
    workingDays:         { type: Number, default: 0 },
    paidDays:            { type: Number, default: 0 },
    presentDays:         { type: Number, default: 0 },
    lopDays:             { type: Number, default: 0 },
    companyHolidays:     { type: Number, default: 0 },
    weeklyOff:           { type: Number, default: 0 },
    canteenEligibleDays: { type: Number, default: 0 },

    /* ─────────────────────────────────────────────────────────────────────
       SECTION B — DEDUCTIONS
       Applied as percentages of grossSalary only.
    ───────────────────────────────────────────────────────────────────── */
    deductions:     { type: [appliedDeductionSchema], default: [] },
    totalDeduction: { type: Number, required: true, min: 0 },

    /* ─────────────────────────────────────────────────────────────────────
       SECTION C — ADDITIONS  (post-deduction, do NOT affect grossSalary)
    ───────────────────────────────────────────────────────────────────── */
    shiftAllowance: { type: Number, default: 0, min: 0 },
    shiftBreakdown: { type: [shiftBreakdownSchema], default: [] },

    overtimeAmount:   { type: Number, default: 0, min: 0 },
    overtimeBreakdown:{ type: [otBreakdownSchema], default: [] },

    totalAdditions: { type: Number, default: 0, min: 0 },   // shiftAllowance + overtimeAmount

    /* ─────────────────────────────────────────────────────────────────────
       NET PAY
       netPay = grossSalary − totalDeduction + totalAdditions
    ───────────────────────────────────────────────────────────────────── */
    netSalary: { type: Number, required: true, min: 0 },

    /* ── Status ── */
    status: {
      type: String,
      enum: ["processed", "revised"],
      default: "processed",
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

/* ── Indexes ── */
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ month: 1, year: 1 });
payrollSchema.index({ employeeId: 1 });

const Payroll = model("Payroll", payrollSchema);

export default Payroll;
