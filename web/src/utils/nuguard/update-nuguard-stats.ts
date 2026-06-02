import { fetchCloudflare } from './fetch-cloudflare';
import { fetchGA4 } from './fetch-ga4';

export async function updateNuguardStats(): Promise<void> {
  const results = await Promise.allSettled([fetchCloudflare(), fetchGA4()]);

  for (const result of results) {
    if (result.status === 'rejected') {
      console.error('NuGuard stats update error:', result.reason instanceof Error ? result.reason.message : String(result.reason));
    }
  }
}
