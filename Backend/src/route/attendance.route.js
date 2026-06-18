/**
 * @file attendance.route.js
 * @description Express Router for Attendance CRUD and query operations.
 *
 *  Base path (mounted in App.js): /api/attendance
 *
 *  Routes:
 *    POST   /api/attendance                         → createAttendance
 *    GET    /api/attendance                         → getAttendances
 *    GET    /api/attendance/employee/:employeeId    → getEmployeeAttendance
 *    GET    /api/attendance/:id                     → getAttendanceById
 *    PUT    /api/attendance/:id                     → updateAttendance
 *    DELETE /api/attendance/:id                     → deleteAttendance
 */

import express from "express";
import {
  createAttendance,
  getAttendances,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getEmployeeAttendance,
} from "../controller/attendance.controller.js";

const router = express.Router();

// ── Specific Query routes (declared first to avoid treating /employee as :id parameter) ──
router.get("/employee/:employeeId", getEmployeeAttendance);

// ── Collection level CRUD ──
router
  .route("/")
  .post(createAttendance)
  .get(getAttendances);

// ── Document level CRUD ──
router
  .route("/:id")
  .get(getAttendanceById)
  .put(updateAttendance)
  .delete(deleteAttendance);

export default router;
