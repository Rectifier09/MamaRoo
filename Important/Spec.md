# MamaRoo — Phase 1 Design Specification

**Date:** 2026-09-11
**Status:** Approved. Amended 2026-09-11 (revision 5) and in sync with `Important/Implementation_Plan.md`.
Three external review rounds have been applied: 21 findings, then 7, then 6, each round smaller and
more local than the last. Every round's disposition is recorded in the plan's "External review
response" sections. The numbered changes below describe revision 3; revisions 4 and 5 refined those
same mechanisms rather than adding new scope.

**Revision 3 changes — all of these come from an external review of revision 2, and several correct
claims revision 2 made about itself that were not true:**

1. **§5 rewritten. The model no longer composes health answers.** Revision 2 enforced
   "retrieval-only" by requiring the answer to cite a passage id, which proves a reference was
   consulted but not that every sentence is entailed by it. The model's only job is now selecting
   which reviewed passage answers the question; the displayed text is that passage, verbatim. The
   provider interface's return type cannot carry prose.
2. **§3.5 composite foreign keys.** `user_id = auth.uid()` proved only child ownership, so a leaked
   UUID allowed attaching a log to another user's medicine. Six references are now composite keys
   with denial tests.
3. **§3.1 current-consent view.** Consent is append-only, and revision 2 asked "does any row say
   granted" — so withdrawal never took effect. Current consent is now the newest row per key, defined
   once as a view that every consumer reads.
4. **§7 provider-privacy claim corrected.** Revision 2 said no personal data is ever sent; her
   question text is sent and she can type a name into it. Now stated plainly, with a redaction pass.
5. **§1.4.5 analytics is an allowlist**, not a denylist of key names, which let health terms through
   under unlisted keys.
6. **§3.5 and §4.12 account deletion** now names its one sanctioned service-role path and the
   storage-before-user ordering.
7. **§3.3 vitals** separates physically impossible (reject) from clinically notable (save and note),
   which revision 2 conflated between the database and the UI.
8. **§10 offline timers** now require connectivity, matching the approved offline decision. Durable
   offline capture moved to §13.
9. **§3.2** adds `contractions.user_id` and replaces the kick timestamp array with the idempotent
   `kick_events` child table; **§3.4** binds passage locale to its parent with a composite key;
   **§11** extends coverage enforcement beyond `lib/domain/`.
10. **§3 table count is 23**, adding `kick_events`.
11. **§3.1 `consents.seq`**, a monotonic identity column, because the primary key is a random v4
    UUID and ordering by it is deterministic but not chronological — so a withdrawal sharing a
    timestamp with its grant could lose.
12. **§4.12 deletion requires fresh re-authentication** within a bounded window, not merely an
    existing session plus a typed word.

**Revision 2 changes, for a reviewer reading this after revision 1:**

1. **Analytics added to Phase 1** (PostHog, opt-in, no health data and no free text in any event).
   Touches §1.2, the new §1.4.5, §2.1, §3.1, §4.12, §7, §11 and §15 items 6 and 7.
2. **`question_marks` specified** in §3.4, and the table count stated as 22 at the head of §3, so
   the data layer closes in one place rather than gaining a table mid-build.
3. **§4.12 expanded** to name EDD correction, per-key consent withdrawal, analytics opt-out and
   the pregnancy-ended flow, all of which the plan builds.
4. **§12 updated** from "roughly 24 sessions" to the actual 36, and the two gates became three
   (design assets, medical content, credentials).
5. **§13 and §14 marked entirely optional**, with the reason each item was deferred.

**Design reference:** `Important/Design.md` (tokens, components, voice, accessibility). This spec
never restates a token value; it references tokens by name. Where this spec and the design
document disagree, the amendments in §1.3 are authoritative.

---

## 1. Scope and decisions

### 1.1 Problem this build addresses

Middle-income pregnant women in India get real guidance only during brief, infrequent doctor
visits. Between visits they have daily questions and no structured place for answers or records.
Phase 1 gives her a calm daily companion, a structured record of her own care, and a one-tap
summary she can hand to her doctor.

Phase 1 does **not** build a doctor-facing portal, a payment system, or anything post-delivery.

### 1.2 Decisions locked before implementation

| Area | Decision |
|---|---|
| Platform | Mobile-first PWA, installable; packaged for Google Play via Trusted Web Activity from day one |
| Framework | Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel |
| Backend | Supabase only (Postgres, Auth, Storage, RLS). No separate backend service |
| Supabase region | `ap-south-1` (Mumbai) |
| Auth (Phase 1) | Email OTP + Google sign-in. Phone OTP is Phase 2 |
| Bottom tabs | Today, My Baby, My Care, Reading, Profile |
| "Ask" severity flow | Entered from the Today screen's "How are you feeling today" voice/text box |
| Languages | Full bilingual UI (English + Hindi) from day one. Library content English-first; Hindi content is Phase 2 |
| Chatbot | Retrieval-only, corpus supplied by the product owner. Postgres full-text retrieval produces candidates; the model **selects** among them and never composes the answer (§5). Displayed health text is always a reviewed passage, verbatim |
| LLM provider | Google Gemini (free tier) behind a provider interface whose return type cannot carry prose. Model id is a config constant |
| Voice input | Web Speech API behind a swappable `transcribe()` interface. Audio is never persisted |
| Reminders | In-app only (Today screen + My Care). Push notifications are Phase 2 |
| Offline | App shell + last-good read-only data. Writes require connectivity |
| Reports | Camera capture + file upload, stored raw. No extraction in Phase 1 |
| Doctor Visit Summary | In Phase 1, including print and PDF export |
| Vitals | Light blood pressure + weight logging with trend charts, in My Care |
| Payments | None in Phase 1 |
| Analytics | **PostHog** in Phase 1, behind an `Analytics` provider interface. Opt-in, gated on an `analytics` consent row. No health data and no free text in any event (see §1.4.5 and §7) |
| Consent | Full consent register in Phase 1. Privacy policy and terms drafted in-repo, to be legally reviewed before launch |
| Testing | Strict TDD (see §11) |
| Scope boundary | Pregnancy only. No postpartum or newborn features |

### 1.3 Amendments to `Important/Design.md`

These override the design document where they conflict. The design document should be updated
to match; until then, this section is authoritative.

1. **Navigation (overrides §4).** Tabs are Today, My Baby, My Care, Reading, Profile — not
   Today, My Baby, My Care, Ask, More. Reading replaces Ask as a tab; Profile replaces More.
2. **The Ask flow has no tab.** It is reached from the Today screen's feeling check-in. The
   three-tier severity system (General / Contact clinic / Urgent) and the
   `Symptom-severity badge` composite are still built exactly as specified, and the chatbot's
   no-match path still routes into it.
3. **`texture-motif` exclusion list (amends §2).** The motif is disallowed on Today, My Baby,
   My Care and **Reading** (replacing "Ask" in the original list). It remains allowed on the
   splash screen, onboarding, and empty states.
