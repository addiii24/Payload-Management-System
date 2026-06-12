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
import Employee from "../model/employee.model.js";
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