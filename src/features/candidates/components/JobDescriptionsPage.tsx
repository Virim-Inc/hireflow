import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Briefcase, MapPin, Users, Eye, X } from 'lucide-react';
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
  const [viewingJd, setViewingJd] = useState<JobDescription | null>(null);

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
            onChange={e => setSearchTerm(e.target.value.slice(0, 150))}
            maxLength={150}
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
                        onClick={() => setViewingJd(jd)}
                        title="View JD"
                      >
                        <Eye size={14} />
                      </button>
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

      {/* View JD Details Modal */}
      {viewingJd && (
        <div className="hf-modal-overlay" onClick={() => setViewingJd(null)}>
          <div 
            className="hf-modal-container glass-card" 
            onClick={e => e.stopPropagation()}
            style={{ 
              maxWidth: '750px', 
              width: '95%', 
              padding: '24px', 
              maxHeight: '90vh', 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              gap: 0
            }}
          >
            <div 
              className="hf-modal-header" 
              style={{ 
                borderBottom: '1px solid var(--hf-border)', 
                paddingBottom: '16px', 
                marginBottom: '20px',
                flexShrink: 0
              }}
            >
              <div>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--hf-text-muted, #94a3b8)' }}>Job Description Details</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '700', margin: '4px 0 0 0', color: 'var(--hf-text-primary)' }}>{viewingJd.title}</h3>
              </div>
              <button 
                className="hf-modal-close" 
                onClick={() => setViewingJd(null)} 
                aria-label="Close modal"
                style={{ background: 'transparent', border: 'none', color: 'var(--hf-text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px', 
                flex: 1, 
                overflowY: 'auto', 
                paddingRight: '8px',
                paddingBottom: '12px',
                fontSize: '13px',
                color: 'var(--hf-text-secondary)'
              }}
            >
              {/* JD Specs Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--hf-border)'
              }}>
                <div>
                  <span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Department</span>
                  <strong>{viewingJd.department || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Location & Mode</span>
                  <strong>{viewingJd.location || '—'} ({viewingJd.work_mode || '—'})</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Employment Type</span>
                  <strong>{viewingJd.employment_type || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Experience Range</span>
                  <strong>{viewingJd.experience_min} - {viewingJd.experience_max} years</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Openings</span>
                  <strong>{viewingJd.openings || '—'} position(s)</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--hf-text-muted, #94a3b8)', display: 'block', fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Target Education</span>
                  <strong>{viewingJd.education || '—'} {viewingJd.specialization ? `(${viewingJd.specialization})` : ''}</strong>
                </div>
              </div>

              {/* Skills Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <strong style={{ color: 'var(--hf-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Required Skills</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(Array.isArray(viewingJd.required_skills) ? viewingJd.required_skills : []).length ? (
                      (viewingJd.required_skills as string[]).map(skill => (
                        <span key={skill} className="hf-skill-chip" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--hf-primary)' }}>{skill}</span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--hf-text-muted)', fontSize: '12px' }}>No required skills entered</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <strong style={{ color: 'var(--hf-text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Preferred Skills</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(Array.isArray(viewingJd.preferred_skills) ? viewingJd.preferred_skills : []).length ? (
                      (viewingJd.preferred_skills as string[]).map(skill => (
                        <span key={skill} className="hf-skill-chip" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--hf-border)' }}>{skill}</span>
                      ))
                    ) : (
                      <span style={{ color: 'var(--hf-text-muted)', fontSize: '12px' }}>No preferred skills entered</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detailed Descriptions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {viewingJd.requirements && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={{ color: 'var(--hf-text-muted)', textTransform: 'uppercase', fontSize: '12px' }}>Key Requirements</strong>
                    <p style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontSize: '13px',
                      lineHeight: '1.7',
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--hf-border)'
                    }}>{viewingJd.requirements}</p>
                  </div>
                )}

                {viewingJd.responsibilities && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={{ color: 'var(--hf-text-muted)', textTransform: 'uppercase', fontSize: '12px' }}>Key Responsibilities</strong>
                    <p style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontSize: '13px',
                      lineHeight: '1.7',
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--hf-border)'
                    }}>{viewingJd.responsibilities}</p>
                  </div>
                )}

                {viewingJd.nice_to_have && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={{ color: 'var(--hf-text-muted)', textTransform: 'uppercase', fontSize: '12px' }}>Nice To Have</strong>
                    <p style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontSize: '13px',
                      lineHeight: '1.7',
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--hf-border)'
                    }}>{viewingJd.nice_to_have}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div 
              style={{ 
                borderTop: '1px solid var(--hf-border)', 
                paddingTop: '16px', 
                marginTop: '20px',
                display: 'flex',
                justifyContent: 'flex-end',
                flexShrink: 0
              }}
            >
              <button 
                type="button" 
                className="hf-primary-btn" 
                onClick={() => setViewingJd(null)}
                style={{ padding: '8px 20px', borderRadius: '8px' }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