4. **Screen-assembly ownership (amends §5.4).** Groupings are unchanged in spirit; "Ask" in the
   third grouping now means the feeling check-in plus triage screens.

### 1.4 Legal and regulatory constraints — binding

1. **PCPNDT Act (prenatal sex determination).** The product must never ask for, store, display,
   infer, or discuss the sex of the foetus. Concretely:
   - No gender field exists in any table, form, or API payload.
   - The nine baby illustrations and all copy are gender-neutral. No pink/blue gender coding.
   - No "gender guess", "gender reveal", or sex-prediction content of any kind.
   - The chatbot has an explicit refusal rule for sex-determination questions that fires
     **before** retrieval and before any provider call, returning a fixed plain-language response.
     This is a unit test, not a prompt instruction.
   - **The static scan walks the repository** rather than enumerating files, covering every shipped
     `.ts`, `.tsx`, `.json`, `.md`, `.sql`, `.html` and `.webmanifest` file, with a short audited
     exclusion list (dependencies, build output, the Android wrapper, and these planning documents,
     which discuss the prohibition by name). Enumerating files is how such a guard silently stops
     covering things, which is what revision 2 did.
   - **A post-response check** runs over **every field** about to be displayed in the chat panel,
     heading as well as body, so a contaminated corpus passage cannot reach her even if it passed
     content review. Checking the body alone was a revision 3 gap.
   - **Adversarial tests** cover transliteration, misspelling, mixed script, and indirect phrasing.
   - **Stated honestly:** a finite term list plus a corpus scan substantially reduces this risk; it
     cannot prove a negative. The corpus must also be reviewed for this prohibition specifically by
     the clinical reviewer, and that review is a launch gate, not a code artefact.
2. **DPDP Act 2023.** Health data is sensitive. Consequences enforced in this build: explicit
   granular consent recorded with version and locale (§7); data minimisation (no audio retention;
   nothing from her records sent to the LLM, and her question text redacted before egress per §7);
   India-region data storage for every record; a user-initiated
   account-and-data deletion path in Settings.
3. **Medical disclaimer.** Every AI-surfaced or content-surfaced health statement carries the
   `Section header / disclaimer banner` composite. The Doctor Visit Summary always states that
   information was entered by the user and is not medically verified.
4. **Google Play obligations.** Signed AAB, Data Safety declaration consistent with §7, a
   published privacy policy URL, content rating, and target API level maintenance.
5. **Analytics data minimisation (binding).** Neither PostHog nor any comparable vendor offers
   an India region, so analytics is hosted outside India. That is acceptable **only because no
   health data and no personal data are transmitted**. Concretely:
   - Events carry a name plus non-identifying properties only: enums, booleans, counts, week
     numbers, and buckets. Never free text.
   - Enforcement is a **per-event allowlist schema, not a denylist of bad key names.** Each event
     declares its exact permitted keys and, for each, an enum of permitted values or a numeric
     range. Any unknown key, and any value outside the declared set, is rejected at runtime. A
     denylist was the revision 2 design and it does not hold: `{ condition: "bleeding" }` passes a
     list of forbidden key names while carrying exactly the data the rule exists to stop. Free-text
     keys are not "discouraged" — they are unrepresentable, because no event schema declares one.
   - `track()` is the only exported capture surface, and a guard test scans the **whole** source
     tree (not only `app/` and `components/`) for any direct vendor import or call.
   - Capture is opt-in. The SDK initialises opted out and is opted in only after an `analytics`
     consent row exists. Withdrawal in Settings opts out and clears the stored identity.
   - `distinct_id` is the Supabase user id (a random UUID). No other identifier is sent, and IP
     capture is disabled.
   - Autocapture and automatic pageview capture are **off**: autocapture records the text of
     clicked elements, which in this product would sweep up medicine names and symptom text.
   - Session replay runs with all input masking and all text masking enabled, so a replay can
     never capture what she typed or read.
   - This reasoning is stated in the privacy policy and reflected in the Play Data Safety
     declaration.

---

## 2. Architecture

### 2.1 Repository layout

```
app/
  (public)/
    page.tsx                  Landing: language choice, Sign up, Sign in
    legal/privacy/page.tsx
    legal/terms/page.tsx
  (auth)/
    signup/page.tsx           Email OTP + Google
    signin/page.tsx
    verify/page.tsx           OTP entry / magic-link landing
    consent/page.tsx          Consent register (restrained register, §6 of design doc)
  (onboarding)/
    intro/page.tsx            Animated intro carousel
    profile/page.tsx          Onboarding form
  (app)/
    layout.tsx                App shell: bottom nav, chatbot bubble, safe areas
    today/page.tsx
    baby/page.tsx
    care/page.tsx
    care/medicines/…
    care/appointments/…
    care/advice/…
    care/reports/…
    care/vitals/…
    care/summary/page.tsx     Doctor Visit Summary (print register)
    reading/page.tsx
    reading/[slug]/page.tsx
    profile/page.tsx
    profile/contractions/page.tsx
    profile/prep/page.tsx
    profile/settings/page.tsx
    checkin/page.tsx          Feeling check-in + triage result
  api/
    chat/route.ts             Only route holding an AI provider key
components/
  ui/                         Primitives (§5.1 of design doc)
  patterns/                   Composites (§5.2 of design doc)
lib/
  domain/                     Pure functions. No I/O. 100% unit-tested
  supabase/                   server.ts, browser.ts, database.types.ts (generated)
  ai/                         provider.ts (interface), gemini.ts, retrieval.ts, guardrails.ts
  speech/                     transcribe.ts (interface), webspeech.ts
  analytics/                  provider.ts (interface), posthog.ts, events.ts, sanitise.ts
i18n/
  en.json, hi.json, request.ts
public/
  manifest.webmanifest, icons/, illustrations/, .well-known/assetlinks.json
supabase/
  migrations/                 SQL migrations including RLS policies
  seed/                       Content, symptom rules, suggested questions, checklist items
android/                      Bubblewrap TWA project (generated, committed)
```

### 2.2 The one architectural rule

**`lib/domain/` contains every calculation and performs no I/O.** Screens fetch data, pass it to
domain functions, and render the result. This is what makes strict TDD affordable: the logic that
breaks silently is testable without a database, a browser, or a network.

Functions that live there (each one tested first):

| Function | Responsibility |
|---|---|
| `pregnancyWeek(lmp \| edd, today)` | Returns `{ week, day, trimester }`; clamps to 0–42; handles post-EDD |
| `computeEdd(lmp)` / `eddFromScan(scanDate, scanWeeks)` | Naegele's rule and scan-based correction |
| `illustrationStage(week)` | Maps week → stage 1–9, with stage boundaries defined in one table |
| `adherence(medicine, logs, range)` | Returns the day-grid model and a taken/total ratio |
| `contractionStats(contractions)` | Average duration, average interval, regularity, 5-1-1 threshold flag |
| `kickSessionState(events, target)` | Count, elapsed, completion |
| `triage(text, rules, locale)` | Returns `{ severity, matchedRuleId, guidanceKey }` or no-match |
| `suggestedQuestions(week, locale, questions)` | Selects week-appropriate questions |
| `visitSummaryModel(profile, pregnancy, medicines, appointments, advice, vitals, reports)` | Builds the summary view model |
| `localeFallback(item, locale)` | Content locale resolution with an "English only" marker |

