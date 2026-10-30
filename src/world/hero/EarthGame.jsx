import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { decimal1, makeLine } from '../shared.jsx'
import { fromZone, world } from '../store.js'
import { makeRock } from '../env/AsteroidField.jsx'

const R = 1 // raio da Terra (unidades da cena)
const MOON_R = 0.27
const MOON_D = 2.3
const ATMO = 1.32 // raio onde o meteoro começa a queimar
const MAX_METEORS = 12 // meteoros vivos ao mesmo tempo; passou disso, o mais antigo é reciclado
const METEOR_LIFE = 3.5 // segundos em linha reta até sumir
const METEOR_FADE = 0.5
const METEOR_SPEED = 4.5
const METEOR_FROM = 3.2 // distância antes do alvo onde o meteoro surge
const RADIANT = new THREE.Vector3(0.55, 0.7, 0.45).normalize() // de onde vem a chuva: alto, à direita, à frente
const TRAIL = 22
const EMBERS = 220
const DEBRIS = 28
const EXPLOSIONS = 6
const CRATERS = 14
const MOON_W = 0.12 // velocidade normal da Lua na órbita (rad/s)
const MOON_BOOST = 2.4 // clique na Lua soma isso à velocidade
const MOON_MAX_W = 5
const MOON_THROW = 0.6 // fração da velocidade do arrasto que a Lua leva ao ser solta
const MOON_RELAX = 0.55 // ritmo (1/s) com que a Lua volta à velocidade normal
const CLICK_PX = 6 // movimento até onde um toque ainda conta como clique
const EARTH_DRAG = 0.003 // giro da Terra por px arrastado (rad); na vertical, metade
const DRAG_EASE = 12 // ritmo (1/s) com que Terra e Lua alcançam o ponteiro: dá peso ao arrasto
const MOON_DRAG_MAX = 3.5 // velocidade máxima da Lua seguindo o ponteiro (rad/s)
/** Alcance horizontal da órbita da Lua, em raios da Terra (o enquadramento do hero garante que caiba na tela). */
export const ORBIT_REACH = MOON_D + MOON_R

const atmoVertex = /* glsl */ `
  varying vec3 vN; varying vec3 vV;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const atmoFragment = /* glsl */ `
  uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
  void main() {
    float rim = pow(1.0 - max(dot(vN, vV), 0.0), 2.6);
    gl_FragColor = vec4(uColor, rim * 0.95);
  }
