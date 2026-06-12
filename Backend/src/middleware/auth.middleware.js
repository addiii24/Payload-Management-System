/**
 * @file auth.middleware.js
 * @description JWT verification middleware.
 *
 *  Attach this to any route that should require authentication.
 *  Usage in a router:
 *    import { verifyToken } from "../middleware/auth.middleware.js";
 *    router.get("/protected", verifyToken, controller);
 *
 *  Expected header:
 *    Authorization: Bearer <token>
 */

import jwt from "jsonwebtoken";
import { sendError } from "../util/apiError.js";

/**
 * Express middleware that validates the JWT in the Authorization header.
 * Attaches the decoded payload to `req.user` on success.
 *
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const verifyToken = (req, res, next) => {
  try {
    // ── 1. Extract the token ─────────────────────────────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendError(
        res,
        401,
        "Access denied. No token provided. Please log in."
      );
    }

    const token = authHeader.split(" ")[1]; // "Bearer <token>"

    if (!token) {
      return sendError(res, 401, "Access denied. Malformed token.");
    }

    // ── 2. Verify & decode ───────────────────────────────────────────────────
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded payload (role, username, iat, exp) to the request
    req.user = decoded;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return sendError(res, 401, "Session expired. Please log in again.");
    }
    if (err.name === "JsonWebTokenError") {
      return sendError(res, 401, "Invalid token. Please log in again.");
    }
    console.error("[verifyToken middleware]", err);
    return sendError(res, 500, "Authentication error. Please try again.");
  }
};
