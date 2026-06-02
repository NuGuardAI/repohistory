import { Suspense } from 'react';
import { getUserOctokit } from '@/utils/octokit/get-user-octokit';
import { getRepos } from '@/utils/octokit/get-repos';
import { getOwnerViews } from '@/utils/repo/owner-views';
import { getOwnerClones } from '@/utils/repo/owner-clones';
import { getOwnerReferrers } from '@/utils/repo/owner-referrers';
import { getOwnerPaths } from '@/utils/repo/owner-paths';
import { ViewChart } from '@/components/charts/view-chart';
import { CloneChart } from '@/components/charts/clone-chart';
import { ReferrersTable } from '@/components/charts/referrers-table';
import { PopularContentTable } from '@/components/charts/popular-content-table';
import { DashboardStats, DashboardStatsSkeleton } from './dashboard-stats';

async function TrafficData() {
  const octokit = await getUserOctokit();
  const { repos } = await getRepos(octokit);

  const [views, clones, { referrers }, { paths }] = await Promise.all([
    getOwnerViews(octokit, repos),
    getOwnerClones(octokit, repos),
    getOwnerReferrers(octokit, repos),
    getOwnerPaths(octokit, repos),
  ]);

  return (
    <>
      <DashboardStats views={views} clones={clones} />
      <CloneChart traffic={{ clones }} />
      <ViewChart traffic={{ views }} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReferrersTable traffic={{ referrers }} />
        <PopularContentTable traffic={{ paths }} />
      </div>
    </>
  );
}

export function DashboardTrafficSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Traffic Overview</h2>
      <Suspense fallback={
        <div className="space-y-6">
          <DashboardStatsSkeleton />
          <CloneChart isLoading />
          <ViewChart isLoading />
        </div>
      }>
        <TrafficData />
      </Suspense>
    </div>
  );
}
