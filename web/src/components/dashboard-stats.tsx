'use client';

import { useMemo } from 'react';
import { Eye, Users, GitFork, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendIndicator } from '@/components/charts/trend-indicator';
import { calculateTrendPercentage } from '@/utils/chart-trends';
import { useDateRange } from '@/contexts/date-range-context';

interface TrafficItem {
  timestamp: string;
  count: number;
  uniques: number;
}

interface DashboardStatsProps {
  views: { views: TrafficItem[] };
  clones: { clones: TrafficItem[] };
}

function toDateItems(items: TrafficItem[]) {
  return items.map(i => ({
    date: i.timestamp.split('T')[0],
    count: i.count,
    uniques: i.uniques,
  }));
}

export function DashboardStats({ views, clones }: DashboardStatsProps) {
  const { dateRange } = useDateRange();

  const allViewData = useMemo(() => toDateItems(views.views), [views.views]);
  const allCloneData = useMemo(() => toDateItems(clones.clones), [clones.clones]);

  const filteredViews = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return allViewData;
    return allViewData.filter(i => {
      const d = new Date(i.date);
      return d >= dateRange.from! && d <= dateRange.to!;
    });
  }, [allViewData, dateRange]);

  const filteredClones = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return allCloneData;
    return allCloneData.filter(i => {
      const d = new Date(i.date);
      return d >= dateRange.from! && d <= dateRange.to!;
    });
  }, [allCloneData, dateRange]);

  const totalViews = useMemo(() => filteredViews.reduce((s, i) => s + i.count, 0), [filteredViews]);
  const uniqueVisitors = useMemo(() => filteredViews.reduce((s, i) => s + i.uniques, 0), [filteredViews]);
  const totalClones = useMemo(() => filteredClones.reduce((s, i) => s + i.count, 0), [filteredClones]);
  const uniqueCloners = useMemo(() => filteredClones.reduce((s, i) => s + i.uniques, 0), [filteredClones]);

  const viewsTrend = useMemo(() => calculateTrendPercentage(filteredViews, allViewData, 'count'), [filteredViews, allViewData]);
  const visitorsTrend = useMemo(() => calculateTrendPercentage(filteredViews, allViewData, 'uniques'), [filteredViews, allViewData]);
  const clonesTrend = useMemo(() => calculateTrendPercentage(filteredClones, allCloneData, 'count'), [filteredClones, allCloneData]);
  const clonersTrend = useMemo(() => calculateTrendPercentage(filteredClones, allCloneData, 'uniques'), [filteredClones, allCloneData]);

  const cards = [
    { title: 'Total Clones', value: totalClones, trend: clonesTrend, Icon: GitFork },
    { title: 'Unique Cloners', value: uniqueCloners, trend: clonersTrend, Icon: Copy },
    { title: 'Total Views', value: totalViews, trend: viewsTrend, Icon: Eye },
    { title: 'Unique Visitors', value: uniqueVisitors, trend: visitorsTrend, Icon: Users },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ title, value, trend, Icon }) => (
        <Card key={title}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-sm font-medium">{title}</CardDescription>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{value.toLocaleString()}</div>
            <div className="mt-1 h-4">
              <TrendIndicator trend={trend} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="mt-1 h-4 w-12" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
