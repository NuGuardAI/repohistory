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
  // DATABASE_SSL=true  → require SSL (Azure PostgreSQL Flexible Server)
  // DATABASE_SSL=false → no SSL (local dev / old postgres container)
  // unset in production → 'require' (safe default for managed DB)
  const sslEnv = process.env.DATABASE_SSL
  const ssl = sslEnv === 'false' ? false
            : sslEnv === 'true'  ? 'require'
            : process.env.NODE_ENV === 'production' ? 'require'
            : false
  _sql = postgres(connectionString, { ssl, max: 10 })
  return _sql
}
