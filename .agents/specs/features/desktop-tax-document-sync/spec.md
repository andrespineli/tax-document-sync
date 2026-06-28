# Desktop Tax Document Sync Specification

## Problem Statement

The current automatic fiscal document download feature lives inside a problematic Laravel ERP and reads company/certificate data from old modules. The new application must extract that workflow into a small local Electron app with clean TypeScript architecture, SQLite persistence and a simple backoffice UI.

## Goals

- [ ] Backoffice user can log in locally and manage the app without network-facing authentication.
- [ ] User can register fiscal entities with the data required by SEFAZ DFe services.
- [ ] App automatically downloads authorized NF-e XMLs and stores metadata in SQLite plus XML files in a configurable local directory.
- [ ] Fiscal integration is encapsulated behind adapters.

## Out of Scope

| Feature | Reason |
| --- | --- |
| ERP purchase import | The new app is intentionally decoupled from Laravel and has no purchase module. |
| DANFE generation | The request only requires viewing downloaded documents/XMLs. |
| Emission/cancellation | The legacy behavior being extracted is download and manifestation. |
| Cloud sync | Persistence is local SQLite and local filesystem. |

---

## User Stories

### P1: Local Backoffice Login - MVP

**User Story**: As a backoffice user, I want a local login so that fiscal certificates and downloaded documents are not visible without authentication.

**Why P1**: The app stores sensitive certificate and tax document data.

**Acceptance Criteria**:

1. WHEN the app starts without an admin user THEN the system SHALL show first-run admin setup.
2. WHEN an admin exists THEN the system SHALL require username and password before showing the workspace.
3. WHEN credentials are invalid THEN the system SHALL reject login without exposing password details.
4. WHEN the user logs out THEN the system SHALL clear the active session.

**Independent Test**: Create an admin, log out, log back in and verify the workspace appears only after valid credentials.

---

### P1: Fiscal Entity Registration - MVP

**User Story**: As a backoffice user, I want to register a company and upload its A1 certificate so that the app can query SEFAZ for documents issued against that CNPJ.

**Why P1**: No synchronization can run without company and certificate data.

**Acceptance Criteria**:

1. WHEN the user enters legal name, CNPJ, UF, certificate file and password THEN the system SHALL persist a fiscal entity in SQLite.
2. WHEN CNPJ contains punctuation THEN the system SHALL normalize it to 14 digits.
3. WHEN required fields are missing or invalid THEN the system SHALL return validation errors.
4. WHEN a fiscal entity has no retry delay THEN it SHALL be eligible for synchronization.

**Independent Test**: Save a company with a `.pfx` certificate and confirm it appears in the entity list with normalized CNPJ.

---

### P1: Configurable Document Storage - MVP

**User Story**: As a backoffice user, I want to choose the local directory for XML files so that downloads are stored where my backoffice process expects them.

**Why P1**: The user explicitly requires local configurable persistence for downloaded documents.

**Acceptance Criteria**:

1. WHEN the user chooses a directory THEN the system SHALL persist it in settings.
2. WHEN a document is downloaded THEN the system SHALL write `{directory}/{cnpj}/{key}.xml`.
3. WHEN no directory is configured THEN the system SHALL use the app data `documents` directory.

**Independent Test**: Configure a directory and verify a sync writes XML under the company CNPJ folder.

---

### P1: Automatic DFe Download Loop - MVP

**User Story**: As a backoffice user, I want the app to automatically search, manifest and download authorized NF-e XMLs so that I do not need to manually use the Receita/SEFAZ portal.

**Why P1**: This is the core feature being extracted.

**Acceptance Criteria**:

1. WHEN the sync loop runs THEN the system SHALL query each eligible fiscal entity by last NSU.
2. WHEN SEFAZ returns `cStat=138` THEN the system SHALL process returned `docZip` documents.
3. WHEN SEFAZ returns `cStat=656` or `cStat=137` THEN the system SHALL set next search time to now + 70 minutes and skip that entity until then.
4. WHEN a summary has `cSitNFe != 1` THEN the system SHALL skip it.
5. WHEN an authorized summary has no existing tax document THEN the system SHALL manifest ciencia da operacao and then download the full XML.
6. WHEN manifest returns `135`, `573` or `596` THEN the system SHALL persist the tax document as manifested.
7. WHEN download returns `cStat=138` THEN the system SHALL persist XML content, write the XML file and mark the document loaded.
8. WHEN sync completes THEN the system SHALL persist the latest `ultNSU` for the fiscal entity.

**Independent Test**: Run the synchronizer with a fake gateway returning one authorized summary and verify status, XML file path and last NSU are updated.

---

### P1: Tax Document Viewing - MVP

**User Story**: As a backoffice user, I want to see downloaded documents so that I can confirm the app is working and open XML files when needed.

**Why P1**: The app must provide visibility into downloaded documents.

**Acceptance Criteria**:

1. WHEN documents exist THEN the system SHALL list key, type, status, company, dates and file path.
2. WHEN the user filters by company or status THEN the system SHALL update the list.
3. WHEN a document has a file path THEN the system SHALL allow opening it through the OS.

**Independent Test**: Seed a document and verify it appears in the documents screen with an open-file action.

---

## Edge Cases

- WHEN certificate data is invalid THEN the fiscal adapter SHALL surface a clear synchronization error and not delete the fiscal entity.
- WHEN storage directory does not exist THEN the storage adapter SHALL create it.
- WHEN the same key is seen again and already loaded THEN the system SHALL not duplicate the tax document.
- WHEN the app is offline THEN sync SHALL fail gracefully and expose the error in sync status.
- WHEN fiscal library response shape differs from the legacy NFePHP array shape THEN the adapter SHALL normalize it before returning to the application service.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| TDS-01 | Local Backoffice Login | Execute | Verified |
| TDS-02 | Fiscal Entity Registration | Execute | Verified |
| TDS-03 | Configurable Document Storage | Execute | Verified |
| TDS-04 | Automatic DFe Download Loop | Execute | Verified |
| TDS-05 | Tax Document Viewing | Execute | Verified |
| TDS-06 | Fiscal Integration Adapter | Execute | Verified |

**Coverage:** 6 total, 6 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [x] User can start the Electron app, create/login as admin and reach the workspace.
- [x] User can save at least one fiscal entity with A1 certificate.
- [x] User can configure a document directory.
- [x] Sync loop can be started manually and runs automatically while the app is open.
- [x] Downloaded XML metadata is stored in SQLite and XML content is stored on disk.
- [x] `npm run typecheck`, `npm test` and `npm run build` pass.