### 2.3 Data flow

- Server Components read via the Supabase server client for first paint.
- Client Components (timers, forms, chat) use the Supabase browser client; RLS is the only
  authorisation layer, so no privileged key ever reaches the client.
- The service worker caches the app shell and the last successful response per route. Cached
  data renders read-only with a visible offline state; write controls are disabled with an
  explanation rather than silently failing.
- The chat route is the only server route with a secret. It receives a question and a locale,
  never her records.

---

## 3. Data model

**23 tables**, all created by migration before any screen is built: 3 identity (§3.1), 6 daily
(§3.2), 6 care (§3.3), 8 content and chat (§3.4). The count is stated here so a plan or a
migration that creates a different number is visibly out of line with this spec.

All tables live in `public`. Every user-owned table has `user_id uuid not null references
auth.users(id) on delete cascade`, `created_at timestamptz default now()`, and exactly one RLS
policy family: `user_id = auth.uid()` for select, insert, update, delete.

Dates that represent a calendar day are `date` (interpreted as Asia/Kolkata). Moments are
`timestamptz` stored in UTC.

### 3.1 Identity and pregnancy

**`profiles`** — one row per user.
`id` (PK, = `auth.users.id`), `display_name`, `locale` (`'en' | 'hi'`), `birth_year` int null,
`city` text null, `is_first_pregnancy` bool null, `height_cm` numeric null,
`pre_pregnancy_weight_kg` numeric null, `doctor_name` text null, `clinic_name` text null,
`onboarding_completed_at` timestamptz null.

`onboarding_completed_at` is the gate used by middleware. No separate flag.

**`pregnancies`**
`id`, `user_id`, `lmp_date` date null, `edd` date not null, `edd_source`
(`'lmp' | 'scan' | 'manual'`), `baby_name` text null, `status`
(`'active' | 'ended'`), `ended_at` timestamptz null, `ended_reason` text null.

Rationale: EDD is stored because it can be corrected by a scan; the current week is **always**
derived from it and never stored. At most one `status = 'active'` row per user (enforced by a
partial unique index). **No sex/gender column exists** (§1.4).

**`consents`** — append-only.
`id`, `seq` (bigint identity), `user_id`, `consent_key` (exactly `'terms' | 'privacy' |
'optional_data_sharing' | 'analytics'`), `version` text, `granted` bool, `locale`, `granted_at`.
Never updated or deleted; a withdrawal is a new row with `granted = false`.

`terms` and `privacy` are the required baseline. `optional_data_sharing` (future doctor portal)
and `analytics` are separate, un-checked, genuinely optional boxes — never bundled with the
baseline and never pre-checked (§1.4.5, design document §6).

**Current consent is the newest row per `(user_id, consent_key)`, ordered by
`granted_at DESC, seq DESC`.** `seq` is a monotonic identity column, not the primary key: `id` is a
random v4 UUID, so ordering by it is deterministic but carries no chronology, and among rows
sharing `granted_at` the withdrawal could lose to the grant it replaced. This rule is defined exactly once, as a database view
(`current_consents`), reached through one shared function, `getCurrentConsents()`. Its three
consumers are the routing middleware, the analytics mount, and the Settings screen. The Doctor Visit
Summary is **not** a consumer: it renders her own records and needs no consent lookup. Reading the raw table and asking "does any row
have `granted = true`" is forbidden, because on an append-only table a withdrawal would never take
effect — which is precisely the bug this rule exists to prevent. The `seq DESC` tiebreaker matters
because the four baseline rows are inserted in one batch and share a timestamp.

All three consumers call `getCurrentConsents(supabase)`, which returns the granted flag, the policy
version and the date per key — Settings displays all three — and a guard test asserts no other file
reads the view or the table for this purpose. Absence of a row means not granted.

Withdrawing `terms` or `privacy` is not a way to keep using the product without consent: the
Settings screen presents that withdrawal as account deletion, and performs it.

### 3.2 Daily experience

**`checkins`** — the "How are you feeling today" entries.
`id`, `user_id`, `pregnancy_id`, `body` text, `input_method` (`'text' | 'voice'`),
`severity` (`'general' | 'contact_clinic' | 'urgent'` | null), `matched_rule_id` null,
`created_at`.

**`timeline_events`** — powers the merged My Baby timeline in one query.
`id`, `user_id`, `pregnancy_id`, `source` (`'user' | 'system'`), `event_type`
(`'kick_session' | 'appointment' | 'report' | 'checkin' | 'stage_change' | 'note' | 'vital'`),
`occurred_at` timestamptz, `title` text, `body` text null, `ref_table` text null,
`ref_id` uuid null.

System week-milestone content is **not** stored here; it is derived from week number and content
rows at render time, then merged with these rows in `lib/domain`. This keeps the table free of
duplicated content.

**`kick_sessions`** / **`kick_events`**
Session: `id`, `user_id`, `pregnancy_id`, `started_at`, `ended_at` null, `target_count` int
default 10.
Event: `id`, `user_id`, `session_id`, `tap_id` uuid, `occurred_at`. Unique on
`(session_id, tap_id)`.

One row per tap, keyed by a **client-generated `tap_id`**. Two earlier designs were rejected: a
`timestamptz[]` column written by the client (a read-modify-write that drops taps whenever two
writes overlap) and the same array appended by a database function (safe under concurrency, but a
retry after a lost response appends a second timestamp and overstates the count). The unique
`(session_id, tap_id)` constraint makes a retry a no-op, which is the property actually needed on a
screen where taps arrive in bursts over a flaky connection. The count is always derived from the
rows, never stored.

**`contraction_sessions`** / **`contractions`**
Session: `id`, `user_id`, `started_at`, `ended_at` null.
Contraction: `id`, **`user_id`**, `session_id`, `started_at`, `duration_seconds` int null.
A child table here because intervals between rows are the whole point of the feature.
`user_id` is denormalised onto the child so RLS can authorise it directly without a subquery, and
`duration_seconds` is nullable because a contraction that was started and never stopped is a real
state the UI must be able to record.

### 3.3 My Care

**`medicines`**
`id`, `user_id`, `name`, `dosage` text null, `form` text null, `schedule_times time[]`,
`days_of_week int[]` (1–7, null = daily), `start_date` date, `end_date` date null,
`notes` text null, `is_active` bool default true.

