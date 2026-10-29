import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MODE_COLORS } from '../../lib/tokens.js'
import { world } from '../store.js'
import { buildPaths } from '../paths.js'
import { SNOISE } from '../glsl.js'

/*
 * Viagem do modo Jogos: marcos do espaço que a câmera encontra entre as estações (DESIGN.md §8).
 * Cada marco é ancorado na tela: "aparece em tal ponto da tela quando a câmera está na estação s",
 * então funciona em qualquer proporção (no celular os marcos não somem pelas laterais).
 */

const games = MODE_COLORS.games
/** Paleta do gás: as duas cores do modo Jogos, um violeta e um azul para dar profundidade, e o miolo quente. */
const NEBULA_COLORS = [games.accent, games['accent-2'], '#8b5cf6', '#3b6cf6']
const NEBULA_CORE = '#ffe2b8'
/** Faixas do gigante gasoso (creme, areia, ferrugem, pólos) e o brilho da atmosfera. */
const GIANT_BANDS = ['#f1dcb7', '#d29a62', '#9c4f2e', '#5a3a4a']
const GIANT_ATMO = '#ffb27a'
/** Estrela principal (branca-quente) e companheira (rosada) do sistema binário. */
const STAR_A = '#fff1d6'
const STAR_B = '#ff9ec4'
/** Galáxia: miolo quente, braços puxando para o rosa, o violeta e o azul. */
const GALAXY_CORE = '#ffd9a0'
const GALAXY_ARMS = [games['accent-2'], '#8b5cf6', '#4f7dff']

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Gerador pseudoaleatório com semente (mulberry32): o céu é o mesmo a cada visita. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- posicionamento pela tela ---------- */

const probe = new THREE.PerspectiveCamera()
const pPos = new THREE.Vector3()
const pLook = new THREE.Vector3()
const pFwd = new THREE.Vector3()

/** Ponto do mundo que aparece em `ndc` (−1..1) quando a câmera está na coordenada `s` da trilha, `depth` unidades à frente. */
function placeOnPath(path, s, [nx, ny], depth, aspect, fov) {
  path.sample(s, pPos, pLook)
  probe.fov = fov
  probe.aspect = aspect
  probe.position.copy(pPos)
  probe.lookAt(pLook)
  probe.updateProjectionMatrix()
  probe.updateMatrixWorld()
  const dir = new THREE.Vector3(nx, ny, 0.5).unproject(probe).sub(pPos).normalize()
  probe.getWorldDirection(pFwd)
  return pPos.clone().addScaledVector(dir, depth / dir.dot(pFwd))
}

/**
 * Visibilidade de um marco: some com o modo Fullstack (fade de 0,25s), acende quando fica pronto (`ready`)
 * e só aparece quando a câmera passa de `appear[0]` (cheio em `appear[1]`), como se estivesse longe demais
 * para ser visto antes. Com `leave` apaga de novo entre `leave[0]` e `leave[1]`, para não ficar atrás do texto
 * das estações seguintes.
 */
function useFade(active, reduced, appear, leave) {
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

/* ---------- nebulosa ---------- */

const genVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`
/** Passo 1: campos de ruído da nebulosa (r = densidade do gás, g = matiz, b = véu em volta, a = poeira). */
const fieldFragment = /* glsl */ `
  precision highp float;
  uniform float uSeed;
  varying vec2 vUv;
  ${SNOISE}
  float fbm(vec3 p, int octaves) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      s += a * snoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5;
    }
    return s;
  }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    // gás: nuvens grandes e macias, contorno roído pelo ruído (sem borda reta)
    vec3 P = vec3(p * 1.1, uSeed);
    vec2 w = vec2(fbm(P, 3), fbm(P + vec3(5.2, 1.3, 2.8), 3));
    float f = fbm(P + vec3(w * 1.3, 0.0), 6) * 0.5 + 0.5;
    float edge = length(p * vec2(1.0, 1.3)) + fbm(P * 0.7 + 3.0, 3) * 0.45;
    float gas = smoothstep(0.4, 0.8, f) * smoothstep(0.95, 0.3, edge);
    float hue = fbm(vec3(p * 0.8, uSeed + 11.0), 3) * 0.5 + 0.5;
    float haze = smoothstep(0.15, 0.75, fbm(vec3(p * 0.6, uSeed + 7.0), 4) * 0.5 + 0.5) * smoothstep(0.85, 0.2, length(p * vec2(1.0, 1.25)));
    float dust = smoothstep(0.1, 0.45, fbm(vec3(p * 1.7 + 4.0, uSeed + 4.0), 5));
    gl_FragColor = vec4(gas, hue, haze, dust);
  }
