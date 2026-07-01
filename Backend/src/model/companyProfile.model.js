/**
 * @file companyProfile.model.js
 * @description Mongoose schema for Company Profile.
 *
 *  Singleton document — only one record should exist.
 *  Use CompanyProfile.findOneAndUpdate({}, data, { upsert: true, new: true })
 *  to create-or-update.
 *
 *  Images (companyLogo, companySeal) are stored as Base64 Data URI strings
 *  to avoid disk writes and stay consistent with the project's in-memory
 *  PDF generation approach.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const companyProfileSchema = new Schema(
  {
    /** Company trading / legal name */
    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    /** Factory / registered address (shown on payslips) */
    companyAddress: {
      type: String,
      trim: true,
      default: "",
    },

    /** Corporate / head-office address */
    corporateAddress: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    country: {
      type: String,
      trim: true,
      default: "India",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    /** Optional company website */
    website: {
      type: String,
      trim: true,
      default: "",
    },

    /** GSTIN — optional */
    gstNumber: {
      type: String,
      trim: true,
      default: "",
    },

    /** PAN — optional */
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    /**
     * Company logo stored as a Base64 Data URI.
     * e.g. "data:image/png;base64,iVBORw0KGgo..."
     * Empty string means no logo set.
     */
    companyLogo: {
      type: String,
      default: "",
    },

    /**
     * Company seal / stamp — optional, same Base64 convention.
     */
    companySeal: {
      type: String,
      default: "",
    },

    /**
     * Financial year label e.g. "2025-2026"
     */
    financialYear: {
      type: String,
      trim: true,
      default: "",
    },

    /**
     * ISO 4217 currency code e.g. "INR"
     */
    currency: {
      type: String,
      trim: true,
      default: "INR",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const CompanyProfile = model("CompanyProfile", companyProfileSchema);

export default CompanyProfile;
