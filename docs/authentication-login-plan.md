# Authentication and Login Plan

The app now has a login scaffold that is ready for Supabase-backed authentication, but the remote path is disabled by default in development.

## Current state

- Local login remains active.
- The main process now routes login through a small auth abstraction in [src/main/auth.js](../src/main/auth.js).
- Supabase login is intentionally disabled unless explicitly enabled in a production environment.

## Environment flags

- `AUTH_PROVIDER=local`
  - Default behavior.
- `SUPABASE_AUTH_ENABLED=false`
  - Keeps the remote login path disabled.
- `SUPABASE_AUTH_ENABLED=true`
  - Future production-only toggle for the Supabase branch.

## What the scaffold is ready for

- Activation-key validation
- Tenant onboarding
- Master PIN setup and reset
- Employee creation
- PIN or password login for master/admin and employees

## Recommended next build step

When you are ready to connect Supabase, add one of these:

1. A backend API that handles auth and tenant activation.
2. Supabase Edge Functions for activation and login.

For now, development keeps the functionality turned off so the app continues to run with the existing local login flow.