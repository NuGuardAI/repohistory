import postgres from 'postgres'
import type { Sql } from 'postgres'

// Lazily initialise the connection so that importing db.ts during Next.js
// build-time static analysis doesn't throw when DATABASE_URL is absent.
let _sql: Sql | undefined

export function getDb(): Sql {
  if (_sql) return _sql
  const connectionString = process.env.DATABASE_URL
  if (!connectionString || connectionString.startsWith('postgres://build:')) {
    throw new Error('DATABASE_URL is not configured')
  }
  // 'prefer' tries SSL but falls back gracefully — works for both internal
  // container postgres (no SSL) and managed PostgreSQL (SSL available)
  const ssl = process.env.DATABASE_SSL === 'false' ? false
            : process.env.NODE_ENV === 'production' ? 'prefer'
            : false
  _sql = postgres(connectionString, { ssl, max: 10 })
  return _sql
}
