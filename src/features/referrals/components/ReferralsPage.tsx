import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Users,
  Building2,
  CheckCircle2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { ReferralsMetricsBar } from './ReferralsMetricsBar';
import { ReferredCandidatesTable } from './ReferredCandidatesTable';
import { AvailableCandidatesTab } from './AvailableCandidatesTab';
import { PartnerCompaniesTab } from './PartnerCompaniesTab';
import { ReferralDetailsDrawer } from './ReferralDetailsDrawer';
import { ReferCandidateModal, type CandidateToRefer } from './ReferCandidateModal';
import { ReferToCompanyModal } from './ReferToCompanyModal';
import { AddPartnerCompanyModal } from './AddPartnerCompanyModal';
import {
  getReferrals,
  getReferralMetrics,
  getPartnerCompanies,
  getReferralById,
} from '../services/referral.service';
import type {
  CandidateReferral,
  PartnerCompany,
  ReferralMetrics,
} from '../types/referral.types';
import { useDebounce } from '../../../lib/useDebounce';

interface ReferralsPageProps {
  onOpenCandidateDrawer?: (candidateId: number) => void;
}

export const ReferralsPage: React.FC<ReferralsPageProps> = ({ onOpenCandidateDrawer }) => {
  const [activeTab, setActiveTab] = useState<'referred' | 'available' | 'companies'>('referred');

  // Metrics & Companies
  const [metrics, setMetrics] = useState<ReferralMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [companies, setCompanies] = useState<PartnerCompany[]>([]);

  // Referrals table state (Tab 1)
  const [referrals, setReferrals] = useState<CandidateReferral[]>([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState<number | ''>('');

  // Reset page on search or filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, companyFilter]);

  // Drawers & Modals
  const [selectedReferral, setSelectedReferral] = useState<CandidateReferral | null>(null);
  const [referModalCandidate, setReferModalCandidate] = useState<CandidateToRefer | null>(null);
  const [isReferModalOpen, setIsReferModalOpen] = useState(false);

  const [referToCompany, setReferToCompany] = useState<PartnerCompany | null>(null);
  const [isReferToCompanyModalOpen, setIsReferToCompanyModalOpen] = useState(false);

  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);

  // Fetch metrics & companies
  const loadMeta = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const [m, comps] = await Promise.all([
        getReferralMetrics(),
        getPartnerCompanies(),
      ]);
      setMetrics(m);
      setCompanies(comps);
    } catch (err) {
      console.error('Failed to load referral meta:', err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Fetch referrals list
  const loadReferrals = useCallback(async () => {
    try {
      setTableLoading(true);
      const res = await getReferrals({
        page,
        limit: 15,
        search: debouncedSearch,
        status: statusFilter,
        company_id: companyFilter ? Number(companyFilter) : undefined,
      });
      setReferrals(res.referrals);
      setTotalReferrals(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch referrals:', err);
    } finally {
      setTableLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, companyFilter]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (activeTab === 'referred') {
      void loadReferrals();
    }
  }, [activeTab, loadReferrals]);

  const handleSelectReferral = async (referral: CandidateReferral) => {
    try {
      const full = await getReferralById(referral.id);
      setSelectedReferral(full);
    } catch {
      setSelectedReferral(referral);
    }
  };

  const handleStatusUpdated = (updated: CandidateReferral) => {
    setSelectedReferral(updated);
    void loadReferrals();
    void loadMeta();
  };

  const handleReferCandidate = (candidate: CandidateToRefer) => {
    setReferModalCandidate(candidate);
    setIsReferModalOpen(true);
  };

  const handleReferralSuccess = () => {
    void loadReferrals();
    void loadMeta();
  };

  return (
    <div className="hf-page-container p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
              <Share2 size={20} />
            </span>
            Candidate Referrals & Partner Sharing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Refer qualified candidates to partner companies, track round progression, and manage external hiring pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              void loadMeta();
              if (activeTab === 'referred') void loadReferrals();
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={15} />
          </button>
          {activeTab === 'companies' ? (
            <button
              onClick={() => setIsAddCompanyModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={15} /> Add Partner Company
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('available')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={15} /> Refer a Candidate
            </button>
          )}
        </div>
      </div>

      {/* Metrics Counters Bar */}
      <ReferralsMetricsBar metrics={metrics} loading={metricsLoading} />

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('referred')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'referred'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Share2 size={14} />
          Referred Candidates
          {totalReferrals > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'referred'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              }`}
            >
              {totalReferrals}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('available')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'available'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Users size={14} />
          Available Candidates to Refer
        </button>

        <button
          onClick={() => setActiveTab('companies')}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'companies'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Building2 size={14} />
          Partner Companies
          {companies.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'companies'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
              }`}
            >
              {companies.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'referred' ? (
        <ReferredCandidatesTable
          referrals={referrals}
          total={totalReferrals}
          page={page}
          totalPages={totalPages}
          loading={tableLoading}
          search={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          statusFilter={statusFilter}
          onStatusFilterChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
          companyFilter={companyFilter}
          onCompanyFilterChange={(val) => {
            setCompanyFilter(val);
            setPage(1);
          }}
          companies={companies}
          onPageChange={setPage}
          onSelectReferral={handleSelectReferral}
          onOpenCandidateDrawer={onOpenCandidateDrawer}
        />
      ) : activeTab === 'available' ? (
        <AvailableCandidatesTab
          onReferCandidate={handleReferCandidate}
          onOpenCandidateDrawer={onOpenCandidateDrawer}
        />
      ) : (
        <PartnerCompaniesTab
          companies={companies}
          loading={metricsLoading}
          onReferToCompany={(comp) => {
            setReferToCompany(comp);
            setIsReferToCompanyModalOpen(true);
          }}
          onAddCompany={() => setIsAddCompanyModalOpen(true)}
        />
      )}

      {/* Referral Details Drawer */}
      <ReferralDetailsDrawer
        referral={selectedReferral}
        onClose={() => setSelectedReferral(null)}
        onStatusUpdated={handleStatusUpdated}
        onOpenCandidateDrawer={onOpenCandidateDrawer}
      />

      {/* Refer Candidate Modal (Candidate-first) */}
      <ReferCandidateModal
        isOpen={isReferModalOpen}
        onClose={() => {
          setIsReferModalOpen(false);
          setReferModalCandidate(null);
        }}
        candidate={referModalCandidate}
        onSuccess={handleReferralSuccess}
      />

      {/* Refer to Company Modal (Company-first with Searchable Candidate Selector) */}
      <ReferToCompanyModal
        isOpen={isReferToCompanyModalOpen}
        onClose={() => {
          setIsReferToCompanyModalOpen(false);
          setReferToCompany(null);
        }}
        company={referToCompany}
        onSuccess={handleReferralSuccess}
      />

      {/* Add Partner Company Modal */}
      <AddPartnerCompanyModal
        isOpen={isAddCompanyModalOpen}
        onClose={() => setIsAddCompanyModalOpen(false)}
        onSuccess={() => void loadMeta()}
      />
    </div>
  );
};
