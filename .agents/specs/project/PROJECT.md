# Tax Document Sync

**Vision:** Desktop application for securely registering fiscal entities and automatically downloading inbound NF-e XML documents from SEFAZ distribution services.
**For:** Backoffice users who need a small local replacement for the DFe download module currently embedded in the legacy ERP.
**Solves:** The fiscal document download workflow is coupled to a fragile Laravel monolith and needs to run locally with a clean codebase, SQLite persistence and a configurable document directory.

## Goals

- Provide a working Electron desktop app where a backoffice user can log in, register companies, upload A1 certificates and inspect downloaded fiscal documents.
- Preserve the legacy DFe behavior: ultNSU polling, retry delay for SEFAZ throttling/not-found responses, automatic ciencia da operacao and XML download.
- Keep fiscal service integration behind adapters so the core domain is independent from node-mde or any future library.

## Tech Stack

**Core:**

- Framework: Electron + Vite + React
- Language: TypeScript strict mode
- Database: SQLite through `better-sqlite3`

**Key dependencies:**

- `node-mde` for NF-e distribution and recipient manifestation
- `electron` for desktop shell, dialogs and safe local APIs
- `react` for renderer UI
- `better-sqlite3` for local persistence
- `fast-xml-parser` for robust XML field extraction in tests and adapter normalization

## Scope

**v1 includes:**

- Secure local backoffice login with first-run admin setup.
- Fiscal entity registration with legal name, CNPJ, UF, A1 certificate upload and certificate password.
- Local SQLite persistence for users, settings, fiscal entities and tax documents.
- Configurable document directory and XML persistence under company-specific folders.
- Automatic and manual synchronization loop following the legacy DFe module behavior.
- Documents screen with status, key, company, timestamps and open-file action.

**Explicitly out of scope:**

- Multi-user roles beyond the single local backoffice account.
- DANFE/PDF generation.
- ERP purchase import/loading equivalent to `PurchaseXmlController::autoXmlImportLoad`.
- NF-e issuance, cancellation, carta de correcao or NFC-e/CT-e/MDF-e support.

## Constraints

- The legacy Laravel project in `~/dev/erp` is only a reference source.
- The app must not depend on the legacy ERP database or Laravel classes.
- Fiscal libraries must be hidden behind adapters and ports.
