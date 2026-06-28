# State

## Decisions

- Use `.agents/specs/` for project specs because this repository's AGENTS.md declares that location.
- Treat `~/dev/erp/src/DFe` as behavioral reference only; the new app does not import or depend on Laravel.
- Use `node-mde` as the initial fiscal adapter because it directly supports ultNSU, chave and ciencia da operacao without requiring a Java SDK during install.
- Keep `nfewizard-io` as a deferred adapter option. It has broader NF-e coverage and recent releases, but its dependency chain failed local install because `xsd-schema-validator` requires Java SDK at postinstall.
- Use GitHub Releases as the distribution/update channel for the desktop app.
- Use `electron-builder` plus `electron-updater` for packaging metadata and runtime update checks.
- Use AppImage as the primary Linux auto-update target; optional Linux package formats can be added later.
- Treat macOS production auto-update as dependent on code signing and notarization credentials.
- Move Electron and React framework infrastructure out of `src/`; keep `src/` focused on bounded contexts and shared support.
- Replace inline TypeScript migrations with Flyway-style SQL files under `db/migrations`, with legacy baseline support for existing local databases.
- Keep the project license as MIT, but validate third-party dependencies as permissive-compatible rather than assuming every dependency is MIT.
- Use `npm rebuild better-sqlite3` before Vitest and `electron-rebuild -f -w better-sqlite3` before Electron dev/preview because Node and Electron use different native module ABIs.

## Legacy Behavior Notes

- Search calls use the company's `last_dfe_sequence_number`.
- Only `cStat=138` is treated as documents found.
- `cStat=656` and `cStat=137` schedule the next search for now + 1 hour + 10 minutes.
- Documents are processed only when `cSitNFe=1`.
- New documents are manifested with ciencia da operacao before full XML download.
- Manifest response codes `135`, `573` and `596` are accepted.
- Download response must be `cStat=138`.
- Legacy statuses are `MANIFESTED`, `DOWNLOADED`, `LOADED`.

## Deferred Ideas

- Add DANFE generation through `@nfewizard/danfe`.
- Add backup/restore for app data.
- Add OS-specific certificate storage tests once app packaging targets are known.
