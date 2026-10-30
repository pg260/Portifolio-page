import { motion, useReducedMotion } from 'motion/react'
import { Icon } from '../ui/Icon.jsx'
import { Magnetic } from './Magnetic.jsx'

/** Botão "voltar ao topo" com texto circular que gira (mais rápido no hover) e seta magnética. */
export function BackToTop() {
  const reduced = useReducedMotion()
  return (
    <Magnetic strength={8}>
      <a
        href="#inicio"
        aria-label="Voltar ao topo"
        className="group relative inline-flex h-28 w-28 items-center justify-center overflow-hidden rounded-full text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <motion.svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full text-muted transition-colors duration-(--duration-base) group-hover:text-accent"
          animate={reduced ? {} : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
        >
          <defs>
            <path id="btt-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
          </defs>
          <text className="fill-current font-body text-[9.5px] font-medium uppercase tracking-[0.22em]">
            <textPath href="#btt-circle">voltar ao topo · voltar ao topo ·</textPath>
          </text>
        </motion.svg>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-hairline-strong bg-surface transition-[transform,border-color] duration-(--duration-base) ease-(--ease-out) group-hover:-translate-y-1 group-hover:border-accent/60">
          <Icon name="arrow-up-right" size={20} className="-rotate-45" />
        </span>
      </a>
    </Magnetic>
  )
}
