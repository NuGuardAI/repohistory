'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface NuguardTopPage {
  page_path: string;
  page_views: number;
  avg_time_on_page_secs: number;
}

interface NuguardJourneySectionProps {
  pages: NuguardTopPage[];
  avgSessionDurationSecs: number;
  totalSessions: number;
  totalPageViews: number;
}

function formatDuration(secs: number): string {
  if (secs < 1) return '—';
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

export function NuguardJourneySection({
  pages,
  avgSessionDurationSecs,
  totalSessions,
  totalPageViews,
}: NuguardJourneySectionProps) {
  const pagesPerSession = totalSessions > 0 ? (totalPageViews / totalSessions).toFixed(1) : '—';

  const topByTime = [...pages]
    .filter(p => Number(p.avg_time_on_page_secs) > 0)
    .sort((a, b) => Number(b.avg_time_on_page_secs) - Number(a.avg_time_on_page_secs))
    .slice(0, 10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Session Depth</CardTitle>
            <CardDescription>How visitors navigate the site</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Avg session duration</p>
              <p className="text-2xl font-bold">{formatDuration(avgSessionDurationSecs)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pages per session</p>
              <p className="text-2xl font-bold">{pagesPerSession}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total sessions</p>
              <p className="text-2xl font-bold">{totalSessions.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-2">
        <CardHeader className="border-b">
          <CardTitle>Time Spent per Page</CardTitle>
          <CardDescription>Pages ranked by average engagement time (GA4)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {topByTime.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Avg Time</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topByTime.map(p => (
                  <TableRow key={p.page_path}>
                    <TableCell className="font-mono text-sm truncate max-w-[260px]">{p.page_path}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatDuration(Number(p.avg_time_on_page_secs))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {Number(p.page_views).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground text-center">No journey data for this period</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
