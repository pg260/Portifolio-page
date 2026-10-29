---
name: motion-react
description: Animation for React with Motion (the library formerly called Framer Motion, package `motion`, import from "motion/react"). Use when adding entrance/scroll/hover/exit animations, parallax, scroll-linked effects, staggered reveals, layout animations or reduced-motion support to React components. Covers API, transitions, orchestration, bundle size and accessibility rules.
---

# Motion for React

Condensed from https://motion.dev/docs (React section). For anything not covered here, use the
Motion MCP server (`mcp.motion.dev`, configured in `.mcp.json`) or Context7 with library `motion`.

## Install and import

```bash
npm install motion
```

```jsx
import { motion, AnimatePresence, MotionConfig, useScroll, useTransform, useSpring, useInView, useReducedMotion } from "motion/react"
```

Never import from `framer-motion` in new code — `motion` is the current package, same API.

## Core API

```jsx
// Prefix any HTML/SVG tag with motion. to get animation props
<motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} />

// initial={false} disables the mount animation (element starts in its animate state)
<motion.button initial={false} animate={{ scale: 1 }} />

// Gestures
<motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} whileFocus={{ scale: 1.04 }} />

// Scroll-triggered (IntersectionObserver, cheap)
<motion.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.3 }} />

// Layout animation (size/position changes) and shared-element transitions
<motion.div layout />
<motion.div layoutId="active-tab-underline" />

// SVG path drawing
<motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
```

`x`, `y`, `scale`, `rotate` are transform shortcuts and are GPU-accelerated. Prefer them over
`top/left/width/height`. Animate `opacity` and transforms whenever possible; avoid animating
`filter: blur()` or `box-shadow` on large elements (expensive).

## Variants and orchestration (staggered reveals)

```jsx
import { stagger } from "motion/react"

const list = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: "beforeChildren", delayChildren: stagger(0.08) }
  }
}
const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
}

<motion.ul variants={list} initial="hidden" whileInView="visible" viewport={{ once: true }}>
  {projects.map(p => <motion.li key={p.id} variants={item}>…</motion.li>)}
</motion.ul>
```

Variant labels propagate to children, so only the parent needs `initial`/`animate`/`whileInView`.
`stagger(0.08, { from: "center" })` or `{ from: "last" }` changes the stagger origin.

## Transitions

```jsx
transition={{ type: "spring", stiffness: 300, damping: 30 }}            // physics spring
transition={{ type: "spring", duration: 0.6, bounce: 0.2 }}            // duration-based spring (easier to tune)
transition={{ type: "tween", duration: 0.4, ease: [0.22, 1, 0.36, 1] }} // cubic-bezier
transition={{ duration: 0.3, delay: 0.1 }}
transition={{ repeat: Infinity, repeatType: "mirror", duration: 2 }}
transition={{ default: { type: "spring" }, opacity: { ease: "linear" } }} // per-value
```

Defaults: `duration` 0.3s (0.8s with keyframes); physical props (`x`, `scale`) use springs by default.
Named eases: `"linear" | "easeIn" | "easeOut" | "easeInOut" | "circIn" | … | "anticipate"`.
Set defaults for a whole tree with `<MotionConfig transition={{ … }}>`.

## Scroll-linked animations (parallax, progress bars)

```jsx
// Page progress bar
const { scrollYProgress } = useScroll()
<motion.div style={{ scaleX: scrollYProgress, originX: 0 }} />

// Progress of one element through the viewport
const ref = useRef(null)
const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"])        // parallax
const smooth = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })
<motion.img ref={ref} style={{ y }} />
```

`useTransform` maps to any CSS value, including colors and `"blur(0px)" → "blur(10px)"`.
Scroll-linked values run on the native `ScrollTimeline` when available (hardware accelerated).
`useInView(ref, { once: true })` returns a boolean when you need logic instead of an animation.

## Exit animations

```jsx
<AnimatePresence mode="wait" initial={false}>
  {open && <motion.div key="menu" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} />}
</AnimatePresence>
```

Direct children need a unique `key`. `mode="wait"` waits for the exit before the enter
(one child at a time); `mode="popLayout"` removes exiting elements from layout immediately.

## Accessibility (mandatory in this project)

```jsx
// App root — transforms and layout animations are disabled for users with Reduced Motion on;
// opacity/color animations still run.
<MotionConfig reducedMotion="user">{children}</MotionConfig>

// Per-component control
const reduce = useReducedMotion()
<motion.div animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }} />
```

Rules: keep educational transitions (what changed), replace transforms on large surfaces with opacity,
disable parallax and auto-playing motion when reduced motion is on, never trap focus in an animation.

## Bundle size

- `motion` component: ~43 kB and cannot be tree-shaken further. For a portfolio with a few animations this is acceptable.
- Lighter option: `LazyMotion` + `m`:

```jsx
import { LazyMotion, domAnimation, m } from "motion/react"
<LazyMotion features={domAnimation} strict>
  <m.div animate={{ opacity: 1 }} />
</LazyMotion>
```

`domAnimation` (+24 kB) = animations, variants, exit, hover/tap/focus. `domMax` (+38 kB) adds drag and layout animations.
Use `features={() => import("./features").then(m => m.default)}` to load after first paint.

## Design rules for this portfolio (from the frontend-design skill)

- One orchestrated moment beats scattered effects: a single hero reveal on load, then motion that answers the user (hover, open, expand). Fade-and-slide-up on every section is the generic default — avoid it.
- Hover transitions in the 150–300 ms range; entrance sequences under ~1 s total.
- Every animation must look right with `reducedMotion="user"` active; test it.
- Do not animate layout-affecting properties on scroll (causes jank); use transforms and opacity.
