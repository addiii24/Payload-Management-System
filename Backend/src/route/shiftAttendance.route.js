/**
 * @file shiftAttendance.route.js
 * @description Express Router for ShiftAttendance CRUD.
 *
 *  Base path (mounted in App.js): /api/shift-attendance
 *
 *  All routes are protected by the JWT auth middleware.
 */

import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  upsertAttendance,
  getAttendance,
  updateAttendance,
  deleteAttendance,
} from "../controller/shiftAttendance.controller.js";

const router = express.Router();

router.use(verifyToken);   // protect all shift-attendance routes

router.route("/").post(upsertAttendance).get(getAttendance);
router.route("/:id").put(updateAttendance).delete(deleteAttendance);

export default router;
