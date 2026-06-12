/**
 * @file SearchBar.jsx
 * @description Debounced search input component (500 ms).
 *
 *  Props:
 *    value      {string}   controlled value
 *    onChange   {fn}       called with the debounced string
 *    placeholder {string}  optional placeholder text
 */

import { useState, useEffect, useRef } from "react";

const SearchBar = ({ value, onChange, placeholder = "Search…" }) => {
  const [local, setLocal] = useState(value);
  const timerRef = useRef(null);

  // Sync if parent resets value (e.g. clear button)
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocal(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(val), 500);
  };

  const handleClear = () => {
    setLocal("");
    clearTimeout(timerRef.current);
    onChange("");
  };

  return (
    <div className="relative flex items-center">
      {/* Search icon */}
      <svg
        className="absolute left-3.5 text-slate-500 pointer-events-none"
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        id="employee-search"
        type="text"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04]
                   pl-10 pr-9 py-2.5 text-sm text-slate-200 placeholder-slate-600
                   outline-none transition-all duration-200
                   focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15"
      />

      {/* Clear button */}
      {local && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 flex items-center text-slate-600 hover:text-slate-400 transition-colors"
          aria-label="Clear search"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchBar;
