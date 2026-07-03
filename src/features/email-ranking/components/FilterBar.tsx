import type { CandidateFilters } from '../types/candidate.types';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

interface FilterBarProps {
  filters: CandidateFilters;
  onChange: (f: Partial<CandidateFilters>) => void;
  total: number;
  filtered: number;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Candidates' },
  { value: 'replied', label: 'Replied' },
  { value: 'pending', label: 'Pending' },
  { value: 'review', label: 'In Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Rejected' },
];

const SORT_OPTIONS = [
  { value: 'rank', label: 'Rank' },
  { value: 'score', label: 'Score' },
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name' },
];

export function FilterBar({ filters, onChange, total, filtered }: FilterBarProps) {
  return (
    <div className="er-filter-bar">
      {/* Search */}
      <div className="er-search-wrap">
        <Search size={16} className="er-search-icon" />
        <input
          type="search"
          placeholder="Search candidates…"
          value={filters.search}
          onChange={e => onChange({ search: e.target.value })}
          className="er-search-input"
          id="er-search"
        />
      </div>

      {/* Status chips */}
      <div className="er-chips">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            id={`er-status-${opt.value}`}
            className={`er-chip ${filters.status === opt.value ? 'er-chip--active' : ''}`}
            onClick={() => onChange({ status: opt.value as CandidateFilters['status'] })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="er-sort-wrap">
        <ArrowUpDown size={14} className="er-sort-icon" />
        <select
          id="er-sort-by"
          value={filters.sortBy}
          onChange={e => onChange({ sortBy: e.target.value as CandidateFilters['sortBy'] })}
          className="er-select"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <SlidersHorizontal size={14} className="er-sort-icon" />
        <select
          id="er-sort-order"
          value={filters.sortOrder}
          onChange={e => onChange({ sortOrder: e.target.value as 'asc' | 'desc' })}
          className="er-select"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      {/* Count */}
      <span className="er-count">
        {filtered === total ? `${total} candidates` : `${filtered} of ${total}`}
      </span>
    </div>
  );
}
