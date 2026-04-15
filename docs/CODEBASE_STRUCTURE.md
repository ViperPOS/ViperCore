# Codebase Structure

This repository uses a src-first layout for the alspos Electron application.

## Folder Layout

- `src/main/`
  - Main process runtime (`main.js`, `backup.js`, `restore.js`).
- `src/renderer/`
  - Renderer app entry (`main.jsx`, `App.jsx`), pages, components, hooks, services, and styles.
- `src/resources/`
  - Local app resource defaults (`businessInfo.json`, `receiptFormat.json`, `uiSettings.json`).
- `main.js`, `backup.js`, `restore.js`
  - Thin root entry shims for Electron startup compatibility.
- `supabase/`
  - SQL schema, migrations, and Edge Functions.
- `scripts/`
  - Repository guardrails and verification scripts.
- `docs/`
  - Architecture and maintenance documentation.

## Root File Policy

Root should only contain:

- Entrypoints and static assets required by packaging/runtime.
- Build/config files.

Root must not contain duplicated renderer modules or renderer CSS files.
Those belong in `src/renderer`.

## Runtime Policy

The app is local-first for POS runtime, with controlled Supabase usage for setup/auth and update authorization.

- Keep billing/runtime resilient for local execution.
- Keep backup/restore local-only unless architecture is explicitly changed.
- Keep Supabase interactions behind main-process or Edge Function boundaries.

## Verification Commands

- `npm run verify:arch`
  - Checks root shim targets.
- `npm run verify:layout`
  - Checks folder policy, root cleanliness, HTML path usage, and offline dependency/resource policy.
- `npm run verify:structure`
  - Runs both compatibility and layout checks.
- `npm run verify:syntax`
  - Runs Node syntax checks on critical entry files.
- `npm run validate`
  - Runs structure and syntax verification in one command.

Use `npm run validate` before commits and release builds.
