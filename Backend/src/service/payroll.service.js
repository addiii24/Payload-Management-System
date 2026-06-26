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

import mongoose from "mongoose";
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
  // Fetch Attendance record
  const Attendance = mongoose.model("Attendance");
  const attendance = await Attendance.findOne({ employeeId: employee._id, month, year });
  if (!attendance) {
    throw new Error(
      `Attendance record not found for employee "${employee.name}" (${employee.employeeId}) for ${month}/${year}. ` +
      `Please save the attendance record before generating payroll.`
    );
  }

  const workingDays = attendance.summary.workingDays ?? 0;
  const paidDays = attendance.summary.paidDays ?? 0;
  const presentDays = attendance.summary.present ?? 0;
  const lopDays = attendance.summary.leaveWithoutPay ?? 0;
  const companyHolidays = attendance.summary.holidays ?? 0;
  const weeklyOff = attendance.summary.weeklyOff ?? 0;
  const canteenEligibleDays = attendance.summary.canteenEligibleDays ?? 0;

  // Fetch department attendance policy to determine calculation method
  const AttendancePolicyModel = mongoose.model("AttendancePolicy");
  const attendancePolicy = await AttendancePolicyModel.findOne({
    departmentName: { $regex: new RegExp("^" + employee.department.trim() + "$", "i") }
  });
  const calcMethod = attendancePolicy?.attendanceCalculationMethod ?? "Calendar Days";

  const daysInMonth = new Date(year, month, 0).getDate();
  let prorationFactor = 1.0;

  if (calcMethod === "Calendar Days") {
    prorationFactor = daysInMonth > 0 ? (paidDays / daysInMonth) : 0;
  } else if (calcMethod === "Working Days") {
    // Paid Days excluding weekly off and holidays = present + (paidLeave - LOP)
    const activePaidDays = presentDays + (attendance.summary.paidLeave - lopDays);
    prorationFactor = workingDays > 0 ? (activePaidDays / workingDays) : 0;
  }
  prorationFactor = Math.min(1.0, Math.max(0, prorationFactor));

  /* Step 1 — Gross = basic + hra + other (prorated) */
  const baseBasic = employee.basicSalary ?? 0;
  const baseHra = employee.hra ?? 0;
  const baseOther = employee.otherAllowances ?? 0;

  const basicSalary = round2(baseBasic * prorationFactor);
  const hra = round2(baseHra * prorationFactor);
  const otherAllowances = round2(baseOther * prorationFactor);
  const grossSalary = round2(basicSalary + hra + otherAllowances);

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
    /* attendance snapshot */
    workingDays,
    paidDays,
    presentDays,
    lopDays,
    companyHolidays,
    weeklyOff,
    canteenEligibleDays,
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
