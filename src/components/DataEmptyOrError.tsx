import React, { useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, Upload } from 'lucide-react';
import type { SheetSyncError } from '../types/analytics';
import { GOOGLE_SHEET_EDIT_URL, GOOGLE_SHEET_GVIZ_CSV_URL } from '../utils/csvParser';

interface DataEmptyOrErrorProps {
  error: SheetSyncError | null;
  isLoading: boolean;
  onSyncSheet: () => void;
  onUploadFile: (file: File) => void;
}

export const DataEmptyOrError: React.FC<DataEmptyOrErrorProps> = ({
  error,
  isLoading,
  onSyncSheet,
  onUploadFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onUploadFile(file);
  };

  return (
    <div className="rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] p-6 sm:p-8">
      <div className="max-w-2xl">
        {error ? (
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 p-2 rounded-md bg-[#FEF3C7] dark:bg-[#2A1F0A] text-[#B45309] dark:text-[#FFC800] shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#111111] dark:text-white">
                {error.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#52525B] dark:text-[#D4D4D8]">
                {error.message}
              </p>
              {error.details && (
                <p className="mt-2 font-mono text-xs text-[#71717A] dark:text-[#A1A1AA] break-all">
                  Detail: {error.details}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="font-display text-lg font-bold text-[#111111] dark:text-white">
              Connect Shell UK Workforce Data
            </h2>
            <p className="mt-1.5 text-sm text-[#52525B] dark:text-[#D4D4D8]">
              Sync directly from the Shell UK Google Sheet gviz CSV endpoint or upload an exported CSV file.
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSyncSheet}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#FFC800] hover:bg-[#EAB700] text-[#111111] text-sm font-semibold transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isLoading ? 'Syncing Sheet...' : 'Sync Sheet'}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#111111] dark:border-[#E5E5E0] bg-transparent hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-[#111111] text-[#111111] dark:text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            Upload CSV
          </button>

          <a
            href={GOOGLE_SHEET_EDIT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            Open Google Sheet
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file);
              e.target.value = '';
            }}
          />
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mt-6 rounded-md border border-dashed p-6 text-center transition-colors ${
            isDragging
              ? 'border-[#F58220] bg-[#FFF8E1] dark:bg-[#231D08]'
              : 'border-[#D4D4CE] dark:border-[#2E2E2E] bg-[#FAFAF8] dark:bg-[#101010]'
          }`}
        >
          <p className="text-sm font-medium text-[#111111] dark:text-[#F4F4F5]">
            Drop your Shell UK workforce CSV file here
          </p>
          <p className="mt-1 text-xs text-[#71717A] dark:text-[#A1A1AA]">
            In Google Sheets, choose File → Download → Comma Separated Values (.csv), or enable General Access → Anyone with the link (Viewer) to sync live via{' '}
            <span className="font-mono break-all">{GOOGLE_SHEET_GVIZ_CSV_URL}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
