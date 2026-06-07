import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pinnedRepo = process.env.PINNED_REPO;

  try {
    const { getApp } = await import('@/utils/octokit/app');
    const { updateTraffic } = await import('@/utils/update-traffic');
    const app = getApp();
    const results: string[] = [];

    await app.eachInstallation(async ({ installation }) => {
      if (installation.suspended_at) return;
      await updateTraffic(installation.id, pinnedRepo);
      results.push(`installation:${installation.id}`);
    });

    return NextResponse.json({ ok: true, synced: results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/traffic] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
