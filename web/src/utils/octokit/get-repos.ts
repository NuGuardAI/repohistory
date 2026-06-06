import { Repo } from "@/types";
import { Octokit } from "octokit";
import { getApp } from "./app";

type RepoResult = {
  repos: Repo[];
  reposByOwner: Record<string, Repo[]>;
  shouldShowOwnerView: boolean;
};

async function getReposViaOAuth(octokit: Octokit): Promise<RepoResult> {
  const { data: userRepos } = await octokit.request('GET /user/repos', {
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

export async function getRepos(octokit: Octokit): Promise<RepoResult> {
  const hasApp =
    process.env.APP_ID &&
    process.env.APP_ID !== 'not-configured' &&
    !!process.env.APP_PRIVATE_KEY;

  if (!hasApp) return getReposViaOAuth(octokit);

  try {
    const app = getApp();

    const { data: installationData } = await octokit.request('GET /user/installations');

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
      shouldShowOwnerView: Object.values(reposByOwner).some(ownerRepos => ownerRepos.length > 1),
    };
  } catch (err) {
    console.warn('[get-repos] GitHub App path failed, falling back to OAuth:', err instanceof Error ? err.message : err);
    return getReposViaOAuth(octokit);
  }
}
