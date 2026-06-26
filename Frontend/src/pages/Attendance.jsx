/**
 * @file Attendance.jsx
 * @description Attendance page for tracking and managing monthly employee attendance.
 */

import React, { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout.jsx";
import AttendanceForm from "../components/AttendanceForm.jsx";
import AttendanceTable from "../components/AttendanceTable.jsx";
import {
  getEmployeeAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from "../services/attendanceService.js";
import api from "../api/api.js";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const Attendance = () => {
  const [employees, setEmployees] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [attendance, setAttendance] = useState({});
  const [existingRecord, setExistingRecord] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // Preload all employees and policies on page mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, polRes] = await Promise.all([
          api.get("/api/employees?limit=1000"),
          api.get("/api/attendance-policy"),
        ]);
        if (empRes.data.success) {
          setEmployees(empRes.data.data?.employees ?? []);
        }
        if (polRes.data.success) {
          setPolicies(polRes.data.data?.policies ?? []);
        }
      } catch (err) {
        console.error("Failed to fetch preload data", err);
        showToast("error", "Failed to load employee list and policies.");
      }
    };
    fetchData();
  }, []);

  // Smart helper to pre-populate blank attendance
  const getSmartDefaults = useCallback((month, year) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const defaults = {};
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month - 1, i);
      if (dateObj.getDay() === 0) {
        defaults[i] = "WO"; // Sunday = Weekly Off
      } else {
        defaults[i] = "P"; // Weekday = Present
      }
    }
    return defaults;
  }, []);

  // Fetch employee attendance when selectors change
  const fetchAttendanceRecord = useCallback(async () => {
    if (!selectedEmployeeId) {
      setAttendance({});
      setExistingRecord(null);
      return;
    }

    setLoading(true);
    try {
      const res = await getEmployeeAttendance(selectedEmployeeId, selectedMonth, selectedYear);
      if (res.success && res.data) {
        setExistingRecord(res.data);
        // Map keys are strings in the DB document, convert map to normal object
        const recordAttendance = res.data.attendance || {};
        // Make sure we convert it to standard JS object
        const loadedAtt = {};
        for (const k in recordAttendance) {
          loadedAtt[k] = recordAttendance[k];
        }
        setAttendance(loadedAtt);
      } else {
        setExistingRecord(null);
        // Load smart defaults
        setAttendance(getSmartDefaults(selectedMonth, selectedYear));
      }
    } catch (err) {
      console.error("Failed to load attendance record", err);
      showToast("error", "Error loading attendance record.");
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId, selectedMonth, selectedYear, getSmartDefaults]);

  useEffect(() => {
    fetchAttendanceRecord();
  }, [fetchAttendanceRecord]);

  // Handle single day status change
  const handleAttendanceChange = (dayNum, status) => {
    setAttendance((prev) => ({
      ...prev,
      [dayNum]: status,
    }));
  };

  // Save/Update record
  const handleSave = async () => {
    if (!selectedEmployeeId) {
      showToast("error", "Please select an employee first.");
      return;
    }

    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    // Validate that all days have been filled
    for (let i = 1; i <= daysInMonth; i++) {
      if (!attendance[i]) {
        showToast("error", `Please select status for day ${i}.`);
        return;
      }
    }

    setSaving(true);
    try {
      if (existingRecord) {
        // Update
        const res = await updateAttendance(existingRecord._id, {
          attendance,
        });
        if (res.success) {
          showToast("success", "Attendance updated successfully.");
          setExistingRecord(res.data);
        } else {
          showToast("error", res.message || "Failed to update attendance.");
        }
      } else {
        // Create
        const res = await createAttendance({
          employeeId: selectedEmployeeId,
          month: selectedMonth,
          year: selectedYear,
          attendance,
        });
        if (res.success) {
          showToast("success", "Attendance saved successfully.");
          setExistingRecord(res.data);
        } else {
          showToast("error", res.message || "Failed to save attendance.");
        }
      }
    } catch (err) {
      console.error("Failed to save attendance", err);
      showToast("error", err.response?.data?.message || "Failed to save attendance record.");
    } finally {
      setSaving(false);
    }
  };

  // Delete record
  const handleDelete = async () => {
    if (!existingRecord) return;
    if (!window.confirm("Are you sure you want to delete this attendance record? This action cannot be undone.")) return;

    setDeleting(true);
    try {
      const res = await deleteAttendance(existingRecord._id);
      if (res.success) {
        showToast("success", "Attendance record deleted.");
        setExistingRecord(null);
        setAttendance(getSmartDefaults(selectedMonth, selectedYear));
      } else {
        showToast("error", res.message || "Failed to delete record.");
      }
    } catch (err) {
      console.error("Failed to delete attendance", err);
      showToast("error", err.response?.data?.message || "Failed to delete attendance record.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout title="Attendance Module">
      {/* Header Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100 font-[Outfit,sans-serif]">
            Employee Attendance Tracker
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Log monthly daily status codes (Present, Leaves, Weekly Offs, Holidays) and auto-compile paid days.
          </p>
        </div>
      </div>

      {/* Selectors Bar */}
      <AttendanceForm
        employees={employees}
        selectedEmployeeId={selectedEmployeeId}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onChangeEmployee={setSelectedEmployeeId}
        onChangeMonth={setSelectedMonth}
        onChangeYear={setSelectedYear}
        loading={loading}
      />

      {/* Main Content Area */}
      {selectedEmployeeId ? (
        <div className="flex flex-col gap-6">
          {/* Status Alert Banner */}
          <div
            className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-6 py-4 shadow-sm ${
              existingRecord
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                : "border-indigo-500/20 bg-indigo-500/5 text-indigo-400"
            }`}
          >
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status:</span>
              <span className="ml-2 text-sm font-semibold">
                {existingRecord
                  ? `Saved attendance loaded (Last updated: ${new Date(
                      existingRecord.updatedAt
                    ).toLocaleDateString()})`
                  : "Attendance NOT saved for this month yet. Showing default working days."}
              </span>
            </div>
            {existingRecord && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all"
              >
                {deleting ? "Deleting..." : "Delete Record"}
              </button>
            )}
          </div>

          {/* Table displaying day-by-day selector and summary stats */}
          <AttendanceTable
            month={selectedMonth}
            year={selectedYear}
            attendance={attendance}
            onChange={handleAttendanceChange}
            readOnly={loading}
            maxPaidLeavePerMonth={
              policies.find(
                (p) =>
                  p.departmentName?.toLowerCase() ===
                  employees.find((e) => e._id === selectedEmployeeId)?.department?.toLowerCase()
              )?.maxPaidLeavePerMonth ?? 1
            }
            canteenEnrolled={
              (() => {
                const emp = employees.find((e) => e._id === selectedEmployeeId);
                return emp?.benefits?.canteen?.status && emp.benefits.canteen.status !== "Not Enrolled";
              })()
            }
            existingSummary={existingRecord?.summary}
          />

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 mt-2">
            <button
              type="button"
              onClick={() => setAttendance(getSmartDefaults(selectedMonth, selectedYear))}
              disabled={loading || saving}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-sm font-medium text-slate-400 hover:bg-white/[0.08] disabled:opacity-50 transition-all"
            >
              Reset to Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-8 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:opacity-90 disabled:opacity-50 hover:-translate-y-px transition-all"
            >
              {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {existingRecord ? "Update Attendance" : "Save Attendance"}
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-28 text-center bg-white/[0.01]">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <rect x="18" y="8" width="2" height="6" />
              <rect x="16" y="10" width="6" height="2" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-300">Select Employee & Period</h3>
          <p className="mt-1.5 text-xs text-slate-500 max-w-sm">
            Please search/select an employee, month, and year above to load or create their attendance records.
          </p>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium text-white shadow-2xl ${
            toast.type === "success"
              ? "border border-emerald-500/50 bg-emerald-600"
              : "border border-red-500/50 bg-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}
    </Layout>
  );
};

export default Attendance;
