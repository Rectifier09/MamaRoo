-- Session 18.2: the Today feeling quick-select chips ("I'm feeling good" /
-- "Something's new" / "I'm feeling worried"). Free text stays the only
-- required field on a checkin; this column is optional metadata, never a
-- triage input -- lib/domain/triage.ts stays purely deterministic over typed
-- or spoken text, per its own rule against authoring severity signals.
-- Used by lib/domain/activity.ts to render "Said you were feeling good"
-- instead of a generic "Checked in" line on the Recent Activity feed.
alter table public.checkins
  add column feeling text check (feeling in ('good', 'new', 'worried'));
