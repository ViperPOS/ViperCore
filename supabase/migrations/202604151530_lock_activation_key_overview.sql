-- Restrict activation_key_overview to trusted backend access only.
revoke all on table public.activation_key_overview from anon, authenticated;
revoke all on table public.activation_key_overview from service_role;
grant select on table public.activation_key_overview to service_role;
