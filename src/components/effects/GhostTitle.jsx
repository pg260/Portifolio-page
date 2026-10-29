import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

/** Palavra gigante contornada atrás da seção, deslocando-se mais devagar que o scroll. */
export function GhostTitle({ text, align = 'right' }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [120, -120])
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden select-none">
      <motion.span
        style={{ y }}
        className={`block whitespace-nowrap font-display text-[clamp(6rem,22vw,22rem)] font-semibold leading-none tracking-[-0.05em] ghost-text ${
          align === 'right' ? 'text-right -mr-[0.1em]' : 'text-left -ml-[0.05em]'
        }`}
      >
        {text}
      </motion.span>
    </div>
  )
}