`

/** Textura radial para sprites (flash, cratera) gerada em canvas. */
function makeGlowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.6)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const tmpA = new THREE.Vector3()
const tmpB = new THREE.Vector3()
const tmpC = new THREE.Vector3()
const tmpS = new THREE.Vector3() // exclusivo da projeção na tela
const hitP = new THREE.Vector3() // exclusivos de explode(): quem chama pode passar tmpA/tmpB
const hitN = new THREE.Vector3()
const Z = new THREE.Vector3(0, 0, 1)
const tmpObj = new THREE.Object3D()

/**
 * Minigame do modo Jogos: Terra com Lua em órbita. Clicar lança um meteoro no ponto clicado: na Terra
 * ele cai ali; no espaço segue em linha reta até sumir (no máximo MAX_METEORS vivos). Arrastar a Terra
 * a gira. A Lua fica presa à órbita: clique acelera; arrastar a leva pela órbita (parar o mouse a para);
 * soltar em movimento a arremessa, e ela perde velocidade até voltar ao ritmo normal.
 * Entrada na atmosfera, impactos com flash, anel, destroços, cratera e tremor.
 */
export function EarthGame({ c, reduced, active }) {
  const tex = useTexture({
    map: '/textures/earth/earth-color.webp',
    normalMap: '/textures/earth/earth-normal.webp',
    specularMap: '/textures/earth/earth-specular.webp',
    clouds: '/textures/earth/earth-clouds.webp',
    moon: '/textures/earth/moon-color.webp',
  })
  useMemo(() => {
    for (const k of ['map', 'clouds', 'moon']) tex[k].colorSpace = THREE.SRGBColorSpace
    for (const k of Object.keys(tex)) tex[k].anisotropy = 4
  }, [tex])

  const getThree = useThree((s) => s.get)
  const root = useRef()
  const earthGroup = useRef()
  const earth = useRef()
  const clouds = useRef()
  const moonOrbit = useRef()
  const moon = useRef()
  const orbitRing = useRef()
  const dyn = useRef()
  const embersMesh = useRef()
  const glow = useMemo(() => makeGlowTexture(), [])
  const accent = useMemo(() => new THREE.Color(c.accent), [c])
  const hotColor = useMemo(() => new THREE.Color('#ff7a1a'), [])

  // as mesmas rochas com crateras do cinturão, com a textura da Lua; o emissivo é o calor da entrada
  const astGeos = useMemo(() => [0, 1, 2].map((i) => makeRock(i * 3.7 + 11.3)), [])
  const astMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: tex.moon, color: '#c9bca8', roughness: 1, metalness: 0, emissive: '#ff6a00', emissiveIntensity: 0 }),
    [tex],
  )
  useEffect(() => () => astGeos.forEach((g) => g.dispose()), [astGeos])

  // estado da simulação (fora do React)
  const S = useRef({
    meteors: [],
    embers: { pos: new Float32Array(EMBERS * 3), vel: new Float32Array(EMBERS * 3), life: new Float32Array(EMBERS), next: 0 },
    explosions: [],
    craters: [],
    craterNext: 0,
    moonPos: new THREE.Vector3(MOON_D, 0, 0),
    moon: { angle: 0, target: 0, prev: 0, w: MOON_W, held: false, moved: false, x0: 0, y0: 0, wHeld: 0 },
    earthAim: { x: 0.1, y: 0 }, // rotação que a Terra persegue (arrasto + giro automático)
    press: null, // clique/arrasto em curso na Terra ou no espaço
    punch: 0,
    stats: { impacts: 0, biggest: 0 },
    frame: 0,
  })

  /* ---------- pools: meteoros, explosões e crateras (alocados uma vez) ---------- */
  useEffect(() => {
    const s = S.current
    const group = dyn.current
    if (!group) return
    const meteors = []
    for (let i = 0; i < MAX_METEORS; i++) {
      const mesh = new THREE.Mesh(astGeos[i % 3], astMat.clone())
      mesh.visible = false
      const trail = makeLine(TRAIL, c.accent, 0.55)
      group.add(mesh, trail)
      meteors.push({ mesh, trail, alive: false, pos: new THREE.Vector3(), vel: new THREE.Vector3(), r: 0.1, age: 0, hot: 0, spin: new THREE.Vector3() })
    }
    s.meteors = meteors
    const explosions = []
    for (let i = 0; i < EXPLOSIONS; i++) {
      const g = new THREE.Group()
      g.visible = false
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#fff1c4', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.62, 48),
        new THREE.MeshBasicMaterial({ color: c.accent, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      )
      const debris = new THREE.InstancedMesh(
        new THREE.TetrahedronGeometry(0.05, 0),
        new THREE.MeshStandardMaterial({ color: '#5a4a3a', emissive: '#ff6a00', emissiveIntensity: 1.4, roughness: 1 }),
        DEBRIS,
      )
      const light = new THREE.PointLight(c.accent, 0, 7, 1.5)
      g.add(flash, ring, debris, light)
      group.add(g)
      explosions.push({ g, flash, ring, debris, light, dv: new Float32Array(DEBRIS * 3), dp: new Float32Array(DEBRIS * 3), age: 99, size: 1, normal: new THREE.Vector3() })
    }
    s.explosions = explosions
    const craters = []
    for (let i = 0; i < CRATERS; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: '#ff7a1a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }))
      sp.visible = false
      earth.current.add(sp)
      craters.push({ sp, age: 99, size: 1 })
    }
    s.craters = craters
    return () => {
      meteors.forEach((m) => {
        group.remove(m.mesh, m.trail)
        m.mesh.material.dispose()
        m.trail.geometry.dispose()
        m.trail.material.dispose()
      })
      explosions.forEach((e) => group.remove(e.g))
      craters.forEach((cr) => earth.current?.remove(cr.sp))
    }
  }, [glow, c, astGeos, astMat])

  /* ---------- troca de modo: limpa o céu e solta o que estiver preso ---------- */
  useEffect(() => {
    const burst = () => {
      const s = S.current
      s.meteors.forEach(kill)
      s.press = null
      s.moon.held = false
    }
    window.addEventListener('mode-burst', burst)
    return () => window.removeEventListener('mode-burst', burst)
  })

  // Gancho de teste (só em dev): meteoros determinísticos e posições na tela para o Playwright
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__earth = {
      strike: (x, y, z = 0) => strike(new THREE.Vector3(x, y, z), Math.hypot(x, y, z) <= R + 0.01),
      stats: () => ({ ...S.current.stats, alive: S.current.meteors.filter((m) => m.alive).length }),
      moon: () => ({ angle: +S.current.moon.angle.toFixed(3), w: +S.current.moon.w.toFixed(3), held: S.current.moon.held }),
      screen: () => {
        const at = (obj) => toScreen(obj.getWorldPosition(tmpS))
        return { moon: at(moon.current), earth: at(earth.current) }
      },
      project: (x, y, z) => toScreen(root.current.localToWorld(tmpS.set(x, y, z))),
      orbitX: () => {
        const xs = Array.from({ length: 36 }, (_, i) => {
          const a = (i / 36) * Math.PI * 2
          return toScreen(moonOrbit.current.localToWorld(tmpS.set(Math.cos(a) * MOON_D, 0, Math.sin(a) * MOON_D)))[0]
        })
        return [Math.round(Math.min(...xs)), Math.round(Math.max(...xs))]
      },
    }
    return () => delete window.__earth
  })

  /* ---------- helpers ---------- */
  /** Ponto do mundo → coordenadas de cliente (px) na câmera atual. Altera `p`. */
  const toScreen = (p) => {
    const { camera, size } = getThree()
    p.project(camera)
    return [size.left + (p.x + 1) * 0.5 * size.width, size.top + (1 - p.y) * 0.5 * size.height]
  }

  /**
   * Ângulo da órbita cuja posição na tela fica mais perto do ponteiro. Busca só perto do ângulo atual,
   * para a Lua deslizar pela órbita em vez de saltar entre a metade da frente e a de trás.
   */
  const nearestMoonAngle = (from, x, y) => {
    let best = from
    let bestD = Infinity
    const scan = (center, span, steps) => {
      for (let i = 0; i <= steps; i++) {
        const a = center - span + (2 * span * i) / steps
        const [px, py] = toScreen(moonOrbit.current.localToWorld(tmpS.set(Math.cos(a) * MOON_D, 0, Math.sin(a) * MOON_D)))
        const d = (px - x) ** 2 + (py - y) ** 2
        if (d < bestD) {
          bestD = d
          best = a
        }
      }
    }
    scan(from, 0.7, 28)
    scan(best, 0.05, 10)
    return best
  }

  const kill = (m) => {
    m.alive = false
    m.mesh.visible = false
    m.trail.visible = false
  }

  /**
   * Lança um meteoro que passa por `target` (espaço local). Vem do radiante com um pouco de variação;
   * mirando a Terra, chega sempre de fora do plano tangente, para o primeiro contato ser o ponto clicado.
   * Usa uma vaga livre do pool ou recicla o meteoro mais antigo.
   */
  const strike = (target, onEarth) => {
    const s = S.current
    const m = s.meteors.find((x) => !x.alive) || s.meteors.reduce((a, b) => (b.age > a.age ? b : a))
    const from = tmpA.copy(RADIANT).add(tmpB.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.35))
    let aim = target
    if (onEarth) {
      const n = tmpB.copy(target).normalize()
      aim = tmpC.copy(n).multiplyScalar(R)
      from.normalize().addScaledVector(n, 0.9).normalize()
      if (from.dot(n) < 0.3) from.copy(n).addScaledVector(RADIANT, 0.3)
    }
    from.normalize()
    m.alive = true
    m.age = 0
    m.hot = 0
    m.r = 0.06 + Math.random() * 0.09
    m.pos.copy(aim).addScaledVector(from, METEOR_FROM)
    m.vel.copy(from).multiplyScalar(-METEOR_SPEED)
    m.spin.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(4)
    m.mesh.position.copy(m.pos)
    m.mesh.scale.setScalar(m.r)
    m.mesh.visible = true
    const tp = m.trail.geometry.attributes.position
    for (let i = 0; i < TRAIL; i++) tp.setXYZ(i, m.pos.x, m.pos.y, m.pos.z)
    tp.needsUpdate = true
    m.trail.material.opacity = 0.55
    m.trail.visible = true
  }

  const spawnEmber = (p, v, spread) => {
    const e = S.current.embers
    const i = e.next
    e.next = (e.next + 1) % EMBERS
    e.pos[i * 3] = p.x
    e.pos[i * 3 + 1] = p.y
    e.pos[i * 3 + 2] = p.z
    e.vel[i * 3] = v.x + (Math.random() - 0.5) * spread
    e.vel[i * 3 + 1] = v.y + (Math.random() - 0.5) * spread
    e.vel[i * 3 + 2] = v.z + (Math.random() - 0.5) * spread
    e.life[i] = 1
  }

  const explode = (pointIn, normalIn, r, onEarth) => {
    const s = S.current
    const point = hitP.copy(pointIn)
    const normal = hitN.copy(normalIn)
    const e = s.explosions.reduce((best, x) => (x.age > best.age ? x : best), s.explosions[0])
    const size = 0.7 + r * 5
    e.age = 0
    e.size = size
    e.normal.copy(normal)
    e.g.position.copy(point)
    e.g.visible = true
    e.ring.quaternion.setFromUnitVectors(Z, normal)
    e.ring.position.copy(normal).multiplyScalar(0.02)
    e.flash.material.opacity = 1
    e.ring.material.opacity = 1
    for (let i = 0; i < DEBRIS; i++) {
      e.dp[i * 3] = e.dp[i * 3 + 1] = e.dp[i * 3 + 2] = 0
      e.dv[i * 3] = normal.x * (1.2 + Math.random() * 1.6) + (Math.random() - 0.5) * 1.6
      e.dv[i * 3 + 1] = normal.y * (1.2 + Math.random() * 1.6) + (Math.random() - 0.5) * 1.6
      e.dv[i * 3 + 2] = normal.z * (1.2 + Math.random() * 1.6) + (Math.random() - 0.5) * 1.6
    }
    e.light.intensity = 45 * size
    for (let i = 0; i < 24; i++) spawnEmber(point, tmpB.copy(normal).multiplyScalar(1.5), 2.2)
    if (onEarth) {
      const cr = s.craters[s.craterNext]
      s.craterNext = (s.craterNext + 1) % CRATERS
      earth.current.worldToLocal(root.current.localToWorld(tmpA.copy(point)))
      cr.sp.position.copy(tmpA).multiplyScalar(1.01)
      cr.sp.scale.setScalar(0.16 * size)
      cr.sp.material.opacity = 1
      cr.sp.visible = true
      cr.age = 0
      cr.size = size
      s.punch = 0.05 * size
    }
    world.fx.kick = Math.min(1, 0.22 * size)
    s.stats.impacts += 1
    s.stats.biggest = Math.max(s.stats.biggest, r)
  }

  /* ---------- input ---------- */
  const toLocal = (p) => root.current.worldToLocal(tmpC.copy(p)).clone()
  const client = (e) => [e.nativeEvent.clientX, e.nativeEvent.clientY]
  const finePointer = (e) => e.pointerType === 'mouse' || e.pointerType === 'pen'
  const dragged = (x0, y0, x, y) => (x - x0) ** 2 + (y - y0) ** 2 > CLICK_PX * CLICK_PX

  // o minigame só aceita entrada vinda da área do hero (não de textos/botões por cima) e com o hero na tela
  const playable = (e) => !reduced && active && world.view.hero > 0.15 && fromZone(e, 'hero')

  // Terra e espaço: soltar sem arrastar lança o meteoro; arrastar a Terra (ponteiro fino) a gira
  const onPress = (e, kind) => {
    if (!playable(e)) return
    e.stopPropagation()
    const [x, y] = client(e)
    S.current.press = { kind, x, y, point: toLocal(e.point), moved: false }
    e.target.setPointerCapture?.(e.pointerId)
  }
  const onPressMove = (e) => {
    const p = S.current.press
    if (!p) return
    const [x, y] = client(e)
    if (!p.moved && dragged(p.x, p.y, x, y)) p.moved = true
    if (p.moved && p.kind === 'earth' && finePointer(e)) {
      const aim = S.current.earthAim
      aim.y += (e.nativeEvent.movementX || 0) * EARTH_DRAG
      aim.x = THREE.MathUtils.clamp(aim.x + (e.nativeEvent.movementY || 0) * EARTH_DRAG * 0.5, -0.6, 0.6)
    }
  }
  const onRelease = (e, cancelled) => {
    const p = S.current.press
    if (!p) return
    S.current.press = null
    e.target?.releasePointerCapture?.(e.pointerId)
    if (!cancelled && !p.moved) strike(p.point, p.kind === 'earth')
  }

  // Lua: segurar a controla; arrastar a leva pela órbita; clique (sem arrastar) acelera
  const onMoonDown = (e) => {
    if (!playable(e)) return
    e.stopPropagation()
    const mo = S.current.moon
    const [x, y] = client(e)
    Object.assign(mo, { held: true, moved: false, x0: x, y0: y, wHeld: 0, prev: mo.angle, target: mo.angle })
    e.target.setPointerCapture?.(e.pointerId)
  }
  const onMoonMove = (e) => {
    const mo = S.current.moon
    if (!mo.held) return
    e.stopPropagation()
    const [x, y] = client(e)
    if (!mo.moved && dragged(mo.x0, mo.y0, x, y)) mo.moved = true
    if (mo.moved) mo.target = nearestMoonAngle(mo.target, x, y)
  }
  const onMoonUp = (e, cancelled) => {
    const mo = S.current.moon
    if (!mo.held) return
    mo.held = false
    e.target?.releasePointerCapture?.(e.pointerId)
    if (mo.moved) mo.w = THREE.MathUtils.clamp(mo.wHeld * MOON_THROW, -MOON_MAX_W, MOON_MAX_W)
    else if (!cancelled) mo.w = Math.min(MOON_MAX_W, Math.max(mo.w, MOON_W) + MOON_BOOST)
  }

  /* ---------- loop ---------- */
  useFrame(({ clock }, rawDt) => {
    const s = S.current
    const dt = Math.min(rawDt, 0.05)
    if (!earthGroup.current) return
    // rotação da Terra, nuvens, Lua
    const mo = s.moon
    if (!reduced) {
      // a Terra persegue a rotação pedida (arrasto ou giro automático) com amortecimento
      if (!(s.press?.moved && s.press.kind === 'earth')) s.earthAim.y += dt * 0.06
      const ease = 1 - Math.exp(-dt * DRAG_EASE)
      earthGroup.current.rotation.y += (s.earthAim.y - earthGroup.current.rotation.y) * ease
      earthGroup.current.rotation.x += (s.earthAim.x - earthGroup.current.rotation.x) * ease
      if (clouds.current) clouds.current.rotation.y += dt * 0.02
      if (mo.held) {
        // segurando: a Lua segue o ponto da órbita mais perto do ponteiro, com amortecimento e teto de
        // velocidade (nas pontas da elipse um px vira muito ângulo); mouse parado = Lua parada
        const step = (mo.target - mo.angle) * ease
        mo.angle += THREE.MathUtils.clamp(step, -MOON_DRAG_MAX * dt, MOON_DRAG_MAX * dt)
        const inst = (mo.angle - mo.prev) / Math.max(dt, 1e-3)
        mo.wHeld += (inst - mo.wHeld) * (1 - Math.exp(-dt * 18))
      } else {
        mo.w += (MOON_W - mo.w) * (1 - Math.exp(-dt * MOON_RELAX))
        mo.angle += mo.w * dt
      }
      mo.prev = mo.angle
      moon.current.position.set(Math.cos(mo.angle) * MOON_D, 0, Math.sin(mo.angle) * MOON_D)
      moon.current.rotation.y += dt * 0.05
      // a órbita acende com a Lua na mão ou fora do ritmo normal
      const ring = orbitRing.current
      if (ring) {
        const target = mo.held ? 0.75 : 0.3 + Math.min(0.45, Math.abs(mo.w - MOON_W) * 0.08)
        ring.material.opacity += (target - ring.material.opacity) * Math.min(1, dt * 8)
      }
    }
    moon.current.getWorldPosition(tmpA)
    s.moonPos.copy(root.current.worldToLocal(tmpA))
    // punch da Terra
    s.punch *= Math.exp(-5 * dt)
    const sc = 1 + s.punch * Math.cos(clock.elapsedTime * 30)
    earthGroup.current.scale.setScalar(sc)
    if (reduced || !active || world.view.hero < 0.02) return

    // meteoros: linha reta até bater na Terra ou na Lua, ou acabar a vida
    let alive = 0
    for (const m of s.meteors) {
      if (!m.alive) continue
      m.age += dt
      const h = dt / 2
      let hit = false
      for (let i = 0; i < 2 && !hit; i++) {
        m.pos.addScaledVector(m.vel, h)
        if (m.pos.length() < R + m.r * 0.6) {
          const n = tmpA.copy(m.pos).normalize()
          explode(tmpB.copy(n).multiplyScalar(R), n, m.r, true)
          hit = true
        } else if (tmpA.copy(m.pos).sub(s.moonPos).length() < MOON_R + m.r * 0.6) {
          const n = tmpA.normalize()
          explode(tmpB.copy(s.moonPos).addScaledVector(n, MOON_R), n, m.r, false)
          hit = true
        }
      }
      if (hit || m.age > METEOR_LIFE) {
        kill(m)
        continue
      }
      alive += 1
      const fade = Math.min(1, (METEOR_LIFE - m.age) / METEOR_FADE)
      // atmosfera
      const inAtmo = m.pos.length() < ATMO
      m.hot += ((inAtmo ? 1 : 0) - m.hot) * Math.min(1, dt * 5)
      m.mesh.position.copy(m.pos)
      m.mesh.rotation.x += m.spin.x * dt
      m.mesh.rotation.y += m.spin.y * dt
      m.mesh.scale.setScalar(m.r * fade)
      m.mesh.material.emissiveIntensity = 0.08 + m.hot * 2.6
      m.trail.material.color.copy(accent).lerp(hotColor, m.hot)
      m.trail.material.opacity = 0.55 * fade
      if (m.hot > 0.3 && s.frame % 2 === 0) spawnEmber(m.pos, tmpA.copy(m.vel).multiplyScalar(-0.2), 0.5)
      // rastro
      const tp = m.trail.geometry.attributes.position
      tp.array.copyWithin(3, 0, (TRAIL - 1) * 3)
      tp.setXYZ(0, m.pos.x, m.pos.y, m.pos.z)
      tp.needsUpdate = true
    }

    // brasas
    const e = s.embers
    const em = embersMesh.current
    if (em) {
      for (let i = 0; i < EMBERS; i++) {
        if (e.life[i] <= 0) {
          tmpObj.scale.setScalar(0)
        } else {
          e.life[i] -= dt * 1.8
          e.pos[i * 3] += e.vel[i * 3] * dt
          e.pos[i * 3 + 1] += e.vel[i * 3 + 1] * dt
          e.pos[i * 3 + 2] += e.vel[i * 3 + 2] * dt
          tmpObj.position.set(e.pos[i * 3], e.pos[i * 3 + 1], e.pos[i * 3 + 2])
          tmpObj.scale.setScalar(Math.max(0, e.life[i]))
        }
        tmpObj.updateMatrix()
        em.setMatrixAt(i, tmpObj.matrix)
      }
      em.instanceMatrix.needsUpdate = true
    }

    // explosões
    for (const ex of s.explosions) {
      if (ex.age > 1.6) continue
      ex.age += dt
      const k = Math.min(1, ex.age / 0.9)
      ex.flash.scale.setScalar(ex.size * (0.35 + k * 2.4))
      ex.flash.material.opacity = Math.max(0, 1 - k * 1.4)
      ex.ring.scale.setScalar(ex.size * (0.15 + k * 2.0))
      ex.ring.material.opacity = Math.max(0, 1 - k)
      ex.light.intensity = 45 * ex.size * Math.max(0, 1 - ex.age * 2.2)
      for (let i = 0; i < DEBRIS; i++) {
        // gravidade de volta ao planeta (aproximada pela normal)
        ex.dv[i * 3] -= ex.normal.x * 2.2 * dt
        ex.dv[i * 3 + 1] -= ex.normal.y * 2.2 * dt
        ex.dv[i * 3 + 2] -= ex.normal.z * 2.2 * dt
        ex.dp[i * 3] += ex.dv[i * 3] * dt
        ex.dp[i * 3 + 1] += ex.dv[i * 3 + 1] * dt
        ex.dp[i * 3 + 2] += ex.dv[i * 3 + 2] * dt
        tmpObj.position.set(ex.dp[i * 3], ex.dp[i * 3 + 1], ex.dp[i * 3 + 2])
        tmpObj.rotation.set(ex.age * 5 + i, ex.age * 3, 0)
        tmpObj.scale.setScalar(ex.size * Math.max(0, 1 - ex.age / 1.5))
        tmpObj.updateMatrix()
        ex.debris.setMatrixAt(i, tmpObj.matrix)
      }
      ex.debris.instanceMatrix.needsUpdate = true
      if (ex.age > 1.6) ex.g.visible = false
    }
    // crateras
    for (const cr of s.craters) {
      if (cr.age > 30) continue
      cr.age += dt
      cr.sp.material.opacity = Math.max(0, 1 - cr.age / 28)
      if (cr.age > 30) cr.sp.visible = false
    }

    // HUD
    s.frame += 1
    if (s.frame % 10 === 0) {
      const hud = world.telemetry
      if (hud.s1) hud.s1.textContent = String(s.stats.impacts).padStart(2, '0')
      if (hud.s2) hud.s2.textContent = String(alive).padStart(2, '0')
      if (hud.s3) hud.s3.textContent = s.stats.biggest ? `${decimal1.format(s.stats.biggest * 20)} km` : '—'
    }
  })

  return (
    <group ref={root}>
      {/* plano invisível que recebe os cliques no espaço */}
      <mesh onPointerDown={(e) => onPress(e, 'space')} onPointerMove={onPressMove} onPointerUp={(e) => onRelease(e, false)} onPointerCancel={(e) => onRelease(e, true)}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      <directionalLight position={[-7, 3, 4]} intensity={2.4} color="#fff3df" />

      <group ref={earthGroup} rotation={[0.1, 0, 0.41]}>
        <mesh ref={earth} onPointerDown={(e) => onPress(e, 'earth')} onPointerMove={onPressMove} onPointerUp={(e) => onRelease(e, false)} onPointerCancel={(e) => onRelease(e, true)}>
          <sphereGeometry args={[R, 72, 72]} />
          <meshPhongMaterial map={tex.map} normalMap={tex.normalMap} normalScale={[0.9, 0.9]} specularMap={tex.specularMap} specular="#4a5a70" shininess={14} />
        </mesh>
        <mesh ref={clouds} raycast={() => null}>
          <sphereGeometry args={[R * 1.014, 48, 48]} />
          <meshStandardMaterial map={tex.clouds} transparent opacity={0.85} depthWrite={false} roughness={1} />
        </mesh>
        <mesh raycast={() => null}>
          <sphereGeometry args={[R * 1.075, 48, 48]} />
          <shaderMaterial vertexShader={atmoVertex} fragmentShader={atmoFragment} uniforms={{ uColor: { value: new THREE.Color('#5fb4ff') } }} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      <group ref={moonOrbit} rotation={[0.25, 0, 0.1]}>
        <mesh ref={moon} position={[MOON_D, 0, 0]} raycast={() => null}>
          <sphereGeometry args={[MOON_R, 32, 32]} />
          <meshStandardMaterial map={tex.moon} roughness={1} />
          {/* área de toque com o dobro do raio da Lua: alvo confortável no celular */}
          <mesh onPointerDown={onMoonDown} onPointerMove={onMoonMove} onPointerUp={(e) => onMoonUp(e, false)} onPointerCancel={(e) => onMoonUp(e, true)}>
            <sphereGeometry args={[MOON_R * 2, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        </mesh>
        <mesh ref={orbitRing} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
          <torusGeometry args={[MOON_D, 0.005, 6, 180]} />
          <meshBasicMaterial color={c.accent} transparent opacity={0.3} toneMapped={false} />
        </mesh>
      </group>

      <group ref={dyn} />
      <instancedMesh ref={embersMesh} args={[undefined, undefined, EMBERS]} frustumCulled={false} raycast={() => null}>
        <sphereGeometry args={[0.024, 6, 6]} />
        <meshBasicMaterial color="#ff8a2a" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
