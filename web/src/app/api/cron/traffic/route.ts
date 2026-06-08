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
    const results: Array<Awaited<ReturnType<typeof updateTraffic>>> = [];

    await app.eachInstallation(async ({ installation }) => {
      if (installation.suspended_at) return;
      results.push(await updateTraffic(installation.id, pinnedRepo));
    });

    const matchedRepos = results.reduce((sum, result) => sum + result.repositoriesMatched, 0);
    const updatedRepos = results.reduce((sum, result) => sum + result.repositoriesUpdated, 0);
    const errors = results.flatMap(result => result.errors);

    if (pinnedRepo && matchedRepos === 0) {
      return NextResponse.json(
        { ok: false, error: `Pinned repo ${pinnedRepo} was not found in any active GitHub App installation`, synced: results },
        { status: 404 },
      );
    }

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, error: 'One or more repository traffic updates failed', synced: results }, { status: 502 });
    }

    return NextResponse.json({ ok: true, matchedRepos, updatedRepos, synced: results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron/traffic] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