**`medicine_logs`**
`id`, `user_id`, `medicine_id`, `scheduled_date` date, `scheduled_time` time,
`status` (`'taken' | 'skipped'`), `logged_at`.
Unique on `(medicine_id, scheduled_date, scheduled_time)`. A missing row means "not logged";
"missed" is derived, never stored, so a late log is always possible.

**`appointments`**
`id`, `user_id`, `title`, `doctor_name` null, `clinic_name` null, `scheduled_at` timestamptz,
`location` text null, `notes` text null, `status` (`'upcoming' | 'completed' | 'cancelled'`).

**`doctor_advice`**
`id`, `user_id`, `appointment_id` null, `recorded_on` date, `body` text,
`input_method` (`'text' | 'voice'`).

**`vitals`**
`id`, `user_id`, `measured_on` date, `kind` (`'weight' | 'bp'`), `value_1` numeric,
`value_2` numeric null, `notes` text null.

**Two distinct boundaries, which revision 2 conflated and which the database and the UI must not
disagree about:**

- *Physically impossible* values are rejected by a database CHECK and by the form: a weight outside
  25–250 kg, a systolic outside 50–300, a diastolic outside 30–200, or a diastolic at or above the
  systolic. These are data-entry errors, not readings.
- *Clinically notable but possible* values are **accepted and saved**, with a non-diagnostic note
  and the disclaimer banner. The database has no opinion about these, and the UI never blocks them.
  Thresholds and wording are product-owner content, never invented by the implementer.

Blocking a real reading would be the worse failure of the two: a woman with genuinely high blood
pressure must be able to record it.
`weight`: `value_1` = kg. `bp`: `value_1` = systolic, `value_2` = diastolic. One table rather
than two because the chart, the list row, and the summary section are identical in shape.

**`reports`** — metadata only.
`id`, `user_id`, `title`, `report_type` text null, `report_date` date, `storage_path` text,
`mime_type` text, `size_bytes` bigint, `page_count` int null.
File lives in the private `reports` bucket at `{user_id}/{report_id}/{filename}`. Access only
via short-lived signed URLs.

### 3.4 Content, marks and chat

Content tables are read-only to users: they carry a `select` policy and no insert, update or
delete policy at all, so content is writable only by migrations and seeds. The two user-owned
tables in this group — `question_marks` and `checklist_progress` — and `chat_messages` follow the
standard `user_id = auth.uid()` policy family instead.

**`content_items`**
`id`, `slug` text, `locale`, `kind` (`'article' | 'video' | 'audio'`), `title`, `summary`,
`body_md` text null, `media_url` text null, `duration_seconds` int null,
`week_min` int null, `week_max` int null, `tags text[]`, `is_published` bool,
`narration_url` text null.
Unique on `(slug, locale)`. One row per locale — so a Hindi translation can land item by item
without blocking, and `localeFallback()` can surface an "English only" marker.

**`content_passages`** — retrieval units for the chatbot. Its `(content_item_id, locale)` pair is a
**composite foreign key** to a unique `(id, locale)` on `content_items`, so a passage can never be
labelled with a locale its parent item does not have. Without that binding a Hindi-labelled passage
could hang off an English item and be served to a Hindi reader with no "English only" marker.
`id`, `content_item_id`, `heading` text null, `body` text, `locale`,
`search_tsv tsvector generated`, GIN-indexed.

**`symptom_rules`** — the red-flag triage content.
`id`, `locale`, `match_terms text[]`, `severity`, `guidance_title`, `guidance_body`,
`priority` int, `is_active` bool.
Matching is deterministic and ordered by `priority`; highest-severity match wins. Rules are
product-owner-supplied content, not code.

**`suggested_questions`**
`id`, `locale`, `week_min`, `week_max`, `body`, `priority`, `is_active`.

**`question_marks`** — the questions she has marked to carry into her next visit.
`id`, `user_id`, `suggested_question_id`, `created_at`. Unique per pair. User-owned, so standard
RLS applies. Kept as its own table rather than a column on another, because a mark belongs to
neither the question (which is shared content) nor the appointment (which may not exist yet).
These marks are what the Doctor Visit Summary's questions section reads.

**`checklist_items`** (seeded) and **`checklist_progress`** (per user).
Item: `id`, `locale`, `category` (`'hospital_bag' | 'documents' | 'birth_prep' | 'home'`),
`body`, `sort_order`, `content_item_slug` text null.
Progress: `id`, `user_id`, `checklist_item_id`, `is_done`, `done_at`. Unique per pair.

**`chat_messages`**
`id`, `user_id`, `role` (`'user' | 'assistant'`), `body`, `retrieved_passage_ids uuid[]`,
`answer_kind` (`'data' | 'retrieved' | 'no_match' | 'refused'`), `created_at`.

### 3.5 Security posture

- RLS enabled on every table, with no exceptions and no permissive fallback policy.
- Content tables: `select` allowed to `authenticated` where `is_published = true`. No
  insert/update/delete policy at all, so content is writable only via migrations and seeds.
- `reports` storage bucket is private, with a storage policy matching the `{user_id}/` path
  prefix against `auth.uid()`.
- **Ownership of a referenced parent is enforced by the schema, not assumed.** `user_id =
  auth.uid()` on the row being written proves only that she owns the *child*. A foreign key proves
  the parent *exists*, not that it is hers — so without more, she could attach a medicine log to
  someone else's medicine, a contraction to someone else's session, or a check-in to someone else's
  pregnancy, given a leaked UUID. Every reference from a user-owned row to another user-owned row is
  therefore a **composite foreign key including `user_id`**, against a matching unique key on the
  parent:

  | Child | Composite foreign key |
  |---|---|
  | `checkins` | `(pregnancy_id, user_id) → pregnancies(id, user_id)` |
  | `timeline_events` | `(pregnancy_id, user_id) → pregnancies(id, user_id)` |
  | `kick_sessions` | `(pregnancy_id, user_id) → pregnancies(id, user_id)` |
  | `contractions` | `(session_id, user_id) → contraction_sessions(id, user_id)` |
  | `medicine_logs` | `(medicine_id, user_id) → medicines(id, user_id)` |
  | `doctor_advice` | `(appointment_id, user_id) → appointments(id, user_id)` |

  References to shared content (`question_marks.suggested_question_id`,
  `checklist_progress.checklist_item_id`, `content_passages.content_item_id`) need no `user_id`
  component, because the parent is not user-owned. Each composite key has an explicit
  parent-owned-by-someone-else denial test.
- The Supabase service-role key exists only in Vercel server environment variables. Exactly **one**
  application code path may use it: the account-deletion action (§4.12), which must call
  `auth.admin.deleteUser`, an operation no anon-key client can perform. That path lives in a
  server-only module that the client bundle cannot import, and a guard test asserts the key appears
  in no other file.
- A test asserts that for every table in `public`, `rowsecurity` is true. The diagnostic function
  backing that test has `EXECUTE` revoked from `PUBLIC` before being granted to `service_role` —
  revoking from `anon` and `authenticated` alone leaves the default `PUBLIC` grant in place, which
  would make the restriction cosmetic.

