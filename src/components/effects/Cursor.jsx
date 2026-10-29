import { useEffect, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'

const DOT = { stiffness: 900, damping: 50, mass: 0.2 }
const RING = { stiffness: 220, damping: 26, mass: 0.5 }
const GLOW = { stiffness: 120, damping: 24, mass: 0.8 }

/**
 * Cursor customizado: ponto, anel que cresce sobre links/botões e halo colorido do modo.
 * Só com ponteiro fino e sem reduced motion; o cursor nativo some enquanto estiver ativo.
 */
export function Cursor() {
  const reduced = useReducedMotion()
  const [enabled, setEnabled] = useState(false)
  const [hot, setHot] = useState(false)
  const [down, setDown] = useState(false)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const dx = useSpring(x, DOT)
  const dy = useSpring(y, DOT)
  const rx = useSpring(x, RING)
  const ry = useSpring(y, RING)
  const gx = useSpring(x, GLOW)
  const gy = useSpring(y, GLOW)

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)')
    const update = () => setEnabled(fine.matches && !reduced)
    update()
    fine.addEventListener('change', update)
    return () => fine.removeEventListener('change', update)
  }, [reduced])

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('custom-cursor')
    const onMove = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    const onOver = (e) => setHot(Boolean(e.target.closest('a, button, [role="tab"], canvas, [data-cursor="hot"]')))
    const onDown = () => setDown(true)
    const onUp = () => setDown(false)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      document.documentElement.classList.remove('custom-cursor')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [enabled, x, y])

  if (!enabled) return null
  const center = { translateX: '-50%', translateY: '-50%' }
  return (
    <>
      <motion.div
        aria-hidden="true"
        style={{ x: gx, y: gy, ...center }}
        className="pointer-events-none fixed left-0 top-0 z-[55] h-[320px] w-[320px] rounded-full bg-glow opacity-60 blur-3xl mix-blend-screen mode-transition"
      />
      <motion.div
        aria-hidden="true"
        style={{ x: rx, y: ry, ...center }}
        animate={{ scale: hot ? 1.8 : down ? 0.8 : 1, opacity: hot ? 0.9 : 0.6 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="pointer-events-none fixed left-0 top-0 z-[90] h-9 w-9 rounded-full border border-accent mode-transition"
      />
      <motion.div
        aria-hidden="true"
        style={{ x: dx, y: dy, ...center }}
        animate={{ scale: hot ? 0.5 : 1 }}
        className="pointer-events-none fixed left-0 top-0 z-[90] h-2 w-2 rounded-full bg-accent mode-transition"
      />
    </>
  )
}
