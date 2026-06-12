/**
 * @file Employees.jsx
 * @description Main Employee Management page.
 *
 *  Features:
 *    • Paginated employee list (10 per page)
 *    • Debounced search (name / employeeId / department)
 *    • Employee count badge
 *    • Delete confirmation modal
 *    • Navigate to Add / Edit
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout         from "../components/Layout.jsx";
import EmployeeTable  from "../components/EmployeeTable.jsx";
import SearchBar      from "../components/SearchBar.jsx";
import Pagination     from "../components/Pagination.jsx";
import { getEmployees, deleteEmployee } from "../services/employeeService.js";

const LIMIT = 10;

/* ── Confirmation Modal ─────────────────────────────────────── */
const DeleteModal = ({ employee, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
      aria-hidden="true"
    />
    {/* Dialog */}
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/[0.1]
                    bg-[#111827] p-6 shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
      {/* Icon */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </div>
      <h3 className="mb-1.5 text-lg font-semibold text-slate-100">Delete Employee</h3>
      <p className="mb-6 text-sm text-slate-400">
        Are you sure you want to delete{" "}
        <span className="font-semibold text-slate-200">{employee?.name}</span>{" "}
        ({employee?.employeeId})? This action cannot be undone.
      </p>
      <div className="flex items-center gap-3">
        <button
          id="modal-cancel"
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5
                     text-sm font-medium text-slate-400 transition-all hover:bg-white/[0.07]
                     disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          id="modal-confirm-delete"
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl
                     bg-red-500 py-2.5 text-sm font-semibold text-white
                     transition-all hover:bg-red-600 disabled:opacity-60"
        >
          {loading && (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          Delete
        </button>
      </div>
    </div>
  </div>
);

/* ── Page ───────────────────────────────────────────────────── */
const Employees = () => {
  const navigate = useNavigate();

  const [employees,  setEmployees]  = useState([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(false);
  const [toast,      setToast]      = useState(null); // { type: 'success'|'error', msg }
  const [toDelete,   setToDelete]   = useState(null); // employee to confirm delete
  const [deleting,   setDeleting]   = useState(false);

  /* ── Fetch ───────────────────────────────────────────────── */
  const fetchEmployees = useCallback(async (pg, q) => {
    setLoading(true);
    try {
      const res = await getEmployees({ page: pg, limit: LIMIT, search: q });
      if (res.success) {
        setEmployees(res.data.employees);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch {
      showToast("error", "Failed to fetch employees.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees(page, search);
  }, [fetchEmployees, page, search]);

  /* ── Toast helper ────────────────────────────────────────── */
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Search handler (debounce happens inside SearchBar) ── */
  const handleSearch = (val) => {
    setSearch(val);
    setPage(1); // reset to first page on new search
  };

  /* ── Delete handlers ─────────────────────────────────────── */
  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await deleteEmployee(toDelete._id);
      if (res.success) {
        showToast("success", `Employee "${toDelete.name}" deleted.`);
        setToDelete(null);
        // Refetch — go to previous page if current page becomes empty
        const newPage = employees.length === 1 && page > 1 ? page - 1 : page;
        setPage(newPage);
        fetchEmployees(newPage, search);
      }
    } catch (err) {
      showToast("error", err.response?.data?.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout title="Employees">
      {/* ── Header row ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">Employee Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Total Employees:{" "}
            <span className="font-semibold text-indigo-400">{total}</span>
          </p>
        </div>
        <button
          id="add-employee-btn"
          type="button"
          onClick={() => navigate("/employees/add")}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600
                     px-5 py-2.5 text-sm font-semibold text-white
                     shadow-[0_4px_20px_rgba(99,102,241,0.3)]
                     transition-all hover:opacity-90 hover:-translate-y-px"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Employee
        </button>
      </div>

      {/* ── Search bar ───────────────────────────────────────── */}
      <SearchBar
        value={search}
        onChange={handleSearch}
        placeholder="Search by name, ID, or department…"
      />

      {/* ── Table ────────────────────────────────────────────── */}
      <EmployeeTable
        employees={employees}
        loading={loading}
        onEdit={(emp) => navigate(`/employees/${emp._id}/edit`)}
        onDelete={(emp) => setToDelete(emp)}
      />

      {/* ── Pagination ───────────────────────────────────────── */}
      {!loading && total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={LIMIT}
          onPrev={() => setPage((p) => Math.max(p - 1, 1))}
          onNext={() => setPage((p) => Math.min(p + 1, totalPages))}
        />
      )}

      {/* ── Delete confirmation modal ────────────────────────── */}
      {toDelete && (
        <DeleteModal
          employee={toDelete}
          loading={deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setToDelete(null)}
        />
      )}

      {/* ── Toast notification ────────────────────────────────── */}
      {toast && (
        <div
          className={`
            fixed bottom-6 right-6 z-[300] flex items-center gap-3 rounded-xl px-5 py-3.5
            text-sm font-medium text-white shadow-2xl
            transition-all animate-[slideUp_0.3s_ease]
            ${toast.type === "success"
              ? "bg-emerald-600 border border-emerald-500/50"
              : "bg-red-600 border border-red-500/50"}
          `}
        >
          {toast.type === "success" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Layout>
  );
};

export default Employees;
