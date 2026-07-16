import * as statsRepo from '../repositories/stats.repo.js';

function asNumber(value: string | null | undefined): number {
  return Number.parseFloat(value ?? '0') || 0;
}

export async function getStats(): Promise<Record<string, unknown>> {
  const [summary, positions] = await Promise.all([
    statsRepo.fetchStatsSummary(),
    statsRepo.fetchTopPositions(),
  ]);

  return {
    totalCandidates: asNumber(summary.total),
    qualifiedCandidates: asNumber(summary.qualified),
    qualifiedToday: asNumber(summary.qualified_today),
    qualifiedThisMonth: asNumber(summary.qualified_this_month),
    averageScore: asNumber(summary.avg_score),
    topScore: asNumber(summary.top_score),
    topScoreToday: asNumber(summary.top_score_today),
    topScoreThisMonth: asNumber(summary.top_score_this_month),
    openPipeline: asNumber(summary.open_pipeline),
    openToday: asNumber(summary.open_today),
    openThisMonth: asNumber(summary.open_this_month),
    activeToday: asNumber(summary.active_today),
    movedToday: asNumber(summary.moved_today),
    activeThisMonth: asNumber(summary.active_this_month),
    movedThisMonth: asNumber(summary.moved_this_month),
    activeThisWeek: asNumber(summary.active_this_week),
    movedThisWeek: asNumber(summary.moved_this_week),
    sourceBreakdown: {
      form: asNumber(summary.from_form),
      email: asNumber(summary.from_email),
    },
    recommendationBreakdown: {
      strongHire: asNumber(summary.strong_hire),
      hire: asNumber(summary.hire),
      consider: asNumber(summary.consider),
      reject: asNumber(summary.reject),
    },
    stageCounts: {
      screening: asNumber(summary.stage_screening),
      shortlisted: asNumber(summary.stage_shortlisted),
      ai_interview: asNumber(summary.stage_ai_interview),
      in_person_interview: asNumber(summary.stage_in_person_interview),
      hired: asNumber(summary.stage_hired),
      rejected: asNumber(summary.stage_rejected),
    },
    topPositions: positions.map((row) => ({
      position: row.position_label,
      count: asNumber(row.count),
    })),
  };
}
