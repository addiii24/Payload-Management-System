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

const COMPANY_NAME    = "JAIHIND AUTOTECH INDUSTRIES";
const COMPANY_SUBLINE = "GAT NO - 118/1, AT POST WASULI, Taluka - KHED,DIST - PUNE, Maharashtra 410501";
const COMPANY_SUBLINE2 = "(CORPORATE ADDRESS - Gat. No. 1181, Near Philips, Post- Vasuli, Pune, Maharashtra 410501)";
const COMPANY_GSTIN = "27AALFJ3691D1Z";

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
    .fillColor("#000000")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text(label, LEFT, y);
  doc.moveTo(LEFT, y + 10).lineTo(RIGHT, y + 10).lineWidth(0.8).strokeColor("#000000").stroke();
  return y + 16;
};

const drawColHeaders = (doc, LEFT, contentWidth, y, cols) => {
  doc.fillColor("#000000").fontSize(7).font("Helvetica-Bold");
  cols.forEach(({ text, x, align }) => {
    if (align === "right") {
      doc.text(text, LEFT, y, { width: contentWidth - 8, align: "right" });
    } else {
      doc.text(text, x, y);
    }
  });
  y += 10;
  doc.moveTo(LEFT, y).lineTo(LEFT + contentWidth, y)
     .lineWidth(0.8).strokeColor("#000000").stroke();
  return y + 4;
};

const drawRow = (doc, LEFT, contentWidth, y, rowBg, cells) => {
  doc.rect(LEFT, y, contentWidth, 18).fill("#ffffff");
  cells.forEach(({ text, x, align, color, font, size }) => {
    doc
      .fillColor("#000000")
      .fontSize(size || 8.5)
      .font(font || "Helvetica");
    if (align === "right") {
      doc.text(text, LEFT, y + 4, { width: contentWidth - 8, align: "right" });
    } else {
      doc.text(text, x, y + 4);
    }
  });
  doc.moveTo(LEFT, y + 18).lineTo(LEFT + contentWidth, y + 18).lineWidth(0.5).strokeColor("#000000").stroke();
  return y + 18;
};

