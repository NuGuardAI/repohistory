import { NextResponse } from 'next/server'

// Legacy Supabase OAuth callback URL — NextAuth handles /api/auth/callback/github
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/signin', new URL(request.url).origin))
}
