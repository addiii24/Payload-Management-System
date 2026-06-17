/**
 * @file employee.controller.js
 * @description CRUD controller for the Employee resource.
 *
 *  Responsibilities:
 *    1. Input validation (before hitting the DB)
 *    2. Business logic delegation to Mongoose
 *    3. Consistent JSON response via shared helpers
 *    4. Graceful error handling (validation, duplicate key, not-found, etc.)
 */

import mongoose from "mongoose";
import ExcelJS from "exceljs";
import Employee from "../model/employee.model.js";
import Department from "../model/department.model.js";
import {
  sendSuccess,
  sendError,
  isDuplicateKeyError,
  duplicateKeyMessage,
} from "../util/apiError.js";

// ─────────────────────────────────────────────
//  Local Helpers
// ─────────────────────────────────────────────

/**
 * Validate required fields for employee creation / full update.
 * Returns an array of error strings; empty array means valid.
 * @param {object} body - Request body
 * @returns {string[]}
 */
const validateEmployeeFields = (body) => {
  const errors = [];
  const required = [
    { field: "employeeId",   label: "Employee ID" },
    { field: "name",         label: "Name" },
    { field: "department",   label: "Department" },
    { field: "designation",  label: "Designation" },
    { field: "joiningDate",  label: "Joining Date" },
    { field: "basicSalary",  label: "Basic Salary" },
  ];

  for (const { field, label } of required) {
    const value = body[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`${label} is required.`);
    }
  }

  // basicSalary must be a non-negative number if provided
  if (
    body.basicSalary !== undefined &&
    body.basicSalary !== null &&
    body.basicSalary !== "" &&
    (isNaN(Number(body.basicSalary)) || Number(body.basicSalary) < 0)
  ) {
    errors.push("Basic salary must be a non-negative number.");
  }

  return errors;
};

/**
 * Check whether `id` is a valid Mongoose ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─────────────────────────────────────────────
//  Controllers
// ─────────────────────────────────────────────

/**
 * @desc    Create a new employee
 * @route   POST /api/employees
 * @access  Public (auth will be added later)
 */
export const createEmployee = async (req, res) => {
  try {
    // 1️⃣  Validate required fields
    const errors = validateEmployeeFields(req.body);
    if (errors.length > 0) {
      return sendError(res, 400, errors.join(" "));
    }

    const {
      employeeId,
      name,
      department,
      designation,
      joiningDate,
      basicSalary,
      pfNumber,
      esiNumber,
    } = req.body;

    // 2️⃣  Create & persist the document
    const employee = await Employee.create({
      employeeId,
      name,
      department,
      designation,
      joiningDate,
      basicSalary,
      pfNumber:  pfNumber  || null,
      esiNumber: esiNumber || null,
    });

    return sendSuccess(res, 201, "Employee created successfully.", employee);
  } catch (err) {
    // Duplicate employeeId (unique index violation)
    if (isDuplicateKeyError(err)) {
      return sendError(res, 409, duplicateKeyMessage(err));
    }

    // Mongoose validation errors (schema-level)
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return sendError(res, 400, messages.join(" "));
    }

    console.error("[createEmployee]", err);
    return sendError(res, 500, "Failed to create employee. Please try again.");
  }
};

/**
 * @desc    Retrieve all employees
 * @route   GET /api/employees
 * @access  Public
 */
