-- Public signup without exposing the list or requiring an account.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text not null unique check (
    email = lower(btrim(email))
    and char_length(email) <= 254
    and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  locale text not null check (locale in ('en', 'hi')),
  consent text not null default 'launch-email' check (consent = 'launch-email'),
  consent_version smallint not null default 1 check (consent_version = 1),
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;
revoke all on table public.waitlist from public, anon, authenticated;
grant all on table public.waitlist to service_role;

-- Only this narrow function may accept anonymous signups. No rows or duplicate
-- indicators are returned. Retries cannot overwrite someone else's name/consent.
create function public.join_waitlist(p_name text, p_email text, p_locale text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.waitlist (name, email, locale)
  values (
    btrim(regexp_replace(p_name, '\s+', ' ', 'g')),
    lower(btrim(p_email)),
    p_locale
  )
  on conflict (email) do nothing;
end;
$$;

revoke all on function public.join_waitlist(text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text)
  to anon, authenticated, service_role;
