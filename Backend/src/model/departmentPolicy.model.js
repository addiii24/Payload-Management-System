/**
 * @file departmentPolicy.model.js
 * @description Mongoose schema for the DepartmentPolicy collection.
 *
 *  One policy document per department.
 *  The deductions array stores named percentage-based deductions
 *  (e.g. PF 12%, ESI 0.75%) that are read by the payroll engine.
 *
 *  Design Rule: nothing is hardcoded — all values are configurable from the UI.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

/* ── Sub-schema for individual deduction entries ── */
const deductionSchema = new Schema(
  {
    /** Deduction label shown on payslip, e.g. "PF", "ESI", "Professional Tax" */
    name: {
      type: String,
      required: [true, "Deduction name is required"],
      trim: true,
    },

    /** Percentage of gross salary to deduct (0 – 100) */
    percentage: {
      type: Number,
      required: [true, "Percentage is required"],
      min: [0, "Percentage cannot be negative"],
      max: [100, "Percentage cannot exceed 100"],
    },
  },
  { _id: true }          // keep sub-document _id so we can patch by id
);

/* ── Main policy schema ── */
const departmentPolicySchema = new Schema(
  {
    /** Reference to the parent department */
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department ID is required"],
      unique: true,           // one policy per department
    },

    /** List of deductions applied to employees in this department */
    deductions: {
      type: [deductionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const DepartmentPolicy = model("DepartmentPolicy", departmentPolicySchema);

export default DepartmentPolicy;
