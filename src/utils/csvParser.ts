import type { DatasetMeta, EmployeeRecord, SheetSyncError } from '../types/analytics';

export const GOOGLE_SHEET_ID = '1x0uzOQCbJ-vua5XVBoojlhMVDWpkaAfE-FwRbmGAchc';
export const GOOGLE_SHEET_GID = '1668347505';
export const GOOGLE_SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit?gid=${GOOGLE_SHEET_GID}#gid=${GOOGLE_SHEET_GID}`;
export const GOOGLE_SHEET_GVIZ_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GOOGLE_SHEET_GID}`;

const EDUCATION_LEVEL_MAP: Record<string, string> = {
  '1': 'Below College',
  '2': 'College',
  '3': "Bachelor's",
  '4': "Master's",
  '5': 'Doctorate',
};

function normalizeHeaderKey(header: string): string {
  return header
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function detectDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;
  if (tabCount > commaCount && tabCount >= semiCount) return '\t';
  if (semiCount > commaCount) return ';';
  return ',';
}

export function parseCsvMatrix(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((cell) => cell !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function isHtmlResponse(text: string): boolean {
  const trimmed = text.trim().slice(0, 500).toLowerCase();
  return (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<head') ||
    trimmed.startsWith('<style') ||
    trimmed.includes('accounts.google.com/servicelogin') ||
    trimmed.includes('<script')
  );
}

function findColumnIndex(normalizedHeaders: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = normalizedHeaders.indexOf(alias);
    if (idx !== -1) return idx;
  }
  for (const alias of aliases) {
    const idx = normalizedHeaders.findIndex((h) => h.includes(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[£$€,\s%]/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanAttrition(raw: string | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return (
    v === 'yes' ||
    v === 'y' ||
    v === 'true' ||
    v === '1' ||
    v === 'left' ||
    v === 'attrited' ||
    v === 'resigned' ||
    v === 'terminated' ||
    v === 'leaver' ||
    v === 'departed'
  );
}

function parseBooleanOptional(raw: string | undefined): boolean | null {
  if (!raw || raw.trim() === '') return null;
  const v = raw.trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(v)) return true;
  if (['no', 'n', 'false', '0'].includes(v)) return false;
  return null;
}

function normalizeTravel(raw: string | undefined): string {
  if (!raw || !raw.trim()) return 'Unspecified';
  const cleaned = raw.trim().replace(/_/g, ' ');
  const lower = cleaned.toLowerCase();
  if (lower.includes('non') || lower === 'none' || lower === 'no travel') return 'Non-Travel';
  if (lower.includes('frequent')) return 'Travel Frequently';
  if (lower.includes('rare') || lower.includes('occasional')) return 'Travel Rarely';
  return cleaned;
}

function normalizeEducation(rawEdu: string | undefined, rawField: string | undefined): {
  education: string;
  educationField: string;
} {
  const eduClean = (rawEdu || '').trim();
  const fieldClean = (rawField || '').trim();
  const mappedEdu = EDUCATION_LEVEL_MAP[eduClean] || eduClean || fieldClean || 'Unspecified';
  const finalField = fieldClean || (EDUCATION_LEVEL_MAP[eduClean] ? EDUCATION_LEVEL_MAP[eduClean] : eduClean) || 'Unspecified';
  return {
    education: mappedEdu,
    educationField: finalField,
  };
}

function parseHireYear(raw: string | undefined): number | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  if (/^\d{4}$/.test(trimmed)) {
    const yr = Number(trimmed);
    if (yr >= 1960 && yr <= 2035) return yr;
  }
  const yearMatch = trimmed.match(/(19\d{2}|20\d{2})/);
  if (yearMatch) {
    const yr = Number(yearMatch[1]);
    if (yr >= 1960 && yr <= 2035) return yr;
  }
  const parsedDate = Date.parse(trimmed);
  if (!Number.isNaN(parsedDate)) {
    const yr = new Date(parsedDate).getFullYear();
    if (yr >= 1960 && yr <= 2035) return yr;
  }
  return null;
}

function normalizeJobLevel(raw: string | undefined): { label: string; num: number | null } {
  if (!raw || !raw.trim()) return { label: 'Unspecified', num: null };
  const trimmed = raw.trim();
  const numMatch = trimmed.match(/\d+/);
  const num = numMatch ? Number(numMatch[0]) : null;
  if (/^\d+$/.test(trimmed)) {
    return { label: `Level ${trimmed}`, num: Number(trimmed) };
  }
  return { label: trimmed, num };
}

export function parseEmployeeDataset(
  csvText: string,
  source: 'google-sheet' | 'csv-upload',
  sourceLabel: string
): { records: EmployeeRecord[]; meta: DatasetMeta } {
  if (!csvText || !csvText.trim()) {
    throw {
      code: 'EMPTY_OR_INVALID_CSV',
      title: 'Empty CSV Response',
      message: 'The data source returned no rows.',
    } satisfies SheetSyncError;
  }

  if (isHtmlResponse(csvText)) {
    throw {
      code: 'AUTH_REQUIRED',
      title: 'Google Sheet Requires Public Sharing',
      message:
        'Google Sheets returned a sign-in HTML page instead of CSV data. Set the sheet sharing permissions to "Anyone with the link → Viewer" and click Sync Sheet, or upload a downloaded CSV file.',
    } satisfies SheetSyncError;
  }

  const matrix = parseCsvMatrix(csvText);
  if (matrix.length < 2) {
    throw {
      code: 'EMPTY_OR_INVALID_CSV',
      title: 'No Employee Rows Found',
      message: 'The CSV file must include a header row and at least one employee record.',
    } satisfies SheetSyncError;
  }

  const rawHeaders = matrix[0].map((h) => h.replace(/^\uFEFF/, '').trim());
  const normalizedHeaders = rawHeaders.map(normalizeHeaderKey);

  const idxId = findColumnIndex(normalizedHeaders, [
    'employeeid',
    'employeenumber',
    'empid',
    'staffid',
    'id',
  ]);
  const idxName = findColumnIndex(normalizedHeaders, [
    'fullname',
    'employeename',
    'name',
    'staffname',
  ]);
  const idxFirstName = findColumnIndex(normalizedHeaders, ['firstname', 'givenname']);
  const idxLastName = findColumnIndex(normalizedHeaders, ['lastname', 'surname', 'familyname']);
  const idxDept = findColumnIndex(normalizedHeaders, [
    'department',
    'dept',
    'businessunit',
    'function',
    'division',
  ]);
  const idxLocation = findColumnIndex(normalizedHeaders, [
    'location',
    'worklocation',
    'uklocation',
    'site',
    'office',
    'city',
    'region',
  ]);
  const idxEmpType = findColumnIndex(normalizedHeaders, [
    'employmenttype',
    'contracttype',
    'worktype',
    'schedule',
    'fullparttime',
    'workstatus',
  ]);
  const idxGender = findColumnIndex(normalizedHeaders, ['gender', 'sex']);
  const idxAttrition = findColumnIndex(normalizedHeaders, [
    'attrition',
    'left',
    'terminated',
    'isattrited',
    'employeestatus',
    'status',
  ]);
  const idxAge = findColumnIndex(normalizedHeaders, ['age']);
  const idxMonthlyIncome = findColumnIndex(normalizedHeaders, [
    'monthlyincome',
    'monthlysalary',
    'monthlypay',
    'income',
    'salary',
    'pay',
    'compensation',
  ]);
  const idxAnnualIncome = findColumnIndex(normalizedHeaders, [
    'annualsalary',
    'annualincome',
    'yearlysalary',
    'basesalary',
  ]);
  const idxTenure = findColumnIndex(normalizedHeaders, [
    'yearsatcompany',
    'tenureyears',
    'tenure',
    'serviceyears',
    'yearsofservice',
  ]);
  const idxPromotion = findColumnIndex(normalizedHeaders, [
    'yearssincelastpromotion',
    'yearssincepromotion',
    'promotiongap',
    'lastpromotionyears',
  ]);
  const idxJobLevel = findColumnIndex(normalizedHeaders, [
    'joblevel',
    'level',
    'jobgrade',
    'grade',
    'band',
    'salaryband',
  ]);
  const idxJobRole = findColumnIndex(normalizedHeaders, [
    'jobrole',
    'role',
    'jobtitle',
    'title',
    'position',
  ]);
  const idxEducation = findColumnIndex(normalizedHeaders, [
    'education',
    'educationlevel',
    'highesteducation',
    'qualification',
  ]);
  const idxEducationField = findColumnIndex(normalizedHeaders, [
    'educationfield',
    'degreefield',
    'fieldofstudy',
    'major',
  ]);
  const idxTravel = findColumnIndex(normalizedHeaders, [
    'businesstravel',
    'travelfrequency',
    'travel',
  ]);
  const idxHireDate = findColumnIndex(normalizedHeaders, [
    'hiredate',
    'joiningdate',
    'dateofjoining',
    'dateofhire',
    'startdate',
    'hireyear',
    'joiningyear',
    'startyear',
  ]);
  const idxOverTime = findColumnIndex(normalizedHeaders, ['overtime']);
  const idxJobSatisfaction = findColumnIndex(normalizedHeaders, ['jobsatisfaction']);
  const idxWorkLifeBalance = findColumnIndex(normalizedHeaders, ['worklifebalance']);
  const idxPerformance = findColumnIndex(normalizedHeaders, ['performancerating']);

  // Detect whether the primary income column looks annual rather than monthly
  const incomeHeaderNorm = idxMonthlyIncome !== -1 ? normalizedHeaders[idxMonthlyIncome] : '';
  const headerSuggestsAnnual =
    incomeHeaderNorm.includes('annual') || incomeHeaderNorm.includes('yearly');

  const rawIncomeSamples: number[] = [];
  if (idxMonthlyIncome !== -1 && !headerSuggestsAnnual) {
    for (let r = 1; r < Math.min(matrix.length, 50); r++) {
      const val = parseNumber(matrix[r][idxMonthlyIncome]);
      if (val !== null && val > 0) rawIncomeSamples.push(val);
    }
  }
  rawIncomeSamples.sort((a, b) => a - b);
  const sampleMedian =
    rawIncomeSamples.length > 0
      ? rawIncomeSamples[Math.floor(rawIncomeSamples.length / 2)]
      : 0;
  // If generic "Salary" / "Income" column has median > 22000, treat it as annual and convert to monthly
  const treatPrimaryAsAnnual =
    headerSuggestsAnnual ||
    (!incomeHeaderNorm.includes('month') && sampleMedian > 22000);

  const referenceYear = new Date().getFullYear();
  const records: EmployeeRecord[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.every((c) => !c)) continue;

    const get = (idx: number): string | undefined =>
      idx >= 0 && idx < row.length ? row[idx] : undefined;

    const idVal = get(idxId) || `EMP-${String(r).padStart(4, '0')}`;
    const combinedName =
      get(idxName) ||
      [get(idxFirstName), get(idxLastName)].filter(Boolean).join(' ').trim() ||
      `Employee ${idVal}`;

    const rawMonthly = parseNumber(get(idxMonthlyIncome));
    const rawAnnual = parseNumber(get(idxAnnualIncome));

    let monthlyIncome = 0;
    if (rawMonthly !== null) {
      monthlyIncome = treatPrimaryAsAnnual ? Math.round(rawMonthly / 12) : rawMonthly;
    } else if (rawAnnual !== null) {
      monthlyIncome = Math.round(rawAnnual / 12);
    }

    const tenureYears = Math.max(0, parseNumber(get(idxTenure)) ?? 0);
    const yearsSincePromotion = Math.max(0, parseNumber(get(idxPromotion)) ?? 0);
    const age = parseNumber(get(idxAge));
    const attrition = parseBooleanAttrition(get(idxAttrition));

    const levelParsed = normalizeJobLevel(get(idxJobLevel));
    const { education, educationField } = normalizeEducation(
      get(idxEducation),
      get(idxEducationField)
    );

    const parsedHireYear = parseHireYear(get(idxHireDate));
    const hireYear =
      parsedHireYear !== null
        ? parsedHireYear
        : idxTenure !== -1
          ? Math.max(1980, referenceYear - Math.round(tenureYears))
          : null;

    records.push({
      id: idVal,
      name: combinedName,
      department: get(idxDept) || 'Unspecified',
      location: get(idxLocation) || 'Unspecified',
      employmentType: get(idxEmpType) || 'Full-Time',
      gender: get(idxGender) || 'Unspecified',
      attrition,
      attritionLabel: attrition ? 'Yes' : 'No',
      age,
      monthlyIncome,
      annualIncome: Math.round(monthlyIncome * 12),
      tenureYears,
      yearsSincePromotion,
      jobLevel: levelParsed.label,
      jobLevelNum: levelParsed.num,
      jobRole: get(idxJobRole) || 'Unspecified',
      education,
      educationField,
      businessTravel: normalizeTravel(get(idxTravel)),
      hireYear,
      hireYearEstimated: parsedHireYear === null && hireYear !== null,
      overTime: parseBooleanOptional(get(idxOverTime)),
      jobSatisfaction: parseNumber(get(idxJobSatisfaction)),
      workLifeBalance: parseNumber(get(idxWorkLifeBalance)),
      performanceRating: parseNumber(get(idxPerformance)),
    });
  }

  if (records.length === 0) {
    throw {
      code: 'EMPTY_OR_INVALID_CSV',
      title: 'No Valid Employee Records',
      message: 'The CSV headers were read, but no valid employee rows could be parsed.',
    } satisfies SheetSyncError;
  }

  return {
    records,
    meta: {
      source,
      sourceLabel,
      loadedAt: new Date(),
      rowCount: records.length,
      detectedColumns: rawHeaders,
      hasHireDateColumn: idxHireDate !== -1,
      hasOverTimeColumn: idxOverTime !== -1,
      hasSatisfactionColumn: idxJobSatisfaction !== -1,
    },
  };
}

export async function fetchGoogleSheetCsv(): Promise<{
  records: EmployeeRecord[];
  meta: DatasetMeta;
}> {
  let response: Response;
  try {
    response = await fetch(GOOGLE_SHEET_GVIZ_CSV_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    throw {
      code: 'CORS_OR_NETWORK',
      title: 'Unable to Reach Google Sheet Endpoint',
      message:
        'The browser could not fetch CSV data from the public gviz endpoint. This typically happens when the sheet is restricted (causing a blocked redirect to Google Sign-In) or when offline.',
      details: errMsg,
    } satisfies SheetSyncError;
  }

  if (!response.ok) {
    throw {
      code: 'HTTP_ERROR',
      title: `Google Sheet Returned HTTP ${response.status}`,
      message:
        'Verify the Google Sheet is published or shared with "Anyone with the link → Viewer", then click Sync Sheet, or upload a CSV file below.',
      details: `HTTP ${response.status} ${response.statusText}`,
    } satisfies SheetSyncError;
  }

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html') || isHtmlResponse(text)) {
    throw {
      code: 'AUTH_REQUIRED',
      title: 'Google Sheet Requires Public Access',
      message:
        'The gviz endpoint returned a Google Sign-In HTML page instead of CSV data. Update the sheet sharing to "Anyone with the link can view" and click Sync Sheet, or use Upload CSV as a fallback.',
      details: `Content-Type: ${contentType || 'text/html'}`,
    } satisfies SheetSyncError;
  }

  return parseEmployeeDataset(text, 'google-sheet', 'Google Sheets (Live gviz CSV)');
}
