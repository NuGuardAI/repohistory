'use client';

import { useMemo, useState } from 'react';
import { Eye, Globe2, Network, ShieldCheck, Users, Wifi } from 'lucide-react';
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

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatRatio(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0.0';
  return value.toFixed(1);
}

function formatCountryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.trim()) ?? code;
  } catch {
    return code;
  }
}

const chartConfig = {
  requests: { label: 'Edge Requests', color: '#315c72' },
  page_views: { label: 'Page Views', color: '#F28C28' },
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

  const filteredCountries = useMemo(() => {
    const rows = !dateRange.from || !dateRange.to
      ? cfStats.countries
      : cfStats.countries.filter(item => {
          const d = new Date(item.date);
          return d >= dateRange.from! && d <= dateRange.to!;
        });

    const totalsByCountry = new Map<string, number>();
    rows.forEach(({ country_code, requests }) => {
      const code = country_code.trim();
      totalsByCountry.set(code, (totalsByCountry.get(code) ?? 0) + requests);
    });

    return Array.from(totalsByCountry.entries())
      .map(([country_code, requests]) => ({ country_code, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 12);
  }, [cfStats.countries, dateRange]);

  const totals = useMemo(() => ({
    pageViews: filteredDaily.reduce((s, r) => s + r.page_views, 0),
    requests: filteredDaily.reduce((s, r) => s + r.requests, 0),
    bandwidth: filteredDaily.reduce((s, r) => s + r.bandwidth_bytes, 0),
    uniqueVisitors: filteredDaily.reduce((s, r) => s + r.unique_visitors, 0),
  }), [filteredDaily]);

  const totalCountryRequests = filteredCountries.reduce((s, r) => s + r.requests, 0);
  const requestsPerVisitor = totals.uniqueVisitors > 0 ? totals.requests / totals.uniqueVisitors : 0;
  const bytesPerRequest = totals.requests > 0 ? totals.bandwidth / totals.requests : 0;

  const isEmpty = cfStats.dailyStats.length === 0;

  const statCards = [
    { title: 'Edge Requests', value: formatNumber(totals.requests), detail: `${formatRatio(requestsPerVisitor)} per visitor`, Icon: Network },
    { title: 'Page Views', value: formatNumber(totals.pageViews), detail: 'Cloudflare visits signal', Icon: Eye },
    { title: 'Unique Visitors', value: formatNumber(totals.uniqueVisitors), detail: 'Distinct edge visitors', Icon: Users },
    { title: 'Bandwidth', value: formatBytes(totals.bandwidth), detail: `${formatBytes(bytesPerRequest)} per request`, Icon: Wifi },
  ];

  const chartData = useMemo(
    () => filteredDaily.map(r => ({
      date: r.date,
      requests: r.requests,
      page_views: r.page_views,
      unique_visitors: r.unique_visitors,
    })),
    [filteredDaily],
  );

  return (
    <div className="flex flex-col gap-6 mt-4">
      <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md border bg-background">
            <ShieldCheck className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold leading-none">Cloudflare Edge</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              nuguard.ai request volume, visitors, bandwidth, and country mix.
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
          {/* Stat cards */}
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

          {/* Daily traffic chart */}
          <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b">
              <div className="flex flex-1 flex-col justify-center gap-1">
                <CardTitle>Edge Traffic</CardTitle>
                <CardDescription>Daily Cloudflare requests, page views, and unique visitors</CardDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">Total Requests</span>
                <span className="text-lg font-bold leading-none sm:text-2xl">
                  {formatNumber(totals.requests)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pl-0">
              {filteredDaily.length > 0 ? (
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
                            { dataKey: 'requests', label: 'Edge Requests', color: '#315c72' },
                            { dataKey: 'page_views', label: 'Page Views', color: '#F28C28' },
                            { dataKey: 'unique_visitors', label: 'Unique Visitors', color: '#4A8F6A' },
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
                      <stop offset="5%" stopColor="#F28C28" stopOpacity={0.75} />
                      <stop offset="95%" stopColor="#F28C28" stopOpacity={0.08} />
                    </linearGradient>
                    <linearGradient id="fillCFVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A8F6A" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#4A8F6A" stopOpacity={0.08} />
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
                    stroke="#F28C28"
                    strokeWidth={2}
                    hide={hiddenSeries.includes('page_views')}
                  />
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

          {/* Countries table */}
          {filteredCountries.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Traffic by Country</CardTitle>
                <CardDescription>Top countries by Cloudflare edge requests</CardDescription>
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
                    {filteredCountries.map(({ country_code, requests }) => {
                      const share = totalCountryRequests > 0 ? (requests / totalCountryRequests) * 100 : 0;
                      return (
                      <TableRow key={country_code}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex min-w-9 justify-center rounded border bg-muted px-2 py-0.5 font-mono text-xs">
                              {country_code}
                            </span>
                            <span className="font-medium">{formatCountryName(country_code)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(requests)}</TableCell>
                        <TableCell className="min-w-36">
                          <div className="flex items-center justify-end gap-3">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-[#315c72]"
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

          {filteredCountries.length === 0 && filteredDaily.length > 0 && (
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
