import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { modes } from '../data/profile.js'

const ModeContext = createContext(null)
const HASHES = { '#jogos': 'games', '#fullstack': 'fullstack' }
const HASH_OF = { games: '#jogos', fullstack: '#fullstack' }

// Linha do tempo da transição dramática (ms): wipe entra, troca sob a cortina, wipe sai
const T = { swap: 380, out: 520, end: 1150 }

function readInitial() {
  if (typeof window === 'undefined') return 'games'
  return HASHES[window.location.hash] || 'games'
}

/**
 * Estado do interruptor Jogos / Fullstack. `switchMode` roda a transição cinematográfica
 * (`phase` = { to, stage: 'in' | 'out' }) e troca o modo no meio dela; `setMode` troca na hora.
 */
export function ModeProvider({ children }) {
  const reduced = useReducedMotion()
  const [mode, setModeState] = useState(readInitial)
  const [phase, setPhase] = useState(null)
  const modeRef = useRef(mode)
  const timers = useRef([])
  modeRef.current = mode

  useEffect(() => {
    document.documentElement.dataset.mode = mode
  }, [mode])

  useEffect(() => {
    const onHash = () => {
      const next = HASHES[window.location.hash]
      if (next) setModeState(next)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setMode = useCallback((next) => {
    setModeState(next)
    if (typeof history !== 'undefined') history.replaceState(null, '', HASH_OF[next])
  }, [])

  const switchMode = useCallback(
    (next) => {
      if (next === modeRef.current || timers.current.length) return
      if (reduced) {
        setMode(next)
        return
      }
      const root = document.documentElement
      const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))
      setPhase({ to: next, stage: 'in' })
      root.classList.add('mode-glitch')
      later(() => {
        setMode(next)
        window.dispatchEvent(new CustomEvent('mode-burst'))
      }, T.swap)
      later(() => setPhase({ to: next, stage: 'out' }), T.out)
      later(() => {
        setPhase(null)
        root.classList.remove('mode-glitch')
        timers.current = []
      }, T.end)
    },
    [reduced, setMode],
  )

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const value = useMemo(
    () => ({ mode, phase, setMode, switchMode, toggle: () => switchMode(mode === 'games' ? 'fullstack' : 'games'), data: modes[mode] }),
    [mode, phase, setMode, switchMode],
  )
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}

export function useMode() {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode precisa estar dentro de <ModeProvider>')
  return ctx
}
