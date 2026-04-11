-- ProperLCP / Lassi Corner
-- Supabase bootstrap schema for activation, tenant onboarding, and tenant users.
--
-- Notes:
-- - Store only hashed secrets in the database.
-- - Use the service role key or a trusted backend for admin operations.
-- - Do not expose this schema file to the client.

create extension if not exists pgcrypto;

create table if not exists public.activation_keys (
  id uuid primary key default gen_random_uuid(),
  key_code text not null unique,
  status text not null default 'available',
  used_tenant_id uuid null unique,
  assigned_at timestamptz null,
  used_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activation_keys_status_check
    check (status in ('available', 'reserved', 'used', 'revoked'))
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null unique,
  tenant_name text not null,
  tenant_location text not null,
  contact_name text not null,
  contact_phone text not null,
  contact_email text null,
  contact_address text null,
  master_pin_hash text not null,
  activation_key_id uuid unique,
  activation_status text not null default 'pending',
  activated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_activation_status_check
    check (activation_status in ('pending', 'active', 'suspended', 'closed'))
);

alter table public.activation_keys
  add constraint activation_keys_used_tenant_id_fkey
  foreign key (used_tenant_id)
  references public.tenants (id)
  on delete set null;

alter table public.tenants
  add constraint tenants_activation_key_id_fkey
  foreign key (activation_key_id)
  references public.activation_keys (id)
  on delete restrict;

create table if not exists public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_type text not null default 'employee',
  full_name text not null,
  username text not null,
  password_hash text not null,
  pin_hash text not null,
  login_method_preference text not null default 'both',
  active boolean not null default true,
  last_login_at timestamptz null,
  created_by_user_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_users_user_type_check
    check (user_type in ('master_admin', 'employee')),
  constraint tenant_users_login_method_check
    check (login_method_preference in ('both', 'password', 'pin')),
  constraint tenant_users_username_unique_per_tenant
    unique (tenant_id, username)
);

alter table public.tenant_users
  add constraint tenant_users_created_by_user_id_fkey
  foreign key (created_by_user_id)
  references public.tenant_users (id)
  on delete set null;

create index if not exists idx_activation_keys_status on public.activation_keys (status);
create index if not exists idx_activation_keys_used_tenant_id on public.activation_keys (used_tenant_id);
create index if not exists idx_tenants_activation_status on public.tenants (activation_status);
create index if not exists idx_tenant_users_tenant_id on public.tenant_users (tenant_id);
create index if not exists idx_tenant_users_username on public.tenant_users (username);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_activation_keys_updated_at
before update on public.activation_keys
for each row
execute function public.set_updated_at();

create trigger trg_tenants_updated_at
before update on public.tenants
for each row
execute function public.set_updated_at();

create trigger trg_tenant_users_updated_at
before update on public.tenant_users
for each row
execute function public.set_updated_at();

-- Keep these tables server-managed for now.
alter table public.activation_keys enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;

-- Seed five activation keys in a Windows-style format.
insert into public.activation_keys (key_code, status)
values
  ('LCP7F-3K9QW-2M8DX-5R4TN', 'available'),
  ('LCP4J-8V2NP-6Q5XT-9H3RA', 'available'),
  ('LCP9M-1C7LK-4Z8YD-2F6WS', 'available'),
  ('LCP5X-6R3HJ-9B1QT-7N4PD', 'available'),
  ('LCP8A-2W5VF-3N9CM-6K7ZX', 'available')
on conflict (key_code) do nothing;

-- Optional helper view for quick operator review.
create or replace view public.activation_key_overview as
select
  ak.id,
  ak.key_code,
  ak.status,
  ak.used_tenant_id,
  t.tenant_id,
  t.tenant_name,
  t.tenant_location,
  ak.assigned_at,
  ak.used_at,
  ak.created_at,
  ak.updated_at
from public.activation_keys ak
left join public.tenants t on t.id = ak.used_tenant_id;
