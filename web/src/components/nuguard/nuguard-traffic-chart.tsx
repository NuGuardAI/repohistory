'use client';

import { useMemo, useState } from 'react';
import { Area } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartTooltip } from '@/components/ui/chart';
import { Chart } from '@/components/charts/chart';
import { ChartCustomTooltip } from '@/components/charts/chart-custom-tooltip';
import { useDateRange } from '@/contexts/date-range-context';

interface DailyItem {
  date: string;
  page_views: number;
  unique_visitors: number;
}

interface NuguardTrafficChartProps {
  dailyTraffic: DailyItem[];
}

const chartConfig = {
  page_views: { label: 'Page Views', color: '#315c72' },
  unique_visitors: { label: 'Unique Visitors', color: '#62C3F8' },
} satisfies ChartConfig;

export function NuguardTrafficChart({ dailyTraffic }: NuguardTrafficChartProps) {
  const { dateRange } = useDateRange();
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  const handleLegendClick = (dataKey: string) => {
    setHiddenSeries(prev =>
      prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]
    );
  };

  const filtered = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return dailyTraffic;
    return dailyTraffic.filter(item => {
      const d = new Date(item.date);
      return d >= dateRange.from! && d <= dateRange.to!;
    });
  }, [dailyTraffic, dateRange]);

  const chartData = useMemo(
    () => filtered.map(item => ({ date: item.date, page_views: item.page_views, unique_visitors: item.unique_visitors })),
    [filtered],
  );

  const total = useMemo(() => chartData.reduce((s, r) => s + r.page_views, 0), [chartData]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
        <div className="flex flex-1 flex-col justify-center gap-1">
          <CardTitle>Site Traffic</CardTitle>
          <CardDescription>Daily page views and unique visitors (Cloudflare)</CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-muted-foreground">Total Views</span>
          <span className="text-lg font-bold leading-none sm:text-2xl">{total.toLocaleString()}</span>
        </div>
      </CardHeader>
      <CardContent className="pl-0">
        {chartData.length > 0 ? (
          <Chart
            data={chartData}
            chartConfig={chartConfig}
            className="h-64 w-full"
            onLegendClick={handleLegendClick}
            hiddenSeries={hiddenSeries}
            customTooltip={
              <ChartTooltip
                cursor={false}
                content={({ active, payload, label }) => (
                  <ChartCustomTooltip
                    active={active}
                    payload={payload}
                    label={label}
                    entries={[
                      { dataKey: 'page_views', label: 'Page Views', color: '#315c72' },
                      { dataKey: 'unique_visitors', label: 'Unique Visitors', color: '#62C3F8' },
                    ]}
                    hiddenSeries={hiddenSeries}
                  />
                )}
              />
            }
          >
            <defs>
              <linearGradient id="fillPageViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#315c72" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#315c72" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillUniqueVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#62C3F8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#62C3F8" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              isAnimationActive={false}
              dataKey="page_views"
              fill="url(#fillPageViews)"
              fillOpacity={1}
              stroke="#315c72"
              strokeWidth={2}
              hide={hiddenSeries.includes('page_views')}
            />
            <Area
              isAnimationActive={false}
              dataKey="unique_visitors"
              fill="url(#fillUniqueVisitors)"
              fillOpacity={1}
              stroke="#62C3F8"
              strokeWidth={2}
              hide={hiddenSeries.includes('unique_visitors')}
            />
          </Chart>
        ) : (
          <p className="p-6 text-sm text-muted-foreground text-center">No traffic data for this period</p>
        )}
      </CardContent>
    </Card>
  );
}
