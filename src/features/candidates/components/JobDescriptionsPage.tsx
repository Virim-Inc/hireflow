import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Briefcase, MapPin, Users } from 'lucide-react';
import type { JobDescription } from '../types/candidate.types';
import { fetchJds, deleteJd, toggleJdActive } from '../services/candidateService';
import { JdModalForm } from './JdModalForm';

export function JobDescriptionsPage() {
  const [jds, setJds] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJd, setSelectedJd] = useState<JobDescription | null>(null);

  const loadJds = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJds();
      setJds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve Job Descriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJds();
  }, []);

  const handleToggleActive = async (jd: JobDescription) => {
    const nextState = !jd.is_active;
    try {
      // Optimistic update
      setJds(prev => prev.map(j => j.id === jd.id ? { ...j, is_active: nextState } : j));
      await toggleJdActive(jd.id, nextState);
    } catch {
      // Revert state
      setJds(prev => prev.map(j => j.id === jd.id ? { ...j, is_active: jd.is_active } : j));
    }
  };

  const handleDeleteJd = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this Job Description template? All candidate matches will be deleted.')) {
      return;
    }
    try {
      await deleteJd(id);
      setJds(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete Job Description');
    }
  };

  const handleSaved = (savedJd: JobDescription) => {
    // If updating, replace. If creating, insert at top.
    setJds(prev => {
      const idx = prev.findIndex(j => j.id === savedJd.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = savedJd;
        return next;
      }
      return [savedJd, ...prev];
    });
  };

  // Filtered JDs list
  const filteredJds = useMemo(() => {
    return jds.filter(jd => {
      const matchesSearch = 
        jd.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (jd.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (jd.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'active' && jd.is_active) ||
        (statusFilter === 'inactive' && !jd.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [jds, searchTerm, statusFilter]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const total = jds.length;
    const active = jds.filter(j => j.is_active).length;
    const inactive = total - active;
    const openings = jds.reduce((sum, j) => sum + (j.openings || 0), 0);
    return { total, active, inactive, openings };
  }, [jds]);

  return (
    <div className="hf-page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div className="hf-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--hf-text-primary)' }}>Job Descriptions</h1>
          <p style={{ color: 'var(--hf-text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Manage recruitment role templates, preferred requirements, and custom AI evaluation guidelines.
          </p>
        </div>
        <button
          className="hf-primary-btn"
          onClick={() => {
            setSelectedJd(null);
            setIsModalOpen(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          Create Job Description
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="hf-metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <article className="glass-card hf-metric-card" style={{ padding: '16px' }}>
          <span style={{ color: 'var(--hf-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Total Templates</span>
          <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '6px' }}>{metrics.total}</strong>
        </article>
        <article className="glass-card hf-metric-card" style={{ padding: '16px' }}>
          <span style={{ color: 'var(--hf-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Active Templates</span>
          <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '6px', color: 'var(--hf-success)' }}>{metrics.active}</strong>
        </article>
        <article className="glass-card hf-metric-card" style={{ padding: '16px' }}>
          <span style={{ color: 'var(--hf-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Inactive Templates</span>
          <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '6px', color: 'var(--hf-text-muted)' }}>{metrics.inactive}</strong>
        </article>
        <article className="glass-card hf-metric-card" style={{ padding: '16px' }}>
          <span style={{ color: 'var(--hf-text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '600' }}>Total Openings</span>
          <strong style={{ fontSize: '1.5rem', display: 'block', marginTop: '6px', color: 'var(--hf-primary)' }}>{metrics.openings}</strong>
        </article>
      </div>

      {/* Search and Filters panel */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="hf-search-box" style={{ flex: '1', minWidth: '280px' }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by title, department, or location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--hf-text-primary)' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setStatusFilter('all')}
            className={`hf-ghost-btn ${statusFilter === 'all' ? 'active' : ''}`}
            style={{ minWidth: '80px', padding: '6px 12px' }}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`hf-ghost-btn ${statusFilter === 'active' ? 'active' : ''}`}
            style={{ minWidth: '80px', padding: '6px 12px' }}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`hf-ghost-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
            style={{ minWidth: '80px', padding: '6px 12px' }}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* JDs List Table */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--hf-text-secondary)' }}>
          Loading Job Descriptions...
        </div>
      ) : error ? (
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--hf-danger)' }}>
          {error}
        </div>
      ) : filteredJds.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--hf-text-secondary)' }}>
          <Briefcase size={40} style={{ margin: '0 auto 12px auto', opacity: '0.5' }} />
          <p>No job descriptions found. Try adjustments to your filters or create a new template.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflowX: 'auto', padding: '0px' }}>
          <table className="hf-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hf-border)', textTransform: 'uppercase', fontSize: '0.675rem', letterSpacing: '0.05em', color: 'var(--hf-text-secondary)' }}>
                <th style={{ padding: '16px 24px' }}>Job Title</th>
                <th style={{ padding: '16px 16px' }}>Department</th>
                <th style={{ padding: '16px 16px' }}>Openings</th>
                <th style={{ padding: '16px 16px' }}>Type / Mode</th>
                <th style={{ padding: '16px 16px' }}>Location</th>
                <th style={{ padding: '16px 16px', textAlign: 'center' }}>Scored Candidates</th>
                <th style={{ padding: '16px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJds.map(jd => (
                <tr key={jd.id} style={{ borderBottom: '1px solid var(--hf-border)', fontSize: '0.875rem' }} className="hf-table-row">
                  {/* Job Title */}
                  <td style={{ padding: '16px 24px', fontWeight: '600' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: 'var(--hf-text-primary)' }}>{jd.title}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--hf-text-secondary)', fontWeight: '400' }}>
                        Exp: {jd.experience_min} - {jd.experience_max} yrs
                      </span>
                    </div>
                  </td>
                  
                  {/* Department */}
                  <td style={{ padding: '16px 16px', color: 'var(--hf-text-primary)' }}>
                    {jd.department || '-'}
                  </td>

                  {/* Openings */}
                  <td style={{ padding: '16px 16px', fontWeight: '500', color: 'var(--hf-text-primary)' }}>
                    {jd.openings}
                  </td>

                  {/* Employment Type & Mode */}
                  <td style={{ padding: '16px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: 'var(--hf-text-primary)' }}>{jd.employment_type || '-'}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--hf-text-secondary)' }}>{jd.work_mode || '-'}</span>
                    </div>
                  </td>

                  {/* Location */}
                  <td style={{ padding: '16px 16px', color: 'var(--hf-text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={12} />
                      <span>{jd.location || '-'}</span>
                    </div>
                  </td>

                  {/* Matched Count */}
                  <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '4px', background: 'color-mix(in oklab, var(--hf-primary) 8%, transparent)', color: 'var(--hf-primary)', fontSize: '0.75rem', fontWeight: '600' }}>
                      <Users size={12} />
                      <span>{jd.matched_count || 0}</span>
                    </div>
                  </td>

                  {/* Active Toggle */}
                  <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                    <label className="hf-switch" style={{ display: 'inline-flex', cursor: 'pointer', position: 'relative' }}>
                      <input
                        type="checkbox"
                        checked={jd.is_active}
                        onChange={() => handleToggleActive(jd)}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span className={`hf-switch-slider ${jd.is_active ? 'hf-switch-slider--active' : ''}`} />
                    </label>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="hf-ghost-btn"
                        style={{ padding: '6px' }}
                        onClick={() => {
                          setSelectedJd(jd);
                          setIsModalOpen(true);
                        }}
                        title="Edit JD"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="hf-ghost-btn"
                        style={{ padding: '6px', color: 'var(--hf-danger)' }}
                        onClick={() => handleDeleteJd(jd.id)}
                        title="Delete JD"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Form Modal */}
      <JdModalForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedJd(null);
        }}
        onSaved={handleSaved}
        initialJd={selectedJd}
      />
    </div>
  );
}