`
/** Passo 2: luz. Lê os campos do passo 1 em vez de recalcular o ruído, então compila e roda leve. */
const lightFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uField;
  uniform float uSeed;
  uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uCore;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    vec4 F = texture2D(uField, vUv);
    float d = F.r, hue = F.g, haze = F.b;
    // aglomerado de estrelas jovens perto do centro ilumina o gás: marcha até ele somando o gás no
    // caminho, então as bordas viradas para a luz acendem e as costas ficam na sombra
    vec2 star = vec2(0.1, 0.06) * vec2(sin(uSeed * 3.1), cos(uSeed * 5.7));
    vec2 toStar = star - p;
    float dist = length(toStar);
    float depth = 0.0;
    for (int i = 1; i <= 8; i++) depth += texture2D(uField, (p + toStar * (float(i) / 9.0)) * 0.5 + 0.5).r;
    depth *= dist / 8.0;
    float lit = exp(-depth * 3.5) / (1.0 + dist * dist * 5.0);
    // cor: corpo azul, violeta e rosa (manchas grandes); borda iluminada rosa → âmbar → creme
    vec3 body = mix(uC3, uC2, smoothstep(0.3, 0.5, hue));
    body = mix(body, uC1, smoothstep(0.5, 0.7, hue));
    vec3 rim = mix(uC1, uC0, smoothstep(0.08, 0.35, lit));
    rim = mix(rim, uCore, smoothstep(0.45, 1.0, lit));
    vec3 emit = d * (body * 0.55 + rim * lit * 2.4);
    // véu fraco em volta: o gás não termina num buraco preto
    emit += haze * (1.0 - d) * mix(uC3, uC2, hue) * 0.16;
    emit += uCore * exp(-dist * dist * 90.0) * 1.2;
    // poeira: manchas largas e escuras dentro do gás que apagam a luz e tapam o fundo
    float lane = F.a * smoothstep(0.02, 0.3, d + haze * 0.3);
    emit *= 1.0 - lane * 0.75;
    // nada encosta na borda da textura: o quadrado do billboard nunca aparece
    float win = smoothstep(1.0, 0.8, max(abs(p.x), abs(p.y)));
    gl_FragColor = vec4(emit * win, clamp(d * 0.2 + haze * 0.1 + lane * 0.5, 0.0, 1.0) * win);
  }
`

const nebulaCache = new WeakMap()
/**
 * Pinta uma nebulosa uma vez numa textura half float na GPU (o ruído é caro demais para rodar por frame):
 * rgb = emissão pré-multiplicada (o miolo passa de 1 e acende no bloom), a = gás e poeira que tapam o fundo.
 * Os shaders compilam fora da thread principal (KHR_parallel_shader_compile), então a página não trava.
 * Guardada por contexto WebGL, semente e tamanho.
 */
function nebulaTexture(gl, seed, size) {
  if (!nebulaCache.has(gl)) nebulaCache.set(gl, new Map())
  const cache = nebulaCache.get(gl)
  const key = `${seed}:${size}`
  if (!cache.has(key)) cache.set(key, paintNebula(gl, seed, size))
  return cache.get(key)
}