export const getEmployees = async (req, res) => {
  try {
    // Pagination
    const page  = Math.max(parseInt(req.query.page,  10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const skip  = (page - 1) * limit;

    // Search — case-insensitive across name, employeeId, department
    const search = req.query.search?.trim();
    const filter = search
      ? {
          $or: [
            { name:       { $regex: search, $options: "i" } },
            { employeeId: { $regex: search, $options: "i" } },
            { department: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const [employees, total] = await Promise.all([
      Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Employee.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, "Employees fetched successfully.", {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      employees,
    });
  } catch (err) {
    console.error("[getEmployees]", err);
    return sendError(res, 500, "Failed to fetch employees. Please try again.");
  }
};

/**
 * @desc    Retrieve a single employee by MongoDB ObjectId
 * @route   GET /api/employees/:id
 * @access  Public
 */
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    // Guard: invalid ObjectId format
    if (!isValidObjectId(id)) {
      return sendError(res, 400, `'${id}' is not a valid employee ID.`);
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return sendError(res, 404, "Employee not found.");
    }

    return sendSuccess(res, 200, "Employee fetched successfully.", employee);
  } catch (err) {
    console.error("[getEmployeeById]", err);
    return sendError(res, 500, "Failed to fetch employee. Please try again.");
  }
};

/**
 * @desc    Update an employee by MongoDB ObjectId
 * @route   PUT /api/employees/:id
 * @access  Public
 */
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Guard: invalid ObjectId format
    if (!isValidObjectId(id)) {
      return sendError(res, 400, `'${id}' is not a valid employee ID.`);
    }

    // Prevent accidentally wiping required fields on partial updates:
    // Only validate fields that are explicitly provided in the body.
    const body = req.body;

    if (body.basicSalary !== undefined) {
      if (isNaN(Number(body.basicSalary)) || Number(body.basicSalary) < 0) {
        return sendError(res, 400, "Basic salary must be a non-negative number.");
      }
    }

    // Disallow changing employeeId via PUT to avoid PK mutation issues
    if (body.employeeId) {
      return sendError(
        res,
        400,
        "Changing 'employeeId' is not allowed. Delete and re-create the employee instead."
      );
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      id,
      { $set: body },
      {
        new:          true,   // Return the updated document
        runValidators: true,  // Enforce schema validations on update
      }
    );

    if (!updatedEmployee) {
      return sendError(res, 404, "Employee not found.");
    }

    return sendSuccess(res, 200, "Employee updated successfully.", updatedEmployee);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return sendError(res, 409, duplicateKeyMessage(err));
    }

    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return sendError(res, 400, messages.join(" "));
    }

    console.error("[updateEmployee]", err);
    return sendError(res, 500, "Failed to update employee. Please try again.");
  }
};

/**
 * @desc    Delete an employee by MongoDB ObjectId
 * @route   DELETE /api/employees/:id
 * @access  Public
 */
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Guard: invalid ObjectId format
    if (!isValidObjectId(id)) {
      return sendError(res, 400, `'${id}' is not a valid employee ID.`);
    }

    const deletedEmployee = await Employee.findByIdAndDelete(id);

    if (!deletedEmployee) {
      return sendError(res, 404, "Employee not found.");
    }

    return sendSuccess(
      res,
      200,
      `Employee '${deletedEmployee.name}' (${deletedEmployee.employeeId}) deleted successfully.`,
      { deletedEmployee }
    );
  } catch (err) {
    console.error("[deleteEmployee]", err);
    return sendError(res, 500, "Failed to delete employee. Please try again.");
  }
};

/* ══════════════════════════════════════════════════════════════
   TASK 2 — DOWNLOAD IMPORT TEMPLATE
   GET /api/employees/template
   Returns an .xlsx file with header row + one example row.
══════════════════════════════════════════════════════════════ */
export const downloadEmployeeTemplate = async (req, res) => {
  try {
    const workbook  = new ExcelJS.Workbook();
    const sheet     = workbook.addWorksheet("Employees");

    // ── Column definitions with widths ───────────────────────
    sheet.columns = [
      { header: "Employee ID",    key: "employeeId",   width: 15 },
      { header: "Full Name",      key: "name",         width: 25 },
      { header: "Department",     key: "department",   width: 20 },
      { header: "Designation",    key: "designation",  width: 20 },
      { header: "Joining Date",   key: "joiningDate",  width: 15 },
      { header: "Basic Salary(₹)",key: "basicSalary",  width: 18 },
      { header: "PF Number",      key: "pfNumber",     width: 15 },
      { header: "ESI Number",     key: "esiNumber",    width: 15 },
    ];

    // ── Style header row (Row 1) ─────────────────────────────
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E40AF" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    headerRow.height = 22;

    // ── Add note on E1 (Joining Date column) ────────────────
    sheet.getCell("E1").note = "Format: DD-MM-YYYY";

    // ── Example row (Row 2) ──────────────────────────────────
    sheet.addRow({
      employeeId:  "EMP001",
      name:        "Ramesh Kumar",
      department:  "Production",
      designation: "Operator",
      joiningDate: "01-06-2024",
      basicSalary: 25000,
      pfNumber:    "PF001234",
      esiNumber:   "ESI005678",
    });

    // ── Stream the workbook to response ─────────────────────
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"employee_import_template.xlsx\""
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("[downloadEmployeeTemplate]", err);
    return sendError(res, 500, "Failed to generate template.");
  }
};

