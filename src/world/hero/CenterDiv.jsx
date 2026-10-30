import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { modes } from '../../data/profile.js'
import { font } from '../../lib/tokens.js'
import { clamp01, decimal1, easeOutBack } from '../shared.jsx'
import { fromZone, world } from '../store.js'

const TXT = modes.fullstack.game

/* Janela de navegador (unidades locais; no placar, 1 unidade = 100px "de CSS") */
export const WIN_W = 3.6
/** Altura: cheia, ou compacta no celular (a faixa livre acima do título é baixa) */
export const WIN_H = { full: 2.5, compact: 1.95 }
const WIN_D = 0.08
const BAR = 0.3 // barra de título
const TOOL = 0.46 // barra de atalhos
const PAD = 0.1
const CW = WIN_W - PAD * 2
const CY = (TOOL - BAR) / 2 // centro da área de conteúdo no quadro da janela
const L0 = -CW / 2
const R0 = CW / 2
const Z0 = WIN_D / 2 + 0.006 // face da área de conteúdo

/* A div */
const DW = 0.8
const DH = 0.5
const DD = 0.14
const BODY_MARGIN = 0.08 // nasce no canto, como uma div no fluxo normal com a margin padrão do body

function frame(h) {
  const ch = h - BAR - TOOL
  return { h, ch, t0: ch / 2, b0: -ch / 2, start: [L0 + DW / 2 + BODY_MARGIN, ch / 2 - DH / 2 - BODY_MARGIN] }
}
const FRAMES = { full: frame(WIN_H.full), compact: frame(WIN_H.compact) }

/* Física: gelo (a distância percorrida é v0 / ICE, independente do fps), quique nas bordas, ímã no centro */
const ICE = 2.2
const BOUNCE = 0.55
const MAX_V = 9
const SNAP = { fine: 0.05, coarse: 0.085 }
const SNAP_V = 0.2 // o ímã só pega a div quase parada (sobram ~9px de deslize)
const PUSH_ERR = 0.3 // erro do empurrão: ±30% na distância, ±11° na direção
const PUSH_ANGLE = 0.2
const EPS = 0.004
const CLICK_PX = 6

/* Caos (começa 1,6s depois de cada acerto) */
const CHAOS_DELAY = 1.6
const CHAOS = ['devtools', 'scrollbar', 'sibling', 'client', 'float']
const DEV_W = 1.1
const SB_W = 0.15
const SIB_SPEED = 5
const SIB_PUSH = 2.6
const CLIENT_PUSH = 2.4
const STRETCH = 1.15 // s

const GUIDE = '#ff4da6'
const LIGHTS = ['#ff5f57', '#febc2e', '#28c840']
const CONFETTI = 56
const TOAST_LIFE = 1.9
const TEX_PX = 400 // resolução das texturas de texto (px de canvas por unidade)

/* ---------- texturas de texto (canvas 2D com as fontes do site) ---------- */
function canvasTex(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return { canvas, ctx: canvas.getContext('2d'), tex }
}

function roundRect(ctx, x, y, w, h, r, fill, stroke, lw = 0) {
  ctx.beginPath()
  ctx.roundRect(x + lw / 2, y + lw / 2, w - lw, h - lw, r)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = lw
    ctx.stroke()
  }
}

