'use client';

import { useMemo, useState } from 'react';
import { Eye, Globe, Wifi, Users } from 'lucide-react';
import { Area } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartConfig, ChartTooltip } from '@/components/ui/chart';
import { Chart } from '@/components/charts/chart';
import { ChartCustomTooltip } from '@/components/charts/chart-custom-tooltip';
import { useDateRange } from '@/contexts/date-range-context';
import type { NuguardCFStats } from '@/utils/nuguard/queries';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const chartConfig = {
  requests: { label: 'Requests', color: '#315c72' },
  page_views: { label: 'Page Views', color: '#62C3F8' },
} satisfies ChartConfig;

interface NuguardCloudflareStatsProps {
  cfStats: NuguardCFStats;
}

export function NuguardCloudflareStats({ cfStats }: NuguardCloudflareStatsProps) {
  const { dateRange } = useDateRange();
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  const handleLegendClick = (dataKey: string) => {
    setHiddenSeries(prev =>
      prev.includes(dataKey) ? prev.filter(k => k !== dataKey) : [...prev, dataKey]
    );
  };

  const filteredDaily = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return cfStats.dailyStats;
    return cfStats.dailyStats.filter(item => {
      const d = new Date(item.date);
      return d >= dateRange.from! && d <= dateRange.to!;
    });
  }, [cfStats.dailyStats, dateRange]);

  const totals = useMemo(() => ({
    pageViews: filteredDaily.reduce((s, r) => s + r.page_views, 0),
    requests: filteredDaily.reduce((s, r) => s + r.requests, 0),
    bandwidth: filteredDaily.reduce((s, r) => s + r.bandwidth_bytes, 0),
    uniqueVisitors: filteredDaily.reduce((s, r) => s + r.unique_visitors, 0),
  }), [filteredDaily]);

  const totalCountryRequests = cfStats.countries.reduce((s, r) => s + r.requests, 0);

  const isEmpty = cfStats.dailyStats.length === 0;

  const statCards = [
    { title: 'Page Views', value: totals.pageViews.toLocaleString(), Icon: Eye },
    { title: 'Total Requests', value: totals.requests.toLocaleString(), Icon: Globe },
    { title: 'Bandwidth', value: formatBytes(totals.bandwidth), Icon: Wifi },
    { title: 'Unique Visitors', value: totals.uniqueVisitors.toLocaleString(), Icon: Users },
  ];

  return (
    <div className="flex flex-col gap-6 mt-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Web traffic for{' '}
          <a href="https://nuguard.ai" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            nuguard.ai
          </a>{' '}
          via Cloudflare analytics
        </p>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No Cloudflare data available yet. Ensure the Cloudflare API token has{' '}
            <strong>Zone Analytics: Read</strong> permission and the cron has run.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ title, value, Icon }) => (
              <Card key={title}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardDescription className="text-sm font-medium">{title}</CardDescription>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Daily traffic chart */}
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
              <div className="flex flex-1 flex-col justify-center gap-1">
                <CardTitle>Daily Traffic</CardTitle>
                <CardDescription>HTTP requests and page views per day</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">Total Requests</span>
                <span className="text-lg font-bold leading-none sm:text-2xl">
                  {totals.requests.toLocaleString()}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pl-0">
              {filteredDaily.length > 0 ? (
                <Chart
                  data={filteredDaily.map(r => ({ date: r.date, requests: r.requests, page_views: r.page_views }))}
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
                            { dataKey: 'requests', label: 'Requests', color: '#315c72' },
                            { dataKey: 'page_views', label: 'Page Views', color: '#62C3F8' },
                          ]}
                          hiddenSeries={hiddenSeries}
                        />
                      )}
                    />
                  }
                >
                  <defs>
                    <linearGradient id="fillCFRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#315c72" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#315c72" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillCFPageViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#62C3F8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#62C3F8" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area
                    isAnimationActive={false}
                    dataKey="requests"
                    fill="url(#fillCFRequests)"
                    fillOpacity={1}
                    stroke="#315c72"
                    strokeWidth={2}
                    hide={hiddenSeries.includes('requests')}
                  />
                  <Area
                    isAnimationActive={false}
                    dataKey="page_views"
                    fill="url(#fillCFPageViews)"
                    fillOpacity={1}
                    stroke="#62C3F8"
                    strokeWidth={2}
                    hide={hiddenSeries.includes('page_views')}
                  />
                </Chart>
              ) : (
                <p className="p-6 text-sm text-muted-foreground text-center">No data for this period</p>
              )}
            </CardContent>
          </Card>

          {/* Countries table */}
          {cfStats.countries.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Traffic by Country</CardTitle>
                <CardDescription>Top countries by HTTP requests</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cfStats.countries.map(({ country_code, requests }) => (
                      <TableRow key={country_code}>
                        <TableCell className="font-medium">{country_code}</TableCell>
                        <TableCell className="text-right">{requests.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {totalCountryRequests > 0
                            ? `${((requests / totalCountryRequests) * 100).toFixed(1)}%`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
