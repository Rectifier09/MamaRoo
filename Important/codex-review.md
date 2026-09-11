## Verdict

This plan is not ready to execute. Its strongest structure—gated assets/content, domain-first TDD, and an explicit 22-table close—does not compensate for security invariants that RLS does not enforce and safety tests that prove much less than their names claim; the single biggest risk is treating a cited passage ID as proof that Gemini generated no novel medical claim.

## Blocking findings

### 1. “Retrieval-only” is not enforced

`Spec.md:562`; `Implementation_Plan.md:8586`; `Implementation_Plan.md:8625`. The route accepts any generated body as long as the provider returns at least one passage ID. A model can cite a real passage and add an unsupported dosage, diagnosis, or instruction; the test with `usedPassageIds: []` proves only that an empty citation list is rejected, not that every claim is entailed by reviewed text. This defeats the central clinical guarantee. For Phase 1, do not let a model compose health answers: return reviewed passage text verbatim (or deterministic, medically reviewed templates assembled from passages). If generation remains, the output itself needs medical review or a genuinely enforceable claim-level allowlist; a prompt and self-reported IDs cannot establish provenance.

### 2. RLS permits cross-user relationship forgery

`Implementation_Plan.md:3812`; `Implementation_Plan.md:3824`; `Implementation_Plan.md:3893`; `Implementation_Plan.md:3904`; `Implementation_Plan.md:4009`; `Implementation_Plan.md:4022`; `Implementation_Plan.md:4051`; `Implementation_Plan.md:4063`. Policies validate only the submitted row's `user_id`. Alice can create a check-in or timeline event pointing at Bob's pregnancy, a contraction pointing at Bob's session, a medicine log pointing at Bob's medicine, or advice pointing at Bob's appointment if she learns a UUID. Foreign keys prove existence, not same ownership. Besides corrupting relationships, cascades/set-null can leak cross-tenant activity. Enforce ownership with composite foreign keys such as `(medicine_id, user_id) -> medicines(id, user_id)` (adding matching unique constraints), and do the same for every owned parent reference; add explicit Alice-parent/Bob-child denial tests.

### 3. Consent withdrawal does not revoke the routing gate

`Spec.md:509`; `Implementation_Plan.md:5527`; `Implementation_Plan.md:5531`. Middleware asks whether *any* historical `terms` row has `granted = true`. Because consent is append-only, a later `false` row leaves that query true forever. The same latest-event problem is left implicit for analytics provider mounting (`Implementation_Plan.md:6967`). Resolve current consent as the newest row per `(user_id, consent_key)` ordered by `granted_at, id`, and test `true -> false -> true`, including ties. Prefer a view/RPC that defines this once so middleware, analytics, and Settings cannot disagree.

### 4. The account-deletion action cannot be implemented with the declared clients

`Implementation_Plan.md:71`; `Implementation_Plan.md:8855`; `Implementation_Plan.md:8883`. `deleteAccount` must delete the Auth user, which requires an admin/service-role operation, but the plan says the service-role key is used by no application code path and only defines anon-key server/browser clients. A fresh agent cannot make `auth.admin.deleteUser` work and is invited either to weaken the promise or improvise privileged-key handling. Specify a narrowly scoped server-only admin client/action, re-authentication and CSRF expectations, storage enumeration/deletion, failure recovery, and tests that metadata, objects, and the Auth user are all removed in the safe order.

### 5. Offline kick and contraction writes contradict the architecture and can lose safety-relevant records

`Spec.md:51`; `Implementation_Plan.md:7883`; `Implementation_Plan.md:7888`; `Implementation_Plan.md:8783`. The approved rule is that offline writes are disabled and there is no queue, yet both timers accept offline input and promise to save later. A debounced Supabase write is not an offline queue; closing the PWA can discard kicks or contractions. Choose explicitly: either block starting/continuing while offline as the spec requires, or amend the spec and design a durable IndexedDB queue with idempotency, ordering, retry, conflict behavior, and tests across reload/process death. Do not ship the current halfway behavior.

### 6. The PCPNDT enforcement has multiple unguarded paths

