import { NextRequest, NextResponse } from 'next/server';
import { fetchCloudflare } from '@/utils/nuguard/fetch-cloudflare';

// Backfills all historical Cloudflare data from the zone creation date (2025-08-17)
// to today in 30-day chunks. Safe to call multiple times — upserts are idempotent.
// Protected by CRON_SECRET.
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Zone was created 2025-08-17; allow caller to override the start date
  const body = await request.json().catch(() => ({})) as { since?: string; until?: string };
  const since = body.since ?? '2025-08-17';
  const until = body.until ?? new Date().toISOString().split('T')[0];

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since) || !/^\d{4}-\d{2}-\d{2}$/.test(until)) {
    return NextResponse.json({ error: 'Invalid date format, expected YYYY-MM-DD' }, { status: 400 });
  }

  const CHUNK_DAYS = 30;
  const results: Array<{ chunk: string; ok: boolean }> = [];

  let cursor = new Date(since);
  const end = new Date(until);

  while (cursor <= end) {
    const chunkSince = cursor.toISOString().split('T')[0];

    // Advance by CHUNK_DAYS - 1 to get an inclusive end
    const chunkEndDate = new Date(cursor);
    chunkEndDate.setDate(chunkEndDate.getDate() + CHUNK_DAYS - 1);
    const chunkUntil = (chunkEndDate > end ? end : chunkEndDate).toISOString().split('T')[0];

    try {
      const ok = await fetchCloudflare({ since: chunkSince, until: chunkUntil });
      results.push({ chunk: `${chunkSince}→${chunkUntil}`, ok });
    } catch (err) {
      console.error(`[backfill-cloudflare] chunk ${chunkSince}→${chunkUntil} failed:`, err);
      results.push({ chunk: `${chunkSince}→${chunkUntil}`, ok: false });
    }

    // Advance to next chunk
    cursor.setDate(cursor.getDate() + CHUNK_DAYS);
  }

  const succeeded = results.filter(r => r.ok).length;
  return NextResponse.json({ ok: succeeded === results.length, chunks: results.length, succeeded, results });
}
