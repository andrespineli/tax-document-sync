# Desktop Distribution And Architecture Specification

## Problem Statement

The MVP app runs locally in development, but it is not ready for predictable distribution or maintenance. The project needs a release pipeline for Windows, macOS and Linux, automatic updates from GitHub Releases, persistent opt-in login, SQL-file migrations and a clearer boundary between business contexts and Electron/React framework infrastructure.

## Goals

- [x] Produce installable desktop artifacts for Windows, macOS and Linux when a GitHub Release is published from the GitHub UI.
- [x] Run CI checks on pull requests targeting `master`.
- [x] Provide automatic update checks and installation from published releases.
- [x] Allow users to opt into staying logged in across app restarts.
- [x] Move database migrations to pure `.sql` files under `db/migrations` using Flyway-style numbering.
- [x] Move renderer UI out of `src/renderer` into root-level `views/`.
- [x] Move Electron framework entry points out of `src/main` into root-level infrastructure files.
- [x] Keep `src/` focused on bounded contexts and shared business/application support.

## Out Of Scope

| Feature | Reason |
| --- | --- |
| App Store, Microsoft Store or Snap publishing | The requested distribution channel is GitHub Releases. |
| Cloud-hosted update server | GitHub Releases is sufficient for this app. |
| Multiple user accounts | Current backoffice flow is a local admin login. |
| Data model redesign for fiscal synchronization | This spec reorganizes infrastructure and distribution, not the core fiscal workflow. |
| Automatic macOS notarization without credentials | Production macOS distribution requires Apple Developer credentials supplied as CI secrets. |

---

## User Stories

### P1: Release Builds For All Desktop Platforms

**User Story**: As the maintainer, I want publishing a GitHub Release to generate Windows, macOS and Linux installers so that users can download the correct package for their OS.

**Why P1**: The app is intended for local desktop use and must be distributable outside development.

**Acceptance Criteria**:

1. WHEN a GitHub Release is published from the GitHub UI THEN GitHub Actions SHALL build release artifacts for Windows, macOS and Linux.
2. WHEN the Windows release job completes THEN it SHALL upload an NSIS installer and the auto-update metadata expected by `electron-updater`.
3. WHEN the macOS release job completes THEN it SHALL upload DMG and ZIP artifacts plus update metadata.
4. WHEN the Linux release job completes THEN it SHALL upload an AppImage artifact and Linux update metadata.
5. WHEN required code-signing secrets are missing THEN the workflow SHALL either skip signing clearly or fail with an explicit setup error, not silently produce a misleading signed release.
6. WHEN the release tag does not match the package version policy THEN the workflow SHALL fail before publishing artifacts.

**Independent Test**: Create a draft release/tag in a test repository or workflow dry run, publish it, and verify release assets are attached for every platform.

---

### P1: Pull Request Quality Gate

**User Story**: As the maintainer, I want pull requests to `master` to run lint, typecheck, tests and build so that regressions are caught before merge.

**Why P1**: Distribution automation is only useful if releasable branches are verified.

**Acceptance Criteria**:

1. WHEN a pull request targets `master` THEN CI SHALL run `npm ci`.
2. WHEN dependencies are installed THEN CI SHALL run `npm run lint`.
3. WHEN lint passes THEN CI SHALL run `npm run typecheck`.
4. WHEN typecheck passes THEN CI SHALL run `npm test`.
5. WHEN tests pass THEN CI SHALL run `npm run build`.
6. WHEN any quality gate fails THEN the pull request check SHALL fail.

**Independent Test**: Open a PR with a type error or lint error and verify CI fails before build.

---

### P1: Automatic Updates

**User Story**: As a backoffice user, I want the app to discover and install new versions from releases so that updates are easy to distribute.

**Why P1**: Manual reinstall is error-prone for local desktop deployments.

**Acceptance Criteria**:

1. WHEN the packaged app starts THEN it SHALL check GitHub Releases for updates through an update adapter.
2. WHEN a new version is available THEN the app SHALL download it using the platform-specific updater metadata.
3. WHEN an update is downloaded THEN the UI SHALL notify the user and offer restart/install.
4. WHEN the app runs in development THEN update checks SHALL be disabled or return a clear no-op status.
5. WHEN update errors occur THEN the app SHALL expose a non-fatal status and keep running.
6. WHEN the user opens Configurações THEN the app SHALL show the current version and allow manual update check.

**Independent Test**: Run a packaged app pointing to a release feed with a newer version and verify the update status reaches `downloaded`.

---

### P1: Remembered Login

**User Story**: As a backoffice user, I want to select "Manter conectado" during login so that I do not need to log in every time the desktop app opens.

