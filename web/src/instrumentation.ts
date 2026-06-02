// Next.js instrumentation hook — runs once when the server starts.
// Applies the DB schema idempotently so the tables always exist.
// All statements use CREATE TABLE IF NOT EXISTS, safe to run on every restart.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { default: sql } = await import('./lib/db');

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS views (
        id        BIGSERIAL PRIMARY KEY,
        repo_id   BIGINT  NOT NULL,
        date      DATE    NOT NULL,
        total     INTEGER NOT NULL DEFAULT 0,
        uniques   INTEGER NOT NULL DEFAULT 0,
        UNIQUE (repo_id, date)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS clones (
        id        BIGSERIAL PRIMARY KEY,
        repo_id   BIGINT  NOT NULL,
        date      DATE    NOT NULL,
        total     INTEGER NOT NULL DEFAULT 0,
        uniques   INTEGER NOT NULL DEFAULT 0,
        UNIQUE (repo_id, date)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS paths (
        id        BIGSERIAL PRIMARY KEY,
        repo_id   BIGINT  NOT NULL,
        date      DATE    NOT NULL DEFAULT CURRENT_DATE,
        path      TEXT    NOT NULL,
        total     INTEGER NOT NULL DEFAULT 0,
        uniques   INTEGER NOT NULL DEFAULT 0,
        UNIQUE (repo_id, path, date)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS referrers (
        id        BIGSERIAL PRIMARY KEY,
        repo_id   BIGINT  NOT NULL,
        date      DATE    NOT NULL DEFAULT CURRENT_DATE,
        referrer  TEXT    NOT NULL,
        total     INTEGER NOT NULL DEFAULT 0,
        uniques   INTEGER NOT NULL DEFAULT 0,
        UNIQUE (repo_id, referrer, date)
      )
    `;
    console.log('[instrumentation] DB schema applied');
  } catch (err) {
    console.error('[instrumentation] DB schema error:', err);
  }
}
