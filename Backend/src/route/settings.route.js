/**
 * @file settings.route.js
 * @description Express router for all Settings endpoints.
 *
 *  Base path (mounted in App.js): /api/settings
 *
 *  Company Profile:
 *    GET  /api/settings/company-profile          → getCompanyProfile
 *    PUT  /api/settings/company-profile          → upsertCompanyProfile
 *
 *  Authorized Signature:
 *    GET  /api/settings/authorized-signature     → getAuthorizedSignature
 *    PUT  /api/settings/authorized-signature     → upsertAuthorizedSignature
 *
 *  Branding:
 *    GET  /api/settings/branding                 → getBranding
 *    PUT  /api/settings/branding                 → upsertBranding
 *
 *  All PUT endpoints accept multipart/form-data (text fields + optional images).
 *  Images are handled by multer memory storage and converted to Base64 in the
 *  controllers — no disk writes.
 *
 *  Allowed image mime types: image/jpeg, image/png, image/webp, image/svg+xml
 *  Max file size per image: 2 MB
 */

import express from "express";
import multer  from "multer";

import {
  getCompanyProfile,
  upsertCompanyProfile,
} from "../controller/companyProfile.controller.js";

import {
  getAuthorizedSignature,
  upsertAuthorizedSignature,
} from "../controller/authorizedSignature.controller.js";

import {
  getBranding,
  upsertBranding,
} from "../controller/branding.controller.js";

const router = express.Router();

// ─── Multer: memory storage, image files only, 2 MB per file ─────────────────
const imageFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WEBP, or SVG images are accepted."), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: imageFilter,
});

/** Wrap multer to return JSON errors instead of default Express error page */
const multerFields = (fields) => (req, res, next) => {
  upload.fields(fields)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "Image file must be under 2 MB." });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// ─── Company Profile ──────────────────────────────────────────────────────────
router.get(
  "/company-profile",
  getCompanyProfile
);

router.put(
  "/company-profile",
  multerFields([
    { name: "companyLogo", maxCount: 1 },
    { name: "companySeal", maxCount: 1 },
  ]),
  upsertCompanyProfile
);

// ─── Authorized Signature ─────────────────────────────────────────────────────
router.get(
  "/authorized-signature",
  getAuthorizedSignature
);

router.put(
  "/authorized-signature",
  multerFields([
    { name: "signatureImage", maxCount: 1 },
  ]),
  upsertAuthorizedSignature
);

// ─── Branding ─────────────────────────────────────────────────────────────────
router.get(
  "/branding",
  getBranding
);

router.put(
  "/branding",
  multerFields([
    { name: "primaryLogo",    maxCount: 1 },
    { name: "darkLogo",       maxCount: 1 },
    { name: "watermarkLogo",  maxCount: 1 },
  ]),
  upsertBranding
);

export default router;