async function paintNebula(gl, seed, size) {
  const target = () => new THREE.WebGLRenderTarget(size, size, { type: THREE.HalfFloatType, depthBuffer: false })
  const field = target()
  const out = target()
  const c = NEBULA_COLORS.map((x) => new THREE.Color(x))
  const pass = (fragmentShader, uniforms) =>
    new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: genVertex, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false }))
  const quad = new THREE.PlaneGeometry(2, 2)
  const fieldPass = pass(fieldFragment, { uSeed: { value: seed } })
  const lightPass = pass(lightFragment, {
    uField: { value: field.texture },
    uSeed: { value: seed },
    uC0: { value: c[0] },
    uC1: { value: c[1] },
    uC2: { value: c[2] },
    uC3: { value: c[3] },
    uCore: { value: new THREE.Color(NEBULA_CORE) },
  })
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  for (const m of [fieldPass, lightPass]) {
    m.frustumCulled = false
    scene.add(m)
  }
  // compila já com um alvo de render ativo: o programa sai igual ao usado no desenho e não recompila
  const prev = gl.getRenderTarget()
  gl.setRenderTarget(field)
  const ready = gl.compileAsync(scene, camera)
  gl.setRenderTarget(prev)
  await ready

  const before = gl.getRenderTarget()
  const clear = gl.getClearColor(new THREE.Color())
  const alpha = gl.getClearAlpha()
  gl.setClearColor(0x000000, 0)
  for (const [mesh, rt] of [[fieldPass, field], [lightPass, out]]) {
    fieldPass.visible = mesh === fieldPass
    lightPass.visible = mesh === lightPass
    gl.setRenderTarget(rt)
    gl.clear()
    gl.render(scene, camera)
  }
  gl.setRenderTarget(before)
  gl.setClearColor(clear, alpha)
  quad.dispose()
  fieldPass.material.dispose()
  lightPass.material.dispose()
  field.dispose()
  return out.texture
}

/** Textura da nebulosa, pintada depois da montagem (precisa do contexto WebGL); `current` é `null` até ficar pronta. */
function useNebulaTexture(seed, size) {
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const map = useRef(null)
  useEffect(() => {
    let live = true
    nebulaTexture(gl, seed, size).then((texture) => {
      if (!live) return
      map.current = texture
      invalidate()
    })
    return () => {
      live = false
    }
  }, [gl, seed, size, invalidate])
  return map
}

/** Quad que sempre encara a câmera; a escala do objeto vira largura e altura. */
const billboardVertex = /* glsl */ `
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
const veilFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uBright;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    gl_FragColor = vec4(t.rgb * uBright, t.a) * uOpacity;
  }
`
/** Mistura pré-multiplicada: a emissão soma, a poeira escurece o que está atrás. */
const premultiplied = {
  blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  transparent: true,
  depthWrite: false,
  toneMapped: false,
}

/** Nebulosa de fundo: uma tela pintada (textura gerada) encarando a câmera, girando bem devagar. */
export function NebulaVeil({ position, width, height, seed, resolution = 1024, brightness = 1, active, reduced, appear, leave }) {
  const group = useRef()
  const mat = useRef()
  const fade = useFade(active, reduced, appear, leave)
  const map = useNebulaTexture(seed, resolution)
  const uniforms = useMemo(() => ({ uMap: { value: null }, uOpacity: { value: 0 }, uBright: { value: brightness }, uSpin: { value: 0 } }), [brightness])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt, map.current !== null)
    group.current.visible = v > 0.002
    const u = mat.current.uniforms
    u.uMap.value = map.current
    u.uOpacity.value = v
    if (!reduced) u.uSpin.value += dt * 0.004
  })
  return (
    <group ref={group} position={position}>
      <mesh scale={[width, height, 1]} frustumCulled={false} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={mat} vertexShader={billboardVertex} fragmentShader={veilFragment} uniforms={uniforms} {...premultiplied} />
      </mesh>
    </group>
  )
}

