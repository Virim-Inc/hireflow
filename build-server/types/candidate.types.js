// ─────────────────────────────────────────────────────────────────────────────
// Shared server-side types
// These are the single source of truth for all layers (repo, service, route).
// ─────────────────────────────────────────────────────────────────────────────
export const PIPELINE_STAGES = [
    'screening',
    'shortlisted',
    'ai_interview',
    'in_person_interview',
    'hired',
    'rejected',
];
export function isPipelineStage(value) {
    return Boolean(value && PIPELINE_STAGES.includes(value));
}
//# sourceMappingURL=candidate.types.js.map