## Verdict

Revision 3 is materially safer, but it is not ready to execute: 13 findings are closed, one rejection is acceptable, and the remaining gaps include two internally impossible workflows. The biggest remaining risk is that the newly specified export completeness test cannot pass and therefore cannot protect deletion/export completeness.

## Finding status table

| # | One-line finding title | Status | Evidence `file:line` |
|---:|---|---|---|
| 1 | Retrieval-only response provenance | PARTIAL | `Implementation_Plan.md:9344-9346` |
| 2 | Cross-user relationship forgery | CLOSED | `Implementation_Plan.md:3948-3951`, `Implementation_Plan.md:3976-3979`, `Implementation_Plan.md:4001-4004`, `Implementation_Plan.md:4044-4046`, `Implementation_Plan.md:4327-4329`, `Implementation_Plan.md:4376-4378` |
| 3 | Consent withdrawal/current-state resolution | PARTIAL | `Implementation_Plan.md:3487-3495`, `Implementation_Plan.md:5956-5963`, `Implementation_Plan.md:7492-7496`, `Implementation_Plan.md:9631-9633` |
| 4 | Implementable account deletion | PARTIAL | `Implementation_Plan.md:9640-9672` |
| 5 | Offline timer contradiction | CLOSED | `Implementation_Plan.md:8424`, `Implementation_Plan.md:9509` |
| 6 | PCPNDT enforcement coverage | PARTIAL | `Implementation_Plan.md:3540-3577`, `Implementation_Plan.md:9139-9156`, `Implementation_Plan.md:9344-9346` |
| 7 | Analytics runtime allowlist | CLOSED | `Implementation_Plan.md:7307-7397`, `Implementation_Plan.md:7401-7412`, `Implementation_Plan.md:7520-7540` |
| 8 | AI question privacy/redaction claim | PARTIAL | `Spec.md:770-771`, `Implementation_Plan.md:9170-9176` |
| 9 | Runtime export-completeness check | OPEN | `Implementation_Plan.md:9593-9621` |
| 10 | RLS diagnostic exposure/vacuous test | CLOSED | `Implementation_Plan.md:3793-3833` |
| 11 | Passage/parent locale integrity | CLOSED | `Implementation_Plan.md:4692-4695`, `Implementation_Plan.md:4723-4725` |
| 12 | Vitals plausibility contradiction | CLOSED | `Spec.md:364-375`, `Implementation_Plan.md:4398-4406`, `Implementation_Plan.md:4562-4575` |
| 13 | Strict-TDD handoff executability | CLOSED | `Implementation_Plan.md:77-83` |
| 14 | Domain-purity guard quote/import gaps | CLOSED | `Implementation_Plan.md:5610-5647` |
| 15 | Multi-page print guarantee | CLOSED | `Implementation_Plan.md:8971-8983`, `Implementation_Plan.md:8992-8994` |
| 16 | Report object/metadata binding | OPEN | `Implementation_Plan.md:4423`, `Implementation_Plan.md:8877-8883` |
| 17 | Deterministic consent ordering | OPEN | `Implementation_Plan.md:3471-3472`, `Implementation_Plan.md:3743-3756` |
| 18 | Schema/table metadata drift | CLOSED | `Spec.md:331-337`, `Implementation_Plan.md:4474-4476` |
| 19 | Incorrect advertised test counts | CLOSED | `Implementation_Plan.md:10139-10140` |
| 20 | Hard-gate count | CLOSED | `Implementation_Plan.md:85-89` |
| 21 | Repository filename drift | CLOSED | `Spec.md:43-44`, `Spec.md:932` |

## Still open or partial

### 1 — Retrieval-only response provenance

The response body is correctly selected from `candidates`, and provider failures retain the stored lexical candidate (`Implementation_Plan.md:9325-9346`). However, only `selected.body` receives the post-selection contamination check; `selected.heading` is returned without that check (`Implementation_Plan.md:9344-9346`). A prohibited or otherwise unreviewed heading can therefore reach the user. Validate the complete returned passage (`heading` and `body`) or make the reviewed-row validation function cover every displayed field, with a contaminated-heading route test.

### 3 — Consent withdrawal/current-state resolution

The view is structurally correct and `security_invoker = true` makes underlying `consents` RLS apply (`Implementation_Plan.md:3487-3495`). Middleware concretely reads it (`Implementation_Plan.md:5956-5963`), but analytics merely says the layout receives consent values and Settings merely lists consent status; neither gives the query that must read `current_consents` (`Implementation_Plan.md:7492-7496`, `Implementation_Plan.md:9631-9633`). The plan also claims the Visit Summary is a consumer without specifying a view read (`Implementation_Plan.md:3487-3493`). Add one shared query that reads the view and require all four consumers to call it; prohibit raw-table reads except append/audit-history code.

### 4 — Implementable account deletion

The server-only admin client and storage-before-auth-user failure ordering are now specified (`Implementation_Plan.md:9640-9672`). The original re-authentication requirement is still absent: checking an existing session plus a typed word is not recent-auth proof (`Implementation_Plan.md:9665-9670`). Require a fresh OTP/OAuth re-authentication (with an age bound) before deletion, and test stale-session rejection.

### 6 — PCPNDT enforcement coverage

Pre-request and post-body checks plus adversarial cases are useful (`Implementation_Plan.md:9139-9156`, `Implementation_Plan.md:9317-9346`), but the static guard's claim to cover “every shipped textual source” is stronger than its mechanism: it enumerates catalogues/legal files and seeds, not component source, prompts, fixtures, or arbitrary Markdown (`Implementation_Plan.md:3540-3577`). It also misses the displayed passage heading (`Implementation_Plan.md:9344-9346`). Scan the repository's shipped text-bearing extensions with explicit narrow exclusions, and apply the response check to headings too.