`Implementation_Plan.md:24`; `Implementation_Plan.md:3512`; `Implementation_Plan.md:3517`; `Implementation_Plan.md:8492`; `Implementation_Plan.md:8538`. The repository guard scans only migrations and translation catalogues, not reviewed seeds, Markdown content, prompts, components, API fixtures, report metadata, or generated answers. The finite phrase matcher can also be bypassed by spelling variants, euphemisms, mixed scripts, or a question that includes an “unrelated child” phrase accepted by the negative test before entering ordinary health retrieval. Expand static scanning to every shipped textual/content source and payload schema; medically/legal-review the corpus for this prohibition; apply a conservative pre-retrieval intent policy and a post-response block; and add adversarial transliteration, misspelling, mixed-script, indirect-inference, and corpus-contamination tests. A deterministic finite list alone cannot justify “never discuss.”

### 7. Analytics validation is a denylist, not the promised allowlist

`Implementation_Plan.md:62`; `Implementation_Plan.md:6786`; `Implementation_Plan.md:6788`; `Implementation_Plan.md:6840`; `Implementation_Plan.md:6880`; `Implementation_Plan.md:6987`. Any short health string under an unlisted key passes (for example `{ condition: "bleeding" }`), and `category`/`feature` are typed as arbitrary strings rather than closed enums. The repo guard scans direct PostHog calls only under `app` and `components`, so a new file under `lib` bypasses it; type casts or JavaScript also bypass compile-time types. Replace the runtime denylist with a per-event runtime schema containing exact keys and enum/range constraints, reject unknown keys, make `track` the only exported capture surface, and scan the whole source tree for vendor imports/calls. Test representative health terms under arbitrary keys and unexpected properties.

### 8. The privacy claim about AI-provider input is internally false

`Implementation_Plan.md:25`; `Spec.md:532`; `Implementation_Plan.md:8557`. The global constraint says no personal data is ever sent, while the health pipeline sends the user's raw question. A user can type “I am Priyanka, Dr Mehta prescribed…”; the four fixture strings in the test do not sanitize that input and only prove those exact mock values were absent. Either disclose and consent to raw question transmission, or locally redact identifiers with a conservative policy before egress and show the transformed text; add tests using names, emails, phone numbers, addresses, doctor/medicine names, and identifiers supplied *inside the question*.

### 9. Settings' export completeness test is impossible as specified

`Implementation_Plan.md:8862`. TypeScript's generated `Database` type is erased at runtime, so a Vitest assertion cannot derive table keys from it. A fresh agent must invent a second list or abandon the guarantee, and “all user-owned tables” is not mechanically equivalent to all public tables. Generate a runtime manifest from PostgreSQL metadata (with an explicit ownership classification), or query the catalog in an integration test and compare it with the export keys.

## Significant findings

### 10. The RLS suite's headline test initially passes vacuously, and its replacement still grants the diagnostic RPC to `PUBLIC`

`Implementation_Plan.md:3614`; `Implementation_Plan.md:3630`; `Implementation_Plan.md:3645`. The initial fallback merely expects an error from querying `pg_tables`; it never proves all tables have RLS. The replacement revokes from `anon` and `authenticated` but PostgreSQL functions are executable by `PUBLIC` by default, so the assertion that only `service_role` can call it is false. Remove the dead initial test entirely and `REVOKE ALL ... FROM PUBLIC` before granting `service_role`; also assert `relforcerowsecurity` if table owners will ever query through non-bypass roles.

### 11. “Content rows match locale and published parent” lacks database integrity

`Implementation_Plan.md:4331`; `Implementation_Plan.md:4350`. `content_passages.locale` is independent of its parent item's locale, and the policy checks only that the parent is published. A seed can attach a Hindi-labelled passage to an English item and the Hindi retrieval path will serve it without an English-only marker. Use a composite foreign key `(content_item_id, locale)` to a unique `(id, locale)` on `content_items`, and test mismatched insertion.

### 12. Plausibility behavior for vitals contradicts the approved edge case

