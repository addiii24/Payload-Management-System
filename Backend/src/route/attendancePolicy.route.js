/**
 * @file attendancePolicy.route.js
 * @description Express router for the Department Attendance Policy resource.
 *
 *  Base path (mounted in App.js): /api/attendance-policy
 *
 *  Routes:
 *    POST   /api/attendance-policy                    → createOrUpdatePolicy  (upsert)
 *    GET    /api/attendance-policy                    → getAllPolicies
 *    GET    /api/attendance-policy/:departmentId      → getPolicyByDepartment
 *    PUT    /api/attendance-policy/:departmentId      → updatePolicy
 *    DELETE /api/attendance-policy/:departmentId      → deletePolicy
 */

import express from "express";
import {
  createOrUpdatePolicy,
  getAllPolicies,
  getPolicyByDepartment,
  updatePolicy,
  deletePolicy,
} from "../controller/attendancePolicy.controller.js";

const router = express.Router();

// ── Collection ────────────────────────────────────────────────────────────────
router.route("/").post(createOrUpdatePolicy).get(getAllPolicies);

// ── Document (by departmentId) ────────────────────────────────────────────────
router
  .route("/:departmentId")
  .get(getPolicyByDepartment)
  .put(updatePolicy)
  .delete(deletePolicy);

export default router;
