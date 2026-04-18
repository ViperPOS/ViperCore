begin;

-- Auto-transition subscriptions to expired when expires_at is reached.
create or replace function public.expire_due_tenant_subscriptions(p_tenant_id uuid default null)
returns integer
language plpgsql
as $$
declare
  affected_count integer := 0;
begin
  update public.tenant_subscriptions ts
  set
    status = 'expired',
    notes = coalesce(nullif(ts.notes, ''), 'Auto-marked expired when expires_at elapsed'),
    updated_at = now()
  where
    ts.expires_at is not null
    and ts.expires_at <= now()
    and ts.status in ('trial', 'active', 'past_due')
    and (p_tenant_id is null or ts.tenant_id = p_tenant_id);

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

create or replace function public.trg_tenant_subscriptions_apply_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.expires_at is not null
     and new.expires_at <= now()
     and new.status in ('trial', 'active', 'past_due') then
    new.status := 'expired';
    if new.notes is null or btrim(new.notes) = '' then
      new.notes := 'Auto-marked expired when expires_at elapsed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tenant_subscriptions_apply_expiry on public.tenant_subscriptions;

create trigger trg_tenant_subscriptions_apply_expiry
before insert or update on public.tenant_subscriptions
for each row
execute function public.trg_tenant_subscriptions_apply_expiry();

-- Optional background enforcement using pg_cron. If pg_cron is unavailable, on-read checks still enforce expiry.
do $do$
declare
  existing_job record;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for existing_job in
      select jobid
      from cron.job
      where jobname = 'tenant_subscriptions_auto_expire'
    loop
      perform cron.unschedule(existing_job.jobid);
    end loop;

    perform cron.schedule(
      'tenant_subscriptions_auto_expire',
      '* * * * *',
      $cron$select public.expire_due_tenant_subscriptions();$cron$
    );
  end if;
end;
$do$;

-- Run once so already-expired rows are corrected immediately.
select public.expire_due_tenant_subscriptions();

commit;
