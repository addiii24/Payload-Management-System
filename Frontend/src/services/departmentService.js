/**
 * @file departmentService.js
 * @description Department & Department Policy API calls.
 */

import api from "../api/api.js";

// ─── Department CRUD ────────────────────────────────────────────
export const getDepartments = async () => {
  const res = await api.get("/api/departments");
  return res.data; // { success, data: { total, departments } }
};

export const getDepartmentById = async (id) => {
  const res = await api.get(`/api/departments/${id}`);
  return res.data;
};

export const createDepartment = async (payload) => {
  const res = await api.post("/api/departments", payload);
  return res.data;
};

export const updateDepartment = async (id, payload) => {
  const res = await api.put(`/api/departments/${id}`, payload);
  return res.data;
};

export const deleteDepartment = async (id) => {
  const res = await api.delete(`/api/departments/${id}`);
  return res.data;
};

// ─── Department Policy ──────────────────────────────────────────

/** Fetch full policy (with department info) for a department */
export const getPolicy = async (departmentId) => {
  const res = await api.get(`/api/departments/${departmentId}/policy`);
  return res.data; // { success, data: { department, policy } }
};

/** Bulk-replace all deductions for a department */
export const savePolicy = async (departmentId, deductions) => {
  const res = await api.put(`/api/departments/${departmentId}/policy`, { deductions });
  return res.data;
};

/** Add a single deduction */
export const addDeduction = async (departmentId, deduction) => {
  const res = await api.post(`/api/departments/${departmentId}/policy/deductions`, deduction);
  return res.data;
};

/** Update a single deduction by its sub-document _id */
export const updateDeduction = async (departmentId, deductionId, payload) => {
  const res = await api.put(
    `/api/departments/${departmentId}/policy/deductions/${deductionId}`,
    payload
  );
  return res.data;
};

/** Remove a single deduction */
export const deleteDeduction = async (departmentId, deductionId) => {
  const res = await api.delete(
    `/api/departments/${departmentId}/policy/deductions/${deductionId}`
  );
  return res.data;
};
