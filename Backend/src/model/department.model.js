/**
 * @file department.model.js
 * @description Mongoose schema for the Department collection.
 *
 *  A department represents a business unit (e.g. Production, IT, HR).
 *  Its deduction policy lives in a separate DepartmentPolicy document.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const departmentSchema = new Schema(
  {
    /** Human-readable department name — must be unique */
    departmentName: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
    },

    /** Optional description / notes */
    description: {
      type: String,
      trim: true,
      default: "",
    },

    /** Soft-delete / deactivation flag */
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Department = model("Department", departmentSchema);

export default Department;
