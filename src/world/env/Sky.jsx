import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { colors, MODE_COLORS } from '../../lib/tokens.js'
import { world } from '../store.js'
import { SNOISE } from '../glsl.js'

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`
const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime; uniform float uAspect;
  uniform vec2 uLook; uniform float uStation; uniform float uGrid; uniform float uWash;
  uniform vec3 uBg; uniform vec3 uA; uniform vec3 uB;
  ${SNOISE}
  void main(){
    vec2 uv = vUv; vec2 p = vec2(uv.x * uAspect, uv.y);
    // o céu "gira" com a direção da câmera e muda de região a cada estação
    vec2 o = uLook * vec2(1.1, 0.9) + vec2(uStation * 0.45, uStation * 0.12);
    float t = uTime * 0.05;
    float n1 = snoise(vec3((p + o) * 0.9, t + uStation * 0.3));
    float n2 = snoise(vec3((p + o) * 1.7 + 3.1, t * 1.3 + 2.0));
    float n3 = snoise(vec3((p + o) * 3.6 - 7.0, t * 0.6));
    float blobA = smoothstep(0.2, 0.95, n1 * 0.5 + 0.5) * 0.42 * uWash;
    float blobB = smoothstep(0.4, 1.0, n2 * 0.5 + 0.5) * 0.22 * uWash;
    vec2 fc = vec2(uAspect * 0.7, 0.58) - uLook * 0.25;
    float focus = smoothstep(1.4, 0.15, distance(p, fc));
    vec3 col = uBg;
    col = mix(col, uA * 0.55, blobA * (0.25 + 0.75 * focus));
    col = mix(col, uB * 0.45, blobB * (0.15 + 0.6 * focus));
    col *= 1.0 - smoothstep(0.25, 0.9, n3 * 0.5 + 0.5) * 0.35 * (blobA + blobB);
    float gy = abs(fract(uv.y * 14.0 + t * 0.5) - 0.5);
    float gx = abs(fract((p.x + o.x) * 10.0) - 0.5);
    float grid = (1.0 - smoothstep(0.0, 0.03, gy)) + (1.0 - smoothstep(0.0, 0.03, gx));
    col += grid * 0.022 * (1.0 - uv.y) * uGrid;
    float vig = smoothstep(1.25, 0.35, distance(uv, vec2(0.5)));
    col = mix(uBg * 0.6, col, vig);
    gl_FragColor = vec4(col, 1.0);
  }
`

const dir = new THREE.Vector3()

/**
 * Céu do mundo: nebulosa em ruído nas cores do modo, desenhada em tela cheia atrás de tudo.
 * Desloca com a direção da câmera e com a estação atual, então o fundo acompanha a viagem.
 * No modo Fullstack aparece a grade fina de "terminal".
 */
export function Sky({ mode, reduced }) {
  const mat = useRef()
  const size = useThree((s) => s.size)
  const target = useMemo(() => {
    const m = MODE_COLORS[mode]
    // no modo Jogos as nebulosas e os astros do Cosmos fazem a cor; o céu fica mais escuro para eles aparecerem
    const games = mode === 'games'
    return { a: new THREE.Color(m.accent), b: new THREE.Color(m['accent-2']), grid: games ? 0.25 : 1, wash: games ? 0.4 : 1 }
  }, [mode])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uLook: { value: new THREE.Vector2() },
      uStation: { value: 0 },
      uGrid: { value: 0.25 },
      uWash: { value: 0.4 },
      uBg: { value: new THREE.Color(colors().canvas) },
      uA: { value: new THREE.Color(MODE_COLORS.games.accent) },
      uB: { value: new THREE.Color(MODE_COLORS.games['accent-2']) },
    }),
    [],
  )
  useFrame(({ camera }, dt) => {
    const u = mat.current?.uniforms
    if (!u) return
    if (!reduced) u.uTime.value += dt
    u.uAspect.value = size.width / size.height
    camera.getWorldDirection(dir)
    u.uLook.value.set(Math.atan2(dir.x, -dir.z), Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)))
    u.uStation.value = world.camera.station
    const k = reduced ? 1 : Math.min(1, dt * 3)
    u.uA.value.lerp(target.a, k)
    u.uB.value.lerp(target.b, k)
    u.uGrid.value += (target.grid - u.uGrid.value) * k
    u.uWash.value += (target.wash - u.uWash.value) * k
  })
  return (
    <mesh frustumCulled={false} renderOrder={-10} raycast={() => null}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} depthWrite={false} depthTest={false} />
    </mesh>
  )
}
