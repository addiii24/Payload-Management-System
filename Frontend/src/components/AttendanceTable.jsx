/**
 * @file AttendanceTable.jsx
 * @description Table component representing day-by-day attendance status and real-time summaries.
 */

import React from "react";

const STATUS_OPTIONS = [
  { value: "P", label: "P (Present)", colorClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  { value: "A", label: "A (Absent)", colorClass: "bg-red-500/10 border-red-500/30 text-red-400" },
  { value: "WO", label: "WO (Weekly Off)", colorClass: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" },
  { value: "H", label: "H (Holiday)", colorClass: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  { value: "CL", label: "CL (Casual Leave)", colorClass: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
  { value: "SL", label: "SL (Sick Leave)", colorClass: "bg-rose-500/10 border-rose-500/30 text-rose-400" },
  { value: "PL", label: "PL (Paid Leave)", colorClass: "bg-sky-500/10 border-sky-500/30 text-sky-400" },
];

const getStatusBadge = (status) => {
  const option = STATUS_OPTIONS.find((opt) => opt.value === status);
  if (!option) return "bg-slate-500/10 border-slate-500/20 text-slate-500";
  return option.colorClass;
};

const AttendanceTable = ({ month, year, attendance = {}, onChange, readOnly = false }) => {
  // Generate days in the selected month
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month - 1, i);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" });
    daysArray.push({
      dayNum: i,
      dayName,
      isSunday: dayOfWeek === 0,
      formattedDate: `${String(i).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`,
    });
  }

  // Calculate real-time summary based on attendance prop
  let present = 0;
  let absent = 0;
  let weeklyOff = 0;
  let holidays = 0;
  let paidLeave = 0;

  daysArray.forEach(({ dayNum }) => {
    const status = attendance[dayNum];
    if (status === "P") present++;
    else if (status === "A") absent++;
    else if (status === "WO") weeklyOff++;
    else if (status === "H") holidays++;
    else if (status === "CL" || status === "SL" || status === "PL") paidLeave++;
  });

  const paidDays = present + weeklyOff + holidays + paidLeave;

  // Quick fill actions
  const fillAll = (status) => {
    if (readOnly) return;
    const updated = { ...attendance };
    daysArray.forEach(({ dayNum }) => {
      updated[dayNum] = status;
    });
    // Call parent onChange with bulk object if supported, otherwise loop
    daysArray.forEach(({ dayNum }) => {
      onChange(dayNum, status);
    });
  };

  const fillSundays = () => {
    if (readOnly) return;
    daysArray.forEach(({ dayNum, isSunday }) => {
      if (isSunday) {
        onChange(dayNum, "WO");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Fill Actions (Only visible in edit mode) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-500">Quick Fill:</span>
          <button
            type="button"
            onClick={() => fillAll("P")}
            className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            Mark All Present (P)
          </button>
          <button
            type="button"
            onClick={fillSundays}
            className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-[12px] font-medium text-indigo-400 hover:bg-indigo-500/20 transition-all"
          >
            Mark Sundays as Weekly Off (WO)
          </button>
          <button
            type="button"
            onClick={() => fillAll(null)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-slate-400 hover:bg-white/[0.08] transition-all"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Present Days (P)", value: present, color: "text-emerald-400 border-emerald-500/15 bg-emerald-500/5" },
          { label: "Absent Days (A)", value: absent, color: "text-red-400 border-red-500/15 bg-red-500/5" },
          { label: "Weekly Off (WO)", value: weeklyOff, color: "text-indigo-400 border-indigo-500/15 bg-indigo-500/5" },
          { label: "Holidays (H)", value: holidays, color: "text-amber-400 border-amber-500/15 bg-amber-500/5" },
          { label: "Paid Leave (L)", value: paidLeave, color: "text-purple-400 border-purple-500/15 bg-purple-500/5" },
          { label: "Total Paid Days", value: paidDays, color: "text-sky-400 border-sky-500/15 bg-sky-500/5 font-bold" },
        ].map((card, index) => (
          <div
            key={index}
            className={`rounded-2xl border p-4 text-center shadow-md transition-all hover:scale-[1.01] ${card.color}`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{card.label}</div>
            <div className="mt-1.5 text-2xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Days Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d1117]/60 backdrop-blur-md">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02]">
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Date & Weekday
              </th>
              <th className="px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Attendance Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {daysArray.map(({ dayNum, dayName, isSunday, formattedDate }) => {
              const currentStatus = attendance[dayNum] || "";

              return (
                <tr
                  key={dayNum}
                  className={`group transition-colors hover:bg-white/[0.02] ${
                    isSunday ? "bg-indigo-500/[0.02]" : ""
                  }`}
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-200">{formattedDate}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                          isSunday
                            ? "bg-indigo-500/15 text-indigo-400"
                            : "bg-white/[0.06] text-slate-400"
                        }`}
                      >
                        {dayName}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    {readOnly ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${getStatusBadge(
                          currentStatus
                        )}`}
                      >
                        {currentStatus || "Not Marked"}
                      </span>
                    ) : (
                      <div className="relative max-w-[180px]">
                        <select
                          value={currentStatus}
                          onChange={(e) => onChange(dayNum, e.target.value)}
                          className={`w-full rounded-xl border px-3 py-1.5 text-[13px] font-medium outline-none transition-all cursor-pointer select-field ${
                            currentStatus
                              ? getStatusBadge(currentStatus)
                              : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.06]"
                          }`}
                        >
                          <option value="" className="bg-[#0f1422] text-slate-400">
                            -- Select --
                          </option>
                          <option value="P" className="bg-[#0f1422] text-emerald-400">
                            P (Present)
                          </option>
                          <option value="A" className="bg-[#0f1422] text-red-400">
                            A (Absent)
                          </option>
                          <option value="WO" className="bg-[#0f1422] text-indigo-400">
                            WO (Weekly Off)
                          </option>
                          <option value="H" className="bg-[#0f1422] text-amber-400">
                            H (Holiday)
                          </option>
                          <option value="CL" className="bg-[#0f1422] text-purple-400">
                            CL (Casual Leave)
                          </option>
                          <option value="SL" className="bg-[#0f1422] text-rose-400">
                            SL (Sick Leave)
                          </option>
                          <option value="PL" className="bg-[#0f1422] text-sky-400">
                            PL (Paid Leave)
                          </option>
                        </select>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Styled inline components */}
      <style>{`
        .select-field {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 1rem;
          padding-right: 2.25rem !important;
        }
      `}</style>
    </div>
  );
};

export default AttendanceTable;
