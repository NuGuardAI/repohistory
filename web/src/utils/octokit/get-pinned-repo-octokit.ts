import { Octokit } from 'octokit';
import { getApp } from './app';

/**
 * Returns a GitHub App installation octokit for the owner of the pinned repo
 * (PINNED_REPO env var, defaults to NuGuardAI/nuguard). Falls back to null if
 * the App is not configured or no matching installation is found.
 */
export async function getPinnedRepoOctokit(): Promise<Octokit | null> {
  const pinnedRepo = process.env.PINNED_REPO ?? 'NuGuardAI/nuguard';
  const [owner] = pinnedRepo.split('/');

  try {
    const app = getApp();
    let found: Octokit | null = null;

    await app.eachInstallation(async ({ installation, octokit }) => {
      if (found) return;
      const account = installation.account;
      const login = account && 'login' in account ? account.login : null;
      if (login?.toLowerCase() === owner.toLowerCase()) {
        found = octokit as unknown as Octokit;
      }
    });

    return found;
  } catch {
    return null;
  }
}
