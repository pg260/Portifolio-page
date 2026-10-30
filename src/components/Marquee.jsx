import { useRef } from 'react'
import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from 'motion/react'
import { modes } from '../data/profile.js'
import { clients, employers } from '../data/companies.js'
import { useMode } from '../mode/ModeContext.jsx'

const wrap = (min, max, v) => {
  const range = max - min
  return ((((v - min) % range) + range) % range) + min
}

/**
 * Faixa entre o hero e os trabalhos. Corre sozinha e acelera (ou inverte) com a velocidade do scroll;
 * pausa no hover. Stack no modo Jogos; no Fullstack, as empresas e depois os clientes. Estática com reduced motion.
 */
export function Marquee() {
  const { mode } = useMode()
  const reduced = useReducedMotion()
  const items = mode === 'games' ? modes.games.stack : [...employers.map((e) => e.name), ...clients.map((c) => c.fullName)]
  const row = [...items, ...items]

  const baseX = useMotionValue(0)
  const { scrollY } = useScroll()
  const velocity = useVelocity(scrollY)
  const smooth = useSpring(velocity, { damping: 50, stiffness: 400 })
  const factor = useTransform(smooth, [0, 1200], [0, 4], { clamp: false })
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`)
  const paused = useRef(false)
  const dir = useRef(1)

  useAnimationFrame((_, delta) => {
    if (reduced || paused.current) return
    let move = dir.current * -2.2 * (delta / 1000)
    const f = factor.get()
    if (f < 0) dir.current = -1
    else if (f > 0) dir.current = 1
    move += move * Math.abs(f)
    baseX.set(baseX.get() + move)
  })

  return (
    <div
      aria-hidden="true"
      onPointerEnter={() => (paused.current = true)}
      onPointerLeave={() => (paused.current = false)}
      className="relative overflow-hidden border-y border-hairline bg-surface/40 py-4 mode-transition"
    >
      <motion.div style={{ x }} className="flex w-max gap-10 whitespace-nowrap">
        {row.map((item, i) => (
          <span key={`${item}-${i}`} className="flex items-center gap-10 font-display text-[clamp(1.25rem,1rem+1.2vw,1.75rem)] font-semibold text-body">
            {item}
            <span className="h-1.5 w-1.5 rounded-full bg-accent mode-transition" />
          </span>
        ))}
      </motion.div>
    </div>
  )
}
