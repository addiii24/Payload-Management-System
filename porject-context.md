# Payroll Management System

Purpose:
Personal-use payroll software for HR operations in an Automotive Company.

Tech Stack:
- React + Vite
- TailwindCSS
- Express.js
- MongoDB
- JWT Authentication

Current Status:
✅ MongoDB Connected
✅ Backend Running
✅ Employee CRUD APIs Working
✅ Authentication Working
✅ Protected Routes

Architecture:

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
Payslip Download

Core Design Rules:

1. No state rules hardcoded.
2. No PF/ESI/Bonus hardcoded.
3. Everything must be configurable from UI.
4. Department policies control deductions.
5. All deductions stored as percentages.
6. Payroll calculations use percentages from DB.
7. Payroll data stored in DB.
8. PDF payslips NOT stored in DB.
9. Payslips generated on demand.
10. Bulk download generates temporary ZIP.

Collections:

employees
departments
departmentPolicies
payrolls

Department Policy Example:

{
  department: "Production",

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

Payroll Example:

{
  employeeId: "...",

  month: 6,
  year: 2026,

  grossSalary: 30000,

  deductions: [
    {
      name: "PF",
      percentage: 12,
      amount: 3600
    }
  ],

  totalDeduction: 3600,

  netSalary: 26400
}

Important:

- Use existing architecture.
- Do not rewrite existing code.
- Generate only requested feature.
- Follow MVC architecture.
- Use reusable components.