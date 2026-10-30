---
name: design-md
description: Create and maintain the project's DESIGN.md — the single source of truth for visual identity (colors, typography, spacing, radius, shadows, motion, component rules, do/don't). Use when defining the visual direction of the portfolio, when a new component needs styling decisions, when reviewing consistency, or whenever someone asks "what is our style / palette / font". Includes three reference DESIGN.md files from awesome-design-md.
---

# DESIGN.md — the project's design system in one file

A `DESIGN.md` at the project root makes every future session (and every human) produce UI that
looks like it belongs to the same site. Without it, each component drifts toward generic defaults.

## When to use

- **Before building** the redesign: write `DESIGN.md` from the design plan produced with the
  `frontend-design` skill (tokens, type, layout concept, principles). Confirm it with the user first.
- **While building**: read `DESIGN.md` before styling any component; add tokens there instead of hard-coding values.
- **Reviewing**: compare a component against `DESIGN.md`; flag any color/size/radius not defined there.
- **Updating**: when the user changes direction, edit `DESIGN.md` first, then the code.

## Reference examples (vendored, MIT, from VoltAgent/awesome-design-md)

Read ONE of these to calibrate depth and format — they are long (~40 kB); skim the frontmatter and the first sections.

| File | Why it is here |
|------|----------------|
| `references/playstation.DESIGN.md` | gaming brand, dark cinematic surfaces, confident display type |
| `references/nintendo-2001.DESIGN.md` | playful game-culture identity, strong color, retro-but-clean |
| `references/raycast.DESIGN.md` | dark developer-tool aesthetic, hairline borders, restrained accent — the "quiet, precise" pole |

Use them as format and depth references, **not** as a style to copy. The portfolio's identity must come
from its own subject (a Unity/game developer, Rebuild Studio, mobile games, VR/AR, Museu Goeldi) — see `frontend-design`.

## Required structure of our DESIGN.md

```markdown
---
name: <project>-design-system
version: 1
---

# <Project> — Design System

## 1. Identity (3–5 sentences)
What the site is, who looks at it (recruiters, studios, clients), the one memorable element,
the mood in plain words. The "one bold thing" and what stays quiet.

## 2. Color tokens
canvas / surface / surface-elevated / ink / body / muted / hairline / accent / accent-soft / focus-ring
Each as a named hex, with the Tailwind v4 `@theme` variable name (--color-canvas …) and the contrast
ratio against its text color (AA 4.5:1 body, 3:1 large text).

## 3. Typography
Families (1 or 2, clearly distinct), where each is used, the type scale (display, h1–h3, body, small)
with size / weight / line-height / letter-spacing, max line length (<80ch), Google Fonts URL or self-hosted files.

## 4. Layout and spacing
Container width, grid, section rhythm (vertical spacing), alignment rule (left vs center), breakpoints,
spacing scale actually used (4/8/12/16/24/32/48/64/96).

## 5. Shape, elevation, borders
Radius scale and which element gets which (hierarchy, not one radius for everything), border/hairline
colors, shadows (if any), glass/blur policy.

## 6. Motion
Durations, easings/springs, what animates on load (ONE orchestrated moment), what answers the user,
scroll behaviour, reduced-motion policy. Reference `motion-react` skill.

## 7. Components
Nav, hero, project card, badge/tag, button (primary/secondary/icon), section header, footer, 3D hero fallback.
For each: anatomy, states (default/hover/focus/active/disabled), sizes, do/don't.

## 8. Imagery and 3D
Project thumbnails (ratio, treatment, overlay), icon set (Lucide), 3D scene rules (see react-three-fiber skill),
alt-text policy.

## 9. Voice and copy
Tone in PT-BR (and EN if bilingual), sentence case, CTA wording, how projects are described (result-first).

## 10. Don'ts
Explicit list of generic tells we refuse (see frontend-design calibration list) plus project-specific ones.
```

## Rules

- Every value in the code must trace back to a token here. If it is not here, add it here first.
- Keep it under ~400 lines; it is read at the start of sessions.
- Keep `DESIGN.md` in Portuguese (PT-BR) for this project, token names in English.
