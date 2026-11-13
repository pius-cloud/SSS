export type ThemeMode = 'light' | 'dark';

export type DashboardTab = 'overview' | 'deep-dive' | 'insights';

export interface RawEmployeeRow {
  [key: string]: string;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  department: string;
  location: string;
  employmentType: string;
  gender: string;
  attrition: boolean;
  attritionLabel: 'Yes' | 'No';
  age: number | null;
  monthlyIncome: number;
  annualIncome: number;
  tenureYears: number;
  yearsSincePromotion: number;
  jobLevel: string;
  jobLevelNum: number | null;
  jobRole: string;
  education: string;
  educationField: string;
  businessTravel: string;
  hireYear: number | null;
  hireYearEstimated: boolean;
  overTime: boolean | null;
  jobSatisfaction: number | null;
  workLifeBalance: number | null;
  performanceRating: number | null;
}

export interface RiskFactorContribution {
  label: string;
  points: number;
  detail: string;
}

export interface ScoredEmployee extends EmployeeRecord {
  flightRiskScore: number;
  flightRiskTier: 'High' | 'Elevated' | 'Low';
  riskFactors: RiskFactorContribution[];
  peerMedianIncome: number;
  payRatioToMedian: number;
}

export interface FilterState {
  department: string;
  location: string;
  employmentType: string;
  gender: string;
  attrition: 'All' | 'Active' | 'Attrited';
}

export interface FilterOptions {
  departments: string[];
  locations: string[];
  employmentTypes: string[];
  genders: string[];
}

export type SortDirection = 'asc' | 'desc';

export type EmployeeSortKey =
  | 'id'
  | 'name'
  | 'department'
  | 'location'
  | 'employmentType'
  | 'jobLevel'
  | 'tenureYears'
  | 'monthlyIncome'
  | 'yearsSincePromotion'
  | 'flightRiskScore'
  | 'attritionLabel';

export interface SortConfig {
  key: EmployeeSortKey;
  direction: SortDirection;
}

export interface DatasetMeta {
  source: 'google-sheet' | 'csv-upload';
  sourceLabel: string;
  loadedAt: Date;
  rowCount: number;
  detectedColumns: string[];
  hasHireDateColumn: boolean;
  hasOverTimeColumn: boolean;
  hasSatisfactionColumn: boolean;
}

export type SheetSyncErrorCode =
  | 'AUTH_REQUIRED'
  | 'CORS_OR_NETWORK'
  | 'HTTP_ERROR'
  | 'EMPTY_OR_INVALID_CSV'
  | 'PARSE_ERROR';

export interface SheetSyncError {
  code: SheetSyncErrorCode;
  title: string;
  message: string;
  details?: string;
}

export interface AutoFinding {
  id: string;
  category: 'Attrition' | 'Compensation' | 'Retention Risk' | 'Tenure & Mobility' | 'Workforce Mix';
  headline: string;
  detail: string;
  metricValue: string;
  severity: 'critical' | 'warning' | 'neutral';
}

export interface RecommendedAction {
  id: string;
  priority: 'Immediate' | 'Near-Term' | 'Strategic';
  title: string;
  targetGroup: string;
  rationale: string;
  impactMetric: string;
}
