import React from 'react';
import { RotateCcw } from 'lucide-react';
import type { FilterOptions, FilterState } from '../types/analytics';

interface FilterBarProps {
  filters: FilterState;
  options: FilterOptions;
  totalCount: number;
  filteredCount: number;
  onChange: (next: FilterState) => void;
  onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  options,
  totalCount,
  filteredCount,
  onChange,
  onReset,
}) => {
  const isModified =
    filters.department !== 'All' ||
    filters.location !== 'All' ||
    filters.employmentType !== 'All' ||
    filters.gender !== 'All' ||
    filters.attrition !== 'All';

  const selectClass =
    'w-full h-10 rounded-md border border-[#D4D4CE] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] px-3 text-sm text-[#111111] dark:text-[#F4F4F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] transition-colors';

  const labelClass =
    'block text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] mb-1.5';

  return (
    <section
      aria-label="Workforce Filters"
      className="rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#52525B] dark:text-[#A1A1AA]">
          <span className="font-semibold text-[#111111] dark:text-[#F4F4F5]">
            Shared Filters
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            Showing <strong className="text-[#111111] dark:text-white">{filteredCount.toLocaleString('en-GB')}</strong> of{' '}
            {totalCount.toLocaleString('en-GB')} employees
          </span>
        </div>

        {isModified && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[#D4D4CE] dark:border-[#2E2E2E] text-[#111111] dark:text-[#F4F4F5] hover:bg-[#F4F4F0] dark:hover:bg-[#1F1F1F] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label htmlFor="filter-department" className={labelClass}>
            Department
          </label>
          <select
            id="filter-department"
            value={filters.department}
            onChange={(e) => onChange({ ...filters, department: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Departments ({options.departments.length})</option>
            {options.departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-location" className={labelClass}>
            Location
          </label>
          <select
            id="filter-location"
            value={filters.location}
            onChange={(e) => onChange({ ...filters, location: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Locations ({options.locations.length})</option>
            {options.locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-employment-type" className={labelClass}>
            Employment Type
          </label>
          <select
            id="filter-employment-type"
            value={filters.employmentType}
            onChange={(e) => onChange({ ...filters, employmentType: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Types ({options.employmentTypes.length})</option>
            {options.employmentTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-gender" className={labelClass}>
            Gender
          </label>
          <select
            id="filter-gender"
            value={filters.gender}
            onChange={(e) => onChange({ ...filters, gender: e.target.value })}
            className={selectClass}
          >
            <option value="All">All Genders ({options.genders.length})</option>
            {options.genders.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-attrition" className={labelClass}>
            Attrition Status
          </label>
          <select
            id="filter-attrition"
            value={filters.attrition}
            onChange={(e) =>
              onChange({
                ...filters,
                attrition: e.target.value as FilterState['attrition'],
              })
            }
            className={selectClass}
          >
            <option value="All">All Employees</option>
            <option value="Active">Active Only (No)</option>
            <option value="Attrited">Attrited Only (Yes)</option>
          </select>
        </div>
      </div>
    </section>
  );
};
