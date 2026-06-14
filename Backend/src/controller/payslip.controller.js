/**
 * @file payslip.controller.js
 * @description HTTP controller for on-demand payslip PDF generation.
 *
 *  Endpoints:
 *    GET /api/payslips/:payrollId/download   → single payslip PDF stream
 *    GET /api/payslips/bulk-download?month=&year=  → ZIP of all payslips for period
 *
 *  Design:
 *    - Zero disk writes. PDFs generated in memory via PDFKit.
 *    - ZIP assembled in memory via archiver with passthrough streams.
 *    - Errors are surfaced as JSON (if headers not yet sent) or logged.
 */

import mongoose from "mongoose";
import { ZipArchive} from "archiver";
import { PassThrough } from "stream";

import Payroll from "../model/payroll.model.js";
import Employee from "../model/employee.model.js";
import {
  generatePayslipPDF,
  buildPayslipFilename,
  buildZipFilename,
} from "../service/payslip.service.js";
import { sendError } from "../util/apiError.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ══════════════════════════════════════════════════════════════
   SINGLE PAYSLIP DOWNLOAD
   GET /api/payslips/:payrollId/download
══════════════════════════════════════════════════════════════ */
export const downloadPayslip = async (req, res) => {
  try {
    const { payrollId } = req.params;
    if (!isValidId(payrollId)) return sendError(res, 400, "Invalid payroll record ID.");

    /* 1. Load payroll record */
    const payroll = await Payroll.findById(payrollId).lean();
    if (!payroll) return sendError(res, 404, "Payroll record not found.");

    /* 2. Load employee (for PF / ESI numbers) */
    const employee = await Employee.findById(payroll.employeeId)
      .select("pfNumber esiNumber")
      .lean();

    /* 3. Build filename */
    const filename = buildPayslipFilename(payroll);

    /* 4. Set response headers */
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    /* 5. Generate and pipe PDF directly to response */
    const doc = generatePayslipPDF(payroll, employee);
    doc.pipe(res);

    // PDFKit emits 'end' automatically after doc.end() in the service
    doc.on("error", (err) => {
      console.error("[downloadPayslip] PDF stream error:", err);
      if (!res.headersSent) sendError(res, 500, "PDF generation failed.");
    });
  } catch (err) {
    console.error("[downloadPayslip]", err);
    if (!res.headersSent) return sendError(res, 500, "Failed to generate payslip.");
  }
};

/* ══════════════════════════════════════════════════════════════
   BULK DOWNLOAD — ZIP of all payslips for a pay period
   GET /api/payslips/bulk-download?month=6&year=2026
══════════════════════════════════════════════════════════════ */
export const bulkDownloadPayslips = async (req, res) => {
  try {
    /* ── Validate query params ── */
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || month < 1 || month > 12)
      return sendError(res, 400, "month must be 1–12.");
    if (!year || year < 2000 || year > 2100)
      return sendError(res, 400, "year must be a 4-digit year.");

    /* ── Fetch all payroll records for the period ── */
    const payrolls = await Payroll.find({ month, year }).sort({ employeeCode: 1 }).lean();
    if (payrolls.length === 0) {
      return sendError(res, 404, `No payroll records found for ${month}/${year}.`);
    }

    /* ── Load employee details in one query ── */
    const employeeIds = payrolls.map((p) => p.employeeId);
    const employeesArr = await Employee.find({ _id: { $in: employeeIds } })
      .select("_id pfNumber esiNumber")
      .lean();
    const employeeMap = Object.fromEntries(
      employeesArr.map((e) => [e._id.toString(), e])
    );

    /* ── Set response headers BEFORE streaming ── */
    const zipFilename = buildZipFilename(month, year);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${zipFilename}"`
    );

    /* ── Create archiver and pipe to response ── */
    const archive = new ZipArchive("zip", { zlib: { level: 6 } });

    archive.on("error", (err) => {
      console.error("[bulkDownloadPayslips] archiver error:", err);
      // Cannot send JSON error if zip headers already sent — just destroy
      res.destroy(err);
    });

    archive.pipe(res);

    /* ── Generate each PDF in memory and append to ZIP ── */
    for (const payroll of payrolls) {
      const employee = employeeMap[payroll.employeeId?.toString()] ?? null;

      // Use a PassThrough to bridge PDFKit output into archiver
      const pass = new PassThrough();
      const doc = generatePayslipPDF(payroll, employee);
      doc.pipe(pass);

      const pdfFilename = buildPayslipFilename(payroll);
      archive.append(pass, { name: pdfFilename });
    }

    /* ── Finalise — flushes all appended entries ── */
    await archive.finalize();
  } catch (err) {
    console.error("[bulkDownloadPayslips]", err);
    if (!res.headersSent) return sendError(res, 500, "Bulk download failed.");
  }
};
