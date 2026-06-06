'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { syncData } from '@/actions/sync'

export function NuguardRefreshButton() {
  const [isPending, startTransition] = useTransition()

  function handleRefresh() {
    startTransition(async () => {
      try {
        await syncData()
        toast.success('Data refreshed successfully')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to refresh data')
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
      <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Refreshing...' : 'Refresh Data'}
    </Button>
  )
}
