export const dynamic = 'force-dynamic';

import {
  getNuguardTrafficSummary,
  getNuguardUserSummary,
  getNuguardTopPages,
  getNuguardDemographics,
  getNuguardSources,
} from '@/utils/nuguard/queries';
import { getRepoClones } from '@/utils/repo/clones';
import { getRepoViews } from '@/utils/repo/views';
import { getUserOctokit } from '@/utils/octokit/get-user-octokit';
import { NuguardStatsCards, NuguardStatsCardsSkeleton } from '@/components/nuguard/nuguard-stats-cards';
import { NuguardTrafficChart } from '@/components/nuguard/nuguard-traffic-chart';
import { NuguardPagesTable } from '@/components/nuguard/nuguard-pages-table';
import { NuguardSourcesTable } from '@/components/nuguard/nuguard-sources-table';
import { NuguardDemographics } from '@/components/nuguard/nuguard-demographics';
import { NuguardJourneySection } from '@/components/nuguard/nuguard-journey-section';
import { NuguardGithubStats } from '@/components/nuguard/nuguard-github-stats';
import { NuguardRefreshButton } from '@/components/nuguard/nuguard-refresh-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Suspense } from 'react';
import { auth } from '@/lib/auth';

const NUGUARD_FULL_NAME = 'NuGuardAI/nuguard';
const NUGUARD_REPO_ID = 1186790942;

async function NuguardContent() {
  const session = await auth();
  const isAdmin = session?.isAdmin ?? false;
  const dateRange = { from: null, to: null };
  const octokit = await getUserOctokit();

  const [traffic, users, pages, countries, ages, genders, sources, repoClones, repoViews] = await Promise.allSettled([
    getNuguardTrafficSummary(dateRange),
    getNuguardUserSummary(dateRange),
    getNuguardTopPages(dateRange),
    getNuguardDemographics(dateRange, 'country'),
    getNuguardDemographics(dateRange, 'age'),
    getNuguardDemographics(dateRange, 'gender'),
    getNuguardSources(dateRange),
    getRepoClones(octokit, NUGUARD_FULL_NAME, NUGUARD_REPO_ID),
    getRepoViews(octokit, NUGUARD_FULL_NAME, NUGUARD_REPO_ID),
  ]);

  const queryNames = ['traffic', 'users', 'pages', 'countries', 'ages', 'genders', 'sources', 'repoClones', 'repoViews'];
  [traffic, users, pages, countries, ages, genders, sources, repoClones, repoViews].forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[nuguard] ${queryNames[i]} query failed:`, r.reason);
  });

  const trafficData = traffic.status === 'fulfilled' ? traffic.value : { totalPageViews: 0, totalUniqueVisitors: 0, dailyTraffic: [] };
  const userData = users.status === 'fulfilled' ? users.value : { totalActiveUsers: 0, totalSessions: 0, avgSessionDurationSecs: 0, avgBounceRate: 0, avgEngagementRate: 0 };
  const pagesData = pages.status === 'fulfilled' ? pages.value : [];
  const countriesData = countries.status === 'fulfilled' ? countries.value : [];
  const agesData = ages.status === 'fulfilled' ? ages.value : [];
  const gendersData = genders.status === 'fulfilled' ? genders.value : [];
  const sourcesData = sources.status === 'fulfilled' ? sources.value : [];
  const repoStatsData = {
    views: repoViews.status === 'fulfilled' ? repoViews.value : { count: 0, uniques: 0, views: [] },
    clones: repoClones.status === 'fulfilled' ? repoClones.value : { count: 0, uniques: 0, clones: [] },
  };

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-10 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NuGuard Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">nuguard.ai — website and GitHub repository stats</p>
        </div>
        {isAdmin && <NuguardRefreshButton />}
      </div>

      <Tabs defaultValue="website">
        <TabsList>
          <TabsTrigger value="website">Website</TabsTrigger>
          <TabsTrigger value="github">GitHub Repo</TabsTrigger>
        </TabsList>

        <TabsContent value="website" className="flex flex-col gap-6 mt-4">
          <NuguardStatsCards
            dailyTraffic={trafficData.dailyTraffic}
            totalActiveUsers={userData.totalActiveUsers}
            avgSessionDurationSecs={userData.avgSessionDurationSecs}
            avgBounceRate={userData.avgBounceRate}
          />

          <NuguardTrafficChart dailyTraffic={trafficData.dailyTraffic} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <NuguardPagesTable pages={pagesData} />
            <NuguardSourcesTable sources={sourcesData} />
          </div>

          <NuguardDemographics countries={countriesData} ages={agesData} genders={gendersData} />

          <NuguardJourneySection
            pages={pagesData}
            avgSessionDurationSecs={userData.avgSessionDurationSecs}
            totalSessions={userData.totalSessions}
            totalPageViews={trafficData.totalPageViews}
          />
        </TabsContent>

        <TabsContent value="github">
          <NuguardGithubStats repoStats={repoStatsData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function NuguardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 px-4 sm:px-10 py-6">
          <div>
            <h1 className="text-2xl font-bold">NuGuard Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">nuguard.ai — website and GitHub repository stats</p>
          </div>
          <NuguardStatsCardsSkeleton />
        </div>
      }
    >
      <NuguardContent />
    </Suspense>
  );
}
