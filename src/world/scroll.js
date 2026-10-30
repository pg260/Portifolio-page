import Lenis from 'lenis'
import { STATIONS, world } from './store.js'

const NAV_OFFSET = 88 // mesma altura do scroll-margin-top das seções (index.css)

/** Mede em que scrollY a câmera chega em cada estação: quando o topo da seção encosta sob a nav. */
export function measureAnchors() {
  const limit = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
  world.scroll.limit = limit
  world.anchors = STATIONS.map((id, i) => {
    if (i === 0) return 0
    const el = document.getElementById(id)
    if (!el) return limit
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET
    return Math.min(limit, Math.max(0, top))
  })
  // âncoras sempre crescentes (seções finais podem cair no limite do scroll)
  for (let i = 1; i < world.anchors.length; i++) world.anchors[i] = Math.max(world.anchors[i], world.anchors[i - 1] + 1)
  measureZones()
}

const TEXT = 'main :is(h1, h2, h3, h4, p, li, a, button, dl, [role=group], [role=tablist]), #inicio span, footer :is(p, a, button)'

/**
 * Zonas de texto por estação (world.zones): enquanto a câmera fica parada numa estação a página ainda rola
 * (os primeiros 12% da trilha), então cada elemento ocupa a faixa entre onde está na chegada e onde está
 * quando o voo começa. A nav fixa entra em todas.
 */
function measureZones() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const anchors = world.anchors
  const nav = document.querySelector('header')?.getBoundingClientRect()
  const els = [...document.querySelectorAll(TEXT)]
    .map((el) => {
      const r = el.getBoundingClientRect()
      return { x0: r.left, x1: r.right, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, w: r.width, h: r.height }
    })
    .filter((r) => r.w > 0 && r.h > 0)
  const ndc = (x0, y0, x1, y1) => [(x0 / vw) * 2 - 1, 1 - (y1 / vh) * 2, (x1 / vw) * 2 - 1, 1 - (y0 / vh) * 2]
  world.zones.list = anchors.map((a, i) => {
    const b = anchors[i + 1]
    // mesma conta do stationCoord: o voo ocupa a última tela antes da próxima âncora
    const dwell = b === undefined ? 0 : Math.max(0, b - Math.min(vh * 0.9, (b - a) * 0.75) - a)
    const list = nav ? [ndc(0, 0, vw, nav.bottom)] : []
    for (const r of els) {
      const y0 = Math.max(0, r.top - a - dwell)
      const y1 = Math.min(vh, r.bottom - a)
      if (y1 > y0) list.push(ndc(r.x0, y0, r.x1, y1))
    }
    return list
  })
  world.zones.version++
}

const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10)
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const DWELL = 0.12 // quanto da trilha a câmera avança "parada" na estação enquanto se lê a seção

/**
 * Converte o scroll em coordenada de estação (0 = hero, 1 = trabalhos...). Em cada seção a câmera
 * fica quase parada (deriva leve) e voa para a próxima estação na última tela de scroll antes dela.
 */
export function stationCoord(y, anchors = world.anchors, vh = window.innerHeight) {
  const n = anchors.length
  if (n < 2 || y <= 0) return 0
  for (let i = 0; i < n - 1; i++) {
    const a = anchors[i]
    const b = anchors[i + 1]
    if (y < b) {
      const fly = Math.min(vh * 0.9, (b - a) * 0.75)
      const start = b - fly
      if (y < start) return i + DWELL * clamp01((y - a) / Math.max(1, start - a))
      return i + DWELL + (1 - DWELL) * smootherstep(clamp01((y - start) / fly))
    }
  }
  return n - 1
}

/** Leva a página até um elemento (com Lenis quando ativo) e põe o foco nele, como um link âncora faria. */
export function scrollToElement(el) {
  const focus = () => {
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
  }
  // o Lenis já desconta o scroll-margin-top do alvo (a altura do nav)
  if (world.lenis) world.lenis.scrollTo(el, { duration: 1.6, onComplete: focus })
  else {
    // sem Lenis = reduced motion: salto direto
    el.scrollIntoView({ behavior: 'instant' })
    focus()
  }
}

/**
 * Liga o scroll do mundo: Lenis (scroll suave) quando há movimento, scroll nativo com reduced motion.
 * Mantém world.scroll e as âncoras atualizados e intercepta links âncora internos.
 * Retorna a função de limpeza.
 */
export function startScroll({ smooth }) {
  let lenis = null
  const onNative = () => {
    const y = window.scrollY
    world.scroll.velocity = y - world.scroll.y
    world.scroll.y = y
  }
  if (smooth) {
    lenis = new Lenis({ autoRaf: true, lerp: 0.085, smoothWheel: true, syncTouch: false })
    lenis.on('scroll', (l) => {
      world.scroll.y = l.scroll
      world.scroll.velocity = l.velocity
    })
    world.lenis = lenis
  } else {
    window.addEventListener('scroll', onNative, { passive: true })
  }
  world.scroll.y = window.scrollY

  // links âncora (#trabalhos, #sobre...) passam pelo Lenis; hashes de modo (#jogos) ficam com o ModeContext
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const a = e.target.closest?.('a[href^="#"]')
    if (!a) return
    const id = a.getAttribute('href').slice(1)
    const el = id && document.getElementById(id)
    if (!el) return
    e.preventDefault()
    scrollToElement(el)
  }
  document.addEventListener('click', onClick)

  // âncoras: no resize, quando o conteúdo muda de altura (troca de modo, imagens) e após as fontes
  let raf = 0
  const remeasure = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(measureAnchors)
  }
  const ro = new ResizeObserver(remeasure)
  ro.observe(document.body)
  window.addEventListener('resize', remeasure)
  document.fonts?.ready.then(remeasure)
  remeasure()

  return () => {
    lenis?.destroy()
    world.lenis = null
    window.removeEventListener('scroll', onNative)
    document.removeEventListener('click', onClick)
    window.removeEventListener('resize', remeasure)
    ro.disconnect()
    cancelAnimationFrame(raf)
  }
}
