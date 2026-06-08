import { getDb } from '@/lib/db';

interface CfDailyNode {
  dimensions: { date: string };
  sum: {
    pageViews: number;
    requests: number;
    bytes: number;
  };
  uniq: { uniques: number };
}

interface CfCountryNode {
  dimensions: { clientCountryName: string; date: string };
  sum: { requests: number };
}

interface CfGraphQLResponse {
  data?: {
    viewer?: {
      zones?: Array<{
        httpRequests1dGroups?: CfDailyNode[];
        httpRequestsAdaptiveGroups?: CfCountryNode[];
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

export async function fetchCloudflare(): Promise<boolean> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;

  if (!token || !zoneId) {
    return false;
  }

  const sql = getDb();
  const { since, until } = lastNDays(30);

  const query = `
    query {
      viewer {
        zones(filter: { zoneTag: "${zoneId}" }) {
          httpRequests1dGroups(
            limit: 40
            filter: { date_geq: "${since}", date_leq: "${until}" }
            orderBy: [date_ASC]
          ) {
            dimensions { date }
            sum { pageViews requests bytes }
            uniq { uniques }
          }
          httpRequestsAdaptiveGroups(
            limit: 1000
            filter: { date_geq: "${since}", date_leq: "${until}" }
            dimensions: [clientCountryName, date]
          ) {
            dimensions { clientCountryName date }
            sum { requests }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(`Cloudflare GraphQL request failed: ${res.status}`);
  }

  const body = await res.json() as CfGraphQLResponse;

  if (body.errors?.length) {
    throw new Error(`Cloudflare GraphQL errors: ${body.errors.map(e => e.message).join(', ')}`);
  }

  const zone = body.data?.viewer?.zones?.[0];
  if (!zone) return false;

  const dailyRows = (zone.httpRequests1dGroups ?? []).map(node => ({
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

  const countryRows = (zone.httpRequestsAdaptiveGroups ?? [])
    .filter(n => n.dimensions.clientCountryName && n.dimensions.clientCountryName.length === 2)
    .map(node => ({
      date: node.dimensions.date,
      country_code: node.dimensions.clientCountryName,
      requests: node.sum.requests,
    }));

  if (countryRows.length > 0) {
    await sql`
      INSERT INTO nuguard_cf_countries ${sql(countryRows, 'date', 'country_code', 'requests')}
      ON CONFLICT (date, country_code) DO UPDATE SET
        requests = EXCLUDED.requests
    `;
  }

  console.log(`Cloudflare: upserted ${dailyRows.length} daily rows, ${countryRows.length} country rows`);
  return true;
}
