import React, { useEffect, useRef } from 'react';
import {
  Chart,
  registerables,
  type ChartConfiguration,
  type ChartData,
  type ChartOptions,
  type ChartType,
} from 'chart.js';
import type { ThemeMode } from '../types/analytics';

Chart.register(...registerables);

interface ChartCardProps {
  title: string;
  subtitle?: string;
  type: ChartType;
  data: ChartData;
  options?: ChartOptions;
  theme: ThemeMode;
  heightClass?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  type,
  data,
  options,
  theme,
  heightClass = 'h-72',
  isEmpty = false,
  emptyMessage = 'No matching data for current filter selection.',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      return;
    }

    const isDark = theme === 'dark';
    const textColor = isDark ? '#D4D4D8' : '#3F3F46';
    const mutedTextColor = isDark ? '#A1A1AA' : '#71717A';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';
    const tooltipBg = isDark ? '#18181B' : '#111111';
    const tooltipBorder = isDark ? '#3F3F46' : '#27272A';

    const isRadial = type === 'doughnut' || type === 'pie' || type === 'polarArea';

    const mergedOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 240,
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: textColor,
            boxWidth: 10,
            boxHeight: 10,
            padding: 14,
            font: {
              family: "'DM Sans', system-ui, sans-serif",
              size: 12,
              weight: 500,
            },
          },
          ...(options?.plugins?.legend || {}),
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: '#FFC800',
          bodyColor: '#FAFAFA',
          borderColor: tooltipBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          titleFont: {
            family: "'Plus Jakarta Sans', system-ui, sans-serif",
            size: 12,
            weight: 600,
          },
          bodyFont: {
            family: "'JetBrains Mono', monospace",
            size: 12,
          },
          ...(options?.plugins?.tooltip || {}),
        },
        ...(options?.plugins || {}),
      },
      scales: isRadial
        ? undefined
        : {
            x: {
              grid: {
                color: gridColor,
                drawTicks: false,
              },
              ticks: {
                color: mutedTextColor,
                font: {
                  family: "'DM Sans', system-ui, sans-serif",
                  size: 11,
                },
              },
              border: {
                display: false,
              },
              ...(options?.scales?.x || {}),
            },
            y: {
              grid: {
                color: gridColor,
                drawTicks: false,
              },
              ticks: {
                color: mutedTextColor,
                font: {
                  family: "'JetBrains Mono', monospace",
                  size: 11,
                },
              },
              border: {
                display: false,
              },
              ...(options?.scales?.y || {}),
            },
            ...(options?.scales || {}),
          },
      ...Object.fromEntries(
        Object.entries(options || {}).filter(
          ([key]) => key !== 'plugins' && key !== 'scales'
        )
      ),
    };

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type,
      data,
      options: mergedOptions,
    };

    chartInstanceRef.current = new Chart(canvas, config);

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [type, data, options, theme, isEmpty]);

  return (
    <section className="rounded-lg border border-[#E5E5E0] dark:border-[#262626] bg-white dark:bg-[#141414] p-5 flex flex-col">
      <div className="mb-4">
        <h3 className="font-display text-sm font-semibold text-[#111111] dark:text-[#F5F5F4] tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[#666660] dark:text-[#A1A1AA]">
            {subtitle}
          </p>
        )}
      </div>

      {isEmpty ? (
        <div className={`${heightClass} flex items-center justify-center text-xs text-[#71717A] dark:text-[#A1A1AA] border border-dashed border-[#E5E5E0] dark:border-[#2A2A2A] rounded-md px-4 text-center`}>
          {emptyMessage}
        </div>
      ) : (
        <div className={`relative w-full ${heightClass}`}>
          <canvas ref={canvasRef} />
        </div>
      )}
    </section>
  );
};
