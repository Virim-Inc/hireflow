import React, { useState, useMemo } from 'react';
import {
  Search,
  Building2,
  ExternalLink,
  Mail,
  UserCheck,
  Share2,
  Globe,
  Briefcase,
  CheckCircle2,
  Sparkles,
  Filter,
  Plus,
} from 'lucide-react';
import { PartnerCompanyLogo } from './PartnerCompanyLogo';
import type { PartnerCompany } from '../types/referral.types';

interface PartnerCompaniesTabProps {
  companies: PartnerCompany[];
  loading: boolean;
  onReferToCompany: (company: PartnerCompany) => void;
  onAddCompany?: () => void;
}

export const PartnerCompaniesTab: React.FC<PartnerCompaniesTabProps> = ({
  companies,
  loading,
  onReferToCompany,
  onAddCompany,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('all');

  // Extract unique industries for filter dropdown
  const industries = useMemo(() => {
    const list = new Set<string>();
    companies.forEach((c) => {
      if (c.industry?.trim()) list.add(c.industry.trim());
    });
    return Array.from(list).sort();
  }, [companies]);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        !search.trim() ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.industry && c.industry.toLowerCase().includes(search.toLowerCase())) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(search.toLowerCase())) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(search.toLowerCase()));

      const matchIndustry =
        selectedIndustry === 'all' ||
        (c.industry && c.industry.toLowerCase() === selectedIndustry.toLowerCase());

      return matchSearch && matchIndustry;
    });
  }, [companies, search, selectedIndustry]);

  return (
    <div className="space-y-5">
      {/* Search & Industry Filter Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <input
            type="text"
            placeholder="Search partner companies by name, industry, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-colors"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Industry Filter */}
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 outline-none cursor-pointer focus:border-indigo-500"
          >
            <option value="all">All Industries ({companies.length})</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium px-1">
            {filteredCompanies.length} {filteredCompanies.length === 1 ? 'company' : 'companies'} found
          </span>

          {onAddCompany && (
            <button
              type="button"
              onClick={onAddCompany}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer ml-auto sm:ml-0"
            >
              <Plus size={14} /> Add Company
            </button>
          )}
        </div>
      </div>

      {/* Companies Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 font-medium rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          Loading partner companies...
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <Building2 size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No partner companies found</p>
          <p className="text-xs text-slate-400 mt-1 mb-4">Try adjusting your search query or add a new partner company.</p>
          {onAddCompany && (
            <button
              type="button"
              onClick={onAddCompany}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <Plus size={14} /> Add New Partner Company
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredCompanies.map((company) => {
            return (
              <div
                key={company.id}
                className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4 group"
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <PartnerCompanyLogo
                        name={company.name}
                        logoUrl={company.logo_url}
                        size="md"
                        className="shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-700"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {company.name}
                        </h3>
                        {company.industry && (
                          <span className="inline-block mt-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/50">
                            {company.industry}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Partner
                    </span>
                  </div>

                  {/* Company Description */}
                  {company.description ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-3">
                      {company.description}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-3">
                      Verified hiring partner company in the {company.industry || 'Technology'} space.
                    </p>
                  )}

                  {/* Contact & Website Metadata */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    {company.contact_person && (
                      <div className="flex items-center gap-2 truncate">
                        <UserCheck size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">
                          Contact: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{company.contact_person}</strong>
                        </span>
                      </div>
                    )}

                    {company.contact_email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{company.contact_email}</span>
                      </div>
                    )}

                    {company.website && (
                      <div className="flex items-center gap-2 truncate">
                        <Globe size={13} className="text-slate-400 shrink-0" />
                        <a
                          href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 truncate font-medium"
                        >
                          {company.website.replace(/^https?:\/\//, '')}
                          <ExternalLink size={11} className="shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom / Action Button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onReferToCompany(company)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/20 active:scale-98 transition-all cursor-pointer"
                  >
                    <Share2 size={13} /> Refer Candidate to {company.name}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
