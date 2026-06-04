import { getDb } from '@/lib/db';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface NuguardTrafficSummary {
  totalPageViews: number;
  totalUniqueVisitors: number;
  dailyTraffic: Array<{ date: string; page_views: number; unique_visitors: number }>;
}

export interface NuguardUserSummary {
  totalActiveUsers: number;
  totalSessions: number;
  avgSessionDurationSecs: number;
  avgBounceRate: number;
  avgEngagementRate: number;
}

export interface NuguardTopPage {
  page_path: string;
  page_views: number;
  avg_time_on_page_secs: number;
}

export interface NuguardDemographicEntry {
  value: string;
  users: number;
}

export interface NuguardSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
}

function dateFilter(from: Date | null, to: Date | null): { since: string; until: string } | null {
  if (!from || !to) return null;
  return {
    since: from.toISOString().split('T')[0],
    until: to.toISOString().split('T')[0],
  };
}

export async function getNuguardTrafficSummary(dateRange: DateRange): Promise<NuguardTrafficSummary> {
  const sql = getDb();
  const filter = dateFilter(dateRange.from, dateRange.to);

  const rows = filter
    ? await sql<Array<{ date: string; page_views: number; unique_visitors: number }>>`
        SELECT date::text, page_views, unique_visitors
        FROM nuguard_cf_daily
        WHERE date >= ${filter.since} AND date <= ${filter.until}
        ORDER BY date ASC
      `
    : await sql<Array<{ date: string; page_views: number; unique_visitors: number }>>`
        SELECT date::text, page_views, unique_visitors
        FROM nuguard_cf_daily
        ORDER BY date ASC
      `;

  const totalPageViews = rows.reduce((s, r) => s + r.page_views, 0);
  const totalUniqueVisitors = rows.reduce((s, r) => s + r.unique_visitors, 0);

  return { totalPageViews, totalUniqueVisitors, dailyTraffic: rows };
}

export async function getNuguardUserSummary(dateRange: DateRange): Promise<NuguardUserSummary> {
  const sql = getDb();
  const filter = dateFilter(dateRange.from, dateRange.to);

  const rows = filter
    ? await sql<Array<{ active_users: number; sessions: number; avg_session_duration_secs: number; bounce_rate: number; engagement_rate: number }>>`
        SELECT active_users, sessions, avg_session_duration_secs, bounce_rate, engagement_rate
        FROM nuguard_ga_daily
        WHERE date >= ${filter.since} AND date <= ${filter.until}
      `
    : await sql<Array<{ active_users: number; sessions: number; avg_session_duration_secs: number; bounce_rate: number; engagement_rate: number }>>`
        SELECT active_users, sessions, avg_session_duration_secs, bounce_rate, engagement_rate
        FROM nuguard_ga_daily
      `;

  const totalActiveUsers = rows.reduce((s, r) => s + r.active_users, 0);
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);
  const avgSessionDurationSecs = rows.length > 0
    ? rows.reduce((s, r) => s + r.avg_session_duration_secs, 0) / rows.length
    : 0;
  const avgBounceRate = rows.length > 0
    ? rows.reduce((s, r) => s + r.bounce_rate, 0) / rows.length
    : 0;
  const avgEngagementRate = rows.length > 0
    ? rows.reduce((s, r) => s + r.engagement_rate, 0) / rows.length
    : 0;

  return { totalActiveUsers, totalSessions, avgSessionDurationSecs, avgBounceRate, avgEngagementRate };
}

export async function getNuguardTopPages(dateRange: DateRange): Promise<NuguardTopPage[]> {
  const sql = getDb();
  const filter = dateFilter(dateRange.from, dateRange.to);

  const rows = filter
    ? await sql<Array<{ page_path: string; page_views: number; avg_time_on_page_secs: number }>>`
        SELECT
          page_path,
          SUM(page_views) AS page_views,
          CASE WHEN SUM(page_views) > 0
            THEN SUM(avg_time_on_page_secs * page_views) / SUM(page_views)
            ELSE 0
          END AS avg_time_on_page_secs
        FROM nuguard_ga_pages
        WHERE date >= ${filter.since} AND date <= ${filter.until}
        GROUP BY page_path
        ORDER BY page_views DESC
        LIMIT 50
      `
    : await sql<Array<{ page_path: string; page_views: number; avg_time_on_page_secs: number }>>`
        SELECT
          page_path,
          SUM(page_views) AS page_views,
          CASE WHEN SUM(page_views) > 0
            THEN SUM(avg_time_on_page_secs * page_views) / SUM(page_views)
            ELSE 0
          END AS avg_time_on_page_secs
        FROM nuguard_ga_pages
        GROUP BY page_path
        ORDER BY page_views DESC
        LIMIT 50
      `;

  return rows;
}

export async function getNuguardDemographics(
  dateRange: DateRange,
  dimension: 'country' | 'age' | 'gender',
  limit = 15,
): Promise<NuguardDemographicEntry[]> {
  const sql = getDb();
  const filter = dateFilter(dateRange.from, dateRange.to);

  const rows = filter
    ? await sql<Array<{ value: string; users: number }>>`
        SELECT value, SUM(users) AS users
        FROM nuguard_ga_demographics
        WHERE dimension = ${dimension}
          AND date >= ${filter.since}
          AND date <= ${filter.until}
        GROUP BY value
        ORDER BY users DESC
        LIMIT ${limit}
      `
    : await sql<Array<{ value: string; users: number }>>`
        SELECT value, SUM(users) AS users
        FROM nuguard_ga_demographics
        WHERE dimension = ${dimension}
        GROUP BY value
        ORDER BY users DESC
        LIMIT ${limit}
      `;

  return rows;
}

export async function getNuguardSources(dateRange: DateRange): Promise<NuguardSource[]> {
  const sql = getDb();
  const filter = dateFilter(dateRange.from, dateRange.to);

  const rows = filter
    ? await sql<Array<{ source: string; medium: string; sessions: number; users: number }>>`
        SELECT source, medium, SUM(sessions) AS sessions, SUM(users) AS users
        FROM nuguard_ga_sources
        WHERE date >= ${filter.since} AND date <= ${filter.until}
        GROUP BY source, medium
        ORDER BY sessions DESC
        LIMIT 30
      `
    : await sql<Array<{ source: string; medium: string; sessions: number; users: number }>>`
        SELECT source, medium, SUM(sessions) AS sessions, SUM(users) AS users
        FROM nuguard_ga_sources
        GROUP BY source, medium
        ORDER BY sessions DESC
        LIMIT 30
      `;

  return rows;
}