**Why P1**: The current in-memory session rotates every app start, which is inconvenient for a local desktop workflow.

**Acceptance Criteria**:

1. WHEN the login screen is shown THEN it SHALL include a checkbox labeled `Manter conectado`.
2. WHEN login succeeds with the checkbox unchecked THEN the app SHALL keep only an in-memory session.
3. WHEN login succeeds with the checkbox checked THEN the app SHALL persist a remembered session without storing the password.
4. WHEN the app starts and a valid remembered session exists THEN it SHALL enter the workspace without asking for credentials.
5. WHEN the user logs out THEN the app SHALL remove both in-memory and remembered sessions.
6. WHEN the remembered session is invalid or cannot be decrypted THEN the app SHALL remove it and show the login screen.

**Independent Test**: Log in with `Manter conectado`, close and reopen the app, and verify the workspace opens without another password prompt.

---

### P1: SQL File Migrations

**User Story**: As a maintainer, I want migrations as SQL files using Flyway-style names so that schema changes are reviewable and ordered outside TypeScript code.

**Why P1**: Inline migrations are hard to inspect and do not match the requested project structure.

**Acceptance Criteria**:

1. WHEN migrations are stored THEN they SHALL live under `db/migrations`.
2. WHEN a migration file is named THEN it SHALL follow `V<version>__<description>.sql`.
3. WHEN the app starts THEN it SHALL run pending migrations in numeric order.
4. WHEN a migration succeeds THEN the app SHALL record the version, description, checksum and execution timestamp.
5. WHEN an already-applied migration checksum changes THEN startup SHALL fail with a clear migration integrity error.
6. WHEN an existing pre-SQL-migration database is opened THEN the app SHALL baseline it safely before applying new SQL migrations.

**Independent Test**: Start from an empty temp database and verify all migrations run; then change an applied migration checksum and verify startup fails.

---

### P1: Source Layout Review

**User Story**: As a maintainer, I want framework infrastructure outside `src/` so that `src/` remains focused on bounded contexts and business rules.

**Why P1**: The current `src/main`, `src/preload` and `src/renderer` mix Electron/React infrastructure with domain contexts.

**Acceptance Criteria**:

1. WHEN the project is reorganized THEN React renderer code SHALL live under root-level `views/`.
2. WHEN the project is reorganized THEN Electron main/preload infrastructure SHALL live at the project root or root-level infrastructure files.
3. WHEN source aliases are configured THEN `@/` SHALL continue to point to `src/` business/shared code.
4. WHEN UI code imports types or preload contracts THEN it SHALL use explicit framework/view aliases, not deep imports into moved files.
5. WHEN business contexts are inspected THEN `src/` SHALL contain only bounded contexts and `shared/` support code.
6. WHEN the app is built THEN Electron Vite SHALL use the new entry paths.

**Independent Test**: Run `rg --files src` and verify no `src/main`, `src/preload` or `src/renderer` framework entry remains.

---

## Edge Cases

- WHEN a release is created as a draft but not published THEN release build jobs SHALL not publish artifacts.
- WHEN a release is re-run THEN the job SHALL replace or overwrite compatible assets deterministically.
- WHEN native module rebuild fails for `better-sqlite3` on a target OS THEN release CI SHALL fail before asset upload.
- WHEN the app is offline during update check THEN no login/session state SHALL be cleared.
- WHEN a remembered session exists but the admin user was removed or password reset THEN session resume SHALL fail and delete the remembered session.
- WHEN a migration file is deleted after being applied THEN startup SHALL report the migration history mismatch.
- WHEN an existing database has old inline `schema_migrations` metadata THEN the new migration runner SHALL baseline without re-running incompatible `CREATE` or `ALTER` statements.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DDA-01 | Release Builds For All Desktop Platforms | Execute | Verified |
| DDA-02 | Pull Request Quality Gate | Execute | Verified |
| DDA-03 | Automatic Updates | Execute | Verified |
| DDA-04 | Remembered Login | Execute | Verified |
| DDA-05 | SQL File Migrations | Execute | Verified |
| DDA-06 | Source Layout Review | Execute | Verified |

**Coverage:** 6 total, 6 mapped to stories, 0 unmapped.

---

## Success Criteria

- [x] Pull requests to `master` run lint, typecheck, tests and build.
- [x] Publishing a GitHub Release attaches Windows, macOS and Linux artifacts.
- [x] Packaged builds can discover updates through GitHub Releases.
- [x] User can opt into remembered login and later clear it via logout.
- [x] Migrations are pure SQL files under `db/migrations`.
- [x] `src/` no longer contains Electron main/preload or React renderer infrastructure.
- [x] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and a local package smoke command pass.
