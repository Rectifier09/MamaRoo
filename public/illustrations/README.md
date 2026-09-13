# Stage illustrations — placeholder

`stage-1-placeholder.svg` through `stage-9-placeholder.svg` are the static fallback
images `app/(app)/today/page.tsx` and `app/(app)/baby/page.tsx` both reference for
`IllustrationContainer`, one per stage in `lib/domain/stages.ts`'s `STAGE_BOUNDARIES`.

**These are not real illustrations.** They're plain tinted circles so the hero
illustration renders *something* rather than a broken image, nothing more. The
corresponding `stage-N-placeholder.json` Lottie files referenced by both pages don't
exist at all yet — no animated asset has been sourced for any of the nine stages.

Per `Important/Plan-Sessions-20-21-Replan.md`, Session 20's own Gate A asked for
these nine illustrations (Lottie + static) before implementation started; this
placeholder set is the pragmatic middle ground (matches how Session 18 already
shipped Today's illustration against the same still-missing assets) — it should not
be read as the request having been satisfied. Swap these files in place, and add
the matching `.json` files, once real art arrives; no code change is needed on
either page to pick them up.
