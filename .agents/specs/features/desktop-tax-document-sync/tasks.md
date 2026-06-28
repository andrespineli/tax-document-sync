# Desktop Tax Document Sync Tasks

**Design**: `.agents/specs/features/desktop-tax-document-sync/design.md`
**Status**: Done

---

## Execution Plan

### Phase 1: Foundation

T1 -> T2 -> T3

### Phase 2: Core

T4, T5, T6, T7 can proceed after T3.

### Phase 3: Integration

T8 -> T9 -> T10

---

## Task Breakdown

### T1: Scaffold Electron TypeScript Project

**What**: Add package scripts, tsconfig files and Vite/Electron entry files.
**Where**: `package.json`, `tsconfig*.json`, `electron.vite.config.ts`, `src/main`, `src/preload`, `src/renderer`
**Depends on**: None
**Requirement**: TDS-01, TDS-05

**Done when**:

- [x] `npm install` succeeds.
- [x] Electron main/preload/renderer entries exist.
- [x] TypeScript strict mode is enabled.

### T2: Add Shared Building Blocks

**What**: Add domain base types, IDs, dates, SQLite connection, logger and XML helpers.
**Where**: `src/shared/`
**Depends on**: T1
**Requirement**: TDS-02, TDS-04

**Done when**:

- [x] Shared code has no framework imports in domain primitives.
- [x] SQLite migrations can initialize an empty database.

### T3: Implement Auth And Settings

**What**: Implement setup/login/logout and app settings persistence.
**Where**: `src/auth/`, `src/settings/`
**Depends on**: T2
**Requirement**: TDS-01, TDS-03

**Done when**:

- [x] First-run admin setup works.
- [x] Passwords are hashed with salt.
- [x] Storage directory and sync interval are persisted.

### T4: Implement FiscalEntity Aggregate

**What**: Implement fiscal entity model, validation, repository port and SQLite adapter.
**Where**: `src/fiscal-entity/`
**Depends on**: T2
**Requirement**: TDS-02

**Done when**:

- [x] CNPJ and UF validation exists.
- [x] Certificate data can be saved and loaded.
- [x] Eligible entities query respects `nextSearchAt`.

### T5: Implement TaxDocument Aggregate And Synchronizer

**What**: Implement tax document model, repository port and synchronizer preserving legacy status-code behavior.
**Where**: `src/tax-document/`
**Depends on**: T2, T4
**Requirement**: TDS-04, TDS-05

**Done when**:

- [x] Summary docs with `cSitNFe != 1` are skipped.
- [x] New authorized docs are manifested, downloaded, stored and marked loaded.
- [x] Retry statuses schedule next search by 70 minutes.

### T6: Implement Fiscal Service Adapter

**What**: Encapsulate the fiscal library behind `FiscalDocumentGateway`.
**Where**: `src/tax-document/outbound/fiscal/`
**Depends on**: T5
**Requirement**: TDS-06

**Done when**:

- [x] Adapter initializes the fiscal library from fiscal entity certificate data.
- [x] Search, manifest and download responses are normalized for the synchronizer.
- [x] No application/domain code imports the fiscal service package.

### T7: Implement Local XML Storage

**What**: Save downloaded XML files to configured directory under CNPJ subfolders.
**Where**: `src/tax-document/outbound/storage/`
**Depends on**: T5
**Requirement**: TDS-03, TDS-04

**Done when**:

- [x] Missing directories are created.
- [x] Stored path is returned to the synchronizer.

### T8: Implement Electron IPC Composition

**What**: Wire repositories, handlers, adapters and IPC channels in the Electron main process.
**Where**: `src/main/`, `src/preload/`
**Depends on**: T3, T4, T5, T6, T7
**Requirement**: TDS-01 through TDS-06

**Done when**:

- [x] Renderer can call only exposed preload APIs.
- [x] Auth-required APIs reject missing sessions.
- [x] Sync scheduler can start/stop and emit status.

### T9: Implement React UI

**What**: Build functional setup/login/workspace screens.
**Where**: `src/renderer/`
**Depends on**: T8
**Requirement**: TDS-01 through TDS-05

**Done when**:

- [x] User can set up admin and log in.
- [x] User can save fiscal entity data and certificate.
- [x] User can choose storage directory and view documents.
- [x] User can trigger sync manually.

### T10: Verification

**What**: Add focused tests and run typecheck/build.
**Where**: `tests/`, project scripts
**Depends on**: T1-T9
**Requirement**: All

**Done when**:

- [x] `npm test` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.
