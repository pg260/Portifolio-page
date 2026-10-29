import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { useMode } from '../../mode/ModeContext.jsx'
import { MODE_COLORS } from '../../lib/tokens.js'

/** Rastro de partículas atrás do cursor (canvas 2D). Só ponteiro fino e sem reduced motion. */
export function CursorTrail() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { mode } = useMode()

  useEffect(() => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const color = MODE_COLORS[mode].accent
    const pts = []
    let raf = 0
    let last = { x: 0, y: 0 }
    const resize = () => {
      canvas.width = innerWidth * dpr
      canvas.height = innerHeight * dpr
      canvas.style.width = `${innerWidth}px`
      canvas.style.height = `${innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const onMove = (e) => {
      const speed = Math.hypot(e.clientX - last.x, e.clientY - last.y)
      last = { x: e.clientX, y: e.clientY }
      const n = Math.min(4, 1 + Math.floor(speed / 12))
      for (let i = 0; i < n; i++) {
        pts.push({ x: e.clientX, y: e.clientY, vx: (Math.random() - 0.5) * 1.6, vy: (Math.random() - 0.5) * 1.6 - 0.4, life: 1, r: 1.5 + Math.random() * 2.5 })
      }
      if (pts.length > 90) pts.splice(0, pts.length - 90)
    }
    const draw = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight)
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i]
        p.life -= 0.03
        if (p.life <= 0) {
          pts.splice(i, 1)
          continue
        }
        p.x += p.vx
        p.y += p.vy
        ctx.globalAlpha = p.life * 0.8
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
    }
  }, [reduced, mode])

  if (reduced) return null
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[56] mix-blend-screen" />
}
