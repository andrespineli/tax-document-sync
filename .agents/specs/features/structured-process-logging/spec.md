# Structured Process Logging Specification

## Problem Statement

The fiscal synchronization process needs durable local logs for support and audit
without relying on the developer console. Logs must make each sync execution,
SEFAZ search, manifestation, download, storage and error traceable by time and
run id while avoiding sensitive payloads such as XML content, passwords and
certificate material.

## Goals

- [x] Persist structured logs to local daily files.
- [x] Allow the user to configure the logs directory in Configuracoes.
- [x] Use a safe default logs directory derived from the XML storage directory.
- [x] Log fiscal sync attempts, search, manifestation, download, storage and errors.

## Out Of Scope

| Feature | Reason |
| --- | --- |
| Remote log shipping | The app is local-first and has no server backend. |
| In-app log viewer | The request is for file-based logs and directory configuration. |
| Full XML or certificate logging | These values are sensitive and too large for operational logs. |

---

## User Stories

### P1: Configurable Local Structured Logs

**User Story**: As a backoffice operator, I want local logs in a configurable directory so that I can inspect failures without developer tooling.

**Acceptance Criteria**:

1. WHEN no logs directory is configured THEN the app SHALL write logs under `<XML storage directory>/logs`.
2. WHEN no XML storage directory is configured THEN the app SHALL write logs under the default app documents directory plus `/logs`.
3. WHEN the user saves a logs directory in Configuracoes THEN future log writes SHALL use that directory.
4. WHEN a log entry is written THEN it SHALL be JSON Lines with timestamp, level, event and context.
5. WHEN a log entry context contains sensitive field names THEN the logger SHALL redact those values.

**Independent Test**: Configure a temp logs directory, run sync, and inspect the daily `.jsonl` file.

---

### P1: Fiscal Synchronization Trace

**User Story**: As a maintainer, I want each fiscal sync step logged with a run id so that I can reconstruct a failing execution.

**Acceptance Criteria**:

1. WHEN a sync run starts THEN the app SHALL log the run id and trigger.
2. WHEN an eligible company is processed THEN the app SHALL log the company id, CNPJ and last NSU.
3. WHEN SEFAZ search returns THEN the app SHALL log status code, reason, last NSU and document count.
4. WHEN a document is manifested THEN the app SHALL log manifestation start and result.
5. WHEN a document is downloaded and stored THEN the app SHALL log download result and file path without XML content.
6. WHEN an error occurs THEN the app SHALL log the error message and stack when available.

**Independent Test**: Run unit tests with a capturing logger and verify expected event names are emitted.

---

## Edge Cases

- WHEN a sync is requested while another sync is running THEN the app SHALL log the skipped attempt.
- WHEN the logs directory cannot be written THEN the app SHALL report the logging failure to console and keep the fiscal sync running.
- WHEN a fiscal document response includes XML content THEN the logger SHALL not persist the XML body.
- WHEN a Linux/macOS/Windows path is configured THEN the logger SHALL create missing directories recursively.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LOG-01 | Configurable Local Structured Logs | Execute | Verified |
| LOG-02 | Configurable Local Structured Logs | Execute | Verified |
| LOG-03 | Fiscal Synchronization Trace | Execute | Verified |
| LOG-04 | Fiscal Synchronization Trace | Execute | Verified |

**Coverage:** 4 total, 4 mapped to stories, 0 unmapped.

## Success Criteria

- [x] Settings UI exposes the effective logs directory and allows changing it.
- [x] Logs are written to `tax-document-sync-YYYY-MM-DD.jsonl`.
- [x] Fiscal sync emits run, search, manifestation, download, storage and error events.
- [x] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass.
