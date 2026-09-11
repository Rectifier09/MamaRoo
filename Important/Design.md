# **MamaRoo Design System**

The complete, single-source-of-truth design reference. Every token, rule, and component is defined exactly once; everywhere else in this file references it by name rather than restating it. Built for 2 to 3 developers to work in parallel without duplicating or missing anything.

> **Naming status:** MamaRoo is the final product name. Every reference to the product name in code should remain a single configurable constant rather than hardcoded, so any future update touches one place.

---

## **1\. Foundation and philosophy**

**Audience:** Tier 1 and Tier 2 women in India, with real access to both iOS and Android, generally more digitally comfortable and literate than a Tier 2/3-only audience would be.

**Platform:** Progressive Web App, mobile-first, installable on both iOS and Android. Not a native Android app, not built on Material Design 3. That system was considered and rejected: it's justified by Android dominance in Tier 2/3 India specifically, which doesn't hold for this audience, and adopting it would make the product feel foreign on every iPhone it runs on.

**Design system approach:** a custom, brand-owned token system rather than an off-the-shelf framework. This is the current best practice, not a cautious compromise, a bespoke system is what makes a product look considered rather than templated.

**The three wow moments this whole system protects, referenced throughout:**

1. The calm Today screen, deliberately uncluttered.
2. The weekly baby illustration stage-change reward.
3. The one-tap Doctor Visit Summary, standing in for the doctor portal this build deliberately excludes.

Everything else in the product is intentionally quieter than these three.

**Visual-first principle:** wherever a data point, trend, or comparison can be shown instead of read, default to showing it — a trend line instead of a table of past BP numbers, a progress ring instead of "6 of 9 stages complete" as text, a day-grid instead of a paragraph of medicine-adherence copy. This is a cognitive-load decision, not a decoration decision: this audience is often reading in a second language and dealing with pregnancy fatigue, so lower reading load matters more here than in a typical consumer app. Applies most to My Care (medicine adherence, appointment history) and My Baby (growth trends), not to the calm Today screen, which stays deliberately text-light for a different reason (see the three wow moments above).

**Color mode:** light only, by explicit decision. This trades away dark-mode support for a real use case (checking symptoms at night without a bright screen) in exchange for not maintaining a second, independently verified palette. See section 8 for the lightweight partial mitigation.

**Differentiation strategy, stated plainly so it isn't lost:** the pregnancy-tracker category defaults almost universally to pale pink or lavender, playful rounded typefaces, and open peer-community chat. This product deliberately chooses a deeper, earthier palette, a more geometric typeface, a scoped safety-first chatbot, and a warm background motif carrying a sense of home rather than clinical or cutesy, not as compromises, but as the actual differentiation strategy.

---

## **2\. Design tokens**

This is the single source of truth for every value used anywhere else in this document or in code. Reference tokens by name elsewhere; never restate a hex value or size outside this section.

### **Color**

| Token | Hex | Role |
| ----- | ----- | ----- |
| `color-bg` | `#EDE3D3` | Base background, deep warm sand |
| `color-surface` | `#F5EEE1` | Card and component surface |
| `color-surface-raised` | `#FFFFFF` | Modals, sheets |
| `color-text-primary` | `#2E2822` | Body text (11.5:1 on `color-bg`) |
| `color-text-secondary` | `#5A4F42` | Supporting text, captions (6.3:1) |
| `color-accent-primary` | `#A8482E` | Rust terracotta. Fills, and headings as text (4.6:1, reserve for short text, not paragraphs) |
| `color-accent-secondary` | `#3D6B58` | Deep sage. Usable as text (4.8:1) or fill |
| `color-alert` | `#8C2F3D` | Urgent states only, fills and badges. Deliberately a wine/maroon, not a darker version of `color-accent-primary`, so the two stay distinguishable by hue, not just lightness — reserving `color-accent-primary` from ever being mistaken for an urgent signal. Contrast on `color-bg`: 6.4:1. Verify hue separation with a color-vision-deficiency simulator before final sign-off. |
| `color-success` | `#4F6E3D` | Confirmation states, muted, never bright |
| `color-divider` | `#D8CBB2` | Hairline borders |
| `color-overlay-scrim` | `#2E2822` at 45% opacity | Behind modals and sheets |

