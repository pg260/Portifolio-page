import { useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'

const SPRING = { stiffness: 180, damping: 20, mass: 0.6 }

/**
 * Card com tilt 3D (±max graus) e brilho que segue o cursor (CSS vars --mx/--my lidas pela utility glow-follow).
 * O conteúdo recebe `transform-style: preserve-3d`; filhos com `translateZ` ganham profundidade.
 */
export function TiltCard({ max = 8, className = '', children, as: Tag = motion.div, ...rest }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), SPRING)
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), SPRING)
  const mx = useTransform(px, (v) => `${v * 100}%`)
  const my = useTransform(py, (v) => `${v * 100}%`)

  const onMove = (e) => {
    if (reduced || e.pointerType === 'touch') return
    const r = ref.current.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const reset = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <Tag
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX, rotateY, transformPerspective: 1100, transformStyle: 'preserve-3d', '--mx': mx, '--my': my }}
      className={`group relative ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}
