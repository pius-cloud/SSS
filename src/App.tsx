import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Moon, RefreshCw, Sun, Upload, X } from 'lucide-react';
import type {
  DashboardTab,
  DatasetMeta,
  EmployeeRecord,
  FilterState,
  SheetSyncError,
  ThemeMode,
} from './types/analytics';
import { fetchGoogleSheetCsv, parseEmployeeDataset } from './utils/csvParser';
import {
  applyFilters,
  extractFilterOptions,
  scoreEmployeesFlightRisk,
} from './utils/analytics';
import { ShellLogo } from './components/ShellLogo';
import { FilterBar } from './components/FilterBar';
import { OverviewTab } from './components/OverviewTab';
import { DeepDiveTab } from './components/DeepDiveTab';
import { InsightsTab } from './components/InsightsTab';
import { DataEmptyOrError } from './components/DataEmptyOrError';

const INITIAL_FILTERS: FilterState = {
  department: 'All',
  location: 'All',
  employmentType: 'All',
  gender: 'All',
  attrition: 'All',
};

const THEME_STORAGE_KEY = 'shell-people-analytics-theme';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Ignore storage errors
    }
    return 'light';
  });

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [records, setRecords] = useState<EmployeeRecord[]>([]);
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<SheetSyncError | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const handleSyncSheet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchGoogleSheetCsv();
      setRecords(result.records);
      setMeta(result.meta);
      setFilters(INITIAL_FILTERS);
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
        setError(err as SheetSyncError);
      } else {
        setError({
          code: 'PARSE_ERROR',
          title: 'Failed to Read Google Sheet',
          message:
            err instanceof Error
              ? err.message
              : 'An unexpected error occurred while reading the Google Sheet CSV.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void handleSyncSheet();
  }, [handleSyncSheet]);

  const handleUploadFile = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : '';
        const result = parseEmployeeDataset(text, 'csv-upload', file.name);
        setRecords(result.records);
        setMeta(result.meta);
        setFilters(INITIAL_FILTERS);
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
          setError(err as SheetSyncError);
        } else {
          setError({
            code: 'PARSE_ERROR',
            title: 'CSV Upload Failed',
            message:
              err instanceof Error
                ? err.message
                : 'Could not parse the uploaded CSV file.',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError({
        code: 'PARSE_ERROR',
        title: 'File Read Error',
        message: 'The browser could not read the selected CSV file.',
      });
      setIsLoading(false);
    };
    reader.readAsText(file);
  }, []);

  const filterOptions = useMemo(() => extractFilterOptions(records), [records]);

  const filteredRecords = useMemo(
    () => applyFilters(records, filters),
    [records, filters]
  );

  const scoredFilteredRecords = useMemo(
    () => scoreEmployeesFlightRisk(filteredRecords, records),
    [filteredRecords, records]
  );

  const tabs: { id: DashboardTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'deep-dive', label: 'Deep Dive' },
    { id: 'insights', label: 'Insights' },
  ];

  return (
    <div className="min-h-screen bg-[#F6F6F4] dark:bg-[#0B0B0B] text-[#111111] dark:text-[#F5F5F4] transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[#E5E5E0] dark:border-[#242424] bg-white/95 dark:bg-[#111111]/95 backdrop-blur-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <ShellLogo className="w-7 h-7 shrink-0" />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#111111] dark:text-white">
              Shell People Analytics
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => void handleSyncSheet()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-md bg-[#FFC800] hover:bg-[#EAB700] text-[#111111] text-xs sm:text-sm font-semibold transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isLoading ? 'Syncing...' : 'Sync Sheet'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-md border border-[#D4D4CE] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] hover:bg-[#F4F4F0] dark:hover:bg-[#242424] text-[#111111] dark:text-[#F4F4F5] text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Upload CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
              aria-label={
                theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
              }
              title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-[#D4D4CE] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A] hover:bg-[#F4F4F0] dark:hover:bg-[#242424] text-[#111111] dark:text-[#FFC800] transition-colors shrink-0 cursor-pointer"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Sun className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Non-blocking error alert when existing dataset is still loaded */}
        {error && records.length > 0 && (
          <div
            role="alert"
            className="rounded-lg border border-[#F58220] bg-[#FFFBEB] dark:bg-[#23190B] px-4 py-3 flex items-start justify-between gap-4"
          >
            <div className="text-xs sm:text-sm text-[#111111] dark:text-[#F4F4F5]">
              <strong className="font-semibold text-[#C2410C] dark:text-[#FB923C]">
                {error.title}:
              </strong>{' '}
              {error.message}
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="p-1 text-[#71717A] hover:text-[#111111] dark:hover:text-white shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading skeleton on initial fetch */}
        {isLoading && records.length === 0 ? (
          <div className="space-y-5" aria-busy="true" aria-label="Loading workforce data">
            <div className="h-28 rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] p-5 flex items-center justify-center text-sm text-[#52525B] dark:text-[#A1A1AA]">
              Fetching Shell UK workforce dataset from Google Sheets...
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414]"
                />
              ))}
            </div>
          </div>
        ) : records.length === 0 ? (
          <DataEmptyOrError
            error={error}
            isLoading={isLoading}
            onSyncSheet={() => void handleSyncSheet()}
            onUploadFile={handleUploadFile}
          />
        ) : (
          <>
            {/* Quiet Dataset Metadata Row (Unboxed Typography) */}
            {meta && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#666660] dark:text-[#A1A1AA]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-[#111111] dark:text-[#E4E4E7]">
                    Shell UK Workforce Dataset
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Source: {meta.sourceLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {meta.rowCount.toLocaleString('en-GB')} total records
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    Updated {meta.loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )}

            {/* Shared Filters Above Three Tabs */}
            <FilterBar
              filters={filters}
              options={filterOptions}
              totalCount={records.length}
              filteredCount={filteredRecords.length}
              onChange={setFilters}
              onReset={() => setFilters(INITIAL_FILTERS)}
            />

            {/* Three Tabs Navigation */}
            <div
              role="tablist"
              aria-label="Analytics Views"
              className="flex items-center gap-1 border-b border-[#E5E5E0] dark:border-[#262626] overflow-x-auto"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-4 py-3 text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive
                        ? 'text-[#111111] dark:text-[#FFC800]'
                        : 'text-[#666660] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-[2.5px] bg-[#FFC800]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Tab Panel */}
            <div role="tabpanel">
              {activeTab === 'overview' && (
                <OverviewTab
                  records={scoredFilteredRecords}
                  meta={meta}
                  theme={theme}
                />
              )}
              {activeTab === 'deep-dive' && (
                <DeepDiveTab records={scoredFilteredRecords} theme={theme} />
              )}
              {activeTab === 'insights' && (
                <InsightsTab records={scoredFilteredRecords} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
