import React, { useState } from 'react';
import { X, ExternalLink, Sparkles, Maximize2, Minimize2, Award } from 'lucide-react';

interface FlowmingoReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName?: string;
  evaluationScore?: number | null;
  submissionUrl?: string | null;
}

export const FlowmingoReportModal: React.FC<FlowmingoReportModalProps> = ({
  isOpen,
  onClose,
  candidateName = 'Candidate',
  evaluationScore,
  submissionUrl,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen || !submissionUrl) return null;

  const scoreNum = evaluationScore != null ? Number(evaluationScore) : null;
  const scoreColor =
    scoreNum != null
      ? scoreNum >= 7.0
        ? 'var(--hf-success, #059669)'
        : scoreNum >= 5.0
        ? 'var(--hf-warning, #d97706)'
        : 'var(--hf-danger, #dc2626)'
      : 'var(--hf-accent, #6366f1)';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '1.25rem',
        transition: 'all 0.25s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isFullscreen ? '100vw' : '1100px',
          height: isFullscreen ? '100vh' : '90vh',
          backgroundColor: 'var(--hf-card-bg, #ffffff)',
          border: isFullscreen ? 'none' : '1px solid var(--hf-border, rgba(0,0,0,0.15))',
          borderRadius: isFullscreen ? '0' : '18px',
          boxShadow: '0 32px 64px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: 'var(--hf-text-primary, #111827)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--hf-border, rgba(0,0,0,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--hf-surface-2, rgba(99, 102, 241, 0.06))',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--hf-text-primary, #111827)' }}>
                  Flowmingo AI Evaluation Report
                </h3>
                {scoreNum != null && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--hf-surface-3, rgba(0,0,0,0.04))',
                      border: `1px solid ${scoreColor}`,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: scoreColor,
                    }}
                  >
                    <Award size={13} />
                    {scoreNum.toFixed(1)} / 10
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--hf-text-secondary, #64748B)' }}>
                Candidate: <strong style={{ color: 'var(--hf-text-primary, #111827)' }}>{candidateName}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
              href={submissionUrl}
              target="_blank"
              rel="noreferrer"
              title="Open in new browser tab"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--hf-border, rgba(0,0,0,0.12))',
                backgroundColor: 'var(--hf-surface-2, rgba(0,0,0,0.04))',
                color: 'var(--hf-text-secondary, #64748B)',
                fontSize: '0.8rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={14} />
              Open Tab
            </a>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              style={{
                background: 'none',
                border: '1px solid var(--hf-border, rgba(0,0,0,0.12))',
                color: 'var(--hf-text-secondary, #64748B)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              title="Close Report"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--hf-text-secondary, #64748B)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Embedded Iframe Container */}
        <div style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#ffffff', position: 'relative' }}>
          <iframe
            src={submissionUrl}
            title="Flowmingo Evaluation Report"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
};