const cloudVertex = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec4 aData; // tamanho, rotação, giro (rad/s), brilho
  attribute vec3 aWin; // janela da textura: x, y, zoom
  uniform float uTime;
  uniform vec2 uNear;
  varying vec2 vUv;
  varying vec2 vQ;
  varying float vFade;
  varying float vBright;
  void main() {
    vec4 mv = modelViewMatrix * vec4(aCenter, 1.0);
    float r = aData.y + uTime * aData.z;
    float c = cos(r), s = sin(r);
    mv.xy += vec2(c * position.x - s * position.y, s * position.x + c * position.y) * aData.x;
    // perto da câmera a nuvem some: atravessá-la não mostra o quadrado
    vFade = smoothstep(uNear.x, uNear.y, -mv.z);
    vQ = position.xy;
    vUv = aWin.xy + (position.xy + 0.5) * aWin.z;
    vBright = aData.w;
    gl_Position = projectionMatrix * mv;
  }
`
const cloudFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec2 vQ;
  varying float vFade;
  varying float vBright;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    float k = smoothstep(0.5, 0.15, length(vQ)) * vFade * uOpacity;
    gl_FragColor = vec4(t.rgb * vBright, t.a * 0.7) * k;
  }
`

/**
 * Nuvem de gás em volume: billboards instanciados (uma chamada de desenho), cada um mostrando um recorte
 * girado da textura da nebulosa, espalhados num elipsoide (`spread` = semieixos). Dá para atravessar.
 */
export function Nebula({ position, spread, count, size, seed = 1, near = [2, 9], resolution = 512, active, reduced, appear, leave }) {
  const group = useRef()
  const mat = useRef()
  const fade = useFade(active, reduced, appear, leave)
  const map = useNebulaTexture(seed, resolution)
  const geometry = useMemo(() => {
    const r = rng(Math.round(seed * 1000))
    const g = () => (r() + r() + r() - 1.5) / 1.5 // quase gaussiana: mais gás no meio
    const center = []
    const data = []
    const win = []
    for (let i = 0; i < count; i++) {
      const c = [g() * spread[0], g() * spread[1], g() * spread[2]]
      const centrality = 1 - Math.min(1, Math.hypot(c[0] / spread[0], c[1] / spread[1], c[2] / spread[2]))
      // recorte da textura num anel em volta do miolo: o miolo é quente demais e vários billboards somam
      const zoom = 0.35 + r() * 0.15
      const a = r() * Math.PI * 2
      const ring = 0.2 + r() * 0.12
      center.push(...c)
      data.push(size[0] + (size[1] - size[0]) * (0.35 * r() + 0.65 * centrality), r() * Math.PI * 2, (r() - 0.5) * 0.03, 0.1 + r() * 0.08)
      win.push(0.5 + Math.cos(a) * ring - zoom / 2, 0.5 + Math.sin(a) * ring - zoom / 2, zoom)
    }
    const geo = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(1, 1)
    geo.index = quad.index
    geo.setAttribute('position', quad.attributes.position)
    geo.setAttribute('aCenter', new THREE.InstancedBufferAttribute(new Float32Array(center), 3))
    geo.setAttribute('aData', new THREE.InstancedBufferAttribute(new Float32Array(data), 4))
    geo.setAttribute('aWin', new THREE.InstancedBufferAttribute(new Float32Array(win), 3))
    geo.instanceCount = count
    return geo
  }, [count, seed, spread, size])
  useEffect(() => () => geometry.dispose(), [geometry])
  const uniforms = useMemo(() => ({ uMap: { value: null }, uTime: { value: 0 }, uNear: { value: new THREE.Vector2(...near) }, uOpacity: { value: 0 } }), [near])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt, map.current !== null)
    group.current.visible = v > 0.002
    const u = mat.current.uniforms
    u.uMap.value = map.current
    u.uOpacity.value = v
    if (!reduced) u.uTime.value += dt
  })
  return (
    <group ref={group} position={position}>
      <mesh geometry={geometry} frustumCulled={false} raycast={() => null}>
        <shaderMaterial ref={mat} vertexShader={cloudVertex} fragmentShader={cloudFragment} uniforms={uniforms} {...premultiplied} />
      </mesh>
    </group>
  )
}

