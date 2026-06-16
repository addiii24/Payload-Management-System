/**
 * @file shift.model.js
 * @description Mongoose schema for the Shift master collection.
 *
 *  A Shift defines a work period (e.g. Night Shift 22:00–06:00) and
 *  the allowance an employee earns for each day they work in it.
 *  Allowance amounts are configurable from the UI — nothing hardcoded.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const shiftSchema = new Schema(
  {
    /** Human-readable shift name, e.g. "Night Shift", "Evening Shift" */
    shiftName: {
      type: String,
      required: [true, "Shift name is required"],
      trim: true,
    },

    /** Short uppercase code, e.g. "NS", "ES", "MS" — must be unique */
    shiftCode: {
      type: String,
      required: [true, "Shift code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    /** Shift start time as HH:MM string, e.g. "22:00" */
    startTime: {
      type: String,
      trim: true,
      default: "",
    },

    /** Shift end time as HH:MM string, e.g. "06:00" */
    endTime: {
      type: String,
      trim: true,
      default: "",
    },

    /**
     * Rupee allowance credited per day worked in this shift.
     * NEVER hardcode this — always read from DB.
     */
    allowancePerDay: {
      type: Number,
      required: [true, "Allowance per day is required"],
      min: [0, "Allowance cannot be negative"],
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

const Shift = model("Shift", shiftSchema);

export default Shift;
