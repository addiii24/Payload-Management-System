/**
 * @file overtimeService.js
 * @description Frontend API wrappers for OvertimeRecord CRUD endpoints.
 */

import api from "../api/api.js";

/**
 * Fetch overtime records, optionally filtered.
 * @param {{ employeeId?: string, month?: number, year?: number }} params
 */
export const getOTRecords = async ({ employeeId, month, year } = {}) => {
  const q = new URLSearchParams();
  if (employeeId) q.append("employeeId", employeeId);
  if (month)      q.append("month", month);
  if (year)       q.append("year", year);
  const res = await api.get(`/api/overtime?${q}`);
  return res.data; // { success, data: { total, records, employeeTotals } }
};

/**
 * Create or update an OT entry (upsert).
 * @param {{ employeeId, month, year, otType, hours, remarks }} payload
 */
export const upsertOT = async (payload) => {
  const res = await api.post("/api/overtime", payload);
  return res.data;
};

/**
 * Update an existing OT entry by id.
 * @param {string} id
 * @param {{ hours, otType, remarks }} payload
 */
export const updateOT = async (id, payload) => {
  const res = await api.put(`/api/overtime/${id}`, payload);
  return res.data;
};

/**
 * Delete an OT entry by id.
 * @param {string} id
 */
export const deleteOT = async (id) => {
  const res = await api.delete(`/api/overtime/${id}`);
  return res.data;
};
