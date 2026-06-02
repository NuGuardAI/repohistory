import { Octokit } from "octokit";
import { getDb } from "@/lib/db";

export async function getRepoPaths(
  octokit: Octokit,
  fullName: string,
  repoId: number
): Promise<{ paths: Array<{ path: string; title: string; data: Array<{ timestamp: string; count: number; uniques: number }> }> }> {
  const sql = getDb();
  try {
    const [owner, repo] = fullName.split("/");

    const [dbResult, githubResult] = await Promise.allSettled([
      sql<{ date: string; path: string; total: number; uniques: number }[]>`
        SELECT date::text, path, total, uniques
        FROM paths
        WHERE repo_id = ${repoId}
        ORDER BY date ASC
      `,
      octokit.request('GET /repos/{owner}/{repo}/traffic/popular/paths', { owner, repo })
    ]);

    const dbData = dbResult.status === 'fulfilled' ? dbResult.value : [];
    if (dbResult.status === 'rejected') {
      console.error("Error fetching paths from DB:", dbResult.reason);
    }

    const githubData = githubResult.status === 'fulfilled'
      ? githubResult.value.data?.map(item => ({
        path: item.path.replace(/^\/[^/]+\/[^/]+/, '') || '/',
        title: item.title,
        count: item.count,
        uniques: item.uniques,
        date: new Date().toISOString().split('T')[0],
      })) || []
      : [];

    if (githubResult.status === 'rejected') {
      console.error("Error fetching paths from GitHub API:", githubResult.reason);
    }

    const pathMap = new Map<string, { title: string; data: Map<string, { count: number; uniques: number }> }>();

    dbData.forEach(item => {
      if (!pathMap.has(item.path)) {
        pathMap.set(item.path, { title: item.path, data: new Map() });
      }
      pathMap.get(item.path)!.data.set(item.date, { count: item.total ?? 0, uniques: item.uniques ?? 0 });
    });

    githubData.forEach(item => {
      if (!pathMap.has(item.path)) {
        pathMap.set(item.path, { title: item.title, data: new Map() });
      }
      const pathData = pathMap.get(item.path)!;
      pathData.title = item.title;
      pathData.data.set(item.date, { count: item.count, uniques: item.uniques });
    });

    const paths = Array.from(pathMap.entries()).map(([path, pathInfo]) => {
      const sortedData = Array.from(pathInfo.data.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const data = [];

      if (sortedData.length > 0) {
        const startDate = new Date(sortedData[0][0]);
        const endDate = new Date();

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const existingData = pathInfo.data.get(dateStr);
          data.push({
            timestamp: dateStr,
            count: existingData?.count || 0,
            uniques: existingData?.uniques || 0
          });
        }
      }

      return { path, title: pathInfo.title, data };
    });

    paths.sort((a, b) => {
      const aTotal = a.data.reduce((sum, item) => sum + item.count, 0);
      const bTotal = b.data.reduce((sum, item) => sum + item.count, 0);
      return bTotal - aTotal;
    });

    return { paths };
  } catch (error) {
    console.error("Error fetching paths data:", error);
    return { paths: [] };
  }
}

