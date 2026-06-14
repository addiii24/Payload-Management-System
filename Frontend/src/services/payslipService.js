/**
 * @file payslipService.js
 * @description Frontend service for payslip download endpoints.
 *
 *  Both downloads trigger a browser file-save using the Blob + anchor trick.
 *  No axios responseType override needed on the caller side — handled here.
 */

import api from "../api/api.js";

/**
 * Download a single payslip PDF for a given payroll record.
 * Triggers browser save-as dialog automatically.
 *
 * @param {string} payrollId   - MongoDB _id of the payroll record
 * @param {string} [filename]  - Optional suggested filename (falls back to Content-Disposition)
 */
export const downloadPayslip = async (payrollId, filename) => {
  const res = await api.get(`/api/payslips/${payrollId}/download`, {
    responseType: "blob",
  });

  // Extract filename from Content-Disposition if not supplied by caller
  const disposition = res.headers?.["content-disposition"] ?? "";
  const cdName      = disposition.match(/filename="?([^"]+)"?/)?.[1];
  const finalName   = filename || cdName || `Payslip_${payrollId}.pdf`;

  _triggerDownload(res.data, finalName, "application/pdf");
};

/**
 * Download a ZIP of all payslips for a given pay period.
 * Triggers browser save-as dialog automatically.
 *
 * @param {{ month: number, year: number }} params
 */
export const bulkDownloadPayslips = async ({ month, year }) => {
  const res = await api.get("/api/payslips/bulk-download", {
    params: { month, year },
    responseType: "blob",
  });

  const disposition = res.headers?.["content-disposition"] ?? "";
  const cdName      = disposition.match(/filename="?([^"]+)"?/)?.[1];
  const finalName   = cdName || `Payroll_${month}_${year}.zip`;

  _triggerDownload(res.data, finalName, "application/zip");
};

/** Internal: create a hidden anchor element and click it to trigger download */
const _triggerDownload = (blob, filename, mimeType) => {
  const url = URL.createObjectURL(new Blob([blob], { type: mimeType }));
  const a   = document.createElement("a");
  a.href    = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
