import { Repo } from "@/types";
import { Octokit } from "octokit";
import { getApp } from "./app";

const DEV_FALLBACK_REPO = 'NuGuardAI/nuguard';

export async function getRepos(_octokit: Octokit) {
  if (!process.env.APP_ID) {
    const [owner, repo] = DEV_FALLBACK_REPO.split('/');
    // Use env PAT directly — avoids any JWT encode/decode corruption of the token.
    const devOctokit = new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN });
    const { data } = await devOctokit.request('GET /repos/{owner}/{repo}', { owner, repo });
    const devRepo: Repo = {
      id: data.id,
      name: data.name,
      full_name: data.full_name,
      stargazers_count: data.stargazers_count,
      description: data.description,
    };
    return {
      repos: [devRepo],
      reposByOwner: { [owner]: [devRepo] },
      shouldShowOwnerView: false,
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
