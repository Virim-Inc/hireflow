import { useMemo } from 'react';
import type { DailyAcquisitionPoint } from '../../candidates/types/candidate.types';

export type DateRangeOption = 'today' | 'yesterday' | '7d' | '30d' | 'month' | '90d';

export function useTimelineFilter(data: DailyAcquisitionPoint[], range: DateRangeOption): DailyAcquisitionPoint[] {
  return useMemo(() => {
    if (!data || data.length === 0) return [];

    switch (range) {
      case 'today':
        // Return only the last date coordinate point
        return data.slice(-1);
      
      case 'yesterday':
        // Return only the yesterday coordinate point (second to last)
        if (data.length < 2) return [];
        return data.slice(-2, -1);
      
      case '7d':
        // Slice the last 7 days
        return data.slice(-7);
      
      case '30d':
        // Slice the last 30 days
        return data.slice(-30);
      
      case 'month': {
        // Filter elements belonging to the current calendar month
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // zero padded
        const currentMonthPrefix = `${year}-${month}`;
        
        return data.filter((item) => item.date.startsWith(currentMonthPrefix));
      }
      
      case '90d':
        // Return the full 90 days cached history
        return data;
      
      default:
        return data.slice(-30);
    }
  }, [data, range]);
}
