/**
 * @file payroll.service.js
 * @description Core payroll calculation logic.
 *
 *  Responsibilities:
 *    1. Resolve an employee's department to a DepartmentPolicy.
 *    2. Apply each percentage deduction to the employee's basicSalary.
 *    3. Return a ready-to-save payroll data object (does NOT write to DB).
 *
 *  Separation of concerns:
 *    - This service is pure calculation — no Express req/res.
 *    - The controller calls this service, then persists the result.
 *    - This makes the engine independently unit-testable.
 *
 *  Lookup strategy:
 *    Employee.department is a plain string (e.g. "Production").
 *    DepartmentPolicy is linked to a Department document via departmentId.
 *    We match Department.departmentName (case-insensitive) to Employee.department,
 *    then load the associated DepartmentPolicy.
 */

import Department       from "../model/department.model.js";
import DepartmentPolicy from "../model/departmentPolicy.model.js";

/**
 * Calculate deductions and net salary for a single employee.
 *
 * @param {object} employee  - Mongoose Employee document (populated)
 * @param {number} month     - 1–12
 * @param {number} year      - e.g. 2026
 *
 * @returns {Promise<{
 *   employeeId:    ObjectId,
 *   employeeName:  string,
 *   employeeCode:  string,
 *   department:    string,
 *   designation:   string,
 *   month:         number,
 *   year:          number,
 *   grossSalary:   number,
 *   deductions:    Array<{ name, percentage, amount }>,
 *   totalDeduction: number,
 *   netSalary:     number,
 *   status:        "processed"
 * }>}
 *
 * @throws {Error} If no department found or policy cannot be resolved.
 */
export const calculatePayroll = async (employee, month, year) => {
  const grossSalary = employee.basicSalary;

  /* ── Step 1: Find the Department by name (case-insensitive) ── */
  const department = await Department.findOne({
    departmentName: { $regex: `^${employee.department.trim()}$`, $options: "i" },
    isActive: true,
  });

  if (!department) {
    throw new Error(
      `Department "${employee.department}" not found or is inactive. ` +
      `Please create it and configure a policy before generating payroll.`
    );
  }

  /* ── Step 2: Load the DepartmentPolicy ── */
  const policy = await DepartmentPolicy.findOne({ departmentId: department._id });

  // An empty deductions array is valid — employee gets 0 deductions
  const deductionRules = policy?.deductions ?? [];

  /* ── Step 3: Apply each deduction ── */
  let totalDeduction = 0;
  const deductions = deductionRules.map((rule) => {
    // Round to 2 decimal places to avoid floating-point drift
    const amount = Math.round(((rule.percentage / 100) * grossSalary) * 100) / 100;
    totalDeduction += amount;
    return {
      name:       rule.name,
      percentage: rule.percentage,
      amount,
    };
  });

  // Final round to prevent accumulated floating-point error
  totalDeduction = Math.round(totalDeduction * 100) / 100;
  const netSalary   = Math.round((grossSalary - totalDeduction) * 100) / 100;

  return {
    employeeId:    employee._id,
    employeeName:  employee.name,
    employeeCode:  employee.employeeId,   // human-readable code e.g. "EMP001"
    department:    employee.department,
    designation:   employee.designation,
    month,
    year,
    grossSalary,
    deductions,
    totalDeduction,
    netSalary,
    status: "processed",
  };
};

/**
 * Calculate payroll for multiple employees in one pass.
 * Returns both successful results and per-employee errors.
 *
 * @param {object[]} employees  - Array of Mongoose Employee documents
 * @param {number}   month
 * @param {number}   year
 *
 * @returns {Promise<{
 *   results: object[],
 *   errors:  Array<{ employeeCode: string, name: string, error: string }>
 * }>}
 */
export const calculateBulkPayroll = async (employees, month, year) => {
  const results = [];
  const errors  = [];

  for (const emp of employees) {
    try {
      const payrollData = await calculatePayroll(emp, month, year);
      results.push(payrollData);
    } catch (err) {
      errors.push({
        employeeCode: emp.employeeId,
        name:         emp.name,
        error:        err.message,
      });
    }
  }

  return { results, errors };
};
