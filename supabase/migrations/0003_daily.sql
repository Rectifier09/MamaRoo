create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pregnancy_id uuid,
  body text not null check (length(trim(body)) between 1 and 2000),
  input_method text not null check (input_method in ('text', 'voice')),
  severity text check (severity in ('general', 'contact_clinic', 'urgent')),
  matched_rule_id uuid,
  created_at timestamptz not null default now()
);

-- Composite FK: the pregnancy referenced must belong to the SAME user. A plain
-- foreign key would only prove the pregnancy exists, letting a leaked UUID attach
-- her check-in to someone else's pregnancy.
-- ON DELETE SET NULL names the column to null, which PostgreSQL 15+ supports.
-- Without the column list it would try to null BOTH referencing columns, and user_id
-- is NOT NULL, so deleting a pregnancy would fail with a constraint violation.
alter table public.checkins
  add constraint checkins_pregnancy_owned_by_same_user
  foreign key (pregnancy_id, user_id)
  references public.pregnancies (id, user_id) on delete set null (pregnancy_id);

create index checkins_user_time_idx on public.checkins (user_id, created_at desc);

alter table public.checkins enable row level security;
create policy "own checkins are readable" on public.checkins for select using (auth.uid() = user_id);
create policy "own checkins are insertable" on public.checkins for insert with check (auth.uid() = user_id);
create policy "own checkins are updatable" on public.checkins for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own checkins are deletable" on public.checkins for delete using (auth.uid() = user_id);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pregnancy_id uuid,
  source text not null check (source in ('user', 'system')),
  event_type text not null check (event_type in
    ('kick_session', 'appointment', 'report', 'checkin', 'stage_change', 'note', 'vital')),
  occurred_at timestamptz not null,
  title text not null check (length(trim(title)) between 1 and 140),
  body text,
  ref_table text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

alter table public.timeline_events
  add constraint timeline_pregnancy_owned_by_same_user
  foreign key (pregnancy_id, user_id)
  references public.pregnancies (id, user_id) on delete cascade;

create index timeline_user_time_idx on public.timeline_events (user_id, occurred_at desc);

alter table public.timeline_events enable row level security;
create policy "own timeline is readable" on public.timeline_events for select using (auth.uid() = user_id);
create policy "own timeline is insertable" on public.timeline_events for insert with check (auth.uid() = user_id);
create policy "own timeline is updatable" on public.timeline_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own timeline is deletable" on public.timeline_events for delete using (auth.uid() = user_id);

create table public.kick_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pregnancy_id uuid,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  target_count int not null default 10 check (target_count between 1 and 50),
  created_at timestamptz not null default now(),
  constraint kick_session_ends_after_it_starts check (ended_at is null or ended_at >= started_at)
);

alter table public.kick_sessions
  add constraint kick_pregnancy_owned_by_same_user
  foreign key (pregnancy_id, user_id)
  references public.pregnancies (id, user_id) on delete cascade;

create index kick_sessions_user_time_idx on public.kick_sessions (user_id, started_at desc);

-- Target for the composite foreign key from kick_events.
alter table public.kick_sessions add constraint kick_sessions_id_user_key unique (id, user_id);

-- One row per tap. This started life as a timestamptz[] on kick_sessions, appended by
-- an RPC. The RPC made concurrent appends safe but NOT retries: if a call commits and
-- its response is lost, the retry appends a second timestamp and the count is wrong.
-- A child row keyed by a client-generated tap_id makes a retry a no-op, which is the
-- property actually needed on a screen where taps arrive in bursts over a flaky link.
create table public.kick_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  tap_id uuid not null,
  occurred_at timestamptz not null default now(),
  unique (session_id, tap_id),
  constraint kick_event_session_owned_by_same_user
    foreign key (session_id, user_id)
    references public.kick_sessions (id, user_id) on delete cascade
);

create index kick_events_session_time_idx on public.kick_events (session_id, occurred_at);

alter table public.kick_events enable row level security;
create policy "own kick events are readable" on public.kick_events for select using (auth.uid() = user_id);
create policy "own kick events are insertable" on public.kick_events for insert with check (auth.uid() = user_id);
create policy "own kick events are deletable" on public.kick_events for delete using (auth.uid() = user_id);
-- No update policy: a tap is recorded or removed, never edited.
-- Only one unfinished session per user, so an abandoned session is resumed, not duplicated.
create unique index kick_sessions_one_open_per_user on public.kick_sessions (user_id) where ended_at is null;

alter table public.kick_sessions enable row level security;
create policy "own kick sessions are readable" on public.kick_sessions for select using (auth.uid() = user_id);
create policy "own kick sessions are insertable" on public.kick_sessions for insert with check (auth.uid() = user_id);
create policy "own kick sessions are updatable" on public.kick_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own kick sessions are deletable" on public.kick_sessions for delete using (auth.uid() = user_id);

create table public.contraction_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index contraction_sessions_one_open_per_user
  on public.contraction_sessions (user_id) where ended_at is null;

-- Target for the composite foreign key from contractions.
alter table public.contraction_sessions
  add constraint contraction_sessions_id_user_key unique (id, user_id);

alter table public.contraction_sessions enable row level security;
create policy "own contraction sessions are readable" on public.contraction_sessions for select using (auth.uid() = user_id);
create policy "own contraction sessions are insertable" on public.contraction_sessions for insert with check (auth.uid() = user_id);
create policy "own contraction sessions are updatable" on public.contraction_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own contraction sessions are deletable" on public.contraction_sessions for delete using (auth.uid() = user_id);

create table public.contractions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  started_at timestamptz not null,
  duration_seconds int check (duration_seconds between 1 and 1800),
  created_at timestamptz not null default now(),
  constraint contractions_session_owned_by_same_user
    foreign key (session_id, user_id)
    references public.contraction_sessions (id, user_id) on delete cascade
);

create index contractions_session_time_idx on public.contractions (session_id, started_at);

alter table public.contractions enable row level security;
create policy "own contractions are readable" on public.contractions for select using (auth.uid() = user_id);
create policy "own contractions are insertable" on public.contractions for insert with check (auth.uid() = user_id);
create policy "own contractions are updatable" on public.contractions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own contractions are deletable" on public.contractions for delete using (auth.uid() = user_id);
