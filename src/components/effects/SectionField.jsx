import { useEffect, useRef } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import { MODE_COLORS } from '../../lib/tokens.js'

const RADIUS = 260

/**
 * Fundo em canvas 2D para uma seção. `variant` "network": nós ligados por linhas, atraídos pelo cursor
 * (modo Fullstack). "stars": poeira que foge do cursor e deixa rastro (modo Jogos).
 * O ponteiro é ouvido na <section> inteira (os cards ficam por cima do canvas). Estático com reduced motion.
 */
export function SectionField({ variant = 'network', mode = 'games', count = 120 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.05 })
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const host = canvas.closest('section') || canvas.parentElement
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const accent = MODE_COLORS[mode].accent
    const accent2 = MODE_COLORS[mode]['accent-2']
    let W = 0
    let H = 0
    let raf = 0
    const pointer = { x: -9999, y: -9999, inside: false }
    const pts = []

    const resize = () => {
      const r = canvas.parentElement.getBoundingClientRect()
      W = r.width
      H = r.height
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = `${W}px`
      canvas.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!pts.length) {
        for (let i = 0; i < count; i++) {
          pts.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: 1.2 + Math.random() * 2.4,
            p: Math.random() * Math.PI * 2,
            px: 0,
            py: 0,
          })
        }
      }
    }
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect()
      pointer.x = e.clientX - r.left
      pointer.y = e.clientY - r.top
      pointer.inside = true
    }
    const onLeave = () => {
      pointer.inside = false
      pointer.x = -9999
      pointer.y = -9999
    }

    const draw = (t) => {
      ctx.clearRect(0, 0, W, H)
      // halo do cursor
      if (pointer.inside) {
        const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, RADIUS)
        g.addColorStop(0, `${accent}33`)
        g.addColorStop(1, `${accent}00`)
        ctx.fillStyle = g
        ctx.fillRect(pointer.x - RADIUS, pointer.y - RADIUS, RADIUS * 2, RADIUS * 2)
      }
      for (const p of pts) {
        p.px = p.x
        p.py = p.y
        if (!reduced) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const dist = Math.hypot(dx, dy) || 1
          if (pointer.inside && dist < RADIUS) {
            const f = 1 - dist / RADIUS
            if (variant === 'network') {
              // atrai, mas mantém uma distância mínima (orbita)
              const pull = dist > 60 ? 0.09 * f : -0.12
              p.vx -= (dx / dist) * pull
              p.vy -= (dy / dist) * pull
            } else {
              p.vx += (dx / dist) * 0.22 * f
              p.vy += (dy / dist) * 0.22 * f
            }
          }
          p.vx *= 0.975
          p.vy *= 0.975
          p.x += p.vx
          p.y += p.vy
          if (p.x < -10) p.x = W + 10
          if (p.x > W + 10) p.x = -10
          if (p.y < -10) p.y = H + 10
          if (p.y > H + 10) p.y = -10
        }
      }
      if (variant === 'network') {
        ctx.lineWidth = 1
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const a = pts[i]
            const b = pts[j]
            const d = Math.hypot(a.x - b.x, a.y - b.y)
            if (d < 110) {
              const nearA = Math.hypot(a.x - pointer.x, a.y - pointer.y) < RADIUS
              ctx.strokeStyle = nearA ? accent2 : accent
              ctx.globalAlpha = (1 - d / 110) * (nearA ? 0.7 : 0.35)
              ctx.beginPath()
              ctx.moveTo(a.x, a.y)
              ctx.lineTo(b.x, b.y)
              ctx.stroke()
            }
          }
        }
        ctx.globalAlpha = 1
        for (const p of pts) {
          const d = Math.hypot(p.x - pointer.x, p.y - pointer.y)
          const near = d < RADIUS
          ctx.fillStyle = near ? accent2 : accent
          ctx.globalAlpha = near ? 1 : 0.65
          ctx.beginPath()
          ctx.arc(p.x, p.y, near ? p.r + 1.5 : p.r, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        ctx.lineCap = 'round'
        for (const p of pts) {
          const speed = Math.hypot(p.vx, p.vy)
          const tw = reduced ? 0.7 : 0.55 + 0.45 * Math.sin(t * 0.002 + p.p)
          const hot = speed > 0.9
          ctx.fillStyle = hot || p.r > 2.6 ? accent2 : accent
          ctx.globalAlpha = Math.min(1, tw * 0.85 + speed * 0.3)
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r + speed * 0.4, 0, Math.PI * 2)
          ctx.fill()
          // rastro quando corre
          if (speed > 0.6) {
            ctx.strokeStyle = ctx.fillStyle
            ctx.lineWidth = p.r
            ctx.globalAlpha = 0.5
            ctx.beginPath()
            ctx.moveTo(p.x - p.vx * 6, p.y - p.vy * 6)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1
      if (!reduced) raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave)
    if (inView) raf = requestAnimationFrame(draw)
    else draw(0)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
    }
  }, [variant, mode, count, inView, reduced])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-90" />
}
