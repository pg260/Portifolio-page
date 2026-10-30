import { motion, useScroll, useSpring } from 'motion/react'

/** Barra de 2px no topo, na cor do modo, que acompanha o scroll da página. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX, originX: 0 }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 bg-accent mode-transition"
    />
  )
}
