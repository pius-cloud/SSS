import React, { useMemo } from 'react';
import type { ChartData, ChartOptions } from 'chart.js';
import type { DatasetMeta, ScoredEmployee, ThemeMode } from '../types/analytics';
import {
  computeOverviewMetrics,
  formatCurrencyGBP,
  formatPercent,
  groupBreakdown,
} from '../utils/analytics';
import { ChartCard } from './ChartCard';
import { KpiCard } from './KpiCard';

interface OverviewTabProps {
  records: ScoredEmployee[];
  meta: DatasetMeta | null;
  theme: ThemeMode;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ records, meta, theme }) => {
  const metrics = useMemo(() => computeOverviewMetrics(records), [records]);
  const isEmpty = records.length === 0;
  const isDark = theme === 'dark';

  const deptBreakdown = useMemo(
    () => groupBreakdown(records, (r) => r.department, 'count'),
    [records]
  );

  const locationBreakdown = useMemo(
    () => groupBreakdown(records, (r) => r.location, 'count'),
    [records]
  );

  const genderBreakdown = useMemo(
    () => groupBreakdown(records, (r) => r.gender, 'count'),
    [records]
  );

  const employmentBreakdown = useMemo(
    () => groupBreakdown(records, (r) => r.employmentType, 'count'),
    [records]
  );

  const hiringTrend = useMemo(() => {
    const yearMap = new Map<number, number>();
    for (const r of records) {
      if (r.hireYear !== null) {
        yearMap.set(r.hireYear, (yearMap.get(r.hireYear) || 0) + 1);
      }
    }
    return Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year: String(year), count }));
  }, [records]);

  const deptChartData: ChartData<'bar'> = useMemo(
    () => ({
      labels: deptBreakdown.map((d) => d.label),
      datasets: [
        {
          label: 'Active',
          data: deptBreakdown.map((d) => d.active),
          backgroundColor: '#FFC800',
          borderRadius: 4,
        },
        {
          label: 'Attrited',
          data: deptBreakdown.map((d) => d.attrited),
          backgroundColor: '#F58220',
          borderRadius: 4,
        },
      ],
    }),
    [deptBreakdown]
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

  const locationChartData: ChartData<'bar'> = useMemo(
    () => ({
      labels: locationBreakdown.map((l) => l.label),
      datasets: [
        {
          label: 'Active',
          data: locationBreakdown.map((l) => l.active),
          backgroundColor: isDark ? '#FFC800' : '#18181B',
          borderRadius: 4,
        },
        {
          label: 'Attrited',
          data: locationBreakdown.map((l) => l.attrited),
          backgroundColor: '#F58220',
          borderRadius: 4,
        },
      ],
    }),
    [locationBreakdown, isDark]
  );

  const horizontalStackedOptions: ChartOptions<'bar'> = useMemo(
    () => ({
      indexAxis: 'y',
      scales: {
        x: { stacked: true, beginAtZero: true },
        y: { stacked: true },
      },
    }),
    []
  );

  const palette = useMemo(
    () =>
      isDark
        ? ['#FFC800', '#F58220', '#E4E4E7', '#71717A', '#A1A1AA', '#FDBA74']
        : ['#FFC800', '#18181B', '#F58220', '#71717A', '#D4D4D8', '#B45309'],
    [isDark]
  );

  const genderChartData: ChartData<'doughnut'> = useMemo(
    () => ({
      labels: genderBreakdown.map((g) => g.label),
      datasets: [
        {
          data: genderBreakdown.map((g) => g.total),
          backgroundColor: genderBreakdown.map((_, i) => palette[i % palette.length]),
          borderColor: isDark ? '#141414' : '#FFFFFF',
          borderWidth: 2,
        },
      ],
    }),
    [genderBreakdown, palette, isDark]
  );

  const empTypeChartData: ChartData<'doughnut'> = useMemo(
    () => ({
      labels: employmentBreakdown.map((e) => e.label),
      datasets: [
        {
          data: employmentBreakdown.map((e) => e.total),
          backgroundColor: employmentBreakdown.map((_, i) => palette[i % palette.length]),
          borderColor: isDark ? '#141414' : '#FFFFFF',
          borderWidth: 2,
        },
      ],
    }),
    [employmentBreakdown, palette, isDark]
  );

  const doughnutOptions: ChartOptions<'doughnut'> = useMemo(
    () => ({
      cutout: '62%',
    }),
    []
  );

  const hiringChartData: ChartData<'line'> = useMemo(
    () => ({
      labels: hiringTrend.map((h) => h.year),
      datasets: [
        {
          label: 'Hires',
          data: hiringTrend.map((h) => h.count),
          borderColor: '#F58220',
          backgroundColor: isDark
            ? 'rgba(255, 200, 0, 0.16)'
            : 'rgba(255, 200, 0, 0.25)',
          pointBackgroundColor: '#FFC800',
          pointBorderColor: isDark ? '#141414' : '#111111',
          pointBorderWidth: 1.5,
          pointRadius: 3.5,
          fill: true,
          tension: 0.25,
        },
      ],
    }),
    [hiringTrend, isDark]
  );

  const lineOptions: ChartOptions<'line'> = useMemo(
    () => ({
      scales: {
        y: { beginAtZero: true },
      },
    }),
    []
  );

  const anyEstimatedHireYear = records.some((r) => r.hireYearEstimated);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Headcount"
          value={metrics.headcount.toLocaleString('en-GB')}
          subtext={`${metrics.activeCount.toLocaleString('en-GB')} active · ${metrics.attritedCount.toLocaleString('en-GB')} attrited`}
          accentTone="yellow"
        />
        <KpiCard
          label="Attrition Rate"
          value={formatPercent(metrics.attritionRate)}
          subtext={`${metrics.attritedCount.toLocaleString('en-GB')} exited in selection`}
          accentTone={metrics.attritionRate >= 15 ? 'alert' : 'default'}
        />
        <KpiCard
          label="Active Employees"
          value={metrics.activeCount.toLocaleString('en-GB')}
          subtext={`${formatPercent(
            metrics.headcount > 0 ? (metrics.activeCount / metrics.headcount) * 100 : 0
          )} retention share`}
        />
        <KpiCard
          label="Average Monthly Income"
          value={formatCurrencyGBP(metrics.avgMonthlyIncome)}
          subtext={`${formatCurrencyGBP(metrics.avgMonthlyIncome * 12)} annualised avg`}
        />
        <KpiCard
          label="Monthly Payroll (Active)"
          value={formatCurrencyGBP(metrics.monthlyPayroll, true)}
          subtext={`${formatCurrencyGBP(metrics.monthlyPayroll * 12, true)} annualised run-rate`}
          accentTone="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Headcount & Attrition by Department"
          subtitle="Active vs. attrited employees across functional units"
          type="bar"
          data={deptChartData}
          options={stackedBarOptions}
          theme={theme}
          isEmpty={isEmpty}
        />

        <ChartCard
          title="Headcount by UK Location"
          subtitle="Regional distribution across Shell UK sites"
          type="bar"
          data={locationChartData}
          options={horizontalStackedOptions}
          theme={theme}
          isEmpty={isEmpty}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        <ChartCard
          title="Gender Distribution"
          subtitle="Workforce split across reported gender"
          type="doughnut"
          data={genderChartData}
          options={doughnutOptions}
          theme={theme}
          isEmpty={isEmpty}
        />

        <ChartCard
          title="Employment Type Mix"
          subtitle="Contract and working-pattern composition"
          type="doughnut"
          data={empTypeChartData}
          options={doughnutOptions}
          theme={theme}
          isEmpty={isEmpty}
        />

        <div className="md:col-span-2 xl:col-span-1">
          <ChartCard
            title="Hiring Trend by Year"
            subtitle={
              meta?.hasHireDateColumn && !anyEstimatedHireYear
                ? 'Annual intake volume from hire dates'
                : 'Annual intake cohort (derived from tenure where hire date omitted)'
            }
            type="line"
            data={hiringChartData}
            options={lineOptions}
            theme={theme}
            isEmpty={isEmpty || hiringTrend.length === 0}
          />
        </div>
      </div>
    </div>
  );
};
