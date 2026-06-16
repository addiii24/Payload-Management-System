/**
 * @file dashboard.route.js
 * @description Route definition for Dashboard statistics.
 */

import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getDashboardStats } from "../controller/dashboard.controller.js";

const router = express.Router();

// Protect all dashboard routes
router.use(verifyToken);

// GET /api/dashboard/stats
router.get("/stats", getDashboardStats);

export default router;
