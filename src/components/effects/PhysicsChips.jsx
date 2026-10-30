import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import { useInView, useReducedMotion } from 'motion/react'
import { Icon } from '../ui/Icon.jsx'

const { Engine, Runner, Bodies, Body, Composite, Mouse, MouseConstraint, Events, Query, Resolver } = Matter

// Abaixo deste limite o matter trata o choque como contato em repouso e anula o quique. Com gravidade isso
// assenta a pilha; em gravidade zero não há repouso e os chips grudariam nas bordas, então o limite cai.
const RESTING = Resolver._restingThresh
const RESTING_FLOAT = 0.05

const FLOAT = 0.45 // velocidade alvo em gravidade zero (px por passo de 16,7ms); com o atrito do ar o cruzeiro fica em ~20px/s
const STEER = 0.012 // fração por passo com que velocidade e giro voltam ao cruzeiro depois de um arremesso
const TILT = 0.01 // mola fraca que traz o chip de volta a um balanço perto da horizontal (rótulo legível)

/**
 * Chips de stack como corpos rígidos. Com gravidade (`float` falso) caem no contêiner e se empilham;
 * em gravidade zero (`float`) flutuam pela caixa, quicam nas bordas e uns nos outros. Nos dois casos
 * podem ser arrastados e atirados (ponteiro fino) e sacudidos pelo botão (toque e teclado), e o botão
 * fica translúcido quando há um chip atrás dele. Trocar de modo traz o conjunto novo.
 * Com reduced motion vira uma lista comum.
 */
