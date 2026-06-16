/**
 * @file dashboard.controller.js
 * @description Controller for fetching dashboard statistics.
 */

import Employee from "../model/employee.model.js";
import Department from "../model/department.model.js";
import Payroll from "../model/payroll.model.js";
import { sendSuccess, sendError } from "../util/apiError.js";

/**
 * Fetch stats for the Dashboard.
 * GET /api/dashboard/stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    const [totalEmployees, totalDepartments, payslipsGenerated, monthlyPayrollResult] = await Promise.all([
      Employee.countDocuments({}),
      Department.countDocuments({ isActive: true }),
      Payroll.countDocuments({ month, year }),
      Payroll.aggregate([
        { $match: { month, year } },
        { $group: { _id: null, totalNet: { $sum: "$netSalary" } } }
      ])
    ]);

    const monthlyPayroll = monthlyPayrollResult.length > 0 ? monthlyPayrollResult[0].totalNet : 0;

    return sendSuccess(res, 200, "Dashboard stats fetched successfully.", {
      totalEmployees,
      totalDepartments,
      monthlyPayroll: Math.round(monthlyPayroll * 100) / 100,
      payslipsGenerated,
    });
  } catch (err) {
    console.error("[getDashboardStats]", err);
    return sendError(res, 500, "Failed to fetch dashboard stats.");
  }
};
