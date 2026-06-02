import { Suspense } from "react";
import { RepoCardSkeletonGrid } from "@/components/repo/repo-card-skeleton";
import { SetupActionToast } from "@/components/setup-action-toast";
import { DashboardHeader } from "@/components/repo/dashboard-header";
import DashboardContent from "@/components/dashboard-content";
import { DashboardTrafficSection } from "@/components/dashboard-traffic-section";
import { Navbar } from "@/components/layout/navbar";
import { DateRangeProvider } from "@/contexts/date-range-context";

export default async function Home() {
  return (
    <DateRangeProvider fullName="dashboard">
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="container mx-auto p-4 sm:p-10 space-y-6">
          <Suspense>
            <DashboardHeader />
          </Suspense>
          <Suspense fallback={<RepoCardSkeletonGrid />}>
            <DashboardContent />
          </Suspense>
          <Suspense>
            <SetupActionToast />
          </Suspense>
          <DashboardTrafficSection />
        </div>
      </div>
    </DateRangeProvider>
  );
}
