import * as statsRepo from '../repositories/stats.repo.js';
function asNumber(value) {
    return Number.parseFloat(value ?? '0') || 0;
}
export function buildTimeline(rawPoints, days) {
    const dailyMap = new Map();
    // Initialize map with all dates in the past N days
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dailyMap.set(key, { received: 0, shortlisted: 0 });
    }
    // Populate data points from DB
    for (const point of rawPoints) {
        if (dailyMap.has(point.date)) {
            dailyMap.set(point.date, {
                received: Number(point.received) || 0,
                shortlisted: Number(point.shortlisted) || 0,
            });
        }
    }
    return Array.from(dailyMap.entries()).map(([date, vals]) => ({
        date,
        received: vals.received,
        shortlisted: vals.shortlisted,
    }));
}
export async function getStats() {
    const [summary, positions, rawDailyAcq] = await Promise.all([
        statsRepo.fetchStatsSummary(),
        statsRepo.fetchTopPositions(),
        statsRepo.fetchDailyAcquisition(90),
    ]);
    const dailyAcquisition = buildTimeline(rawDailyAcq, 90);
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
        candidatesToday: asNumber(summary.candidates_today),
        candidatesYesterday: asNumber(summary.candidates_yesterday),
        candidatesLast7Days: asNumber(summary.candidates_last_7_days),
        candidatesLast30Days: asNumber(summary.candidates_last_30_days),
        dailyAcquisition,
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
//# sourceMappingURL=stats.service.js.map