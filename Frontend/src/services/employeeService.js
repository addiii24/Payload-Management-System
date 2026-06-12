/**
 * @file employeeService.js
 * @description Employee API calls — thin wrappers around the Axios instance.
 */

import api from "../api/api.js";

/**
 * Fetch paginated + searchable employee list.
 * @param {{ page?: number, limit?: number, search?: string }} params
 */
export const getEmployees = async ({ page = 1, limit = 10, search = "" } = {}) => {
  const query = new URLSearchParams({ page, limit });
  if (search.trim()) query.append("search", search.trim());
  const res = await api.get(`/api/employees?${query}`);
  return res.data; // { success, data: { total, page, limit, totalPages, employees } }
};

/**
 * Fetch a single employee by MongoDB _id.
 * @param {string} id
 */
export const getEmployeeById = async (id) => {
  const res = await api.get(`/api/employees/${id}`);
  return res.data; // { success, data: employee }
};

/**
 * Create a new employee.
 * @param {object} payload
 */
export const createEmployee = async (payload) => {
  const res = await api.post("/api/employees", payload);
  return res.data;
};

/**
 * Update an existing employee (partial allowed).
 * @param {string} id
 * @param {object} payload
 */
export const updateEmployee = async (id, payload) => {
  const res = await api.put(`/api/employees/${id}`, payload);
  return res.data;
};

/**
 * Delete an employee by MongoDB _id.
 * @param {string} id
 */
export const deleteEmployee = async (id) => {
  const res = await api.delete(`/api/employees/${id}`);
  return res.data;
};