---

## 4. Screen specifications

Every screen is built from the designer's supplied HTML/CSS and Lottie assets. **No screen
layout is invented.** Each screen session begins by requesting the asset; if it has not arrived,
that session is skipped rather than guessed at. The specifications below define behaviour, data
and states — not visual layout.

### 4.1 Landing (`/`)

Logo, tagline, two language buttons ("Continue in English", "हिंदी में जारी रखें"), then
Sign up and Sign in. Language selection writes to `localStorage` and a cookie, then the app
renders in that language immediately. An authenticated user with a completed profile is
redirected to `/today`; authenticated without one goes to `/onboarding/profile`.

Register: standard warm register, `texture-motif` allowed, single primary action per the
hierarchy law.

### 4.2 Onboarding intro (`/onboarding/intro`)

A short carousel (3–4 panels) of duotone illustration and one line of copy each, with Skip
always available. Lottie via the `Illustration container` composite, so reduced-motion and
load-failure fallbacks are inherited rather than reimplemented.

### 4.3 Signup / signin / verify

- Email OTP: email entry → OTP sent → six-digit entry → session. Resend is rate-limited with a
  visible countdown; expiry and incorrect-code states have specific messages.
- Google: Supabase OAuth. If the Google email matches an existing email-OTP account, Supabase
  links the identity; the UI must not present this as a duplicate-account error.
- On first successful auth, the consent screen is shown before anything else.

### 4.4 Consent (`/consent`)

Restrained register (design doc §6). A plain-language two-line summary above the full text,
links to `/legal/privacy` and `/legal/terms` as tertiary text links, a required baseline consent
checkbox, and a **separate, un-checked, optional** data-sharing checkbox for future doctor-portal
sharing. The language switcher is present on this screen. Each checkbox state writes a
`consents` row with the policy version and locale.

### 4.5 Onboarding form (`/onboarding/profile`)

Collects: name; LMP date **or** known EDD (a toggle between the two, with the other derived and
shown); age (year of birth); first pregnancy (yes/no); height; pre-pregnancy weight; doctor name;
clinic name; city. Native input types throughout. Doctor, clinic, city, height and weight are
optional; name and LMP-or-EDD are required.

On submit: write `profiles` + one `pregnancies` row, set `onboarding_completed_at`, redirect to
`/today`. Draft state is preserved in `sessionStorage` so an interrupted form is never lost.

### 4.6 Today (`/today`)

The calm screen. Contents, in order:
1. Greeting with name, current week and day.
2. Baby illustration for the current stage (`Illustration container`), tapping through to
   My Baby.
3. Reminders: the next appointment, today's unlogged medicines, and any overdue item.
   A gentle empty state when there is nothing due. Gentle language on anything missed, never
   failure language.
4. Recommended reading: 1–2 `content_items` matching the current week.
5. "How are you feeling today" — a text field with a mic button, opening `/checkin`.

`texture-motif` is not permitted here. Exactly one primary-emphasis element.

### 4.7 Feeling check-in and triage (`/checkin`)

Text or voice input. On submit, `triage()` runs locally against cached `symptom_rules`:
- **General** → a calm acknowledgement, the entry saved, optional related reading.
- **Contact clinic** → the `Symptom-severity badge`, plain guidance, and the doctor/clinic name
  from her profile shown for context.
- **Urgent** → the urgent badge, guidance, and a clear prompt to seek care now. This guidance
  must render from cache when offline.
- **No match** → the entry is saved as a note with no severity claim and no guessed answer.

Every outcome carries the disclaimer banner. Voice transcription is text-only; audio is
discarded immediately after transcription and never uploaded.

### 4.8 My Baby (`/baby`)

Baby illustration for the current stage, the `Stage-progress indicator` (9 stages, updating at
stage boundaries only), an editable baby name, a kick-counter entry point, and the merged
timeline — system week milestones interleaved with her `timeline_events`, reverse-chronological,
with a "show more" pattern beyond 15 items.

Kick counter (`/baby/kicks`): a large tap target incrementing the count, elapsed time, target of
10, a finish action that writes the session and a `timeline_events` row. An abandoned session
(no finish) is recoverable on return rather than lost.

### 4.9 My Care (`/care`)

A hub listing Medicines, Appointments, Doctor advice, Vitals, Reports, and Doctor Visit Summary,
each with a one-line current-state summary.

- **Medicines** — manual entry per §3.3. The list shows today's doses with log actions and an
  adherence day-grid for the last 14 days (visual-first, per design doc §1).
- **Appointments** — list split into upcoming and past, create/edit/cancel, and notes.
- **Doctor advice** — per-visit notes, text or voice, optionally linked to an appointment.
- **Vitals** — weight and BP entry, with trend charts using the `chart-*` tokens, a
  `chart-normal-range` band for BP, and non-colour series differentiation per design doc §2.
- **Reports** — capture or upload, label, type and date. Thumbnail list, tap to view via a
  signed URL. Raw storage only; no extraction in Phase 1, stated plainly in the UI.
- **Suggested questions** — week-appropriate questions from `suggested_questions`, with the
  ability to mark one to carry into the next visit. Rule-based, no AI.

### 4.10 Doctor Visit Summary (`/care/summary`)

Restrained register (design doc §6): no illustration, no motion, no motif, generous white space,
two colours only.

Sections: her name, week and EDD; doctor and clinic; current medicines with dosage and
adherence; recent vitals; recent symptoms and check-ins; doctor advice from previous visits;
available reports, listed by name and date; her marked questions for this visit. Every page
carries the date and the "information entered by the user, not medically verified" line.

Print and PDF follow design doc §6 exactly: `@media print` hides nav and the chat bubble,
15 mm margins, `break-inside: avoid` on every row and section, `print-color-adjust: exact`, and
a repeating header/footer across pages. PDF export is the browser's own print-to-PDF; no PDF
library is added.

### 4.11 Reading (`/reading`, `/reading/[slug]`)

Filterable list (articles, videos, audios) with week-relevant items first. Detail renders
markdown for articles and a native player for video and audio. Items without a Hindi row show
the English version with a clear "English only" marker rather than disappearing. The chatbot
bubble is present here as on every app screen.

### 4.12 Profile (`/profile`)

Entry points to Contraction timer, Pregnancy preparation, and Settings, plus her basic details.

- **Contraction timer** (`/profile/contractions`) — start/stop per contraction, a live list of
  duration and interval, running averages, and a 5-1-1 guidance note when the pattern is met
  (guidance only, never a diagnosis, always with the disclaimer banner). Must survive the screen
  sleeping: timing is computed from stored timestamps, never from an in-memory interval counter.
- **Pregnancy preparation** (`/profile/prep`) — hospital bag, documents, birth prep and home
  checklists with per-item ticks, progress shown as a ring, and items optionally linking to a
  related article.
