# MamaRoo — Design System

*Pregnancy companion app. Warm, personal, bilingual (Hindi/English). Light mode only — no dark mode.*

---

## 1. Design principles

- Add visuals wherever they reduce cognitive load — this is a hard rule, not a nice-to-have.
- Voice: a knowledgeable friend, not a doctor and not a forced cheerleader.
- Restraint over decoration — one signature moment beats ten small ones, in motion, in copy, and in color.
- Bilingual is a first-class design constraint, not a settings toggle bolted on afterward.
- Personalization is additive, never presumptive — never assume partner involvement, family structure, or how a pregnancy is felt about.
- Warmth and personalization are distinct: a warm tone is the baseline for every user; personalization is what turns that baseline warmth into "this app actually knows me." Generic warm copy alone reads as brand voice — it's the specific, remembered detail that makes it feel personal.

---

## 2. Color system

### 2.1 Palette

| Token | Hex | Role |
|---|---|---|
| Warm cream | `#F7EEE3` | Primary background. Never pure white. |
| Peach blossom | `#FFA48F` | Primary brand color — cards, surfaces, backgrounds. |
| Soft coral | `#FF6D57` | Decorative/accent only — illustration, icons, badges, backgrounds. **Not for text-bearing button fills.** |
| CTA coral | `#D63A29` | Button fills specifically, paired with white text. |
| Golden sunrise | `#FFC53D` | Joy / milestone accents only. **Never used as text color.** |
| Sage mist | `#9DDDA1` | Secondary/wellness accent surfaces. **Never used as raw text color.** |
| Darkened sage | `#3B723F` | Use whenever sage needs to appear as legible text. |
| Deep plum | `#670035` | Body text and emphasis. Replaces black everywhere. |

### 2.2 Usage rules

- Text on peach, sage, or gold backgrounds should still default to **18px+ or bold** — APCA (58.6–68.6 Lc) sits under the ~75 Lc fluent-reading threshold on these pairings, so treat small body copy there as the exception, not the default.
- Golden sunrise and raw sage mist are decorative/icon colors only, under any circumstance — they fail contrast as text.
- **Red is avoided app-wide** — in a pregnancy context it reads as a bleeding/danger signal, even decoratively.
- Category-coded left-border accents on cards (coral = symptoms, sage = wellness, gold = milestones) are a **secondary cue, not the only cue** — pair with an icon or label so the coding doesn't rely on color perception alone (colorblind-safe).

### 2.3 Contrast reference (WCAG 2.1 / APCA)

| Pairing | WCAG | APCA Lc | Use |
|---|---|---|---|
| Deep plum on cream | 11.24:1 | 87.7 | ✅ Body text |
| Deep plum on white | 12.90:1 | 97.1 | ✅ Body text |
| White on deep plum | 12.90:1 | 100.7 | ✅ Body text |
| Darkened sage on cream | 4.99:1 | 69.1 | ✅ Body text |
| White on CTA coral `#D63A29` | 4.67:1 | 76.5 | ✅ Button label |
| Deep plum on peach / sage / gold | 6.73–8.16:1 | 58.6–68.6 | ⚠️ Headings/bold only, 18px+ |
| White on soft coral `#FF8C7A` | 2.26:1 | 49.0 | ❌ Fails — never use for text |
| Golden sunrise on cream | 1.32:1 | 14.8 | ❌ Fails — decorative only |
| Raw sage mist on cream | 1.41:1 | 19.0 | ❌ Fails — decorative only |

**Edge case:** any new color pairing added later must be checked against both WCAG and APCA before shipping — this table is the baseline, not the full set of every possible combination.

---

## 3. Typography

| Language | Headings | Body |
|---|---|---|
| English | Poppins | Mukta |
| Hindi | Baloo 2 | Mukta |

- Poppins has no Devanagari support — it is never used for Hindi headers.
- Baloo 2 is the Devanagari equivalent to Poppins' rounded header weight, keeping header/body hierarchy consistent in both languages.
- Mukta is the single body font across both languages, chosen over Hind for a warmer, more humanist feel and proven Devanagari rendering on low-end Android.
- One serif/handwritten "voice" font is reserved for a single personal feature (e.g. weekly letter-to-baby, quote-of-the-day) as a deliberate contrast moment — not used elsewhere.

**Edge cases:**
- Text must reflow gracefully at 200% dynamic type scaling (accessibility text-size setting) without breaking card layouts or truncating button labels.
- Hindi strings commonly run longer than English equivalents — buttons and nav labels must be designed against the longer string, not the English baseline, to avoid clipping.
- Mid-sentence code-switching (Hindi sentence with English loanwords like "checkup," "doctor") must not trigger a visible font or size jump — Mukta's Latin and Devanagari sets should feel like one voice.