/* ---------- gigante gasoso com anéis ---------- */

const giantVertex = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vObj = position;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - w.xyz);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const giantFragment = /* glsl */ `
  uniform vec3 uSun;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uAtmo;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vV;
  ${SNOISE}
  void main() {
    vec3 p = normalize(vObj);
    // faixas por latitude, torcidas por ruído que corre na longitude (correntes de jato)
    float warp = snoise(vec3(p.x * 2.2 + uTime * 0.012, p.y * 7.0, p.z * 2.2)) * 0.07
               + snoise(vec3(p * 6.0 + uTime * 0.02)) * 0.02;
    float lat = p.y + warp;
    float b1 = sin(lat * 21.0) * 0.5 + 0.5;
    float b2 = sin(lat * 57.0 + 1.3) * 0.5 + 0.5;
    vec3 col = mix(uC0, uC1, smoothstep(0.15, 0.85, b1 * 0.7 + b2 * 0.3));
    col = mix(col, uC2, smoothstep(0.6, 1.0, b2) * 0.55);
    col = mix(col, uC3, smoothstep(0.7, 0.98, abs(p.y)) * 0.75);
    // grande mancha: um olho de tempestade oval no hemisfério sul
    vec2 spot = vec2(atan(p.z, p.x) - 0.9 - uTime * 0.01, (p.y + 0.32) * 3.2);
    float storm = smoothstep(0.32, 0.0, length(vec2(spot.x * 1.4, spot.y)));
    col = mix(col, uC2 * 1.15, storm * 0.8);
    vec3 n = normalize(vN);
    float ndl = dot(n, uSun);
    float light = smoothstep(-0.12, 0.7, ndl);
    float rim = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 3.0);
    vec3 c = col * (0.02 + 1.05 * light) + uAtmo * rim * smoothstep(-0.35, 0.5, ndl) * 0.9;
    gl_FragColor = vec4(c, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`
const ringVertex = /* glsl */ `
  varying vec2 vLocal;
  varying vec3 vWorld;
  void main() {
    vLocal = position.xy;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const ringFragment = /* glsl */ `
  uniform vec3 uSun;
  uniform vec3 uPlanet;
  uniform float uPlanetR;
  uniform vec2 uRange;
  uniform float uOpacity;
  uniform vec3 uC0; uniform vec3 uC1;
  varying vec2 vLocal;
  varying vec3 vWorld;
  void main() {
    float t = (length(vLocal) - uRange.x) / (uRange.y - uRange.x);
    float bands = 0.5 + 0.5 * sin(t * 95.0 + sin(t * 13.0) * 3.0) * sin(t * 31.0 + 1.0);
    float gap = smoothstep(0.5, 0.53, t) * (1.0 - smoothstep(0.57, 0.6, t)); // divisão de Cassini
    float edge = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.93, 1.0, t));
    float a = edge * (1.0 - gap * 0.92) * (0.3 + 0.7 * bands);
    // sombra do planeta: o ponto está atrás dele em relação ao sol e dentro do cilindro de sombra
    vec3 toP = vWorld - uPlanet;
    float along = dot(toP, uSun);
    float shadow = along < 0.0 ? smoothstep(uPlanetR * 0.92, uPlanetR * 1.04, length(toP - uSun * along)) : 1.0;
    vec3 col = mix(uC0, uC1, t) * (0.12 + 0.9 * shadow);
    gl_FragColor = vec4(col, a * uOpacity * 0.85);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const sunTmp = new THREE.Vector3()