/* ══════════════════════════════════════════════════════════════
   TASK 3 — UPLOAD & VALIDATE BULK IMPORT
   POST /api/employees/bulk-import
   Parses uploaded .xlsx, validates rows, returns preview data.
   No rows are saved to DB at this stage.
══════════════════════════════════════════════════════════════ */
export const validateBulkImport = async (req, res) => {
  try {
    // multer sets req.file for memory storage
    if (!req.file) {
      return sendError(res, 400, "No file uploaded.");
    }

    // ── 1. Fetch all active departments → name map ───────────
    const departments = await Department.find({ isActive: true }).select("departmentName");
    const deptMap = {};
    for (const d of departments) {
      deptMap[d.departmentName.toLowerCase()] = d.departmentName; // store canonical name
    }

    // ── 2. Fetch existing employeeIds for duplicate check ────
    const existingEmployees = await Employee.find({}).select("employeeId");
    const existingIds = new Set(existingEmployees.map((e) => e.employeeId));

    // ── 3. Parse Excel ───────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    if (!sheet) {
      return sendError(res, 400, "No data found in file.");
    }

    const valid  = [];
    const errors = [];
    const seenInFile = new Set(); // detect in-file duplicates

    // Row 1 = headers, Row 2 = example → start from Row 3
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return; // skip header + example

      const rawEmployeeId   = String(row.getCell(1).value ?? "").trim();
      const rawName         = String(row.getCell(2).value ?? "").trim();
      const rawDepartment   = String(row.getCell(3).value ?? "").trim();
      const rawDesignation  = String(row.getCell(4).value ?? "").trim();
      const rawJoiningDate  = String(row.getCell(5).value ?? "").trim();
      const rawBasicSalary  = row.getCell(6).value;
      const rawPfNumber     = String(row.getCell(7).value ?? "").trim() || null;
      const rawEsiNumber    = String(row.getCell(8).value ?? "").trim() || null;

      const rowErrors = [];

      // Validate employeeId
      if (!rawEmployeeId) {
        rowErrors.push("Employee ID is required");
      } else if (existingIds.has(rawEmployeeId)) {
        rowErrors.push("Employee ID already exists in DB");
      } else if (seenInFile.has(rawEmployeeId)) {
        rowErrors.push("Duplicate Employee ID within file");
      }

      // Validate name
      if (!rawName) rowErrors.push("Full Name is required");

      // Validate department
      const deptKey = rawDepartment.toLowerCase();
      if (!rawDepartment) {
        rowErrors.push("Department is required");
      } else if (!deptMap[deptKey]) {
        rowErrors.push(`Department "${rawDepartment}" not found`);
      }

      // Validate designation
      if (!rawDesignation) rowErrors.push("Designation is required");

      // Validate joiningDate  format DD-MM-YYYY
      let parsedJoiningDate = null;
      if (!rawJoiningDate) {
        rowErrors.push("Joining Date is required");
      } else {
        // Handle both JS Date objects from Excel and string "DD-MM-YYYY"
        if (rawJoiningDate instanceof Date || (typeof row.getCell(5).value === "object" && row.getCell(5).value !== null)) {
          // ExcelJS may parse date cells into Date objects
          const cellDate = row.getCell(5).value;
          if (cellDate instanceof Date) {
            parsedJoiningDate = cellDate;
          } else {
            rowErrors.push("Invalid Joining Date");
          }
        } else {
          const parts = rawJoiningDate.split("-");
          if (parts.length === 3) {
            const [dd, mm, yyyy] = parts.map(Number);
            const d = new Date(yyyy, mm - 1, dd);
            if (isNaN(d.getTime())) {
              rowErrors.push("Invalid Joining Date (use DD-MM-YYYY)");
            } else {
              parsedJoiningDate = d;
            }
          } else {
            rowErrors.push("Joining Date must be in DD-MM-YYYY format");
          }
        }
      }

      // Validate basicSalary
      const salaryNum = Number(rawBasicSalary);
      if (rawBasicSalary === null || rawBasicSalary === undefined || rawBasicSalary === "") {
        rowErrors.push("Basic Salary is required");
      } else if (isNaN(salaryNum) || salaryNum <= 0) {
        rowErrors.push("Basic Salary must be a positive number");
      }

      if (rowErrors.length > 0) {
        errors.push({
          row:        rowNumber,
          employeeId: rawEmployeeId || "—",
          name:       rawName       || "—",
          department: rawDepartment || "—",
          basicSalary: salaryNum || 0,
          errors:     rowErrors,
        });
      } else {
        seenInFile.add(rawEmployeeId);
        valid.push({
          employeeId:  rawEmployeeId,
          name:        rawName,
          department:  deptMap[deptKey],   // canonical department name
          designation: rawDesignation,
          joiningDate: parsedJoiningDate,
          basicSalary: salaryNum,
          pfNumber:    rawPfNumber,
          esiNumber:   rawEsiNumber,
          _row:        rowNumber,           // for preview only — not stored
        });
      }
    });

    const totalData = valid.length + errors.length;
    if (totalData === 0) {
      return sendError(res, 400, "No data found in file. Make sure you have data starting from Row 3.");
    }

    return sendSuccess(res, 200, "File validated successfully.", {
      valid,
      errors,
      summary: {
        total:      totalData,
        valid:      valid.length,
        errorCount: errors.length,
      },
    });
  } catch (err) {
    console.error("[validateBulkImport]", err);
    return sendError(res, 500, "Failed to parse the uploaded file. Please try again.");
  }
};

