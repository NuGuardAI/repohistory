import { Repo } from "@/types";
import { Octokit } from "octokit";
import { getApp } from "./app";

export async function getRepos(_octokit: Octokit) {
  // Use GitHub App path only when a real APP_ID is configured
  const hasApp = process.env.APP_ID && process.env.APP_ID !== 'not-configured';

  if (!hasApp) {
    // No GitHub App configured — list repos via the user's OAuth token
    const { data: userRepos } = await _octokit.request('GET /user/repos', {
      per_page: 100,
      sort: 'updated',
      affiliation: 'owner,organization_member',
    });

    const repos: Repo[] = userRepos
      .filter(r => r.permissions?.push || r.permissions?.admin)
      .map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        stargazers_count: r.stargazers_count,
        description: r.description ?? null,
      }));

    const reposByOwner: Record<string, Repo[]> = {};
    for (const repo of repos) {
      const owner = repo.full_name.split('/')[0];
      if (!reposByOwner[owner]) reposByOwner[owner] = [];
      reposByOwner[owner].push(repo);
    }

    return {
      repos,
      reposByOwner,
      shouldShowOwnerView: Object.keys(reposByOwner).length > 1,
    };
  }

  // Rename back to octokit for the production path
  const octokit = _octokit;

  const app = getApp();

  const { data: installationData } = await octokit.request(
    'GET /user/installations',
  );

  const installations = installationData.installations
    .filter(installation => installation.suspended_at === null);

  const repos: Repo[] = [];
  const reposByOwner: Record<string, Repo[]> = {};

  await Promise.all(installations.map(async (installation) => {
    const ownerRepos: Repo[] = [];
    await app.eachRepository({ installationId: installation.id }, ({ repository }) => {
      repos.push(repository);
      ownerRepos.push(repository);
    });

    if (ownerRepos.length > 0 && installation.account) {
      const owner = 'login' in installation.account ? installation.account.login : installation.account.name;
      reposByOwner[owner] = ownerRepos;
    }
  }));

  return {
    repos,
    reposByOwner,
    shouldShowOwnerView: Object.values(reposByOwner).some(ownerRepos => ownerRepos.length > 1)
  };
}
