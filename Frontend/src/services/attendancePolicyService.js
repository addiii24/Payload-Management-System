/**
 * @file attendancePolicyService.js
 * @description Frontend API wrapper for Department Attendance Policy endpoints.
 */

import api from "../api/api.js";

const BASE = "/api/attendance-policy";

/** Upsert — creates or updates policy for a department */
export const savePolicy = async (payload) => {
  const res = await api.post(BASE, payload);
  return res.data;
};

/** List all policies */
export const getAllPolicies = async () => {
  const res = await api.get(BASE);
  return res.data;
};

/** Get policy for a specific department */
export const getPolicyByDepartment = async (departmentId) => {
  const res = await api.get(`${BASE}/${departmentId}`);
  return res.data;
};

/** Partial update for a department's policy */
export const updatePolicy = async (departmentId, payload) => {
  const res = await api.put(`${BASE}/${departmentId}`, payload);
  return res.data;
};

/** Delete a policy */
export const deletePolicy = async (departmentId) => {
  const res = await api.delete(`${BASE}/${departmentId}`);
  return res.data;
};
