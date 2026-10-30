import { createContext, useContext, useEffect, useState } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { profile } from '../../data/profile.js'

const IntroContext = createContext(true)
export const useIntroReady = () => useContext(IntroContext)

const MIN_MS = 1100

/**
 * Intro de carregamento: brand + contador 0→100 + linha de progresso; sobe e some.
 * Só na primeira visita da sessão e sem reduced motion. Expõe `ready` para o hero começar depois.
 */
export function Intro({ children }) {
  const reduced = useReducedMotion()
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return !sessionStorage.getItem('intro-shown')
    } catch {
      return true
    }
  })
  const [ready, setReady] = useState(!show)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!show) return
    if (reduced) {
      setShow(false)
      setReady(true)
      return
    }
    const start = performance.now()
    const controls = animate(0, 100, { duration: MIN_MS / 1000, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setCount(Math.round(v)) })
    Promise.all([document.fonts?.ready, new Promise((r) => setTimeout(r, MIN_MS))]).then(() => {
      const elapsed = performance.now() - start
      setTimeout(() => {
        setShow(false)
        try {
          sessionStorage.setItem('intro-shown', '1')
        } catch {
          /* sem storage */
        }
      }, Math.max(0, MIN_MS - elapsed) + 120)
    })
    return () => controls.stop()
  }, [show, reduced])

  return (
    <IntroContext.Provider value={ready}>
      <AnimatePresence onExitComplete={() => setReady(true)}>
        {show && (
          <motion.div
            key="intro"
            role="status"
            aria-label="Carregando"
            initial={{ y: 0 }}
            exit={{ y: '-100%', transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } }}
            className="fixed inset-0 z-[100] flex flex-col justify-between bg-canvas px-5 py-8 md:px-12 md:py-10"
          >
            <span className="font-display text-[18px] font-semibold text-ink">{profile.name}</span>
            <div className="flex items-end justify-between gap-6">
              <span className="text-caption uppercase text-muted">Carregando cena</span>
              <span className="font-display text-[clamp(4rem,12vw,9rem)] font-semibold leading-none tracking-[-0.04em] text-ink tabular-nums">
                {count}
              </span>
            </div>
            <motion.span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-0.5 bg-accent"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: MIN_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </IntroContext.Provider>
  )
}
