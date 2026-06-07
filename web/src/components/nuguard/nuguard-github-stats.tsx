import { ViewChart } from '@/components/charts/view-chart';
import { CloneChart } from '@/components/charts/clone-chart';
import { DashboardStats } from '@/components/dashboard-stats';
import { ReferrersTable } from '@/components/charts/referrers-table';
import { PopularContentTable } from '@/components/charts/popular-content-table';

interface RepoStats {
  views: { count: number; uniques: number; views: Array<{ timestamp: string; count: number; uniques: number }> };
  clones: { count: number; uniques: number; clones: Array<{ timestamp: string; count: number; uniques: number }> };
  referrers: Array<{ referrer: string; data: Array<{ timestamp: string; count: number; uniques: number }> }>;
  paths: Array<{ path: string; title: string; data: Array<{ timestamp: string; count: number; uniques: number }> }>;
}

interface NuguardGithubStatsProps {
  repoStats: RepoStats;
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
      <DashboardStats views={{ views: repoStats.views.views }} clones={{ clones: repoStats.clones.clones }} />
      <ViewChart traffic={{ views: repoStats.views }} />
      <CloneChart traffic={{ clones: repoStats.clones }} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReferrersTable traffic={{ referrers: repoStats.referrers }} />
        <PopularContentTable traffic={{ paths: repoStats.paths }} />
      </div>
    </div>
  );
}
