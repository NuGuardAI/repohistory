'use server'

import { auth } from "@/lib/auth"
import { getDb } from "@/lib/db"
import bcrypt from "bcryptjs"

async function requireAdmin() {
  const session = await auth()
  if (!session?.isAdmin) {
    throw new Error("Forbidden: admin access required")
  }
  return session
}

export async function listLocalUsers() {
  await requireAdmin()
  const sql = getDb()
  return sql<{ id: string; username: string; created_by: string; created_at: string }[]>`
    SELECT id::text, username, created_by, created_at FROM local_users ORDER BY created_at DESC
  `
}

export async function createLocalUser(username: string, password: string) {
  const session = await requireAdmin()
  if (!username || username.length < 3) throw new Error("Username must be at least 3 characters")
  if (!password || password.length < 8) throw new Error("Password must be at least 8 characters")

  const passwordHash = await bcrypt.hash(password, 12)
  const sql = getDb()

  await sql`
    INSERT INTO local_users (username, password_hash, created_by)
    VALUES (${username}, ${passwordHash}, ${session.githubLogin ?? "admin"})
  `
}

export async function deleteLocalUser(id: string) {
  await requireAdmin()
  const sql = getDb()
  await sql`DELETE FROM local_users WHERE id = ${id}`
}

export async function updateLocalUserPassword(id: string, newPassword: string) {
  await requireAdmin()
  if (!newPassword || newPassword.length < 8) throw new Error("Password must be at least 8 characters")

  const passwordHash = await bcrypt.hash(newPassword, 12)
  const sql = getDb()
  await sql`
    UPDATE local_users SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${id}
  `
}
