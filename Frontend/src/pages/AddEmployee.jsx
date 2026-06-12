/**
 * @file AddEmployee.jsx
 * @description Page for creating a new employee.
 *              Uses the shared EmployeeForm component.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout       from "../components/Layout.jsx";
import EmployeeForm from "../components/EmployeeForm.jsx";
import { createEmployee } from "../services/employeeService.js";

const AddEmployee = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");
    try {
      const res = await createEmployee({
        ...formData,
        basicSalary: Number(formData.basicSalary),
      });
      if (res.success) {
        navigate("/employees", {
          state: { toast: { type: "success", msg: `Employee "${formData.name}" created successfully.` } },
        });
      } else {
        setError(res.message || "Failed to create employee.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create employee. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Add Employee">
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
        <span className="text-slate-300">Add Employee</span>
      </div>

      {/* Card */}
      <div className="w-full max-w-3xl rounded-2xl border border-white/[0.07] bg-white/[0.03] p-7">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100">New Employee</h2>
          <p className="mt-1 text-sm text-slate-500">
            Fill in the details below to add a new employee to the system.
          </p>
        </div>

        <EmployeeForm
          onSubmit={handleSubmit}
          loading={loading}
          isEdit={false}
          error={error}
        />
      </div>
    </Layout>
  );
};

export default AddEmployee;
