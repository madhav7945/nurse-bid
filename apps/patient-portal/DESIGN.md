# NurseBid — Frontend Design Generation Prompt (patient portal)

Paste this into Stitch / v0 / Lovable / Bolt / Uizard / Figma Make when generating any screen. It locks down a specific design system so the tool fills it in instead of inventing its own generic look.

---

## Product context

NurseBid is a marketplace connecting Indian families with verified registered nurses for in-home post-surgical and critical care. The product handles two things people don't take lightly: **medical safety** and **money in escrow**. The UI must feel like a serious clinical-fintech product — closer to a hospital admin console crossed with a banking app — never like a generic startup dashboard template.

Reference feel: think Epic/Cerner (clinical seriousness) crossed with Stripe Dashboard or Mercury (financial trust and restraint) — not a generic AI SaaS template, not a consumer social app, not a cutesy healthtech app with rounded mascots.

---

## Hard "do not" list — reject any output that includes these

AI design tools default to a recognizable set of patterns. Explicitly refuse to generate:

- Purple-to-blue or pink-to-orange gradient backgrounds or gradient buttons
- Glassmorphism / frosted blur panels
- Every container styled identically (same rounded corner radius + same soft drop shadow on literally every card, stat tile, list row, and modal)
- More than one solid/filled colored button visible on the same screen
- Decorative colored icons on stat cards where the color has no meaning (a purple heart icon next to "hours," an orange icon next to "proposals," etc.)
- Generic 3-column "feature grid with icon + heading + one line of text" sections
- Default system font stack with no defined type scale (i.e., everything at 14–16px regular with occasional bold, no hierarchy)
- Emoji used as icons
- Big rounded pill badges used for every single label regardless of importance
- Illustrations of generic diverse cartoon people/mascots
- Dark navy sidebar + white content area as the only structural idea (this is the single most overused SaaS-AI layout — if you use it, it needs a genuinely different visual treatment, not the default)

If you catch yourself about to produce any of the above, stop and re-derive the design from the system below instead.

---

## Design system to use instead

### Color — semantic, not decorative
Do not assign colors to make cards "look different." Assign colors by meaning only:

| Role | Color family | Where it's used |
|---|---|---|
| Primary action | One accent color only (deep blue or teal — pick one) | The single most important button on a screen. Never more than one per screen. |
| Success / verified / funded | Green | Verified credentials, funded escrow, stable vitals, completed milestones |
| Attention / pending | Amber | Awaiting proposals, pending verification, vitals trending outside baseline |
| Critical / danger | Red | Abnormal vitals past threshold, disputed payment, emergency trigger — reserved, never decorative |
| Structure / neutral | Warm or cool gray scale (pick one, use consistently) | Backgrounds, dividers, secondary text, default containers |

No other hues. No purple, no pink, no orange, unless one of them is your single chosen primary accent.

### Typography
- One typeface family for UI (a well-made grotesk/sans — e.g. Inter, IBM Plex Sans, Söhne, or General Sans — but committed to deliberately, not left as an unstyled default).
- Define an explicit scale and stick to it: 28 / 22 / 18 / 16 / 14 / 12px.
- Only two weights: regular (400) and medium (500). No default browser-bold.
- Numbers that represent money or clinical readings use tabular/monospaced figures so columns align.
- All labels in sentence case. No Title Case, no ALL CAPS except small (11–12px) section eyebrows like "ACTIVE POSTINGS."

### Elevation / containers — differentiate by function, not decoration
- **Passive data tiles** (stats, counts): flat, light-gray fill, no border, no shadow.
- **Actionable rows/cards** (a posting, a proposal, a message): white surface, a single hairline border, zero shadow. Hover = border darkens slightly, nothing else moves or glows.
- **Alerts/protocols**: a colored left-edge border (not a rounded colored card) + light tint background, visually distinct from every other container type.
- **The money/trust module** (escrow balance, verification status): its own unique, most-prominent visual treatment on any screen it appears — not styled like a generic stat card.
- Shadows: near-zero use. Separate things with whitespace and hairline borders, not `box-shadow`.

### Buttons — real hierarchy, not one blue button repeated
- **Primary** (solid fill, brand accent): one per screen max, for the single most important action.
- **Secondary** (outline or ghost, neutral color): everything else — navigation, "view," "message," "edit."
- **High-consequence actions** (releasing payment, confirming an irreversible clinical action): visually distinct from routine buttons — different shape/border treatment and always paired with a confirmation step in the flow, not a bare button.

### Icons
One icon set, one stroke weight, used only when functional (status, navigation, action) — never as pure decoration next to a number.

### States (design these explicitly, don't leave them to be improvised)
Empty state, loading state, and error state for every data-driven view. Each empty state needs a short explanation and a clear next action, not a blank box.

---

## Instructions to give the tool per screen

When you prompt for an individual screen, structure it like this:

> Design the [screen name] for NurseBid using the locked design system above. This screen's job is [one sentence — e.g., "let a family compare nurse proposals side by side on rate, credentials, and trust score"]. The most important element on this screen is [X] — make it the most visually dominant thing on the page. Everything else should visually recede in proportion to how important it actually is to the user's decision. Do not introduce new colors, container styles, or button styles outside the system above.

Example for the dashboard:
> Design the Family Care Command Center dashboard. Its job is to reassure a family their patient is safe and their money is protected, then surface any postings/proposals needing action. The escrow/trust status must be the most visually dominant element on the page — bigger and more prominent than the active-postings or proposals-received counts, which are secondary reference stats. Postings should be grouped by lifecycle stage (awaiting proposals / active care / completed) with a distinct but restrained visual treatment per stage, not a flat list differentiated only by a colored dot.

Example for the posting wizard:
> Design the "Post Care Request" flow as a single scrollable form with clear section headers instead of a hard 6-screen wizard, keeping a step indicator for orientation. Include a persistent sidebar showing a live estimated cost as the family fills in duration, shift pattern, and rate — update it as they type, don't wait until a final review screen.

---

## Final check before accepting any generated screen

Ask of the output:
1. Does every container type look different from every other container type in a way that matches what it represents (data vs. action vs. alert vs. money)?
2. Is there exactly one solid-filled primary button on this screen, or zero?
3. Is color used only where it means something?
4. Does the most financially/clinically important information look more important than filler stats?
5. Would this be mistaken for a generic AI-generated SaaS template if you removed the logo? If yes, it needs another pass.

If any answer fails, send it back to the tool with the specific failure named rather than a vague "make it look better" — AI design tools respond much better to "the escrow card and the stat cards use identical styling, fix by making escrow use the money-module treatment" than to "make this look less AI generated."
