import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

/** Título que se "escreve" da esquerda para a direita conforme entra na tela (clip ligado ao scroll). */
export function ScrubReveal({ as: Tag = motion.h2, className = '', children, ...rest }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.95', 'start 0.55'] })
  const clip = useTransform(scrollYProgress, [0, 1], reduced ? ['inset(0 0% 0 0)', 'inset(0 0% 0 0)'] : ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'])
  const x = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-24, 0])
  return (
    <Tag ref={ref} style={{ clipPath: clip, x }} data-glitch="" className={className} {...rest}>
      {children}
    </Tag>
  )
}
