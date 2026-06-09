import { NextRequest, NextResponse } from 'next/server';
import { updateNuguardStats } from '@/utils/nuguard/update-nuguard-stats';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await updateNuguardStats();
    const ok = result.cloudflare && result.ga4;
    return NextResponse.json({ ok, ...result });
  } catch (error) {
    console.error('[cron/nuguard] Unhandled error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
