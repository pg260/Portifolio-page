import { AnimatePresence, motion } from 'motion/react'
import { modes } from '../../data/profile.js'
import { useMode } from '../../mode/ModeContext.jsx'
import { MODE_COLORS } from '../../lib/tokens.js'
import { Scramble } from './Scramble.jsx'
import { Icon } from '../ui/Icon.jsx'

const EASE = [0.76, 0, 0.24, 1]
const FULL = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
const FROM = 'polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%)'
const TO = 'polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%)'
const BARS = [
  { top: '18%', h: 14, x: [0, -60, 40, 0] },
  { top: '47%', h: 6, x: [0, 80, -30, 0] },
  { top: '71%', h: 22, x: [0, -40, 90, 0] },
]

/**
 * Cortina da troca de modo: wipe diagonal na cor do modo novo com rótulo gigante (scramble),
 * scanlines, barras de glitch e um flash no instante da troca. Vive acima de tudo, exceto a intro.
 */
export function ModeTransition() {
  const { phase } = useMode()
  const target = phase ? modes[phase.to] : null
  const colors = phase ? MODE_COLORS[phase.to] : null
  return (
    <AnimatePresence>
      {phase && (
        <motion.div
          key="wipe"
          aria-hidden="true"
          initial={{ clipPath: FROM }}
          animate={{ clipPath: phase.stage === 'in' ? FULL : TO }}
          exit={{ clipPath: TO }}
          transition={{ duration: phase.stage === 'in' ? 0.42 : 0.55, ease: EASE }}
          style={{ background: colors.accent, color: '#0b0e14' }}
          className="pointer-events-none fixed inset-0 z-[95] flex items-center justify-center overflow-hidden select-none"
        >
          {/* scanlines */}
          <div className="absolute inset-0 opacity-30 [background:repeating-linear-gradient(0deg,transparent_0_3px,rgba(11,14,20,0.35)_3px_4px)]" />
          {/* barras de glitch */}
          {BARS.map((b, i) => (
            <motion.div
              key={i}
              style={{ top: b.top, height: b.h, background: colors['accent-2'] }}
              animate={{ x: b.x, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.5, times: [0, 0.3, 0.7, 1], ease: 'linear', delay: 0.08 * i }}
              className="absolute inset-x-0 mix-blend-multiply"
            />
          ))}
          {/* rótulo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center gap-5 font-display font-semibold leading-none tracking-[-0.04em]"
          >
            <Icon name={target.icon} size={56} className="hidden md:block" />
            <Scramble text={target.label} trigger={phase.to} className="text-[clamp(3.5rem,14vw,12rem)]" />
          </motion.div>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-caption uppercase tracking-[0.3em]">{target.hudLabel}</div>
        </motion.div>
      )}
      {phase?.stage === 'out' && (
        <motion.div
          key="flash"
          aria-hidden="true"
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="pointer-events-none fixed inset-0 z-[94] bg-ink"
        />
      )}
    </AnimatePresence>
  )
}
