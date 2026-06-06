// Next.js instrumentation hook — runs once when the server starts.
// Applies the DB schema idempotently so the tables always exist.
// All statements use CREATE TABLE IF NOT EXISTS, safe to run on every restart.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { getDb } = await import('./lib/db');
  const sql = getDb();

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
    await sql`
      CREATE TABLE IF NOT EXISTS nuguard_cf_daily (
        id               BIGSERIAL PRIMARY KEY,
        date             DATE    NOT NULL UNIQUE,
        page_views       INTEGER NOT NULL DEFAULT 0,
        unique_visitors  INTEGER NOT NULL DEFAULT 0,
        requests         INTEGER NOT NULL DEFAULT 0,
        bandwidth_bytes  BIGINT  NOT NULL DEFAULT 0
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS nuguard_cf_countries (
        id           BIGSERIAL PRIMARY KEY,
        date         DATE    NOT NULL,
        country_code CHAR(2) NOT NULL,
        requests     INTEGER NOT NULL DEFAULT 0,
        UNIQUE (date, country_code)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS nuguard_ga_daily (
        id                        BIGSERIAL PRIMARY KEY,
        date                      DATE    NOT NULL UNIQUE,
        active_users              INTEGER NOT NULL DEFAULT 0,
        new_users                 INTEGER NOT NULL DEFAULT 0,
        sessions                  INTEGER NOT NULL DEFAULT 0,
        page_views                INTEGER NOT NULL DEFAULT 0,
        avg_session_duration_secs FLOAT   NOT NULL DEFAULT 0,
        bounce_rate               FLOAT   NOT NULL DEFAULT 0,
        engagement_rate           FLOAT   NOT NULL DEFAULT 0
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS nuguard_ga_pages (
        id                    BIGSERIAL PRIMARY KEY,
        date                  DATE    NOT NULL,
        page_path             TEXT    NOT NULL,
        page_views            INTEGER NOT NULL DEFAULT 0,
        avg_time_on_page_secs FLOAT   NOT NULL DEFAULT 0,
        UNIQUE (date, page_path)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS nuguard_ga_demographics (
        id        BIGSERIAL PRIMARY KEY,
        date      DATE    NOT NULL,
        dimension TEXT    NOT NULL,
        value     TEXT    NOT NULL,
        users     INTEGER NOT NULL DEFAULT 0,
        UNIQUE (date, dimension, value)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS nuguard_ga_sources (
        id       BIGSERIAL PRIMARY KEY,
        date     DATE    NOT NULL,
        source   TEXT    NOT NULL,
        medium   TEXT    NOT NULL,
        sessions INTEGER NOT NULL DEFAULT 0,
        users    INTEGER NOT NULL DEFAULT 0,
        UNIQUE (date, source, medium)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS local_users (
        id            BIGSERIAL PRIMARY KEY,
        username      TEXT        NOT NULL UNIQUE,
        password_hash TEXT        NOT NULL,
        created_by    TEXT        NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    console.log('[instrumentation] DB schema applied');
    console.log('[instrumentation] env check:', {
      DATABASE_URL: !!process.env.DATABASE_URL,
      GITHUB_CLIENT_ID: !!process.env.GITHUB_CLIENT_ID,
      AUTH_SECRET: !!(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET),
      APP_ID: !!process.env.APP_ID,
      APP_PRIVATE_KEY: !!process.env.APP_PRIVATE_KEY,
    });
  } catch (err) {
    console.error('[instrumentation] DB schema error:', err);
  }
}
