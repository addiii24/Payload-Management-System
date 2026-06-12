/**
 * @file EditEmployee.jsx
 * @description Page for editing an existing employee.
 *              Fetches the employee by :id from URL params, then shows pre-filled form.
 *              employeeId is not editable (as per API constraint).
 */

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout       from "../components/Layout.jsx";
import EmployeeForm from "../components/EmployeeForm.jsx";
import { getEmployeeById, updateEmployee } from "../services/employeeService.js";

const EditEmployee = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [employee,  setEmployee]  = useState(null);
  const [fetching,  setFetching]  = useState(true);
  const [loading,   setLoading]   = useState(false);
  const [fetchErr,  setFetchErr]  = useState("");
  const [submitErr, setSubmitErr] = useState("");

  /* ── Load employee on mount ── */
  useEffect(() => {
    const load = async () => {
      setFetching(true);
      try {
        const res = await getEmployeeById(id);
        if (res.success) setEmployee(res.data);
        else setFetchErr(res.message || "Employee not found.");
      } catch (err) {
        setFetchErr(err.response?.data?.message || "Failed to load employee.");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [id]);

  /* ── Submit update ── */
  const handleSubmit = async (formData) => {
    setLoading(true);
    setSubmitErr("");

    // Strip employeeId — backend rejects changes to it
    const { employeeId: _skip, ...payload } = formData;
    payload.basicSalary = Number(payload.basicSalary);

    try {
      const res = await updateEmployee(id, payload);
      if (res.success) {
        navigate("/employees", {
          state: { toast: { type: "success", msg: `Employee "${res.data.name}" updated.` } },
        });
      } else {
        setSubmitErr(res.message || "Update failed.");
      }
    } catch (err) {
      setSubmitErr(err.response?.data?.message || "Failed to update. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Edit Employee">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button
          type="button"
          onClick={() => navigate("/employees")}
          className="hover:text-slate-300 transition-colors"
        >
          Employees
        </button>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="text-slate-300">Edit Employee</span>
      </div>

      {/* Loading skeleton */}
      {fetching && (
        <div className="w-full max-w-3xl rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7">
          <div className="mb-6 space-y-2">
            <div className="h-5 w-48 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-3.5 w-72 rounded-full bg-white/[0.04] animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 rounded-full bg-white/[0.05] animate-pulse" />
                <div className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fetch error */}
      {!fetching && fetchErr && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {fetchErr}
        </div>
      )}

      {/* Form */}
      {!fetching && employee && (
        <div className="w-full max-w-3xl rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7">
          {/* Employee ID badge (read-only display) */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Edit Employee</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update the employee details below. Employee ID cannot be changed.
              </p>
            </div>
            <div className="flex-shrink-0 rounded-lg border border-indigo-500/25 bg-indigo-500/10
                            px-3 py-1.5 text-center">
              <span className="block text-[10px] uppercase tracking-wider text-indigo-400/70">ID</span>
              <span className="font-mono text-sm font-bold text-indigo-300">{employee.employeeId}</span>
            </div>
          </div>

          <EmployeeForm
            initialData={employee}
            onSubmit={handleSubmit}
            loading={loading}
            isEdit={true}
            error={submitErr}
          />
        </div>
      )}
    </Layout>
  );
};

export default EditEmployee;
