CREATE TABLE IF NOT EXISTS nuguard_cf_daily (
  id               BIGSERIAL PRIMARY KEY,
  date             DATE    NOT NULL UNIQUE,
  page_views       INTEGER NOT NULL DEFAULT 0,
  unique_visitors  INTEGER NOT NULL DEFAULT 0,
  requests         INTEGER NOT NULL DEFAULT 0,
  bandwidth_bytes  BIGINT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nuguard_cf_countries (
  id           BIGSERIAL PRIMARY KEY,
  date         DATE    NOT NULL,
  country_code CHAR(2) NOT NULL,
  requests     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (date, country_code)
);

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
);

CREATE TABLE IF NOT EXISTS nuguard_ga_pages (
  id                    BIGSERIAL PRIMARY KEY,
  date                  DATE    NOT NULL,
  page_path             TEXT    NOT NULL,
  page_views            INTEGER NOT NULL DEFAULT 0,
  avg_time_on_page_secs FLOAT   NOT NULL DEFAULT 0,
  UNIQUE (date, page_path)
);

CREATE TABLE IF NOT EXISTS nuguard_ga_demographics (
  id        BIGSERIAL PRIMARY KEY,
  date      DATE    NOT NULL,
  dimension TEXT    NOT NULL,
  value     TEXT    NOT NULL,
  users     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (date, dimension, value)
);

CREATE TABLE IF NOT EXISTS nuguard_ga_sources (
  id       BIGSERIAL PRIMARY KEY,
  date     DATE    NOT NULL,
  source   TEXT    NOT NULL,
  medium   TEXT    NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 0,
  users    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (date, source, medium)
);
