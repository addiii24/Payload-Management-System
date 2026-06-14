/**
 * @file payroll.model.js
 * @description Mongoose schema for the Payroll collection.
 *
 *  One document = one employee's payroll for one month/year.
 *  A compound unique index on (employeeId, month, year) prevents
 *  double-processing the same employee for the same pay period.
 *
 *  Design rules from project-context.md:
 *    - All deductions stored as percentages AND computed amounts.
 *    - Nothing hardcoded — values come from DepartmentPolicy at run time.
 *    - PDF is NOT stored here; generated on demand by a separate service.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

/* ── Sub-schema: a single applied deduction line ── */
const appliedDeductionSchema = new Schema(
  {
    /** Deduction label, e.g. "PF", "ESI", "Professional Tax" */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    /** Percentage as stored in DepartmentPolicy at generation time */
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    /** Computed rupee amount = (percentage / 100) * grossSalary */
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }   // no sub-id needed; deductions are append-only snapshots
);

/* ── Main payroll schema ── */
const payrollSchema = new Schema(
  {
    /** Reference to the Employee document */
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee ID is required"],
    },

    /** Snapshot of employee name at generation time (survives employee edits) */
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },

    /** Snapshot of human-readable employee ID (e.g. "EMP001") */
    employeeCode: {
      type: String,
      required: true,
      trim: true,
    },

    /** Department name at generation time */
    department: {
      type: String,
      required: true,
      trim: true,
    },

    /** Designation at generation time */
    designation: {
      type: String,
      required: true,
      trim: true,
    },

    /** Calendar month (1 = January … 12 = December) */
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    /** 4-digit calendar year, e.g. 2026 */
    year: {
      type: Number,
      required: true,
      min: 2000,
    },

    /** Basic salary used as the base for all percentage calculations */
    grossSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * Snapshot of every deduction applied at generation time.
     * Stored so that historical payslips remain accurate even after
     * policy changes.
     */
    deductions: {
      type: [appliedDeductionSchema],
      default: [],
    },

    /** Sum of all deduction amounts */
    totalDeduction: {
      type: Number,
      required: true,
      min: 0,
    },

    /** grossSalary − totalDeduction */
    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * Processing status:
     *   "processed"  – normal generated record
     *   "revised"    – regenerated after an earlier version existed
     */
    status: {
      type: String,
      enum: ["processed", "revised"],
      default: "processed",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/* ── Indexes ── */

// Prevent generating payroll twice for the same employee+period
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

// Fast lookups by period (for "get all payrolls for June 2026")
payrollSchema.index({ month: 1, year: 1 });

// Fast lookups by employee (for payslip history)
payrollSchema.index({ employeeId: 1 });

const Payroll = model("Payroll", payrollSchema);

export default Payroll;
