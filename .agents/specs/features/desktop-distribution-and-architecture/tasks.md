# Desktop Distribution And Architecture Tasks

**Design**: `.agents/specs/features/desktop-distribution-and-architecture/design.md`
**Status**: Done

---

## Execution Plan

### Phase 1: Project Layout And Safety Nets

T1 -> T2 -> T3

### Phase 2: Persistence And Session

T4 -> T5 -> T6

### Phase 3: Distribution And Updates

T7 -> T8 -> T9 -> T10

### Phase 4: Final Verification

T11

---

## Task Breakdown

### T1: Add Lint And Stabilize Local Quality Scripts

**What**: Add a real `npm run lint` command and ensure local quality commands are consistent with CI expectations.
**Where**: `package.json`, lint config files, existing TypeScript/React code if lint reveals issues.
**Depends on**: None
**Requirement**: DDA-02

**Done when**:

- [x] `npm run lint` exists.
- [x] `npm run lint` passes locally.
- [x] `npm run typecheck`, `npm test` and `npm run build` still pass.

### T2: Move Electron Infrastructure To Root Entries

**What**: Move main process, preload, IPC, dependencies, scheduler, updater placeholder and Electron secret codec out of `src/`.
**Where**: `main.ts`, `preload.ts`, `dependencies.ts`, `ipc.ts`, `sync-scheduler.ts`, `electron-secret-codec.ts`, `electron.vite.config.ts`, `tsconfig.json`.
**Depends on**: T1
**Requirement**: DDA-06

**Done when**:

- [x] `src/main` no longer exists.
- [x] `src/preload` no longer exists.
- [x] Electron Vite builds from root entries.
- [x] Main/preload type imports remain strict and context isolation still works.

### T3: Move Renderer To Views

**What**: Move React renderer from `src/renderer` to root-level `views/` and update aliases/build config.
**Where**: `views/`, `electron.vite.config.ts`, `tsconfig.json`, imports.
**Depends on**: T2
**Requirement**: DDA-06

**Done when**:

- [x] `src/renderer` no longer exists.
- [x] `views/index.html` is the renderer entry.
- [x] UI imports use `@views/` or local view paths.
- [x] `npm run build` produces renderer output from `views/`.

### T4: Replace Inline Migrations With SQL Files

**What**: Create `db/migrations` SQL files and replace the TypeScript inline migration class with a file-based migration runner.
**Where**: `db/migrations`, `src/shared/sqlite/migration-runner.ts`, `src/shared/sqlite/database.ts`, `dependencies.ts`.
**Depends on**: T3
**Requirement**: DDA-05

**Done when**:

- [x] `db/migrations/V1__initial_schema.sql` creates the current baseline schema.
- [x] Migration runner parses Flyway-style filenames.
- [x] Migration runner records version, script, checksum and timestamp.
- [x] Migration runner validates checksum for applied migrations.
- [x] Inline schema SQL is removed from TypeScript code.

### T5: Add Legacy Database Baseline Support

**What**: Support opening databases created by the previous inline migration implementation without re-running incompatible SQL.
**Where**: `src/shared/sqlite/migration-runner.ts`, migration tests.
**Depends on**: T4
**Requirement**: DDA-05

**Done when**:

- [x] Empty databases run all SQL migrations.
- [x] Existing databases with old `schema_migrations` and core tables are baselined at `V1`.
- [x] Pending migrations still run after baseline.
- [x] Corrupt or partial legacy schema fails with a clear error.

### T6: Implement Remembered Login

**What**: Add `Manter conectado` to login and persist opt-in sessions securely.
**Where**: `views/src/components/login-screen.tsx`, `preload.ts`, `ipc.ts`, `src/shared/session`, `src/shared/auth` or existing auth/shared files, `db/migrations/V2__remembered_sessions.sql`.
**Depends on**: T5
**Requirement**: DDA-04

**Done when**:

- [x] Login payload includes `remember`.
- [x] Remembered login stores no password.
- [x] App startup resumes a valid remembered session.
- [x] Logout clears remembered session.
- [x] Invalid remembered session is deleted and login is shown.
- [x] Focused tests cover remember, resume and logout behavior.

### T7: Add Electron Builder Packaging

**What**: Add package scripts and build configuration for Windows, macOS and Linux desktop artifacts.
**Where**: `package.json`, `electron-builder.yml` or package build config, app assets/icons.
**Depends on**: T3
**Requirement**: DDA-01, DDA-03

**Done when**:

- [x] `electron-builder` is installed as a dev dependency.
- [x] `electron-updater` is installed as a runtime dependency.
- [x] `npm run dist` builds packaged artifacts for the current OS.
- [x] Windows target is NSIS.
- [x] macOS targets include DMG and ZIP.
- [x] Linux target includes AppImage.
- [x] Native module rebuild for `better-sqlite3` is covered by package workflow.

### T8: Implement Update Service And UI Hooks

**What**: Add an update adapter around `electron-updater`, IPC channels and Configurações UI controls.
**Where**: `update-service.ts`, `ipc.ts`, `preload.ts`, `views/src/components/settings-screen.tsx`, view types.
**Depends on**: T7
**Requirement**: DDA-03

**Done when**:

- [x] Packaged app checks for updates on startup.
- [x] Development mode returns disabled update status.
- [x] Configurações shows current app version.
- [x] User can manually check for updates.
- [x] User can restart/install after an update downloads.
- [x] Update errors are non-fatal and visible.

### T9: Add Pull Request CI Workflow

**What**: Add GitHub Actions quality gate for PRs to `main` and `master`.
**Where**: `.github/workflows/ci.yml`.
**Depends on**: T1
**Requirement**: DDA-02

**Done when**:

- [x] Workflow triggers on `pull_request` to `main` and `master`.
- [x] Workflow runs `npm ci`.
- [x] Workflow runs lint, typecheck, tests and build.
- [x] Workflow cache is configured without hiding dependency issues.

### T10: Add Release Publishing Workflow

**What**: Add GitHub Actions workflow triggered by GitHub Release publish to build and upload all platform artifacts.
**Where**: `.github/workflows/release.yml`, package scripts/config.
**Depends on**: T7, T8, T9
**Requirement**: DDA-01, DDA-03

**Done when**:

- [x] Workflow triggers on `release: published`.
- [x] Matrix builds on Ubuntu, macOS and Windows.
- [x] Workflow validates release tag against `package.json.version`.
- [x] Workflow runs quality checks before packaging.
- [x] Workflow publishes artifacts and updater metadata to the existing GitHub Release.
- [x] Signing/notarization secret requirements are documented in workflow comments or project docs.

### T11: Final Architecture And Distribution Verification

**What**: Run full local verification and architecture checks for the reorganized project.
**Where**: Whole repository.
**Depends on**: T1-T10
**Requirement**: All

**Done when**:

- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm run build` passes.
- [x] `npm run dist -- --dir` or equivalent current-OS package smoke passes.
- [x] `rg --files src` shows only bounded contexts and shared support.
- [x] `rg --files views` shows renderer UI.
- [x] `rg --files db/migrations` shows Flyway-style `.sql` migrations.
