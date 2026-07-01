/**
 * @file authorizedSignature.controller.js
 * @description CRUD controller for the Authorized Signature singleton.
 *
 *  Endpoints (mounted via settings.route.js):
 *    GET /api/settings/authorized-signature        → getAuthorizedSignature
 *    PUT /api/settings/authorized-signature        → upsertAuthorizedSignature  (multipart/form-data)
 *
 *  The signatureImage is accepted as a file upload via multer memory storage
 *  and stored as a Base64 Data URI — no disk writes.
 */

import AuthorizedSignature from "../model/authorizedSignature.model.js";
import { sendSuccess, sendError } from "../util/apiError.js";

/* ══════════════════════════════════════════════════════════════
   GET AUTHORIZED SIGNATURE
   GET /api/settings/authorized-signature
══════════════════════════════════════════════════════════════ */
export const getAuthorizedSignature = async (_req, res) => {
  try {
    const signature = await AuthorizedSignature.findOne().lean();
    return sendSuccess(res, 200, "Authorized signature fetched.", signature ?? null);
  } catch (err) {
    console.error("[getAuthorizedSignature]", err);
    return sendError(res, 500, "Failed to fetch authorized signature.");
  }
};

/* ══════════════════════════════════════════════════════════════
   UPSERT AUTHORIZED SIGNATURE
   PUT /api/settings/authorized-signature
══════════════════════════════════════════════════════════════ */
export const upsertAuthorizedSignature = async (req, res) => {
  try {
    const { authorityName, authorityDesignation, footerMessage } = req.body;

    const update = {
      ...(authorityName        !== undefined && { authorityName }),
      ...(authorityDesignation !== undefined && { authorityDesignation }),
      ...(footerMessage        !== undefined && { footerMessage }),
    };

    // ── Handle signature image upload ─────────────────────────
    if (req.files?.signatureImage?.[0]) {
      const file = req.files.signatureImage[0];
      update.signatureImage = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    }

    // ── Allow clearing the image by sending clearSignatureImage=true ──
    if (req.body.clearSignatureImage === "true") update.signatureImage = "";

    const signature = await AuthorizedSignature.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, 200, "Authorized signature saved.", signature);
  } catch (err) {
    console.error("[upsertAuthorizedSignature]", err);
    return sendError(res, 500, "Failed to save authorized signature.");
  }
};
