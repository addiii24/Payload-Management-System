/**
 * @file auth.controller.js
 * @description Single-admin authentication controller.
 *
 *  Credentials are stored ONLY in backend .env — no database users.
 *  Flow:  POST /api/auth/login  →  compare env vars  →  sign JWT  →  return token
 */

import jwt from "jsonwebtoken";
import { sendSuccess, sendError } from "../util/apiError.js";

/**
 * @desc    Admin login
 * @route   POST /api/auth/login
 * @access  Public
 *
 * Expected body: { username: string, password: string }
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // ── 1. Basic input validation ────────────────────────────────────────────
    if (!username || !password) {
      return sendError(res, 400, "Username and password are required.");
    }

    // ── 2. Compare against env-stored credentials ────────────────────────────
    const isUsernameValid = username === process.env.ADMIN_USERNAME;
    const isPasswordValid = password === process.env.ADMIN_PASSWORD;

    if (!isUsernameValid || !isPasswordValid) {
      // Return a generic message — don't reveal which field was wrong
      return sendError(res, 401, "Invalid username or password.");
    }

    // ── 3. Sign JWT ──────────────────────────────────────────────────────────
    const payload = {
      role: "admin",
      username: process.env.ADMIN_USERNAME,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "8h", // 8-hour session by default
    });

    // ── 4. Respond ───────────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (err) {
    console.error("[auth/login]", err);
    return sendError(res, 500, "Authentication failed. Please try again.");
  }
};

/**
 * @desc    Verify token validity (optional utility endpoint)
 * @route   GET /api/auth/verify
 * @access  Protected (requires verifyToken middleware)
 */
export const verifyToken = (_req, res) => {
  // If the request reaches here, verifyToken middleware already validated it
  return sendSuccess(res, 200, "Token is valid.", { role: "admin" });
};
