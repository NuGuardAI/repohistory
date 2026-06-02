'use client';

import { useMemo } from 'react';
import { RepoPreviewChart } from './repo-preview-chart';
import { TrendIndicator } from '@/components/charts/trend-indicator';
import { calculateTrendPercentage } from '@/utils/chart-trends';
import { useDateRange } from '@/contexts/date-range-context';

interface RepoCardDisplayProps {
  clonesData: Array<{ date: string; total: number }>;
}

export function RepoCardDisplay({ clonesData }: RepoCardDisplayProps) {
  const { dateRange, selectedPeriod } = useDateRange();

  const filteredData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return clonesData;
    return clonesData.filter(item => {
      const d = new Date(item.date);
      return d >= dateRange.from! && d <= dateRange.to!;
    });
  }, [clonesData, dateRange]);

  const totalClones = useMemo(
    () => filteredData.reduce((s, i) => s + i.total, 0),
    [filteredData]
  );

  const trend = useMemo(
    () => calculateTrendPercentage(filteredData, clonesData, 'total'),
    [filteredData, clonesData]
  );

  const periodLabel = selectedPeriod === '1' ? '24h'
    : selectedPeriod === 'all' ? 'all time'
    : `${selectedPeriod}d`;

  return (
    <>
      <div className="h-24 w-full pointer-events-none">
        <RepoPreviewChart data={filteredData.length ? filteredData : clonesData} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm">
          <strong>{totalClones.toLocaleString()}</strong> clones in {periodLabel}
        </span>
        <TrendIndicator trend={trend} />
      </div>
    </>
  );
}
