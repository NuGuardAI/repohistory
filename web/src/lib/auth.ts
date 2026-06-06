import type { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { getDb } from "@/lib/db"

const devProvider = CredentialsProvider({
  id: "dev-login",
  name: "Dev Login",
  credentials: {},
  async authorize() {
    return {
      id: "dev",
      name: "Dev User",
      email: "dev@localhost",
      image: "https://avatars.githubusercontent.com/u/0",
      accessToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN ?? "",
    }
  },
})

const localProvider = CredentialsProvider({
  id: "local",
  name: "Local Login",
  credentials: {
    username: { label: "Username", type: "text" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.username || !credentials?.password) return null

    const sql = getDb()
    const rows = await sql<{ id: bigint; username: string; password_hash: string }[]>`
      SELECT id, username, password_hash FROM local_users WHERE username = ${credentials.username} LIMIT 1
    `
    const user = rows[0]
    if (!user) return null

    const valid = await bcrypt.compare(credentials.password, user.password_hash)
    if (!valid) return null

    return {
      id: String(user.id),
      name: user.username,
      email: `${user.username}@local`,
      isLocalUser: true,
      accessToken: process.env.LOCAL_AUTH_GITHUB_TOKEN ?? process.env.GITHUB_PERSONAL_ACCESS_TOKEN ?? "",
    }
  },
})

export function isAdminGithubLogin(login: string | null | undefined): boolean {
  if (!login) return false
  const admins = (process.env.ADMIN_GITHUB_LOGINS ?? "").split(",").map(s => s.trim()).filter(Boolean)
  return admins.includes(login)
}

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "repo read:user",
        },
      },
    }),
    localProvider,
    ...(process.env.NODE_ENV !== "production" ? [devProvider] : []),
  ],
  callbacks: {
    jwt({ token, account, user, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      if (user && "accessToken" in user) {
        token.accessToken = user.accessToken as string
      }
      if (user && "isLocalUser" in user) {
        token.isLocalUser = true
      }
      if (profile && "login" in profile) {
        token.githubLogin = profile.login as string
      }
      return token
    },
    session({ session, token }) {
      const githubLogin = token.githubLogin as string | undefined
      return {
        ...session,
        accessToken: token.accessToken as string | undefined,
        isLocalUser: token.isLocalUser as boolean | undefined,
        isAdmin: !token.isLocalUser && isAdminGithubLogin(githubLogin),
        githubLogin,
      }
    },
  },
}

export function auth() {
  return getServerSession(authOptions)
}
