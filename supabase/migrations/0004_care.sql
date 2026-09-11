create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  dosage text,
  form text,
  schedule_times time[] not null default '{}' check (array_length(schedule_times, 1) <= 6),
  days_of_week int[] check (days_of_week is null or (
    array_length(days_of_week, 1) between 1 and 7
  )),
  start_date date not null,
  end_date date,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medicine_ends_after_it_starts check (end_date is null or end_date >= start_date)
);

create index medicines_user_active_idx on public.medicines (user_id, is_active);

-- Target for the composite foreign key from medicine_logs.
alter table public.medicines add constraint medicines_id_user_key unique (id, user_id);

alter table public.medicines enable row level security;
create policy "own medicines are readable" on public.medicines for select using (auth.uid() = user_id);
create policy "own medicines are insertable" on public.medicines for insert with check (auth.uid() = user_id);
create policy "own medicines are updatable" on public.medicines for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own medicines are deletable" on public.medicines for delete using (auth.uid() = user_id);

create table public.medicine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medicine_id uuid not null,
  scheduled_date date not null,
  scheduled_time time not null,
  status text not null check (status in ('taken', 'skipped')),
  logged_at timestamptz not null default now(),
  unique (medicine_id, scheduled_date, scheduled_time),
  -- The medicine logged must be HERS. Without the user_id component she could log a
  -- dose against another user's medicine given only its UUID.
  constraint medicine_logs_medicine_owned_by_same_user
    foreign key (medicine_id, user_id)
    references public.medicines (id, user_id) on delete cascade
);

create index medicine_logs_user_date_idx on public.medicine_logs (user_id, scheduled_date desc);

alter table public.medicine_logs enable row level security;
create policy "own logs are readable" on public.medicine_logs for select using (auth.uid() = user_id);
create policy "own logs are insertable" on public.medicine_logs for insert with check (auth.uid() = user_id);
create policy "own logs are updatable" on public.medicine_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own logs are deletable" on public.medicine_logs for delete using (auth.uid() = user_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 140),
  doctor_name text,
  clinic_name text,
  scheduled_at timestamptz not null,
  location text,
  notes text,
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_user_time_idx on public.appointments (user_id, scheduled_at);

-- Target for the composite foreign key from doctor_advice.
alter table public.appointments add constraint appointments_id_user_key unique (id, user_id);

alter table public.appointments enable row level security;
create policy "own appointments are readable" on public.appointments for select using (auth.uid() = user_id);
create policy "own appointments are insertable" on public.appointments for insert with check (auth.uid() = user_id);
create policy "own appointments are updatable" on public.appointments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own appointments are deletable" on public.appointments for delete using (auth.uid() = user_id);

create table public.doctor_advice (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  appointment_id uuid,
  recorded_on date not null,
  body text not null check (length(trim(body)) between 1 and 4000),
  input_method text not null check (input_method in ('text', 'voice')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Column-scoped SET NULL (PostgreSQL 15+): nulling both columns would violate
  -- user_id NOT NULL and make appointment deletion impossible.
  constraint advice_appointment_owned_by_same_user
    foreign key (appointment_id, user_id)
    references public.appointments (id, user_id) on delete set null (appointment_id)
);

create index doctor_advice_user_date_idx on public.doctor_advice (user_id, recorded_on desc);

alter table public.doctor_advice enable row level security;
create policy "own advice is readable" on public.doctor_advice for select using (auth.uid() = user_id);
create policy "own advice is insertable" on public.doctor_advice for insert with check (auth.uid() = user_id);
create policy "own advice is updatable" on public.doctor_advice for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own advice is deletable" on public.doctor_advice for delete using (auth.uid() = user_id);

create table public.vitals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_on date not null,
  kind text not null check (kind in ('weight', 'bp')),
  value_1 numeric(6, 1) not null,
  value_2 numeric(6, 1),
  notes text,
  created_at timestamptz not null default now(),
  -- PHYSICALLY IMPOSSIBLE values only: these are data-entry errors, not readings.
  -- Clinically notable but possible values are accepted and saved, with a
  -- non-diagnostic note in the UI. The database has no clinical opinion, and it must
  -- never reject a real reading: a woman with genuinely high blood pressure has to be
  -- able to record it.
  constraint weight_is_possible check (kind <> 'weight' or (value_1 between 25 and 250 and value_2 is null)),
  constraint bp_carries_both_numbers check (kind <> 'bp' or value_2 is not null),
  constraint bp_is_possible check (kind <> 'bp' or (value_1 between 50 and 300 and value_2 between 30 and 200)),
  constraint bp_diastolic_below_systolic check (kind <> 'bp' or value_2 < value_1)
);

create index vitals_user_kind_date_idx on public.vitals (user_id, kind, measured_on desc);

alter table public.vitals enable row level security;
create policy "own vitals are readable" on public.vitals for select using (auth.uid() = user_id);
create policy "own vitals are insertable" on public.vitals for insert with check (auth.uid() = user_id);
create policy "own vitals are updatable" on public.vitals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own vitals are deletable" on public.vitals for delete using (auth.uid() = user_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 140),
  report_type text,
  report_date date not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  page_count int,
  created_at timestamptz not null default now()
);

create index reports_user_date_idx on public.reports (user_id, report_date desc);

alter table public.reports enable row level security;
create policy "own reports are readable" on public.reports for select using (auth.uid() = user_id);
create policy "own reports are insertable" on public.reports for insert with check (auth.uid() = user_id);
create policy "own reports are updatable" on public.reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reports are deletable" on public.reports for delete using (auth.uid() = user_id);

create trigger medicines_touch before update on public.medicines
  for each row execute function public.touch_updated_at();
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();
create trigger doctor_advice_touch before update on public.doctor_advice
  for each row execute function public.touch_updated_at();

-- Private bucket for raw report files. 20 MB ceiling matches the reports.size_bytes check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports', 'reports', false, 20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

-- Objects are addressed as {user_id}/{report_id}/{filename}, so the first path
-- segment is the authorisation check.
create policy "own report files are readable" on storage.objects
  for select to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own report files are insertable" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own report files are deletable" on storage.objects
  for delete to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = auth.uid()::text);
