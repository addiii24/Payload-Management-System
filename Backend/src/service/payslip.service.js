/**
 * @file payslip.service.js
 * @description Core PDF generation logic using PDFKit.
 *
 *  Design rules (from project-context.md):
 *    - No PDF stored in DB or on disk.
 *    - Generated entirely in memory.
 *    - Caller receives a PDFDocument stream to pipe directly to the HTTP response.
 *    - Reuses existing payroll record data — no recalculation.
 */

import PDFDocument from "pdfkit";

/* ── Constants ── */
const COMPANY_NAME    = "Automotive Company";
const COMPANY_SUBLINE = "Payroll Management System";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Format a number as Indian Rupee string  e.g. 35000 → "₹35,000" */
const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n ?? 0);

/**
 * Generate a single payslip PDF document (in memory).
 *
 * @param {object} payroll   - Mongoose Payroll document (plain object or lean)
 * @param {object} employee  - Mongoose Employee document (may be populated or separate)
 * @returns {PDFDocument}    - A PDFKit document that callers should pipe to res
 */
export const generatePayslipPDF = (payroll, employee) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: false,   // stream pages as they are written
    info: {
      Title: `Payslip - ${payroll.employeeName} - ${MONTH_NAMES[payroll.month]} ${payroll.year}`,
      Author: COMPANY_NAME,
    },
  });

  const pageWidth   = doc.page.width;
  const contentWidth = pageWidth - 100;   // left + right margins = 100
  const LEFT        = 50;
  const RIGHT       = pageWidth - 50;

  /* ════════════════════════════════════════════════
     HEADER BAND
  ════════════════════════════════════════════════ */
  // Background rect
  doc
    .rect(0, 0, pageWidth, 110)
    .fill("#1e1b4b");

  // Company name
  doc
    .fillColor("#ffffff")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(COMPANY_NAME, LEFT, 28, { width: contentWidth, align: "center" });

  doc
    .fillColor("#a5b4fc")
    .fontSize(11)
    .font("Helvetica")
    .text(COMPANY_SUBLINE, LEFT, 56, { width: contentWidth, align: "center" });

  // PAYSLIP label
  doc
    .fillColor("#c7d2fe")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(
      `PAYSLIP — ${MONTH_NAMES[payroll.month].toUpperCase()} ${payroll.year}`,
      LEFT, 80,
      { width: contentWidth, align: "center" }
    );

  doc.moveDown(4.5);

  /* ════════════════════════════════════════════════
     EMPLOYEE INFORMATION SECTION
  ════════════════════════════════════════════════ */
  let y = 130;

  // Section label
  doc
    .fillColor("#1e1b4b")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("EMPLOYEE INFORMATION", LEFT, y)
    .moveDown(0.3);

  doc
    .moveTo(LEFT, doc.y)
    .lineTo(RIGHT, doc.y)
    .strokeColor("#e2e8f0")
    .stroke();

  y = doc.y + 8;

  const empFields = [
    ["Employee ID",   payroll.employeeCode],
    ["Employee Name", payroll.employeeName],
    ["Department",    payroll.department],
    ["Designation",   payroll.designation],
    ["Pay Period",    `${MONTH_NAMES[payroll.month]} ${payroll.year}`],
  ];

  // PF / ESI numbers from employee doc if available
  if (employee?.pfNumber)  empFields.push(["PF Number",  employee.pfNumber]);
  if (employee?.esiNumber) empFields.push(["ESI Number", employee.esiNumber]);

  const colMid = LEFT + contentWidth / 2 + 10;

  empFields.forEach(([label, value], idx) => {
    const col = idx % 2 === 0 ? LEFT : colMid;
    if (idx % 2 === 0 && idx !== 0) y += 22;
    if (idx === 0) {
      // First entry starts at y
    }

    doc
      .fillColor("#64748b")
      .fontSize(8.5)
      .font("Helvetica")
      .text(label, col, y);

    doc
      .fillColor("#0f172a")
      .fontSize(9.5)
      .font("Helvetica-Bold")
      .text(String(value ?? "—"), col, y + 11);

    if (idx % 2 === 1 || idx === empFields.length - 1) y += 22;
  });

  y += 14;

  /* ════════════════════════════════════════════════
     EARNINGS SECTION
  ════════════════════════════════════════════════ */
  // Section label
  doc
    .fillColor("#1e1b4b")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("EARNINGS", LEFT, y);

  doc
    .moveTo(LEFT, y + 14)
    .lineTo(RIGHT, y + 14)
    .strokeColor("#e2e8f0")
    .stroke();

  y += 22;

  // Gross salary row
  doc
    .rect(LEFT, y, contentWidth, 28)
    .fill("#f0fdf4");

  doc
    .fillColor("#166534")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Gross Salary (Basic)", LEFT + 10, y + 8)
    .text(inr(payroll.grossSalary), LEFT, y + 8, { width: contentWidth - 10, align: "right" });

  y += 40;

  /* ════════════════════════════════════════════════
     DEDUCTIONS SECTION
  ════════════════════════════════════════════════ */
  doc
    .fillColor("#1e1b4b")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("DEDUCTIONS", LEFT, y);

  doc
    .moveTo(LEFT, y + 14)
    .lineTo(RIGHT, y + 14)
    .strokeColor("#e2e8f0")
    .stroke();

  y += 22;

  // Column headers
  doc
    .fillColor("#64748b")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("DESCRIPTION", LEFT + 8, y)
    .text("RATE", LEFT + 270, y)
    .text("AMOUNT", LEFT, y, { width: contentWidth - 8, align: "right" });

  y += 14;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor("#e2e8f0").dash(2, { space: 2 }).stroke();
  doc.undash();
  y += 6;

  const deductions = payroll.deductions ?? [];

  if (deductions.length === 0) {
    doc
      .fillColor("#94a3b8")
      .fontSize(9)
      .font("Helvetica")
      .text("No deductions applicable.", LEFT, y);
    y += 20;
  } else {
    deductions.forEach((d, i) => {
      const rowBg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      doc.rect(LEFT, y, contentWidth, 22).fill(rowBg);

      doc
        .fillColor("#334155")
        .fontSize(9.5)
        .font("Helvetica")
        .text(d.name, LEFT + 8, y + 5);

      doc
        .fillColor("#64748b")
        .text(`${Number(d.percentage).toFixed(2)}%`, LEFT + 270, y + 5);

      doc
        .fillColor("#dc2626")
        .font("Helvetica-Bold")
        .text(`− ${inr(d.amount)}`, LEFT, y + 5, {
          width: contentWidth - 8,
          align: "right",
        });

      y += 22;
    });
  }

  // Total deduction row
  y += 4;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor("#e2e8f0").stroke();
  y += 6;

  doc
    .rect(LEFT, y, contentWidth, 26)
    .fill("#fef2f2");

  doc
    .fillColor("#991b1b")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Total Deduction", LEFT + 8, y + 7)
    .text(`− ${inr(payroll.totalDeduction)}`, LEFT, y + 7, {
      width: contentWidth - 8,
      align: "right",
    });

  y += 40;

  /* ════════════════════════════════════════════════
     NET PAY BAND
  ════════════════════════════════════════════════ */
  doc
    .rect(LEFT - 10, y, contentWidth + 20, 48)
    .fill("#1e1b4b");

  doc
    .fillColor("#a5b4fc")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("NET PAY", LEFT, y + 10, { width: contentWidth, align: "center" });

  doc
    .fillColor("#ffffff")
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(inr(payroll.netSalary), LEFT, y + 24, { width: contentWidth, align: "center" });

  y += 62;

  /* ════════════════════════════════════════════════
     FOOTER
  ════════════════════════════════════════════════ */
  doc
    .fillColor("#94a3b8")
    .fontSize(8)
    .font("Helvetica")
    .text(
      "This is a system-generated payslip and does not require a signature.",
      LEFT, y + 8,
      { width: contentWidth, align: "center" }
    );

  doc
    .moveTo(LEFT, y + 4)
    .lineTo(RIGHT, y + 4)
    .strokeColor("#e2e8f0")
    .stroke();

  doc.end();
  return doc;
};

/**
 * Build a safe filename for the payslip PDF.
 * e.g.  Payslip_EMP001_John_Doe_June_2026.pdf
 *
 * @param {object} payroll
 * @returns {string}
 */
export const buildPayslipFilename = (payroll) => {
  const safeName = (payroll.employeeName ?? "Employee")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  const month = MONTH_NAMES[payroll.month] ?? payroll.month;
  return `Payslip_${payroll.employeeCode}_${safeName}_${month}_${payroll.year}.pdf`;
};

/**
 * Build the ZIP filename for bulk download.
 * e.g.  Payroll_June_2026.zip
 */
export const buildZipFilename = (month, year) => {
  const monthName = MONTH_NAMES[month] ?? month;
  return `Payroll_${monthName}_${year}.zip`;
};
