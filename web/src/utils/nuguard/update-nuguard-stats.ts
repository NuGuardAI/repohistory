import { fetchCloudflare } from './fetch-cloudflare';
import { fetchGA4 } from './fetch-ga4';

export interface NuguardSyncResult {
  cloudflare: boolean;
  ga4: boolean;
}

export async function updateNuguardStats(): Promise<NuguardSyncResult> {
  const [cfResult, ga4Result] = await Promise.allSettled([fetchCloudflare(), fetchGA4()]);

  if (cfResult.status === 'rejected') {
    console.error('NuGuard Cloudflare update error:', cfResult.reason instanceof Error ? cfResult.reason.message : String(cfResult.reason));
  }
  if (ga4Result.status === 'rejected') {
    console.error('NuGuard GA4 update error:', ga4Result.reason instanceof Error ? ga4Result.reason.message : String(ga4Result.reason));
  }

  return {
    cloudflare: cfResult.status === 'fulfilled' && cfResult.value === true,
    ga4: ga4Result.status === 'fulfilled' && ga4Result.value === true,
  };
}
