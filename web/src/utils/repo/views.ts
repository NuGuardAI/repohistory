import { Octokit } from "octokit";
import { getDb } from "@/lib/db";

export async function getRepoViews(
  octokit: Octokit,
  fullName: string,
  repoId: number
): Promise<{ count: number; uniques: number; views: Array<{ timestamp: string; count: number; uniques: number }> }> {
  const sql = getDb();
  try {
    const [owner, repo] = fullName.split("/");

    const [dbResult, githubResult] = await Promise.allSettled([
      sql<{ date: string; total: number; uniques: number }[]>`
        SELECT date::text, total, uniques
        FROM views
        WHERE repo_id = ${repoId}
        ORDER BY date ASC
      `,
      octokit.request('GET /repos/{owner}/{repo}/traffic/views', { owner, repo })
    ]);

    const dbData = dbResult.status === 'fulfilled' ? dbResult.value : [];
    if (dbResult.status === 'rejected') {
      console.error("Error fetching views from DB:", dbResult.reason);
    }

    const githubData = githubResult.status === 'fulfilled'
      ? githubResult.value.data.views?.map(item => ({
        date: item.timestamp.split('T')[0],
        count: item.count,
        uniques: item.uniques,
      })) || []
      : [];

    if (githubResult.status === 'rejected') {
      console.error("Error fetching views from GitHub API:", githubResult.reason);
    }

    const dataMap = new Map(
      dbData.map(item => [
        item.date,
        { timestamp: item.date, count: item.total ?? 0, uniques: item.uniques ?? 0 }
      ])
    );

    githubData.forEach(item => {
      dataMap.set(item.date, { timestamp: item.date, count: item.count, uniques: item.uniques });
    });

    const sortedViews = Array.from(dataMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const views = [];

    if (sortedViews.length > 0) {
      const startDate = new Date(sortedViews[0].timestamp);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const existingData = dataMap.get(dateStr);
        views.push(existingData || { timestamp: dateStr, count: 0, uniques: 0 });
      }
    }

    const count = views.reduce((sum, item) => sum + item.count, 0);
    const uniques = views.reduce((sum, item) => sum + item.uniques, 0);

    return { count, uniques, views };
  } catch (error) {
    console.error("Error fetching views data:", error);
    return { count: 0, uniques: 0, views: [] };
  }
}
