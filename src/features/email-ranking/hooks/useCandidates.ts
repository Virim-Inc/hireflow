import { useState, useEffect, useCallback } from 'react';
import type { Candidate, CandidateFilters, EmailStats } from '../types/candidate.types';
import { emailRankingService } from '../services/emailRankingService';

export function useCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CandidateFilters>({
    status: 'all',
    minScore: 0,
    sortBy: 'rank',
    sortOrder: 'asc',
    search: '',
  });

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        emailRankingService.getCandidates(),
        emailRankingService.getStats(),
      ]);
      setCandidates(data);
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  useEffect(() => {
    let result = [...candidates];

    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter(c => c.status === filters.status);
    }
    // Filter by score
    if (filters.minScore > 0) {
      result = result.filter(c => c.totalScore >= filters.minScore);
    }
    // Filter by search (name, email, title, company)
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(c =>
        c.candidateName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.currentJobTitle.toLowerCase().includes(q) ||
        c.jdCompany.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q)
      );
    }
    // Sort
    result.sort((a, b) => {
      let val = 0;
      if (filters.sortBy === 'rank') val = a.rank - b.rank;
      else if (filters.sortBy === 'score') val = b.totalScore - a.totalScore;
      else if (filters.sortBy === 'name') val = a.candidateName.localeCompare(b.candidateName);
      else if (filters.sortBy === 'date') val = new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      return filters.sortOrder === 'asc' ? val : -val;
    });

    setFilteredCandidates(result);
  }, [candidates, filters]);

  const updateCandidateStatus = useCallback((id: string, status: Candidate['status']) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }, []);

  return {
    candidates: filteredCandidates,
    allCandidates: candidates,
    stats,
    loading,
    filters,
    setFilters,
    refetch: fetchCandidates,
    updateCandidateStatus,
  };
}
