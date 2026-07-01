/**
 * @file companyProfile.controller.js
 * @description CRUD controller for the Company Profile singleton.
 *
 *  Endpoints (mounted via settings.route.js):
 *    GET /api/settings/company-profile        → getCompanyProfile
 *    PUT /api/settings/company-profile        → upsertCompanyProfile  (multipart/form-data)
 *
 *  Image uploads (companyLogo, companySeal) are accepted as file fields via
 *  multer memory storage and converted to Base64 Data URI strings before
 *  saving to MongoDB — no disk writes.
 */

import CompanyProfile from "../model/companyProfile.model.js";
import { sendSuccess, sendError } from "../util/apiError.js";

/* ══════════════════════════════════════════════════════════════
   GET COMPANY PROFILE
   GET /api/settings/company-profile
══════════════════════════════════════════════════════════════ */
export const getCompanyProfile = async (_req, res) => {
  try {
    const profile = await CompanyProfile.findOne().lean();
    return sendSuccess(res, 200, "Company profile fetched.", profile ?? null);
  } catch (err) {
    console.error("[getCompanyProfile]", err);
    return sendError(res, 500, "Failed to fetch company profile.");
  }
};

/* ══════════════════════════════════════════════════════════════
   UPSERT COMPANY PROFILE
   PUT /api/settings/company-profile
══════════════════════════════════════════════════════════════ */
export const upsertCompanyProfile = async (req, res) => {
  try {
    // ── Build the update payload from text fields ────────────
    const {
      companyName,
      companyAddress,
      corporateAddress,
      state,
      country,
      phone,
      email,
      website,
      gstNumber,
      panNumber,
      financialYear,
      currency,
    } = req.body;

    const update = {
      ...(companyName    !== undefined && { companyName }),
      ...(companyAddress !== undefined && { companyAddress }),
      ...(corporateAddress !== undefined && { corporateAddress }),
      ...(state          !== undefined && { state }),
      ...(country        !== undefined && { country }),
      ...(phone          !== undefined && { phone }),
      ...(email          !== undefined && { email }),
      ...(website        !== undefined && { website }),
      ...(gstNumber      !== undefined && { gstNumber }),
      ...(panNumber      !== undefined && { panNumber }),
      ...(financialYear  !== undefined && { financialYear }),
      ...(currency       !== undefined && { currency }),
    };

    // ── Handle image uploads (multer provides req.files) ─────
    if (req.files) {
      if (req.files.companyLogo?.[0]) {
        const file = req.files.companyLogo[0];
        update.companyLogo = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      }
      if (req.files.companySeal?.[0]) {
        const file = req.files.companySeal[0];
        update.companySeal = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      }
    }

    // ── Allow clearing images by passing empty string ─────────
    if (req.body.clearCompanyLogo === "true") update.companyLogo = "";
    if (req.body.clearCompanySeal  === "true") update.companySeal = "";

    // ── Upsert (create if not exists, update if exists) ───────
    const profile = await CompanyProfile.findOneAndUpdate(
      {},           // filter — match any (singleton pattern)
      { $set: update },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, 200, "Company profile saved.", profile);
  } catch (err) {
    console.error("[upsertCompanyProfile]", err);
    return sendError(res, 500, "Failed to save company profile.");
  }
};
