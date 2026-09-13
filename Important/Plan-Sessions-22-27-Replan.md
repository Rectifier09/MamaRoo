# Sessions 22–27 replan: My Care, split for incremental delivery

Source: `Screens/04-my-care/` (designer markup) compared against `Important/Implementation.md` Sessions 22–27 and the Migration 3 schema (Session 9). This doc replaces those six session entries with eight, sequenced so each is a self-contained sitting — land one, stop, come back later — rather than one big push. No code has been written against this yet.

## What the designer folder confirmed vs. changed

| Design file | Original plan coverage | Verdict |
|---|---|---|
| `My Care.dc.html` | Session 22 (hub) | Matches. Hub also links out to every sub-screen below, including two (Personal Notes, and the existing Suggested Questions/Summary routes) that need their paths wired up front so later sessions don't touch the hub file again. |
| `Medicines.dc.html` | Session 22 (medicines, adherence grid) | Matches, plus one addition: Iron & folic acid and Calcium get a permanently-pinned tracker card above the rest. `medicines` has no flag for this today — needs one column, not a new session. |
| `Appointments.dc.html` | Session 23 | Matches, plus one addition: "Add appointment" has an optional reference-photo attach. `appointments` has no photo column and no storage path for it today. |
| `Doctors Advice.dc.html` | Session 25 (bundled with Suggested Questions) | Bigger than planned. `doctor_advice` today is `{user_id, appointment_id, recorded_on, body, input_method}` — no type category, no reminder-confirmation state, and editing overwrites `body` in place. The design's type chips (medicine/test/scan/appointment/diet/exercise/question/other), the "confirmed → now a reminder" toggle, and edits that **append** rather than overwrite are all new shape, not new copy. |
| `Suggested Questions.dc.html` | Session 25 (bundled with Doctor's Advice) | Bigger than planned, differently. `suggested_questions` is shared, admin-owned, read-only content (`question_marks` only lets her mark/unmark existing rows — there's no insert policy for users at all). The design's composer row ("+" to add her own question) is a genuine write path that doesn't exist in that model. |
| `Reports.dc.html` | Session 26 | Matches the core flow. The multi-step add sheet (unclear-photo retake prompt, "looks similar to one you already added" prompt) isn't in Session 26's original test list, but needs no schema change — it's pre-save UX logic, not stored state. Extend the session's scope in place. |
| `Doctor Visit Summary.dc.html` | Session 27 | Matches. |
| `Personal Notes.dc.html` | **Not in Implementation.md at all** | Net-new feature, no table, no session — same situation Letters to Baby was in for My Baby. Confirmed it does *not* feed the Doctor Visit Summary (not in the summary's section list), so it has zero downstream dependents. |
| (no file) | Session 24 (Vitals and trend charts) | Still no designer markup anywhere in the repo. Session 24's own Gate A ("stop until it arrives") is unmet — this isn't new, just confirmed, same as Kick Counter was for Session 21. |

One thing this comparison rules out: **Session 27 does not need to wait on Session 24.** The `vitals` table was already created in Session 9 (data layer), so `buildSummary` can query it today — it will legitimately render "Nothing added yet" for vitals until Session 24 ships the entry screen that writes to it. Don't let the still-blocked vitals session hold up the Visit Summary.

## Decisions this replan makes (flag if you'd call any of these differently)

1. **Split, don't cram — and don't over-split either.** Personal Notes and Suggested Questions become their own sessions because they need genuinely different data shapes. The Medicines pin, the Appointments photo, and the Reports retake/duplicate prompts stay inside their existing sessions because they're additive to the same table and screen.
2. **Doctor's Advice growth needs an append-history table, not a jsonb blob.** A new `doctor_advice_updates` child table (id, advice_id, body, created_at) keeps "append, never overwrite" queryable and consistent with how the rest of the schema handles one-to-many (e.g. `medicine_logs`), rather than growing an unstructured column.
3. **Custom questions get their own table**, `custom_questions` (id, user_id, body, created_at), rather than an insert path into `suggested_questions`. That table is shared seed content read by every user — mixing user-authored rows into it breaks that model and its RLS shape.
4. **Personal Notes scopes to `user_id` only**, matching every other Migration 3 table (medicines, advice, vitals, reports) — no pregnancy-specific fields, since the design shows plain dated notes, not baby-week-labeled entries like Letters to Baby.
5. **Appointments' reference-photo attach is deferred**, not built alongside the rest of Session 23. It would otherwise force Session 23 to either duplicate Reports' upload/validation helpers or wait on Session 26. Ship Appointments to its original scope first; add the photo attach as a small follow-on once Session 26's storage helpers exist to reuse.

## Revised session breakdown

### Session 22 — My Care hub, medicines, adherence day-grid — **done** (2026-09-13)
Unchanged goal, two additions:
- Wire every hub link up front to its fixed path (`/care/medicines`, `/care/appointments`, `/care/advice`, `/care/questions`, `/care/reports`, `/care/summary`, `/care/notes`) — they 404 harmlessly until their session lands, but the hub file is touched exactly once.
- Pin Iron & folic acid / Calcium above the rest of the list. **Built without the migration this doc originally proposed**: `isPriorityMedicine(name)` matches on the medicine's name instead of a schema column — same pinned behaviour, no migration, and no coordination needed with whichever other session is concurrently writing to the same live Supabase project.
- Files: as originally scoped, minus the `is_priority` migration (superseded by the heuristic above). See `Important/Implementation.md`'s Session 22 "Delivered scope" note for the full list of build-time deviations.

### Session 22A — Personal Notes — **done** (2026-09-13)
Goal: reverse-chronological note cards, plain-textarea write flow with inline mic, edit-in-place, delete-with-confirmation. Built against `Screens/04-my-care/Personal Notes.dc.html`. Migration `0010_personal_notes.sql` adds the table (same RLS shape as `doctor_advice`). Two deviations from the plan as written above, both deliberate:
- **The screen follows the app's real full-page list/read/write pattern** (same as Letters to Baby), not the design mock's bottom-sheet layout — consistent with how Letters to Baby already diverged from its own sheet-based mock.
- **`CareHub`'s notes card is now wired to the latest note's preview**, not left on its permanent empty prompt — completing the parity Session 22 established for every other card once the table existed (`lib/supabase/queries/care.ts`, `app/(app)/care/page.tsx`, `app/(app)/care/CareHub.tsx` all touched for this one line).
- Files: `lib/domain/notes.ts` + test, `lib/supabase/queries/notes.ts` + test, `app/(app)/care/notes/page.tsx` + `NotesScreen.tsx` + test, `app/actions/notes.ts` + test, migration file, plus the `CareHub` wiring above.
- Depended on: the fixed route and `CareHub` scaffold Session 22 wired (required merging PRs #22 and #23 to `main` first, since this session's worktree branched after both).

### Session 23 — Appointments — **done** (2026-09-13)
Unchanged from the original plan. Reference-photo attach is explicitly out of scope here (see Decision 5) — revisit as a small follow-on after Session 26. See `Important/Implementation.md`'s Session 23 "Delivered scope" note for the build-time deviations (no separate title field, no "rescheduled" status, the per-appointment questions section deferred to 25A).

### Session 24 — Vitals and trend charts (unchanged, still blocked)
No change to original scope. **Still cannot start** — no designer markup exists yet. Flagging so it isn't assumed "ready" just because the rest of this folder is. Does not block Session 27 (see above).

### Session 25 — Doctor's Advice (revised, split from the original combined session)
- Goal: type-categorized advice entries, a confirm-toggle that's the only thing turning an entry into a reminder, and edits that append a new update rather than overwriting.
- Needs a migration: add `type text` (checked against the 8 design categories) and `is_reminder boolean default false` to `doctor_advice`; new `doctor_advice_updates` child table for appended edits.
- Files: `lib/domain/advice.ts` + test, `app/(app)/care/advice/page.tsx`, `AdviceList.tsx`, `AdviceForm.tsx` + tests, `app/actions/advice.ts`, migration file.
- Depends on: nothing beyond Session 22's fixed route.

### Session 25A — Suggested Questions — **done** (2026-09-13)
Goal: seeded week-mapped questions (unchanged from the original Session 25 goal) plus her own custom questions added via the composer row, both markable and both carried into the Visit Summary. Built against `Screens/04-my-care/Suggested Questions.dc.html`. Migration `0012_custom_questions.sql` adds the table, per Decision 3, with `is_marked` as a plain column rather than a join table (a custom question is already single-owner, unlike shared `suggested_questions`). Two deviations from the plan as written above, both deliberate:
- **Gate B's real bilingual content never arrived** — shipped against the existing placeholder seed row in `supabase/seed/content.placeholder.sql` instead of waiting, same "build fully, note the gap" treatment as Session 18's `symptom_rules` Gate B. Swapping in real content later is a content-only change, not a migration.
- **Edit and remove controls only appear on custom questions, never on seeded ones** — the design mock renders every row identically, but `suggested_questions` is shared, admin-owned content with no update/delete policy for users; only the checkbox to mark it is real for a seeded row.
- Files: `lib/domain/questions.ts` + test, `lib/supabase/queries/questions.ts` + test, `app/(app)/care/questions/page.tsx` + `SuggestedQuestions.tsx` + test, `app/actions/questions.ts`, migration file, plus `lib/supabase/queries/care.ts`'s marked-question count (now sums `question_marks` and `custom_questions.is_marked` together, mirroring Session 22A's CareHub-wiring pattern).
- Depended on: nothing beyond Session 22's fixed route.

### Session 26 — Reports: capture, upload, view
Unchanged goal and files. Extend Step 4's test list (from the original plan) to cover the unclear-photo retake prompt and the "looks similar to one already added" prompt — both are pre-save UX states, no schema change.

### Session 27 — Doctor Visit Summary and print
Unchanged from the original plan. Depends on Sessions 22, 23, 25, 25A and 26 being merged (their data feeds the summary's sections). Does **not** depend on Session 24 — vitals render as "Nothing added yet" until that session ships.

## Coordination points

- **`CareHub.tsx` link wiring** is the one file every session touches conceptually. Fixed by Session 22 wiring all seven links up front — no later session needs to re-touch it *for routing*. Session 22A did touch it once more, but only because `personal_notes` was the one table that didn't exist yet at Session 22 time — its card was the sole one left on a permanent empty prompt, so 22A swapped it for a real preview (a one-line prop change plus matching query/page wiring). Advice and reports already had their tables (Migration 3) when Session 22 built the hub, so their cards are already wired live; Sessions 25 and 26 don't need to touch this file at all.
- **Migrations**: 22, 22A, 25 and 25A each add one. Don't pre-assign filenames — run `supabase migration new` at merge time so timestamps sequence correctly regardless of landing order. Whoever merges second rebases and re-runs `db reset` locally first, per the existing local-dev flow.
- **i18n**: each session adds to its own namespace (`care`, `notes`, `appointments`, `advice`, `questions`, `reports`, `summary`) — same convention as the rest of the plan. Conflicts only happen if two sessions land the same day.

## Recommended build order

| Order | Session | Why here |
|---|---|---|
| 1 | 22 | Unlocks every other route link; must go first. |
| 2 (any order, parallel-safe) | 22A, 23, 25, 26 | Each independent of the others once 22 is merged. Good candidates to split across two agents, the same way 20A/20B split off Session 20. |
| 3 | 25A | No hard dependency, but shares screen family with 25 — easiest to reason about right after it. |
| 4 | 27 | Needs 22, 23, 25, 25A, 26 merged. |
| whenever unblocked | 24 | Independent of everything above; slot in the moment markup arrives, including after 27. |

## Still open before any of this starts

1. Vitals and trend-chart designer markup — not yet sourced (Session 24).
2. Confirm the append-history shape for Doctor's Advice (`doctor_advice_updates` child table, per Decision 2) before Session 25 starts.
3. Confirm the custom-questions shape (`custom_questions` table, per Decision 3) before Session 25A starts.
4. Week-mapped suggested-questions content in both languages, still needed for Session 25A's seeded half (carried over from the original Session 25 Gate B).
