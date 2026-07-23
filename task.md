# Task List: Multi-JD Clean Implementation

## Database
- [x] Create migration `008_clean_candidates_schema.sql` — drop old scoring columns, truncate test data

## Workflow  
- [x] Rewrite `working 2_new.json` — streamlined pipeline, delete dead nodes, fix data flow

## Backend
- [x] Update `server/types/candidate.types.ts` — remove old score fields, add best_* computed fields
- [x] Update `server/repositories/candidate.repo.ts` — new SELECT_COLUMNS, best_score subqueries, filters
- [x] Update `server/repositories/stats.repo.ts` — use candidate_job_matches for scoring stats

## Frontend
- [x] Update `src/.../types/candidate.types.ts` — mirror server type changes
- [x] Update `src/.../CandidatesPage.tsx` — use best_* fields, pass jds to drawer
- [x] Update `src/.../CandidateDetailDrawer.tsx` — JD-centric score display
- [x] Update `src/.../PipelinePage.tsx` — Kanban card score alignment

## Verification
- [x] Run migration
- [x] TypeScript compilation check
- [x] Visual spot-check