**Color rules:** color is never the only signal of meaning, every state that uses color also carries an icon or label. No background gradient washes anywhere except the two named exceptions in section 6 (splash screen, hero illustration). `texture-grain-opacity` (2 to 3%) applies to background layers only, never text or cards. `texture-motif` (below) is a separate, more figurative background layer with its own, narrower rules — see section 6 for exactly where it is and isn't allowed.

### **Data visualization**

A separate palette from the UI tokens above, used only inside charts (BP trend, weight trend, symptom frequency) — never for buttons, cards, or nav.

| Token | Hex | Role |
| ----- | ----- | ----- |
| `chart-series-1` | `#A8482E` | Primary metric line/bar (reuses `color-accent-primary`) |
| `chart-series-2` | `#3D6B58` | Secondary metric, e.g. diastolic vs systolic (reuses `color-accent-secondary`) |
| `chart-series-3` | `#C08A28` | Third metric, ochre gold |
| `chart-series-4` | `#6B4A3D` | Fourth metric, umber brown |
| `chart-gridline` | `#D8CBB2` | Axis lines, gridlines (reuses `color-divider`) |
| `chart-normal-range` | `color-bg` at 60% opacity, banded | Shaded reference band for a healthy range (e.g. normal BP), sits behind the data line |

**Rule:** never rely on color alone to separate series — pair each with a distinct line style (solid/dashed) or marker shape, or a direct end-of-line label, since two of these four hues (series 1 and 3) sit close enough that colorblind users need the secondary cue. Cap at 4 series per chart; if a screen needs a 5th metric, split into two charts rather than adding a 5th color.

### **Background motif**

