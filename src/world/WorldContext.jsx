import { Suspense, createContext, lazy, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { useMode } from '../mode/ModeContext.jsx'
import { useIntroReady } from '../components/effects/Intro.jsx'
import { detectTier, lowerTier } from './quality.js'
import { startScroll } from './scroll.js'

const World = lazy(() => import('./World.jsx'))
const WorldContext = createContext({ tier: null, on: false, degrade: () => {} })
export const useWorld = () => useContext(WorldContext)

/**
 * Liga o mundo 3D da página: detecta o nível de qualidade, inicia o scroll suave e rebaixa o nível
 * quando o fps cai de forma sustentada. Em "off" a página mostra o fundo estático.
 */
export function WorldProvider({ children }) {
  const reduced = useReducedMotion()
  const [tier, setTier] = useState(null)
  const retried = useRef(false)

  useEffect(() => {
    let alive = true
    detectTier().then((t) => alive && setTier(t))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => startScroll({ smooth: !reduced }), [reduced])

  const degraded = useRef(false)
  const degrade = useCallback(() => {
    degraded.current = true
    setTier((t) => (t && t !== 'off' ? lowerTier(t) : t))
  }, [])

  // Caiu até "off" por lentidão (não por falta de WebGL): tenta voltar uma vez no nível mais leve depois de 12s
  useEffect(() => {
    if (tier !== 'off' || !degraded.current || retried.current) return
    retried.current = true
    const id = setTimeout(() => setTier((t) => (t === 'off' ? 'low' : t)), 12000)
    return () => clearTimeout(id)
  }, [tier])

  const value = useMemo(() => ({ tier, degrade, on: tier !== null && tier !== 'off' }), [tier, degrade])
  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>
}

/** Camada fixa atrás de toda a página com o canvas do mundo (carregado sob demanda). */
export function WorldLayer() {
  const { tier, on, degrade } = useWorld()
  const { mode } = useMode()
  const reduced = Boolean(useReducedMotion())
  const ready = useIntroReady()
  if (!on) return null
  return (
    <Suspense fallback={null}>
      <World tier={tier} mode={mode} reduced={reduced} revealed={ready} onDegrade={degrade} />
    </Suspense>
  )
}