function roundedRectShape(w, h, r) {
  const x = -w / 2
  const y = -h / 2
  const shape = new THREE.Shape()
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

/** Aro chapado (anel de retângulo arredondado) para a borda que brilha: linhas de 1px serrilham. */
function rimGeometry(w, h, r, t) {
  const shape = roundedRectShape(w, h, r)
  shape.holes.push(roundedRectShape(w - t * 2, h - t * 2, r - t))
  return new THREE.ShapeGeometry(shape, 8)
}

const panelVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// Grade, linhas de centro tracejadas, alvo fantasma e guias inteligentes (rosa) quando alinhada
const panelFragment = /* glsl */ `
varying vec2 vUv;
uniform vec2 uSize;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform vec2 uAlign;
uniform float uGhost;
uniform vec3 uBg;
uniform vec3 uAccent;
uniform vec3 uGuide;
float line(float d, float w) { return 1.0 - smoothstep(0.0, w, abs(d)); }
void main() {
  vec2 p = (vUv - 0.5) * uSize;
  float px = max(fwidth(p.x), 1e-4);
  vec3 col = uBg;
  float alpha = 0.62;
  vec2 g = abs(fract(p / 0.2 + 0.5) - 0.5) * 0.2;
  float grid = max(line(g.x, px), line(g.y, px));
  col = mix(col, uAccent, grid * 0.07);
  vec2 d = p - uCenter;
  float vline = line(d.x, px) * step(0.5, fract(p.y / 0.08));
  float hline = line(d.y, px) * step(0.5, fract(p.x / 0.08));
  col = mix(col, uAccent, max(vline, hline) * 0.3);
  vec2 q = abs(d) - uHalf;
  float box = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float ghost = line(box, px * 1.4) * step(0.45, fract((p.x + p.y) / 0.07));
  col = mix(col, uAccent * 1.4, ghost * uGhost);
  float guide = max(line(d.x, px * 1.6) * uAlign.x, line(d.y, px * 1.6) * uAlign.y);
  col = mix(col, uGuide * 1.8, guide);
  alpha = max(alpha, guide);
  gl_FragColor = vec4(col, alpha);
}`

const haloFragment = /* glsl */ `
varying vec2 vUv;
uniform vec3 uColor;
uniform float uStrength;
void main() {
  vec2 p = (vUv - 0.5) * vec2(1.0, 0.78);
  float a = exp(-dot(p, p) * 11.0) * uStrength;
  gl_FragColor = vec4(uColor, a);
}`

const tmpV = new THREE.Vector3()
const planeN = new THREE.Vector3()
const planeP = new THREE.Vector3()
const plane = new THREE.Plane()
const dummy = new THREE.Object3D()
const tmpColor = new THREE.Color()

/**
 * Minigame do modo Fullstack: centralizar uma div. Uma janela de navegador de vidro com uma div no canto,
 * como no fluxo normal. Arrastar a div (com guias que grudam no centro), clicar na janela para empurrá-la
 * sobre "gelo" (imprecisa de propósito) ou usar atalhos de CSS. Centralizou: confete, e 1,6s depois o caos
 * desmancha o layout (DevTools, scrollbar, div irmã, cliente, float). O placar mede o tempo de cada conserto.
 */
export function CenterDiv({ c, reduced, active, yaw = 0, compact = false }) {
  const tilt = useRef()
  const content = useRef()
  const divRef = useRef()
  const divMat = useRef()
  const sibRef = useRef()
  const devRef = useRef()
  const sbRef = useRef()
  const toastRef = useRef()
  const confettiRef = useRef()
  const chipMats = useRef([])
  const chipRefs = useRef([])
  const getThree = useThree((s) => s.get)
  const F = FRAMES[compact ? 'compact' : 'full']
  const frameRef = useRef(F)
  frameRef.current = F

  /* ---------- texturas e materiais ---------- */
  const tex = useMemo(() => {
    const code = font('code')
    // rótulo da div (mesmo tamanho da face)
    const label = canvasTex(DW * TEX_PX, DH * TEX_PX)
    label.ctx.font = `600 64px ${code}`
    label.ctx.fillStyle = c['on-accent']
    label.ctx.textAlign = 'center'
    label.ctx.textBaseline = 'middle'
    label.ctx.fillText(TXT.div, label.canvas.width / 2, label.canvas.height / 2 + 2)
    // barra de endereço
    const url = canvasTex(640, 72)
    roundRect(url.ctx, 0, 0, 640, 72, 36, c.hairline)
    url.ctx.font = `500 30px ${code}`
    url.ctx.fillStyle = c.muted
    url.ctx.textAlign = 'center'
    url.ctx.textBaseline = 'middle'
    url.ctx.fillText(TXT.url, 320, 38)
    // painel do DevTools
    const dev = canvasTex(DEV_W * TEX_PX, F.ch * TEX_PX)
    const { ctx: d, canvas: dc } = dev
    d.fillStyle = c['surface-elevated']
    d.fillRect(0, 0, dc.width, dc.height)
    d.fillStyle = c['hairline-strong']
    d.fillRect(0, 0, 4, dc.height)
    d.fillRect(0, 62, dc.width, 3)
    d.font = `500 24px ${code}`
    d.textBaseline = 'middle'
    TXT.devtools.tabs.forEach((t, i) => {
      d.fillStyle = i === 0 ? c.ink : c.muted
      d.fillText(t, 24 + i * 150, 32)
    })
    d.fillStyle = c.accent
    d.fillRect(20, 58, 112, 4)
    d.font = `500 22px ${code}`
    TXT.devtools.lines.forEach((ln, i) => {
      const y = 104 + i * 44
      if (i === 2) {
        d.globalAlpha = 0.14
        d.fillStyle = c.accent
        d.fillRect(4, y - 20, dc.width, 40)
        d.globalAlpha = 1
      }
      d.fillStyle = i === 2 ? c['accent-2'] : c.accent
      d.fillText(ln, 20, y)
    })
    // toast (redesenhado a cada mensagem)
    const toast = canvasTex(1400, 120)
    // atalhos de CSS: pílulas do tamanho do texto, centradas na barra
    const H = 96
    const size = 44
    const padX = 34
    const probe = document.createElement('canvas').getContext('2d')
    probe.font = `500 ${size}px ${code}`
    const items = TXT.chips.map((chip) => {
      const w = Math.ceil(probe.measureText(chip.label).width + padX * 2)
      const t = canvasTex(w, H)
      roundRect(t.ctx, 0, 0, w, H, H / 2, c['surface-elevated'], c['hairline-strong'], 3)
      t.ctx.font = probe.font
      t.ctx.fillStyle = c.body
      t.ctx.textAlign = 'center'
      t.ctx.textBaseline = 'middle'
      t.ctx.fillText(chip.label, w / 2, H / 2 + 2)
      return { ...chip, tex: t.tex, w: w / TEX_PX, h: H / TEX_PX, x: 0 }
    })
    const gap = 0.1
    const total = items.reduce((a, it) => a + it.w, 0) + gap * (items.length - 1)
    const k = Math.min(1, (WIN_W - 0.3) / total)
    let x = (-total * k) / 2
    for (const it of items) {
      it.w *= k
      it.h *= k
      it.x = x + it.w / 2
      x += it.w + gap * k
    }
    return { label, url, dev, toast, chips: items }
  }, [c, F])
  useEffect(
    () => () => {
      for (const t of [tex.label, tex.url, tex.dev, tex.toast]) t.tex.dispose()
      tex.chips.forEach((ch) => ch.tex.dispose())
    },
    [tex],
  )

  const rim = useMemo(() => rimGeometry(WIN_W, F.h, 0.1, 0.018), [F])
  useEffect(() => () => rim.dispose(), [rim])
  const rimColor = useMemo(() => new THREE.Color(c.accent).multiplyScalar(1.5), [c])

  const panelUniforms = useMemo(
    () => ({
      uSize: { value: new THREE.Vector2(CW, F.ch) },
      uCenter: { value: new THREE.Vector2() },
      uHalf: { value: new THREE.Vector2(DW / 2, DH / 2) },
      uAlign: { value: new THREE.Vector2() },
      uGhost: { value: 0 },
      uBg: { value: new THREE.Color(c.canvas) },
      uAccent: { value: new THREE.Color(c.accent) },
      uGuide: { value: new THREE.Color(GUIDE) },
    }),
    [c, F],
  )
  const haloUniforms = useMemo(() => ({ uColor: { value: new THREE.Color(c.accent) }, uStrength: { value: 0.22 } }), [c])

  const confettiColors = useMemo(() => [c.accent, c['accent-2'], GUIDE, LIGHTS[1], c.ink].map((h) => new THREE.Color(h).multiplyScalar(1.25)), [c])
  useEffect(() => {
    const m = confettiRef.current
    if (!m) return
    for (let i = 0; i < CONFETTI; i++) {
      m.setColorAt(i, confettiColors[i % confettiColors.length])
      dummy.scale.setScalar(0)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceColor.needsUpdate = true
    m.instanceMatrix.needsUpdate = true
  }, [confettiColors])

  /* ---------- estado ---------- */
  const S = useRef(null)
  if (!S.current) {
    S.current = {
      p: { x: F.start[0], y: F.start[1] },
      v: { x: 0, y: 0 },
      phase: 'loose',
      userMoved: false,
      cheat: false,
      round: { from: null, valid: true },
      count: 0,
      best: 0,
      chaosAt: Infinity,
      lastChaos: null,
      lastWin: -1,
      devT: 0,
      dev: 0,
      sbT: 0,
      sb: 0,
      bounds: { cx: 0, cy: 0, minX: 0, maxX: 0, minY: 0, maxY: 0 },
      drag: null,
      press: null,
      chipPress: null,
      hoverChip: -1,
      hovDiv: false,
      sib: null,
      stretch: null,
      squash: 0,
      flash: 0,
      align: [0, 0],
      toastT: -10,
      confetti: Array.from({ length: CONFETTI }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3(), life: 0 })),
      confettiLive: false,
      glitchTimer: 0,
      frame: 0,
      now: 0,
    }
  }

  /* ---------- helpers ---------- */
  const client = (e) => [e.nativeEvent.clientX, e.nativeEvent.clientY]
  const finePointer = (e) => e.pointerType === 'mouse' || e.pointerType === 'pen'
  const dragged = (x0, y0, x, y) => (x - x0) ** 2 + (y - y0) ** 2 > CLICK_PX * CLICK_PX
  const playable = (e) => !reduced && active && world.view.hero > 0.15 && fromZone(e, 'hero')

  /** Raio do ponteiro → ponto no plano da div, no quadro da área de conteúdo. */
  const toContent = (ray) => {
    const g = content.current
    g.updateWorldMatrix(true, false)
    planeN.set(0, 0, 1).transformDirection(g.matrixWorld)
    planeP.set(0, 0, DD / 2).applyMatrix4(g.matrixWorld)
    plane.setFromNormalAndCoplanarPoint(planeN, planeP)
    if (!ray.intersectPlane(plane, tmpV)) return null
    return g.worldToLocal(tmpV)
  }

  const toScreen = (p) => {
    const { camera, size } = getThree()
    p.project(camera)
    return [Math.round(size.left + (p.x + 1) * 0.5 * size.width), Math.round(size.top + (1 - p.y) * 0.5 * size.height)]
  }

  const toast = (text, kind) => {
    const { ctx, canvas, tex: t } = tex.toast
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const dot = 16
    const padX = 34
    const extra = padX * 2 + dot + 18
    // encolhe a fonte se a mensagem não couber (textos longos, versão EN)
    ctx.font = `500 46px ${font('body')}`
    const fit = Math.min(1, (canvas.width - 8 - extra) / ctx.measureText(text).width)
    if (fit < 1) ctx.font = `500 ${Math.floor(46 * fit)}px ${font('body')}`
    const tone = kind === 'win' ? c['accent-2'] : kind === 'chaos' ? GUIDE : c.accent
    const h = 92
    const w = Math.min(canvas.width, ctx.measureText(text).width + extra)
    const x = (canvas.width - w) / 2
    roundRect(ctx, x, (canvas.height - h) / 2, w, h, h / 2, c['surface-elevated'], tone, 3)
    ctx.fillStyle = tone
    ctx.beginPath()
    ctx.arc(x + padX + dot / 2, canvas.height / 2, dot / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = c.ink
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x + padX + dot + 18, canvas.height / 2 + 2)
    t.needsUpdate = true
    S.current.toastT = S.current.now
  }

  // pisca o glitch da página inteira (mesmo efeito do bug do sistema)
  const glitch = () => {
    const s = S.current
    const html = document.documentElement
    html.classList.add('sys-glitch')
    clearTimeout(s.glitchTimer)
    s.glitchTimer = setTimeout(() => html.classList.remove('sys-glitch'), 380)
  }

  const burst = (x, y) => {
    const s = S.current
    s.confetti.forEach((q) => {
      const a = Math.random() * Math.PI * 2
      const sp = 1.6 + Math.random() * 1.8
      q.p.set(x + (Math.random() - 0.5) * DW, y + (Math.random() - 0.5) * DH, DD)
      q.v.set(Math.cos(a) * sp, Math.sin(a) * sp + 1.3, 0.4 + Math.random() * 1.2)
      q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
      q.w.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16)
      q.life = 1.1 + Math.random() * 0.5
    })
    s.confettiLive = true
  }

  /* ---------- regras ---------- */
  const win = () => {
    const s = S.current
    const { cx, cy } = s.bounds
    s.phase = 'centered'
    s.p.x = cx
    s.p.y = cy
    s.v.x = s.v.y = 0
    if (s.round.valid) {
      s.count += 1
      if (!s.cheat && s.round.from !== null) {
        const t = s.now - s.round.from
        s.best = s.best ? Math.min(s.best, t) : t
      }
    }
    let i = Math.floor(Math.random() * TXT.centered.length)
    if (i === s.lastWin) i = (i + 1) % TXT.centered.length
    s.lastWin = i
    toast(s.cheat ? TXT.cheated : TXT.centered[i], 'win')
    s.cheat = false
    s.chaosAt = s.now + CHAOS_DELAY
    s.flash = 1
    burst(cx, cy)
    world.fx.pulse = Math.max(world.fx.pulse, 0.6)
  }

  const chaos = (name) => {
    const s = S.current
    const pool = CHAOS.filter((n) => n !== s.lastChaos)
    const kind = name ?? pool[Math.floor(Math.random() * pool.length)]
    const b = s.bounds
    const T = TXT.chaos
    s.lastChaos = kind
    s.phase = 'loose'
    s.userMoved = false
    s.round = { from: s.now, valid: true }
    s.chaosAt = Infinity
    if (kind === 'devtools') {
      s.devT = s.devT ? 0 : 1
      toast(s.devT ? T.devtoolsOn : T.devtoolsOff, 'chaos')
    } else if (kind === 'scrollbar') {
      s.sbT = s.sbT ? 0 : 1
      toast(s.sbT ? T.scrollbarOn : T.scrollbarOff, 'chaos')
    } else if (kind === 'sibling') {
      const fromLeft = s.p.x - b.minX >= b.maxX - s.p.x
      s.sib = { x: fromLeft ? b.minX : b.maxX, y: s.p.y, dir: fromLeft ? 1 : -1, t: 0, hitT: -1 }
      toast(T.sibling, 'chaos')
    } else if (kind === 'client') {
      s.v.x = -CLIENT_PUSH
      s.v.y = (Math.random() - 0.5) * 0.6
      toast(T.client, 'chaos')
    } else {
      s.v.x = ICE * (b.minX - s.p.x)
      s.v.y = ICE * (b.maxY - s.p.y)
      toast(T.float, 'chaos')
    }
    world.fx.kick = Math.max(world.fx.kick, 0.25)
    glitch()
  }

  const shortcut = (id) => {
    const s = S.current
    const { cx, cy } = s.bounds
    s.drag = null
    if (id === 'flex') {
      // display: flex sem align-items: o filho estica na altura toda e nada se centraliza
      s.v.x = s.v.y = 0
      s.stretch = { t: 0 }
      toast(TXT.flex, 'info')
      return
    }
    s.stretch = null
    s.userMoved = true
    if (id === 'half') {
      // left: 50% sem translate: a borda esquerda vai para o centro
      s.v.x = ICE * (cx + DW / 2 - s.p.x)
      s.v.y = 0
      toast(TXT.half, 'info')
    } else {
      s.v.x = ICE * (cx - s.p.x)
      s.v.y = ICE * (cy - s.p.y)
      s.cheat = true
    }
  }

  /** Clique na janela: empurra a div em direção ao ponto, no gelo, com erro (golfe: chega perto em 2-3 tacadas). */
  const push = (pt) => {
    const s = S.current
    const dx = pt.x - s.p.x
    const dy = pt.y - s.p.y
    const f = 1 + (Math.random() * 2 - 1) * PUSH_ERR
    const a = (Math.random() * 2 - 1) * PUSH_ANGLE
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    s.v.x = THREE.MathUtils.clamp(ICE * f * (dx * cos - dy * sin), -MAX_V, MAX_V)
    s.v.y = THREE.MathUtils.clamp(ICE * f * (dx * sin + dy * cos), -MAX_V, MAX_V)
    s.stretch = null
    s.userMoved = true
    s.squash = 0.6
  }

  /* ---------- entrada ---------- */
  const onPanelDown = (e) => {
    if (!playable(e)) return
    e.stopPropagation()
    const [x, y] = client(e)
    S.current.press = { x, y, point: content.current.worldToLocal(tmpV.copy(e.point)).clone(), coarse: !finePointer(e) }
    e.target.setPointerCapture?.(e.pointerId)
  }
  const onPanelMove = (e) => {
    const p = S.current.press
    if (!p) return
    const [x, y] = client(e)
    if (dragged(p.x, p.y, x, y)) p.moved = true
  }
  const onPanelUp = (e, cancelled) => {
    const p = S.current.press
    if (!p) return
    S.current.press = null
    e.target?.releasePointerCapture?.(e.pointerId)
    if (cancelled || p.moved) return
    S.current.coarse = p.coarse
    push(p.point)
  }

  const onDivDown = (e) => {
    if (!playable(e)) return
    e.stopPropagation()
    const s = S.current
    const pt = toContent(e.ray)
    if (!pt) return
    const [x, y] = client(e)
    s.coarse = !finePointer(e)
    s.drag = { ox: pt.x - s.p.x, oy: pt.y - s.p.y, tx: s.p.x, ty: s.p.y, px: s.p.x, py: s.p.y, vx: 0, vy: 0, x0: x, y0: y, moved: false, at: { x: pt.x, y: pt.y } }
    s.stretch = null
    s.v.x = s.v.y = 0
    e.target.setPointerCapture?.(e.pointerId)
  }
  const onDivMove = (e) => {
    const d = S.current.drag
    if (!d) return
    e.stopPropagation()
    const [x, y] = client(e)
    if (!d.moved && dragged(d.x0, d.y0, x, y)) d.moved = true
    if (!d.moved) return
    const pt = toContent(e.ray)
    if (!pt) return
    d.tx = pt.x - d.ox
    d.ty = pt.y - d.oy
  }
  const onDivUp = (e, cancelled) => {
    const s = S.current
    const d = s.drag
    if (!d) return
    s.drag = null
    e.target?.releasePointerCapture?.(e.pointerId)
    if (d.moved) {
      s.v.x = THREE.MathUtils.clamp(d.vx, -MAX_V, MAX_V)
      s.v.y = THREE.MathUtils.clamp(d.vy, -MAX_V, MAX_V)
      s.userMoved = true
    } else if (!cancelled) {
      // clique sem arrastar também empurra: perto do centro a própria div cobre o alvo
      push(d.at)
      s.squash = 1
    }
  }

  const onChipDown = (e, i) => {
    if (!playable(e)) return
    e.stopPropagation()
    const [x, y] = client(e)
    S.current.chipPress = { i, x, y }
  }
  const onChipUp = (e, i) => {
    const p = S.current.chipPress
    S.current.chipPress = null
    if (!p || p.i !== i || !playable(e)) return
    const [x, y] = client(e)
    if (dragged(p.x, p.y, x, y)) return
    e.stopPropagation()
    S.current.coarse = !finePointer(e)
    if (chipRefs.current[i]) chipRefs.current[i].userData.press = 1
    shortcut(tex.chips[i].id)
  }

  /* ---------- touch: a página não rola enquanto o dedo arrasta a div ---------- */
  useEffect(() => {
    const block = (e) => S.current.drag && e.cancelable && e.preventDefault()
    window.addEventListener('touchmove', block, { passive: false })
    return () => window.removeEventListener('touchmove', block)
  }, [])

  /* ---------- entrar no modo (botão ou #fullstack): página recarregada, layout limpo; placar fica ---------- */
  useEffect(() => {
    const s = S.current
    Object.assign(s, { drag: null, press: null, chipPress: null, sib: null, stretch: null, hovDiv: false, hoverChip: -1 })
    if (!active) return
    Object.assign(s, { phase: 'loose', userMoved: false, cheat: false, devT: 0, dev: 0, sbT: 0, sb: 0, chaosAt: Infinity })
    s.round = { from: null, valid: true }
    s.p.x = frameRef.current.start[0]
    s.p.y = frameRef.current.start[1]
    s.v.x = s.v.y = 0
  }, [active])
  useEffect(
    () => () => {
      clearTimeout(S.current.glitchTimer)
      document.documentElement.classList.remove('sys-glitch')
    },
    [],
  )

  // Gancho de teste (só em dev)
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__div = {
      state: () => {
        const s = S.current
        return {
          x: +s.p.x.toFixed(3),
          y: +s.p.y.toFixed(3),
          dx: Math.round((s.p.x - s.bounds.cx) * 100),
          dy: Math.round((s.p.y - s.bounds.cy) * 100),
          phase: s.phase,
          count: s.count,
          best: +s.best.toFixed(2),
          devtools: s.devT,
          scrollbar: s.sbT,
          sibling: Boolean(s.sib),
          dragging: Boolean(s.drag),
          moving: Math.hypot(s.v.x, s.v.y) > 0.01,
        }
      },
      screen: () => {
        const g = content.current
        const s = S.current
        const at = (x, y, z) => toScreen(g.localToWorld(tmpV.set(x, y, z)))
        return {
          div: at(s.p.x, s.p.y, DD),
          center: at(s.bounds.cx, s.bounds.cy, DD),
          chips: chipRefs.current.map((m) => toScreen(m.getWorldPosition(tmpV))),
        }
      },
      at: (x, y) => toScreen(content.current.localToWorld(tmpV.set(x, y, DD))),
      box: () => {
        const h = frameRef.current.h / 2
        const pts = [[-WIN_W / 2, h], [WIN_W / 2, h], [-WIN_W / 2, -h], [WIN_W / 2, -h]].map(([x, y]) => toScreen(tilt.current.localToWorld(tmpV.set(x, y, 0))))
        const xs = pts.map((p) => p[0])
        const ys = pts.map((p) => p[1])
        return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }
      },
      chaos: (n) => chaos(n),
      place: (x, y) => {
        const s = S.current
        s.p.x = x
        s.p.y = y
        s.v.x = s.v.y = 0
      },
    }
    return () => delete window.__div
  })

  /* ---------- loop ---------- */
  useFrame(({ clock }, rawDt) => {
    const s = S.current
    const dt = Math.min(rawDt, 0.05)
    const now = clock.elapsedTime
    s.now = now
    const live = active && !reduced && world.view.hero > 0.15
    if (live && s.round.from === null) s.round.from = now

    // inclinação pelo ponteiro (congelada enquanto arrasta, para a janela não fugir da mão)
    const g = tilt.current
    if (g) {
      if (reduced) g.rotation.set(0, yaw, 0)
      else {
        if (!s.drag) {
          const k = Math.min(1, dt * 3)
          g.rotation.x += (-world.pointer.y * 0.1 - g.rotation.x) * k
          g.rotation.y += (yaw + world.pointer.x * 0.14 - g.rotation.y) * k
        }
        g.position.y = Math.sin(now * 0.8) * 0.035
      }
    }

    // layout: DevTools e scrollbar encolhem a área útil e movem o centro
    const ease = 1 - Math.exp(-dt * 9)
    s.dev += (s.devT - s.dev) * ease
    s.sb += (s.sbT - s.sb) * ease
    const right = R0 - DEV_W * s.dev - SB_W * s.sb
    const b = s.bounds
    b.cx = (L0 + right) / 2
    b.cy = 0
    b.minX = L0 + DW / 2
    b.maxX = right - DW / 2
    b.minY = F.b0 + DH / 2
    b.maxY = F.t0 - DH / 2
    const P = s.p
    const V = s.v
    const snap = s.coarse ? SNAP.coarse : SNAP.fine

    if (s.drag) {
      const d = s.drag
      const tx = THREE.MathUtils.clamp(d.tx, b.minX, b.maxX)
      const ty = THREE.MathUtils.clamp(d.ty, b.minY, b.maxY)
      const k = 1 - Math.exp(-dt * 18)
      d.vx += ((tx - d.px) / Math.max(dt, 1e-3) - d.vx) * k
      d.vy += ((ty - d.py) / Math.max(dt, 1e-3) - d.vy) * k
      d.px = tx
      d.py = ty
      // guia inteligente: perto do centro, gruda no eixo
      P.x = Math.abs(tx - b.cx) < snap ? b.cx : tx
      P.y = Math.abs(ty - b.cy) < snap ? b.cy : ty
    } else if (!s.stretch) {
      const f = Math.exp(-ICE * dt)
      P.x += (V.x * (1 - f)) / ICE
      P.y += (V.y * (1 - f)) / ICE
      V.x *= f
      V.y *= f
      const wall = (axis, lo, hi) => {
        if (P[axis] < lo) {
          P[axis] = lo
          if (V[axis] < 0) {
            s.squash = Math.max(s.squash, Math.min(1, -V[axis] * 0.3))
            V[axis] = -V[axis] * BOUNCE
          }
        } else if (P[axis] > hi) {
          P[axis] = hi
          if (V[axis] > 0) {
            s.squash = Math.max(s.squash, Math.min(1, V[axis] * 0.3))
            V[axis] = -V[axis] * BOUNCE
          }
        }
      }
      wall('x', b.minX, b.maxX)
      wall('y', b.minY, b.maxY)
      // ímã: só depois de o jogador mexer (o caos sozinho nunca se conserta)
      if (s.userMoved) {
        for (const [axis, c0] of [['x', b.cx], ['y', b.cy]]) {
          const off = P[axis] - c0
          if (Math.abs(off) < snap && Math.abs(V[axis]) < SNAP_V) {
            V[axis] = 0
            P[axis] = Math.abs(off) < 1e-4 ? c0 : c0 + off * Math.exp(-16 * dt)
          }
        }
      }
      if (Math.abs(V.x) < 1e-3) V.x = 0
      if (Math.abs(V.y) < 1e-3) V.y = 0
    }

    // div irmã: entra pela borda, empurra a nossa e some
    const sib = s.sib
    if (sib) {
      sib.t += dt
      if (sib.hitT < 0) {
        if (sib.t > 0.3) sib.x += sib.dir * SIB_SPEED * dt
        if (sib.dir * (P.x - sib.x) <= DW) {
          sib.x = P.x - sib.dir * DW
          sib.hitT = sib.t
          V.x = sib.dir * SIB_PUSH
          s.squash = 1
        }
      } else sib.x -= sib.dir * 0.5 * dt
      if (sib.hitT > 0 && sib.t - sib.hitT > 0.75) s.sib = null
    }

    // display: flex: estica e volta
    let stretchK = 0
    if (s.stretch) {
      const t = (s.stretch.t += dt)
      stretchK = t < 0.16 ? t / 0.16 : t < 0.8 ? 1 : clamp01(1 - (t - 0.8) / (STRETCH - 0.8))
      stretchK = stretchK * stretchK * (3 - 2 * stretchK)
      if (t >= STRETCH) s.stretch = null
    }

    // acerto e caos
    const dx = P.x - b.cx
    const dy = P.y - b.cy
    const still = Math.hypot(V.x, V.y) < 0.05
    if (s.phase === 'loose') {
      if (live && s.userMoved && !s.drag && !s.stretch && still && Math.abs(dx) < EPS && Math.abs(dy) < EPS) win()
    } else if (Math.abs(dx) > EPS * 2 || Math.abs(dy) > EPS * 2) {
      // tirou do centro por conta própria: a rodada não conta
      s.phase = 'loose'
      s.round = { from: now, valid: false }
      s.chaosAt = Infinity
    } else if (live && !s.drag && !s.stretch && now > s.chaosAt) chaos()

    /* ---------- visual ---------- */
    s.squash *= Math.exp(-dt * 7)
    s.flash *= Math.exp(-dt * 2.5)
    const dg = divRef.current
    if (dg) {
      const wob = Math.sin(now * 32) * s.squash * 0.12
      const sy = 1 - wob + ((F.ch * 0.96) / DH - 1) * stretchK
      dg.position.set(P.x, P.y + (b.cy - P.y) * stretchK, DD / 2 + 0.01)
      dg.scale.set(1 + wob, sy, 1)
      const lit = s.hovDiv || s.drag ? 0.3 : 0
      if (divMat.current) divMat.current.emissiveIntensity = 0.3 + lit + s.flash * 2.4 + (s.phase === 'centered' ? 0.25 : 0)
    }
    const sb = sibRef.current
    if (sb) {
      sb.visible = Boolean(s.sib)
      if (s.sib) {
        const k = Math.min(1, s.sib.t / 0.2)
        const out = s.sib.hitT > 0 ? clamp01(1 - (s.sib.t - s.sib.hitT - 0.45) / 0.3) : 1
        sb.position.set(s.sib.x, s.sib.y, DD / 2 + 0.01)
        sb.scale.setScalar(Math.max(0.001, easeOutBack(k) * out))
      }
    }
    if (devRef.current) {
      devRef.current.visible = s.dev > 0.002
      devRef.current.scale.x = Math.max(0.001, s.dev)
      devRef.current.position.x = R0 - (DEV_W * s.dev) / 2
    }
    if (sbRef.current) {
      sbRef.current.visible = s.sb > 0.002
      sbRef.current.scale.x = Math.max(0.001, s.sb)
      sbRef.current.position.x = R0 - DEV_W * s.dev - (SB_W * s.sb) / 2
    }

    // guias e alvo fantasma
    const u = panelUniforms
    u.uCenter.value.set(b.cx, b.cy)
    const ak = 1 - Math.exp(-dt * 14)
    s.align[0] += ((Math.abs(dx) < 0.002 && !stretchK ? 1 : 0) - s.align[0]) * ak
    s.align[1] += ((Math.abs(dy) < 0.002 && !stretchK ? 1 : 0) - s.align[1]) * ak
    u.uAlign.value.set(s.align[0], s.align[1])
    const ghost = s.phase === 'loose' ? 0.5 + 0.3 * Math.sin(now * 3) : 0
    u.uGhost.value += (ghost - u.uGhost.value) * ak
    haloUniforms.uStrength.value = 0.2 + s.flash * 0.25 + world.fx.pulse * 0.06

    // atalhos: hover acende, clique pulsa
    tex.chips.forEach((_, i) => {
      const m = chipRefs.current[i]
      const mat = chipMats.current[i]
      if (!m || !mat) return
      const on = s.hoverChip === i ? 1 : 0
      m.userData.h = (m.userData.h ?? 0) + (on - (m.userData.h ?? 0)) * (1 - Math.exp(-dt * 12))
      m.userData.press = (m.userData.press ?? 0) * Math.exp(-dt * 8)
      m.scale.setScalar(1 + m.userData.h * 0.05 + m.userData.press * 0.12)
      mat.color.setRGB(1, 1, 1).lerp(tmpColor.set(c.accent), m.userData.h * 0.85)
    })

    // toast
    const tm = toastRef.current
    if (tm) {
      const age = now - s.toastT
      tm.visible = age < TOAST_LIFE
      if (tm.visible) {
        tm.position.set(b.cx, F.t0 - 0.24, 0.32)
        tm.scale.setScalar(Math.max(0.001, easeOutBack(clamp01(age / 0.22))))
        tm.material.opacity = clamp01((TOAST_LIFE - age) / 0.3)
      }
    }

    // confete
    const cm = confettiRef.current
    if (cm && s.confettiLive) {
      let alive = false
      s.confetti.forEach((q, i) => {
        if (q.life > 0) {
          q.life -= dt
          q.v.y -= 5.5 * dt
          q.v.multiplyScalar(Math.exp(-1.1 * dt))
          q.p.addScaledVector(q.v, dt)
          q.r.addScaledVector(q.w, dt)
          alive = true
        }
        dummy.position.copy(q.p)
        dummy.rotation.set(q.r.x, q.r.y, q.r.z)
        dummy.scale.setScalar(q.life > 0 ? Math.min(1, q.life / 0.3) : 0)
        dummy.updateMatrix()
        cm.setMatrixAt(i, dummy.matrix)
      })
      cm.instanceMatrix.needsUpdate = true
      s.confettiLive = alive
    }

    // HUD (só com este modo ativo, senão sobrescreve o placar do outro minigame)
    s.frame += 1
    const hud = world.telemetry
    if (active && s.frame % 10 === 0) {
      if (hud.s1) hud.s1.textContent = `${Math.round(Math.hypot(dx, dy) * 100)}px`
      if (hud.s2) hud.s2.textContent = String(s.count).padStart(2, '0')
      if (hud.s3) hud.s3.textContent = s.best ? `${decimal1.format(s.best)}s` : '—'
    }
  })

  const hidden = { transparent: true, opacity: 0, depthWrite: false, colorWrite: false }
  const top = F.h / 2 - BAR / 2
  const toolY = -F.h / 2 + TOOL / 2

  return (
    <group ref={tilt} rotation={[0, yaw, 0]}>
      {/* brilho atrás da janela */}
      <mesh position={[0, 0, -0.3]} raycast={() => null}>
        <planeGeometry args={[WIN_W * 1.9, F.h * 2]} />
        <shaderMaterial vertexShader={panelVertex} fragmentShader={haloFragment} uniforms={haloUniforms} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* corpo de vidro */}
      <RoundedBox args={[WIN_W, F.h, WIN_D]} radius={0.1} smoothness={4} raycast={() => null}>
        <meshPhysicalMaterial color={c.surface} transparent opacity={0.72} roughness={0.28} metalness={0.15} clearcoat={1} clearcoatRoughness={0.15} />
      </RoundedBox>
      <mesh geometry={rim} position={[0, 0, WIN_D / 2 + 0.003]} raycast={() => null}>
        <meshBasicMaterial color={rimColor} transparent opacity={0.9} toneMapped={false} />
      </mesh>

      {/* barra de título */}
      {LIGHTS.map((col, i) => (
        <mesh key={col} position={[-WIN_W / 2 + 0.2 + i * 0.13, top, Z0]} raycast={() => null}>
          <circleGeometry args={[0.042, 20]} />
          <meshBasicMaterial color={col} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0.1, top, Z0]} raycast={() => null}>
        <planeGeometry args={[640 / TEX_PX, 72 / TEX_PX]} />
        <meshBasicMaterial map={tex.url.tex} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, F.h / 2 - BAR, Z0]} raycast={() => null}>
        <planeGeometry args={[WIN_W - 0.02, 0.008]} />
        <meshBasicMaterial color={c['hairline-strong']} toneMapped={false} />
      </mesh>
      <mesh position={[0, -F.h / 2 + TOOL, Z0]} raycast={() => null}>
        <planeGeometry args={[WIN_W - 0.02, 0.008]} />
        <meshBasicMaterial color={c['hairline-strong']} toneMapped={false} />
      </mesh>

      {/* área de conteúdo: origem no centro da página */}
      <group ref={content} position={[0, CY, Z0]}>
        <mesh onPointerDown={onPanelDown} onPointerMove={onPanelMove} onPointerUp={(e) => onPanelUp(e, false)} onPointerCancel={(e) => onPanelUp(e, true)}>
          <planeGeometry args={[CW, F.ch]} />
          <shaderMaterial vertexShader={panelVertex} fragmentShader={panelFragment} uniforms={panelUniforms} transparent depthWrite={false} />
        </mesh>
        <mesh ref={devRef} position={[R0, 0, 0.004]} visible={false} raycast={() => null}>
          <planeGeometry args={[DEV_W, F.ch]} />
          <meshBasicMaterial map={tex.dev.tex} toneMapped={false} />
        </mesh>
        <group ref={sbRef} position={[R0, 0, 0.004]} visible={false}>
          <mesh raycast={() => null}>
            <planeGeometry args={[SB_W, F.ch]} />
            <meshBasicMaterial color={c.surface} toneMapped={false} />
          </mesh>
          <mesh position={[0, F.ch * 0.22, 0.002]} raycast={() => null}>
            <planeGeometry args={[SB_W * 0.5, F.ch * 0.42]} />
            <meshBasicMaterial color={c['hairline-strong']} toneMapped={false} />
          </mesh>
        </group>

        <group ref={divRef} position={[F.start[0], F.start[1], DD / 2 + 0.01]}>
          <RoundedBox
            args={[DW, DH, DD]}
            radius={0.05}
            smoothness={4}
            onPointerDown={onDivDown}
            onPointerMove={onDivMove}
            onPointerUp={(e) => onDivUp(e, false)}
            onPointerCancel={(e) => onDivUp(e, true)}
            onPointerOver={(e) => (S.current.hovDiv = playable(e))}
            onPointerOut={() => (S.current.hovDiv = false)}
          >
            <meshStandardMaterial ref={divMat} color={c['accent-2']} emissive={c['accent-2']} emissiveIntensity={0.3} roughness={0.35} metalness={0.05} toneMapped={false} />
          </RoundedBox>
          <mesh position={[0, 0, DD / 2 + 0.002]} raycast={() => null}>
            <planeGeometry args={[DW, DH]} />
            <meshBasicMaterial map={tex.label.tex} transparent toneMapped={false} />
          </mesh>
        </group>

        <group ref={sibRef} visible={false}>
          <RoundedBox args={[DW, DH, DD]} radius={0.05} smoothness={4} raycast={() => null}>
            <meshStandardMaterial color={c.accent} emissive={c.accent} emissiveIntensity={0.35} roughness={0.35} toneMapped={false} />
          </RoundedBox>
          <mesh position={[0, 0, DD / 2 + 0.002]} raycast={() => null}>
            <planeGeometry args={[DW, DH]} />
            <meshBasicMaterial map={tex.label.tex} transparent toneMapped={false} />
          </mesh>
        </group>

        <instancedMesh ref={confettiRef} args={[undefined, undefined, CONFETTI]} frustumCulled={false} raycast={() => null}>
          <planeGeometry args={[0.07, 0.035]} />
          <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
        </instancedMesh>

        <mesh ref={toastRef} visible={false} renderOrder={2} raycast={() => null}>
          <planeGeometry args={[1400 / TEX_PX, 120 / TEX_PX]} />
          <meshBasicMaterial map={tex.toast.tex} transparent depthTest={false} toneMapped={false} />
        </mesh>
      </group>

      {/* atalhos de CSS; a área de toque cobre a altura toda da barra */}
      {tex.chips.map((chip, i) => (
        <group key={chip.id} position={[chip.x, toolY, Z0]}>
          <mesh ref={(el) => (chipRefs.current[i] = el)} raycast={() => null}>
            <planeGeometry args={[chip.w, chip.h]} />
            <meshBasicMaterial ref={(el) => (chipMats.current[i] = el)} map={chip.tex} transparent toneMapped={false} />
          </mesh>
          <mesh
            position={[0, 0, 0.01]}
            onPointerDown={(e) => onChipDown(e, i)}
            onPointerUp={(e) => onChipUp(e, i)}
            onPointerOver={(e) => {
              if (playable(e)) S.current.hoverChip = i
            }}
            onPointerOut={() => {
              if (S.current.hoverChip === i) S.current.hoverChip = -1
            }}
          >
            <planeGeometry args={[chip.w + 0.08, TOOL]} />
            <meshBasicMaterial {...hidden} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

