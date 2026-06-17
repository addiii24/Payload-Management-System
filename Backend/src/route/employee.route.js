/**
 * @file employee.route.js
 * @description Express Router for Employee CRUD + Bulk Import endpoints.
 *
 *  Base path (mounted in app.js): /api/employees
 *
 *  CRUD Routes:
 *    POST   /api/employees          → createEmployee
 *    GET    /api/employees          → getEmployees
 *    GET    /api/employees/:id      → getEmployeeById
 *    PUT    /api/employees/:id      → updateEmployee
 *    DELETE /api/employees/:id      → deleteEmployee
 *
 *  Bulk Import Routes:
 *    GET    /api/employees/template               → downloadEmployeeTemplate
 *    POST   /api/employees/bulk-import            → validateBulkImport (multer)
 *    POST   /api/employees/bulk-import/confirm    → confirmBulkImport
 *
 *  IMPORTANT: Specific paths (/template, /bulk-import, /bulk-import/confirm)
 *  must be declared BEFORE /:id to prevent Express treating them as :id params.
 */

import express  from "express";
import multer   from "multer";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  downloadEmployeeTemplate,
  validateBulkImport,
  confirmBulkImport,
} from "../controller/employee.controller.js";

const router = express.Router();

// ── Multer: memory storage, xlsx only, max 5MB ───────────────
const xlsxFilter = (req, file, cb) => {
  if (
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.originalname.endsWith(".xlsx")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only .xlsx files are accepted"), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: xlsxFilter,
});

// Multer error handler wrapper
const multerMiddleware = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "File size must be under 5MB" });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// ─────────────────────────────────────────────────────────────
//  Specific paths FIRST  →  /api/employees/<specific>
// ─────────────────────────────────────────────────────────────

// GET  /api/employees/template
router.get("/template", downloadEmployeeTemplate);

// POST /api/employees/bulk-import/confirm  (must be before /bulk-import)
router.post("/bulk-import/confirm", confirmBulkImport);

// POST /api/employees/bulk-import
router.post("/bulk-import", multerMiddleware, validateBulkImport);

// ─────────────────────────────────────────────────────────────
//  Collection routes  →  /api/employees
// ─────────────────────────────────────────────────────────────
router
  .route("/")
  .post(createEmployee)    // POST   /api/employees
  .get(getEmployees);      // GET    /api/employees

// ─────────────────────────────────────────────────────────────
//  Document routes  →  /api/employees/:id
// ─────────────────────────────────────────────────────────────
router
  .route("/:id")
  .get(getEmployeeById)    // GET    /api/employees/:id
  .put(updateEmployee)     // PUT    /api/employees/:id
  .delete(deleteEmployee); // DELETE /api/employees/:id

export default router;