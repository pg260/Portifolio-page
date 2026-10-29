import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MODE_COLORS, colors } from '../../lib/tokens.js'

const STEP = 0.42
const tmpObj = new THREE.Object3D()
const tmpColor = new THREE.Color()

/** Grade de esferas que se afasta do cursor com mola e volta; perto do cursor acendem na cor do modo. */
function Field({ mode, reduced }) {
  const { viewport, gl } = useThree()
  const mesh = useRef()
  // O R3F não zera o ponteiro ao sair do canvas: rastreia entrada/saída para o campo voltar ao repouso
  const inside = useRef(false)
  useEffect(() => {
    const el = gl.domElement
    const enter = () => (inside.current = true)
    const leave = () => (inside.current = false)
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('pointercancel', leave)
    return () => {
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('pointercancel', leave)
    }
  }, [gl])
  const cols = Math.max(8, Math.ceil(viewport.width / STEP) + 2)
  const rows = Math.max(6, Math.ceil(viewport.height / STEP) + 2)
  const count = cols * rows
  const data = useMemo(() => {
    const home = new Float32Array(count * 2)
    const cur = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    let i = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        home[i * 2] = (c - (cols - 1) / 2) * STEP
        home[i * 2 + 1] = (r - (rows - 1) / 2) * STEP
        i++
      }
    }
    return { home, cur, vel }
  }, [count, cols, rows])
  const base = useMemo(() => new THREE.Color(colors()['hairline-strong']), [])
  const accent = useMemo(() => new THREE.Color(MODE_COLORS[mode].accent), [mode])
  const accent2 = useMemo(() => new THREE.Color(MODE_COLORS[mode]['accent-2']), [mode])

  useFrame((state, dt) => {
    const m = mesh.current
    if (!m) return
    const d = Math.min(dt, 0.05)
    const px = state.pointer.x * (viewport.width / 2)
    const py = state.pointer.y * (viewport.height / 2)
    const active = !reduced && inside.current
    const { home, cur, vel } = data
    for (let i = 0; i < count; i++) {
      const hx = home[i * 2]
      const hy = home[i * 2 + 1]
      let tx = 0
      let ty = 0
      let tz = 0
      let f = 0
      if (active) {
        const dx = hx - px
        const dy = hy - py
        const dist = Math.hypot(dx, dy)
        f = Math.max(0, 1 - dist / 1.9)
        f = f * f
        if (f > 0 && dist > 0.0001) {
          tx = (dx / dist) * f * 1.1
          ty = (dy / dist) * f * 1.1
          tz = f * 1.4
        }
      }
      // mola crítica
      for (let k = 0; k < 3; k++) {
        const idx = i * 3 + k
        const target = k === 0 ? tx : k === 1 ? ty : tz
        vel[idx] += (target - cur[idx]) * 90 * d
        vel[idx] *= Math.exp(-9 * d)
        cur[idx] += vel[idx] * d
      }
      const lift = cur[i * 3 + 2]
      tmpObj.position.set(hx + cur[i * 3], hy + cur[i * 3 + 1], lift)
      const s = 1 + Math.max(0, lift) * 0.9
      tmpObj.scale.setScalar(s)
      tmpObj.updateMatrix()
      m.setMatrixAt(i, tmpObj.matrix)
      const glow = Math.min(1, Math.max(0, lift) * 1.2)
      tmpColor.copy(base).lerp(glow > 0.6 ? accent2 : accent, glow)
      m.setColorAt(i, tmpColor)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[0.075, 10, 10]} />
      <meshStandardMaterial roughness={0.35} metalness={0.3} toneMapped={false} />
    </instancedMesh>
  )
}

/** Canvas do Contato. Roda só quando visível. O ponteiro chega pelo próprio canvas (texto acima é pointer-events-none). */
export default function ReactiveField({ mode, active, reduced }) {
  const m = MODE_COLORS[mode]
  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 1.25]}
      frameloop={active && !reduced ? 'always' : 'demand'}
      camera={{ position: [0, 0, 9], fov: 40, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      style={{ touchAction: 'pan-y' }}
    >
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 0, 6]} intensity={30} color={m.accent} />
      <pointLight position={[-6, 4, 4]} intensity={10} color="#ffffff" />
      <Field mode={mode} reduced={reduced} />
    </Canvas>
  )
}
