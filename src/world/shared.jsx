import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { world } from './store.js'

export const clamp01 = (v) => Math.min(1, Math.max(0, v))
export const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2)
/** Uma casa decimal no idioma da página (5,1 em PT-BR) para os placares dos minigames. */
export const decimal1 = new Intl.NumberFormat(document.documentElement.lang || 'pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const DEGRADE = { fps: 20, seconds: 3, grace: 2.5 }

/* ---------- utilidades ---------- */

/** Grupo que entra com spring no load e escala para 0/1 quando o modo muda. */
export function ModeGroup({ active, delay = 0, reduced, children, ...props }) {
  const ref = useRef()
  const state = useRef({ s: active ? (reduced ? 1 : 0) : 0, v: 0, born: null })
  useFrame(({ clock }, dt) => {
    const g = ref.current
    if (!g) return
    const st = state.current
    if (st.born === null) st.born = clock.elapsedTime
    const age = clock.elapsedTime - st.born
    let target = active ? 1 : 0
    if (active && !reduced && age < delay + 0.7) {
      st.s = easeOutBack(clamp01((age - delay) / 0.7))
      st.v = 0
    } else if (reduced) {
      st.s = target
    } else {
      const d = Math.min(dt, 0.05)
      st.v += (target - st.s) * 150 * d
      st.v *= Math.exp(-16 * d)
      st.s += st.v * d
    }
    const s = Math.max(st.s, 0.0001)
    g.scale.setScalar(s)
    g.visible = s > 0.003
  })
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  )
}

/**
 * Mede fps em janelas de 0,5s e escreve no HUD. Ignora frames com delta grande (volta de aba oculta,
 * travada pontual) e zera a contagem ao mudar de visibilidade, para só rebaixar a qualidade com
 * lentidão real e sustentada. Depois de rebaixar, recomeça a contagem (um nível por vez).
 */
export function Monitor({ onDegrade, reduced }) {
  const acc = useRef({ f: 0, t: 0, slow: 0 })
  useEffect(() => {
    const reset = () => (acc.current = { f: 0, t: 0, slow: 0 })
    document.addEventListener('visibilitychange', reset)
    window.addEventListener('focus', reset)
    return () => {
      document.removeEventListener('visibilitychange', reset)
      window.removeEventListener('focus', reset)
    }
  }, [])
  useFrame(({ clock }, dt) => {
    const a = acc.current
    if (dt > 0.25) {
      a.f = 0
      a.t = 0
      a.slow = 0
      return
    }
    a.f += 1
    a.t += dt
    if (a.t >= 0.5) {
      const fps = Math.round(a.f / a.t)
      if (world.telemetry.fps) world.telemetry.fps.textContent = String(fps)
      if (!reduced && clock.elapsedTime > DEGRADE.grace && document.visibilityState === 'visible') {
        a.slow = fps < DEGRADE.fps ? a.slow + a.t : 0
        if (a.slow >= DEGRADE.seconds) {
          a.slow = -DEGRADE.grace
          onDegrade?.()
        }
      }
      a.f = 0
      a.t = 0
    }
  })
  return null
}

export function makeLine(segments, color, opacity = 0.95) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segments * 3), 3))
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false })
  const l = new THREE.Line(g, m)
  l.visible = false
  l.frustumCulled = false
  return l
}