---

## 4. Iconography

- Icon library: **Feather icons** (outline style, consistent stroke weight), warmed to match the rest of the system:
  - Stroke weight increased to **1.75–2px** (from Feather's default 1.5px), with **rounded line caps** — echoes the rounded typefaces and 16–20px card corners so icons don't read as a colder, off-the-shelf layer against the warm palette.
  - Icons are tinted in **deep plum or CTA coral** by default — never flat black or gray.
- Icon-only buttons (no visible label) require an accessible label for screen readers — outline icons alone are not sufficient for non-visual users.
- Icons used as the secondary cue for category-coded cards (symptoms/wellness/milestones) should be drawn from Feather's set to stay visually consistent with the rest of the UI.

---

## 5. Layout & components

### Background
- Base: warm cream `#FFF3E4`, flat, never pure white.
- One signature ambient moment: a single soft radial glow (peach or coral, **4–6% opacity**) positioned behind the week-progress hero card on the Today tab, very slowly scaling — a near-imperceptible "breathing" loop, **6–8s**, echoing the app quietly alive alongside the pregnancy.
- This is the **only** moving background element in the app — no other screen gets ambient motion. One signature moment, not a texture applied everywhere (restraint, §6).

**Edge cases:**
- The glow must sit far enough behind foreground content, and stay low enough opacity, that it never touches or reduces contrast on any text-bearing area — recheck WCAG/APCA on any text that ends up layered over it.
- Respects OS "reduce motion": the glow renders fully static (no breathing scale) when the setting is on.
- Suppressed entirely on sensitive-moment screens (§8), same as all other decorative motion.

- Card corners: 16–20px radius — larger than typical UI default, reinforces softness.
- Card shadows: warm-tinted (derived from deep plum, e.g. `rgba(103,0,53,0.08)`), never gray or pure black.
- Cards carry a left-border accent strip color-coded by category, always paired with an icon (see §2.2, §4).
- Primary CTA buttons: fully rounded/pill-shaped, CTA coral fill, white text.
- Disabled button state: **desaturated peach**, not gray — gray reads clinical and breaks the palette's warmth.
- Data visualization: radial/circular progress preferred over bar charts. Trend lines in sage or coral gradients — **never red/green**, which read as clinical pass/fail in a health context.

**Edge cases:**
- A card with no category (general content) needs a defined neutral/no-accent state — don't force one of the three category colors onto content that isn't actually symptom/wellness/milestone-related.
- Long content inside a rounded card (e.g. a detailed symptom note) must not break the corner radius or shadow treatment at scroll — corner/shadow rules apply regardless of card height.

---

## 6. Motion & animation

- Philosophy: **restraint** — one signature, memorable animation beats many small ones.
- Milestone moments (week change, heartbeat detected, trimester transition): a single soft "bloom" — a circle gently expanding and fading, gold or coral, **400–600ms, never longer, never repeated**.
- Tab switches: gentle cross-fade, never a slide.
- Pull-to-refresh: custom animation (growing bump icon or heartbeat pulse), not the default spinner.
- Primary CTA buttons: slight scale-up on press, not just a color change.
- Haptics (if used): a single soft/light tap reserved for milestone moments only — never the default heavy buzz.

**Edge cases:**
- All animation must respect the OS-level "reduce motion" accessibility setting — when enabled, the bloom becomes a simple fade, cross-fades shorten, and pull-to-refresh falls back to a static indicator.
- On the sensitive-moment screens (§8), **all decorative animation is suppressed** — no bloom, no bounce, no confetti-adjacent motion — even if the underlying event would otherwise trigger one (e.g. a "milestone week" landing on the same day as a flagged concerning symptom should not fire the bloom).
- Low-end Android devices: motion should degrade to simple opacity fades rather than dropped frames on transform/scale animations — test the bloom and pull-to-refresh on lower-spec hardware specifically.

---

## 7. Illustration system

- Custom, consistent, warm, rounded illustration style — not photorealistic, not childish/cartoonish.
- Must represent diverse Indian skin tones, body types, and family structures by default, not as a variant/afterthought.
- Used across onboarding, milestones, and empty/loading states in place of stock photography.
- Week-by-week baby-size comparisons are illustrated in-palette, not generic stock versions.

**Edge case:** if a user's pregnancy circumstances fall outside the default assumption (e.g. loss, complication, non-standard family structure), illustration content must not default to the standard "happy milestone" imagery — see §8.

---

## 8. Sensitive-moment mode

A distinct tonal and visual mode, used for miscarriage, complications, concerning results, or any screen dealing with loss or medical risk.

- Copy: plain, calm, zero cheerfulness, no emoji.
- Palette recedes to **cream and deep plum only** — no coral, gold, sage, no celebratory color at all.
- No decorative animation (see §6 edge cases).
- No milestone illustration imagery.
- Notifications tied to this context use calm, non-urgent language unless the situation is genuinely medically urgent, in which case clarity outranks warmth.

**Edge case:** the app must detect when a milestone/celebratory trigger (week change, size comparison, bloom animation) would otherwise fire on the same day sensitive-moment mode is active, and suppress it — a cheerful "Laddoo is the size of a mango!" notification must never land the same day as a flagged loss or concerning result.

---

## 9. Tone, voice & language

- Core voice: knowledgeable friend — warm, direct, reassuring. Never clinical/textbook, never forced-perky.
- No guilt or shame language around missed logging, skipped appointments, or habits (no passive-aggressive nudges).
- Hindi copy reads as natural, conversational Hindi — how a caring elder sister/didi would actually speak — not formal/Sanskritized translation. Common English loanwords (checkup, doctor, appointment) are kept as-is.
- Notification tone: routine reminders stay non-urgent; urgency is reserved only for patterns genuinely worth flagging to a doctor.
- Error copy is plain and calm ("Didn't save — try again?"), never technical ("Error: symptom not logged").

**Edge cases:**
- Whichever language a screen is in, the emotional register must match exactly — Hindi copy must not default to more formal/distant phrasing just because direct translation tends to do that.
- A user who has indicated "just the facts" tone preference (see §10) should never receive forced-cheerful milestone copy — the tone toggle must apply consistently across notifications too, not just in-app screens.

---

## 10. Personalization

Personalization is what converts baseline warmth into "this app actually knows me." Generic warm copy is brand voice; a remembered, specific detail (her name at the right moment, a callback to what she logged, the baby's own nickname) is what makes it personal — this is the test every personalization decision below should be held to.

- User's name used at emotionally significant moments only — not every screen.
- Baby's name/nickname (if set) used in milestone copy.
- Copy references logged data (e.g. recent symptoms) instead of generic, unrelated tips.
- Tone adapts to first-time vs. repeat pregnancy — first-time gets more explanation, repeat gets more respect for prior experience.
- Onboarding includes a tone-preference toggle ("just the facts" vs. "more encouragement and context").
- Time-of-day and trimester both subtly shift background tint (§2, §5) as a form of ambient personalization.

**Edge cases:**
- Default state (before any personalization signal is given) must remain neutral and warm — never presumptive about partner involvement, family structure, or whether the pregnancy is wanted/easy.
- If personalization data conflicts with a sensitive-moment trigger (e.g. baby's nickname already in use, but sensitive-moment mode is now active), §8 rules override — no nickname-based cheerful copy during sensitive-moment mode.

---

## 11. Accessibility checklist

- [ ] All text/background pairings checked against WCAG 2.1 AA and APCA (see §2.3 baseline table).
- [ ] Color is never the only encoding — category accents always paired with an icon.
- [ ] Icon-only controls carry accessible labels (Feather icons have no inherent text alternative).
- [ ] Layouts tested at 200% dynamic type scaling.
- [ ] All motion respects OS "reduce motion" setting.
- [ ] Sensitive-moment mode overrides color, motion, and copy simultaneously — verified as one atomic switch, not three separate toggles that could fall out of sync.

---

## 12. Tone consistency check

Every visual and interaction decision in this document is cross-checked against §9 (knowledgeable friend — warm, direct, never clinical, never forced-cheerful):

- [x] Color — warm palette throughout; red banned; sensitive-moment mode strips color back to cream/plum, mirroring "clarity over warmth in urgent moments."
- [x] Typography — Poppins/Baloo 2/Mukta are all rounded, humanist faces; the one serif/handwritten moment is used sparingly, not everywhere (restraint).
- [x] Iconography — Feather base, warmed via stroke weight, rounded caps, and palette tinting (see §4) so icons don't read as a colder, generic layer.
- [x] Motion — celebratory only where earned (milestones), never ambient; suppressed entirely in sensitive-moment mode.
- [x] Illustration — the clearest embodiment of "friend" in the system; diverse by default.
- [x] Copy — plain, warm, no guilt language, no forced cheer; tone-preference toggle respects what she actually wants rather than imposing one register on everyone.
- [x] Personalization — additive, never presumptive; defers to sensitive-moment mode when the two would otherwise conflict.

New components or copy added later should be checked against this list before shipping, the same way §11 gates on accessibility.
