import { getDb } from '@/lib/db';

interface CfDailyNode {
  dimensions: { date: string };
  sum: { pageViews: number; requests: number; bytes: number };
  uniq: { uniques: number };
}

// Free-plan adaptive groups only support count (no sum/uniq) and single-day filters
interface CfAdaptiveCountryNode {
  count: number;
  dimensions: { clientCountryName: string };
}

interface CfAdaptiveUrlNode {
  count: number;
  dimensions: { clientRequestPath: string };
}

interface CfDailyResponse {
  data?: {
    viewer?: {
      zones?: Array<{ httpRequests1dGroups?: CfDailyNode[] }>;
    };
  };
  errors?: Array<{ message: string }>;
}

interface CfAdaptiveDayResponse {
  data?: {
    viewer?: {
      zones?: Array<{
        countryGroups?: CfAdaptiveCountryNode[];
        urlGroups?: CfAdaptiveUrlNode[];
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

function lastNDays(n: number): { since: string; until: string } {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - n);
  return {
    since: since.toISOString().split('T')[0],
    until: until.toISOString().split('T')[0],
  };
}

/** Returns all dates between since and until (inclusive), YYYY-MM-DD strings. */
function dateRange(since: string, until: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(since);
  const end = new Date(until);
  while (cursor <= end) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function cfGraphQL<T>(token: string, query: string): Promise<T> {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Cloudflare GraphQL HTTP ${res.status}`);
  const body = await res.json() as T & { errors?: Array<{ message: string }> };
  if ((body as { errors?: Array<{ message: string }> }).errors?.length) {
    throw new Error(
      `Cloudflare GraphQL error: ${(body as { errors: Array<{ message: string }> }).errors.map(e => e.message).join(', ')}`
    );
  }
  return body;
}

export async function fetchCloudflare(options?: { since?: string; until?: string }): Promise<boolean> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!token || !zoneId) {
    return false;
  }

  const sql = getDb();
  const defaultRange = lastNDays(30);
  const since = options?.since ?? defaultRange.since;
  const until = options?.until ?? defaultRange.until;

  // ── 1. Daily totals — httpRequests1dGroups supports multi-day ranges ──────
  const dailyQuery = `
    query {
      viewer {
        zones(filter: { zoneTag: "${zoneId}" }) {
          httpRequests1dGroups(
            limit: 32
            filter: { date_geq: "${since}", date_leq: "${until}" }
            orderBy: [date_ASC]
          ) {
            dimensions { date }
            sum { pageViews requests bytes }
            uniq { uniques }
          }
        }
      }
    }
  `;

  const dailyBody = await cfGraphQL<CfDailyResponse>(token, dailyQuery);
  const dailyNodes = dailyBody.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];

  const dailyRows = dailyNodes.map(node => ({
    date: node.dimensions.date,
    page_views: node.sum.pageViews,
    unique_visitors: node.uniq.uniques,
    requests: node.sum.requests,
    bandwidth_bytes: node.sum.bytes,
  }));

  if (dailyRows.length > 0) {
    await sql`
      INSERT INTO nuguard_cf_daily ${sql(dailyRows, 'date', 'page_views', 'unique_visitors', 'requests', 'bandwidth_bytes')}
      ON CONFLICT (date) DO UPDATE SET
        page_views      = EXCLUDED.page_views,
        unique_visitors = EXCLUDED.unique_visitors,
        requests        = EXCLUDED.requests,
        bandwidth_bytes = EXCLUDED.bandwidth_bytes
    `;
  }

  // ── 2. Per-country & per-URL breakdown ────────────────────────────────────
  // Free plan: httpRequestsAdaptiveGroups is limited to 1-day windows.
  // Query each day individually; only fetch last 7 days to cap API calls.
  // (Backfill of daily totals is handled separately via the backfill route.)
  const COUNTRY_URL_WINDOW = 7;
  const windowSince = new Date();
  windowSince.setDate(windowSince.getDate() - COUNTRY_URL_WINDOW);
  const adaptiveSince = windowSince.toISOString().split('T')[0] > since
    ? windowSince.toISOString().split('T')[0]
    : since;

  const days = dateRange(adaptiveSince, until);
  let countryTotal = 0;
  let urlTotal = 0;

  for (const day of days) {
    try {
      const adaptiveQuery = `
        query {
          viewer {
            zones(filter: { zoneTag: "${zoneId}" }) {
              countryGroups: httpRequestsAdaptiveGroups(
                limit: 200
                filter: { date: "${day}" }
                orderBy: [count_DESC]
              ) {
                count
                dimensions { clientCountryName }
              }
              urlGroups: httpRequestsAdaptiveGroups(
                limit: 50
                filter: { date: "${day}" }
                orderBy: [count_DESC]
              ) {
                count
                dimensions { clientRequestPath }
              }
            }
          }
        }
      `;

      const adaptiveBody = await cfGraphQL<CfAdaptiveDayResponse>(token, adaptiveQuery);
      const zone = adaptiveBody.data?.viewer?.zones?.[0];
      if (!zone) continue;

      const countryRows = (zone.countryGroups ?? [])
        .filter(n => n.dimensions.clientCountryName?.length === 2)
        .map(n => ({
          date: day,
          country_code: n.dimensions.clientCountryName,
          requests: n.count,
          unique_visitors: 0,
        }));

      if (countryRows.length > 0) {
        await sql`
          INSERT INTO nuguard_cf_countries ${sql(countryRows, 'date', 'country_code', 'requests', 'unique_visitors')}
          ON CONFLICT (date, country_code) DO UPDATE SET
            requests = EXCLUDED.requests
        `;
        countryTotal += countryRows.length;
      }

      const urlRows = (zone.urlGroups ?? [])
        .filter(n => n.dimensions.clientRequestPath)
        .map(n => ({
          date: day,
          url_path: n.dimensions.clientRequestPath,
          requests: n.count,
          unique_visitors: 0,
        }));

      if (urlRows.length > 0) {
        await sql`
          INSERT INTO nuguard_cf_urls ${sql(urlRows, 'date', 'url_path', 'requests', 'unique_visitors')}
          ON CONFLICT (date, url_path) DO UPDATE SET
            requests = EXCLUDED.requests
        `;
        urlTotal += urlRows.length;
      }
    } catch (err) {
      // Log but don't fail the whole fetch — daily totals are already saved
      console.warn(`Cloudflare adaptive groups error for ${day}:`, err instanceof Error ? err.message : String(err));
    }
  }

  console.log(`Cloudflare [${since}→${until}]: upserted ${dailyRows.length} daily, ${countryTotal} country, ${urlTotal} URL rows`);
  return true;
}

