# React Ink (CLI Views)

- Use **multiple `useInput` with `isActive`** per step in multi-step forms; never a single
  `useInput` with internal `if/switch` on step. `isActive: false` unregisters the handler from
  Ink's event loop; it is not a conditional guard.
- Do not extract `useInput` handlers to named functions. `isActive` is the scoping mechanism; named
  functions add `useCallback` overhead or silent closure bugs with no readability gain.
- Views do not instantiate handlers/adapters directly. Use the UI bootstrap registries/clients.
- Screens receive `onBack` / `onCreated` / `onNavigate` props; never navigate imperatively.
- Private sub-components stay in the same file as the screen. Extract to `shared/` only when the
  pattern is identical across 3+ features and requires no domain-specific knowledge.

See the `low-level-design` skill (`references/hexagonal.md`) for inbound boundary guidance; keep UI-specific invariants here.