- **Settings** (`/profile/settings`) — language, profile details, EDD correction (which updates
  `pregnancies.edd` and `edd_source`, recomputing every displayed week immediately), consent
  review and withdrawal per key, analytics opt-out, data export, account and data deletion,
  marking a pregnancy as ended, app version, and links to legal pages.
  Withdrawing analytics consent opts the SDK out and clears its stored identity in the same
  action; withdrawing any consent writes a new `granted = false` row and never edits the old one,
  and takes effect immediately because every consumer reads the `current_consents` view (§3.1).

  **Account deletion** requires typing a confirmation word, states plainly that report files are
  deleted too, and runs in this order: delete every storage object under `{user_id}/`, then delete
  the auth user (which cascades every metadata row). That order matters — the cascade removes the
  `reports` rows that name the files, so deleting the user first orphans the objects with nothing
  left pointing at them. Deleting an auth user needs `auth.admin.deleteUser`, so this is the single
  sanctioned service-role code path (§3.5), in a server-only module, and it re-checks the session
  before acting.

### 4.13 Chatbot (bubble, present on every app screen)

Bottom sheet panel per the design doc's component entry. Behaviour is §5 of this spec.

---

## 5. Chatbot and AI subsystem

> **Revision 3 change, and the most important decision in this section.** Revision 2 let the model
> compose the health answer from retrieved passages, and enforced "retrieval-only" by requiring the
> response to cite at least one passage id. **That does not work.** A citation proves a reference
> was consulted; it does not prove every sentence is entailed by it. The model could cite a real
> passage and append an unsupported dosage, instruction or reassurance, and the check would pass.
>
> The fix keeps the model and removes the composition. **The model's only job is selection:** given
> the question and a short list of candidate passages, it returns the id of the passage that answers
> it, or nothing. The text she reads is always the stored passage, reproduced byte for byte. So the
> model improves *which* reviewed answer she gets — which is where lexical search is weakest,
> especially for Hinglish — and has no ability to author medical prose.

### 5.1 Request pipeline (`app/api/chat/route.ts`)

```
1. Guardrail pass (deterministic, pre-model)
   - Sex-determination intent  → fixed refusal, answer_kind = 'refused'. No model call.
   - Emergency phrasing        → urgent severity response + triage hand-off. No model call.
2. Intent classification (deterministic keyword/pattern matching only; no model)
   - 'data'       → her own records or an app action
   - 'health'     → a health question
3a. 'data'  → run a whitelisted, parameterised query as her (RLS-scoped), render the answer
              from a locale template. No model call. No data leaves the process.
3b. 'health'→ full-text retrieval over content_passages produces up to 5 candidates.
              - no candidate above threshold → no_match + triage hand-off. No model call.
              - candidates found → SELECTION step: send the question plus the candidate
                passages to the provider and ask for the id of the one that answers it, or
                "none". The provider returns an id, never prose.
              - returned id is not one of the candidate ids, or is "none" → no_match.
              - returned id is a candidate → respond with THAT STORED PASSAGE, VERBATIM,
                plus its heading and a link to its content item.
4. Response assembly: verbatim passage + disclaimer banner + source link + answer_kind.
5. Persist a chat_messages row recording the candidate ids and the selected id.
```

**The model never authors a character of what she reads.** Its output is consumed as an
identifier, validated against the candidate set, and discarded. Everything displayed in the chat
panel is medically reviewed text reproduced byte for byte, a locale template filled from her own
rows, a fixed refusal, or a plain "I don't know" routed into triage.

What this buys over pure lexical retrieval: the model resolves a Hinglish or loosely-worded
question to the right reviewed passage, which is exactly where `simple`-configuration full-text
search is weakest. What it cannot do: invent, summarise, soften, combine, or extend a medical
statement.

The accepted cost is that an answer reads like a passage rather than a reply. §13 carries the
Phase 2 work that would relax this, and the bar for doing so: a genuine entailment mechanism plus
medical review of generated output, never a prompt instruction plus a self-reported citation.

### 5.2 Provider abstraction

`lib/ai/provider.ts` exports a single interface, and its shape is what enforces the rule — the
return type cannot carry prose:

```ts
export interface AiProvider {
  /**
   * Selects which candidate passage answers the question. Returns an id from
   * `candidates`, or null for "none of these". It has no way to return text:
   * the type system is the first line of the retrieval-only guarantee.
   */
  selectPassage(args: {
    question: string;
    candidates: { id: string; heading: string | null; body: string }[];
    locale: "en" | "hi";
  }): Promise<{ selectedId: string | null }>;
}
```

`gemini.ts` implements it and is the only file importing the provider SDK. The model id lives in
one config constant and is verified against current provider documentation at implementation time
rather than written from memory. The route validates `selectedId` against the candidate ids it
sent, so a hallucinated or malformed id becomes `no_match` rather than an error or a wrong answer.

Switching to Claude, or any other provider, is a new file implementing the same interface plus one
config change.

### 5.3 Non-negotiable guarantees (each one a test)

1. **No response body is ever model-authored.** The body of a health answer is byte-identical to
   the stored passage whose id was selected, or the answer is `no_match`. Asserted by comparing
   the response body to the database row. This replaces revision 2's citation check, which proved
   nothing about the body.
2. **A provider return value that is not a candidate id is discarded.** An unknown id, a
   malformed value, prose, or `null` all produce `no_match` and the triage hand-off.
3. Below-threshold retrieval returns `no_match` with no model call at all.
4. Sex-determination questions are refused before retrieval and before any other branch.
5. Provider unavailability, timeout or rate-limiting degrades to the top lexical match, or to
   `no_match` plus a content search. Never an error screen, and never a composed answer.
6. A Hindi question with only English candidates returns the English passage verbatim with the
   "English only" marker. Nothing is translated at request time, because a machine translation of
   reviewed text is not reviewed text.
7. **No data from her records is ever included in a provider request.** The selection request
   carries her question text and public reviewed passages, and nothing else. Her question text
   *is* sent, which §7 states plainly rather than claiming otherwise, and which the redaction rule
   in §7 narrows.

### 5.4 Voice input

`lib/speech/transcribe.ts` exposes `isAvailable()` and `transcribe({ locale })`.
`webspeech.ts` implements it with `hi-IN` and `en-IN`. Where unavailable, the mic button is
hidden (not disabled) and the text field is the only input, with no error shown. Permission
denial shows a single plain explanation and falls back to text. No audio buffer is retained
after the transcript resolves, and none is ever uploaded.

---

## 6. Design system implementation

Build order, enforced by the session order in the implementation plan: **tokens → primitives →
composites → screens.** Nothing that composes a primitive is built before that primitive exists.

- Tokens from design doc §2 become CSS custom properties plus a Tailwind theme extension. Hex
  values appear in exactly one file. A test fails the build if a raw hex appears anywhere in
  `components/` or `app/`.
- Primitives: Button, Card, Input, Checkbox, Toggle, in-page Tab, Toast, Modal/BottomSheet,
  IconWrapper — each with every state from design doc §5.1 and its listed edge case covered by a
  test.
