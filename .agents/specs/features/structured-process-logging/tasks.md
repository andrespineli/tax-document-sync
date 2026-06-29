# Structured Process Logging Tasks

**Spec**: `.agents/specs/features/structured-process-logging/spec.md`
**Status**: Done

## Execution Plan

### T1: Add Logs Directory Settings

**What**: Persist and expose configurable logs directory.
**Where**: `db/migrations`, `src/settings`, `ipc.ts`, `preload.ts`, `views/src`.
**Requirement**: LOG-01, LOG-02

**Done when**:

- [x] `settings.log_directory` exists via migration.
- [x] Settings query returns an effective logs directory.
- [x] Configuracoes lets users choose and save the logs directory.

### T2: Add Structured File Logger

**What**: Implement JSON Lines daily file logger with redaction.
**Where**: `src/shared/logger`, root composition helpers, tests.
**Requirement**: LOG-01, LOG-02

**Done when**:

- [x] Logger writes `tax-document-sync-YYYY-MM-DD.jsonl`.
- [x] Entries contain timestamp, level, event and context.
- [x] Sensitive fields are redacted.

### T3: Instrument Fiscal Sync

**What**: Add log events for scheduler and fiscal document sync workflow.
**Where**: `sync-scheduler.ts`, `src/tax-document/application/handlers`.
**Requirement**: LOG-03, LOG-04

**Done when**:

- [x] Sync run attempts, completion, skipped attempts and failures are logged.
- [x] Search, manifestation, download and storage attempts/results are logged.
- [x] XML content is not logged.

### T4: Verify

**What**: Run focused and full validation.
**Where**: tests and project scripts.
**Requirement**: all

**Done when**:

- [x] Focused logger and sync tests pass.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
