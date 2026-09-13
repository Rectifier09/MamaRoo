-- Session 20A: twin-aware baby names, a bilingual read-only catalog, and
-- per-user favorites. Catalog rows below are a deliberately small starter set;
-- the product owner's fully reviewed catalog is a follow-up.

alter table public.pregnancies
  drop constraint if exists pregnancies_baby_name_check;

alter table public.pregnancies
  alter column baby_name type text[]
    using case
      when baby_name is null then '{}'::text[]
      else array[baby_name]
    end,
  alter column baby_name set default '{}'::text[],
  alter column baby_name set not null;

-- PostgreSQL check constraints cannot contain a subquery. Keep the per-element
-- validation in one immutable function, then use it from the column constraint.
create function public.valid_baby_names(names text[])
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select not exists (
    select 1
    from unnest(names) as item(name)
    where name is null or length(btrim(name)) not between 1 and 60
  );
$$;

revoke all on function public.valid_baby_names(text[]) from public;
grant execute on function public.valid_baby_names(text[]) to authenticated, service_role;

alter table public.pregnancies
  add constraint pregnancies_baby_name_items_are_valid
    check (public.valid_baby_names(baby_name)),
  add constraint pregnancies_baby_name_count_matches_pregnancy
    check (
      coalesce(array_ndims(baby_name), 1) = 1
      and cardinality(baby_name) <= case
        when 'twins' = any(pregnancy_flags) then 2
        else 1
      end
    );

create table public.baby_names (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 60),
  meaning_en text not null check (length(btrim(meaning_en)) between 1 and 180),
  meaning_hi text not null check (length(btrim(meaning_hi)) between 1 and 180),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index baby_names_name_unique_idx on public.baby_names (lower(name));
create index baby_names_active_order_idx on public.baby_names (is_active, sort_order, name);

alter table public.baby_names enable row level security;
-- Reference content is read-only to app users. No insert, update, or delete
-- policy exists, so catalog changes can only arrive through migrations.
create policy "active baby names are readable" on public.baby_names
  for select to authenticated using (is_active = true);

create table public.baby_name_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  baby_name_id uuid not null references public.baby_names (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, baby_name_id)
);

create index baby_name_favorites_user_idx on public.baby_name_favorites (user_id, created_at desc);

alter table public.baby_name_favorites enable row level security;
create policy "own baby name favorites are readable" on public.baby_name_favorites
  for select using (auth.uid() = user_id);
create policy "own baby name favorites are insertable" on public.baby_name_favorites
  for insert with check (auth.uid() = user_id);
create policy "own baby name favorites are updatable" on public.baby_name_favorites
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own baby name favorites are deletable" on public.baby_name_favorites
  for delete using (auth.uid() = user_id);

insert into public.baby_names (id, name, meaning_en, meaning_hi, sort_order)
values
  ('20000000-0000-4000-8000-000000000001', 'Aditi', 'Boundless', 'असीम', 10),
  ('20000000-0000-4000-8000-000000000002', 'Advait', 'One, without a second', 'एक, अद्वितीय', 20),
  ('20000000-0000-4000-8000-000000000003', 'Anmol', 'Precious', 'अनमोल', 30),
  ('20000000-0000-4000-8000-000000000004', 'Jyoti', 'Light', 'प्रकाश', 40),
  ('20000000-0000-4000-8000-000000000005', 'Meher', 'Kindness and grace', 'कृपा और दया', 50),
  ('20000000-0000-4000-8000-000000000006', 'Noor', 'Light', 'रोशनी', 60),
  ('20000000-0000-4000-8000-000000000007', 'Tara', 'Star', 'तारा', 70),
  ('20000000-0000-4000-8000-000000000008', 'Uday', 'Rising, sunrise', 'उदय, सूर्योदय', 80);
