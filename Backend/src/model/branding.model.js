/**
 * @file branding.model.js
 * @description Mongoose schema for Company Branding assets.
 *
 *  Singleton document — only one branding configuration should exist.
 *  Use Branding.findOneAndUpdate({}, data, { upsert: true, new: true })
 *  to create-or-update.
 *
 *  All logo fields are stored as Base64 Data URI strings.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const brandingSchema = new Schema(
  {
    /**
     * Primary company logo (light background variant).
     * Base64 Data URI — e.g. "data:image/png;base64,..."
     */
    primaryLogo: {
      type: String,
      default: "",
    },

    /**
     * Dark / inverted logo variant — optional.
     * Used for dark backgrounds in reports and PDFs.
     */
    darkLogo: {
      type: String,
      default: "",
    },

    /**
     * Watermark logo — optional.
     * Semi-transparent version for page backgrounds in PDFs.
     */
    watermarkLogo: {
      type: String,
      default: "",
    },

    /**
     * Primary brand theme colour as a hex string e.g. "#6366f1".
     * Future PDFs and reports will use this colour for headings and accents.
     */
    primaryThemeColor: {
      type: String,
      trim: true,
      default: "#6366f1",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Branding = model("Branding", brandingSchema);

export default Branding;
