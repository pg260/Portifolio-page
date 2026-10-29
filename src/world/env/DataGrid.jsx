import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { MODE_COLORS } from '../../lib/tokens.js'

const FLOOR_Y = -6.5

const vertex = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const fragment = /* glsl */ `
  uniform float uTime; uniform float uOpacity;
  uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uCam;
  varying vec3 vW;
  float line(float c, float scale) {
    float v = c / scale;
    float w = fwidth(v);
    float d = abs(fract(v - 0.5) - 0.5);
    return 1.0 - smoothstep(0.0, w * 1.5, d);
  }
  float hash(float n) { return fract(sin(n * 91.7) * 43758.5453); }
  void main() {
    float gx = line(vW.x, 2.0);
    float gz = line(vW.z, 2.0);
    float major = max(line(vW.x, 10.0), line(vW.z, 10.0));
    float g = max(gx, gz) * 0.3 + major * 0.7;
    float dist = length(vW.xz - uCam.xz);
    float fade = smoothstep(95.0, 6.0, dist);
    // pacotes de dados correndo pelas linhas longitudinais, para longe da câmera
    float lane = floor(vW.x / 2.0 + 0.5);
    float h = hash(lane);
    float pz = fract(vW.z * 0.035 + uTime * (0.18 + h * 0.4) + h * 10.0);
    float packet = (1.0 - smoothstep(0.0, 0.07, pz)) * gx * step(0.45, h);
    vec3 col = uColA * g * 0.55 + mix(uColA, uColB, h) * packet * 2.2;
    float a = (g * 0.45 + packet) * fade * uOpacity;
    gl_FragColor = vec4(col, a);
  }
`

/**
 * Chão de dados do modo Fullstack: grade em perspectiva com linhas maiores a cada 10 unidades e
 * pacotes luminosos correndo pelas faixas. Some com opacidade na troca de modo.
 */
export function DataGrid({ active, reduced }) {
  const mat = useRef()
  const mesh = useRef()
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uCam: { value: new THREE.Vector3() },
      uColA: { value: new THREE.Color(MODE_COLORS.fullstack.accent) },
      uColB: { value: new THREE.Color(MODE_COLORS.fullstack['accent-2']) },
    }),
    [],
  )
  useFrame(({ camera }, rawDt) => {
    const u = mat.current?.uniforms
    if (!u) return
    const dt = Math.min(rawDt, 0.05)
    if (!reduced) u.uTime.value += dt
    u.uOpacity.value += ((active ? 1 : 0) - u.uOpacity.value) * (reduced ? 1 : Math.min(1, dt * 3))
    u.uCam.value.copy(camera.position)
    if (mesh.current) mesh.current.visible = u.uOpacity.value > 0.01
  })
  return (
    <mesh ref={mesh} position={[0, FLOOR_Y, -60]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[240, 240]} />
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
