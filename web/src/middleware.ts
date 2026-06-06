import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    // Send unauthenticated users to an auto-redirect page that immediately
    // calls signIn('github') — skips the NextAuth built-in signin button page
    // so admins only see the single GitHub OAuth consent screen.
    signIn: "/auth/github",
  },
})

export const config = {
  matcher: [
    // Exclude /signin so local users can reach the credentials form without
    // being redirected to GitHub OAuth by the middleware.
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|api|auth|signin|star-history|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
