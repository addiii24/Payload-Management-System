/**
 * @file apiError.js
 * @description Reusable helpers for consistent JSON error / success responses.
 */

/**
 * Send a standardised SUCCESS response.
 * @param {import("express").Response} res
 * @param {number}  statusCode  HTTP status code (default 200)
 * @param {string}  message     Human-readable message
 * @param {*}       data        Payload to return (optional)
 */
export const sendSuccess = (res, statusCode = 200, message = "Success", data = null) => {
  const body = { success: true, message };
  if (data !== null && data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
};

/**
 * Send a standardised ERROR response.
 * @param {import("express").Response} res
 * @param {number}  statusCode  HTTP status code (default 500)
 * @param {string}  message     Human-readable error message
 */
export const sendError = (res, statusCode = 500, message = "Internal Server Error") => {
  return res.status(statusCode).json({ success: false, message });
};

/**
 * Determine whether an error thrown by Mongoose is a duplicate-key error
 * (code 11000 / 11001).
 * @param {Error} err
 * @returns {boolean}
 */
export const isDuplicateKeyError = (err) =>
  err.code === 11000 || err.code === 11001;

/**
 * Extract a user-friendly message from a Mongoose duplicate-key error.
 * @param {Error} err
 * @returns {string}
 */
export const duplicateKeyMessage = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || "field";
  const value = err.keyValue?.[field] || "";
  return `Duplicate value: '${value}' already exists for field '${field}'.`;
};
