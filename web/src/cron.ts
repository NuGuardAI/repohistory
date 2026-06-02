import '@/env-config'
import { getApp } from '@/utils/octokit/app';
import { updateTraffic } from './utils/update-traffic';
import { updateNuguardStats } from './utils/nuguard/update-nuguard-stats';

const app = getApp();

app.eachInstallation(({ installation }) => {
  if (installation.suspended_at) {
    return
  }

  updateTraffic(installation.id)
});

await updateNuguardStats();
