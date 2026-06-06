import { ViewChart } from '@/components/charts/view-chart';
import { CloneChart } from '@/components/charts/clone-chart';
import type { NuguardRepoStats } from '@/utils/nuguard/queries';

interface NuguardGithubStatsProps {
  repoStats: NuguardRepoStats;
}

export function NuguardGithubStats({ repoStats }: NuguardGithubStatsProps) {
  return (
    <div className="flex flex-col gap-6 mt-4">
      <div>
        <p className="text-sm text-muted-foreground">
          GitHub traffic for{' '}
          <a
            href="https://github.com/NuGuardAI/nuguard"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            NuGuardAI/nuguard
          </a>
        </p>
      </div>
      <ViewChart traffic={{ views: repoStats.views }} />
      <CloneChart traffic={{ clones: repoStats.clones }} />
    </div>
  );
}