export function PhysicsChips({ items, label, float = false }) {
  const box = useRef(null)
  const button = useRef(null)
  const chipEls = useRef([])
  const world = useRef(null)
  const inView = useInView(box, { amount: 0.3 })
  const reduced = useReducedMotion()
  const [shakes, setShakes] = useState(0)

  useEffect(() => {
    if (reduced || !box.current) return
    const el = box.current
    const btn = button.current
    const W = el.clientWidth
    const H = el.clientHeight
    const T = 80
    Resolver._restingThresh = float ? RESTING_FLOAT : RESTING
    const engine = Engine.create({ gravity: { x: 0, y: float ? 0 : 1.2 } })
    let addCeiling = null
    if (float) {
      const wall = { isStatic: true, friction: 0, restitution: 0.9 }
      Composite.add(engine.world, [
        Bodies.rectangle(W / 2, H + T / 2, W + 2 * T, T, wall),
        Bodies.rectangle(W / 2, -T / 2, W + 2 * T, T, wall),
        Bodies.rectangle(-T / 2, H / 2, T, H, wall),
        Bodies.rectangle(W + T / 2, H / 2, T, H, wall),
      ])
    } else {
      const wall = { isStatic: true, friction: 0.3, restitution: 0.15 }
      Composite.add(engine.world, [
        Bodies.rectangle(W / 2, H + T / 2, W + 400, T, wall),
        Bodies.rectangle(-T / 2, H / 2 - H, T, H * 4, wall),
        Bodies.rectangle(W + T / 2, H / 2 - H, T, H * 4, wall),
      ])
      // Teto na borda da caixa, adicionado quando todos os chips já caíram para dentro dela (ver sync)
      addCeiling = () => Composite.add(engine.world, Bodies.rectangle(W / 2, -T / 2, W + 400, T, wall))
    }

    // em gravidade zero nascem espalhados dentro da caixa, sem se sobrepor e fora do botão;
    // com gravidade nascem acima da caixa, em fila, e caem
    const taken = [{ x: btn.offsetLeft + btn.offsetWidth / 2, y: btn.offsetTop + btn.offsetHeight / 2, w: btn.offsetWidth, h: btn.offsetHeight }]
    const free = (x, y, w, h) => taken.every((t) => Math.abs(t.x - x) > (t.w + w) / 2 + 8 || Math.abs(t.y - y) > (t.h + h) / 2 + 8)
    const sway = []
    const bodies = chipEls.current.filter(Boolean).map((c, i) => {
      const w = c.offsetWidth
      const h = c.offsetHeight
      if (!float) {
        return Bodies.rectangle(w / 2 + 16 + Math.random() * Math.max(1, W - w - 32), -h - i * 46 - Math.random() * 30, w, h, {
          chamfer: { radius: h / 2 },
          restitution: 0.35,
          friction: 0.4,
          frictionAir: 0.015,
          density: 0.002,
          angle: (Math.random() - 0.5) * 0.8,
        })
      }
      let x = W / 2
      let y = H / 2
      for (let k = 0; k < 80; k++) {
        const tx = 12 + w / 2 + Math.random() * Math.max(1, W - w - 24)
        const ty = 12 + h / 2 + Math.random() * Math.max(1, H - h - 24)
        if (free(tx, ty, w, h)) {
          x = tx
          y = ty
          break
        }
      }
      taken.push({ x, y, w, h })
      // cada chip balança no próprio ritmo: até ±0,25 rad, período de 6 a 12s
      sway.push({ a: 0.08 + Math.random() * 0.17, f: (2 * Math.PI) / (6000 + Math.random() * 6000), p: Math.random() * 2 * Math.PI })
      const b = Bodies.rectangle(x, y, w, h, {
        chamfer: { radius: h / 2 },
        restitution: 0.9,
        friction: 0.05,
        frictionAir: 0.004,
        density: 0.002,
        angle: (Math.random() - 0.5) * 0.5,
      })
      const a = Math.random() * Math.PI * 2
      Body.setVelocity(b, { x: Math.cos(a) * FLOAT, y: Math.sin(a) * FLOAT })
      return b
    })
    Composite.add(engine.world, bodies)

    let mouseConstraint = null
    let release = null
    const stop = (e) => e.stopPropagation()
    if (window.matchMedia('(pointer: fine)').matches) {
      const mouse = Mouse.create(el)
      // não roubar o scroll da página
      el.removeEventListener('wheel', mouse.mousewheel)
      // clicar no botão não agarra o chip que estiver atrás dele
      btn.addEventListener('mousedown', stop)
      // angularStiffness 0: o chip gira livremente em torno do ponto onde foi pego (física de verdade)
      mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: { stiffness: 0.25, damping: 0.05, angularStiffness: 0 },
      })
      Composite.add(engine.world, mouseConstraint)
      // Sair da caixa (ou soltar fora dela) solta o chip onde ele estiver
      release = () => {
        mouse.button = -1
        mouseConstraint.constraint.bodyB = null
        mouseConstraint.constraint.pointB = null
      }
      el.addEventListener('pointerleave', release)
      window.addEventListener('pointerup', release)
    }

    // gravidade zero: cada chip segue na direção em que vai, com a velocidade voltando devagar ao cruzeiro
    // e o ângulo voltando ao balanço (choques e arremessos ainda giram o chip, depois ele se endireita)
    const drift = () => {
      const held = mouseConstraint?.body
      const t = engine.timing.timestamp
      bodies.forEach((b, i) => {
        if (b === held) return
        const v = b.velocity
        const speed = Math.hypot(v.x, v.y)
        const a = speed < 0.02 ? Math.random() * Math.PI * 2 : Math.atan2(v.y, v.x)
        Body.setVelocity(b, { x: v.x + (Math.cos(a) * FLOAT - v.x) * STEER, y: v.y + (Math.sin(a) * FLOAT - v.y) * STEER })
        const s = sway[i]
        const angle = Math.atan2(Math.sin(b.angle), Math.cos(b.angle))
        const target = (s.a * Math.sin(t * s.f + s.p) - angle) * TILT
        Body.setAngularVelocity(b, b.angularVelocity + (target - b.angularVelocity) * STEER)
      })
    }

    // área do botão (um pouco maior) para saber se algum chip passa por trás dele
    const probe = Bodies.rectangle(btn.offsetLeft + btn.offsetWidth / 2, btn.offsetTop + btn.offsetHeight / 2, btn.offsetWidth + 8, btn.offsetHeight + 8)
    let covered = false
    let dragging = false
    const sync = () => {
      bodies.forEach((b, i) => {
        const c = chipEls.current[i]
        if (!c) return
        c.style.transform = `translate(${b.position.x - c.offsetWidth / 2}px, ${b.position.y - c.offsetHeight / 2}px) rotate(${b.angle}rad)`
      })
      // com todos dentro, o teto fecha a caixa e o "Sacudir" não joga nenhum para fora
      if (addCeiling && bodies.every((b) => b.bounds.min.y > 0)) {
        addCeiling()
        addCeiling = null
      }
      const now = Query.collides(probe, bodies).length > 0
      if (now !== covered) {
        covered = now
        btn.toggleAttribute('data-covered', now)
      }
      // arrastando um chip para trás do botão, o cursor passa por cima dele: o hover não deve trazê-lo de volta
      const held = Boolean(mouseConstraint?.body)
      if (held !== dragging) {
        dragging = held
        btn.toggleAttribute('data-dragging', held)
      }
    }
    if (float) Events.on(engine, 'beforeUpdate', drift)
    Events.on(engine, 'afterUpdate', sync)
    sync()
    const runner = Runner.create()
    world.current = { engine, runner, bodies, running: false }

    return () => {
      Runner.stop(runner)
      Events.off(engine, 'beforeUpdate', drift)
      Events.off(engine, 'afterUpdate', sync)
      btn.removeEventListener('mousedown', stop)
      btn.removeAttribute('data-covered')
      btn.removeAttribute('data-dragging')
      if (release) {
        el.removeEventListener('pointerleave', release)
        window.removeEventListener('pointerup', release)
      }
      if (mouseConstraint) Mouse.clearSourceEvents(mouseConstraint.mouse)
      Composite.clear(engine.world, false)
      Engine.clear(engine)
      Resolver._restingThresh = RESTING
      world.current = null
    }
  }, [items, reduced, float])

  // roda só quando visível
  useEffect(() => {
    const w = world.current
    if (!w) return
    if (inView && !w.running) {
      Runner.run(w.runner, w.engine)
      w.running = true
    } else if (!inView && w.running) {
      Runner.stop(w.runner)
      w.running = false
    }
  }, [inView, items, reduced, float])

  // sacudir: com gravidade, um empurrão para cima; em gravidade zero, em direção aleatória
  // (a velocidade volta sozinha ao cruzeiro)
  const shake = () => {
    const w = world.current
    if (!w) return
    setShakes((n) => n + 1)
    w.bodies.forEach((b) => {
      if (!float) {
        Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.07 * b.mass, y: -(0.04 + Math.random() * 0.05) * b.mass })
        Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.35)
        return
      }
      const a = Math.random() * Math.PI * 2
      const speed = 6 + Math.random() * 6
      Body.setVelocity(b, { x: Math.cos(a) * speed, y: Math.sin(a) * speed })
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.2)
    })
  }

  const chipClass = 'inline-flex h-11 items-center whitespace-nowrap rounded-full border border-accent/40 bg-accent-soft px-4 font-display text-[15px] font-semibold text-ink mode-transition'

  if (reduced) {
    return (
      <ul className="flex flex-wrap gap-2" aria-label={label}>
        {items.map((item) => (
          <li key={item} className={chipClass}>
            {item}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div>
      <div
        ref={box}
        role="group"
        aria-label={label}
        className="relative h-[300px] overflow-hidden rounded-lg border border-hairline bg-surface/50 [touch-action:pan-y] md:h-[320px]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 glow-follow opacity-40" />
        <ul className="contents">
          {items.map((item, i) => (
            <li
              key={`${item}-${shakes === -1 ? 0 : ''}`}
              ref={(el) => (chipEls.current[i] = el)}
              className={`absolute left-0 top-0 cursor-grab select-none will-change-transform active:cursor-grabbing ${chipClass}`}
              style={{ transform: 'translate(-999px,-999px)' }}
            >
              {item}
            </li>
          ))}
        </ul>
        {/* translúcido com um chip atrás (data-covered vem da física); volta inteiro no foco e no hover, menos arrastando */}
        <button
          ref={button}
          type="button"
          onClick={shake}
          className="absolute bottom-3 right-3 inline-flex h-11 items-center gap-2 rounded-sm border border-hairline-strong bg-surface px-4 text-small text-ink transition-[color,background-color,opacity] duration-(--duration-base) hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&[data-covered]:not(:focus-visible):is([data-dragging],:not(:hover))]:opacity-40"
        >
          <Icon name="layers" size={16} />
          Sacudir
        </button>
      </div>
    </div>
  )
}
