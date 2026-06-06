import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    isLocalUser?: boolean
    isAdmin?: boolean
    githubLogin?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    isLocalUser?: boolean
    githubLogin?: string
  }
}
