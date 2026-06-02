"use client";

import { CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDateRange } from "@/contexts/date-range-context";

interface DateRangePickerProps {
  className?: string;
}

const periodOptions = [
  { value: "1", label: "Last 24 Hours" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "all", label: "All Time" },
];

export function DateRangePicker({ className }: DateRangePickerProps) {
  const ctx = useDateRange();

  if (!ctx) return null;

  const { selectedPeriod, setSelectedPeriod } = ctx;

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
  };

  return (
    <div className={className}>
      <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className="cursor-pointer gap-2">
          <CalendarDays className="h-4 w-4" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {periodOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
