/**
 * @file auth.route.js
 * @description Express Router for authentication endpoints.
 *
 *  Base path (mounted in app.js): /api/auth
 *
 *  Routes:
 *    POST /api/auth/login    → login (public)
 *    GET  /api/auth/verify   → verifyToken (protected — useful for frontend token refresh checks)
 */

import express from "express";
import { login, verifyToken as verifyTokenController } from "../controller/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// ─────────────────────────────────────────────
//  Public Routes
// ─────────────────────────────────────────────

/** POST /api/auth/login */
router.post("/login", login);

// ─────────────────────────────────────────────
//  Protected Routes
// ─────────────────────────────────────────────

/** GET /api/auth/verify — frontend uses this to silently validate a stored token */
router.get("/verify", verifyToken, verifyTokenController);

export default router;
