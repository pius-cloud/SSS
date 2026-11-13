import React, { useMemo } from 'react';
import type { ScoredEmployee } from '../types/analytics';
import {
  formatCurrencyGBP,
  generateAutoFindings,
  generateRecommendedActions,
} from '../utils/analytics';

interface InsightsTabProps {
  records: ScoredEmployee[];
}

const SCORING_RUBRIC = [
  {
    factor: 'Promotion Stagnation',
    rule: 'Years since last promotion: ≥5 yrs (+30), 3–4.9 yrs (+20), 2–2.9 yrs (+10)',
    maxPts: 30,
  },
  {
    factor: 'Pay vs. Peer Median',
    rule: 'Monthly income vs. level/dept median: <80% (+25), 80–91% (+15), 92–98% (+6)',
    maxPts: 25,
  },
  {
    factor: 'Business Travel Load',
    rule: 'Travel Frequently (+20), Travel Rarely (+8), Non-Travel (0)',
    maxPts: 20,
  },
  {
    factor: 'Tenure Risk Window',
    rule: 'Tenure <1.5 yrs (+15), 1.5–3 yrs (+10), 3.1–6 yrs (+5)',
    maxPts: 15,
  },
  {
    factor: 'Workload / Mobility Modifier',
    rule: 'OverTime = Yes (+10), or Job Satisfaction ≤2 (+10), or Age <28 (+10) / <33 (+5)',
    maxPts: 10,
  },
];

