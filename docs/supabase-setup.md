# Supabase Setup

This project now has a Supabase-first bootstrap schema in [supabase/001_initial_schema.sql](../supabase/001_initial_schema.sql).

## What the schema provides

- `activation_keys`
  - Stores the activation key inventory.
  - Tracks whether a key is available, reserved, used, or revoked.
  - Records which tenant used the key.
- `tenants`
  - Stores tenant onboarding data.
  - Includes tenant ID, tenant name, location, contact details, activation status, and the hashed master PIN.
- `tenant_users`
  - Stores the master admin user and employee users.
  - Supports login by password or PIN.
  - Stores only hashed secrets.

## Important security note

Do not store plaintext PINs or passwords in Supabase.
Only store hashes from the application or backend.

## How to apply the schema

1. Open the Supabase SQL Editor.
2. Paste the contents of [supabase/001_initial_schema.sql](../supabase/001_initial_schema.sql).
3. Run the script.
4. Confirm the five activation keys were inserted.

## Recommended onboarding flow

1. Customer enters an activation key.
2. Backend marks the key as used and links it to the tenant.
3. Create the tenant record with:
   - tenant ID
   - tenant name
   - tenant location
   - contact details
   - hashed master PIN
4. Create the first `tenant_users` row for the master admin.
5. Allow the master admin to create employee accounts and employee PINs.

## What the current schema does not do yet

- It does not create app login APIs.
- It does not define application-side auth routes.
- It does not add Supabase client integration to the Electron app yet.

That should be the next step after the database is confirmed.

## Next implementation step

Add backend or Supabase Edge Functions for:

- activation key validation
- tenant onboarding
- master PIN reset/change
- employee account creation
- login by username/password or PIN

## Credential reminder

If you pasted any Supabase database password or connection string into chat, rotate it in Supabase and move it into environment variables before using it in code.