/* ════════════════════════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════════════════════════ */
export const generatePayslipPDF = (payroll, employee) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
    bufferPages: false,
    info: {
      Title: `Payslip - ${payroll.employeeName} - ${MONTH_NAMES[payroll.month]} ${payroll.year}`,
      Author: COMPANY_NAME,
    },
  });

  const pageWidth    = doc.page.width;
  const LEFT         = 40;
  const RIGHT        = pageWidth - 40;
  const contentWidth = RIGHT - LEFT;

  /* ── HEADER BAND ──────────────────────────────────────────── */
  doc.fillColor("#000000");
  
  // Company Name
  doc.fontSize(14).font("Helvetica-Bold")
     .text(COMPANY_NAME, LEFT, 25, { width: contentWidth, align: "center" });
     
  // Company Subline
  doc.fontSize(8).font("Helvetica")
     .text(COMPANY_SUBLINE, LEFT, 42, { width: contentWidth, align: "center" });
     
  // Company Subline 2
  doc.fontSize(7).font("Helvetica")
     .text(COMPANY_SUBLINE2, LEFT, 52, { width: contentWidth, align: "center" });
     
  // Contact Us
  doc.fontSize(7.5).font("Helvetica")
     .text("Mobile number : +91 96721 64194, E-mail : hrpune@jaihindautotech.com", LEFT, 62, { width: contentWidth, align: "center" });
     
  // GSTIN
  doc.fontSize(7.5).font("Helvetica")
     .text(`GSTIN: ${COMPANY_GSTIN}`, LEFT, 72, { width: contentWidth, align: "center" });
    
  // Title
  doc.fontSize(11).font("Helvetica-Bold")
     .text(
       `PAYSLIP — ${MONTH_NAMES[payroll.month].toUpperCase()} ${payroll.year}`,
       LEFT, 85, { width: contentWidth, align: "center" }
     );

  // Line below header
  doc.moveTo(LEFT, 102).lineTo(RIGHT, 102).lineWidth(1.2).strokeColor("#000000").stroke();

  /* ── EMPLOYEE INFO ────────────────────────────────────────── */
  let y = 112;
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

  if (payroll.workingDays !== undefined) {
    empFields.push(["Paid / Working Days", `${payroll.paidDays} / ${payroll.workingDays}`]);
    empFields.push(["Present / LOP Days", `${payroll.presentDays} / ${payroll.lopDays}`]);
  }

  const colMid = LEFT + contentWidth / 2 + 10;

  empFields.forEach(([label, value], idx) => {
    const col = idx % 2 === 0 ? LEFT : colMid;
    doc.fillColor("#000000").fontSize(7.5).font("Helvetica").text(label, col, y);
    doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold")
       .text(String(value ?? "—"), col, y + 10);
    if (idx % 2 === 1 || idx === empFields.length - 1) {
      y += 24;
    }
  });

  y += 6;

  /* ═══════════════════════════════════════════════════════════
     SECTION A — EARNINGS
  ═══════════════════════════════════════════════════════════ */
  y = drawSectionLabel(doc, "A — EARNINGS", LEFT, RIGHT, y);

  // Basic Salary
  y = drawRow(doc, LEFT, contentWidth, y, "#ffffff", [
    { text: "Basic Salary",         x: LEFT + 10 },
    { text: inr(payroll.basicSalary ?? payroll.grossSalary), align: "right", font: "Helvetica-Bold" },
  ]);

  // HRA (only if present)
  if ((payroll.hra ?? 0) > 0) {
    y = drawRow(doc, LEFT, contentWidth, y, "#ffffff", [
      { text: "HRA",                  x: LEFT + 10 },
      { text: inr(payroll.hra),       align: "right" },
    ]);
  }

  // Other Allowances (only if present)
  if ((payroll.otherAllowances ?? 0) > 0) {
    y = drawRow(doc, LEFT, contentWidth, y, "#ffffff", [
      { text: "Other Allowances",              x: LEFT + 10 },
      { text: inr(payroll.otherAllowances),    align: "right" },
    ]);
  }

  // Gross Salary total row
  y += 2;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1).strokeColor("#000000").stroke();
  y += 2;
  doc.rect(LEFT, y, contentWidth, 22).fill("#ffffff");
  doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold")
     .text("Gross Salary", LEFT + 10, y + 6)
     .text(inr(payroll.grossSalary), LEFT, y + 6, { width: contentWidth - 8, align: "right" });
  doc.moveTo(LEFT, y + 22).lineTo(RIGHT, y + 22).lineWidth(1).strokeColor("#000000").stroke();
  y += 28;

  /* ═══════════════════════════════════════════════════════════
     SECTION B — DEDUCTIONS
  ═══════════════════════════════════════════════════════════ */
  y = drawSectionLabel(doc, "B — DEDUCTIONS", LEFT, RIGHT, y);

  const deductions = payroll.deductions ?? [];

  if (deductions.length === 0) {
    y = drawRow(doc, LEFT, contentWidth, y, "#ffffff", [
      { text: "No deductions applicable.", x: LEFT + 10, color: "#000000", size: 8.5 },
    ]);
  } else {
    y = drawColHeaders(doc, LEFT, contentWidth, y, [
      { text: "DESCRIPTION", x: LEFT + 8 },
      { text: "RATE",        x: LEFT + 275 },
      { text: "AMOUNT",      align: "right" },
    ]);
    deductions.forEach((d, i) => {
      y = drawRow(doc, LEFT, contentWidth, y, "#ffffff", [
        { text: d.name,                                       x: LEFT + 8 },
        { text: `${Number(d.percentage).toFixed(2)}%`,        x: LEFT + 275 },
        { text: `− ${inr(d.amount)}`,                         align: "right", font: "Helvetica-Bold" },
      ]);
    });
  }

  // Total Deductions
  y += 2;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1).strokeColor("#000000").stroke();
  y += 2;
  doc.rect(LEFT, y, contentWidth, 22).fill("#ffffff");
  doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold")
     .text("Total Deductions", LEFT + 8, y + 6)
     .text(`− ${inr(payroll.totalDeduction)}`, LEFT, y + 6, { width: contentWidth - 8, align: "right" });
  doc.moveTo(LEFT, y + 22).lineTo(RIGHT, y + 22).lineWidth(1).strokeColor("#000000").stroke();
  y += 28;

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
      doc.rect(LEFT, y, contentWidth, 18).fill("#ffffff");
      doc.fillColor("#000000").fontSize(8.5).font("Helvetica-Bold")
         .text("Shift Allowance", LEFT + 8, y + 4)
         .text(`+ ${inr(shiftAllowance)}`, LEFT, y + 4, { width: contentWidth - 8, align: "right" });
      doc.moveTo(LEFT, y + 18).lineTo(RIGHT, y + 18).lineWidth(0.5).strokeColor("#000000").stroke();
      y += 18;

      if (shiftBreakdown.length > 0) {
        // Sub-table header
        doc.fillColor("#000000").fontSize(6.5).font("Helvetica-Bold")
           .text("SHIFT", LEFT + 20, y + 2)
           .text("DAYS", LEFT + 195, y + 2)
           .text("RATE/DAY", LEFT + 255, y + 2)
           .text("AMOUNT", LEFT, y + 2, { width: contentWidth - 8, align: "right" });
        y += 11;

        shiftBreakdown.forEach((b, i) => {
          doc.rect(LEFT + 12, y, contentWidth - 12, 14).fill("#ffffff");
          doc.fillColor("#000000").fontSize(8).font("Helvetica")
             .text(b.shiftName,        LEFT + 20,  y + 2)
             .text(String(b.daysWorked), LEFT + 195, y + 2)
             .text(inr(b.ratePerDay),  LEFT + 248, y + 2)
             .text(inr(b.total), LEFT, y + 2, { width: contentWidth - 8, align: "right" });
          doc.moveTo(LEFT + 12, y + 14).lineTo(RIGHT, y + 14).lineWidth(0.5).strokeColor("#000000").stroke();
          y += 14;
        });
        y += 2;
      }
    }

    /* ── Overtime ── */
    if (overtimeAmount > 0) {
      doc.rect(LEFT, y, contentWidth, 18).fill("#ffffff");
      doc.fillColor("#000000").fontSize(8.5).font("Helvetica-Bold")
         .text("Overtime", LEFT + 8, y + 4)
         .text(`+ ${inr(overtimeAmount)}`, LEFT, y + 4, { width: contentWidth - 8, align: "right" });
      doc.moveTo(LEFT, y + 18).lineTo(RIGHT, y + 18).lineWidth(0.5).strokeColor("#000000").stroke();
      y += 18;

      if (otBreakdown.length > 0) {
        // Sub-table header
        doc.fillColor("#000000").fontSize(6.5).font("Helvetica-Bold")
           .text("OT TYPE", LEFT + 20, y + 2)
           .text("HOURS", LEFT + 205, y + 2)
           .text("RATE/HR", LEFT + 255, y + 2)
           .text("AMOUNT", LEFT, y + 2, { width: contentWidth - 8, align: "right" });
        y += 11;

        otBreakdown.forEach((b, i) => {
          doc.rect(LEFT + 12, y, contentWidth - 12, 14).fill("#ffffff");
          doc.fillColor("#000000").fontSize(8).font("Helvetica")
             .text(b.otType,           LEFT + 20,  y + 2)
             .text(String(b.hours),    LEFT + 205, y + 2)
             .text(inr(b.ratePerHour), LEFT + 248, y + 2)
             .text(inr(b.total), LEFT, y + 2, { width: contentWidth - 8, align: "right" });
          doc.moveTo(LEFT + 12, y + 14).lineTo(RIGHT, y + 14).lineWidth(0.5).strokeColor("#000000").stroke();
          y += 14;
        });
        y += 2;
      }
    }

    // Total Additions row
    y += 2;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1).strokeColor("#000000").stroke();
    y += 2;
    doc.rect(LEFT, y, contentWidth, 22).fill("#ffffff");
    doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold")
       .text("Total Additions", LEFT + 8, y + 6)
       .text(`+ ${inr(totalAdditions)}`, LEFT, y + 6, { width: contentWidth - 8, align: "right" });
    doc.moveTo(LEFT, y + 22).lineTo(RIGHT, y + 22).lineWidth(1).strokeColor("#000000").stroke();
    y += 28;
  }

  /* ── NET PAY BAND ─────────────────────────────────────────── */
  // Net Pay formula line
  doc.fillColor("#000000").fontSize(8).font("Helvetica")
     .text(
       `Net Pay = Gross ${inr(payroll.grossSalary)} − Deductions ${inr(payroll.totalDeduction)} + Additions ${inr(totalAdditions)}`,
       LEFT, y, { width: contentWidth, align: "center" }
     );
  y += 12;

  doc.rect(LEFT, y, contentWidth, 40).fill("#ffffff");
  doc.rect(LEFT, y, contentWidth, 40).lineWidth(1.2).strokeColor("#000000").stroke();
  doc.fillColor("#000000").fontSize(9).font("Helvetica-Bold")
     .text("NET PAY", LEFT, y + 6, { width: contentWidth, align: "center" });
  doc.fillColor("#000000").fontSize(16).font("Helvetica-Bold")
     .text(inr(payroll.netSalary), LEFT, y + 18, { width: contentWidth, align: "center" });
  y += 50;

  /* ── FOOTER ───────────────────────────────────────────────── */
  doc.moveTo(LEFT, y + 4).lineTo(RIGHT, y + 4).lineWidth(1).strokeColor("#000000").stroke();
  doc.fillColor("#000000").fontSize(7.5).font("Helvetica")
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
