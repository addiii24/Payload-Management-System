/**
 * @file departmentPolicy.controller.js
 * @description Manages deduction policies attached to departments.
 *
 *  Each department has exactly one DepartmentPolicy document (created automatically
 *  when the department is created).
 *
 *  Endpoints operate on the deductions sub-array:
 *    GET    /api/departments/:id/policy            → full policy
 *    POST   /api/departments/:id/policy/deductions → add deduction
 *    PUT    /api/departments/:id/policy/deductions/:did → edit deduction
 *    DELETE /api/departments/:id/policy/deductions/:did → remove deduction
 *    PUT    /api/departments/:id/policy            → replace all deductions (bulk save)
 */

import mongoose from "mongoose";
import DepartmentPolicy from "../model/departmentPolicy.model.js";
import Department       from "../model/department.model.js";
import { sendSuccess, sendError } from "../util/apiError.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ── shared: load policy or 404 ── */
const getPolicy = async (departmentId) =>
  DepartmentPolicy.findOne({ departmentId });

/* ──────────────────────────────────────────────────────────────
   GET POLICY  GET /api/departments/:id/policy
────────────────────────────────────────────────────────────── */
export const getPolicy_ = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid department ID.");

    const dept = await Department.findById(id);
    if (!dept) return sendError(res, 404, "Department not found.");

    let policy = await getPolicy(id);
    // Lazily create policy if it doesn't exist (e.g. legacy departments)
    if (!policy) {
      policy = await DepartmentPolicy.create({ departmentId: id, deductions: [] });
    }

    return sendSuccess(res, 200, "Policy fetched successfully.", {
      department: dept,
      policy,
    });
  } catch (err) {
    console.error("[getPolicy]", err);
    return sendError(res, 500, "Failed to fetch policy.");
  }
};

/* ──────────────────────────────────────────────────────────────
   BULK SAVE (replace all deductions)
   PUT /api/departments/:id/policy
────────────────────────────────────────────────────────────── */
export const savePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid department ID.");

    const { deductions } = req.body;
    if (!Array.isArray(deductions)) {
      return sendError(res, 400, "'deductions' must be an array.");
    }

    // Validate each deduction
    for (const d of deductions) {
      if (!d.name?.trim()) return sendError(res, 400, "Each deduction must have a name.");
      if (d.percentage === undefined || isNaN(Number(d.percentage))) {
        return sendError(res, 400, `Percentage for "${d.name}" is invalid.`);
      }
      const pct = Number(d.percentage);
      if (pct < 0 || pct > 100) {
        return sendError(res, 400, `Percentage for "${d.name}" must be between 0 and 100.`);
      }
    }

    // Validate total deductions do not exceed 100%
    const totalPct = deductions.reduce((sum, d) => sum + Number(d.percentage), 0);
    if (totalPct > 100) {
      return sendError(res, 400, `Total deduction percentage (${totalPct}%) cannot exceed 100%.`);
    }

    const policy = await DepartmentPolicy.findOneAndUpdate(
      { departmentId: id },
      { $set: { deductions } },
      { new: true, upsert: true, runValidators: true }
    );

    return sendSuccess(res, 200, "Policy saved successfully.", policy);
  } catch (err) {
    if (err.name === "ValidationError") {
      const msgs = Object.values(err.errors).map((e) => e.message);
      return sendError(res, 400, msgs.join(" "));
    }
    console.error("[savePolicy]", err);
    return sendError(res, 500, "Failed to save policy.");
  }
};

/* ──────────────────────────────────────────────────────────────
   ADD DEDUCTION  POST /api/departments/:id/policy/deductions
────────────────────────────────────────────────────────────── */
export const addDeduction = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return sendError(res, 400, "Invalid department ID.");

    const { name, percentage } = req.body;
    if (!name?.trim()) return sendError(res, 400, "Deduction name is required.");
    if (percentage === undefined || isNaN(Number(percentage))) {
      return sendError(res, 400, "A valid percentage is required.");
    }
    const pct = Number(percentage);
    if (pct < 0 || pct > 100) {
      return sendError(res, 400, "Percentage must be between 0 and 100.");
    }

    const policy = await DepartmentPolicy.findOneAndUpdate(
      { departmentId: id },
      { $push: { deductions: { name: name.trim(), percentage: pct } } },
      { new: true, upsert: true }
    );

    return sendSuccess(res, 201, "Deduction added successfully.", policy);
  } catch (err) {
    console.error("[addDeduction]", err);
    return sendError(res, 500, "Failed to add deduction.");
  }
};

/* ──────────────────────────────────────────────────────────────
   EDIT DEDUCTION  PUT /api/departments/:id/policy/deductions/:did
────────────────────────────────────────────────────────────── */
export const updateDeduction = async (req, res) => {
  try {
    const { id, did } = req.params;
    if (!isValidId(id) || !isValidId(did)) return sendError(res, 400, "Invalid ID.");

    const { name, percentage } = req.body;
    const update = {};
    if (name !== undefined)       update["deductions.$.name"]       = name.trim();
    if (percentage !== undefined) {
      const pct = Number(percentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return sendError(res, 400, "Percentage must be between 0 and 100.");
      }
      update["deductions.$.percentage"] = pct;
    }

    const policy = await DepartmentPolicy.findOneAndUpdate(
      { departmentId: id, "deductions._id": did },
      { $set: update },
      { new: true }
    );
    if (!policy) return sendError(res, 404, "Deduction not found.");

    return sendSuccess(res, 200, "Deduction updated successfully.", policy);
  } catch (err) {
    console.error("[updateDeduction]", err);
    return sendError(res, 500, "Failed to update deduction.");
  }
};

/* ──────────────────────────────────────────────────────────────
   DELETE DEDUCTION  DELETE /api/departments/:id/policy/deductions/:did
────────────────────────────────────────────────────────────── */
export const deleteDeduction = async (req, res) => {
  try {
    const { id, did } = req.params;
    if (!isValidId(id) || !isValidId(did)) return sendError(res, 400, "Invalid ID.");

    const policy = await DepartmentPolicy.findOneAndUpdate(
      { departmentId: id },
      { $pull: { deductions: { _id: did } } },
      { new: true }
    );
    if (!policy) return sendError(res, 404, "Policy not found.");

    return sendSuccess(res, 200, "Deduction removed successfully.", policy);
  } catch (err) {
    console.error("[deleteDeduction]", err);
    return sendError(res, 500, "Failed to delete deduction.");
  }
};
