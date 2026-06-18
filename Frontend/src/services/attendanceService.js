/**
 * @file attendanceService.js
 * @description Frontend API client wrapper for Attendance resource endpoints.
 */

import api from "../api/api.js";

/**
 * Fetch list of attendance records with optional filtering.
 * @param {object} params - query filters
 * @param {string} [params.employeeId]
 * @param {number} [params.month]
 * @param {number} [params.year]
 */
export const getAttendances = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.employeeId) query.append("employeeId", params.employeeId);
  if (params.month) query.append("month", params.month);
  if (params.year) query.append("year", params.year);

  const res = await api.get(`/api/attendance?${query.toString()}`);
  return res.data; // { success, message, data: { total, records } }
};

/**
 * Fetch a single attendance record by MongoDB ID.
 * @param {string} id
 */
export const getAttendanceById = async (id) => {
  const res = await api.get(`/api/attendance/${id}`);
  return res.data; // { success, message, data: record }
};

/**
 * Fetch attendance for a specific employee, month, and year.
 * @param {string} employeeId
 * @param {number} month
 * @param {number} year
 */
export const getEmployeeAttendance = async (employeeId, month, year) => {
  const res = await api.get(`/api/attendance/employee/${employeeId}?month=${month}&year=${year}`);
  return res.data; // { success, message, data: record || null }
};

/**
 * Create a new monthly attendance record for an employee.
 * @param {object} payload - { employeeId, month, year, attendance }
 */
export const createAttendance = async (payload) => {
  const res = await api.post("/api/attendance", payload);
  return res.data; // { success, message, data: record }
};

/**
 * Update an existing attendance record.
 * @param {string} id
 * @param {object} payload - { attendance, month, year }
 */
export const updateAttendance = async (id, payload) => {
  const res = await api.put(`/api/attendance/${id}`, payload);
  return res.data; // { success, message, data: record }
};

/**
 * Delete an attendance record.
 * @param {string} id
 */
export const deleteAttendance = async (id) => {
  const res = await api.delete(`/api/attendance/${id}`);
  return res.data; // { success, message, data: { deleted } }
};
