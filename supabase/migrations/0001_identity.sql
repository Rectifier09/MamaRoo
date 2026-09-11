-- Identity, pregnancy and consent. RLS is defined in the same migration as each
-- table, deliberately, so a table can never exist without its policy.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80),
  locale text not null default 'en' check (locale in ('en', 'hi')),
  birth_year int check (birth_year between 1950 and 2025),
  city text,
  is_first_pregnancy boolean,
  height_cm numeric(5, 1) check (height_cm between 100 and 220),
  pre_pregnancy_weight_kg numeric(5, 1) check (pre_pregnancy_weight_kg between 25 and 250),
  doctor_name text,
  clinic_name text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile is readable" on public.profiles
  for select using (auth.uid() = id);
create policy "own profile is insertable" on public.profiles
  for insert with check (auth.uid() = id);
create policy "own profile is updatable" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile is deletable" on public.profiles
  for delete using (auth.uid() = id);

create table public.pregnancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lmp_date date,
  edd date not null,
  edd_source text not null check (edd_source in ('lmp', 'scan', 'manual')),
  baby_name text check (baby_name is null or length(trim(baby_name)) between 1 and 60),
  status text not null default 'active' check (status in ('active', 'ended')),
  ended_at timestamptz,
  ended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lmp_required_when_source_is_lmp
    check (edd_source <> 'lmp' or lmp_date is not null),
  constraint ended_rows_carry_a_timestamp
    check (status <> 'ended' or ended_at is not null)
);

-- At most one active pregnancy per user.
create unique index pregnancies_one_active_per_user
  on public.pregnancies (user_id)
  where status = 'active';

create index pregnancies_user_idx on public.pregnancies (user_id);

-- Target for composite foreign keys from child tables. A child referencing
-- (pregnancy_id, user_id) can then only point at a pregnancy the same user owns.
alter table public.pregnancies add constraint pregnancies_id_user_key unique (id, user_id);

alter table public.pregnancies enable row level security;

create policy "own pregnancies are readable" on public.pregnancies
  for select using (auth.uid() = user_id);
create policy "own pregnancies are insertable" on public.pregnancies
  for insert with check (auth.uid() = user_id);
create policy "own pregnancies are updatable" on public.pregnancies
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own pregnancies are deletable" on public.pregnancies
  for delete using (auth.uid() = user_id);

-- Consent is an append-only audit trail. A withdrawal is a new row, never an edit.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  -- Monotonic insertion order. The primary key is a random v4 UUID, so ordering by
  -- it is deterministic but NOT chronological: among rows sharing granted_at, the
  -- lexicographically greatest random UUID can be either one. The four baseline rows
  -- are inserted in a single batch and routinely share granted_at to the microsecond,
  -- so without this column a withdrawal could lose to the grant it replaced.
  seq bigint generated always as identity,
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_key text not null check (consent_key in ('terms', 'privacy', 'optional_data_sharing', 'analytics')),
  version text not null,
  granted boolean not null,
  locale text not null check (locale in ('en', 'hi')),
  granted_at timestamptz not null default now()
);

-- seq DESC is part of the ordering, not decoration: the four baseline rows are
-- inserted in one batch and routinely share granted_at to the microsecond.
create index consents_user_key_idx
  on public.consents (user_id, consent_key, granted_at desc, seq desc);

alter table public.consents enable row level security;

create policy "own consents are readable" on public.consents
  for select using (auth.uid() = user_id);
create policy "own consents are insertable" on public.consents
  for insert with check (auth.uid() = user_id);
-- Deliberately no update or delete policy: the trail is immutable.

-- THE definition of "what has she currently agreed to". Every consumer reads this view:
-- the routing middleware, the analytics mount, Settings, and the Visit Summary.
-- Asking the raw table whether any row has granted = true can never become false on an
-- append-only table, so a withdrawal would never take effect. That was a real bug in an
-- earlier revision of this plan; this view exists so the question is only answerable once.
create view public.current_consents as
select distinct on (user_id, consent_key)
  user_id, consent_key, version, granted, locale, granted_at
from public.consents
order by user_id, consent_key, granted_at desc, seq desc;

-- Views run with the privileges of the querying role against the underlying table's
-- RLS, so the consents policies above already scope this per user.
alter view public.current_consents set (security_invoker = true);

-- Keep updated_at honest without application code.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger pregnancies_touch before update on public.pregnancies
  for each row execute function public.touch_updated_at();

-- Reports any table in public that is missing row level security.
-- Used by tests only; safe to expose because it returns table names, not data.
create or replace function public.tables_without_rls()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = false;
$$;

-- PUBLIC holds EXECUTE on a new function by default, so revoking from anon and
-- authenticated alone would leave the restriction cosmetic. Revoke from PUBLIC first.
revoke all on function public.tables_without_rls() from public;
revoke all on function public.tables_without_rls() from anon, authenticated;
grant execute on function public.tables_without_rls() to service_role;
