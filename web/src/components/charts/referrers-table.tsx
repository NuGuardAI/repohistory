'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDateRange } from '@/contexts/date-range-context';

interface ReferrersTableProps {
  traffic?: {
    referrers: Array<{
      referrer: string;
      data: Array<{ timestamp: string; count: number; uniques: number }>;
    }>;
  };
}

export function ReferrersTable({ traffic }: ReferrersTableProps) {
  const { dateRange } = useDateRange();

  const rows = useMemo(() => {
    if (!traffic?.referrers?.length) return [];

    return traffic.referrers.map(({ referrer, data }) => {
      const filtered = !dateRange.from || !dateRange.to
        ? data
        : data.filter(item => {
            const d = new Date(item.timestamp);
            return d >= dateRange.from! && d <= dateRange.to!;
          });
      return {
        referrer,
        count: filtered.reduce((s, i) => s + i.count, 0),
        uniques: filtered.reduce((s, i) => s + i.uniques, 0),
      };
    })
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [traffic, dateRange]);

  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Referring Sites</CardTitle>
        <CardDescription>Top sources sending traffic to your repos</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Unique</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ referrer, count, uniques }) => (
                <TableRow key={referrer}>
                  <TableCell className="font-medium">{referrer}</TableCell>
                  <TableCell className="text-right">{count.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{uniques.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="p-6 text-sm text-muted-foreground text-center">No referrer data for this period</p>
        )}
      </CardContent>
    </Card>
  );
}