| Token | Value | Role |
| ----- | ----- | ----- |
| `texture-motif` | A single abstract line-art motif: a gentle vine-and-leaf form, hand-drawn feel, closed line weight matching icon strokes. Rendered in `color-text-primary` at 4 to 6% opacity, never higher. | A quiet, recurring background presence meant to feel warm and familiar rather than clinical or generic-app, without illustrating anything literal or region/religion-specific (no festival, deity, or regional-craft-specific motifs — see the saffron caution in section 1's differentiation notes). One motif, reused everywhere it appears, so it reads as a signature rather than decoration. |

**Where `texture-motif` is allowed:** splash screen (under the approved gradient wash, see section 6), onboarding screens, and empty states, always at 4 to 6% opacity, always behind content, never intersecting text or icons. **Where it is not allowed:** Today, My Baby, My Care, and Ask — the screens someone opens many times a day. Adding a background motif there fights the calm-screen wow moment and the hierarchy law below; the motif's entire value is in marking a small number of "arrival" and "nothing here yet" moments as distinct, not in being everywhere.

### **Typography**

**Headings and display: Poppins.** **Body text: Hind.** Both Google Fonts, both confirmed bilingual (Devanagari and Latin). Hind's Devanagari is engineered to 94% of Latin capital height specifically so mixed-language text shares one visual baseline, the reason it was chosen over any alternative.

| Token | Size | Line height | Weight | Use |
| ----- | ----- | ----- | ----- | ----- |
| `type-display` | 28px | 36px | Poppins, medium | Splash, hero moments only |
| `type-h1` | 24px | 32px | Poppins, medium | Screen titles |
| `type-h2` | 18px | 26px | Poppins, medium | Section headers |
| `type-body` | 16px | 24px | Hind, regular | Body text |
| `type-body-sm` | 14px | 20px | Hind, regular | Secondary body text |
| `type-caption` | 13px | 18px | Hind, regular | Captions, metadata, AI-suggestion labels |
| `type-button` | 15px | 20px | Hind, medium | Button labels |

**Bilingual rule, applies everywhere, stated once:** the spacing grid never changes between languages, only containers flex. Text containers use minimum height, never fixed height, since Devanagari runs 15 to 30% longer than equivalent English. Buttons and labels are sized for the longer language first. Every screen and every component is checked in both languages before being called complete, not just in English.

### **Spacing and shape**

| Token | Value |
| ----- | ----- |
| `spacing-xs` | 4px |
| `spacing-sm` | 8px |
| `spacing-md` | 16px |
| `spacing-lg` | 24px |
| `spacing-xl` | 32px |
| `spacing-screen-margin` | 20px, fixed on every screen |

&nbsp;

| Token | Value | Use |
| ----- | ----- | ----- |
| `radius-sm` | 12px | Buttons, inputs, chips |
| `radius-md` | 20px | Cards |
| `radius-lg` | 28px | Modals, sheets, hero elements |
| `radius-full` | 999px | Pills, avatars |

&nbsp;

| Token | Shadow | Use |
| ----- | ----- | ----- |
| `elevation-0` | None | Base screen content |
| `elevation-1` | `0 1px 3px rgba(46,40,34,0.08)` | Cards at rest |
| `elevation-2` | `0 2px 6px rgba(46,40,34,0.12)` | Pressed or active cards |
| `elevation-3` | `0 8px 24px rgba(46,40,34,0.16)` | Modals, sheets, floating elements |

Shadows are built from `color-text-primary`, warm-toned, never generic cool gray.

### **Hierarchy law**

One high-emphasis (`color-accent-primary` filled) element per screen, always. Everything else is secondary (outlined) or tertiary (text-only). Any primary action needs `spacing-lg` of clear space around it. One card communicates one primary message plus at most one supporting action; a card trying to do more is two cards.

### **Icons**

**Phosphor Icons**, not Material Symbols (corrected during review: Material Symbols is Google's own visual language, and keeping it while rejecting Material Design elsewhere was an unnoticed contradiction). Regular weight for standard UI. Duotone, in `color-accent-primary` and `color-accent-secondary`, reserved for hero moments, empty states, and onboarding only, to control bundle size and keep the treatment special rather than everywhere.

| Token | Value | Use |
| ----- | ----- | ----- |
| `icon-inline` | 18px | Inside body text |
| `icon-default` | 24px | Cards, list rows, form fields |
| `icon-nav` | 26px | Bottom navigation |
| `icon-hero` | 40px | Empty states, duotone treatment |

Icon-to-text pairings get manual optical alignment, not just CSS vertical-align, since icon grids and font baselines don't share a coordinate system.

### **Motion**

**Philosophy: motion that explains, never motion that performs.**

| Token | Value | Use |
| ----- | ----- | ----- |
| `motion-fast` | 150ms | Instant feedback: taps, ticks, toast entrance |
| `motion-base` | 250ms | Card expand, tab switch, toast exit |
| `motion-slow` | 400ms | Screen transitions, language switch |
| `motion-hero` | 800–1200ms | The three wow moments only |
| `easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Ease-out, entering elements |
| `easing-spring` | Low-bounce spring, damping ≥ 0.85 | Settling into place, never high-bounce |

`prefers-reduced-motion` is respected everywhere, both platforms, without exception, collapsing every animation below to an instant state change.

---

## **3\. Platform and PWA requirements**

* Installable on iOS (Add to Home Screen) and Android (Chrome install prompt), web app manifest with maskable icons, `theme-color` set to `color-bg`.
* Safe area insets (`env(safe-area-inset-*)`) respected everywhere for the iPhone notch and home indicator.
* Offline support via **App Shell architecture**: navigation and layout shell cached aggressively for instant load, content fetched dynamically underneath. This is the actual mechanism, not just an intention, behind Today, the care plan, and emergency guidance working offline.
* Screen transitions and the illustration-morph effect use the native **View Transitions API** (Baseline 2025, GPU-accelerated, measurably faster than JS animation libraries on low-end devices), with graceful crossfade fallback where unsupported. Verify support directly on real target devices before relying on it.
* Native web input types (date, tel, number) everywhere possible, so each OS shows its own familiar control.
* Fonts as WOFF2, `font-display: swap`, critical fonts preloaded.
* Android's back gesture and iOS's edge-swipe-back are both supported natively, never intercepted except for an explicit unsaved-changes confirmation.
* Performance target: a real mid-range device, two to three years old, tested directly, not assumed from a flagship.
* **Known iOS constraints:** push notifications only work from iOS 16.4 onward and behave differently than Android; Safari can evict local storage after inactivity, so nothing critical relies on local storage alone, sync promptly instead.
* **Haptics:** a light tap on primary confirmations (task complete, medicine logged), with a silent no-op fallback where the Vibration API is restricted (notably iOS Safari, historically). Never something the experience depends on.

---

## **4\. Navigation**

* Five bottom tabs: Today, My Baby, My Care, Ask, More. Identical on iOS and Android, deliberately, to avoid divergent-per-OS QA burden and user confusion.
* Active tab: `color-accent-primary` fill plus a label weight change, never color alone.
* Deep links (from a notification, for example) always land on a working screen with a visible path back to Today, never a dead end.
* Interrupted flows (an incoming call mid-task, for example) preserve state exactly as left; nothing resets on return.
* Screen transitions use `motion-slow`; tab switches use `motion-base`.

---

## **5\. Component library**

**Build order, read this before writing any component code:** primitives are built once, by one person, before any parallel work starts. Composites are built next, from primitives, still shared. Only after both layers are stable does work split three ways across screen assemblies. Building screens before primitives exist is how three developers end up with three different buttons.

Every component below has its states and its edge cases defined together, in the same table, on purpose, so neither gets missed by someone reading only part of this document.

### **5.1 Primitives**

#### **Button**

| State | Treatment |
| ----- | ----- |
| Default (primary) | `color-accent-primary` fill, white text, `radius-sm` |
| Pressed | Fill darkens 8%, scale to 98% over `motion-fast` |
| Focused | 2px `color-accent-primary` outline, 2px offset |
| Disabled | Fill 40% opacity, text 60%. Prefer explaining why over disabling where possible |
| Loading | Fill unchanged, label replaced with inline spinner, size never changes |

Secondary: `color-surface` fill, `color-accent-primary` 1.5px border and text, same states. Text resizing to 200% must not break the button, label wraps rather than truncating silently.

#### **Card**

| State | Treatment |
| ----- | ----- |
| Default | `elevation-1`, `radius-md` |
| Pressed (if tappable) | `elevation-2`, scale to 99% over `motion-fast` |
| Selected | `color-accent-secondary` 1.5px border, elevation unchanged |
| Disabled | Content 50% opacity |

Edge case: a card whose content overflows its expected length (a long medicine name, a long note) truncates gracefully with a "show more," never clips silently.

#### **Input**

Native web input types wherever possible (date, tel, number).

| State | Treatment |
| ----- | ----- |
| Default | `color-surface` fill, `color-divider` 1px border, `radius-sm` |
| Focused | Border becomes `color-accent-primary` 2px, label animates up over `motion-fast` |
| Filled | Border returns to `color-divider`, label stays up |
| Error | Border becomes `color-alert` 2px, specific message below, e.g. "Enter a number between 1 and 10," never "Invalid input" |
| Disabled | Fill 60% opacity |

Edge case: Devanagari input must never be visually cut off by a Latin-sized field; fields size to the longer language's expected content.

#### **Checkbox, toggle, tab (in-page)**

Default, checked/active, pressed, disabled. Checked or active state uses fill weight and color together, never color alone. Fill settles over `motion-fast`, no bounce.

#### **Toast / snackbar**

A brief, quiet confirmation, for example "Saved." Enters over `motion-fast`, holds roughly two seconds, exits over `motion-base`. Never requires a tap to dismiss, never stacks more than one at a time. Edge case: if a second toast is triggered while one is showing, the first is replaced, not queued.

#### **Modal / bottom sheet**

`elevation-3`, `radius-lg`, `color-overlay-scrim` behind it. Enters with `motion-slow`, `easing-standard`. Edge case: back gesture on both platforms closes the sheet rather than navigating away from the screen underneath it.

#### **Icon wrapper**

Wraps any Phosphor icon at its correct `icon-*` token size with optical alignment applied. Edge case: if an icon asset fails to load, render nothing rather than a broken-image glyph.

### **5.2 Composites**

#### **Empty state**

A quiet, specific illustration (duotone, `icon-hero`), the `texture-motif` background at its standard 4 to 6% opacity, plus one line of copy, unique per section, never a generic blank card. The illustration itself should depict a small, recognizable everyday moment relevant to that section rather than an abstract icon-like shape — a woman resting with a hand on her stomach for the symptoms section, a small pill organizer for medicines, a phone with a calendar for appointments — so the empty state feels like it recognizes her situation, not just fills space. Example copy: "Nothing here yet. Add your first medicine when you're ready."

#### **Loading skeleton**

Soft gray placeholder shapes matching the destination content's layout, not a spinner. Used for anything loading on a slow connection, feels faster at identical load time.

#### **Error banner**

`color-alert` accent, plain-language explanation, always paired with a next step, never a dead-end error.

#### **Illustration container**

Wraps any animated illustration (the baby illustration, primarily) with its static-fallback and `prefers-reduced-motion` logic built in once here, so no individual screen has to reimplement it. Ambient loop: 4 to 6 seconds, slow rise and fall, `motion-hero` for stage-change cross-fades. Edge case: if the animation file fails to load, the static fallback renders automatically, never a blank space.

#### **Audio indicator**

A consistent speaker icon, `icon-default`, top-right of any card with narration available. Reviewed static content gets pre-recorded human narration; dynamic or user-entered content gets text-to-speech. Always a supplement, every screen fully usable with audio off.

#### **Language switcher**

A clearly findable control, not buried in settings. Switching triggers a `motion-slow` transition: current text fades out, layout reflows for the new language's text length, new text fades in. One calm crossfade, never a jarring reload flash.

#### **Symptom-severity badge**

Icon plus label plus color together, for the three levels: General, Contact clinic, Urgent. Never color alone, per the color rule in section 2.

#### **Stage-progress indicator**

Shows her current position across the 9-illustration baby development timeline. Updates only at stage boundaries, not every week, matching the illustration system's own logic.

#### **List row**

Standard content row for medicines, reports, appointments. Long lists (15+ items) use a defined "show more" pattern rather than growing indefinitely.

#### **Section header / disclaimer banner**

Section header: `type-h2`, consistent spacing above and below. Disclaimer banner: `type-caption`, `color-text-secondary`, used for any AI-suggested content or medical-adjacent information, plain wording, never alarmist.

#### **Chatbot entry and panel**

See section 7 for the full scoping rules this component must enforce; this entry only covers its visual states.

| State | Treatment |
| ----- | ----- |
| Entry icon | Phosphor, duotone (`color-accent-primary` / `color-accent-secondary`), docked bottom-right, present on every screen |
| Panel open | Bottom sheet (see Modal primitive), rises with `motion-slow` |
| Her message | Right-aligned, `color-surface` card |
| Bot response | Left-aligned, `color-bg` card, no avatar, no "AI" badge, no sparkle icon |
| Health-topic response | Always carries the disclaimer banner composite: "From reviewed guidance, not a diagnosis" |
| No match found | Plain statement that it doesn't know, with a direct route into the Ask flow's severity system, never a guessed answer |

### **5.3 Illustration diversity**

Applies to the baby-illustration timeline, empty-state illustrations, and any onboarding artwork depicting the user herself.

* Skin tone range spans at least 4 tones across the illustration set, reflecting the diversity of Tier 1/2 India rather than a single default tone.
* No single "default" skin tone is used more than the others across the 9-stage baby timeline; rotate or let the user pick at onboarding if feasible.
* Regional dress cues, if any appear in onboarding illustrations, stay generic rather than tied to one specific region or festival, so no user reads the product as "not for someone like me."
* This sits alongside, not instead of, the existing duotone treatment in `color-accent-primary` / `color-accent-secondary` — diversity is expressed through the illustrated figures themselves, not through color.

### **5.4 Screen assemblies**

Not specified in full here, that's a separate layout document, but the ownership split for parallel work: Today and My Baby share the illustration container and stage-progress indicator, natural pairing for one developer. My Care's sub-screens (medicines, appointments, reports, doctor's advice) share enough state that they should stay with one owner rather than splitting across two people. Ask, the chatbot, and the Doctor Visit Summary form the third grouping, since they share the severity-badge and disclaimer-banner composites. Onboarding and Settings are lower-risk to split independently since they touch the fewest shared composites.

---

## **6\. Distinct visual registers**

Three places in the product deliberately step outside the standard warm, personality-forward treatment described above. All three are intentional exceptions, not inconsistencies.

### **Splash screen**

`color-bg`, flat, no gradient on the base layer. The one approved gradient: a soft, heavily blurred terracotta-to-transparent wash behind the logo mark. `texture-grain-opacity` across the full background, with `texture-motif` layered beneath it at its standard 4 to 6% opacity — this is the screen the motif is designed for first: the first thing she sees should feel warm and familiar, not like a blank loading screen. Logo centered, upper third. Tagline in `type-body` (Hind, not Poppins, since a first-launch trust-building moment isn't the place to perform personality). Motion: a single fade-in on the logo, `motion-base`, `easing-standard`, nothing else moves.

### **Doctor Visit Summary**

This screen is read by someone outside the app's usual audience and stands in for the doctor portal this build deliberately excludes. It does not use the product's usual warm, illustrated personality, and it does not use `texture-motif`.

* No illustrations, no decorative icons.
* No motion at all, on the screen or its generation.
* Generous white space, closer to a printable document than an app screen.
* Typography stays Poppins and Hind, at restrained weights, no display-scale headlines.
* Color used sparingly: `color-text-primary` on white, `color-accent-primary` for section labels only, no background washes.
* Always states plainly: information entered by the user, not medically verified.

**Print and PDF export:**

* `@media print` hides the bottom nav, the chatbot entry icon, and any interactive control — only the summary content prints.
* Page margins: 15mm all sides. Content reflows to full page width.
* `break-inside: avoid` on every medicine row, appointment entry, and section block, so a table row never splits across a page boundary.
* `-webkit-print-color-adjust: exact` and `color-adjust: exact` set, so the two colors this screen uses (`color-text-primary`, `color-accent-primary`) print as specified rather than being stripped by the browser's print defaults.
* If the summary spans multiple pages, the clinic-visit date and "information entered by the user, not medically verified" disclaimer repeat in a running header/footer on every page.

### **Consent and legal screens**

Any screen requiring explicit consent (data sharing, terms of use, future doctor-portal opt-in) uses the Doctor Visit Summary's restrained register as its base: no illustration, no motion, no `texture-motif`, generous white space, `color-text-primary` on white.

* A plain-language summary (1-2 lines, `type-body`) sits above the full legal text — full legal text alone has poor real-world comprehension, and this audience is often reading it in a second language.
* Any optional data-sharing consent (e.g. sharing with a doctor portal later) is a separate, un-checked checkbox from the baseline consent required to use the app — never bundled, never pre-checked.
* Primary action ("Agree and continue") is a standard filled button; "View full policy" is tertiary text-only, not competing visually per the hierarchy law in section 2.
* The language switcher is present on this screen specifically, since getting consent language right matters more here than almost anywhere else in the product.

---

## **7\. AI features and the chatbot**

**The anti-slop rules, specific and checked against current design criticism, not assumed:** no sparkle icon, no purple or blue gradient, no "AI-powered" badge anywhere in the product. No colored left-border strip on any card (named in current criticism as the single most reliable AI-generated tell). No cards nested inside cards. Any suggested content is captioned plainly, "Suggested for you," "Based on this week," in `type-caption`, using the same visual language as everything else, never a separate AI-flavored treatment. Loading states for AI-generated content use the same skeleton pattern as everything else, never a shimmering "thinking" animation.

**The chatbot's actual scope, which is the safety-critical part:**

1. **App navigation and her own data** ("when's my next appointment," "show my BP readings") — fully open-ended, since no medical content is being generated, only her own data retrieved or app actions taken.
2. **Health questions** are answered only by retrieving from the same reviewed content that backs the Ask flow's guided categories, never by generating a novel medical answer. If no reviewed content matches her question, the bot says so plainly and routes into the existing three-tier severity system rather than guessing.

This boundary exists because an open, unreviewed chatbot answering arbitrary medical questions is precisely the risk the whole Ask flow's guided-categories design was built to prevent. The chatbot must not quietly reopen that risk through a different door.

---

## **8\. Accessibility**

**Screen reader support**, baseline requirement: proper ARIA labeling and semantic HTML, correctly read by VoiceOver on iOS and TalkBack on Android. Descriptive alt text on every illustration. `texture-motif` and `texture-grain-opacity` backgrounds are marked `aria-hidden="true"` — they're decorative, and a screen reader announcing "vine pattern" on every screen it appears on would be noise, not information. Correct language tagging so Hindi and English are each pronounced correctly.

**Spoken narration**, a genuine but secondary feature for this more literate audience, detailed under the Audio indicator composite in section 5.

**Low-light use without dark mode:** a lightweight brightness-dim toggle within the light theme, same colors at reduced luminance, is a proposed mitigation, not yet confirmed or specced in detail. Flagged here so it isn't silently dropped.

### **WCAG checklist**

* \[ \] Text contrast: 4.5:1 normal text, 3:1 large text and UI components (consider a follow-up APCA pass for a more current, perceptually accurate check beyond WCAG 2.x ratios).
* \[ \] Touch targets: minimum 48×48dp equivalent, both platforms.
* \[ \] Text resizing: functional at 200% scale, no clipped or overlapping content.
* \[ \] Color never the sole indicator of meaning or state.
* \[ \] `prefers-reduced-motion` respected on every animation, no exceptions.
* \[ \] Accessible labels for VoiceOver and TalkBack on every interactive element.
* \[ \] Descriptive alt text on every illustration.
* \[ \] Correct language tagging on every text block.
* \[ \] Captions in Hindi and English on any video content.
* \[ \] Visible labels and specific, actionable error messages on every form field.
* \[ \] Visible focus states, verified for contrast against both the component and the background, for switch access and external input devices.

---

## **9\. Voice and copy**

The tone is a steady friend who has already been through this, not a doctor, not an app, not a brand pitch.

* No em dashes in any in-app copy, enforced.
* No "it's not just X, it's Y" construction.
* Banned words: unlock, empower, seamless, elevate, dive into, harness, leverage.
* Short sentences, one idea each.
* Hindi copy written as natural spoken Hindi, never a literal translation.
* Every line passes a read-aloud test before shipping.
* Gentle language on any missed task or incomplete state, never failure language.

---

## **10\. What this file does not cover yet**

* Detailed screen-by-screen layout specs are a separate document from this token, component, and system-level reference.
* The `texture-motif` artwork itself (the actual vine-and-leaf line art) still needs to be illustrated and exported as an asset; this file specifies its usage rules and opacity, not the finished graphic.
* Tooltips and any custom date-picker styling beyond "use the native control" need their own pass if a custom version is ever required.
* The pilot regional language beyond Hindi and English needs its own font and spacing check once chosen.
* The brightness-dim toggle in section 8 is a proposal awaiting confirmation, not a built decision.
* Exact iOS 16.4+ push notification implementation needs a dedicated technical spec before build.

&nbsp;
