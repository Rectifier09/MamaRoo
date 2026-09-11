create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  locale text not null check (locale in ('en', 'hi')),
  kind text not null check (kind in ('article', 'video', 'audio')),
  title text not null,
  summary text,
  body_md text,
  media_url text,
  duration_seconds int,
  week_min int check (week_min between 1 and 42),
  week_max int check (week_max between 1 and 42),
  tags text[] not null default '{}',
  narration_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (slug, locale),
  -- Target for the composite foreign key from content_passages.
  unique (id, locale),
  constraint week_range_is_ordered check (week_min is null or week_max is null or week_min <= week_max),
  constraint media_kinds_carry_a_url check (kind = 'article' or media_url is not null),
  constraint articles_carry_a_body check (kind <> 'article' or body_md is not null)
);

create index content_items_published_idx on public.content_items (locale, kind, is_published);
create index content_items_week_idx on public.content_items (week_min, week_max);

alter table public.content_items enable row level security;
-- Read only. No insert, update or delete policy exists, so content is writable
-- by migrations and seeds alone.
create policy "published content is readable" on public.content_items
  for select to authenticated using (is_published = true);

create table public.content_passages (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null,
  locale text not null check (locale in ('en', 'hi')),
  heading text,
  body text not null,
  search_tsv tsvector generated always as (
    to_tsvector('simple', coalesce(heading, '') || ' ' || body)
  ) stored,
  created_at timestamptz not null default now(),
  -- The passage's locale must match its parent item's locale. Without this a
  -- Hindi-labelled passage could hang off an English item and be served to a Hindi
  -- reader with no "English only" marker, which is the one thing the locale fallback
  -- exists to make visible.
  constraint passage_locale_matches_item
    foreign key (content_item_id, locale)
    references public.content_items (id, locale) on delete cascade
);

-- 'simple' rather than 'english' deliberately: the corpus is bilingual and
-- PostgreSQL ships no Hindi dictionary, so stemming would help one language
-- and quietly damage the other.
create index content_passages_tsv_idx on public.content_passages using gin (search_tsv);
create index content_passages_item_idx on public.content_passages (content_item_id);

alter table public.content_passages enable row level security;
create policy "passages of published content are readable" on public.content_passages
  for select to authenticated using (
    exists (
      select 1 from public.content_items ci
      where ci.id = content_passages.content_item_id and ci.is_published = true
    )
  );

create table public.symptom_rules (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('en', 'hi')),
  match_terms text[] not null check (array_length(match_terms, 1) >= 1),
  severity text not null check (severity in ('general', 'contact_clinic', 'urgent')),
  guidance_title text not null,
  guidance_body text not null,
  priority int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index symptom_rules_active_idx on public.symptom_rules (locale, is_active, priority desc);

alter table public.symptom_rules enable row level security;
create policy "active rules are readable" on public.symptom_rules
  for select to authenticated using (is_active = true);

create table public.suggested_questions (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('en', 'hi')),
  week_min int not null check (week_min between 1 and 42),
  week_max int not null check (week_max between 1 and 42),
  body text not null,
  priority int not null default 100,
  is_active boolean not null default true,
  constraint question_week_range_is_ordered check (week_min <= week_max)
);

alter table public.suggested_questions enable row level security;
create policy "active questions are readable" on public.suggested_questions
  for select to authenticated using (is_active = true);

-- The questions she has marked to carry into her next visit. Its own table because a
-- mark belongs to neither the question (shared content) nor an appointment (which may
-- not exist yet). The Visit Summary's questions section reads this.
create table public.question_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  suggested_question_id uuid not null references public.suggested_questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, suggested_question_id)
);

create index question_marks_user_idx on public.question_marks (user_id);

alter table public.question_marks enable row level security;
create policy "own marks are readable" on public.question_marks for select using (auth.uid() = user_id);
create policy "own marks are insertable" on public.question_marks for insert with check (auth.uid() = user_id);
create policy "own marks are deletable" on public.question_marks for delete using (auth.uid() = user_id);
-- Deliberately no update policy: a mark is created or removed, never edited.

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('en', 'hi')),
  category text not null check (category in ('hospital_bag', 'documents', 'birth_prep', 'home')),
  body text not null,
  sort_order int not null default 0,
  content_item_slug text,
  is_active boolean not null default true
);

alter table public.checklist_items enable row level security;
create policy "active checklist items are readable" on public.checklist_items
  for select to authenticated using (is_active = true);

create table public.checklist_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checklist_item_id uuid not null references public.checklist_items (id) on delete cascade,
  is_done boolean not null default false,
  done_at timestamptz,
  unique (user_id, checklist_item_id)
);

alter table public.checklist_progress enable row level security;
create policy "own progress is readable" on public.checklist_progress for select using (auth.uid() = user_id);
create policy "own progress is insertable" on public.checklist_progress for insert with check (auth.uid() = user_id);
create policy "own progress is updatable" on public.checklist_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own progress is deletable" on public.checklist_progress for delete using (auth.uid() = user_id);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null,
  retrieved_passage_ids uuid[] not null default '{}',
  answer_kind text check (answer_kind in ('data', 'retrieved', 'no_match', 'refused')),
  created_at timestamptz not null default now(),
  constraint assistant_messages_declare_their_kind
    check (role <> 'assistant' or answer_kind is not null)
);

create index chat_messages_user_time_idx on public.chat_messages (user_id, created_at);

alter table public.chat_messages enable row level security;
create policy "own chat is readable" on public.chat_messages for select using (auth.uid() = user_id);
create policy "own chat is insertable" on public.chat_messages for insert with check (auth.uid() = user_id);
create policy "own chat is deletable" on public.chat_messages for delete using (auth.uid() = user_id);

-- Retrieval function. SECURITY INVOKER, so the caller's RLS still applies.
create or replace function public.search_passages(query text, in_locale text, max_results int default 5)
returns table (id uuid, content_item_id uuid, heading text, body text, rank real)
language sql
stable
as $$
  select p.id, p.content_item_id, p.heading, p.body,
         ts_rank(p.search_tsv, websearch_to_tsquery('simple', query)) as rank
  from public.content_passages p
  join public.content_items ci on ci.id = p.content_item_id
  where ci.is_published = true
    and p.locale = in_locale
    and p.search_tsv @@ websearch_to_tsquery('simple', query)
  order by rank desc
  limit greatest(1, least(max_results, 20));
$$;
