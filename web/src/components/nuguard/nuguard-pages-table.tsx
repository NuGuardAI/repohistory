'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface NuguardTopPage {
  page_path: string;
  page_views: number;
  avg_time_on_page_secs: number;
}

interface NuguardPagesTableProps {
  pages: NuguardTopPage[];
}

function formatDuration(secs: number): string {
  if (secs < 1) return '—';
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}

export function NuguardPagesTable({ pages }: NuguardPagesTableProps) {
  const total = pages.reduce((s, p) => s + p.page_views, 0);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Pages by Views</CardTitle>
        <CardDescription>Top pages and average time on page (GA4)</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {pages.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Avg Time</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map(p => (
                <TableRow key={p.page_path}>
                  <TableCell className="font-mono text-sm truncate max-w-[260px]">{p.page_path}</TableCell>
                  <TableCell className="text-right">{Number(p.page_views).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {formatDuration(Number(p.avg_time_on_page_secs))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {total > 0 ? `${((Number(p.page_views) / total) * 100).toFixed(1)}%` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="p-6 text-sm text-muted-foreground text-center">No page data for this period</p>
        )}
      </CardContent>
    </Card>
  );
}
