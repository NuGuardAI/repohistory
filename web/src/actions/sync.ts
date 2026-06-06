'use server'

import { auth } from '@/lib/auth'
import { updateNuguardStats } from '@/utils/nuguard/update-nuguard-stats'
import { revalidatePath } from 'next/cache'

export async function syncData() {
  const session = await auth()
  if (!session?.isAdmin) throw new Error('Forbidden: admin access required')

  try {
    const { getApp } = await import('@/utils/octokit/app')
    const { updateTraffic } = await import('@/utils/update-traffic')
    const app = getApp()
    await app.eachInstallation(async ({ installation }) => {
      if (installation.suspended_at) return
      await updateTraffic(installation.id)
    })
  } catch (err) {
    console.warn('[sync] Skipping GitHub traffic — GitHub App not configured:', err instanceof Error ? err.message : err)
  }

  await updateNuguardStats()
  revalidatePath('/nuguard')
}