/* ══════════════════════════════════════════════════════════════
   TASK 4 — CONFIRM & COMMIT BULK IMPORT
   POST /api/employees/bulk-import/confirm
   Body: { employees: [...valid rows from Task 3] }
   Saves only valid rows to DB.
══════════════════════════════════════════════════════════════ */
export const confirmBulkImport = async (req, res) => {
  try {
    const { employees } = req.body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return sendError(res, 400, "No employees provided for import.");
    }

    // ── Safety re-check: filter out any IDs added since validation ──
    const existingEmployees = await Employee.find({}).select("employeeId");
    const existingIds = new Set(existingEmployees.map((e) => e.employeeId));

    const toInsert = employees.filter((e) => !existingIds.has(e.employeeId));

    if (toInsert.length === 0) {
      return sendError(
        res,
        409,
        "All employee IDs already exist in the database. No records were imported."
      );
    }

    // Strip the _row helper field before inserting
    const docs = toInsert.map(({ _row, ...emp }) => emp);

    // ordered: false → continues even if some fail
    const result = await Employee.insertMany(docs, { ordered: false });

    const skipped = employees.length - result.length;

    return sendSuccess(res, 201, `${result.length} employees imported successfully.`, {
      imported: result.length,
      skipped,
      message:  `${result.length} employees imported successfully${skipped > 0 ? `, ${skipped} skipped (duplicate IDs).` : "."}`,
    });
  } catch (err) {
    // insertMany with ordered:false may partially succeed
    if (err.name === "BulkWriteError" || err.insertedDocs) {
      const inserted = err.insertedDocs?.length ?? 0;
      return sendSuccess(res, 207, "Partial import completed.", {
        imported: inserted,
        message:  `${inserted} employees imported. Some records were skipped due to duplicate IDs.`,
      });
    }
    console.error("[confirmBulkImport]", err);
    return sendError(res, 500, "Failed to import employees. Please try again.");
  }
};