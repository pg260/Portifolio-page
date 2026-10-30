import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing'
import { colors, MODE_COLORS } from '../lib/tokens.js'
import { QUALITY } from './quality.js'
import { world } from './store.js'
import { Monitor } from './shared.jsx'
import { CameraRig } from './CameraRig.jsx'
import { Sky } from './env/Sky.jsx'
import { Starfield } from './env/Starfield.jsx'
import { AsteroidField } from './env/AsteroidField.jsx'
import { Cosmos } from './env/Cosmos.jsx'
import { DataGrid } from './env/DataGrid.jsx'
import { Infra } from './env/Infra.jsx'
import { HeroStation } from './hero/HeroStation.jsx'

/** Pós-processamento. "full": bloom + aberração cromática ligada à velocidade da câmera + vinheta. */
function Post({ full }) {
  const ca = useRef()
  const offset = useMemo(() => new THREE.Vector2(), [])
  useFrame(() => {
    if (!ca.current) return
    const k = Math.min(0.004, world.camera.speed * 0.00005 + world.fx.kick * 0.004)
    ca.current.offset.set(k, k * 0.6)
  })
  if (!full) {
    return (
      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.25} intensity={0.8} mipmapBlur radius={0.55} />
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={0}>
      <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.25} intensity={0.9} mipmapBlur radius={0.6} />
      <ChromaticAberration ref={ca} offset={offset} radialModulation modulationOffset={0.2} />
      <Vignette eskil={false} offset={0.15} darkness={0.7} />
    </EffectComposer>
  )
}

function Scene({ tier, mode, reduced, revealed, onDegrade }) {
  const width = useThree((s) => s.size.width)
  const narrow = width < 1024
  const q = QUALITY[tier]
  const c = useMemo(() => ({ games: colors('games'), fullstack: colors('fullstack') }), [])
  const m = MODE_COLORS[mode]

  // troca de modo: pulso de energia e tranco de câmera
  useEffect(() => {
    const burst = () => {
      world.fx.pulse = 1.6
      world.fx.kick = 1
    }
    window.addEventListener('mode-burst', burst)
    return () => window.removeEventListener('mode-burst', burst)
  }, [])
  useFrame((_, dt) => {
    world.fx.pulse = Math.max(0, world.fx.pulse - Math.min(dt, 0.05) * 2.2)
  })

  const post = narrow ? null : q.post
  return (
    <>
      <Sky mode={mode} reduced={reduced} />
      <Starfield count={narrow ? Math.round(q.stars * 0.6) : q.stars} mode={mode} reduced={reduced} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[-30, 20, 10]} intensity={0.7} color="#d9e2ff" />
      <Environment key={mode} resolution={256} frames={1}>
        <Lightformer intensity={5} color={m.accent} position={[6, 3, -3]} scale={[7, 2.5, 1]} rotation-y={Math.PI / 2} />
        <Lightformer intensity={2.5} color="#ffffff" position={[-6, 3, 3]} scale={[5, 5, 1]} />
        <Lightformer intensity={3} color={m['accent-2']} position={[0, -5, 2]} scale={[9, 1.2, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="ring" intensity={3} color="#ffffff" position={[2, 6, 2]} scale={3} />
      </Environment>
      <Suspense fallback={null}>
        <AsteroidField count={narrow ? Math.round(q.rocks * 0.6) : q.rocks} active={mode === 'games'} reduced={reduced} />
      </Suspense>
      <Cosmos active={mode === 'games'} reduced={reduced} narrow={narrow} galaxyCount={narrow ? Math.round(q.galaxy * 0.6) : q.galaxy} />
      <DataGrid active={mode === 'fullstack'} reduced={reduced} />
      <Infra active={mode === 'fullstack'} reduced={reduced} narrow={narrow} detail={q.infra} />
      <HeroStation mode={mode} revealed={revealed} reduced={reduced} narrow={narrow} c={c} />
      <CameraRig mode={mode} reduced={reduced} narrow={narrow} />
      <Monitor onDegrade={onDegrade} reduced={reduced} />
      {post && <Post full={post === 'full'} />}
    </>
  )
}

/**
 * Mundo 3D da página: um único canvas fixo atrás de todo o conteúdo. O scroll leva a câmera por
 * estações (hero, trabalhos, sobre, contato); os eventos de ponteiro vêm do #root, então o DOM fica
 * por cima e a cena ainda recebe cliques nas zonas de jogo. Com reduced motion o canvas fica só no
 * topo da página (rola junto com o hero) e a câmera não viaja.
 */
export default function World({ tier, mode, reduced, revealed, onDegrade }) {
  const q = QUALITY[tier]
  const [source] = useState(() => document.getElementById('root'))
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none -z-10 ${reduced ? 'absolute inset-x-0 top-0 h-[100svh]' : 'fixed inset-0'}`}
    >
      <Canvas
        eventSource={source}
        eventPrefix="client"
        dpr={q.dpr}
        frameloop={reduced ? 'demand' : 'always'}
        camera={{ position: [0, 0.6, 7.5], fov: 35, near: 0.1, far: 400 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Scene tier={tier} mode={mode} reduced={reduced} revealed={revealed} onDegrade={onDegrade} />
      </Canvas>
    </div>
  )
}
