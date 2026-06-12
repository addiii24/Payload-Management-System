/**
 * @file api.js
 * @description Axios instance pre-configured with backend base URL.
 *              Automatically attaches the JWT from localStorage on every request.
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: attach JWT ────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("payroll_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — force logout
      localStorage.removeItem("payroll_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