`Spec.md:687`; `Implementation_Plan.md:4077`; `Implementation_Plan.md:8156`. The spec says an out-of-plausible-range BP should warn and not block; the database CHECK rejects systolic outside 50–300 or diastolic outside 30–200, while the later domain layer says high-but-plausible warns. Clarify two distinct boundaries (physically impossible = reject; clinically notable = non-diagnostic warning) in the spec and tests, or remove the database bound. As written, the same reading can be promised as savable by UI policy and rejected by Postgres.

### 13. The strict-TDD mandate is not executable in many later sessions

`Implementation_Plan.md:76`; `Implementation_Plan.md:8104`; `Implementation_Plan.md:8114`; `Implementation_Plan.md:8122`; `Implementation_Plan.md:8177`. Sessions repeatedly collapse “write, implement, run again” into one checkbox and sometimes say only “Implement … add the actions.” A fresh agent receives no explicit failing command/result checkpoint for several domain functions, components, and server actions, so compliance cannot be audited. Split each behavior into red/run/green steps, name the test file and command, and require recording the observed failure before implementation.

### 14. The domain-purity guard misses the import style used by the plan

`Implementation_Plan.md:5216`; `Implementation_Plan.md:4696`. Its grep matches only `from 'react|next|@supabase` with single quotes, while plan code consistently uses double quotes. It also misses `require`, dynamic imports, and indirect I/O modules. Use an ESLint boundary rule or dependency-cruiser-style import graph rule; at minimum parse both quote styles and ban the full known I/O module set. Add a fixture that deliberately imports React and prove the guard fails.

### 15. The Doctor Visit Summary print promise exceeds what the implementation/test establishes

`Design.md:338`; `Implementation_Plan.md:8382`; `Implementation_Plan.md:8391`. Fixed-position header/footer elements are not a reliable cross-browser implementation of running headers/footers, especially in mobile Safari, and the e2e test checks only visibility, not repetition or collision on three pages. Treat repetition as a gated browser capability: provide a graceful non-repeating fallback with the disclaimer within each section/page-safe content, or use a print rendering approach proven on both target engines. Record a concrete failure criterion, not merely a manual “confirm.”

### 16. Storage authorization does not bind the object to report metadata

`Spec.md:310`; `Implementation_Plan.md:4126`; `Implementation_Plan.md:4132`; `Implementation_Plan.md:8294`. The policy validates only the first folder segment. It neither proves that the second segment is an existing report owned by the user nor that the metadata row's `storage_path` has the same owner/report ID. This permits arbitrary objects under a user's prefix and metadata pointing at unrelated paths, complicating deletion and orphan recovery. Create metadata first with a server-generated report ID/path and enforce path shape/ownership in a storage policy helper or privileged transaction-like workflow; test mismatched report ID and metadata path.

### 17. Consent ordering is nondeterministic when timestamps tie

`Implementation_Plan.md:3452`; `Implementation_Plan.md:8874`. `consents_user_key_idx` orders only by `granted_at`; batched or rapid events may share timestamps, and the plan never specifies an `id` tiebreaker or a current-consent query. Add `(user_id, consent_key, granted_at DESC, id DESC)` and define the exact ordering everywhere. Better, add a monotonic sequence or server-assigned effective timestamp.

### 18. Table count is correct, but “matching columns” and session metadata are not

`Spec.md:212`; `Spec.md:275`; `Implementation_Plan.md:3891`; `Implementation_Plan.md:4149`; `Implementation_Plan.md:4660`. The four migrations do create exactly 22 tables (3 + 5 + 6 + 8), which is good. However, the spec's `contractions` definition omits `user_id` while the migration adds it, and Session 9 calls six care tables “all seven tables”; the plan later claims exact closure. Amend the spec to include the denormalized owner column (needed for direct RLS), correct “seven” to “six,” and list the canonical 22 names in one guard to prevent count-only false confidence.

## Minor findings

### 19. Several advertised test counts are wrong

