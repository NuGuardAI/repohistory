'use server'

import { auth } from '@/lib/auth'
import { updateNuguardStats } from '@/utils/nuguard/update-nuguard-stats'
import { revalidatePath } from 'next/cache'

export interface SyncResult {
  ok: boolean
  message: string
}

export async function syncData(): Promise<SyncResult> {
  const session = await auth()
  if (!session?.isAdmin) {
    return { ok: false, message: 'Forbidden: admin access required' }
  }

  // GitHub traffic sync (non-fatal — failures are logged but don't block GA4/CF)
  let githubSynced = false
  try {
    const { getApp } = await import('@/utils/octokit/app')
    const { updateTraffic } = await import('@/utils/update-traffic')
    const app = getApp()
    const pinnedRepo = process.env.PINNED_REPO
    const trafficResults: Array<Awaited<ReturnType<typeof updateTraffic>>> = []
    await app.eachInstallation(async ({ installation }) => {
      if (installation.suspended_at) return
      trafficResults.push(await updateTraffic(installation.id, pinnedRepo))
    })
    const matchedRepos = trafficResults.reduce((sum, result) => sum + result.repositoriesMatched, 0)
    const errors = trafficResults.flatMap(result => result.errors)
    if (errors.length > 0) {
      console.warn('[sync] GitHub traffic errors:', errors)
    }
    githubSynced = matchedRepos > 0
  } catch (err) {
    console.warn('[sync] Skipping GitHub traffic — GitHub App not configured:', err instanceof Error ? err.message : err)
  }

  let result
  try {
    result = await updateNuguardStats()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during data sync'
    console.error('[sync] updateNuguardStats failed:', message)
    return { ok: false, message }
  }

  if (!result.cloudflare && !result.ga4) {
    return { ok: false, message: 'Sync failed — Cloudflare and GA4 returned no data. Check server logs for details.' }
  }

  revalidatePath('/nuguard')

  const synced = [
    githubSynced && 'GitHub traffic',
    result.cloudflare && 'Cloudflare',
    result.ga4 && 'GA4',
  ].filter(Boolean).join(', ')
  return { ok: true, message: `${synced} refreshed successfully` }
}
