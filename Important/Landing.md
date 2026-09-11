# Coming-soon page

The `/` route follows `Important/Design.md`: sand surfaces, terracotta action,
sage details, Poppins/Hind, original logos and reduced-motion support. The
single-screen composition prioritizes name-and-email signup, with a smaller logo scene
on short phones. Large text and very short viewports can scroll for accessibility.
English and Hindi are available from the header.

The original PNGs are copied unchanged from `Important/Logo_Icon.png` and
`Important/Logo_WithName.png` to `public/brand/logo-icon.png` and
`public/brand/logo-with-name.png`; SHA-256 checks confirm both copies match.
Their checkerboard backgrounds are baked in; `BrandFilters` removes neutral
pixels at render time and maps the remaining original contours to the design's
two brand colors. The header crops the wordmark from the supplied named logo
using CSS. Both assets use Next.js optimized image delivery at quality 100,
with preloading and explicit responsive sizes; `next.config.ts` permits that
quality to preserve the filtered color edges.

The original mother-and-joey icon sits inside two fine circular outlines, with
an arrival movement and a gentle breathing loop. There is no cream backdrop
or caption, and the header has no coming-soon label. Reduced motion
disables those animations. Every device uses the same single-column phone layout,
capped at 390px and centered on wider screens. The illustration sits above the
story and signup form. Height-based adjustments keep short desktop windows compact
as well as short phones; there is no separate desktop composition.

The arrival sequence finishes in 800ms: logo, heading, supporting text, then form.
Pointer hover shifts the signup arrow; a press gently compresses the button.
Only a successful server response triggers confirmation: the form fades away,
the checkmark draws, and the welcome message fades in within the same space.
The hidden form becomes inert and focus moves to the confirmation. Reduced
motion shows the final states instantly, with no movement or checkmark drawing.

## Supabase waitlist

The form requires name (up to 80 characters) followed by email. POST
`/api/waitlist` validates and normalizes both, then calls `public.join_waitlist`
using the project's existing Supabase URL and public key. No webhook or extra
application secret is required. Errors preserve both inputs for retry; the
animated confirmation appears only after Supabase acknowledges the write.

Migration `supabase/migrations/0002_waitlist.sql` was applied to the linked
project `uhoknbrfashekhufhmhl`. Signups are available in Supabase's Table Editor
under `public.waitlist`, with `name`, unique lowercase `email`, `locale`,
`consent` (`launch-email`), `consent_version` (1), and database-generated
`created_at` and `id`.

RLS is enabled. Anonymous and signed-in API clients cannot select, insert,
update or delete table rows directly. The narrow signup function can insert
only, returns no records or duplicate indicator, and keeps the first signup
unchanged when the same email is submitted again. It uses a fixed empty search
path. Project administrators can inspect/export records through Supabase.

For another environment, apply the migration and configure the usual
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for that project.
The waitlist route never uses a service-role key. No launch emails are sent by
this implementation.

## Verification

```sh
npm run test -- app/api/waitlist/route.test.ts
npm run test -- tests/rls/waitlist.test.ts
PLAYWRIGHT_PORT=3025 npm run test:e2e -- tests/e2e/landing.spec.ts
```

API tests cover required name/email validation, normalization, pending-save
behavior, database/network failures and honeypot handling. Database tests use
one unique test signup to check persistence, duplicates, SQL validation and
denied public table access; cleanup deletes only that test's record.

A real browser signup was submitted through the local page and verified in the
linked Supabase table, including both name and email, language, consent and
timestamp. Confirmation displayed after success. The verification record was
removed and its cleanup checked.

The centered phone layout stays capped at 390px on desktop. Short-height
layouts reduce illustration space and omit the optional invitation/features;
very short windows also omit the footer. Browser coverage includes English and
Hindi at 320 × 568, 375 × 667, 390 × 844, 1440 × 900 and 1280 × 600, plus
validation, retry, confirmation animation, accessibility and reduced motion.
Large text and unusually short viewports may scroll to keep inputs accessible.
