import { motion } from 'motion/react'
import { modes } from '../data/profile.js'
import { useMode } from '../mode/ModeContext.jsx'
import { Icon } from './ui/Icon.jsx'

const ORDER = ['games', 'fullstack']

/**
 * Interruptor Jogos / Fullstack (segmented control, role=tablist).
 * `size`: "compact" (40px, nav) ou "large" (56px, hero). A pill desliza com layoutId por instância.
 */
export function ModeSwitch({ size = 'compact', id = 'switch', className = '' }) {
  const { mode, switchMode } = useMode()
  const large = size === 'large'

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const i = ORDER.indexOf(mode)
    const next = ORDER[(i + (e.key === 'ArrowRight' ? 1 : ORDER.length - 1)) % ORDER.length]
    switchMode(next)
    e.currentTarget.querySelector(`[data-mode-tab="${next}"]`)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Modo do portfólio"
      onKeyDown={onKeyDown}
      className={`relative inline-flex rounded-full border border-hairline bg-surface p-1 mode-transition ${className}`}
    >
      {ORDER.map((key) => {
        const m = modes[key]
        const selected = mode === key
        return (
          <button
            key={key}
            type="button"
            role="tab"
            data-mode-tab={key}
            aria-selected={selected}
            aria-controls="hero-title"
            tabIndex={selected ? 0 : -1}
            onClick={() => switchMode(key)}
            className={`relative z-10 inline-flex items-center gap-2 rounded-full font-display font-semibold transition-colors duration-(--duration-base) cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
              large ? 'h-12 px-6 text-[1.0625rem]' : 'h-8 px-4 text-small'
            } ${selected ? 'text-on-accent' : 'text-body hover:text-ink'}`}
          >
            {selected && (
              <motion.span
                layoutId={`mode-pill-${id}`}
                aria-hidden="true"
                className="absolute inset-0 -z-10 rounded-full bg-accent mode-transition"
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              />
            )}
            <Icon name={m.icon} size={large ? 18 : 15} />
            <span className={large ? '' : 'hidden sm:inline'}>{m.label}</span>
            {!large && <span className="sr-only sm:hidden">{m.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
