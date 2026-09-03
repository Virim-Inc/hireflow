import React, { useState, useEffect } from 'react';
import {
  inviteCandidatesToFlowmingo,
  getFlowmingoInterviewSets,
  type FlowmingoInterviewSetOption,
} from '../services/flowmingo.service';
import { Send, X, AlertCircle, CheckCircle2, Loader2, Link2, Layers, ChevronDown } from 'lucide-react';

interface CandidateTarget {
  id: number;
  name?: string;
  email: string;
  resume_url?: string;
  cv_link?: string;
}

interface InviteCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: CandidateTarget[];
  defaultInterviewSetId?: string;
  jobDescriptionId?: number;
  onSuccess?: () => void;
}

export const InviteCandidateModal: React.FC<InviteCandidateModalProps> = ({
  isOpen,
  onClose,
  candidates,
  defaultInterviewSetId = '',
  jobDescriptionId,
  onSuccess,
}) => {
  const [setId, setSetId] = useState(defaultInterviewSetId);
  const [availableSets, setAvailableSets] = useState<FlowmingoInterviewSetOption[]>([]);
  const [fetchingSets, setFetchingSets] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);

  const getInitialPrompt = (cands: CandidateTarget[]) => {
    if (cands.length === 1 && cands[0]?.name) {
      const firstName = cands[0].name.trim().split(/\s+/)[0];
      return `Hi ${firstName}, please complete your async AI interview assessment using Flowmingo in the next 48 hours.`;
    }
    return 'Hi {{name}}, please complete your async AI interview assessment using Flowmingo in the next 48 hours.';
  };

  const [message, setMessage] = useState(getInitialPrompt(candidates));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMessage(getInitialPrompt(candidates));
    }
  }, [isOpen, candidates]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadSets = async () => {
      try {
        setFetchingSets(true);
        const sets = await getFlowmingoInterviewSets();
        if (!isMounted) return;

        setAvailableSets(sets);

        // Determine default selection
        if (defaultInterviewSetId) {
          const match = sets.find((s) => s.id === defaultInterviewSetId);
          if (match) {
            setSetId(match.id);
            setIsCustomMode(false);
          } else {
            setSetId(defaultInterviewSetId);
            setIsCustomMode(true);
          }
        } else if (jobDescriptionId) {
          const match = sets.find((s) => s.job_description_id === Number(jobDescriptionId));
          if (match) {
            setSetId(match.id);
            setIsCustomMode(false);
          } else if (sets.length > 0) {
            setSetId(sets[0].id);
            setIsCustomMode(false);
          }
        } else if (sets.length > 0) {
          setSetId(sets[0].id);
          setIsCustomMode(false);
        } else {
          setIsCustomMode(true);
        }
      } catch (err) {
        console.warn('Could not fetch live Flowmingo interview sets:', err);
        if (isMounted) {
          setIsCustomMode(true);
        }
      } finally {
        if (isMounted) setFetchingSets(false);
      }
    };

    void loadSets();

    return () => {
      isMounted = false;
    };
  }, [isOpen, defaultInterviewSetId, jobDescriptionId]);

  if (!isOpen) return null;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__CUSTOM__') {
      setIsCustomMode(true);
      setSetId('');
    } else {
      setIsCustomMode(false);
      setSetId(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setId.trim()) {
      setError('Flowmingo Interview Set is required. Please select a set or enter a valid UUID.');
      return;
    }

    if (candidates.length === 0) {
      setError('No candidates selected for invitation.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      let finalMessage = message.trim();
      if (candidates.length === 1 && candidates[0]?.name) {
        const firstName = candidates[0].name.trim().split(/\s+/)[0];
        finalMessage = finalMessage
          .replace(/\{\{\s*name\s*\}\}/gi, firstName)
          .replace(/\{\{\s*firstname\s*\}\}/gi, firstName)
          .replace(/\{\{\s*candidate_name\s*\}\}/gi, candidates[0].name.trim());
      }

      await inviteCandidatesToFlowmingo({
        com_interview_set_id: setId.trim(),
        job_description_id: jobDescriptionId,
        candidates,
        invitation_message: finalMessage,
      });

      setSuccessMsg(
        `Successfully dispatched Flowmingo ${candidates.length === 1 ? 'invitation' : 'invitations'} to ${candidates.length} candidate(s)!`,
      );

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch Flowmingo invitations.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--hf-card-bg, #ffffff)',
          border: '1px solid var(--hf-border, rgba(0,0,0,0.12))',
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          color: 'var(--hf-text-primary, #111827)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--hf-border, rgba(0,0,0,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--hf-surface-2, rgba(99, 102, 241, 0.06))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Send size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--hf-text-primary, #111827)' }}>
                Invite to Flowmingo AI Interview
              </h3>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--hf-text-secondary, #64748B)' }}>
                {candidates.length === 1 ? `Targeting: ${candidates[0].email}` : `Bulk target: ${candidates.length} candidates`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--hf-text-secondary, #64748B)',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                backgroundColor: 'var(--hf-danger-bg, rgba(239, 68, 68, 0.1))',
                border: '1px solid var(--hf-danger-border, rgba(239, 68, 68, 0.2))',
                color: 'var(--hf-danger, #dc2626)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                backgroundColor: 'var(--hf-success-bg, rgba(34, 197, 94, 0.1))',
                border: '1px solid var(--hf-success-border, rgba(34, 197, 94, 0.2))',
                color: 'var(--hf-success, #16a34a)',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Flowmingo Interview Set Selection Dropdown */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--hf-text-primary, #111827)' }}>
                Select Flowmingo Interview Set <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {fetchingSets && (
                <span style={{ fontSize: '0.75rem', color: 'var(--hf-accent, #6366f1)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Loader2 size={12} className="animate-spin" /> Loading sets from Flowmingo...
                </span>
              )}
            </div>

            {/* Select Dropdown */}
            <div style={{ position: 'relative', marginBottom: isCustomMode ? '0.625rem' : '0' }}>
              <select
                value={isCustomMode ? '__CUSTOM__' : setId}
                onChange={handleSelectChange}
                disabled={fetchingSets || loading}
                style={{
                  width: '100%',
                  padding: '0.625rem 2.25rem 0.625rem 2.25rem',
                  borderRadius: '10px',
                  border: '1px solid var(--hf-border, rgba(0,0,0,0.15))',
                  backgroundColor: 'var(--hf-surface-2, rgba(0,0,0,0.03))',
                  color: 'var(--hf-text-primary, #111827)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  appearance: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {availableSets.map((s) => (
                  <option key={s.id} value={s.id} style={{ background: 'var(--hf-card-bg, #ffffff)', color: 'var(--hf-text-primary, #111827)' }}>
                    {s.title} (ID: {s.id.slice(0, 8)}...)
                  </option>
                ))}
                <option value="__CUSTOM__" style={{ background: 'var(--hf-card-bg, #ffffff)', color: 'var(--hf-accent, #6366f1)', fontWeight: 600 }}>
                  + Enter Custom / External Set UUID
                </option>
              </select>
              <Layers
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--hf-accent, #6366f1)',
                  pointerEvents: 'none',
                }}
              />
              <ChevronDown
                size={16}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--hf-text-muted, #9ca3af)',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Custom UUID Input (Visible if + Enter Custom chosen) */}
            {isCustomMode && (
              <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  value={setId}
                  onChange={(e) => setSetId(e.target.value)}
                  placeholder="Paste Flowmingo Set UUID (e.g. 80a6e308-14e3-4287-b39d-bd1a2021411d)"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem 0.625rem 2.25rem',
                    borderRadius: '10px',
                    border: '1px solid var(--hf-border, rgba(0,0,0,0.15))',
                    backgroundColor: 'var(--hf-surface-2, rgba(0,0,0,0.03))',
                    color: 'var(--hf-text-primary, #111827)',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <Link2
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--hf-text-muted, #9ca3af)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Custom Invitation Message */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--hf-text-primary, #111827)', marginBottom: '0.375rem' }}>
              Invitation Message Prompt
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                border: '1px solid var(--hf-border, rgba(0,0,0,0.15))',
                backgroundColor: 'var(--hf-surface-2, rgba(0,0,0,0.03))',
                color: 'var(--hf-text-primary, #111827)',
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--hf-text-muted, #64748B)', marginTop: '0.25rem', display: 'block' }}>
              {candidates.length === 1 && candidates[0]?.name ? (
                <span>Personalized for <strong>{candidates[0].name.trim().split(/\s+/)[0]}</strong>. (You can also use <code>{"{{name}}"}</code>).</span>
              ) : (
                <span>Use <code>{"{{name}}"}</code> to dynamically personalize candidate names.</span>
              )}
            </span>
          </div>

          {/* Candidates Summary list */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              backgroundColor: 'var(--hf-surface-2, rgba(0,0,0,0.03))',
              border: '1px solid var(--hf-border, rgba(0,0,0,0.08))',
              fontSize: '0.825rem',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--hf-text-primary, #111827)', marginBottom: '0.375rem' }}>
              Recipient Candidate(s):
            </div>
            <div style={{ maxHeight: '90px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {candidates.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--hf-text-primary, #111827)' }}>
                  <span>{c.name || c.email}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--hf-text-secondary, #64748B)' }}>{c.email}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid var(--hf-border, rgba(0,0,0,0.15))',
                backgroundColor: 'var(--hf-surface-2, rgba(0,0,0,0.04))',
                color: 'var(--hf-text-primary, #111827)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Flowmingo Invite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
