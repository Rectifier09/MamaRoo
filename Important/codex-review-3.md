## Verdict

Revision 4 closes most of the targeted defects, including the export, report-id, consent-ordering, retrieval-source, seed-routing, and kick-idempotency mechanisms. It is still **no-go** for Phase 1: the PCPNDT guard fails on its own test source (and on this review), the kick session tests no longer match their interface, consent consumers remain incompletely specified, and the legal-copy instruction retains the privacy overclaim.

## Status of the eleven items

| Item | Status | Evidence `file:line` |
|---|---|---|
| New defect 1 — export completeness | CLOSED | `Implementation_Plan.md:9768-9788`, `Implementation_Plan.md:9800-9815` — `{meta, tables}` isolates envelope keys, `profiles` is unioned into the service-role catalogue, and equality is applied only to `tables`. The SQL `UNION` is valid for `SETOF text`. |
| New defect 2 — report metadata-first insertion | CLOSED | `Implementation_Plan.md:8979-8997` — the action generates the UUID, derives the path, and inserts `id` plus non-null `storage_path` atomically before upload. |
| New defect 3 — deterministic consent ordering | CLOSED | `Implementation_Plan.md:3459-3478`, `Implementation_Plan.md:3493-3497`, `Implementation_Plan.md:3747-3763` — `GENERATED ALWAYS AS IDENTITY` is omitted from client inserts (including the batch), and the view and exact false-valued tie test use `seq DESC`. |
| New defect 4 — contaminated heading | CLOSED | `Implementation_Plan.md:9463-9484`, `Implementation_Plan.md:9490-9498` — the guard consumes `displayedText`, which contains both rendered passage fields, and the heading route test exercises it. |
| New defect 5 — stale placeholder seed command | CLOSED | `Implementation_Plan.md:4981-5001`, `Implementation_Plan.md:9532-9536` — the canonical command targets reviewed content; the placeholder command is fenced and removed with its file when reviewed content lands. |
| New defect 6 — privacy launch-note contradiction | PARTIAL | `Spec.md:998-1004`, `Implementation_Plan.md:6469` — the spec now names residual categories, but the required privacy draft still says “no personal data is sent” while acknowledging that her typed question is sent. |
| New defect 7 — missing retrieval source identifier | CLOSED | `Implementation_Plan.md:9191-9200`, `Implementation_Plan.md:9467-9471`, `Implementation_Plan.md:9509-9517` — the canonical candidate carries `contentItemId`, the route maps it to `sourceId`, and the test asserts the value. |
| Finding 3 — consent withdrawal/current-state consumers | PARTIAL | `Implementation_Plan.md:3851-3890`, `Implementation_Plan.md:6037-6049`, `Implementation_Plan.md:7582-7590`, `Implementation_Plan.md:9018-9054`, `Implementation_Plan.md:9824-9829` — the shared query and raw-read guard exist, but only middleware and analytics are actually wired; neither the Visit Summary nor Settings specifies a call, and the boolean-only helper cannot supply Settings’ required version/date. |
| Finding 4 — implementable account deletion | PARTIAL | `Implementation_Plan.md:9863-9871` — a ten-minute requirement and stale test are stated, but no server-verifiable re-auth proof, timestamp source, or verification flow is defined; the action could otherwise be handed a client-asserted time. |
| Finding 6 — PCPNDT enforcement coverage | OPEN | `Implementation_Plan.md:3557-3578`, `Implementation_Plan.md:3586-3599` — the walk is broad, but it scans `schema-pcpndt.test.ts` itself, whose `FORBIDDEN` list and detection fixture necessarily contain forbidden terms; it also omits `codex-review-3.md` from the document exclusions. |
| Finding 8 — AI-question privacy/redaction claim | PARTIAL | `Spec.md:998-1004`, `Implementation_Plan.md:6469`, `Implementation_Plan.md:9290-9310` — best-effort redaction and residual risk are now explicit in the spec and tests, but the privacy-copy instruction still requires the stronger false claim. |

## New defects introduced in revision 4

1. **The PCPNDT filesystem guard fails immediately on itself and this review.** `Implementation_Plan.md:3557-3578`, `Implementation_Plan.md:3586-3599`: the walk includes `tests/guards/schema-pcpndt.test.ts`, which contains every forbidden token and a deliberately forbidden fixture. Its planning-document allowlist also stops at `codex-review-2.md`, so `codex-review-3.md` is scanned. This blocks Session 7 and therefore the foundational migration sequence. Fix by excluding the guard implementation/fixtures narrowly (while testing the matcher directly), and exclude planning/review documents by an audited root-document rule or add this file explicitly; do not scan dependency manifests such as root lockfiles unless their false-positive policy is defined.

2. **The kick domain tests still use the removed timestamp-array API.** `Implementation_Plan.md:8430-8433` defines `kickState({ events })` with `{tapId, occurredAt}[]`, but every test calls `kickState({ kickTimes })` at `Implementation_Plan.md:8450-8489`. These tests cannot type-check against the advertised implementation and do not exercise event mapping. Replace each `kickTimes` input with event objects and retain the tap ids in fixtures.

3. **Session 8's contract and generic RLS instruction omit the new table.** Migration 2 creates six tables—`3` session-7 tables plus `6` session-8 tables plus `6` session-9 tables plus `8` session-10 tables gives `3 + 6 + 6 + 8 = 23`—but the Interfaces block lists only five and the denial instruction says “each of the five tables” (`Implementation_Plan.md:3972-3973`, `Implementation_Plan.md:4064-4074`, `Implementation_Plan.md:4146-4148`; creation list `Implementation_Plan.md:3391-4891`). Add `kick_events` to the Interfaces block and require generic read/write denial coverage for all six, in addition to its special forgery tests.

4. **The kick action interface drops the idempotency key at the boundary.** The contract advertises `recordKick(sessionId)` (`Implementation_Plan.md:8430-8433`), while the mechanism requires the client to generate and reuse one `tap_id` across a lost-response retry (`Implementation_Plan.md:8529-8533`). If the server action generates it or a retry invokes the one-argument action afresh, deduplication is lost. Change the interface to `recordKick(sessionId, tapId)` (or an object containing both), validate the UUID server-side, and test a lost-response retry through the action rather than only direct table inserts.

5. **The privacy-policy implementation instruction still recreates the old overclaim.** `Implementation_Plan.md:6469` directs the legal draft to state that no personal data reaches the provider, even though the question is transmitted and revision 4 correctly lists surviving addresses, third-party names, medicine names, and alphanumeric identifiers (`Spec.md:998-1004`). Make the draft instruction use the same best-effort wording and require those residual categories in its test.

6. **The shared current-consent abstraction cannot satisfy one of its claimed consumers.** `getCurrentConsents` returns only booleans (`Implementation_Plan.md:3858-3872`), while Settings must show version and agreement date (`Implementation_Plan.md:9824-9829`); the Visit Summary session does not mention consent at all (`Implementation_Plan.md:9018-9054`). Return current consent records (or add a second shared current-view query), wire both consumers explicitly, and test withdrawal state at each consumer.

## Go / no-go

**No-go.** Prerequisites:

1. Make the PCPNDT repository guard pass without excluding shipped application/content sources.
2. Align the kick Interfaces block, domain tests, and `recordKick` signature with `{tapId, occurredAt}` and retry reuse.
3. Specify server-verifiable fresh re-authentication and wire Settings/Visit Summary to current-consent data.
4. Remove the remaining privacy-policy overclaim.
