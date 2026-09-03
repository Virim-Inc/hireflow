import React, { useState } from 'react';
import { createFlowmingoInterviewSet } from '../services/flowmingo.service';
import { Sparkles, X, AlertCircle, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';

interface QuestionItem {
  title: string;
  content: string;
  question_mode: string;
  question_type: string;
  priority: number;
}

interface RequirementItem {
  title: string;
  content: string;
  cfg_importance_id: number;
  priority: number;
}

interface CreateInterviewSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  jd?: {
    id: number;
    title: string;
    description?: string;
    requirements?: string[];
  } | null;
  onSuccess?: (createdSetId: string) => void;
}

export const CreateInterviewSetModal: React.FC<CreateInterviewSetModalProps> = ({
  isOpen,
  onClose,
  jd,
  onSuccess,
}) => {
  const [title, setTitle] = useState(jd ? `${jd.title} - AI Async Interview` : '');
  const [description] = useState(jd?.description || '');
  const [duration, setDuration] = useState(30);
  const [retakes, setRetakes] = useState(1);

  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      title: 'Technical & System Overview',
      content: `Walk us through your relevant experience and background for the ${jd?.title || 'position'}.`,
      question_mode: 'interview',
      question_type: 'text',
      priority: 1,
    },
    {
      title: 'Problem Solving Scenario',
      content: 'Describe a challenging technical problem you solved recently and your architectural approach.',
      question_mode: 'interview',
      question_type: 'text',
      priority: 2,
    },
  ]);

  const [requirements] = useState<RequirementItem[]>([
    {
      title: 'Core Technical Requirements',
      content: jd?.requirements?.join('; ') || 'Domain expertise and strong communication skills.',
      cfg_importance_id: 2, // 2 = Medium default
      priority: 1,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSetId, setCreatedSetId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        title: 'Custom Question',
        content: '',
        question_mode: 'interview',
        question_type: 'text',
        priority: prev.length + 1,
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Interview set title is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await createFlowmingoInterviewSet({
        jd_id: jd?.id,
        title: title.trim(),
        description,
        interview_duration: Number(duration),
        number_of_retakes: Number(retakes),
        iai_questions: questions.map((q, idx) => ({ ...q, priority: idx + 1 })),
        iai_requirements: requirements.map((r, idx) => ({ ...r, priority: idx + 1 })),
      });

      const setId = res.id;
      setCreatedSetId(setId);

      setTimeout(() => {
        if (onSuccess) onSuccess(setId);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to provision Flowmingo Interview Set.');
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
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: 'var(--hf-card-bg, #ffffff)',
          border: '1px solid var(--hf-border, rgba(0,0,0,0.12))',
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
          overflowY: 'auto',
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
            background: 'var(--hf-surface-2, rgba(168, 85, 247, 0.06))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--hf-text-primary, #111827)' }}>
                Create Flowmingo Interview Set
              </h3>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--hf-text-secondary, #64748B)' }}>
                {jd ? `Derived from JD: ${jd.title}` : 'Provision AI Interview Set'}
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

        {/* Body */}
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

          {createdSetId && (
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
              <span>Created Flowmingo Set ID: <code>{createdSetId}</code></span>
            </div>
          )}

          {/* Set Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--hf-text-primary, #111827)', marginBottom: '0.375rem' }}>
              Interview Set Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer - Async Interview"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '10px',
                border: '1px solid var(--hf-border, rgba(0,0,0,0.15))',
                backgroundColor: 'var(--hf-surface-2, rgba(0,0,0,0.03))',
                color: 'var(--hf-text-primary, #111827)',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Duration & Retakes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--hf-text-primary, #111827)', marginBottom: '0.375rem' }}>
                Interview Duration (mins)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '10px',
                  border: '1px solid var(--hf-border, rgba(0,0,0,0.15))',
                  backgroundColor: 'var(--hf-surface-2, rgba(0,0,0,0.03))',
                  color: 'var(--hf-text-primary, #111827)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--hf-text-primary, #111827)', marginBottom: '0.375rem' }}>
                Allowed Retakes
              </label>
              <input
                type="number"
                min={0}
                max={5}
                value={retakes}
                onChange={(e) => setRetakes(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '10px',
                  border: '1px solid var(--hf-border, rgba(0,0,0,0.15))',
                  backgroundColor: 'var(--hf-surface-2, rgba(0,0,0,0.03))',
                  color: 'var(--hf-text-primary, #111827)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Questions Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--hf-text-primary, #111827)' }}>
                Interview Questions ({questions.length})
              </label>
              <button
                type="button"
                onClick={handleAddQuestion}
                style={{
                  background: 'none',
                  border: '1px solid var(--hf-border, rgba(0,0,0,0.15))',
                  borderRadius: '6px',
                  color: 'var(--hf-accent, #8b5cf6)',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Plus size={14} /> Add Question
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '10px',
                    backgroundColor: 'var(--hf-surface-2, rgba(0,0,0,0.03))',
                    border: '1px solid var(--hf-border, rgba(0,0,0,0.08))',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <input
                      type="text"
                      value={q.title}
                      onChange={(e) => {
                        const updated = [...questions];
                        updated[idx].title = e.target.value;
                        setQuestions(updated);
                      }}
                      placeholder="Question Title"
                      style={{
                        fontWeight: 600,
                        fontSize: '0.825rem',
                        background: 'none',
                        border: 'none',
                        color: 'var(--hf-text-primary, #111827)',
                        outline: 'none',
                        width: '80%',
                      }}
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={q.content}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[idx].content = e.target.value;
                      setQuestions(updated);
                    }}
                    placeholder="Question prompt content..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      border: '1px solid var(--hf-border, rgba(0,0,0,0.1))',
                      backgroundColor: 'var(--hf-card-bg, #ffffff)',
                      color: 'var(--hf-text-primary, #111827)',
                      fontSize: '0.8rem',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
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
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Provisioning...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Provision Set</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
