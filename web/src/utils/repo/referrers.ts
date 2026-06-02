import { Octokit } from "octokit";
import sql from "@/lib/db";

export async function getRepoReferrers(
  octokit: Octokit,
  fullName: string,
  repoId: number
): Promise<{ referrers: Array<{ referrer: string; data: Array<{ timestamp: string; count: number; uniques: number }> }> }> {
  try {
    const [owner, repo] = fullName.split("/");

    const [dbResult, githubResult] = await Promise.allSettled([
      sql<{ date: string; referrer: string; total: number; uniques: number }[]>`
        SELECT date::text, referrer, total, uniques
        FROM referrers
        WHERE repo_id = ${repoId}
        ORDER BY date ASC
      `,
      octokit.request('GET /repos/{owner}/{repo}/traffic/popular/referrers', { owner, repo })
    ]);

    const dbData = dbResult.status === 'fulfilled' ? dbResult.value : [];
    if (dbResult.status === 'rejected') {
      console.error("Error fetching referrers from DB:", dbResult.reason);
    }

    const githubData = githubResult.status === 'fulfilled'
      ? githubResult.value.data?.map(item => ({
        referrer: item.referrer,
        count: item.count,
        uniques: item.uniques,
        date: new Date().toISOString().split('T')[0],
      })) || []
      : [];

    if (githubResult.status === 'rejected') {
      console.error("Error fetching referrers from GitHub API:", githubResult.reason);
    }

    const referrerMap = new Map<string, Map<string, { count: number; uniques: number }>>();

    dbData.forEach(item => {
      if (!referrerMap.has(item.referrer)) {
        referrerMap.set(item.referrer, new Map());
      }
      referrerMap.get(item.referrer)!.set(item.date, { count: item.total ?? 0, uniques: item.uniques ?? 0 });
    });

    githubData.forEach(item => {
      if (!referrerMap.has(item.referrer)) {
        referrerMap.set(item.referrer, new Map());
      }
      referrerMap.get(item.referrer)!.set(item.date, { count: item.count, uniques: item.uniques });
    });

    const referrers = Array.from(referrerMap.entries()).map(([referrer, dataMap]) => {
      const sortedData = Array.from(dataMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const data = [];

      if (sortedData.length > 0) {
        const startDate = new Date(sortedData[0][0]);
        const endDate = new Date();

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const existingData = dataMap.get(dateStr);
          data.push({
            timestamp: dateStr,
            count: existingData?.count || 0,
            uniques: existingData?.uniques || 0
          });
        }
      }

      return { referrer, data };
    });

    referrers.sort((a, b) => {
      const aTotal = a.data.reduce((sum, item) => sum + item.count, 0);
      const bTotal = b.data.reduce((sum, item) => sum + item.count, 0);
      return bTotal - aTotal;
    });

    return { referrers };
  } catch (error) {
    console.error("Error fetching referrers data:", error);
    return { referrers: [] };
  }
}
