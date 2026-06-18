/**
 * @file payslip.service.js
 * @description Core PDF generation logic using PDFKit (Architecture v2).
 *
 *  3-section layout:
 *    A — EARNINGS:    Basic Salary + HRA + Other Allowances → Gross
 *    B — DEDUCTIONS:  Percentage-based rules → Total Deductions
 *    C — ADDITIONS:   Shift Allowance (with breakdown) + Overtime (with breakdown) → Total Additions
 *    NET PAY = Gross − Total Deductions + Total Additions
 *
 *  Design: no disk writes, no DB storage — generated entirely in memory.
 */

import PDFDocument from "pdfkit";
import document  from "pdfkit";

const COMPANY_NAME    = "JAIHIND AUTOTECH INDUSTRIES";
const COMPANY_SUBLINE = "GAT NO - 118/1, AT POST WASULI, Taluka - KHED,DIST - PUNE, Maharashtra 410501";
const COMPANY_SUBLINE2 = "(CORPORATE ADDRESS - Gat. No. 1181, Near Philips, Post- Vasuli, Pune, Maharashtra 410501)"
const COMPANY_GSTIN = "27AALFJ3691D1Z"

const MONTH_NAMES = [
  "", "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(n ?? 0);

/* ── Drawing helpers ─────────────────────────────────────────── */
const drawSectionLabel = (doc, label, LEFT, RIGHT, y) => {
  doc
    .fillColor("#1e1b4b")
    .fontSize(8.5)
    .font("Helvetica-Bold")
    .text(label, LEFT, y);
  doc.moveTo(LEFT, y + 13).lineTo(RIGHT, y + 13).strokeColor("#e2e8f0").stroke();
  return y + 21;
};

const drawColHeaders = (doc, LEFT, contentWidth, y, cols) => {
  doc.fillColor("#64748b").fontSize(7.5).font("Helvetica-Bold");
  cols.forEach(({ text, x, align }) => {
    if (align === "right") {
      doc.text(text, LEFT, y, { width: contentWidth - 8, align: "right" });
    } else {
      doc.text(text, x, y);
    }
  });
  y += 13;
  doc.moveTo(LEFT, y).lineTo(LEFT + contentWidth, y)
     .strokeColor("#e2e8f0").dash(2, { space: 2 }).stroke();
  doc.undash();
  return y + 5;
};

const drawRow = (doc, LEFT, contentWidth, y, rowBg, cells) => {
  doc.rect(LEFT, y, contentWidth, 22).fill(rowBg);
  cells.forEach(({ text, x, align, color, font, size }) => {
    doc
      .fillColor(color || "#334155")
      .fontSize(size || 9.5)
      .font(font || "Helvetica");
    if (align === "right") {
      doc.text(text, LEFT, y + 5, { width: contentWidth - 8, align: "right" });
    } else {
      doc.text(text, x, y + 5);
    }
  });
  return y + 22;
};

/* ════════════════════════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════════════════════════ */
export const generatePayslipPDF = (payroll, employee) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: false,
    info: {
      Title: `Payslip - ${payroll.employeeName} - ${MONTH_NAMES[payroll.month]} ${payroll.year}`,
      Author: COMPANY_NAME,
    },
  });

  const pageWidth    = doc.page.width;
  const LEFT         = 50;
  const RIGHT        = pageWidth - 50;
  const contentWidth = RIGHT - LEFT;

  /* ── HEADER BAND ──────────────────────────────────────────── */
  doc.rect(0, 0, pageWidth, 110).fill("#1e1b4b");
  doc.fontSize(22).font("Helvetica-Bold")
     .text(COMPANY_NAME, LEFT, 28, { width: contentWidth, align: "center" });
  doc.fontSize(11).font("Helvetica")
     .text(COMPANY_SUBLINE, LEFT, 56, { width: contentWidth, align: "center" });
  doc.fontSize(7).font("Helvetica")
     .text(COMPANY_SUBLINE2, LEFT, 56, { width: contentWidth, align: "center" });
  document.fontSize(8).font("Helvetica")
     .text(COMPANY_GSTIN, LEFT, 56, { width: contentWidth, align: "center" });
    
  doc.fontSize(10).font("Helvetica-Bold")
     .text(
       `PAYSLIP — ${MONTH_NAMES[payroll.month].toUpperCase()} ${payroll.year}`,
       LEFT, 80, { width: contentWidth, align: "center" }
     );

  /* ── EMPLOYEE INFO ────────────────────────────────────────── */
  let y = 130;
  y = drawSectionLabel(doc, "EMPLOYEE INFORMATION", LEFT, RIGHT, y);

  const empFields = [
    ["Employee ID",   payroll.employeeCode],
    ["Employee Name", payroll.employeeName],
    ["Department",    payroll.department],
    ["Designation",   payroll.designation],
    ["Pay Period",    `${MONTH_NAMES[payroll.month]} ${payroll.year}`],
  ];
  if (employee?.pfNumber)  empFields.push(["PF Number",  employee.pfNumber]);
  if (employee?.esiNumber) empFields.push(["ESI Number", employee.esiNumber]);

  const colMid = LEFT + contentWidth / 2 + 10;

  empFields.forEach(([label, value], idx) => {
    const col = idx % 2 === 0 ? LEFT : colMid;
    if (idx % 2 === 0 && idx > 0) y += 22;
    doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(label, col, y);
    doc.fillColor("#0f172a").fontSize(9.5).font("Helvetica-Bold")
       .text(String(value ?? "—"), col, y + 11);
    if (idx % 2 === 1 || idx === empFields.length - 1) y += 22;
  });

  y += 14;

  /* ═══════════════════════════════════════════════════════════
     SECTION A — EARNINGS
  ═══════════════════════════════════════════════════════════ */
  y = drawSectionLabel(doc, "A — EARNINGS", LEFT, RIGHT, y);

  // Basic Salary
  y = drawRow(doc, LEFT, contentWidth, y, "#f0fdf4", [
    { text: "Basic Salary",         x: LEFT + 10 },
    { text: inr(payroll.basicSalary ?? payroll.grossSalary), align: "right", color: "#166534", font: "Helvetica-Bold" },
  ]);

  // HRA (only if present)
  if ((payroll.hra ?? 0) > 0) {
    y = drawRow(doc, LEFT, contentWidth, y, "#f9fafb", [
      { text: "HRA",                  x: LEFT + 10 },
      { text: inr(payroll.hra),       align: "right", color: "#334155" },
    ]);
  }

  // Other Allowances (only if present)
  if ((payroll.otherAllowances ?? 0) > 0) {
    y = drawRow(doc, LEFT, contentWidth, y, "#f0fdf4", [
      { text: "Other Allowances",              x: LEFT + 10 },
      { text: inr(payroll.otherAllowances),    align: "right", color: "#334155" },
    ]);
  }

  // Gross Salary total row
  y += 4;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor("#ffffffff").stroke();
  y += 4;
  doc.rect(LEFT, y, contentWidth, 26).fill("#fefefeff");
  doc.fillColor("#000000ff").fontSize(10).font("Helvetica-Bold")
     .text("Gross Salary", LEFT + 10, y + 8)
     .text(inr(payroll.grossSalary), LEFT, y + 8, { width: contentWidth - 8, align: "right" });
  y += 34;

  /* ═══════════════════════════════════════════════════════════
     SECTION B — DEDUCTIONS
  ═══════════════════════════════════════════════════════════ */
  y = drawSectionLabel(doc, "B — DEDUCTIONS", LEFT, RIGHT, y);

  const deductions = payroll.deductions ?? [];

  if (deductions.length === 0) {
    y = drawRow(doc, LEFT, contentWidth, y, "#ffffff", [
      { text: "No deductions applicable.", x: LEFT + 10, color: "#94a3b8", size: 9 },
    ]);
  } else {
    y = drawColHeaders(doc, LEFT, contentWidth, y, [
      { text: "DESCRIPTION", x: LEFT + 8 },
      { text: "RATE",        x: LEFT + 275 },
      { text: "AMOUNT",      align: "right" },
    ]);
    deductions.forEach((d, i) => {
      y = drawRow(doc, LEFT, contentWidth, y, i % 2 === 0 ? "#ffffff" : "#f8fafc", [
        { text: d.name,                                       x: LEFT + 8 },
        { text: `${Number(d.percentage).toFixed(2)}%`,        x: LEFT + 275, color: "#64748b" },
        { text: `− ${inr(d.amount)}`,                         align: "right", color: "#000000ff", font: "Helvetica-Bold" },
      ]);
    });
  }

  // Total Deductions
  y += 4;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor("#e2e8f0").stroke();
  y += 4;
  doc.rect(LEFT, y, contentWidth, 26).fill("#fef2f2");
  doc.fillColor("#ffffffff").fontSize(10).font("Helvetica-Bold")
     .text("Total Deductions", LEFT + 8, y + 8)
     .text(`− ${inr(payroll.totalDeduction)}`, LEFT, y + 8, { width: contentWidth - 8, align: "right" });
  y += 34;

  /* ═══════════════════════════════════════════════════════════
     SECTION C — ADDITIONS
  ═══════════════════════════════════════════════════════════ */
  const shiftAllowance  = payroll.shiftAllowance  ?? 0;
  const shiftBreakdown  = payroll.shiftBreakdown  ?? [];
  const overtimeAmount  = payroll.overtimeAmount  ?? 0;
  const otBreakdown     = payroll.overtimeBreakdown ?? [];
  const totalAdditions  = payroll.totalAdditions  ?? (shiftAllowance + overtimeAmount);

  if (totalAdditions > 0) {
    y = drawSectionLabel(doc, "C — ADDITIONS", LEFT, RIGHT, y);

    /* ── Shift Allowance ── */
    if (shiftAllowance > 0) {
      doc.rect(LEFT, y, contentWidth, 22).fill("#eff6ff");
      doc.fillColor("#1d4ed8").fontSize(9.5).font("Helvetica-Bold")
         .text("Shift Allowance", LEFT + 8, y + 5)
         .text(`+ ${inr(shiftAllowance)}`, LEFT, y + 5, { width: contentWidth - 8, align: "right" });
      y += 22;

      if (shiftBreakdown.length > 0) {
        // Sub-table header
        doc.fillColor("#64748b").fontSize(7).font("Helvetica-Bold")
           .text("SHIFT", LEFT + 20, y + 2)
           .text("DAYS", LEFT + 195, y + 2)
           .text("RATE/DAY", LEFT + 255, y + 2)
           .text("AMOUNT", LEFT, y + 2, { width: contentWidth - 8, align: "right" });
        y += 14;

        shiftBreakdown.forEach((b, i) => {
          doc.rect(LEFT + 12, y, contentWidth - 12, 17).fill(i % 2 === 0 ? "#f0f5ff" : "#e8eeff");
          doc.fillColor("#334155").fontSize(8.5).font("Helvetica")
             .text(b.shiftName,        LEFT + 20,  y + 3)
             .text(String(b.daysWorked), LEFT + 195, y + 3)
             .text(inr(b.ratePerDay),  LEFT + 248, y + 3)
             .text(inr(b.total), LEFT, y + 3, { width: contentWidth - 8, align: "right" });
          y += 17;
        });
        y += 4;
      }
    }

    /* ── Overtime ── */
    if (overtimeAmount > 0) {
      doc.rect(LEFT, y, contentWidth, 22).fill("#fdf4ff");
      doc.fillColor("#7c3aed").fontSize(9.5).font("Helvetica-Bold")
         .text("Overtime", LEFT + 8, y + 5)
         .text(`+ ${inr(overtimeAmount)}`, LEFT, y + 5, { width: contentWidth - 8, align: "right" });
      y += 22;

      if (otBreakdown.length > 0) {
        // Sub-table header
        doc.fillColor("#64748b").fontSize(7).font("Helvetica-Bold")
           .text("OT TYPE", LEFT + 20, y + 2)
           .text("HOURS", LEFT + 205, y + 2)
           .text("RATE/HR", LEFT + 255, y + 2)
           .text("AMOUNT", LEFT, y + 2, { width: contentWidth - 8, align: "right" });
        y += 14;

        otBreakdown.forEach((b, i) => {
          doc.rect(LEFT + 12, y, contentWidth - 12, 17).fill(i % 2 === 0 ? "#faf0ff" : "#f3e8ff");
          doc.fillColor("#334155").fontSize(8.5).font("Helvetica")
             .text(b.otType,           LEFT + 20,  y + 3)
             .text(String(b.hours),    LEFT + 205, y + 3)
             .text(inr(b.ratePerHour), LEFT + 248, y + 3)
             .text(inr(b.total), LEFT, y + 3, { width: contentWidth - 8, align: "right" });
          y += 17;
        });
        y += 4;
      }
    }

    // Total Additions row
    y += 2;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor("#e2e8f0").stroke();
    y += 4;
    doc.rect(LEFT, y, contentWidth, 26).fill("#f0fdf4");
    doc.fillColor("#14532d").fontSize(10).font("Helvetica-Bold")
       .text("Total Additions", LEFT + 8, y + 8)
       .text(`+ ${inr(totalAdditions)}`, LEFT, y + 8, { width: contentWidth - 8, align: "right" });
    y += 34;
  }

  /* ── NET PAY BAND ─────────────────────────────────────────── */
  // Net Pay formula line
  doc.fillColor("#64748b").fontSize(8).font("Helvetica")
     .text(
       `Net Pay = Gross ${inr(payroll.grossSalary)} − Deductions ${inr(payroll.totalDeduction)} + Additions ${inr(totalAdditions)}`,
       LEFT, y, { width: contentWidth, align: "center" }
     );
  y += 14;

  doc.rect(LEFT - 10, y, contentWidth + 20, 50).fill("#1e1b4b");
  doc.fillColor("#a5b4fc").fontSize(10).font("Helvetica-Bold")
     .text("NET PAY", LEFT, y + 10, { width: contentWidth, align: "center" });
  doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold")
     .text(inr(payroll.netSalary), LEFT, y + 24, { width: contentWidth, align: "center" });
  y += 64;

  /* ── FOOTER ───────────────────────────────────────────────── */
  doc.moveTo(LEFT, y + 4).lineTo(RIGHT, y + 4).strokeColor("#e2e8f0").stroke();
  doc.fillColor("#94a3b8").fontSize(8).font("Helvetica")
     .text(
       "This is a system-generated payslip and does not require a signature.",
       LEFT, y + 8, { width: contentWidth, align: "center" }
     );

  doc.end();
  return doc;
};

/* ── Filename helpers ──────────────────────────────────────── */
export const buildPayslipFilename = (payroll) => {
  const safeName = (payroll.employeeName ?? "Employee")
    .replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_");
  const month = MONTH_NAMES[payroll.month] ?? payroll.month;
  return `Payslip_${payroll.employeeCode}_${safeName}_${month}_${payroll.year}.pdf`;
};

export const buildZipFilename = (month, year) => {
  const monthName = MONTH_NAMES[month] ?? month;
  return `Payroll_${monthName}_${year}.zip`;
};
