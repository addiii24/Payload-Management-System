/**
 * @file department.route.js
 * @description Express Router for Department CRUD.
 *
 *  Base path (mounted in App.js): /api/departments
 *
 *  Routes:
 *    POST   /api/departments          → createDepartment
 *    GET    /api/departments          → getDepartments
 *    GET    /api/departments/:id      → getDepartmentById
 *    PUT    /api/departments/:id      → updateDepartment
 *    DELETE /api/departments/:id      → deleteDepartment
 *
 *  Policy sub-routes (nested):
 *    GET    /api/departments/:id/policy                         → getPolicy
 *    PUT    /api/departments/:id/policy                         → savePolicy (bulk)
 *    POST   /api/departments/:id/policy/deductions              → addDeduction
 *    PUT    /api/departments/:id/policy/deductions/:did         → updateDeduction
 *    DELETE /api/departments/:id/policy/deductions/:did         → deleteDeduction
 */

import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../controller/department.controller.js";
import {
  getPolicy_,
  savePolicy,
  addDeduction,
  updateDeduction,
  deleteDeduction,
} from "../controller/departmentPolicy.controller.js";

const router = express.Router();

// ── Department CRUD ──────────────────────────────────────────────
router.route("/").post(createDepartment).get(getDepartments);
router
  .route("/:id")
  .get(getDepartmentById)
  .put(updateDepartment)
  .delete(deleteDepartment);

// ── Department Policy (nested under /:id) ───────────────────────
router.route("/:id/policy").get(getPolicy_).put(savePolicy);
router.route("/:id/policy/deductions").post(addDeduction);
router
  .route("/:id/policy/deductions/:did")
  .put(updateDeduction)
  .delete(deleteDeduction);

export default router;
