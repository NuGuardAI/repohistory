"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangeContextType {
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  dateRange: DateRange;
}

const defaultContext: DateRangeContextType = {
  selectedPeriod: "30",
  setSelectedPeriod: () => {},
  dateRange: { from: null, to: null },
};

const DateRangeContext = createContext<DateRangeContextType>(defaultContext);

interface DateRangeProviderProps {
  children: ReactNode;
  fullName: string;
}


function getStorageKey(fullName: string): string {
  return `dateRange_${fullName}`;
}

function loadFromLocalStorage(fullName: string): string {
  if (typeof window === 'undefined') {
    return "14";
  }

  try {
    const key = getStorageKey(fullName);
    const stored = localStorage.getItem(key);
    return stored || "30";
  } catch (error) {
    console.error('Error loading date range from localStorage:', error);
    return "14";
  }
}

function saveToLocalStorage(fullName: string, selectedPeriod: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(fullName);
    localStorage.setItem(key, selectedPeriod);
  } catch (error) {
    console.error('Error saving date range to localStorage:', error);
  }
}

function calculateDateRangeFromPeriod(selectedPeriod: string): DateRange {
  if (selectedPeriod === "all") {
    return { from: null, to: null };
  }

  const days = parseInt(selectedPeriod);
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from, to };
}

export function DateRangeProvider({ children, fullName }: DateRangeProviderProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("30");

  useEffect(() => {
    const period = loadFromLocalStorage(fullName);
    setSelectedPeriod(period);
  }, [fullName]);

  const handleSetSelectedPeriod = (period: string) => {
    setSelectedPeriod(period);
    saveToLocalStorage(fullName, period);
  };

  const dateRange = calculateDateRangeFromPeriod(selectedPeriod);

  return (
    <DateRangeContext.Provider value={{ 
      selectedPeriod,
      setSelectedPeriod: handleSetSelectedPeriod,
      dateRange
    }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  return useContext(DateRangeContext);
}