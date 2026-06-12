/**
 * @file authService.js
 * @description Authentication API calls.
 */

import api from "./api.js";

/**
 * Send login credentials to the backend.
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ success: boolean, token: string, message: string }>}
 */
export const loginRequest = async (credentials) => {
  const response = await api.post("/api/auth/login", credentials);
  return response.data;
};