- Composites: EmptyState, LoadingSkeleton, ErrorBanner, IllustrationContainer, AudioIndicator,
  LanguageSwitcher, SymptomSeverityBadge, StageProgressIndicator, ListRow, SectionHeader,
  DisclaimerBanner, ChatEntry, ChatPanel.
- A `/dev/components` gallery route (development only) renders every component in every state in
  both languages. This is the artefact used for visual review and bilingual checking.
- Phosphor Icons, regular weight, tree-shaken per-icon imports. Duotone only in empty states,
  onboarding and hero moments.
- Motion tokens only; no ad-hoc durations. `prefers-reduced-motion` handled once in the
  `IllustrationContainer` and in a shared motion utility, never per screen.

---

## 7. Privacy, consent and data handling

| Concern | Implementation |
|---|---|
| Consent record | `consents` rows, append-only, with policy version and locale |
| Optional sharing | A separate, un-checked checkbox, never bundled with baseline consent |
| Analytics | PostHog, hosted outside India. Opt-in on the `analytics` consent row, opt-out in Settings. Events carry enums, counts, booleans and buckets only; a runtime sanitiser throws on any forbidden key or prose-like string. Autocapture off, IP capture off, session replay fully masked (§1.4.5) |
| Data residency | Supabase `ap-south-1`; Vercel functions pinned to the Mumbai region |
| Audio | Transcribed client-side, never uploaded, never stored |
| LLM exposure | **Her question text and public reviewed passages are sent; nothing from her records is.** Stated this way deliberately: revision 2 claimed "no personal data, ever", which was false, because she can type a name or a doctor's name into the question itself. Before egress, the question passes a conservative redaction pass (see below). No response text from the provider is ever displayed |
| Question redaction | Before the selection request leaves the process, the question is scanned and redacted for: anything matching an email address, a phone number, a long digit sequence, and any value that matches her own `display_name`, `doctor_name` or `clinic_name` from her profile. Redaction replaces the span with a placeholder token. The redacted form is what is sent and what is logged. This is a best-effort narrowing, not a guarantee, and the privacy policy says so |
| Report files | Private bucket, path-prefixed RLS, short-lived signed URLs only |
| Deletion | Settings action deletes the auth user; every table cascades |
| Export | Settings action produces a JSON export of her own rows |
| Policy documents | Drafted in-repo as `app/(public)/legal/*`, versioned, flagged clearly as requiring legal review before launch |
| Play Data Safety | Declaration derived from this table, kept in the repo so it does not drift |

---

## 8. PWA, offline and Play Store

**Manifest:** name and short name from the product-name constant, `display: standalone`,
`theme_color` = `color-bg`, maskable icons at 192/512, portrait orientation, `start_url: /today`.

**Service worker (Serwist):** precache the app shell, fonts, illustration assets and the urgent
triage guidance. Runtime caching is stale-while-revalidate per route for read data. A single
`useOnline()` hook drives a consistent offline banner; all write controls disable with an
explanation when offline.

**Transitions:** View Transitions API for screen changes and the illustration stage morph, with
a crossfade fallback, verified on a real mid-range Android device rather than assumed.

**Safe areas, native inputs, haptics, fonts:** per design doc §3, with haptics as a silent
no-op where unsupported.

**TWA:** Bubblewrap project committed under `android/`. `assetlinks.json` served from
`/.well-known/` on the production domain. Store readiness is its own session: signed AAB, Data
Safety form, screenshots in both languages, content rating, privacy policy URL.

**iOS constraints acknowledged:** no push in Phase 1 regardless; Safari may evict local storage,
so nothing authoritative is kept client-side — drafts only.

---

## 9. Error handling

- Every data fetch has three defined states: loading (skeleton, never a spinner), empty (the
  `EmptyState` composite with section-specific copy), and error (the `ErrorBanner` composite
  with a plain explanation and a next step).
