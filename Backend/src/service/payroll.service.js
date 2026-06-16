/**
 * @file payroll.service.js
 * @description Core payroll calculation logic (Architecture v2).
 *
 *  Correct formula:
 *    Step 1: grossSalary = basicSalary + hra + otherAllowances
 *    Step 2: deductions  = percentage rules applied ONLY to grossSalary
 *    Step 3: shiftAllowance = Σ(daysWorked × ratePerDay) from ShiftAttendance
 *            overtimeAmount = Σ(hours × ratePerHour) from OvertimeRecord
 *            totalAdditions = shiftAllowance + overtimeAmount
 *    Step 4: netPay = grossSalary − totalDeductions + totalAdditions
 *
 *  Key constraint: additions are NEVER part of Gross.
 *  Deductions (PF, ESI) are calculated on basic+hra+other only.
 */

import Department       from "../model/department.model.js";
import DepartmentPolicy from "../model/departmentPolicy.model.js";
import ShiftAttendance  from "../model/shiftAttendance.model.js";
import OvertimeRecord   from "../model/overtimeRecord.model.js";

const round2 = (n) => Math.round(n * 100) / 100;

/* ═══════════════════════════════════════════════════════════════
   SHIFT ALLOWANCE
   Returns 0 gracefully when employee has no attendance records.
═══════════════════════════════════════════════════════════════ */
const calcShiftAllowance = async (employeeId, month, year) => {
  const records = await ShiftAttendance.find({ employeeId, month, year })
    .populate("shiftId", "shiftName allowancePerDay");

  if (!records.length) return { shiftAllowance: 0, shiftBreakdown: [] };

  let total = 0;
  const breakdown = [];

  for (const r of records) {
    const shift = r.shiftId;
    if (!shift) continue;
    const ratePerDay = shift.allowancePerDay ?? 0;
    const lineTotal  = round2(r.daysWorked * ratePerDay);
    total += lineTotal;
    breakdown.push({
      shiftName: shift.shiftName,
      daysWorked: r.daysWorked,
      ratePerDay,
      total: lineTotal,
    });
  }

  return { shiftAllowance: round2(total), shiftBreakdown: breakdown };
};

/* ═══════════════════════════════════════════════════════════════
   OVERTIME
   Returns 0 gracefully when employee has no OT records.
═══════════════════════════════════════════════════════════════ */
const calcOvertime = async (employeeId, month, year) => {
  const records = await OvertimeRecord.find({ employeeId, month, year });

  if (!records.length) return { overtimeAmount: 0, overtimeBreakdown: [] };

  let total = 0;
  const breakdown = [];

  for (const r of records) {
    total += r.totalAmount;
    breakdown.push({
      otType:      r.otType,
      hours:       r.hours,
      ratePerHour: r.ratePerHour,
      total:       r.totalAmount,
    });
  }

  return { overtimeAmount: round2(total), overtimeBreakdown: breakdown };
};

/* ═══════════════════════════════════════════════════════════════
   SINGLE EMPLOYEE PAYROLL
═══════════════════════════════════════════════════════════════ */
export const calculatePayroll = async (employee, month, year) => {

  /* Step 1 — Gross = basic + hra + other */
  const basicSalary     = employee.basicSalary    ?? 0;
  const hra             = employee.hra             ?? 0;
  const otherAllowances = employee.otherAllowances ?? 0;
  const grossSalary     = round2(basicSalary + hra + otherAllowances);

  /* Step 2 — Deductions (applied ONLY to grossSalary) */
  const dept = await Department.findOne({
    departmentName: { $regex: `^${employee.department.trim()}$`, $options: "i" },
    isActive: true,
  });
  if (!dept) {
    throw new Error(
      `Department "${employee.department}" not found or is inactive. ` +
      `Please create it and configure a policy before generating payroll.`
    );
  }

  const policy       = await DepartmentPolicy.findOne({ departmentId: dept._id });
  const deductionRules = policy?.deductions ?? [];

  let totalDeduction = 0;
  const deductions = deductionRules.map((rule) => {
    const amount = round2((rule.percentage / 100) * grossSalary);
    totalDeduction += amount;
    return { name: rule.name, percentage: rule.percentage, amount };
  });
  totalDeduction = round2(totalDeduction);

  /* Step 3 — Additions (post-deduction) */
  const [shiftResult, otResult] = await Promise.all([
    calcShiftAllowance(employee._id, month, year),
    calcOvertime(employee._id, month, year),
  ]);

  const { shiftAllowance, shiftBreakdown }         = shiftResult;
  const { overtimeAmount, overtimeBreakdown }       = otResult;
  const totalAdditions = round2(shiftAllowance + overtimeAmount);

  /* Step 4 — Net Pay */
  const netSalary = round2(grossSalary - totalDeduction + totalAdditions);

  return {
    employeeId:        employee._id,
    employeeName:      employee.name,
    employeeCode:      employee.employeeId,
    department:        employee.department,
    designation:       employee.designation,
    month,
    year,
    /* earnings */
    basicSalary,
    hra,
    otherAllowances,
    grossSalary,
    /* deductions */
    deductions,
    totalDeduction,
    /* additions */
    shiftAllowance,
    shiftBreakdown,
    overtimeAmount,
    overtimeBreakdown,
    totalAdditions,
    /* net */
    netSalary,
    status: "processed",
  };
};

/* ═══════════════════════════════════════════════════════════════
   BULK PAYROLL — wrapper that collects errors per employee
═══════════════════════════════════════════════════════════════ */
export const calculateBulkPayroll = async (employees, month, year) => {
  const results = [];
  const errors  = [];

  for (const emp of employees) {
    try {
      results.push(await calculatePayroll(emp, month, year));
    } catch (err) {
      errors.push({ employeeCode: emp.employeeId, name: emp.name, error: err.message });
    }
  }

  return { results, errors };
};
