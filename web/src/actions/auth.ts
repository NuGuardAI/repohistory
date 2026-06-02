'use server'

import { redirect } from 'next/navigation'

export async function signin() {
  redirect('/api/auth/signin/github?callbackUrl=' + encodeURIComponent('/'))
}

export async function signout() {
  redirect('/api/auth/signout')
}
