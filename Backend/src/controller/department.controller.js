/**
 * @file department.controller.js
 * @description CRUD controller for the Department resource.
 */

import mongoose from "mongoose";
import Department from "../model/department.model.js";
import DepartmentPolicy from "../model/departmentPolicy.model.js";
import {
  sendSuccess,
  sendError,
  isDuplicateKeyError,
  duplicateKeyMessage,
} from "../util/apiError.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ──────────────────────────────────────────────────────────────
   CREATE  POST /api/departments
────────────────────────────────────────────────────────────── */
export const createDepartment = async (req, res) => {
  try {
    const { departmentName, description, isActive } = req.body;

    if (!departmentName?.trim()) {
      return sendError(res, 400, "Department name is required.");
    }

    const department = await Department.create({
      departmentName: departmentName.trim(),
      description:    description?.trim() || "",
      isActive:       isActive !== undefined ? Boolean(isActive) : true,
    });

    // Auto-create an empty policy document for this department
    await DepartmentPolicy.create({ departmentId: department._id, deductions: [] });

    return sendSuccess(res, 201, "Department created successfully.", department);
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return sendError(res, 409, duplicateKeyMessage(err));
    }
    console.error("[createDepartment]", err);
    return sendError(res, 500, "Failed to create department.");
  }
};

/* ──────────────────────────────────────────────────────────────
   READ ALL  GET /api/departments
────────────────────────────────────────────────────────────── */
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    return sendSuccess(res, 200, "Departments fetched successfully.", {
      total: departments.length,
      departments,
    });
  } catch (err) {
    console.error("[getDepartments]", err);
    return sendError(res, 500, "Failed to fetch departments.");
  }
};

/* ──────────────────────────────────────────────────────────────
   READ ONE  GET /api/departments/:id
────────────────────────────────────────────────────────────── */
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid department ID.");

    const department = await Department.findById(id);
    if (!department) return sendError(res, 404, "Department not found.");

    return sendSuccess(res, 200, "Department fetched successfully.", department);
  } catch (err) {
    console.error("[getDepartmentById]", err);
    return sendError(res, 500, "Failed to fetch department.");
  }
};

/* ──────────────────────────────────────────────────────────────
   UPDATE  PUT /api/departments/:id
────────────────────────────────────────────────────────────── */
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid department ID.");

    const allowedFields = ["departmentName", "description", "isActive"];
    const update = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.departmentName !== undefined && !update.departmentName.toString().trim()) {
      return sendError(res, 400, "Department name cannot be empty.");
    }

    const updated = await Department.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!updated) return sendError(res, 404, "Department not found.");

    return sendSuccess(res, 200, "Department updated successfully.", updated);
  } catch (err) {
    if (isDuplicateKeyError(err)) return sendError(res, 409, duplicateKeyMessage(err));
    console.error("[updateDepartment]", err);
    return sendError(res, 500, "Failed to update department.");
  }
};

/* ──────────────────────────────────────────────────────────────
   DELETE  DELETE /api/departments/:id
────────────────────────────────────────────────────────────── */
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid department ID.");

    const deleted = await Department.findByIdAndDelete(id);
    if (!deleted) return sendError(res, 404, "Department not found.");

    // Cascade-delete the associated policy
    await DepartmentPolicy.deleteOne({ departmentId: id });

    return sendSuccess(
      res, 200,
      `Department "${deleted.departmentName}" deleted successfully.`,
      { deleted }
    );
  } catch (err) {
    console.error("[deleteDepartment]", err);
    return sendError(res, 500, "Failed to delete department.");
  }
};
