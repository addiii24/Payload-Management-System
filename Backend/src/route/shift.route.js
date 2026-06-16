/**
 * @file shift.route.js
 * @description Express Router for Shift master CRUD.
 *
 *  Base path (mounted in App.js): /api/shifts
 *
 *  All routes are protected by the JWT auth middleware.
 */

import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  createShift,
  getShifts,
  getShiftById,
  updateShift,
  deleteShift,
} from "../controller/shift.controller.js";

const router = express.Router();

router.use(verifyToken);   // protect all shift routes

router.route("/").post(createShift).get(getShifts);
router.route("/:id").get(getShiftById).put(updateShift).delete(deleteShift);

export default router;
