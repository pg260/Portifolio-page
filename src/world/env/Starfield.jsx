import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { MODE_COLORS } from '../../lib/tokens.js'
import { world } from '../store.js'
import { buildPaths } from '../paths.js'

const EXPOSURE = 0.05 // "tempo de exposição" do rastro, em segundos de movimento da câmera
const MAX_STREAK = 10 // comprimento máximo do rastro em unidades da cena
const BOUNDS = { x: 70, y: 45, zMin: -165, zMax: 30 }

const vertex = /* glsl */ `
  attribute vec3 aPos;
  attribute vec3 aData; // tamanho (px), semente, tom
  uniform vec2 uRes;
  uniform vec3 uVel;
  uniform float uTime;
  uniform float uPx;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vTint;
  void main() {
    vec4 mv = modelViewMatrix * vec4(aPos, 1.0);
    float depth = -mv.z;
    vUv = position.xy + 0.5;
    vTint = aData.z;
    if (depth < 0.25) { vAlpha = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    // cauda = onde a estrela "estava" antes do movimento da câmera
    vec3 tail = mv.xyz + uVel;
    tail.z = min(tail.z, -0.25);
    vec4 c0 = projectionMatrix * mv;
    vec4 c1 = projectionMatrix * vec4(tail, 1.0);
    vec2 d = (c1.xy / c1.w - c0.xy / c0.w) * 0.5 * uRes;
    float len = length(d);
    if (len > 700.0) { d *= 700.0 / len; len = 700.0; }
    vec2 dir = len > 0.001 ? d / len : vec2(0.0, 1.0);
    vec2 perp = vec2(-dir.y, dir.x);
    float tw = 0.75 + 0.25 * sin(uTime * (0.6 + aData.y * 2.4) + aData.y * 60.0);
    float size = aData.x * uPx * mix(1.0, tw, 0.6);
    float t = position.y + 0.5;
    vec2 off = perp * position.x * size + dir * position.y * size + d * t;
    vec4 clip = c0;
    clip.xy += off / (0.5 * uRes) * c0.w;
    gl_Position = clip;
    float fade = smoothstep(175.0, 45.0, depth) * smoothstep(0.25, 1.5, depth);
    vAlpha = fade * tw * mix(1.0, 0.55, clamp(len / 300.0, 0.0, 1.0));
  }
`
const fragment = /* glsl */ `
  uniform vec3 uColA; uniform vec3 uColB; uniform float uOpacity;
  varying vec2 vUv; varying float vAlpha; varying float vTint;
  void main() {
    float across = abs(vUv.x - 0.5) * 2.0;
    float along = abs(vUv.y - 0.5) * 2.0;
    float a = (1.0 - across * across) * (1.0 - pow(along, 4.0));
    a *= mix(1.15, 0.5, vUv.y);
    vec3 tint = vTint < 0.5 ? uColA : uColB;
    vec3 col = mix(vec3(1.0), tint, fract(vTint * 2.0) * 0.8);
    gl_FragColor = vec4(col, min(1.0, a * vAlpha * uOpacity * 1.25));
  }
`

/**
 * Campo de estrelas 3D que envolve toda a trilha da câmera. Cada estrela é um quad em espaço de tela
 * de tamanho fixo em pixels que se estica na direção do movimento da câmera: parada = ponto que cintila,
 * voando entre estações = rastro de dobra. Tom puxado para as cores do modo.
 */
export function Starfield({ count, mode, reduced }) {
  const mat = useRef()
  const geometry = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1)
    const g = new THREE.InstancedBufferGeometry()
    g.index = base.index
    g.setAttribute('position', base.attributes.position)
    const pos = new Float32Array(count * 3)
    const data = new Float32Array(count * 3)
    // 2/3 das estrelas num "tubo" em volta das trilhas (é o que a câmera vê), o resto no volume todo
    const paths = buildPaths(false)
    const curves = [paths.games.pos, paths.fullstack.pos]
    const p = new THREE.Vector3()
    const dir = new THREE.Vector3()
    for (let i = 0; i < count; i++) {
      if (i % 3 !== 0) {
        curves[i % 2].getPoint(Math.random(), p)
        dir.randomDirection().multiplyScalar(3 + Math.pow(Math.random(), 0.7) * 42)
        p.add(dir)
        p.z -= Math.random() * 14 // empurra para a frente da câmera, no sentido da viagem
      } else {
        p.set((Math.random() * 2 - 1) * BOUNDS.x, (Math.random() * 2 - 1) * BOUNDS.y, BOUNDS.zMin + Math.random() * (BOUNDS.zMax - BOUNDS.zMin))
      }
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z
      data[i * 3] = 1.6 + Math.pow(Math.random(), 4) * 3.6
      data[i * 3 + 1] = Math.random()
      data[i * 3 + 2] = (Math.random() < 0.6 ? 0 : 0.5) + Math.random() * Math.random() * 0.49
    }
    g.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3))
    g.setAttribute('aData', new THREE.InstancedBufferAttribute(data, 3))
    g.instanceCount = count
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uRes: { value: new THREE.Vector2(1, 1) },
      uVel: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uPx: { value: 1 },
      uOpacity: { value: 1 },
      uColA: { value: new THREE.Color(MODE_COLORS.games.accent) },
      uColB: { value: new THREE.Color(MODE_COLORS.games['accent-2']) },
    }),
    [],
  )
  const target = useMemo(() => ({ a: new THREE.Color(MODE_COLORS[mode].accent), b: new THREE.Color(MODE_COLORS[mode]['accent-2']) }), [mode])

  useFrame(({ gl }, dt) => {
    const u = mat.current?.uniforms
    if (!u) return
    gl.getDrawingBufferSize(u.uRes.value)
    u.uPx.value = gl.getPixelRatio()
    if (!reduced) {
      u.uTime.value += dt
      u.uVel.value.copy(world.camera.velView).multiplyScalar(EXPOSURE).clampLength(0, MAX_STREAK)
    }
    const k = reduced ? 1 : Math.min(1, dt * 3)
    u.uColA.value.lerp(target.a, k)
    u.uColB.value.lerp(target.b, k)
  })

  return (
    <mesh geometry={geometry} frustumCulled={false} raycast={() => null} renderOrder={-5}>
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}
