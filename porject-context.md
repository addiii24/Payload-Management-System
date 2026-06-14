# Payroll Management System

## Purpose

Personal-use Payroll Management System for HR operations in an Automotive Company.

Goal:

* Reduce manual payroll workload
* Manage employees
* Configure department-wise payroll policies
* Generate payroll automatically
* Generate payslips on demand
* Download individual or bulk payslips

---

## Tech Stack

Frontend:

* React
* Vite
* TailwindCSS
* Axios
* React Router

Backend:

* Node.js
* Express.js

Database:

* MongoDB
* Mongoose

Authentication:

* JWT

PDF:

* PDFKit

Bulk Download:

* Archiver

---

## Current Status

Completed:

✅ Authentication

✅ Protected Routes

✅ Dashboard

✅ Employee Management

✅ Department Management

✅ Department Policy Management

✅ Payroll Generation

In Progress:

🔄 Payslip Generation

🔄 Bulk Payslip Download

Future:

⏳ Reports & Analytics

⏳ Attendance Integration

⏳ Leave Management

---

## Application Flow

Login
↓
Dashboard
↓
Employees
↓
Departments
↓
Department Policies
↓
Generate Payroll
↓
Payroll History
↓
Download Payslip

---

## Core Design Principles

### Rule 1

No payroll rules are hardcoded.

Never hardcode:

* PF
* ESI
* Bonus
* Professional Tax
* Other deductions

Everything must come from database policies.

---

### Rule 2

Department-based payroll policies.

Each department can have completely different deductions.

Example:

Production:

* PF
* ESI
* PT

IT:

* PF
* PT

Management:

* Custom Bonus
* Custom PF

---

### Rule 3

All deductions are percentage based.

Example:

{
name: "PF",
percentage: 12
}

{
name: "ESI",
percentage: 0.75
}

Backend calculates deduction amount from percentages.

---

### Rule 4

Payroll engine is dynamic.

Payroll Engine:

Employee
↓
Department
↓
Department Policy
↓
Calculate Deductions
↓
Generate Payroll

No fixed deduction functions.

Use dynamic deduction arrays.

---

### Rule 5

Payroll records are stored.

Payslip PDFs are NOT stored.

Only payroll data is stored.

---

## Collections

### employees

Stores employee master data.

### departments

Stores department information.

### departmentPolicies

Stores deduction configuration.

Example:

{
departmentId,

deductions: [
{
name: "PF",
percentage: 12
},
{
name: "ESI",
percentage: 0.75
}
]
}

### payrolls

Stores generated payroll data.

Example:

{
employeeId,

month,
year,

grossSalary,

deductions: [
{
name: "PF",
percentage: 12,
amount: 3600
}
],

totalDeduction,

netSalary
}

---

## Payslip Strategy

IMPORTANT

Do NOT store PDFs.

Do NOT create payslip collection.

Do NOT save PDF files permanently.

Generate PDF on demand.

Flow:

Payroll Record
↓
Generate PDF
↓
Return File

---

## Bulk Download Strategy

Generate ZIP on demand.

Flow:

Payroll Records
↓
Generate PDFs
↓
Create ZIP
↓
Download ZIP
↓
Delete Temporary Resources

No permanent storage.

---

## Backend Architecture

config/
models/
controllers/
routes/
middleware/
services/
utils/

Use MVC Architecture.

Business logic belongs in services.

---

## Frontend Architecture

pages/
components/
services/
layouts/

Use reusable components.

Use service layer for API calls.

---

## Antigravity Rules

When generating code:

1. Read this file first.
2. Do not redesign architecture.
3. Do not modify completed modules.
4. Generate only requested feature.
5. Reuse existing APIs when possible.
6. Follow MVC architecture.
7. Use scalable and production-ready code.
8. Keep token usage minimal.
