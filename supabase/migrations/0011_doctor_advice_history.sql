-- Session 25 replan: doctor_advice grows a type category and a confirm-to-remind
-- toggle, and its free-text content moves to an append-only child table so an
-- edit never overwrites a past entry. doctor_advice had zero rows in production
-- (no write path existed before this session), so this restructures it directly
-- rather than migrating data.
alter table public.doctor_advice
  drop column body,
  drop column input_method,
  drop column recorded_on,
  add column type text not null check (
    type in ('medicine', 'test', 'scan', 'appointment', 'diet', 'exercise', 'question', 'other')
  ),
  add column is_reminder boolean not null default false;

-- Target for the composite foreign key from doctor_advice_updates.
alter table public.doctor_advice add constraint doctor_advice_id_user_key unique (id, user_id);

create table public.doctor_advice_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  advice_id uuid not null,
  body text not null check (length(btrim(body)) between 1 and 4000),
  doctor_name text,
  input_method text not null check (input_method in ('text', 'voice')),
  created_at timestamptz not null default now(),
  constraint doctor_advice_updates_owned_by_same_user
    foreign key (advice_id, user_id)
    references public.doctor_advice (id, user_id) on delete cascade
);

create index doctor_advice_updates_advice_idx on public.doctor_advice_updates (advice_id, created_at);
create index doctor_advice_updates_user_created_idx on public.doctor_advice_updates (user_id, created_at desc);

alter table public.doctor_advice_updates enable row level security;
create policy "own advice updates are readable" on public.doctor_advice_updates for select using (auth.uid() = user_id);
create policy "own advice updates are insertable" on public.doctor_advice_updates for insert with check (auth.uid() = user_id);
-- Deliberately no update or delete policy: an advice thread's history is
-- append-only by design (Session 25 replan, Decision 2) -- enforced here, not
-- just in the app.
