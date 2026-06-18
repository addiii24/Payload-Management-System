/**
 * @file AttendanceForm.jsx
 * @description Selector form component for choosing employee, month, and year.
 */

import React, { useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

const AttendanceForm = ({
  employees = [],
  selectedEmployeeId = "",
  selectedMonth = new Date().getMonth() + 1,
  selectedYear = new Date().getFullYear(),
  onChangeEmployee,
  onChangeMonth,
  onChangeYear,
  loading = false,
}) => {
  const [empSearch, setEmpSearch] = useState("");

  // Filter employees by search query (name or employeeId)
  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.employeeId.toLowerCase().includes(empSearch.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/[0.07] bg-[#0d1117]/60 backdrop-blur-md p-6 lg:grid-cols-3">
      {/* Employee Search & Select */}
      <div className="flex flex-col gap-1.5 lg:col-span-1">
        <label className="text-[12px] font-medium text-slate-400">
          Employee <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-col gap-1">
          <input
            type="text"
            placeholder="Type name or code to search..."
            value={empSearch}
            onChange={(e) => setEmpSearch(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/50"
          />
          <select
            value={selectedEmployeeId}
            onChange={(e) => onChangeEmployee(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/50 disabled:opacity-50 cursor-pointer"
          >
            <option value="" className="bg-[#0f1422]">— Select Employee —</option>
            {filteredEmployees.map((e) => (
              <option key={e._id} value={e._id} className="bg-[#0f1422]">
                {e.employeeId} — {e.name} ({e.department})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex flex-col gap-1.5 lg:col-span-1">
        <label className="text-[12px] font-medium text-slate-400">
          Month <span className="text-red-400">*</span>
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => onChangeMonth(Number(e.target.value))}
          disabled={loading}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/50 disabled:opacity-50 cursor-pointer h-[42px] mt-[29px] lg:mt-0"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1} className="bg-[#0f1422]">
              {m}
            </option>
          ))}
        </select>
      </div>

      {/* Year Selector */}
      <div className="flex flex-col gap-1.5 lg:col-span-1">
        <label className="text-[12px] font-medium text-slate-400">
          Year <span className="text-red-400">*</span>
        </label>
        <select
          value={selectedYear}
          onChange={(e) => onChangeYear(Number(e.target.value))}
          disabled={loading}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/50 disabled:opacity-50 cursor-pointer h-[42px] mt-[29px] lg:mt-0"
        >
          {years.map((y) => (
            <option key={y} value={y} className="bg-[#0f1422]">
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AttendanceForm;
