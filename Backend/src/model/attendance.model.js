/**
 * @file attendance.model.js
 * @description Mongoose schema and model for the Attendance collection.
 *              Stores one document per employee per month, capturing daily attendance status codes.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ATTENDANCE_STATUSES = ["P", "A", "WO", "H", "CL", "SL", "PL"];

const attendanceSchema = new Schema(
  {
    /** Reference to the Employee document */
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee ID is required"],
    },

    /** Calendar month (1 = January … 12 = December) */
    month: {
      type: Number,
      required: [true, "Month is required"],
      min: [1, "Month must be between 1 and 12"],
      max: [12, "Month must be between 1 and 12"],
    },

    /** 4-digit calendar year, e.g. 2026 */
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: [2000, "Year must be at least 2000"],
      max: [2100, "Year must be at most 2100"],
    },

    /**
     * Map of day numbers ("1" to "31") to attendance status code.
     * Status options:
     * - P  = Present
     * - A  = Absent
     * - WO = Weekly Off
     * - H  = Holiday
     * - CL = Casual Leave
     * - SL = Sick Leave
     * - PL = Paid Leave
     */
    attendance: {
      type: Map,
      of: {
        type: String,
        enum: {
          values: ATTENDANCE_STATUSES,
          message: `{VALUE} is not a valid attendance status. Must be one of: ${ATTENDANCE_STATUSES.join(", ")}`,
        },
      },
      default: {},
    },

    /**
     * Auto-calculated summary fields derived from the attendance map.
     */
    summary: {
      present: { type: Number, default: 0, min: 0 },
      absent: { type: Number, default: 0, min: 0 },
      weeklyOff: { type: Number, default: 0, min: 0 },
      holidays: { type: Number, default: 0, min: 0 },
      paidLeave: { type: Number, default: 0, min: 0 },
      leaveWithoutPay: { type: Number, default: 0, min: 0 },
      paidDays: { type: Number, default: 0, min: 0 },
      workingDays: { type: Number, default: 0, min: 0 },
      canteenEligibleDays: { type: Number, default: 0, min: 0 },
    },

    /** Generic metadata store for future modules without database migrations */
    metadata: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// One attendance document per employee per month/year
attendanceSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

// Fast queries for payroll and reporting
attendanceSchema.index({ month: 1, year: 1 });
attendanceSchema.index({ employeeId: 1 });

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
// Pre-save hook to calculate summary fields automatically when saving
attendanceSchema.pre("save", async function (next) {
  try {
    let present = 0;
    let absent = 0;
    let weeklyOff = 0;
    let holidays = 0;
    let paidLeave = 0;

    const attMap = this.attendance || {};

    const values =
      typeof attMap.values === "function"
        ? [...attMap.values()]
        : Object.values(attMap);

    for (const status of values) {
      if (status === "P") present++;
      else if (status === "A") absent++;
      else if (status === "WO") weeklyOff++;
      else if (status === "H") holidays++;
      else if (status === "CL" || status === "SL" || status === "PL") {
        paidLeave++;
      }
    }

    // Dynamic calculations from Employee benefits & Department Policy
    const EmployeeModel = mongoose.model("Employee");
    const employee = await EmployeeModel.findById(this.employeeId);

    let maxPaidLeave = 1; // default fallback if no policy
    let canteenEnrolled = false;

    if (employee) {
      if (employee.benefits && employee.benefits.canteen && employee.benefits.canteen.status !== "Not Enrolled") {
        canteenEnrolled = true;
      }

      if (employee.department) {
        const AttendancePolicyModel = mongoose.model("AttendancePolicy");
        const policy = await AttendancePolicyModel.findOne({
          departmentName: { $regex: new RegExp("^" + employee.department.trim() + "$", "i") },
        });
        if (policy && typeof policy.maxPaidLeavePerMonth === "number") {
          maxPaidLeave = policy.maxPaidLeavePerMonth;
        }
      }
    }

    // Leave Taken is paidLeave
    const leaveWithoutPay = Math.max(0, paidLeave - maxPaidLeave);

    // Paid Days Formula: Present + Paid Leave - LOP + Weekly Off + Holidays
    const paidDays = present + (paidLeave - leaveWithoutPay) + weeklyOff + holidays;

    // Working Days Formula: Month Days - Weekly Offs - Company Holidays
    const daysInMonth = new Date(this.year, this.month, 0).getDate();
    const workingDays = Math.max(0, daysInMonth - weeklyOff - holidays);

    // Canteen Eligible Days: Present days if enrolled, else 0
    const canteenEligibleDays = canteenEnrolled ? present : 0;

    this.summary = {
      present,
      absent,
      weeklyOff,
      holidays,
      paidLeave,
      leaveWithoutPay,
      paidDays,
      workingDays,
      canteenEligibleDays,
    };

    next();
  } catch (err) {
    next(err);
  }
});

export { ATTENDANCE_STATUSES };
const Attendance = model("Attendance", attendanceSchema);
export default Attendance;
