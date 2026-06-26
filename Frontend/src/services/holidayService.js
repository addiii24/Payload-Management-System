/**
 * @file holidayService.js
 * @description Frontend API wrapper for Company Holiday Calendar endpoints.
 */

import api from "../api/api.js";

/** Fetch holidays filtered by year and/or type */
export const getHolidays = async ({ year, type } = {}) => {
  const q = new URLSearchParams();
  if (year)  q.append("year",  year);
  if (type)  q.append("type",  type);
  const res = await api.get(`/api/holidays?${q}`);
  return res.data; // { success, data: { total, holidays } }
};

/** Get holidays for a specific month (used by Attendance engine) */
export const getHolidaysByMonth = async (year, month) => {
  const res = await api.get(`/api/holidays/by-month?year=${year}&month=${month}`);
  return res.data; // { success, data: { year, month, holidays: [{day,name,type,isPaid}] } }
};

/** Get single holiday by ID */
export const getHolidayById = async (id) => {
  const res = await api.get(`/api/holidays/${id}`);
  return res.data;
};

/** Create a new holiday */
export const createHoliday = async (payload) => {
  const res = await api.post("/api/holidays", payload);
  return res.data;
};

/** Update an existing holiday */
export const updateHoliday = async (id, payload) => {
  const res = await api.put(`/api/holidays/${id}`, payload);
  return res.data;
};

/** Delete a holiday */
export const deleteHoliday = async (id) => {
  const res = await api.delete(`/api/holidays/${id}`);
  return res.data;
};
