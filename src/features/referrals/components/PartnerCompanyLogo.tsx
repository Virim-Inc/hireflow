import React, { useState } from 'react';
import { Building2 } from 'lucide-react';

interface PartnerCompanyLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PartnerCompanyLogo: React.FC<PartnerCompanyLogoProps> = ({
  name,
  logoUrl,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs rounded-lg',
    md: 'w-10 h-10 text-sm rounded-xl',
    lg: 'w-14 h-14 text-base rounded-2xl',
  }[size];

  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 24,
  }[size];

  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : 'C';

  if (logoUrl && !hasError) {
    return (
      <div
        className={`relative flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 p-1 shadow-sm shrink-0 overflow-hidden ${sizeClasses} ${className}`}
      >
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-contain"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center font-bold bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-sm shrink-0 ${sizeClasses} ${className}`}
      title={name}
    >
      {initial || <Building2 size={iconSizes} />}
    </div>
  );
};
