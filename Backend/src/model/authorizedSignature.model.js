/**
 * @file authorizedSignature.model.js
 * @description Mongoose schema for the Authorized Signature block that appears
 *              on payslips and other HR documents.
 *
 *  Singleton document — only one active signature should exist.
 *  Use AuthorizedSignature.findOneAndUpdate({}, data, { upsert: true, new: true })
 *  to create-or-update.
 *
 *  signatureImage is stored as a Base64 Data URI string.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const authorizedSignatureSchema = new Schema(
  {
    /** Full name of the signing authority */
    authorityName: {
      type: String,
      trim: true,
      default: "",
    },

    /** Designation / title of the signing authority e.g. "HR Manager" */
    authorityDesignation: {
      type: String,
      trim: true,
      default: "",
    },

    /**
     * Signature image stored as a Base64 Data URI.
     * e.g. "data:image/png;base64,..."
     * Empty string means no signature image set.
     */
    signatureImage: {
      type: String,
      default: "",
    },

    /**
     * Footer message printed at the bottom of payslips.
     * e.g. "This is a system-generated payslip."
     */
    footerMessage: {
      type: String,
      trim: true,
      default: "This is a system-generated payslip and does not require a physical signature.",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const AuthorizedSignature = model("AuthorizedSignature", authorizedSignatureSchema);

export default AuthorizedSignature;
