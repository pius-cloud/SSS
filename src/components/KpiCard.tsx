import React from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  accentTone?: 'default' | 'yellow' | 'orange' | 'alert';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  accentTone = 'default',
}) => {
  const valueToneClass =
    accentTone === 'alert'
      ? 'text-[#C2410C] dark:text-[#FB923C]'
      : accentTone === 'yellow'
        ? 'text-[#111111] dark:text-[#FFC800]'
        : accentTone === 'orange'
          ? 'text-[#B45309] dark:text-[#F58220]'
          : 'text-[#111111] dark:text-[#FAFAFA]';

  return (
    <div className="rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] px-5 py-4 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#52525B] dark:text-[#A1A1AA] truncate">
          {label}
        </span>
      </div>
      <div
        className={`mt-2 font-display text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums ${valueToneClass}`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs text-[#71717A] dark:text-[#8E8E93] tabular-nums truncate">
        {subtext}
      </div>
    </div>
  );
};
