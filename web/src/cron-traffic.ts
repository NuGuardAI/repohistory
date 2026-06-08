import '@/env-config'

const pinnedRepo = process.env.PINNED_REPO;

try {
  const { getApp } = await import('@/utils/octokit/app');
  const { updateTraffic } = await import('./utils/update-traffic');
  const app = getApp();
  const results: Array<Awaited<ReturnType<typeof updateTraffic>>> = [];
  await app.eachInstallation(async ({ installation }) => {
    if (installation.suspended_at) return;
    results.push(await updateTraffic(installation.id, pinnedRepo));
  });
  const matchedRepos = results.reduce((sum, result) => sum + result.repositoriesMatched, 0);
  const errors = results.flatMap(result => result.errors);
  if (pinnedRepo && matchedRepos === 0) {
    throw new Error(`Pinned repo ${pinnedRepo} was not found in any active GitHub App installation`);
  }
  if (errors.length > 0) {
    throw new Error(`GitHub traffic update failed for ${errors.length} repos`);
  }
} catch (err) {
  console.error('[cron] GitHub traffic failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
