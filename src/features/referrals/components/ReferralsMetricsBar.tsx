import React from 'react';
import {
  Share2,
  Clock,
  Briefcase,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import type { ReferralMetrics } from '../types/referral.types';

interface ReferralsMetricsBarProps {
  metrics: ReferralMetrics | null;
  loading: boolean;
}

export const ReferralsMetricsBar: React.FC<ReferralsMetricsBarProps> = ({ metrics, loading }) => {
  const cards = [
    {
      label: 'Total Referrals',
      value: metrics?.total_referrals ?? 0,
      icon: <Share2 size={18} className="text-indigo-600 dark:text-indigo-400" />,
      bg: 'bg-indigo-50/70 dark:bg-indigo-950/30',
      border: 'border-indigo-100 dark:border-indigo-900/40',
      textColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      label: 'Under Review',
      value: metrics?.under_review ?? 0,
      icon: <Clock size={18} className="text-amber-600 dark:text-amber-400" />,
      bg: 'bg-amber-50/70 dark:bg-amber-950/30',
      border: 'border-amber-100 dark:border-amber-900/40',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Interviewing',
      value: metrics?.interviewing ?? 0,
      icon: <Briefcase size={18} className="text-blue-600 dark:text-blue-400" />,
      bg: 'bg-blue-50/70 dark:bg-blue-950/30',
      border: 'border-blue-100 dark:border-blue-900/40',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Offers & Hired',
      value: (metrics?.offered ?? 0) + (metrics?.hired ?? 0),
      icon: <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />,
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      border: 'border-emerald-100 dark:border-emerald-900/40',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Partner Companies',
      value: metrics?.total_companies ?? 0,
      icon: <Building2 size={18} className="text-violet-600 dark:text-violet-400" />,
      bg: 'bg-violet-50/70 dark:bg-violet-950/30',
      border: 'border-violet-100 dark:border-violet-900/40',
      textColor: 'text-violet-600 dark:text-violet-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-2xl border ${card.border} ${card.bg} bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {card.label}
            </span>
            <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-xs">
              {card.icon}
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {loading ? (
              <span className="inline-block w-8 h-6 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
            ) : (
              card.value
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
