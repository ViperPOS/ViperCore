create table if not exists public.tenant_devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  app_instance_id text not null,
  machine_fingerprint_hash text null,
  platform text not null,
  arch text not null,
  app_version text not null,
  status text not null default 'active',
  first_registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_devices_status_check
    check (status in ('active', 'revoked')),
  constraint tenant_devices_unique_instance_per_tenant
    unique (tenant_id, app_instance_id)
);

create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete cascade,
  plan_name text not null default 'starter',
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz null,
  grace_until timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_subscriptions_status_check
    check (status in ('trial', 'active', 'past_due', 'suspended', 'expired', 'canceled'))
);

create table if not exists public.app_releases (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'stable',
  platform text not null,
  arch text not null,
  version text not null,
  storage_bucket text not null default 'updates',
  storage_path text not null,
  file_name text not null,
  sha256 text null,
  release_notes text null,
  min_supported_version text null,
  mandatory boolean not null default false,
  rollout_percent integer not null default 100,
  active boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_releases_channel_check
    check (channel in ('stable', 'beta')),
  constraint app_releases_rollout_check
    check (rollout_percent >= 0 and rollout_percent <= 100)
);

create table if not exists public.update_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid null references public.tenants (id) on delete set null,
  app_instance_id text null,
  current_version text null,
  latest_version text null,
  channel text not null default 'stable',
  platform text null,
  arch text null,
  result text not null,
  reason text null,
  created_at timestamptz not null default now(),
  constraint update_audit_log_result_check
    check (result in ('allowed', 'denied', 'no_update', 'error'))
);

create index if not exists idx_tenant_devices_tenant_id on public.tenant_devices (tenant_id);
create index if not exists idx_tenant_devices_app_instance_id on public.tenant_devices (app_instance_id);
create index if not exists idx_tenant_subscriptions_status on public.tenant_subscriptions (status);
create index if not exists idx_app_releases_channel_platform_arch on public.app_releases (channel, platform, arch, active);
create index if not exists idx_update_audit_log_tenant_created_at on public.update_audit_log (tenant_id, created_at desc);
