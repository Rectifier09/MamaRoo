-- Session 25A: her own questions for the doctor, alongside the seeded,
-- week-mapped `suggested_questions`. That table is shared, admin-owned
-- content with no insert policy for users (Session 25A replan, Decision 3) --
-- mixing user-authored rows into it would break its RLS shape and its
-- "content, not personal data" model. `custom_questions` is a separate,
-- fully user-owned table instead.
--
-- `is_marked` lives directly on the row rather than in a join table like
-- `question_marks`: unlike `suggested_questions` (shared across every user,
-- so a mark needs its own row to say *whose* mark it is), a custom question
-- already belongs to exactly one user, so there is nothing a join table would
-- disambiguate. The Visit Summary's questions section reads both
-- `question_marks` (for seeded questions) and this column (for custom ones).
create table public.custom_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 500),
  is_marked boolean not null default false,
  created_at timestamptz not null default now()
);

create index custom_questions_user_created_idx on public.custom_questions (user_id, created_at);

alter table public.custom_questions enable row level security;
create policy "own custom questions are readable" on public.custom_questions for select using (auth.uid() = user_id);
create policy "own custom questions are insertable" on public.custom_questions for insert with check (auth.uid() = user_id);
create policy "own custom questions are updatable" on public.custom_questions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own custom questions are deletable" on public.custom_questions for delete using (auth.uid() = user_id);
