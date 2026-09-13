create table public.personal_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index personal_notes_user_created_idx on public.personal_notes (user_id, created_at desc);

alter table public.personal_notes enable row level security;
create policy "own notes are readable" on public.personal_notes for select using (auth.uid() = user_id);
create policy "own notes are insertable" on public.personal_notes for insert with check (auth.uid() = user_id);
create policy "own notes are updatable" on public.personal_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own notes are deletable" on public.personal_notes for delete using (auth.uid() = user_id);

create trigger personal_notes_touch before update on public.personal_notes
  for each row execute function public.touch_updated_at();
