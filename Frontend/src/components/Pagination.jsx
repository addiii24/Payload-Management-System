/**
 * @file Pagination.jsx
 * @description Prev / Next pagination bar with page-of-total display.
 *
 *  Props:
 *    page        {number}  current page (1-indexed)
 *    totalPages  {number}  total pages
 *    total       {number}  total record count
 *    limit       {number}  records per page
 *    onPrev      {fn}      called when Previous is clicked
 *    onNext      {fn}      called when Next is clicked
 */

const Pagination = ({ page, totalPages, total, limit, onPrev, onNext }) => {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3
                    border-t border-white/[0.06] pt-4 text-sm text-slate-500">
      {/* Record range */}
      <span>
        Showing <span className="font-medium text-slate-300">{from}–{to}</span> of{" "}
        <span className="font-medium text-slate-300">{total}</span> employees
      </span>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          id="page-prev"
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                     bg-white/[0.03] px-3.5 py-2 text-[13px] font-medium text-slate-400
                     transition-all hover:bg-white/[0.07] hover:text-slate-200
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Previous
        </button>

        <span className="rounded-lg border border-white/[0.08] bg-indigo-500/15
                         px-3.5 py-2 text-[13px] font-semibold text-indigo-300">
          {page} / {totalPages || 1}
        </span>

        <button
          id="page-next"
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08]
                     bg-white/[0.03] px-3.5 py-2 text-[13px] font-medium text-slate-400
                     transition-all hover:bg-white/[0.07] hover:text-slate-200
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
