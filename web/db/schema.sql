CREATE TABLE IF NOT EXISTS views (
  id        BIGSERIAL PRIMARY KEY,
  repo_id   BIGINT  NOT NULL,
  date      DATE    NOT NULL,
  total     INTEGER NOT NULL DEFAULT 0,
  uniques   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (repo_id, date)
);

CREATE TABLE IF NOT EXISTS clones (
  id        BIGSERIAL PRIMARY KEY,
  repo_id   BIGINT  NOT NULL,
  date      DATE    NOT NULL,
  total     INTEGER NOT NULL DEFAULT 0,
  uniques   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (repo_id, date)
);

CREATE TABLE IF NOT EXISTS paths (
  id        BIGSERIAL PRIMARY KEY,
  repo_id   BIGINT  NOT NULL,
  date      DATE    NOT NULL DEFAULT CURRENT_DATE,
  path      TEXT    NOT NULL,
  total     INTEGER NOT NULL DEFAULT 0,
  uniques   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (repo_id, path, date)
);

CREATE TABLE IF NOT EXISTS referrers (
  id        BIGSERIAL PRIMARY KEY,
  repo_id   BIGINT  NOT NULL,
  date      DATE    NOT NULL DEFAULT CURRENT_DATE,
  referrer  TEXT    NOT NULL,
  total     INTEGER NOT NULL DEFAULT 0,
  uniques   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (repo_id, referrer, date)
);
