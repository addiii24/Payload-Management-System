/**
 * @file employee.route.js
 * @description Express Router for Employee CRUD endpoints.
 *
 *  Base path (mounted in app.js): /api/employees
 *
 *  Routes:
 *    POST   /api/employees          → createEmployee
 *    GET    /api/employees          → getEmployees
 *    GET    /api/employees/:id      → getEmployeeById
 *    PUT    /api/employees/:id      → updateEmployee
 *    DELETE /api/employees/:id      → deleteEmployee
 */

import express from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controller/employee.controller.js";

const router = express.Router();

// ─────────────────────────────────────────────
//  Collection routes  →  /api/employees
// ─────────────────────────────────────────────
router
  .route("/")
  .post(createEmployee)    // POST   /api/employees
  .get(getEmployees);      // GET    /api/employees

// ─────────────────────────────────────────────
//  Document routes  →  /api/employees/:id
// ─────────────────────────────────────────────
router
  .route("/:id")
  .get(getEmployeeById)    // GET    /api/employees/:id
  .put(updateEmployee)     // PUT    /api/employees/:id
  .delete(deleteEmployee); // DELETE /api/employees/:id

export default router;