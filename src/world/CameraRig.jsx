import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { easing } from 'maath'
import { world } from './store.js'
import { stationCoord } from './scroll.js'
import { buildPaths } from './paths.js'

const want = new THREE.Vector3()
const wantLook = new THREE.Vector3()
const prev = new THREE.Vector3()
const vel = new THREE.Vector3()
const inv = new THREE.Quaternion()
const velView = new THREE.Vector3()

/**
 * Câmera do mundo: segue a trilha do modo conforme o scroll (Lenis), com amortecimento,
 * paralaxe do ponteiro fora do hero, inclinação nas curvas e tranco em impactos/trocas de modo.
 * Publica a velocidade da câmera no espaço da vista para os rastros das estrelas.
 * Com reduced motion a câmera fica no enquadramento do hero.
 */
export function CameraRig({ mode, reduced, narrow }) {
  const camera = useThree((s) => s.camera)
  const paths = useMemo(() => buildPaths(narrow), [narrow])
  const st = useRef({ pos: null, look: new THREE.Vector3(), roll: 0, px: 0, py: 0 })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const r = st.current
    const s = reduced ? 0 : stationCoord(world.scroll.y)
    paths[mode].sample(s, want, wantLook)
    if (!r.pos) {
      r.pos = want.clone()
      r.look.copy(wantLook)
      prev.copy(want)
    }
    if (reduced) {
      r.pos.copy(want)
      r.look.copy(wantLook)
    } else {
      easing.damp3(r.pos, want, 0.28, dt)
      easing.damp3(r.look, wantLook, 0.32, dt)
    }
    camera.position.copy(r.pos)
    camera.lookAt(r.look)

    // paralaxe do ponteiro: desligada no hero (lá o ponteiro mira o minigame)
    const amount = reduced ? 0 : 1 - world.view.hero
    r.px += (world.pointer.x * amount - r.px) * Math.min(1, dt * 2.5)
    r.py += (world.pointer.y * amount - r.py) * Math.min(1, dt * 2.5)
    camera.translateX(r.px * 0.45)
    camera.translateY(r.py * 0.25)

    // tranco: recuo no eixo da câmera + tremor
    const k = world.fx.kick
    world.fx.kick = Math.max(0, k - dt * 1.6)
    if (k > 0) {
      camera.translateZ(k * 1.8)
      camera.translateX((Math.random() - 0.5) * k * 0.25)
      camera.translateY((Math.random() - 0.5) * k * 0.25)
    }

    // velocidade no espaço da vista (rastros) e inclinação proporcional ao movimento lateral
    vel.copy(r.pos).sub(prev).divideScalar(Math.max(dt, 1e-4))
    prev.copy(r.pos)
    inv.copy(camera.quaternion).invert()
    velView.copy(vel).applyQuaternion(inv)
    Object.assign(world.camera.velView, { x: velView.x, y: velView.y, z: velView.z })
    world.camera.speed = vel.length()
    world.camera.station = s
    const rollTarget = reduced ? 0 : THREE.MathUtils.clamp(-velView.x * 0.01, -0.12, 0.12)
    r.roll += (rollTarget - r.roll) * Math.min(1, dt * 3)
    camera.rotateZ(r.roll)
  })
  return null
}
