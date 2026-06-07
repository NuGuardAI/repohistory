import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getDb } from '@/lib/db';

function getClient(): BetaAnalyticsDataClient {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GA4_SERVICE_ACCOUNT_JSON is not set');
  let credentials;
  try {
    // Support both raw JSON and base64-encoded JSON
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    credentials = JSON.parse(decoded);
  } catch {
    credentials = JSON.parse(raw);
  }
  return new BetaAnalyticsDataClient({ credentials });
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function lastNDays(n: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - n);
  return { startDate: formatDate(start), endDate: formatDate(end) };
}

function getMetricValue(row: { metricValues?: Array<{ value?: string | null }> | null }, index: number): number {
  return parseFloat(row.metricValues?.[index]?.value ?? '0') || 0;
}

function getDimValue(row: { dimensionValues?: Array<{ value?: string | null }> | null }, index: number): string {
  return row.dimensionValues?.[index]?.value ?? '';
}

export async function fetchGA4(): Promise<boolean> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const encoded = process.env.GA4_SERVICE_ACCOUNT_JSON;

  if (!propertyId || !encoded) {
    return false;
  }

  const client = getClient();
  const sql = getDb();
  const { startDate, endDate } = lastNDays(3);
  const property = `properties/${propertyId}`;

  const [dailyRes, pagesRes, countryRes, ageGenderRes, sourcesRes] = await Promise.allSettled([
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'engagementRate' },
      ],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }, { name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'userEngagementDuration' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 500,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }, { name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 500,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }, { name: 'userAgeBracket' }, { name: 'userGender' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 500,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }, { name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 500,
    }),
  ]);

  // Daily summary
  if (dailyRes.status === 'fulfilled') {
    const rows = (dailyRes.value[0].rows ?? []).map(row => {
      const rawDate = getDimValue(row, 0); // YYYYMMDD
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      return {
        date,
        active_users: Math.round(getMetricValue(row, 0)),
        new_users: Math.round(getMetricValue(row, 1)),
        sessions: Math.round(getMetricValue(row, 2)),
        page_views: Math.round(getMetricValue(row, 3)),
        avg_session_duration_secs: getMetricValue(row, 4),
        bounce_rate: getMetricValue(row, 5),
        engagement_rate: getMetricValue(row, 6),
      };
    });

    if (rows.length > 0) {
      await sql`
        INSERT INTO nuguard_ga_daily ${sql(rows, 'date', 'active_users', 'new_users', 'sessions', 'page_views', 'avg_session_duration_secs', 'bounce_rate', 'engagement_rate')}
        ON CONFLICT (date) DO UPDATE SET
          active_users              = EXCLUDED.active_users,
          new_users                 = EXCLUDED.new_users,
          sessions                  = EXCLUDED.sessions,
          page_views                = EXCLUDED.page_views,
          avg_session_duration_secs = EXCLUDED.avg_session_duration_secs,
          bounce_rate               = EXCLUDED.bounce_rate,
          engagement_rate           = EXCLUDED.engagement_rate
      `;
      console.log(`GA4: upserted ${rows.length} daily rows`);
    }
  } else {
    console.error('GA4 daily report failed:', dailyRes.reason);
  }

  // Pages
  if (pagesRes.status === 'fulfilled') {
    const rows = (pagesRes.value[0].rows ?? []).map(row => {
      const rawDate = getDimValue(row, 0);
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const pageViews = Math.round(getMetricValue(row, 0));
      const totalEngagement = getMetricValue(row, 1);
      return {
        date,
        page_path: getDimValue(row, 1) || '/',
        page_views: pageViews,
        avg_time_on_page_secs: pageViews > 0 ? totalEngagement / pageViews : 0,
      };
    });

    if (rows.length > 0) {
      await sql`
        INSERT INTO nuguard_ga_pages ${sql(rows, 'date', 'page_path', 'page_views', 'avg_time_on_page_secs')}
        ON CONFLICT (date, page_path) DO UPDATE SET
          page_views            = EXCLUDED.page_views,
          avg_time_on_page_secs = EXCLUDED.avg_time_on_page_secs
      `;
      console.log(`GA4: upserted ${rows.length} page rows`);
    }
  } else {
    console.error('GA4 pages report failed:', pagesRes.reason);
  }

  // Country demographics
  const demographicRows: Array<{ date: string; dimension: string; value: string; users: number }> = [];

  if (countryRes.status === 'fulfilled') {
    for (const row of (countryRes.value[0].rows ?? [])) {
      const rawDate = getDimValue(row, 0);
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const country = getDimValue(row, 1);
      if (country && country !== '(not set)') {
        demographicRows.push({ date, dimension: 'country', value: country, users: Math.round(getMetricValue(row, 0)) });
      }
    }
  } else {
    console.error('GA4 country report failed:', countryRes.reason);
  }

  if (ageGenderRes.status === 'fulfilled') {
    for (const row of (ageGenderRes.value[0].rows ?? [])) {
      const rawDate = getDimValue(row, 0);
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const age = getDimValue(row, 1);
      const gender = getDimValue(row, 2);
      const users = Math.round(getMetricValue(row, 0));

      if (age && age !== '(not set)') {
        demographicRows.push({ date, dimension: 'age', value: age, users });
      }
      if (gender && gender !== '(not set)') {
        demographicRows.push({ date, dimension: 'gender', value: gender, users });
      }
    }
  } else {
    console.error('GA4 age/gender report failed:', ageGenderRes.reason);
  }

  if (demographicRows.length > 0) {
    await sql`
      INSERT INTO nuguard_ga_demographics ${sql(demographicRows, 'date', 'dimension', 'value', 'users')}
      ON CONFLICT (date, dimension, value) DO UPDATE SET
        users = EXCLUDED.users
    `;
    console.log(`GA4: upserted ${demographicRows.length} demographic rows`);
  }

  // Traffic sources
  if (sourcesRes.status === 'fulfilled') {
    const rows = (sourcesRes.value[0].rows ?? []).map(row => {
      const rawDate = getDimValue(row, 0);
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      return {
        date,
        source: getDimValue(row, 1) || '(direct)',
        medium: getDimValue(row, 2) || '(none)',
        sessions: Math.round(getMetricValue(row, 0)),
        users: Math.round(getMetricValue(row, 1)),
      };
    });

    if (rows.length > 0) {
      await sql`
        INSERT INTO nuguard_ga_sources ${sql(rows, 'date', 'source', 'medium', 'sessions', 'users')}
        ON CONFLICT (date, source, medium) DO UPDATE SET
          sessions = EXCLUDED.sessions,
          users    = EXCLUDED.users
      `;
      console.log(`GA4: upserted ${rows.length} source rows`);
    }
  } else {
    console.error('GA4 sources report failed:', sourcesRes.reason);
  }
  return true;
}
