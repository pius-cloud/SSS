import type {
  AutoFinding,
  EmployeeRecord,
  FilterOptions,
  FilterState,
  RecommendedAction,
  RiskFactorContribution,
  ScoredEmployee,
} from '../types/analytics';

export function formatCurrencyGBP(value: number, compact = false): string {
  if (!Number.isFinite(value)) return '£0';
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `£${(value / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `£${(value / 1_000).toFixed(1)}k`;
    }
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0.0%';
  return `${value.toFixed(decimals)}%`;
}

export function extractFilterOptions(records: EmployeeRecord[]): FilterOptions {
  const uniqueSorted = (values: string[]) =>
    Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

  return {
    departments: uniqueSorted(records.map((r) => r.department)),
    locations: uniqueSorted(records.map((r) => r.location)),
    employmentTypes: uniqueSorted(records.map((r) => r.employmentType)),
    genders: uniqueSorted(records.map((r) => r.gender)),
  };
}

export function applyFilters(records: EmployeeRecord[], filters: FilterState): EmployeeRecord[] {
  return records.filter((r) => {
    if (filters.department !== 'All' && r.department !== filters.department) return false;
    if (filters.location !== 'All' && r.location !== filters.location) return false;
    if (filters.employmentType !== 'All' && r.employmentType !== filters.employmentType) return false;
    if (filters.gender !== 'All' && r.gender !== filters.gender) return false;
    if (filters.attrition === 'Active' && r.attrition) return false;
    if (filters.attrition === 'Attrited' && !r.attrition) return false;
    return true;
  });
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Transparent Flight-Risk Scoring Rubric (0–100 points):
 * 1. Promotion Stagnation (up to 30 pts): >=5y (+30), >=3y (+20), >=2y (+10)
 * 2. Pay Position vs. Peer Median (up to 25 pts): <80% (+25), 80-92% (+15), 92-99% (+6)
 * 3. Business Travel Intensity (up to 20 pts): Frequent (+20), Rare (+8)
 * 4. Tenure Risk Window (up to 15 pts): <1.5y (+15), 1.5-3y (+10), 3-6y (+5)
 * 5. Workload / Engagement / Early-Career Modifier (up to 10 pts):
 *    OverTime=Yes (+10), JobSatisfaction<=2 (+10), or Age<28 (+10) / Age<33 (+5)
 */
export function scoreEmployeesFlightRisk(
  filteredRecords: EmployeeRecord[],
  allRecords: EmployeeRecord[]
): ScoredEmployee[] {
  const peerSource = allRecords.length > 0 ? allRecords : filteredRecords;
  const levelGroups = new Map<string, number[]>();
  const deptGroups = new Map<string, number[]>();
  const allIncomes: number[] = [];

  for (const emp of peerSource) {
    if (emp.monthlyIncome <= 0) continue;
    allIncomes.push(emp.monthlyIncome);
    if (emp.jobLevel !== 'Unspecified') {
      const arr = levelGroups.get(emp.jobLevel) || [];
      arr.push(emp.monthlyIncome);
      levelGroups.set(emp.jobLevel, arr);
    }
    const dArr = deptGroups.get(emp.department) || [];
    dArr.push(emp.monthlyIncome);
    deptGroups.set(emp.department, dArr);
  }

  const globalMedian = median(allIncomes) || 1;
  const levelMedians = new Map<string, number>();
  levelGroups.forEach((vals, k) => levelMedians.set(k, median(vals)));
  const deptMedians = new Map<string, number>();
  deptGroups.forEach((vals, k) => deptMedians.set(k, median(vals)));

  return filteredRecords.map((emp) => {
    const peerMedianIncome =
      (emp.jobLevel !== 'Unspecified' ? levelMedians.get(emp.jobLevel) : undefined) ??
      deptMedians.get(emp.department) ??
      globalMedian;

    const payRatio = peerMedianIncome > 0 ? emp.monthlyIncome / peerMedianIncome : 1;
    const factors: RiskFactorContribution[] = [];

    // 1. Promotion stagnation (0-30)
    if (emp.yearsSincePromotion >= 5) {
      factors.push({
        label: 'Promotion Stagnation',
        points: 30,
        detail: `${emp.yearsSincePromotion} yrs since last promotion`,
      });
    } else if (emp.yearsSincePromotion >= 3) {
      factors.push({
        label: 'Promotion Stagnation',
        points: 20,
        detail: `${emp.yearsSincePromotion} yrs since last promotion`,
      });
    } else if (emp.yearsSincePromotion >= 2) {
      factors.push({
        label: 'Promotion Stagnation',
        points: 10,
        detail: `${emp.yearsSincePromotion} yrs since last promotion`,
      });
    }

    // 2. Pay below peer median (0-25)
    if (emp.monthlyIncome > 0 && peerMedianIncome > 0) {
      if (payRatio < 0.8) {
        factors.push({
          label: 'Below Peer Median Pay',
          points: 25,
          detail: `${Math.round(payRatio * 100)}% of peer median`,
        });
      } else if (payRatio < 0.92) {
        factors.push({
          label: 'Below Peer Median Pay',
          points: 15,
          detail: `${Math.round(payRatio * 100)}% of peer median`,
        });
      } else if (payRatio < 0.99) {
        factors.push({
          label: 'Slightly Below Peer Median',
          points: 6,
          detail: `${Math.round(payRatio * 100)}% of peer median`,
        });
      }
    }

    // 3. Business travel (0-20)
    const travelLower = emp.businessTravel.toLowerCase();
    if (travelLower.includes('frequent')) {
      factors.push({
        label: 'Frequent Travel Load',
        points: 20,
        detail: emp.businessTravel,
      });
    } else if (travelLower.includes('rare')) {
      factors.push({
        label: 'Occasional Travel',
        points: 8,
        detail: emp.businessTravel,
      });
    }

    // 4. Tenure window (0-15)
    if (emp.tenureYears < 1.5) {
      factors.push({
        label: 'Early-Tenure Window',
        points: 15,
        detail: `${emp.tenureYears} yrs tenure`,
      });
    } else if (emp.tenureYears <= 3) {
      factors.push({
        label: 'Early-Career Window',
        points: 10,
        detail: `${emp.tenureYears} yrs tenure`,
      });
    } else if (emp.tenureYears <= 6) {
      factors.push({
        label: 'Mid-Tenure Mobility',
        points: 5,
        detail: `${emp.tenureYears} yrs tenure`,
      });
    }

    // 5. Workload / engagement / age modifier (0-10)
    if (emp.overTime === true) {
      factors.push({
        label: 'Overtime Exposure',
        points: 10,
        detail: 'Regular overtime logged',
      });
    } else if (emp.jobSatisfaction !== null && emp.jobSatisfaction <= 2) {
      factors.push({
        label: 'Low Job Satisfaction',
        points: 10,
        detail: `Satisfaction score ${emp.jobSatisfaction}/4`,
      });
    } else if (emp.age !== null && emp.age < 28) {
      factors.push({
        label: 'High-Mobility Age Cohort',
        points: 10,
        detail: `Age ${emp.age} (<28 cohort)`,
      });
    } else if (emp.age !== null && emp.age < 33) {
      factors.push({
        label: 'Early-Career Age Cohort',
        points: 5,
        detail: `Age ${emp.age} (28–32 cohort)`,
      });
    }

    const total = Math.min(
      100,
      factors.reduce((sum, f) => sum + f.points, 0)
    );
    const tier: 'High' | 'Elevated' | 'Low' =
      total >= 60 ? 'High' : total >= 35 ? 'Elevated' : 'Low';

    return {
      ...emp,
      flightRiskScore: total,
      flightRiskTier: tier,
      riskFactors: factors,
      peerMedianIncome,
      payRatioToMedian: payRatio,
    };
  });
}

export interface OverviewMetrics {
  headcount: number;
  activeCount: number;
  attritedCount: number;
  attritionRate: number;
  avgMonthlyIncome: number;
  monthlyPayroll: number;
}

export function computeOverviewMetrics(records: ScoredEmployee[]): OverviewMetrics {
  const headcount = records.length;
  const active = records.filter((r) => !r.attrition);
  const attritedCount = headcount - active.length;
  const attritionRate = headcount > 0 ? (attritedCount / headcount) * 100 : 0;
  const avgMonthlyIncome =
    headcount > 0
      ? records.reduce((s, r) => s + r.monthlyIncome, 0) / headcount
      : 0;
  const monthlyPayroll = active.reduce((s, r) => s + r.monthlyIncome, 0);

  return {
    headcount,
    activeCount: active.length,
    attritedCount,
    attritionRate,
    avgMonthlyIncome,
    monthlyPayroll,
  };
}

export interface DeepDiveMetrics {
  avgTenure: number;
  femaleShare: number;
  nonFullTimeShare: number;
  avgYearsSincePromotion: number;
  highFlightRiskCount: number;
}

export function computeDeepDiveMetrics(records: ScoredEmployee[]): DeepDiveMetrics {
  const n = records.length;
  if (n === 0) {
    return {
      avgTenure: 0,
      femaleShare: 0,
      nonFullTimeShare: 0,
      avgYearsSincePromotion: 0,
      highFlightRiskCount: 0,
    };
  }

  const avgTenure = records.reduce((s, r) => s + r.tenureYears, 0) / n;
  const femaleCount = records.filter((r) => r.gender.trim().toLowerCase() === 'female').length;
  const nonFullTimeCount = records.filter((r) => {
    const t = r.employmentType.trim().toLowerCase();
    return t !== '' && !t.includes('full-time') && !t.includes('full time') && t !== 'fulltime';
  }).length;
  const avgYearsSincePromotion = records.reduce((s, r) => s + r.yearsSincePromotion, 0) / n;
  const highFlightRiskCount = records.filter(
    (r) => !r.attrition && r.flightRiskScore >= 60
  ).length;

  return {
    avgTenure,
    femaleShare: (femaleCount / n) * 100,
    nonFullTimeShare: (nonFullTimeCount / n) * 100,
    avgYearsSincePromotion,
    highFlightRiskCount,
  };
}

export interface CategoryBreakdown {
  label: string;
  total: number;
  active: number;
  attrited: number;
  attritionRate: number;
  avgIncome: number;
}

export function groupBreakdown(
  records: ScoredEmployee[],
  accessor: (r: ScoredEmployee) => string,
  sortBy: 'count' | 'label' | 'attritionRate' = 'count'
): CategoryBreakdown[] {
  const map = new Map<string, { total: number; active: number; attrited: number; incomeSum: number }>();

  for (const r of records) {
    const key = accessor(r) || 'Unspecified';
    const curr = map.get(key) || { total: 0, active: 0, attrited: 0, incomeSum: 0 };
    curr.total += 1;
    if (r.attrition) curr.attrited += 1;
    else curr.active += 1;
    curr.incomeSum += r.monthlyIncome;
    map.set(key, curr);
  }

  const result: CategoryBreakdown[] = Array.from(map.entries()).map(([label, v]) => ({
    label,
    total: v.total,
    active: v.active,
    attrited: v.attrited,
    attritionRate: v.total > 0 ? (v.attrited / v.total) * 100 : 0,
    avgIncome: v.total > 0 ? v.incomeSum / v.total : 0,
  }));

  if (sortBy === 'count') result.sort((a, b) => b.total - a.total);
  else if (sortBy === 'attritionRate') result.sort((a, b) => b.attritionRate - a.attritionRate);
  else result.sort((a, b) => a.label.localeCompare(b.label));

  return result;
}

export function computeBandBreakdown(
  records: ScoredEmployee[],
  bands: { label: string; match: (r: ScoredEmployee) => boolean }[]
): CategoryBreakdown[] {
  return bands.map((band) => {
    const matching = records.filter(band.match);
    const total = matching.length;
    const attrited = matching.filter((r) => r.attrition).length;
    const active = total - attrited;
    const incomeSum = matching.reduce((s, r) => s + r.monthlyIncome, 0);
    return {
      label: band.label,
      total,
      active,
      attrited,
      attritionRate: total > 0 ? (attrited / total) * 100 : 0,
      avgIncome: total > 0 ? incomeSum / total : 0,
    };
  });
}

export function generateAutoFindings(records: ScoredEmployee[]): AutoFinding[] {
  if (records.length === 0) return [];
  const findings: AutoFinding[] = [];
  const overview = computeOverviewMetrics(records);

  // 1. Department attrition hotspot
  const depts = groupBreakdown(records, (r) => r.department, 'attritionRate').filter(
    (d) => d.total >= Math.min(3, records.length)
  );
  if (depts.length > 0) {
    const topDept = depts[0];
    findings.push({
      id: 'dept-attrition',
      category: 'Attrition',
      headline: `${topDept.label} leads departmental attrition`,
      detail: `${topDept.attrited} of ${topDept.total} employees in ${topDept.label} have exited (${formatPercent(topDept.attritionRate)} vs. ${formatPercent(overview.attritionRate)} overall).`,
      metricValue: formatPercent(topDept.attritionRate),
      severity: topDept.attritionRate > overview.attritionRate * 1.25 && topDept.attrited > 0 ? 'critical' : 'warning',
    });
  }

  // 2. Location spread
  const locs = groupBreakdown(records, (r) => r.location, 'attritionRate').filter((l) => l.total >= 2);
  if (locs.length > 1) {
    const highest = locs[0];
    const largest = [...locs].sort((a, b) => b.total - a.total)[0];
    findings.push({
      id: 'location-mix',
      category: 'Workforce Mix',
      headline: `${largest.label} anchors headcount; ${highest.label} sees highest turnover`,
      detail: `${largest.label} holds ${largest.total} employees (${formatPercent((largest.total / records.length) * 100)} of selection), while ${highest.label} records ${formatPercent(highest.attritionRate)} attrition.`,
      metricValue: `${largest.total} staff`,
      severity: highest.attritionRate > 18 ? 'warning' : 'neutral',
    });
  }

  // 3. Promotion stagnation vs attrition
  const stalled = records.filter((r) => r.yearsSincePromotion >= 3);
  const recentPromo = records.filter((r) => r.yearsSincePromotion < 3);
  if (stalled.length > 0 && recentPromo.length > 0) {
    const stalledAttr = (stalled.filter((r) => r.attrition).length / stalled.length) * 100;
    const recentAttr = (recentPromo.filter((r) => r.attrition).length / recentPromo.length) * 100;
    findings.push({
      id: 'promo-stagnation',
      category: 'Tenure & Mobility',
      headline: `Employees 3+ years without promotion show ${formatPercent(stalledAttr)} attrition`,
      detail: `Compared with ${formatPercent(recentAttr)} among peers promoted within 3 years (${stalled.length} employees currently in the 3+ yr stalled cohort).`,
      metricValue: `${stalled.length} stalled`,
      severity: stalledAttr > recentAttr + 5 ? 'critical' : 'neutral',
    });
  }

  // 4. Pay gap between active and attrited (or gender pay parity)
  const activePay = records.filter((r) => !r.attrition);
  const attritedPay = records.filter((r) => r.attrition);
  if (activePay.length > 0 && attritedPay.length > 0) {
    const avgActive = activePay.reduce((s, r) => s + r.monthlyIncome, 0) / activePay.length;
    const avgAttrited = attritedPay.reduce((s, r) => s + r.monthlyIncome, 0) / attritedPay.length;
    const diffPct = avgActive > 0 ? ((avgAttrited - avgActive) / avgActive) * 100 : 0;
    findings.push({
      id: 'comp-attrition-gap',
      category: 'Compensation',
      headline:
        diffPct < -5
          ? `Leavers earned ${formatPercent(Math.abs(diffPct))} less on average`
          : `Leaver pay averages ${formatCurrencyGBP(avgAttrited)}/mo`,
      detail: `Attrited staff averaged ${formatCurrencyGBP(avgAttrited)} monthly vs. ${formatCurrencyGBP(avgActive)} for active employees across this filtered cohort.`,
      metricValue: formatCurrencyGBP(avgAttrited),
      severity: diffPct < -10 ? 'warning' : 'neutral',
    });
  }

  // 5. Business travel or High Risk active pool
  const activeHighRisk = records.filter((r) => !r.attrition && r.flightRiskScore >= 60);
  const travelFreq = records.filter((r) => r.businessTravel.toLowerCase().includes('frequent'));
  if (activeHighRisk.length > 0 || travelFreq.length > 0) {
    const freqAttr =
      travelFreq.length > 0
        ? (travelFreq.filter((r) => r.attrition).length / travelFreq.length) * 100
        : 0;
    findings.push({
      id: 'flight-risk-exposure',
      category: 'Retention Risk',
      headline: `${activeHighRisk.length} active employees score High Flight Risk (60+ pts)`,
      detail:
        travelFreq.length > 0
          ? `Frequent travellers (${travelFreq.length} staff) show ${formatPercent(freqAttr)} attrition, amplifying flight-risk exposure.`
          : `Representing ${formatPercent((activeHighRisk.length / Math.max(1, overview.activeCount)) * 100)} of active employees in this view.`,
      metricValue: `${activeHighRisk.length} high risk`,
      severity: activeHighRisk.length > 0 ? 'critical' : 'neutral',
    });
  }

  return findings.slice(0, 5);
}

export function generateRecommendedActions(
  records: ScoredEmployee[],
  watchlist: ScoredEmployee[]
): RecommendedAction[] {
  if (records.length === 0) return [];
  const actions: RecommendedAction[] = [];

  // Action 1: High-risk watchlist intervention
  const highRiskActive = watchlist.filter((w) => w.flightRiskScore >= 60);
  if (highRiskActive.length > 0) {
    const topDept = groupBreakdown(highRiskActive, (r) => r.department, 'count')[0]?.label || 'priority teams';
    actions.push({
      id: 'act-watchlist',
      priority: 'Immediate',
      title: 'Conduct Stay Interviews for High-Risk Talent',
      targetGroup: `${highRiskActive.length} active High-Risk employees (concentrated in ${topDept})`,
      rationale:
        'Top watchlist staff combine multiple exit predictors (promotion lag, below-median peer pay, or heavy travel). Immediate 1:1 career conversations reduce surprise departures.',
      impactMetric: `Protects ${formatCurrencyGBP(highRiskActive.reduce((s, r) => s + r.monthlyIncome, 0))}/mo talent base`,
    });
  }

  // Action 2: Pay equity / peer median catch-up
  const underpaidActive = records.filter(
    (r) => !r.attrition && r.monthlyIncome > 0 && r.payRatioToMedian < 0.85
  );
  if (underpaidActive.length > 0) {
    actions.push({
      id: 'act-pay-band',
      priority: 'Near-Term',
      title: 'Target Off-Cycle Compensation Calibration',
      targetGroup: `${underpaidActive.length} active staff paid below 85% of level median`,
      rationale:
        'Employees below 85% of internal peer level medians carry a +25 pt flight-risk penalty and face heightened external poaching pressure.',
      impactMetric: `${formatPercent((underpaidActive.length / Math.max(1, records.filter((r) => !r.attrition).length)) * 100)} of active cohort`,
    });
  }

  // Action 3: Promotion / career progression review
  const stalledActive = records.filter((r) => !r.attrition && r.yearsSincePromotion >= 3);
  if (stalledActive.length > 0) {
    actions.push({
      id: 'act-promotion',
      priority: 'Near-Term',
      title: 'Launch Career Pathing & Progression Audits',
      targetGroup: `${stalledActive.length} active employees 3+ years without promotion`,
      rationale:
        'Extended time-in-grade without progression is the single highest-weighted internal mobility risk factor in the scoring rubric.',
      impactMetric: `Avg ${ (stalledActive.reduce((s, r) => s + r.yearsSincePromotion, 0) / stalledActive.length).toFixed(1) } yrs since promotion`,
    });
  }

  // Action 4: Early tenure or travel mitigation
  const earlyTenure = records.filter((r) => !r.attrition && r.tenureYears < 2);
  if (earlyTenure.length > 0) {
    actions.push({
      id: 'act-onboarding',
      priority: 'Strategic',
      title: 'Reinforce 12- & 18-Month Tenure Checkpoints',
      targetGroup: `${earlyTenure.length} active employees under 2 years tenure`,
      rationale:
        'Early-tenure attrition spikes when onboarding expectations diverge from day-to-day role scope or travel requirements.',
      impactMetric: `${earlyTenure.length} early-tenure employees`,
    });
  }

  return actions;
}
