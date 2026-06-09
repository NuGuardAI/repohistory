import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// One-time import endpoint for historical GitHub traffic data from CSV exports.
// Protected by CRON_SECRET. Remove after use.
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    repoId: number;
    views: Array<{ date: string; total: number; uniques: number }>;
    clones: Array<{ date: string; total: number; uniques: number }>;
  };

  const { repoId, views, clones } = body;
  if (!repoId || !views || !clones) {
    return NextResponse.json({ error: 'Missing repoId, views, or clones' }, { status: 400 });
  }

  const sql = getDb();

  const viewRows = views.map(r => ({ repo_id: repoId, date: r.date, total: r.total, uniques: r.uniques }));
  const cloneRows = clones.map(r => ({ repo_id: repoId, date: r.date, total: r.total, uniques: r.uniques }));

  const [vResult, cResult] = await Promise.all([
    viewRows.length > 0
      ? sql`INSERT INTO views ${sql(viewRows, 'repo_id', 'date', 'total', 'uniques')}
            ON CONFLICT (repo_id, date) DO UPDATE SET total = EXCLUDED.total, uniques = EXCLUDED.uniques`
      : Promise.resolve({ count: 0 }),
    cloneRows.length > 0
      ? sql`INSERT INTO clones ${sql(cloneRows, 'repo_id', 'date', 'total', 'uniques')}
            ON CONFLICT (repo_id, date) DO UPDATE SET total = EXCLUDED.total, uniques = EXCLUDED.uniques`
      : Promise.resolve({ count: 0 }),
  ]);

  return NextResponse.json({
    ok: true,
    viewsUpserted: viewRows.length,
    clonesUpserted: cloneRows.length,
  });
}
