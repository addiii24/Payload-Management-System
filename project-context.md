# Payroll Management System

## Purpose

Personal-use Payroll Management System for Automotive Company HR.

## Tech Stack

Frontend:

* React
* Vite
* TailwindCSS
* Axios

Backend:

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT

## Completed Modules

* Authentication
* Protected Routes
* Employee Management
* Department Management
* Department Policies
* Payroll Generation
* Overtime Module
* Shift Allowance Module
* Payslip PDF Download
* Bulk Payslip ZIP Download
* Employee Excel Import

## Core Rules

1. No hardcoded PF/ESI/Bonus rules.
2. All deductions come from Department Policies.
3. Deductions are percentage-based.
4. Payroll records stored in MongoDB.
5. PDFs are generated on-demand.
6. PDFs are not stored in DB.
7. ZIP files are generated on-demand.
8. MVC architecture only.

## Collections

employees

departments

departmentPolicies

payrolls

## Current Goal

Build Attendance Module.

## Attendance Design

One document per employee per month.

Example:

{
employeeId,
month,
year,

attendance: {
"1":"P",
"2":"P",
"3":"A",
"4":"WO"
},

summary:{
present:25,
absent:2,
weeklyOff:3,
holidays:1,
paidLeave:0,
paidDays:29
}
}

## Attendance Codes

P  = Present

A  = Absent

WO = Weekly Off

H  = Holiday

CL = Casual Leave

SL = Sick Leave

PL = Paid Leave

## Future Modules

* Holiday Master
* Leave Management
* Attendance Summary Engine
* Salary Register Excel Export
* Advance Salary
* Loan / EMI
* Additional Earnings
* PF Reports
* ESI Reports
* Contractor Payroll
* Full & Final Settlement
* Biometric Integration
* TDS Module

## Important

Generate only requested feature.

Do not modify completed modules.

Reuse existing architecture.