/** Gigante gasoso com faixas animadas, mancha de tempestade, atmosfera iluminada pelo sol e anéis com sombra. */
function GasGiant({ position, radius, sun, active, reduced, appear }) {
  const group = useRef()
  const planetMat = useRef()
  const ringMat = useRef()
  const fade = useFade(active, reduced, appear)
  const c = useMemo(() => GIANT_BANDS.map((x) => new THREE.Color(x)), [])
  const planetU = useMemo(
    () => ({
      uSun: { value: new THREE.Vector3() },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uC0: { value: c[0] },
      uC1: { value: c[1] },
      uC2: { value: c[2] },
      uC3: { value: c[3] },
      uAtmo: { value: new THREE.Color(GIANT_ATMO) },
    }),
    [c],
  )
  const ringU = useMemo(
    () => ({
      uSun: { value: new THREE.Vector3() },
      uPlanet: { value: new THREE.Vector3() },
      uPlanetR: { value: radius },
      uRange: { value: new THREE.Vector2(1.35, 2.35) },
      uOpacity: { value: 0 },
      uC0: { value: c[1] },
      uC1: { value: c[0] },
    }),
    [radius, c],
  )
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt)
    group.current.visible = v > 0.002
    const pu = planetMat.current.uniforms
    const ru = ringMat.current.uniforms
    sunTmp.copy(sun).sub(position).normalize()
    pu.uOpacity.value = ru.uOpacity.value = v
    pu.uSun.value.copy(sunTmp)
    ru.uSun.value.copy(sunTmp)
    ru.uPlanet.value.copy(position)
    if (!reduced) pu.uTime.value += dt
  })
  const transparent = { transparent: true, depthWrite: true }
  return (
    <group ref={group} position={position} rotation={[0.42, 0.5, -0.32]}>
      <mesh scale={radius} raycast={() => null}>
        <sphereGeometry args={[1, 96, 64]} />
        <shaderMaterial ref={planetMat} vertexShader={giantVertex} fragmentShader={giantFragment} uniforms={planetU} {...transparent} />
      </mesh>
      {/* depois do planeta: a metade de trás do anel fica escondida pelo depth do planeta */}
      <mesh scale={radius} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} raycast={() => null}>
        <ringGeometry args={[1.35, 2.35, 160, 1]} />
        <shaderMaterial ref={ringMat} vertexShader={ringVertex} fragmentShader={ringFragment} uniforms={ringU} side={THREE.DoubleSide} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ---------- sistema binário ---------- */

const starFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vV;
  ${SNOISE}
  void main() {
    vec3 p = normalize(vObj);
    // granulação da superfície e escurecimento do limbo; intensidade acima do limiar do bloom
    float g = snoise(p * 9.0 + uTime * 0.25) * 0.5 + snoise(p * 22.0 - uTime * 0.4) * 0.25;
    float mu = max(dot(normalize(vN), normalize(vV)), 0.0);
    float limb = 0.55 + 0.45 * pow(mu, 0.6);
    gl_FragColor = vec4(uColor * (2.4 + g * 0.5) * limb * uOpacity, uOpacity);
  }
`
const glowFragment = /* glsl */ `
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

