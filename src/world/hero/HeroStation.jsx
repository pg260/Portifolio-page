import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MODE_COLORS } from '../../lib/tokens.js'
import { ModeGroup } from '../shared.jsx'
import { buildPaths } from '../paths.js'
import { world } from '../store.js'
import { EarthGame, ORBIT_REACH } from './EarthGame.jsx'
import { CenterDiv, WIN_H, WIN_W } from './CenterDiv.jsx'
import { HERO_VEIL, HERO_VEIL_PHONE, NebulaVeil } from '../env/Cosmos.jsx'

const HERO_VIEW = { wide: buildPaths(false).games.points[0], narrow: buildPaths(true).games.points[0] }
const restCam = new THREE.PerspectiveCamera()
const ray = new THREE.Vector3()
const fwd = new THREE.Vector3()
const probe = new THREE.Vector3()

/**
 * O minigame é posicionado pela tela, não pelo mundo, para caber em qualquer proporção: no desktop à
 * direita do texto; no celular no topo, centrado acima do headline (que desce para o pé do hero); no
 * tablet na coluna livre à direita, abaixo do headline. `radius` é o tamanho desejado (px do objeto de
 * raio 1), reduzido se preciso para a órbita da Lua inteira caber na tela, senão a Lua sumiria pela
 * borda e não daria para pegá-la. Projeta o ponto de tela num plano z da câmera em repouso do hero.
 */
function heroPlacement(width, height, fov, narrow) {
  const phone = narrow && width < 768
  const x = width * (narrow ? (phone ? 0.5 : 0.7) : 0.72)
  const y = phone ? Math.max(170, height * 0.235) : height * (narrow ? 0.65 : 0.47)
  // celulares baixos não têm sobra acima do headline: o objeto encolhe com a altura
  const radius = phone ? Math.min(62, height * 0.075) : narrow ? 92 : height * 0.17
  const view = narrow ? HERO_VIEW.narrow : HERO_VIEW.wide
  restCam.fov = fov
  restCam.aspect = width / height
  restCam.position.set(...view.pos)
  restCam.lookAt(...view.look)
  restCam.updateProjectionMatrix()
  restCam.updateMatrixWorld()
  ray.set((x / width) * 2 - 1, 1 - (y / height) * 2, 0.5).unproject(restCam).sub(restCam.position).normalize()
  const pos = restCam.position.clone().addScaledVector(ray, ((narrow ? -2.2 : 0) - restCam.position.z) / ray.z)
  const depth = pos.clone().sub(restCam.position).dot(restCam.getWorldDirection(fwd))
  const pxPerUnit = height / (2 * depth * Math.tan(THREE.MathUtils.degToRad(fov / 2)))
  // A metade da frente da órbita fica mais perto da câmera e avança além do raio na tela: mede a
  // órbita projetada e encolhe até ela caber entre as bordas.
  const reach = (scale) => {
    let left = Infinity
    let right = -Infinity
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const r = ORBIT_REACH * scale
      const sx = (probe.set(Math.cos(a) * r, 0, Math.sin(a) * r).add(pos).project(restCam).x + 1) * 0.5 * width
      left = Math.min(left, sx)
      right = Math.max(right, sx)
    }
    return { left, right }
  }
  let scale = radius / pxPerUnit
  for (let i = 0; i < 16; i++) {
    const { left, right } = reach(scale)
    if (right <= width - 16 && left >= 16) break
    scale *= 0.95
  }
  // nebulosa do fundo: no mesmo raio da câmera que passa pela Terra, bem mais longe
  const behind = restCam.position.clone().addScaledVector(pos.clone().sub(restCam.position).normalize(), 130)
  return { offset: pos.toArray(), scale, px: scale * pxPerUnit, y, behind }
}

/**
 * A janela do Fullstack é chapada e tem texto, então não usa o tamanho da Terra. No celular ela se
 * encaixa na faixa livre entre o HUD e o título (medida pelo Hero, `world.view.free`): escala pela
 * altura e pela largura disponíveis e se centra na faixa; sem faixa útil (celulares baixos, em que o
 * título já começa sob o HUD) ela some. Fora do celular é 8% menor que a Terra, para não encostar no título.
 */
function FitWindow({ phone, px, y, width, children }) {
  const ref = useRef()
  useFrame(() => {
    const g = ref.current
    if (!g) return
    if (!phone) {
      g.visible = true
      g.scale.setScalar(0.92)
      g.position.y = 0
      return
    }
    const top = world.view.free.top + 10
    const bottom = world.view.free.bottom - 14
    const byWidth = (width - 32) / (WIN_W * px)
    const k = Math.min(byWidth, (bottom - top) / (WIN_H.compact * px))
    // sem faixa útil a janela ficaria embaixo do título: some (o texto vem antes do brinquedo)
    const fits = k >= 0.75
    g.visible = fits
    g.scale.setScalar(fits ? k : 0.0001)
    g.position.y = fits ? -((top + bottom) / 2 - y) / px : 0
  })
  return <group ref={ref}>{children}</group>
}

/**
 * Estação 0 do mundo: o minigame do modo no enquadramento do hero (à direita do texto no desktop,
 * acima ou ao lado do headline em telas estreitas).
 */
export function HeroStation({ mode, revealed, reduced, narrow, c }) {
  const m = MODE_COLORS[mode]
  const { width, height } = useThree((s) => s.size)
  const fov = useThree((s) => s.camera.fov)
  const { offset, scale, px, y, behind } = useMemo(() => heroPlacement(width, height, fov, narrow), [narrow, width, height, fov])
  const phone = narrow && width < 768
  return (
    <group>
      <NebulaVeil position={behind} {...(phone ? HERO_VEIL_PHONE : HERO_VEIL)} resolution={narrow ? 512 : 1024} active={revealed && mode === 'games'} reduced={reduced} />
      <spotLight position={[4, 6, 4]} intensity={30} angle={0.5} penumbra={1} color={m.accent} />
      <pointLight position={[-4, -2, 3]} intensity={10} color={m['accent-2']} />
      <group position={offset} scale={scale}>
        <ModeGroup active={revealed && mode === 'games'} delay={0.2} reduced={reduced}>
          <Suspense fallback={null}>
            <EarthGame c={c.games} reduced={reduced} active={mode === 'games'} />
          </Suspense>
        </ModeGroup>
        <ModeGroup active={revealed && mode === 'fullstack'} delay={0.2} reduced={reduced}>
          <FitWindow phone={phone} px={px} y={y} width={width}>
            {/* fora do celular a janela vira um pouco para o centro da tela */}
            <CenterDiv c={c.fullstack} reduced={reduced} active={mode === 'fullstack'} yaw={phone ? 0 : -0.2} compact={phone} />
          </FitWindow>
        </ModeGroup>
      </group>
    </group>
  )
}
