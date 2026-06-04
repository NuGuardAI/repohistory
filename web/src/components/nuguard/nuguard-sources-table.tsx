'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface NuguardSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
}

interface NuguardSourcesTableProps {
  sources: NuguardSource[];
}

export function NuguardSourcesTable({ sources }: NuguardSourcesTableProps) {
  const total = sources.reduce((s, r) => s + Number(r.sessions), 0);

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Traffic Sources</CardTitle>
        <CardDescription>Where visitors came from (GA4)</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {sources.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map(r => (
                <TableRow key={`${r.source}/${r.medium}`}>
                  <TableCell className="font-medium">{r.source}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.medium}</TableCell>
                  <TableCell className="text-right">{Number(r.sessions).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{Number(r.users).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {total > 0 ? `${((Number(r.sessions) / total) * 100).toFixed(1)}%` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="p-6 text-sm text-muted-foreground text-center">No source data for this period</p>
        )}
      </CardContent>
    </Card>
  );
}
