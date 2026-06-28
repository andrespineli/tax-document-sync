# Roadmap

**Current Milestone:** Local Desktop MVP
**Status:** Complete

---

## Local Desktop MVP

**Goal:** A backoffice user can install/run the Electron app, register a company and certificate, configure a local output directory and start downloading NF-e XML documents.
**Target:** Verified app build with local UI and automated tests for the core synchronization behavior.

### Features

**Desktop Tax Document Sync** - COMPLETE

- Login and first-run admin setup.
- Fiscal entity CRUD for the data needed by SEFAZ.
- A1 certificate upload and SQLite-backed persistence.
- Configurable local document directory.
- Manual and scheduled NF-e DFe synchronization.
- Tax document list with status and XML file path.

---

## Distribution And Architecture Hardening

**Goal:** Make the desktop app releasable through GitHub Releases, updatable in the field and structurally cleaner by separating framework infrastructure from business contexts.
**Target:** CI quality gates for PRs to `main` or `master`, release packaging for Windows/macOS/Linux, automatic updates, remembered login and SQL-file migrations.

### Features

**Desktop Distribution And Architecture** - COMPLETE

- GitHub Actions PR quality gate.
- GitHub Release-triggered packaging for Windows, macOS and Linux.
- `electron-builder`/`electron-updater` release metadata and runtime update checks.
- Optional remembered login without password persistence.
- Flyway-style SQL migrations under `db/migrations`.
- Root-level Electron infrastructure and `views/` renderer.

---

## Future Considerations

- Multiple fiscal document types beyond NF-e model 55.
- DANFE/PDF preview.
- Import/export backup for the local SQLite database and XML directory.
- OS keychain hardening for certificate data on every supported platform.
