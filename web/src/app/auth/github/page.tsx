'use client'

import { Suspense, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

function Redirector() {
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/'
  useEffect(() => {
    signIn('github', { callbackUrl })
  }, [callbackUrl])
  return null
}

export default function GitHubAuthPage() {
  return <Suspense><Redirector /></Suspense>
}
