import { Octokit } from "octokit";
import sql from "@/lib/db";

export async function getRepoClones(
  octokit: Octokit,
  fullName: string,
  repoId: number
): Promise<{ count: number; uniques: number; clones: Array<{ timestamp: string; count: number; uniques: number }> }> {
  try {
    const [owner, repo] = fullName.split("/");

    const [dbResult, githubResult] = await Promise.allSettled([
      sql<{ date: string; total: number; uniques: number }[]>`
        SELECT date::text, total, uniques
        FROM clones
        WHERE repo_id = ${repoId}
        ORDER BY date ASC
      `,
      octokit.request('GET /repos/{owner}/{repo}/traffic/clones', { owner, repo })
    ]);

    const dbData = dbResult.status === 'fulfilled' ? dbResult.value : [];
    if (dbResult.status === 'rejected') {
      console.error("Error fetching clones from DB:", dbResult.reason);
    }

    const githubData = githubResult.status === 'fulfilled'
      ? githubResult.value.data.clones?.map(item => ({
        date: item.timestamp.split('T')[0],
        count: item.count,
        uniques: item.uniques,
      })) || []
      : [];

    if (githubResult.status === 'rejected') {
      console.error("Error fetching clones from GitHub API:", githubResult.reason);
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

    const sortedClones = Array.from(dataMap.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const clones = [];

    if (sortedClones.length > 0) {
      const startDate = new Date(sortedClones[0].timestamp);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const existingData = dataMap.get(dateStr);
        clones.push(existingData || { timestamp: dateStr, count: 0, uniques: 0 });
      }
    }

    const count = clones.reduce((sum, item) => sum + item.count, 0);
    const uniques = clones.reduce((sum, item) => sum + item.uniques, 0);

    return { count, uniques, clones };
  } catch (error) {
    console.error("Error fetching clones data:", error);
    return { count: 0, uniques: 0, clones: [] };
  }
}
