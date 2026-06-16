/**
 * @file payrollService.js
 * @description Payroll API calls for the frontend.
 */

import api from "../api/api.js";

/**
 * Generate payroll for ALL employees for a given month/year.
 * @param {{ month: number, year: number }} payload
 * @param {boolean} force  – re-generate even if already processed
 */
export const generateBulkPayroll = async ({ month, year }, force = false) => {
  const url = `/api/payroll/generate${force ? "?force=true" : ""}`;
  const res = await api.post(url, { month, year });
  return res.data;
};

/**
 * Generate payroll for a single employee.
 * @param {string} employeeMongoId  – MongoDB _id of the employee
 * @param {{ month: number, year: number }} payload
 * @param {boolean} force
 */
export const generateSinglePayroll = async (employeeMongoId, { month, year }, force = false) => {
  const url = `/api/payroll/generate/${employeeMongoId}${force ? "?force=true" : ""}`;
  const res = await api.post(url, { month, year });
  return res.data;
};

/**
 * Fetch all payroll records for a pay period.
 * @param {{ month: number, year: number, department?: string }} params
 */
export const getPayrollByPeriod = async ({ month, year, department = "", page = 1, limit = 10, search = "" }) => {
  const q = new URLSearchParams({ month, year });
  if (department) q.append("department", department);
  q.append("page", page);
  q.append("limit", limit);
  if (search.trim()) q.append("search", search.trim());
  const res = await api.get(`/api/payroll?${q}`);
  return res.data; // { success, data: { month, year, count, summary, payrolls } }
};

/**
 * Fetch a single payroll record (populated with employee data).
 * @param {string} id  – MongoDB _id of the payroll record
 */
export const getPayrollById = async (id) => {
  const res = await api.get(`/api/payroll/${id}`);
  return res.data;
};

/**
 * Fetch complete payroll history for one employee.
 * @param {string} employeeMongoId
 */
export const getEmployeePayrollHistory = async (employeeMongoId) => {
  const res = await api.get(`/api/payroll/employee/${employeeMongoId}`);
  return res.data;
};

/**
 * Void / delete a payroll record.
 * @param {string} id
 */
export const deletePayroll = async (id) => {
  const res = await api.delete(`/api/payroll/${id}`);
  return res.data;
};