export const InsightsTab: React.FC<InsightsTabProps> = ({ records }) => {
  const findings = useMemo(() => generateAutoFindings(records), [records]);

  const activePool = useMemo(() => {
    const active = records.filter((r) => !r.attrition);
    return active.length > 0 ? active : records;
  }, [records]);

  const showingActiveOnly = records.some((r) => !r.attrition);

  const watchlist = useMemo(() => {
    return [...activePool]
      .sort((a, b) => {
        if (b.flightRiskScore !== a.flightRiskScore) {
          return b.flightRiskScore - a.flightRiskScore;
        }
        return b.yearsSincePromotion - a.yearsSincePromotion;
      })
      .slice(0, 10);
  }, [activePool]);

  const actions = useMemo(
    () => generateRecommendedActions(records, watchlist),
    [records, watchlist]
  );

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] p-8 text-center text-sm text-[#71717A] dark:text-[#A1A1AA]">
        No employees match the current filter selection. Adjust or reset filters to generate insights and the flight-risk watchlist.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-Generated Findings */}
      <section className="rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="font-display text-base font-bold text-[#111111] dark:text-white">
            Automated Workforce Findings
          </h2>
          <p className="text-xs text-[#666660] dark:text-[#A1A1AA] mt-0.5">
            Live diagnostics computed across the {records.length.toLocaleString('en-GB')} employees in your current filter selection
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {findings.map((finding) => (
            <article
              key={finding.id}
              className="rounded-md border border-[#ECECE8] dark:border-[#262626] bg-[#FAFAF8] dark:bg-[#191919] p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                    {finding.category}
                  </span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      finding.severity === 'critical'
                        ? 'text-[#C2410C] dark:text-[#FB923C]'
                        : finding.severity === 'warning'
                          ? 'text-[#B45309] dark:text-[#FFC800]'
                          : 'text-[#111111] dark:text-[#F4F4F5]'
                    }`}
                  >
                    {finding.metricValue}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-sm font-semibold text-[#111111] dark:text-[#F5F5F4] leading-snug">
                  {finding.headline}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                  {finding.detail}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Top-10 Flight-Risk Watchlist + Transparent Rubric */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <section className="xl:col-span-2 rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] overflow-hidden">
          <div className="p-5 border-b border-[#E5E5E0] dark:border-[#262626]">
            <h2 className="font-display text-base font-bold text-[#111111] dark:text-white">
              Top-10 Flight-Risk Watchlist
            </h2>
            <p className="text-xs text-[#666660] dark:text-[#A1A1AA] mt-0.5">
              {showingActiveOnly
                ? 'Highest-scoring active employees ranked by transparent 0–100 retention risk score'
                : 'Showing top-scoring records in current attrited-only selection'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E0] dark:border-[#262626] bg-[#FAFAF8] dark:bg-[#191919] text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                  <th className="px-4 py-3 whitespace-nowrap">#</th>
                  <th className="px-4 py-3 whitespace-nowrap">Employee</th>
                  <th className="px-4 py-3 whitespace-nowrap">Unit & Site</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Pay vs. Median</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Score</th>
                  <th className="px-4 py-3 whitespace-nowrap">Primary Risk Drivers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECECE8] dark:divide-[#222222]">
                {watchlist.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-[#FAF8EE] dark:hover:bg-[#1C1B15] transition-colors align-top"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-[#71717A] tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-[#111111] dark:text-[#F4F4F5]">
                        {emp.name}
                      </div>
                      <div className="text-xs text-[#71717A] dark:text-[#8E8E93] font-mono">
                        {emp.id} · {emp.jobLevel}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-[#27272A] dark:text-[#D4D4D8]">{emp.department}</div>
                      <div className="text-xs text-[#71717A] dark:text-[#8E8E93]">{emp.location}</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="font-mono tabular-nums text-[#111111] dark:text-[#F4F4F5]">
                        {formatCurrencyGBP(emp.monthlyIncome)}
                      </div>
                      <div className="text-xs font-mono tabular-nums text-[#71717A] dark:text-[#8E8E93]">
                        {Math.round(emp.payRatioToMedian * 100)}% of {formatCurrencyGBP(emp.peerMedianIncome)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div
                        className={`font-mono font-bold tabular-nums ${
                          emp.flightRiskTier === 'High'
                            ? 'text-[#C2410C] dark:text-[#FB923C]'
                            : emp.flightRiskTier === 'Elevated'
                              ? 'text-[#B45309] dark:text-[#FFC800]'
                              : 'text-[#52525B] dark:text-[#A1A1AA]'
                        }`}
                      >
                        {emp.flightRiskScore}/100
                      </div>
                      <div className="text-xs text-[#71717A] dark:text-[#8E8E93]">
                        {emp.flightRiskTier} Risk
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#52525B] dark:text-[#D4D4D8] min-w-[220px]">
                      {emp.riskFactors.length === 0 ? (
                        <span>No active risk triggers</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {emp.riskFactors.map((f, fIdx) => (
                            <li key={fIdx} className="tabular-nums">
                              <span className="font-mono font-semibold text-[#111111] dark:text-[#FFC800]">
                                +{f.points}
                              </span>{' '}
                              {f.label} · <span className="text-[#71717A] dark:text-[#A1A1AA]">{f.detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Transparent Scoring Methodology */}
        <section className="rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] p-5">
          <h2 className="font-display text-base font-bold text-[#111111] dark:text-white">
            Transparent Scoring Rule
          </h2>
          <p className="text-xs text-[#666660] dark:text-[#A1A1AA] mt-0.5">
            Deterministic 100-point rubric · High ≥ 60 · Elevated 35–59 · Low &lt; 35
          </p>

          <div className="mt-4 divide-y divide-[#ECECE8] dark:divide-[#242424]">
            {SCORING_RUBRIC.map((item) => (
              <div key={item.factor} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#111111] dark:text-[#F4F4F5]">
                    {item.factor}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#B45309] dark:text-[#FFC800] tabular-nums shrink-0">
                    Max {item.maxPts} pts
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                  {item.rule}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recommended Actions */}
      <section className="rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="font-display text-base font-bold text-[#111111] dark:text-white">
            Recommended HR Actions
          </h2>
          <p className="text-xs text-[#666660] dark:text-[#A1A1AA] mt-0.5">
            Prioritised interventions tailored to the filtered workforce cohorts
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map((action) => (
            <div
              key={action.id}
              className="rounded-md border border-[#ECECE8] dark:border-[#262626] bg-[#FAFAF8] dark:bg-[#191919] p-4"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={`font-semibold ${
                    action.priority === 'Immediate'
                      ? 'text-[#C2410C] dark:text-[#FB923C]'
                      : action.priority === 'Near-Term'
                        ? 'text-[#B45309] dark:text-[#FFC800]'
                        : 'text-[#52525B] dark:text-[#A1A1AA]'
                  }`}
                >
                  {action.priority} Priority
                </span>
                <span className="font-mono tabular-nums text-[#52525B] dark:text-[#A1A1AA]">
                  {action.impactMetric}
                </span>
              </div>
              <h3 className="mt-2 font-display text-sm font-semibold text-[#111111] dark:text-[#F5F5F4]">
                {action.title}
              </h3>
              <p className="mt-1 text-xs font-medium text-[#27272A] dark:text-[#D4D4D8]">
                Target: {action.targetGroup}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                {action.rationale}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
