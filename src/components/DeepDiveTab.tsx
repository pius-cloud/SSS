import React, { useMemo, useState } from 'react';
import type { ChartData, ChartOptions } from 'chart.js';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import type {
  EmployeeSortKey,
  ScoredEmployee,
  SortConfig,
  ThemeMode,
} from '../types/analytics';
import {
  computeBandBreakdown,
  computeDeepDiveMetrics,
  formatCurrencyGBP,
  formatPercent,
  groupBreakdown,
} from '../utils/analytics';
import { ChartCard } from './ChartCard';
import { KpiCard } from './KpiCard';

interface DeepDiveTabProps {
  records: ScoredEmployee[];
  theme: ThemeMode;
}

const PAGE_SIZE = 20;

export const DeepDiveTab: React.FC<DeepDiveTabProps> = ({ records, theme }) => {
  const metrics = useMemo(() => computeDeepDiveMetrics(records), [records]);
  const isEmpty = records.length === 0;
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'flightRiskScore',
    direction: 'desc',
  });
  const [page, setPage] = useState(1);

  // 1. Age Bands with Attrition
  const ageBandData = useMemo(
    () =>
      computeBandBreakdown(records, [
        { label: '<25', match: (r) => r.age !== null && r.age < 25 },
        { label: '25–34', match: (r) => r.age !== null && r.age >= 25 && r.age <= 34 },
        { label: '35–44', match: (r) => r.age !== null && r.age >= 35 && r.age <= 44 },
        { label: '45–54', match: (r) => r.age !== null && r.age >= 45 && r.age <= 54 },
        { label: '55+', match: (r) => r.age !== null && r.age >= 55 },
      ]),
    [records]
  );

  const ageChartData: ChartData<'bar'> = useMemo(
    () => ({
      labels: ageBandData.map((b) => b.label),
      datasets: [
        {
          label: 'Active',
          data: ageBandData.map((b) => b.active),
          backgroundColor: '#FFC800',
          borderRadius: 4,
        },
        {
          label: 'Attrited',
          data: ageBandData.map((b) => b.attrited),
          backgroundColor: '#F58220',
          borderRadius: 4,
        },
      ],
    }),
    [ageBandData]
  );

  // 2. Tenure Bands with Attrition
  const tenureBandData = useMemo(
    () =>
      computeBandBreakdown(records, [
        { label: '<1 yr', match: (r) => r.tenureYears < 1 },
        { label: '1–2 yrs', match: (r) => r.tenureYears >= 1 && r.tenureYears < 3 },
        { label: '3–5 yrs', match: (r) => r.tenureYears >= 3 && r.tenureYears < 6 },
        { label: '6–10 yrs', match: (r) => r.tenureYears >= 6 && r.tenureYears <= 10 },
        { label: '10+ yrs', match: (r) => r.tenureYears > 10 },
      ]),
    [records]
  );

  const tenureChartData: ChartData<'bar'> = useMemo(
    () => ({
      labels: tenureBandData.map((b) => b.label),
      datasets: [
        {
          label: 'Active',
          data: tenureBandData.map((b) => b.active),
          backgroundColor: isDark ? '#FFC800' : '#18181B',
          borderRadius: 4,
        },
        {
          label: 'Attrited',
          data: tenureBandData.map((b) => b.attrited),
          backgroundColor: '#F58220',
          borderRadius: 4,
        },
      ],
    }),
    [tenureBandData, isDark]
  );

  const stackedBarOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true },
      },
    }),
    []
  );

  // 3. Income by Level & Department
  const incomeByLevelDeptData: ChartData<'bar'> = useMemo(() => {
    const levels = Array.from(new Set(records.map((r) => r.jobLevel))).sort((a, b) => {
      const numA = Number(a.match(/\d+/)?.[0] ?? 999);
      const numB = Number(b.match(/\d+/)?.[0] ?? 999);
      return numA !== numB ? numA - numB : a.localeCompare(b);
    });

    const deptCounts = groupBreakdown(records, (r) => r.department, 'count');
    const topDepts = deptCounts.slice(0, 5).map((d) => d.label);

    const seriesColors = isDark
      ? ['#FFC800', '#F58220', '#E4E4E7', '#71717A', '#FB923C']
      : ['#FFC800', '#18181B', '#F58220', '#71717A', '#B45309'];

    return {
      labels: levels,
      datasets: topDepts.map((dept, idx) => ({
        label: dept,
        data: levels.map((lvl) => {
          const matching = records.filter(
            (r) => r.department === dept && r.jobLevel === lvl
          );
          if (matching.length === 0) return 0;
          return Math.round(
            matching.reduce((s, r) => s + r.monthlyIncome, 0) / matching.length
          );
        }),
        backgroundColor: seriesColors[idx % seriesColors.length],
        borderRadius: 3,
      })),
    };
  }, [records, isDark]);

  const incomeBarOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `£${Number(value).toLocaleString('en-GB')}`,
          },
        },
      },
    }),
    []
  );

  // 4. Education breakdown
  const educationBreakdown = useMemo(
    () => groupBreakdown(records, (r) => r.education, 'count'),
    [records]
  );

  const educationChartData: ChartData<'bar'> = useMemo(
    () => ({
      labels: educationBreakdown.map((e) => e.label),
      datasets: [
        {
          label: 'Active',
          data: educationBreakdown.map((e) => e.active),
          backgroundColor: '#FFC800',
          borderRadius: 4,
        },
        {
          label: 'Attrited',
          data: educationBreakdown.map((e) => e.attrited),
          backgroundColor: '#F58220',
          borderRadius: 4,
        },
      ],
    }),
    [educationBreakdown]
  );

  // 5. Business Travel
  const travelBreakdown = useMemo(
    () => groupBreakdown(records, (r) => r.businessTravel, 'count'),
    [records]
  );

  const travelChartData: ChartData<'bar'> = useMemo(
    () => ({
      labels: travelBreakdown.map((t) => t.label),
      datasets: [
        {
          label: 'Active',
          data: travelBreakdown.map((t) => t.active),
          backgroundColor: isDark ? '#E4E4E7' : '#18181B',
          borderRadius: 4,
        },
        {
          label: 'Attrited',
          data: travelBreakdown.map((t) => t.attrited),
          backgroundColor: '#F58220',
          borderRadius: 4,
        },
      ],
    }),
    [travelBreakdown, isDark]
  );

  // 6. Income vs Tenure Scatter
  const scatterData: ChartData<'scatter'> = useMemo(() => {
    const activePts = records
      .filter((r) => !r.attrition)
      .slice(0, 600)
      .map((r) => ({ x: r.tenureYears, y: r.monthlyIncome }));
    const attritedPts = records
      .filter((r) => r.attrition)
      .slice(0, 400)
      .map((r) => ({ x: r.tenureYears, y: r.monthlyIncome }));

    return {
      datasets: [
        {
          label: 'Active',
          data: activePts,
          backgroundColor: isDark
            ? 'rgba(255, 200, 0, 0.65)'
            : 'rgba(24, 24, 27, 0.45)',
          pointRadius: 3.5,
        },
        {
          label: 'Attrited',
          data: attritedPts,
          backgroundColor: 'rgba(245, 130, 32, 0.9)',
          pointRadius: 4.5,
        },
      ],
    };
  }, [records, isDark]);

  const scatterOptions: ChartOptions<'scatter'> = useMemo(
    () => ({
      scales: {
        x: {
          title: {
            display: true,
            text: 'Tenure (Years)',
            color: isDark ? '#A1A1AA' : '#52525B',
            font: { size: 11 },
          },
          beginAtZero: true,
        },
        y: {
          title: {
            display: true,
            text: 'Monthly Income (£)',
            color: isDark ? '#A1A1AA' : '#52525B',
            font: { size: 11 },
          },
          beginAtZero: true,
          ticks: {
            callback: (val) => `£${Number(val).toLocaleString('en-GB')}`,
          },
        },
      },
    }),
    [isDark]
  );

  // Search & Sort for Employee Table
  const filteredAndSortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const searched = q
      ? records.filter(
          (r) =>
            r.id.toLowerCase().includes(q) ||
            r.name.toLowerCase().includes(q) ||
            r.department.toLowerCase().includes(q) ||
            r.location.toLowerCase().includes(q) ||
            r.jobRole.toLowerCase().includes(q) ||
            r.jobLevel.toLowerCase().includes(q)
        )
      : records;

    const sorted = [...searched].sort((a, b) => {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      const key = sortConfig.key;
      const valA = a[key];
      const valB = b[key];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * dir;
      }
      return String(valA).localeCompare(String(valB)) * dir;
    });

    return sorted;
  }, [records, searchQuery, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredAndSortedRows.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const toggleSort = (key: EmployeeSortKey) => {
    setPage(1);
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'monthlyIncome' || key === 'flightRiskScore' || key === 'tenureYears' || key === 'yearsSincePromotion' ? 'desc' : 'asc' }
    );
  };

  const renderSortIcon = (key: EmployeeSortKey) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" aria-hidden="true" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#F58220]" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#F58220]" aria-hidden="true" />
    );
  };

  const hasAnyAge = records.some((r) => r.age !== null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Average Tenure"
          value={`${metrics.avgTenure.toFixed(1)} yrs`}
          subtext="Mean years at Shell UK"
          accentTone="yellow"
        />
        <KpiCard
          label="Female Share"
          value={formatPercent(metrics.femaleShare)}
          subtext="Of filtered headcount"
        />
        <KpiCard
          label="Non-Full-Time Share"
          value={formatPercent(metrics.nonFullTimeShare)}
          subtext="Part-time, fixed-term & contract"
        />
        <KpiCard
          label="Years Since Promotion"
          value={`${metrics.avgYearsSincePromotion.toFixed(1)} yrs`}
          subtext="Mean time since last grade move"
        />
        <KpiCard
          label="High Flight-Risk Count"
          value={metrics.highFlightRiskCount.toLocaleString('en-GB')}
          subtext="Active staff scoring 60+ / 100"
          accentTone={metrics.highFlightRiskCount > 0 ? 'alert' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Age Bands & Attrition"
          subtitle="Workforce headcount and exits across age brackets"
          type="bar"
          data={ageChartData}
          options={stackedBarOptions}
          theme={theme}
          isEmpty={isEmpty || !hasAnyAge}
          emptyMessage="Age column not present or no matching rows."
        />

        <ChartCard
          title="Tenure Bands & Attrition"
          subtitle="Retention profile by length of service"
          type="bar"
          data={tenureChartData}
          options={stackedBarOptions}
          theme={theme}
          isEmpty={isEmpty}
        />

        <ChartCard
          title="Average Monthly Income by Level & Department"
          subtitle="Cross-functional compensation progression (£/mo)"
          type="bar"
          data={incomeByLevelDeptData}
          options={incomeBarOptions}
          theme={theme}
          isEmpty={isEmpty}
        />

        <ChartCard
          title="Income vs. Tenure Scatter"
          subtitle="Pay progression against years at Shell UK (Active vs. Attrited)"
          type="scatter"
          data={scatterData}
          options={scatterOptions}
          theme={theme}
          isEmpty={isEmpty}
        />

        <ChartCard
          title="Education & Attrition"
          subtitle="Qualification profile across filtered employees"
          type="bar"
          data={educationChartData}
          options={stackedBarOptions}
          theme={theme}
          isEmpty={isEmpty}
        />

        <ChartCard
          title="Business Travel & Attrition"
          subtitle="Travel intensity distribution and turnover"
          type="bar"
          data={travelChartData}
          options={stackedBarOptions}
          theme={theme}
          isEmpty={isEmpty}
        />
      </div>

      {/* Searchable, Sortable Employee Table */}
      <section className="rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#E5E5E0] dark:border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-semibold text-[#111111] dark:text-[#F5F5F4]">
              Employee Directory & Risk Ledger
            </h3>
            <p className="text-xs text-[#666660] dark:text-[#A1A1AA] tabular-nums mt-0.5">
              {filteredAndSortedRows.length.toLocaleString('en-GB')} matching employees · Click any column header to sort
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search ID, name, role, site..."
              aria-label="Search employees"
              className="w-full h-10 pl-9 pr-3 rounded-md border border-[#D4D4CE] dark:border-[#2E2E2E] bg-[#FAFAF8] dark:bg-[#1A1A1A] text-sm text-[#111111] dark:text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E0] dark:border-[#262626] bg-[#FAFAF8] dark:bg-[#191919] text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                {[
                  { key: 'id' as EmployeeSortKey, label: 'ID', align: 'left' },
                  { key: 'name' as EmployeeSortKey, label: 'Employee', align: 'left' },
                  { key: 'department' as EmployeeSortKey, label: 'Department', align: 'left' },
                  { key: 'location' as EmployeeSortKey, label: 'Location', align: 'left' },
                  { key: 'jobLevel' as EmployeeSortKey, label: 'Level', align: 'left' },
                  { key: 'tenureYears' as EmployeeSortKey, label: 'Tenure', align: 'right' },
                  { key: 'monthlyIncome' as EmployeeSortKey, label: 'Monthly Pay', align: 'right' },
                  { key: 'yearsSincePromotion' as EmployeeSortKey, label: 'Promo Gap', align: 'right' },
                  { key: 'flightRiskScore' as EmployeeSortKey, label: 'Risk Score', align: 'right' },
                  { key: 'attritionLabel' as EmployeeSortKey, label: 'Attrition', align: 'left' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer ${
                        col.align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <span>{col.label}</span>
                      {renderSortIcon(col.key)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECE8] dark:divide-[#222222]">
              {pagedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-sm text-[#71717A] dark:text-[#A1A1AA]"
                  >
                    No employees match your current filters and search query.
                  </td>
                </tr>
              ) : (
                pagedRows.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-[#FAF8EE] dark:hover:bg-[#1C1B15] transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-[#52525B] dark:text-[#A1A1AA] whitespace-nowrap">
                      {emp.id}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="font-medium text-[#111111] dark:text-[#F4F4F5]">
                        {emp.name}
                      </div>
                      <div className="text-xs text-[#71717A] dark:text-[#8E8E93]">
                        {emp.jobRole} · {emp.employmentType}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[#27272A] dark:text-[#D4D4D8] whitespace-nowrap">
                      {emp.department}
                    </td>
                    <td className="px-4 py-2.5 text-[#52525B] dark:text-[#A1A1AA] whitespace-nowrap">
                      {emp.location}
                    </td>
                    <td className="px-4 py-2.5 text-[#27272A] dark:text-[#D4D4D8] whitespace-nowrap">
                      {emp.jobLevel}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#111111] dark:text-[#F4F4F5] whitespace-nowrap">
                      {emp.tenureYears.toFixed(1)}y
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#111111] dark:text-[#F4F4F5] whitespace-nowrap">
                      {formatCurrencyGBP(emp.monthlyIncome)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#52525B] dark:text-[#A1A1AA] whitespace-nowrap">
                      {emp.yearsSincePromotion.toFixed(1)}y
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={
                          emp.flightRiskTier === 'High'
                            ? 'font-semibold text-[#C2410C] dark:text-[#FB923C]'
                            : emp.flightRiskTier === 'Elevated'
                              ? 'font-medium text-[#B45309] dark:text-[#FFC800]'
                              : 'text-[#52525B] dark:text-[#A1A1AA]'
                        }
                      >
                        {emp.flightRiskScore}/100 ({emp.flightRiskTier})
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={
                          emp.attrition
                            ? 'font-semibold text-[#C2410C] dark:text-[#FB923C]'
                            : 'text-[#52525B] dark:text-[#A1A1AA]'
                        }
                      >
                        {emp.attrition ? 'Yes (Left)' : 'No (Active)'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredAndSortedRows.length > PAGE_SIZE && (
          <div className="px-4 py-3 border-t border-[#E5E5E0] dark:border-[#262626] flex items-center justify-between gap-3 text-xs text-[#52525B] dark:text-[#A1A1AA]">
            <span className="tabular-nums">
              Page {safePage} of {totalPages} ({filteredAndSortedRows.length.toLocaleString('en-GB')} rows)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded border border-[#D4D4CE] dark:border-[#2E2E2E] text-[#111111] dark:text-[#F4F4F5] disabled:opacity-40 hover:bg-[#F4F4F0] dark:hover:bg-[#1F1F1F] transition-colors cursor-pointer"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded border border-[#D4D4CE] dark:border-[#2E2E2E] text-[#111111] dark:text-[#F4F4F5] disabled:opacity-40 hover:bg-[#F4F4F0] dark:hover:bg-[#1F1F1F] transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
