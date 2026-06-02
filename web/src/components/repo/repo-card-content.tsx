import { Repo } from "@/types";
import { getUserOctokit } from "@/utils/octokit/get-user-octokit";
import { RepoCardDisplay } from "./repo-card-display";

export async function RepoCardContent({ repo }: { repo: Repo }) {
  const octokit = await getUserOctokit();
  const [owner, repoName] = repo.full_name.split("/");

  try {
    const { data } = await octokit.request(
      'GET /repos/{owner}/{repo}/traffic/clones',
      { owner, repo: repoName }
    );
    const clonesData = (data.clones ?? []).map(item => ({
      date: item.timestamp.split('T')[0],
      total: item.count,
    }));
    return <RepoCardDisplay clonesData={clonesData} />;
  } catch (error) {
    console.error(error);
    return null;
  }
}
