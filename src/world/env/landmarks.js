import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { world } from '../store.js'

/*
 * Base dos marcos das viagens (Cosmos no modo Jogos, Infra no Fullstack): posição ancorada na tela,
 * visibilidade por modo e por estação, e os shaders de billboard e brilho que os dois usam.
 */

export const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Gerador pseudoaleatório com semente (mulberry32): o céu é o mesmo a cada visita. */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const probe = new THREE.PerspectiveCamera()
const pPos = new THREE.Vector3()
const pLook = new THREE.Vector3()
const pFwd = new THREE.Vector3()

/** Câmera de referência da trilha na coordenada `s` (para projetar pontos do mundo na tela daquela estação). */
export function cameraOnPath(path, s, aspect, fov) {
  path.sample(s, pPos, pLook)
  probe.fov = fov
  probe.aspect = aspect
  probe.position.copy(pPos)
  probe.lookAt(pLook)
  probe.updateProjectionMatrix()
  probe.updateMatrixWorld()
  return probe
}

/** Ponto do mundo que aparece em `ndc` (−1..1) quando a câmera está na coordenada `s` da trilha, `depth` unidades à frente. */
export function placeOnPath(path, s, [nx, ny], depth, aspect, fov) {
  const cam = cameraOnPath(path, s, aspect, fov)
  const dir = new THREE.Vector3(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize()
  cam.getWorldDirection(pFwd)
  return cam.position.clone().addScaledVector(dir, depth / dir.dot(pFwd))
}

let warmTarget = null

/**
 * Compila os shaders de um marco (e sobe as texturas dele) quando o navegador fica ocioso depois do load.
 * Os marcos ficam invisíveis até a câmera chegar perto e o three só compila o que desenha: sem isto a troca
 * de modo e a primeira passagem por cada marco travam o scroll. Compila com um alvo de render ativo, como o
 * do EffectComposer (sem tone mapping, cor linear), para o programa sair igual e não recompilar no desenho.
 * KHR_parallel_shader_compile deixa a compilação fora da thread principal. `key` refaz quando o conteúdo muda.
 */
export function usePrecompile(ref, key) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 300))
    const cancel = window.cancelIdleCallback ?? clearTimeout
    const id = idle(
      () => {
        const root = ref.current
        if (!root) return
        warmTarget ??= new THREE.WebGLRenderTarget(1, 1)
        const prev = gl.getRenderTarget()
        gl.setRenderTarget(warmTarget)
        gl.compileAsync(root, camera, scene)
        gl.setRenderTarget(prev)
        root.traverse((o) => {
          for (const u of Object.values(o.material?.uniforms ?? {})) if (u.value?.isTexture && u.value.image) gl.initTexture(u.value)
        })
      },
      { timeout: 2500 },
    )
    return () => cancel(id)
  }, [gl, camera, scene, ref, key])
}

/**
 * Visibilidade de um marco: some com o outro modo (fade de 0,25s), acende quando fica pronto (`ready`)
 * e só aparece quando a câmera passa de `appear[0]` (cheio em `appear[1]`), como se estivesse longe demais
 * para ser visto antes. Com `leave` apaga de novo entre `leave[0]` e `leave[1]`, para não ficar atrás do texto
 * das estações seguintes.
 */
export function useFade(active, reduced, appear, leave) {
  const st = useRef({ mode: 0 })
  return (dt, ready = true) => {
    const k = reduced ? 1 : Math.min(1, dt * 4)
    st.current.mode += ((active && ready ? 1 : 0) - st.current.mode) * k
    const s = world.camera.station
    const at = appear ? smooth(appear[0], appear[1], s) : 1
    const gone = leave ? 1 - smooth(leave[0], leave[1], s) : 1
    return st.current.mode * at * gone
  }
}

/** Quad que sempre encara a câmera; a escala do objeto vira largura e altura. */
export const billboardVertex = /* glsl */ `
  uniform float uSpin;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float c = cos(uSpin), s = sin(uSpin);
    vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y);
    mv.xy += q * vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
    gl_Position = projectionMatrix * mv;
  }
`

/** Halo radial (aditivo) com raios opcionais de coroa (`uRays`). */
export const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uRays;
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float r = length(c) * 2.0;
    float a = atan(c.y, c.x);
    float halo = pow(max(1.0 - r, 0.0), 2.6);
    // raios da coroa: finos, girando devagar
    float rays = pow(abs(sin(a * 6.0 + uTime * 0.05)), 18.0) * pow(max(1.0 - r, 0.0), 1.4) * uRays;
    gl_FragColor = vec4(uColor * (halo * 1.3 + rays * 0.8) * uOpacity, 1.0);
  }
`

/** Mistura pré-multiplicada: a emissão soma, o alfa escurece o que está atrás. */
export const premultiplied = {
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  transparent: true,
  depthWrite: false,
  toneMapped: false,
}
