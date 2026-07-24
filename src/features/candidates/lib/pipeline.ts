import type { PipelineStage } from '../types/candidate.types';

export const STAGE_META: Array<{
  id: PipelineStage;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  { id: 'screening', label: 'Screening', shortLabel: 'Screening', description: 'New applicants under review' },
  { id: 'shortlisted', label: 'Shortlisted', shortLabel: 'Shortlist', description: 'Strong resumes for HR review' },
  { id: 'ai_interview', label: 'AI Interview', shortLabel: 'AI', description: 'Move into AI-led interview flow' },
  { id: 'in_person_interview', label: 'In-Person Interview', shortLabel: 'In Person', description: 'Final live interview stage' },
  { id: 'hired', label: 'Hired', shortLabel: 'Hired', description: 'Offer accepted and confirmed' },
  { id: 'rejected', label: 'Rejected', shortLabel: 'Rejected', description: 'Closed out for this role' },
];

export function getStageLabel(stage: PipelineStage): string {
  return STAGE_META.find((item) => item.id === stage)?.label ?? stage;
}

export function getStageDescription(stage: PipelineStage): string {
  return STAGE_META.find((item) => item.id === stage)?.description ?? '';
}

export function initials(name: string): string {
  return (name || '??')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function scoreClass(score: number): string {
  if (score > 60) return 'hf-score-pill--high';
  if (score >= 30) return 'hf-score-pill--mid';
  return 'hf-score-pill--low';
}

export function recommendationClass(recommendation: string | null | undefined): string {
  const value = (recommendation ?? '').toLowerCase();
  if (value.includes('strong')) return 'hf-rec--strong';
  if (value.includes('hire')) return 'hf-rec--hire';
  if (value.includes('consider')) return 'hf-rec--consider';
  return 'hf-rec--reject';
}

export function sourceClass(source: string | null | undefined): string {
  const val = (source ?? '').toLowerCase();
  if (val.includes('email')) return 'hf-source--email';
  if (val.includes('workdrive')) return 'hf-source--workdrive';
  return 'hf-source--form';
}

export function splitValues(raw: string, max?: number): string[] {
  if (!raw || raw === 'N/A') return [];

  const values = raw
    .replace(/^\[|\]$/g, '')
    .split(/[,|]/)
    .map((part) => part.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);

  return typeof max === 'number' ? values.slice(0, max) : values;
}

export function formatDate(value: string): string {
  if (!value) return '-';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDateTime(value: string): string {
  if (!value) return '-';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
