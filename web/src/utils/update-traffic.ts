import { getApp } from '@/utils/octokit/app';
import { getDb } from '@/lib/db';

export interface TrafficUpdateResult {
  installationId: number;
  repositoriesSeen: number;
  repositoriesMatched: number;
  repositoriesUpdated: number;
  errors: Array<{ repo: string; message: string }>;
}

function utcDateString(date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function normalizeRepoName(fullName: string): string {
  return fullName.trim().toLowerCase();
}

export async function updateTraffic(installationId: number, repoFilter?: string): Promise<TrafficUpdateResult> {
  const sql = getDb();
  const app = getApp();
  const octokit = await app.getInstallationOctokit(installationId);
  const normalizedRepoFilter = repoFilter ? normalizeRepoName(repoFilter) : undefined;
  const result: TrafficUpdateResult = {
    installationId,
    repositoriesSeen: 0,
    repositoriesMatched: 0,
    repositoriesUpdated: 0,
    errors: [],
  };

  await app.eachRepository({ installationId }, async ({ repository }) => {
    result.repositoriesSeen += 1;
    if (normalizedRepoFilter && normalizeRepoName(repository.full_name) !== normalizedRepoFilter) return;
    result.repositoriesMatched += 1;
    try {
      const { data: viewsData } = await octokit.request(
        `GET /repos/${repository.full_name}/traffic/views`,
      );

      const { data: clonesData } = await octokit.request(
        `GET /repos/${repository.full_name}/traffic/clones`,
      );

      const { data: popularPathsData } = await octokit.request(
        `GET /repos/${repository.full_name}/traffic/popular/paths`,
      );

      const { data: popularReferrersData } = await octokit.request(
        `GET /repos/${repository.full_name}/traffic/popular/referrers`,
      );

      const viewsToUpsert = viewsData.views.map((view: { timestamp: string; count: number; uniques: number }) => ({
        repo_id: repository.id,
        date: view.timestamp.split('T')[0],
        total: view.count,
        uniques: view.uniques,
      }));

      const clonesToUpsert = clonesData.clones.map((clone: { timestamp: string; count: number; uniques: number }) => ({
        repo_id: repository.id,
        date: clone.timestamp.split('T')[0],
        total: clone.count,
        uniques: clone.uniques,
      }));

      const pathsMap = new Map<string, { repo_id: number; path: string; total: number; uniques: number }>();

      popularPathsData.forEach((path: { path: string; count: number; uniques: number }) => {
        const strippedPath = path.path.replace(/^\/[^/]+\/[^/]+/, '') || '/';

        if (pathsMap.has(strippedPath)) {
          const existing = pathsMap.get(strippedPath)!;
          existing.total += path.count;
          existing.uniques += path.uniques;
        } else {
          pathsMap.set(strippedPath, {
            repo_id: repository.id,
            path: strippedPath,
            total: path.count,
            uniques: path.uniques,
          });
        }
      });

      const today = utcDateString();
      const pathsToUpsert = Array.from(pathsMap.values()).map(p => ({ ...p, date: today }));

      const referrersToUpsert = popularReferrersData.map((referrer: { referrer: string; count: number; uniques: number }) => ({
        repo_id: repository.id,
        date: today,
        referrer: referrer.referrer,
        total: referrer.count,
        uniques: referrer.uniques,
      }));

      if (viewsToUpsert.length > 0) {
        await sql`
          INSERT INTO views ${sql(viewsToUpsert, 'repo_id', 'date', 'total', 'uniques')}
          ON CONFLICT (repo_id, date) DO UPDATE SET
            total = EXCLUDED.total,
            uniques = EXCLUDED.uniques
        `;
      }

      if (clonesToUpsert.length > 0) {
        await sql`
          INSERT INTO clones ${sql(clonesToUpsert, 'repo_id', 'date', 'total', 'uniques')}
          ON CONFLICT (repo_id, date) DO UPDATE SET
            total = EXCLUDED.total,
            uniques = EXCLUDED.uniques
        `;
      }

      if (pathsToUpsert.length > 0) {
        await sql`
          INSERT INTO paths ${sql(pathsToUpsert, 'repo_id', 'date', 'path', 'total', 'uniques')}
          ON CONFLICT (repo_id, path, date) DO UPDATE SET
            total = EXCLUDED.total,
            uniques = EXCLUDED.uniques
        `;
      }

      if (referrersToUpsert.length > 0) {
        await sql`
          INSERT INTO referrers ${sql(referrersToUpsert, 'repo_id', 'date', 'referrer', 'total', 'uniques')}
          ON CONFLICT (repo_id, referrer, date) DO UPDATE SET
            total = EXCLUDED.total,
            uniques = EXCLUDED.uniques
        `;
      }
      result.repositoriesUpdated += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push({ repo: repository.full_name, message });
      console.error(repository.full_name, 'error', message);
    }
  });

  return result;
}
