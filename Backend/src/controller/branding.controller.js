/**
 * @file branding.controller.js
 * @description CRUD controller for the Branding singleton.
 *
 *  Endpoints (mounted via settings.route.js):
 *    GET /api/settings/branding        → getBranding
 *    PUT /api/settings/branding        → upsertBranding  (multipart/form-data)
 *
 *  Logo images (primaryLogo, darkLogo, watermarkLogo) are accepted via
 *  multer memory storage and stored as Base64 Data URI strings.
 */

import Branding from "../model/branding.model.js";
import { sendSuccess, sendError } from "../util/apiError.js";

/* ══════════════════════════════════════════════════════════════
   GET BRANDING
   GET /api/settings/branding
══════════════════════════════════════════════════════════════ */
export const getBranding = async (_req, res) => {
  try {
    const branding = await Branding.findOne().lean();
    return sendSuccess(res, 200, "Branding fetched.", branding ?? null);
  } catch (err) {
    console.error("[getBranding]", err);
    return sendError(res, 500, "Failed to fetch branding.");
  }
};

/* ══════════════════════════════════════════════════════════════
   UPSERT BRANDING
   PUT /api/settings/branding
══════════════════════════════════════════════════════════════ */
export const upsertBranding = async (req, res) => {
  try {
    const { primaryThemeColor } = req.body;

    const update = {
      ...(primaryThemeColor !== undefined && { primaryThemeColor }),
    };

    // ── Handle logo image uploads ─────────────────────────────
    if (req.files) {
      const imageFields = ["primaryLogo", "darkLogo", "watermarkLogo"];
      imageFields.forEach((field) => {
        if (req.files[field]?.[0]) {
          const file = req.files[field][0];
          update[field] = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        }
      });
    }

    // ── Allow clearing individual logos ───────────────────────
    if (req.body.clearPrimaryLogo   === "true") update.primaryLogo   = "";
    if (req.body.clearDarkLogo      === "true") update.darkLogo      = "";
    if (req.body.clearWatermarkLogo === "true") update.watermarkLogo = "";

    const branding = await Branding.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, 200, "Branding saved.", branding);
  } catch (err) {
    console.error("[upsertBranding]", err);
    return sendError(res, 500, "Failed to save branding.");
  }
};
