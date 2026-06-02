'use client';

import { useMemo } from 'react';
import { Eye, Users, Clock, Activity, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useDateRange } from '@/contexts/date-range-context';

interface DailyTrafficItem {
  date: string;
  page_views: number;
  unique_visitors: number;
}

interface NuguardStatsCardsProps {
  dailyTraffic: DailyTrafficItem[];
  totalActiveUsers: number;
  avgSessionDurationSecs: number;
  avgBounceRate: number;
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

export function NuguardStatsCards({
  dailyTraffic,
  totalActiveUsers,
  avgSessionDurationSecs,
  avgBounceRate,
}: NuguardStatsCardsProps) {
  const { dateRange } = useDateRange();

  const filtered = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return dailyTraffic;
    return dailyTraffic.filter(item => {
      const d = new Date(item.date);
      return d >= dateRange.from! && d <= dateRange.to!;
    });
  }, [dailyTraffic, dateRange]);

  const totalViews = useMemo(() => filtered.reduce((s, r) => s + r.page_views, 0), [filtered]);
  const totalUnique = useMemo(() => filtered.reduce((s, r) => s + r.unique_visitors, 0), [filtered]);

  const cards = [
    { title: 'Page Views', value: totalViews.toLocaleString(), Icon: Eye },
    { title: 'Unique Visitors', value: totalUnique.toLocaleString(), Icon: Users },
    { title: 'Active Users (GA4)', value: totalActiveUsers.toLocaleString(), Icon: Activity },
    { title: 'Avg Session', value: formatDuration(avgSessionDurationSecs), Icon: Clock },
    { title: 'Bounce Rate', value: `${(avgBounceRate * 100).toFixed(1)}%`, Icon: TrendingDown },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map(({ title, value, Icon }) => (
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
  );
}

export function NuguardStatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
