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
function getUtcDateStringsRange(startOffset, endOffset) {
    const dates = new Set();
    for (let i = startOffset; i >= endOffset; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        dates.add(d.toISOString().split('T')[0]);
    }
    return dates;
}
function aggregateStatsForDates(dates, data, pendingReviewBacklog) {
    let received = 0;
    let shortlisted = 0;
    let rejected = 0;
    let interviewsScheduled = 0;
    let interviewsCompleted = 0;
    for (const row of data.received) {
        if (dates.has(row.date)) {
            received += row.count;
        }
    }
    for (const row of data.transitions) {
        if (dates.has(row.date)) {
            const from = row.from_stage;
            const to = row.to_stage;
            const cnt = row.count;
            if (to === 'shortlisted') {
                shortlisted += cnt;
            }
            if (to === 'rejected') {
                rejected += cnt;
            }
            if (to === 'ai_interview' || to === 'in_person_interview') {
                interviewsScheduled += cnt;
            }
            if ((from === 'ai_interview' || from === 'in_person_interview') &&
                to !== 'ai_interview' &&
                to !== 'in_person_interview') {
                interviewsCompleted += cnt;
            }
        }
    }
    return {
        received,
        shortlisted,
        rejected,
        pendingReview: pendingReviewBacklog,
        interviewsScheduled,
        interviewsCompleted,
    };
}
export async function getStats() {
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - 29);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    endDate.setUTCHours(0, 0, 0, 0);
    const [summary, positions, rawDailyAcq, groupedActivity] = await Promise.all([
        statsRepo.fetchStatsSummary(),
        statsRepo.fetchTopPositions(),
        statsRepo.fetchDailyAcquisition(90),
        statsRepo.fetchRecruitmentActivityGrouped(startDate, endDate),
    ]);
    const dailyAcquisition = buildTimeline(rawDailyAcq, 90);
    const pendingReviewBacklog = asNumber(summary.stage_screening);
    const todayDates = getUtcDateStringsRange(0, 0);
    const yesterdayDates = getUtcDateStringsRange(1, 1);
    const last7DaysDates = getUtcDateStringsRange(6, 0);
    const last30DaysDates = getUtcDateStringsRange(29, 0);
    const dailyRecruitmentStats = {
        today: aggregateStatsForDates(todayDates, groupedActivity, pendingReviewBacklog),
        yesterday: aggregateStatsForDates(yesterdayDates, groupedActivity, pendingReviewBacklog),
        last7Days: aggregateStatsForDates(last7DaysDates, groupedActivity, pendingReviewBacklog),
        last30Days: aggregateStatsForDates(last30DaysDates, groupedActivity, pendingReviewBacklog),
    };
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
        dailyRecruitmentStats,
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
            screening: pendingReviewBacklog,
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