/** Uma estrela: esfera com granulação e o brilho da coroa por cima; `opacity` é o ref de fade do sistema. */
function StarBody({ radius, color, reduced, opacity }) {
  const bodyMat = useRef()
  const glowMat = useRef()
  const body = useMemo(() => ({ uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uOpacity: { value: 0 } }), [color])
  const glow = useMemo(() => ({ uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uTime: { value: 0 }, uRays: { value: 0.55 } }), [color])
  useFrame((_, dt) => {
    const bu = bodyMat.current.uniforms
    const gu = glowMat.current.uniforms
    bu.uOpacity.value = gu.uOpacity.value = opacity.current
    if (!reduced) gu.uTime.value = bu.uTime.value += Math.min(dt, 0.05)
  })
  return (
    <>
      <mesh scale={radius} raycast={() => null}>
        <sphereGeometry args={[1, 48, 32]} />
        <shaderMaterial ref={bodyMat} vertexShader={giantVertex} fragmentShader={starFragment} uniforms={body} transparent toneMapped={false} />
      </mesh>
      <mesh scale={radius * 7} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={glowMat} vertexShader={billboardVertex} fragmentShader={glowFragment} uniforms={glow} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

/** Duas estrelas orbitando o centro de massa: a principal, quente e grande, e a companheira rosada. */
function BinaryStar({ position, radius, active, reduced, appear }) {
  const group = useRef()
  const a = useRef()
  const b = useRef()
  const opacity = useRef(0)
  const fade = useFade(active, reduced, appear)
  const t = useRef(0.6)
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt)
    group.current.visible = v > 0.002
    opacity.current = v
    if (!reduced) t.current += dt * 0.12
    const x = Math.cos(t.current)
    const z = Math.sin(t.current)
    a.current.position.set(-x * radius * 1.1, 0, -z * radius * 1.1)
    b.current.position.set(x * radius * 3.4, z * radius * 0.6, z * radius * 3.4)
  })
  return (
    <group ref={group} position={position}>
      <group ref={a}>
        <StarBody radius={radius} color={STAR_A} reduced={reduced} opacity={opacity} />
      </group>
      <group ref={b}>
        <StarBody radius={radius * 0.45} color={STAR_B} reduced={reduced} opacity={opacity} />
      </group>
    </group>
  )
}

/* ---------- galáxia espiral ---------- */

const galaxyVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  uniform float uTime;
  uniform float uPx;
  uniform float uScale;
  varying vec3 vColor;
  void main() {
    // rotação diferencial: o miolo gira mais rápido que a borda
    float r = length(position.xz);
    float ang = uTime * 0.06 / (0.25 + r);
    float c = cos(ang), s = sin(ang);
    vec3 p = vec3(c * position.x - s * position.z, position.y, s * position.x + c * position.z);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * uPx * uScale / -mv.z;
    vColor = aColor;
    gl_Position = projectionMatrix * mv;
  }
`
const galaxyFragment = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vColor * a * uOpacity, 1.0);
  }
`

