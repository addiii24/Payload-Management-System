/**
 * @file EmployeeTable.jsx
 * @description Displays the employee list in a responsive dark table.
 *
 *  Props:
 *    employees  {array}   list of employee objects
 *    loading    {boolean} show skeleton rows while fetching
 *    onEdit     {fn}      called with employee object
 *    onDelete   {fn}      called with employee object
 */

const COLS = ["Employee ID", "Name", "Department", "Designation", "Basic Salary", "Actions"];

/* ── Skeleton row shown during loading ── */
const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-5 py-4">
        <div className="h-3.5 rounded-full bg-white/[0.06] animate-pulse" style={{ width: `${60 + (i % 3) * 20}%` }} />
      </td>
    ))}
  </tr>
);

/* ── Format salary as ₹ locale string ── */
const formatSalary = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const EmployeeTable = ({ employees, loading, onEdit, onDelete }) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
      <table className="w-full border-collapse text-sm">
        {/* Header */}
        <thead>
          <tr className="border-b border-white/[0.07] bg-white/[0.02]">
            {COLS.map((col) => (
              <th
                key={col}
                className="px-5 py-3.5 text-left text-[11.5px] font-semibold uppercase
                           tracking-wider text-slate-500"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-white/[0.04]">
          {/* Loading skeletons */}
          {loading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

          {/* Empty state */}
          {!loading && employees.length === 0 && (
            <tr>
              <td colSpan={6} className="py-20 text-center">
                <div className="flex flex-col items-center gap-3 text-slate-600">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <p className="text-sm">No employees found</p>
                </div>
              </td>
            </tr>
          )}

          {/* Data rows */}
          {!loading && employees.map((emp) => (
            <tr
              key={emp._id}
              className="group transition-colors hover:bg-white/[0.03]"
            >
              <td className="px-5 py-4">
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[12px]
                                 font-mono font-semibold text-indigo-400">
                  {emp.employeeId}
                </span>
              </td>
              <td className="px-5 py-4 font-medium text-slate-200">{emp.name}</td>
              <td className="px-5 py-4 text-slate-400">{emp.department}</td>
              <td className="px-5 py-4 text-slate-400">{emp.designation}</td>
              <td className="px-5 py-4 font-medium text-emerald-400">
                {formatSalary(emp.basicSalary)}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  {/* Edit */}
                  <button
                    type="button"
                    id={`edit-${emp._id}`}
                    onClick={() => onEdit(emp)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                               bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-slate-400
                               transition-all hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                  {/* Delete */}
                  <button
                    type="button"
                    id={`delete-${emp._id}`}
                    onClick={() => onDelete(emp)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                               bg-white/[0.04] px-3 py-1.5 text-[12.5px] font-medium text-slate-400
                               transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeTable;
