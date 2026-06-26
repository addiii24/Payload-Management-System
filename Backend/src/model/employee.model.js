/**
 * @file employee.model.js
 * @description Mongoose schema and model for the Employee collection.
 *              Covers all core HR fields required for the Payroll Management System.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

// ─────────────────────────────────────────────
//  Employee Schema Definition
// ─────────────────────────────────────────────
const employeeSchema = new Schema(
  {
    /** Unique human-readable employee identifier  e.g. "EMP001" */
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      trim: true,
    },

    /** Full legal name of the employee */
    name: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true,
    },

    /** Department the employee belongs to  e.g. "IT", "HR", "Finance" */
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },

    /** Job title / designation  e.g. "Developer", "Manager" */
    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },

    /** Date the employee officially joined the organisation */
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },

    /** Monthly basic salary (in INR). Must be non-negative. */
    basicSalary: {
      type: Number,
      required: [true, "Basic salary is required"],
      min: [0, "Basic salary cannot be negative"],
    },

    /** Provident Fund account number  optional */
    pfNumber: {
      type: String,
      trim: true,
      default: null,
    },

    /** Employee State Insurance number  optional */
    esiNumber: {
      type: String,
      trim: true,
      default: null,
    },

    /** Employee benefits eligibility details */
    benefits: {
      canteen: {
        status: {
          type: String,
          enum: ["Not Enrolled", "Per Day Deduction", "Fixed Monthly Deduction"],
          default: "Not Enrolled",
        },
        effectiveFrom: {
          type: Date,
          default: null,
        },
      },
      transport: {
        type: Boolean,
        default: false,
      },
      hostel: {
        type: Boolean,
        default: false,
      },
      uniform: {
        type: Boolean,
        default: false,
      },
      attendanceIncentive: {
        type: Boolean,
        default: false,
      },
      nightShiftMeal: {
        type: Boolean,
        default: false,
      },
    },

    /** Generic metadata store for future modules without database migrations */
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    /**
     * Automatically adds `createdAt` and `updatedAt` fields
     * managed by Mongoose on every save / update.
     */
    timestamps: true,

    /** Remove __v version key from query results */
    versionKey: false,
  }
);

// ─────────────────────────────────────────────
//  Indexes
// ─────────────────────────────────────────────

// employeeId already has a unique index from `unique: true` above.
// Add a compound text-search index for name + department lookups.
employeeSchema.index({ name: "text", department: "text" });

// ─────────────────────────────────────────────
//  Model Export
// ─────────────────────────────────────────────
const Employee = model("Employee", employeeSchema);

export default Employee;