### 8 — AI question privacy/redaction claim

Revision 3 now accurately labels redaction best-effort and covers email, phone/long digit runs, and three profile values (`Spec.md:770-771`, `Implementation_Plan.md:9170-9176`). It still misses addresses, identifiers containing letters, arbitrary third-party names, and medicine names typed into the question; therefore the later assertion that the architecture “keeps personal data out of every provider request” is false (`Spec.md:977-980`). Change that launch note to the documented best-effort claim and explicitly name residual categories in the privacy copy/tests.

### 9 — Runtime export-completeness check

The new test cannot pass as written. `user_owned_tables()` returns only physical tables with a `user_id` column (`Implementation_Plan.md:9604-9614`), while `buildExport` is required to add `profiles` explicitly and also carries `generated-at` and schema-version keys (`Implementation_Plan.md:9588`, `Implementation_Plan.md:9621`); thus `Object.keys(buildExport(...))` contains at least three keys absent from `expected` (`Implementation_Plan.md:9593-9598`). Return a canonical classified manifest including `profiles`, and compare only the export's table-data namespace—not envelope metadata—to that manifest.

### 16 — Report object/metadata binding

The proposed metadata-first sequence is impossible against its own schema: `reports.storage_path` is `NOT NULL` (`Implementation_Plan.md:4423`), but the action says it first inserts the row to obtain the default-generated id and only then derives the path (`Implementation_Plan.md:8877-8881`). Generate the report UUID in the server action, derive the path, then insert both id and path atomically before returning an upload target; test that the persisted path exactly equals the authorized upload path.

### 17 — Deterministic consent ordering

`id DESC` makes ties deterministic but does not make it insertion order: `id` defaults to random `gen_random_uuid()` (`Implementation_Plan.md:3459-3467`), so among equal timestamps the lexicographically greatest random UUID can be either row. The test acknowledges “later insert” but asserts only that the result is a boolean, which both rows satisfy (`Implementation_Plan.md:3743-3756`). Add an identity/bigint sequence (or a server-assigned monotonic effective order), order by it, and assert the exact later value is selected.

## New defects introduced in revision 3

1. **Export completeness test is self-contradictory.** `Implementation_Plan.md:9588-9621`: catalogue output excludes `profiles` and envelope fields, while `Object.keys(buildExport())` includes them. This blocks Session 32 and leaves completeness unproved. Return/consume a canonical ownership manifest and compare it only to exported table keys.

2. **Metadata-first report creation violates `NOT NULL`.** `Implementation_Plan.md:4423`, `Implementation_Plan.md:8877-8883`: the row cannot be inserted before its path is derived from the generated id. Generate the UUID in application/server code first, then insert `{id, storage_path}` together.

3. **Consent tie-breaking is random, not chronological.** `Implementation_Plan.md:3460`, `Implementation_Plan.md:3487-3491`, `Implementation_Plan.md:3743-3756`: UUIDv4 ordering contains no insertion chronology, and the test proves only `typeof boolean`. Use a monotonic column and assert `false` for the shown `true`-then-`false` tie.

4. **A contaminated heading bypasses the new response guard.** `Implementation_Plan.md:9344-9346`: body is checked, heading is returned unchecked. Check both fields and add the missing test.

5. **The seed command remains wired to placeholder content after Session 29.** `Implementation_Plan.md:4912`, `Implementation_Plan.md:9361-9363`: Session 29 applies reviewed content and deletes placeholder rows, but `db:seed` still reapplies `content.placeholder.sql`. Replace the script/seed entry point when reviewed content lands, or make a single canonical seed file whose placeholder rows are removed.

6. **The privacy launch note contradicts the revised best-effort policy.** `Spec.md:770-771`, `Spec.md:977-980`: one section admits typed PII can survive redaction while the open item says the architecture keeps personal data out of every request. Use the best-effort wording consistently.

7. **The changed provider interface is missing a field consumed by the route.** `Implementation_Plan.md:9075`, `Implementation_Plan.md:9346`: the declared candidate interface contains `id`, `heading`, and `body`, but response assembly reads `selected.content_item_id`. Add `contentItemId`/`content_item_id` to the canonical retrieval candidate type and to the provider interface/tests so the source link is not `undefined`.

## Remaining disputes

**Kick timestamp array — REJECTED-DISPUTED.** Atomic `array_append` prevents concurrent lost updates, but it does not make retries idempotent: if the first RPC commits and its response is lost, retrying appends a second timestamp (`Implementation_Plan.md:4063-4085`). The plan explicitly cites retries as solved and tests concurrency only (`Implementation_Plan.md:4204-4221`, `Implementation_Plan.md:10157-10159`); require a client-generated idempotency key, which naturally fits a child event row (or an equivalent deduplication table).

**Single vitals table — REJECTED-ACCEPTABLE.** The kind-dependent checks close the illegal states raised previously, including presence/absence of `value_2` and systolic/diastolic ordering (`Implementation_Plan.md:4393-4406`).

**Generated-answer allowlist — REJECTED-ACCEPTABLE.** Phase 1 no longer contains generated health answers; the provider selects an id and the route returns stored content (`Spec.md:650-669`).

## Go / no-go

**No-go.** Before Session 0 starts, amend the plan/spec to: (1) make export completeness mechanically consistent; (2) make report metadata-first insertion valid; (3) replace UUID tie-breaking with monotonic consent ordering and an exact test; (4) validate displayed headings and align the retrieval candidate/source-id type; (5) route every consent consumer through one named view query; and (6) remove the stale placeholder seed path and contradictory privacy guarantee. Phase 2 fencing is unambiguous (`Spec.md:936-945`).