/** Galáxia espiral de partículas (três braços em espiral logarítmica, miolo denso e quente) inclinada no céu. */
function Galaxy({ position, radius, count, active, reduced, appear }) {
  const group = useRef()
  const pointsMat = useRef()
  const glowMat = useRef()
  const dpr = useThree((s) => s.viewport.dpr)
  const fade = useFade(active, reduced, appear)
  const geometry = useMemo(() => {
    const r = rng(7)
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const core = new THREE.Color(GALAXY_CORE)
    const arms = GALAXY_ARMS.map((x) => new THREE.Color(x))
    const tmp = new THREE.Color()
    const ARMS = 3
    for (let i = 0; i < count; i++) {
      const d = Math.pow(r(), 1.7) // 0 (miolo) a 1 (borda), concentrado no centro
      const branch = ((i % ARMS) / ARMS) * Math.PI * 2
      const spin = d * 7.5
      const scatter = (k) => Math.pow(r(), 2.6) * (r() < 0.5 ? -1 : 1) * k * (0.25 + d)
      pos[i * 3] = Math.cos(branch + spin) * d + scatter(0.22)
      pos[i * 3 + 1] = scatter(0.06) * (1.2 - d)
      pos[i * 3 + 2] = Math.sin(branch + spin) * d + scatter(0.22)
      const arm = arms[Math.floor(r() * arms.length)]
      tmp.copy(core).lerp(arm, smooth(0.05, 0.7, d)).multiplyScalar(0.55 + r() * 0.45)
      col.set([tmp.r, tmp.g, tmp.b], i * 3)
      size[i] = 0.6 + r() * 1.6 + (d < 0.12 ? 1.4 : 0)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    return g
  }, [count])
  useEffect(() => () => geometry.dispose(), [geometry])
  const points = useMemo(() => ({ uTime: { value: 0 }, uPx: { value: 1 }, uScale: { value: 1 }, uOpacity: { value: 0 } }), [])
  const glow = useMemo(() => ({ uColor: { value: new THREE.Color(GALAXY_CORE) }, uOpacity: { value: 0 }, uTime: { value: 0 }, uRays: { value: 0 } }), [])
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const v = fade(dt)
    group.current.visible = v > 0.002
    const pu = pointsMat.current.uniforms
    pu.uOpacity.value = v
    pu.uPx.value = dpr
    pu.uScale.value = radius * 5
    if (!reduced) pu.uTime.value += dt
    glowMat.current.uniforms.uOpacity.value = v * 0.55
  })
  return (
    <group ref={group} position={position}>
      <points geometry={geometry} scale={radius} rotation={[1.05, 0.2, 0.35]} frustumCulled={false} raycast={() => null}>
        <shaderMaterial ref={pointsMat} vertexShader={galaxyVertex} fragmentShader={galaxyFragment} uniforms={points} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </points>
      <mesh scale={radius * 0.9} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial ref={glowMat} vertexShader={billboardVertex} fragmentShader={glowFragment} uniforms={glow} blending={THREE.AdditiveBlending} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------- a viagem ---------- */

/**
 * Nebulosa atrás da Terra no hero (posta pelo HeroStation; apaga a caminho de Trabalhos, quando a câmera
 * voa na direção dela) e a nuvem que a câmera atravessa entre Sobre e Contato.
 */
export const HERO_VEIL = { width: 95, height: 70, seed: 11.5, leave: [0.35, 0.85] }
/** No celular a Terra fica no alto e o título logo abaixo: véu menor e mais fraco, para o gás ficar em volta do planeta. */
export const HERO_VEIL_PHONE = { ...HERO_VEIL, width: 60, height: 48, brightness: 0.8 }
const PASS_CLOUD = { spread: [11, 5, 12], size: [8, 18], count: 18, seed: 5.3, near: [1.5, 7] }

/**
 * Marcos da trilha do modo Jogos, cada um ancorado num ponto da tela numa estação:
 * gigante gasoso em Trabalhos, sistema binário em Sobre, nuvem que a câmera atravessa a caminho do
 * Contato e a galáxia no fim. Em telas estreitas os raios encolhem para caber na largura.
 */
export function Cosmos({ active, reduced, narrow, galaxyCount }) {
  const { width, height } = useThree((s) => s.size)
  const fov = useThree((s) => s.camera.fov)
  const marks = useMemo(() => {
    const path = buildPaths(narrow).games
    const aspect = width / height
    const fit = Math.min(1, aspect / 1.2) // no retrato o céu é estreito: marcos menores
    const at = (s, ndc, depth) => placeOnPath(path, s, ndc, depth, aspect, fov)
    return {
      giant: { position: at(1, [-0.72, -0.32], 40), radius: 8 * Math.max(0.42, fit) },
      star: { position: at(2, [0.58, 0.52], 40), radius: 2.2 * Math.max(0.6, fit) },
      cloud: { position: at(2.45, [0, 0.12], 6) },
      // à direita: no fim da página o texto do Contato sobe e ocupa o alto da metade esquerda
      galaxy: { position: at(3, [0.5, 0.3], 110), radius: 30 * Math.max(0.45, fit) },
    }
  }, [narrow, width, height, fov])
  return (
    <>
      <GasGiant {...marks.giant} sun={marks.star.position} active={active} reduced={reduced} appear={[0.35, 0.9]} />
      <BinaryStar {...marks.star} active={active} reduced={reduced} appear={[1.2, 1.8]} />
      <Nebula position={marks.cloud.position} {...PASS_CLOUD} active={active} reduced={reduced} appear={[2.05, 2.25]} leave={[2.6, 2.85]} />
      <Galaxy {...marks.galaxy} count={galaxyCount} active={active} reduced={reduced} appear={[2.2, 2.9]} />
    </>
  )
}