`Implementation_Plan.md:4830`; `Implementation_Plan.md:5047`; `Implementation_Plan.md:4625`. The shown date suite expands to 16 tests, not 18; the pregnancy suite contains 17, not 18; and the content RLS block contains eight tests while claiming six. These do not change behavior, but false counts make fresh-agent handoff and red/green verification noisy. Generate counts from the runner and remove hard-coded totals unless they are themselves contractual.

### 20. The gate summary says “Two hard gates” while defining three

`Implementation_Plan.md:81`; `Implementation_Plan.md:106`. Revision 2 added Gate C but did not update the Global Constraints heading. Change it to “Three hard gates”; otherwise a cold agent may treat credentials as a lesser note rather than the same stop condition.

### 21. The requested/reference filenames do not match the repository

`Spec.md:19`; `Implementation_Plan.md:1`. The spec refers to `Mamaroo-Design.md` and `MamaRoo-Phase1-Implementation-Plan.md`, but the repository files are `Design.md` and `Implementation_Plan.md` (and the spec itself is `Spec.md`). Normalize the names or update references before sessionized execution, because fresh agents are explicitly given narrow context and may fail at the first read step.

## Disagreements

- **Postgres full-text search:** I disagree with using unstemmed `simple` FTS as the safety boundary (`Implementation_Plan.md:4343`; `Implementation_Plan.md:8544`). It is acceptable for cheap discovery, but lexical misses in Hindi/transliteration make the no-match behavior erratic. I would still defer embeddings if cost/ops demand it, but return reviewed passages directly and add medically curated synonym/alias terms plus retrieval evaluation sets for English, Hindi, and Hinglish. Vector search would improve recall, not solve generation safety.

- **Single `vitals` table:** I disagree with the `kind/value_1/value_2` shape (`Spec.md:301`). It obscures units and makes illegal states easy to express. I would use typed nullable columns with a strict kind-dependent CHECK, or separate `weight_readings` and `blood_pressure_readings`; identical rendering is not a sound data-model reason.

- **Kick timestamp array:** I disagree (`Spec.md:273`; `Implementation_Plan.md:7888`). Rewriting an ever-growing array on every debounced tap creates lost-update and retry ambiguity, particularly around offline/reconnect. A `kick_events` child table with an idempotency key per tap gives atomic inserts, recovery, auditability, and simpler conflict handling.

- **Derived gestational age:** I agree with deriving it from a stored, correctable EDD (`Spec.md:241`). Do not store week. I would, however, preserve an append-only EDD revision history with source/effective time because changing EDD rewrites the interpretation of historical screens and summaries.

- **No offline write queue:** I agree for most Phase 1 forms, but then kick/contraction capture must not promise offline persistence. If those two workflows are considered essential while disconnected, implement a small, explicit durable queue only for them and amend scope; do not simulate one with component state.

- **In-app reminders only:** I agree for Phase 1 (`Spec.md:45`). Push introduces scheduling, permissions, token lifecycle, and clinically sensitive notification-copy risks. The plan fences it clearly into optional Phase 2 (`Implementation_Plan.md:9183`).

- **Hand-rolled SVG chart:** I disagree (`Implementation_Plan.md:8173`). “Under 150 lines” is unrealistic once scales, duplicate dates, clipping, responsive layout, labels, RTL/language length, focus, and accessible summaries are correct. Use a small headless chart/scale library and own the accessible SVG markup and design tokens; a dependency is lower risk than bespoke geometry.

- **100% branch coverage only for `lib/domain/`:** I disagree (`Implementation_Plan.md:77`). The percentage is less important than where failure is harmful. Enforce branch coverage on `lib/ai/guardrails`, the chat route/pipeline, analytics schemas, consent resolution, deletion/export, and storage authorization too; ordinary UI code does not need 100%.

## What is good

The plan's ordering, explicit asset/medical-content gates, pure UTC date-only arithmetic, Asia/Kolkata “today,” and arithmetic fixtures are solid. The migrations do create the promised 22 tables, Phase 2 is unmistakably fenced off, and the design system's accessibility, bilingual, motion, print, and non-alarmist voice constraints are carried into concrete tests unusually well. Preserve those strengths while replacing the security and clinical-safety claims that currently rely on incomplete guards.
