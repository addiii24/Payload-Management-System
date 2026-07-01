/**
 * @file settingsService.js
 * @description API service functions for the Settings module.
 *
 *  All PUT requests send multipart/form-data so image files can be included
 *  alongside text fields in a single request.
 */

import api from "../api/api.js";

// ─── Company Profile ─────────────────────────────────────────────────────────

/** Fetch the singleton company profile. Returns null if not yet configured. */
export const getCompanyProfile = async () => {
  const res = await api.get("/api/settings/company-profile");
  return res.data; // { success, data }
};

/**
 * Create or update the company profile.
 * @param {FormData} formData - Includes text fields and optional image files
 *   (companyLogo, companySeal).
 */
export const upsertCompanyProfile = async (formData) => {
  const res = await api.put("/api/settings/company-profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ─── Authorized Signature ─────────────────────────────────────────────────────

/** Fetch the singleton authorized signature. Returns null if not yet configured. */
export const getAuthorizedSignature = async () => {
  const res = await api.get("/api/settings/authorized-signature");
  return res.data;
};

/**
 * Create or update the authorized signature.
 * @param {FormData} formData - Includes text fields and optional signatureImage file.
 */
export const upsertAuthorizedSignature = async (formData) => {
  const res = await api.put("/api/settings/authorized-signature", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ─── Branding ─────────────────────────────────────────────────────────────────

/** Fetch the singleton branding configuration. Returns null if not yet configured. */
export const getBranding = async () => {
  const res = await api.get("/api/settings/branding");
  return res.data;
};

/**
 * Create or update the branding configuration.
 * @param {FormData} formData - Includes primaryThemeColor and optional image files
 *   (primaryLogo, darkLogo, watermarkLogo).
 */
export const upsertBranding = async (formData) => {
  const res = await api.put("/api/settings/branding", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
