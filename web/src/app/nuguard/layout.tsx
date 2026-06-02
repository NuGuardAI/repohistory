import { DateRangeProvider } from '@/contexts/date-range-context';
import { Navbar } from '@/components/layout/navbar';

export default function NuguardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DateRangeProvider fullName="nuguard">
      <Navbar />
      {children}
    </DateRangeProvider>
  );
}
