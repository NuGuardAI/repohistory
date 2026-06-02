import type { NextAuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { getServerSession } from "next-auth"

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
    ...(process.env.NODE_ENV !== "production" ? [devProvider] : []),
  ],
  callbacks: {
    jwt({ token, account, user }) {
      if (account?.access_token) {
        token.accessToken = account.access_token
      }
      // For dev credentials provider, pick up accessToken from user object
      if (user && "accessToken" in user) {
        token.accessToken = user.accessToken as string
      }
      return token
    },
    session({ session, token }) {
      return { ...session, accessToken: token.accessToken as string | undefined }
    },
  },
}

export function auth() {
  return getServerSession(authOptions)
}
