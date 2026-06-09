'use client';

import { useMemo, useState } from 'react';
import { Eye, Globe2, Network, ShieldCheck, Users, Wifi } from 'lucide-react';
import { Area, Bar, BarChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartConfig, ChartTooltip, ChartContainer } from '@/components/ui/chart';
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

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatCountryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.trim()) ?? code;
  } catch {
    return code;
  }
}

const visitorChartConfig = {
  unique_visitors: { label: 'Unique Visitors', color: '#4A8F6A' },
} satisfies ChartConfig;

const urlChartConfig = {
  unique_visitors: { label: 'Unique Visitors', color: '#4A8F6A' },
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

  const totalCountryVisitors = cfStats.countries.reduce((s, r) => s + r.unique_visitors, 0);

  const isEmpty = cfStats.dailyStats.length === 0;

  // Stat cards — Unique Visitors first
  const statCards = [
    { title: 'Unique Visitors', value: formatNumber(totals.uniqueVisitors), detail: 'Distinct edge visitors', Icon: Users },
    { title: 'Page Views', value: formatNumber(totals.pageViews), detail: 'Cloudflare page view signal', Icon: Eye },
    { title: 'Edge Requests', value: formatNumber(totals.requests), detail: 'Total HTTP requests', Icon: Network },
    { title: 'Bandwidth', value: formatBytes(totals.bandwidth), detail: 'Data transferred', Icon: Wifi },
  ];

  const visitorChartData = useMemo(
    () => filteredDaily.map(r => ({ date: r.date, unique_visitors: r.unique_visitors })),
    [filteredDaily],
  );

  // Top 10 URLs for bar chart
  const topUrls = useMemo(
    () => cfStats.urls.slice(0, 10).map(u => ({
      ...u,
      label: u.url_path === '/' ? '/' : u.url_path.replace(/^\/+/, '/').slice(0, 40),
    })),
    [cfStats.urls],
  );

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
            <ShieldCheck className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-none">Cloudflare Edge</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              nuguard.ai — unique visitors, top pages, and geo breakdown.
            </p>
          </div>
        </div>
        <a
          href="https://nuguard.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Globe2 className="size-4" />
          nuguard.ai
        </a>
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
          {/* Stat cards — Unique Visitors first */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ title, value, detail, Icon }) => (
              <Card key={title}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardDescription className="text-sm font-medium">{title}</CardDescription>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{value}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Unique Visitors timechart */}
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
              <div className="flex flex-1 flex-col justify-center gap-1">
                <CardTitle>Unique Visitors</CardTitle>
                <CardDescription>Daily distinct visitors via Cloudflare edge</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-bold leading-none sm:text-2xl">
                  {formatNumber(totals.uniqueVisitors)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pl-0">
              {visitorChartData.length > 0 ? (
                <Chart
                  data={visitorChartData}
                  chartConfig={visitorChartConfig}
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
                            { dataKey: 'unique_visitors', label: 'Unique Visitors', color: '#4A8F6A' },
                          ]}
                          hiddenSeries={hiddenSeries}
                        />
                      )}
                    />
                  }
                >
                  <defs>
                    <linearGradient id="fillCFVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A8F6A" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4A8F6A" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area
                    isAnimationActive={false}
                    dataKey="unique_visitors"
                    fill="url(#fillCFVisitors)"
                    fillOpacity={1}
                    stroke="#4A8F6A"
                    strokeWidth={2}
                    hide={hiddenSeries.includes('unique_visitors')}
                  />
                </Chart>
              ) : (
                <p className="p-6 text-sm text-muted-foreground text-center">No data for this period</p>
              )}
            </CardContent>
          </Card>

          {/* Top URLs by unique visitors */}
          {topUrls.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Top Pages by Unique Visitors</CardTitle>
                <CardDescription>Most-visited URLs ranked by distinct edge visitors</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pl-2">
                <ChartContainer config={urlChartConfig} className="h-72 w-full">
                  <BarChart
                    data={topUrls}
                    layout="vertical"
                    margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v.toLocaleString()} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={160}
                      tick={{ fontSize: 11, fontFamily: 'monospace' }}
                    />
                    <ChartTooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as typeof topUrls[0];
                        return (
                          <div className="rounded-lg border bg-background p-2 text-xs shadow-md">
                            <p className="font-mono font-medium mb-1">{d.url_path}</p>
                            <p><span className="text-muted-foreground">Unique visitors: </span><strong>{d.unique_visitors.toLocaleString()}</strong></p>
                            <p><span className="text-muted-foreground">Requests: </span>{d.requests.toLocaleString()}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="unique_visitors" fill="#4A8F6A" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Unique Visitors by country */}
          {cfStats.countries.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Unique Visitors by Country</CardTitle>
                <CardDescription>Top countries by distinct Cloudflare edge visitors</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">Unique Visitors</TableHead>
                      <TableHead className="text-right">Requests</TableHead>
                      <TableHead className="text-right">Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cfStats.countries.map(({ country_code, unique_visitors, requests }) => {
                      const share = totalCountryVisitors > 0 ? (unique_visitors / totalCountryVisitors) * 100 : 0;
                      return (
                        <TableRow key={country_code}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex min-w-9 justify-center rounded border bg-muted px-2 py-0.5 font-mono text-xs">
                                {country_code.trim()}
                              </span>
                              <span className="font-medium">{formatCountryName(country_code)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatNumber(unique_visitors)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatNumber(requests)}</TableCell>
                          <TableCell className="min-w-36">
                            <div className="flex items-center justify-end gap-3">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-[#4A8F6A]"
                                  style={{ width: `${Math.max(share, 2)}%` }}
                                />
                              </div>
                              <span className="w-12 text-right text-sm text-muted-foreground">
                                {share > 0 ? `${share.toFixed(1)}%` : '-'}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {cfStats.countries.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No country breakdown is available for this period.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
