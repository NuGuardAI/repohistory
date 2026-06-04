import '@/env-config'
import { updateNuguardStats } from './utils/nuguard/update-nuguard-stats';

try {
  const { getApp } = await import('@/utils/octokit/app');
  const { updateTraffic } = await import('./utils/update-traffic');
  const app = getApp();
  await app.eachInstallation(async ({ installation }) => {
    if (installation.suspended_at) return;
    await updateTraffic(installation.id);
  });
} catch (err) {
  console.warn('[cron] Skipping GitHub traffic — GitHub App not configured:', err instanceof Error ? err.message : err);
}

await updateNuguardStats();
