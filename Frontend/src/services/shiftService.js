/**
 * @file shiftService.js
 * @description Frontend API wrappers for Shift and ShiftAttendance endpoints.
 */

import api from "../api/api.js";

/* ── Shift Master ──────────────────────────────────────────── */

export const getShifts = async (onlyActive = false) => {
  const q = onlyActive ? "?isActive=true" : "";
  const res = await api.get(`/api/shifts${q}`);
  return res.data; // { success, data: { total, shifts } }
};

export const getShiftById = async (id) => {
  const res = await api.get(`/api/shifts/${id}`);
  return res.data;
};

export const createShift = async (payload) => {
  const res = await api.post("/api/shifts", payload);
  return res.data;
};

export const updateShift = async (id, payload) => {
  const res = await api.put(`/api/shifts/${id}`, payload);
  return res.data;
};

export const deleteShift = async (id) => {
  const res = await api.delete(`/api/shifts/${id}`);
  return res.data;
};

/* ── Shift Attendance ──────────────────────────────────────── */

/**
 * Fetch attendance records, optionally filtered.
 * @param {{ employeeId?: string, month?: number, year?: number }} params
 */
export const getAttendance = async ({ employeeId, month, year, page = 1, limit = 10, search = "" } = {}) => {
  const q = new URLSearchParams();
  if (employeeId) q.append("employeeId", employeeId);
  if (month)      q.append("month", month);
  if (year)       q.append("year", year);
  q.append("page", page);
  q.append("limit", limit);
  if (search.trim()) q.append("search", search.trim());
  const res = await api.get(`/api/shift-attendance?${q}`);
  return res.data;
};

/**
 * Create or update an attendance entry (upsert).
 * @param {{ employeeId, shiftId, month, year, daysWorked }} payload
 */
export const upsertAttendance = async (payload) => {
  const res = await api.post("/api/shift-attendance", payload);
  return res.data;
};

export const updateAttendance = async (id, daysWorked) => {
  const res = await api.put(`/api/shift-attendance/${id}`, { daysWorked });
  return res.data;
};

export const deleteAttendance = async (id) => {
  const res = await api.delete(`/api/shift-attendance/${id}`);
  return res.data;
};
