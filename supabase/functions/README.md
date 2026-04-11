# Supabase Edge Functions

This folder contains Edge Functions for the setup/login flow.

## Functions

- `initialize-tenant`
  - Validates activation key and reserves it
  - Creates tenant
  - Creates master admin user
  - Marks activation key as used
- `login`
  - Tenant-aware login by username/password or PIN
- `admin-add-employee`
  - Authenticated admin action to add employee with password+PIN
- `admin-reset-pin`
  - Authenticated admin action to reset an employee PIN

## Shared helpers

- `_shared/supabase.ts` -> service-role client
- `_shared/security.ts` -> PBKDF2 hashing + verification for password/PIN
- `_shared/cors.ts` -> CORS headers

## Deploy

Run these from the repo root after logging into Supabase CLI:

```bash
supabase functions deploy initialize-tenant
supabase functions deploy login
supabase functions deploy admin-add-employee
supabase functions deploy admin-reset-pin
```

## Local serve (optional)

```bash
supabase functions serve --env-file supabase/.env.local
```

## Required environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Set them in Supabase project function secrets or local `.env` for testing.