- No error message is generic. Form errors state the constraint ("Enter a weight between 30 and
  200 kg"), never "Invalid input".
- Auth failures distinguish expired OTP, wrong OTP, rate-limited resend, and network failure.
- Upload failures state the reason (too large, unsupported type, offline) and preserve the form.
- A failed AI call degrades to content search, never an error screen.
- Offline write attempts are blocked visibly and explained before they are attempted.

---

## 10. Edge cases (must be covered by tests or explicit UI states)

**Dates and pregnancy**
LMP in the future; LMP more than 44 weeks ago; EDD corrected by a later scan (week recomputes,
history preserved); week beyond 40 (post-EDD holding state, illustration stays at stage 9);
pregnancy marked ended (gentle exit state; no features error out); a user starting a second
pregnancy later; all day boundaries evaluated in Asia/Kolkata while stored in UTC.

**Language and text**
Devanagari running 15–30% longer than English; 200% text scale with no clipping or overlap;
a translation key missing in one language (build fails rather than shipping a blank label);
mixed-script input in a single field.

**Auth**
OTP email in spam; OTP expired; resend throttled; Google email matching an existing OTP account;
session expiring mid-form; a deep link arriving while signed out (return to intended screen
after auth).

**Voice**
Web Speech unavailable (mic hidden, no error); permission denied; no speech detected; a
transcript in the other language; a transcript arriving after the user has started typing.

**My Care**
Two medicines with the same name; a dose scheduled across midnight; a dose logged late (a past
dose is always loggable); a medicine ended while unlogged doses remain; two appointments at the
same moment; an appointment in the past still marked upcoming; a BP value outside plausible
range (warn, do not block); a report over 10 MB; an iPhone HEIC upload; a PDF with many pages;
a signed URL expiring while the viewer is open.

**Timers**
Kick session abandoned without finishing (recoverable); kick session left open overnight
(auto-closed after twelve hours); contraction timer with the screen asleep or the app backgrounded
(computed from timestamps, never from a running counter); a contraction started but never stopped;
two taps arriving at once (distinct `tap_id`s, both recorded) or one retried after a lost response
(the same `tap_id`, recorded once).

**Timers while offline.** Both timers require connectivity, like every other write in Phase 1. A
tap or a start while offline is refused with a plain explanation, not accepted locally and queued.
Revision 2 let them accept input offline and promised it would save later, which without a durable
queue could silently discard kicks or contractions — the worst possible failure for a screen a woman
may be using while deciding whether to go to hospital. Offline timer capture with a real durable
queue is a Phase 2 item (§13), deliberately deferred rather than half-built.

**Chatbot**
Out-of-scope question; sex-determination question; emergency phrasing; Hindi question against
English-only content; the provider rate-limited or down; an empty corpus (the bot says so
plainly rather than appearing broken).

**Summary and print**
A summary with no data at all; a summary spanning three pages; printing from Android Chrome and
iOS Safari (both verified manually).

**Navigation**
Back gesture closing a bottom sheet rather than leaving the screen; an interrupted flow
preserving state exactly; a deep link landing on a screen with a visible path to Today.

---

## 11. Testing strategy

Strict TDD: a failing test precedes the implementation for every unit below.

| Layer | Tool | What is tested |
|---|---|---|
| `lib/domain/` | Vitest | Every function, including every edge case in §10 that is calculable. Full branch coverage enforced |
| `lib/ai/` | Vitest | Guardrail refusals, intent classification, retrieval thresholds, and the assertion that no personal data leaves the process |
| `lib/analytics/` | Vitest | The property sanitiser rejects every forbidden key and every prose-like string; nothing is captured before consent; withdrawal opts out and resets; no event name is written as an inline literal |
| Primitives and composites | Vitest + Testing Library | Every state in design doc §5, in both locales |
| i18n | Vitest | Key parity between `en.json` and `hi.json`; build fails on a missing key |
| Tokens | Vitest | No raw hex, no raw pixel durations outside the token files |
| RLS and schema | Vitest against a local Supabase | Cross-user read and write denial per table; RLS enabled on every table |
| Screens | Vitest + Testing Library | Data states, form validation, and logic. Not pixel layout |
| End to end | Playwright | Language → signup → consent → onboarding → Today → log a medicine → open the summary |
| Accessibility | axe via Playwright | Every screen, both locales |
| Manual | Checklist | Real mid-range Android device, real iPhone, print output, 200% text, VoiceOver and TalkBack spot checks |

**Branch coverage is enforced where a silent failure is harmful, not where code is merely
plentiful.** That means 100% branch coverage on `lib/domain/`, `lib/ai/` (guardrails, intent,
retrieval, and the selection-validation path), `lib/analytics/` (the event schemas), the chat route,
the consent-resolution path, and the export and deletion actions. Ordinary UI code is tested for
behaviour and carries no coverage threshold — a percentage target there buys assertions about
markup, which is exactly what this plan avoids.

---

## 12. Phase 1 delivery shape

**36 implementation sessions**, numbered 0 to 35 with one inserted as 17A, sequenced as:
scaffold → tokens → primitives (two sessions) → i18n → composites (two sessions) → schema and
RLS (four sessions) → domain library → auth → consent and legal → landing → onboarding intro →
onboarding form → app shell and navigation → analytics foundation → Today → check-in and triage →
My Baby and timeline → kick counter → medicines and adherence → appointments → vitals and charts →
doctor advice and suggested questions → reports → Doctor Visit Summary and print → Reading →
chatbot → contraction timer → preparation checklist → settings → PWA and offline → TWA and store
readiness → accessibility, bilingual and device pass.

Sessions 0 to 11 have no external dependency and can run back to back. Every session from 14
onward is gated on a designer asset, so the realistic order is the ungated foundation first, then
screen sessions in whatever order the designs arrive.

Three hard gates inside the plan:

1. **Design asset gate (A).** Every screen session starts by requesting that screen's HTML/CSS
   and Lottie assets from the product owner, and stops until they arrive. No screen layout is
   designed, approximated, or inferred from the tokens by the implementer.
2. **Content gate (B).** The triage, chatbot, suggested-questions and checklist sessions start by
   requesting the reviewed corpus, the red-flag severity rules, and the item lists. Nothing ships
   on invented medical content. Placeholder seed rows used to make tests runnable are labelled
   never-ship and are deleted in the same commit that adds the real content.
3. **Credentials gate (C).** Sessions needing an external account (Supabase, Google OAuth,
   PostHog, Gemini, Play Console, app icons) name exactly what to request, and stop until it is
   provided.

The detailed, session-by-session plan is `Implementation_Plan.md`.

---

## 13. Phase 2 — entirely optional, out of scope for Phase 1

**Every item below is optional.** None of it is started until Phase 1 is signed off and the
product owner asks for that specific item by name. Each is a session in the Phase 2 part of the
implementation plan, deliberately specified at lower resolution: each needs its own brainstorming
pass before it is broken into steps.

**Offline capture for the two timers**, with a durable IndexedDB queue carrying idempotency keys,
ordering, retry and conflict behaviour, tested across reload and process death. Split out of Phase 1
deliberately (§10) rather than approximated · **Generated chat answers**, only behind a real
entailment mechanism plus medical review of generated output, never behind a prompt instruction and
a self-reported citation (§5) · **An append-only EDD revision trail** with source and effective
time, since correcting the due date changes how every historical screen and past summary reads; in
Phase 1 a correction writes a system `timeline_events` row, which records that it happened but not a
full history · Phone OTP registration (blocked on DLT registration, an external dependency with no
code in it) ·
push notifications for reminders (FCM, scheduler, token lifecycle, iOS 16.4+ handling) · Hindi
content library · server-side STT (Sarvam or equivalent) · pre-recorded narration and TTS ·
pgvector plus embeddings for retrieval, only once a recorded failure set justifies it · PDF
extraction from reports, with user confirmation mandatory before any extracted value is treated as
fact · in-app document scanner with edge detection and cropping · internal content admin ·
brightness-dim toggle and APCA contrast pass · postpartum and newborn mode, which needs its own
spec rather than an extension of this one · doctor portal and paid consultations, which is a new
product with its own users, threat model and commercial model.

## 14. Phase 3 — also optional

Extraction from report images (OCR), under the same mandatory-confirmation rule as PDF
extraction · structured trend analysis across confirmed extracted values · whatever Phase 2 usage
data justifies. Not planned in detail until Phase 2 has shipped and been measured.

---

## 15. Open items carried forward

1. The `texture-motif` artwork itself is not yet illustrated. Screens that use it are built with
   a placeholder asset behind one token so the real art drops in without touching layout.
2. The nine baby illustrations and empty-state illustrations are designer deliverables, with the
   diversity requirements in design doc §5.3 applying.
3. The privacy policy and terms drafts require legal review before launch. They are marked in
   the repo as drafts.
4. The Gemini free tier may use submitted prompts to improve Google's products. The architecture
   sends **no data from her records**, and redacts emails, phone numbers and her own profile names
   from the question before egress — but that redaction is best-effort (§7), so free text she types
   can still reach the provider: a street address, a third party's name, a medicine name, or an
   identifier containing letters. Moving to a paid tier, or to Claude, is therefore recommended
   before real users are onboarded. Tracked as a launch-blocking decision, not a code change. The
   privacy policy must name these residual categories rather than implying redaction is complete.
5. The brightness-dim toggle from design doc §8 remains a proposal and is not in Phase 1.
6. PostHog is hosted outside India (EU cloud recommended). This is acceptable only under the data
   minimisation rules in §1.4.5, which the build enforces by test. If analytics requirements ever
   grow to need anything she typed, that is a new decision requiring a privacy review, not a code
   change. Flagged so it is not widened quietly.
7. Session replay is enabled with full masking. If the team later wants unmasked replay to debug a
   flow, that is also a new privacy decision, not a configuration tweak.
