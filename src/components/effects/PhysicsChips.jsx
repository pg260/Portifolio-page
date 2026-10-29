import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import { useInView, useReducedMotion } from 'motion/react'
import { Icon } from '../ui/Icon.jsx'

const { Engine, Runner, Bodies, Body, Composite, Mouse, MouseConstraint, Events } = Matter

/**
 * Chips de stack como corpos rígidos: caem no contêiner, colidem, podem ser arrastados e
 * atirados (ponteiro fino) e sacudidos pelo botão (toque e teclado). Trocar de modo faz
 * cair o conjunto novo. Com reduced motion vira uma lista comum.
 */
export function PhysicsChips({ items, label }) {
  const box = useRef(null)
  const chipEls = useRef([])
  const world = useRef(null)
  const inView = useInView(box, { amount: 0.3 })
  const reduced = useReducedMotion()
  const [shakes, setShakes] = useState(0)

  useEffect(() => {
    if (reduced || !box.current) return
    const el = box.current
    const W = el.clientWidth
    const H = el.clientHeight
    const T = 80
    const engine = Engine.create({ gravity: { x: 0, y: 1.2 } })
    const wall = { isStatic: true, friction: 0.3, restitution: 0.15 }
    Composite.add(engine.world, [
      Bodies.rectangle(W / 2, H + T / 2, W + 400, T, wall),
      Bodies.rectangle(-T / 2, H / 2 - H, T, H * 4, wall),
      Bodies.rectangle(W + T / 2, H / 2 - H, T, H * 4, wall),
    ])
    // Teto na borda da caixa, adicionado 1,4s depois que o motor começa a rodar (ver efeito de inView)
    const addCeiling = () => Composite.add(engine.world, Bodies.rectangle(W / 2, -T / 2, W + 400, T, wall))
    const bodies = chipEls.current.filter(Boolean).map((c, i) => {
      const w = c.offsetWidth
      const h = c.offsetHeight
      return Bodies.rectangle(w / 2 + 16 + Math.random() * Math.max(1, W - w - 32), -h - i * 46 - Math.random() * 30, w, h, {
        chamfer: { radius: h / 2 },
        restitution: 0.35,
        friction: 0.4,
        frictionAir: 0.015,
        density: 0.002,
        angle: (Math.random() - 0.5) * 0.8,
      })
    })
    Composite.add(engine.world, bodies)

    let mouseConstraint = null
    let release = null
    if (window.matchMedia('(pointer: fine)').matches) {
      const mouse = Mouse.create(el)
      // não roubar o scroll da página
      el.removeEventListener('wheel', mouse.mousewheel)
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

    const sync = () => {
      bodies.forEach((b, i) => {
        const c = chipEls.current[i]
        if (!c) return
        c.style.transform = `translate(${b.position.x - c.offsetWidth / 2}px, ${b.position.y - c.offsetHeight / 2}px) rotate(${b.angle}rad)`
      })
    }
    Events.on(engine, 'afterUpdate', sync)
    sync()
    const runner = Runner.create()
    world.current = { engine, runner, bodies, running: false, addCeiling, ceilingTimer: null }

    return () => {
      clearTimeout(world.current?.ceilingTimer)
      Runner.stop(runner)
      Events.off(engine, 'afterUpdate', sync)
      if (release) {
        el.removeEventListener('pointerleave', release)
        window.removeEventListener('pointerup', release)
      }
      if (mouseConstraint) Mouse.clearSourceEvents(mouseConstraint.mouse)
      Composite.clear(engine.world, false)
      Engine.clear(engine)
      world.current = null
    }
  }, [items, reduced])

  // roda só quando visível
  useEffect(() => {
    const w = world.current
    if (!w) return
    if (inView && !w.running) {
      Runner.run(w.runner, w.engine)
      w.running = true
      if (w.addCeiling) {
        const add = w.addCeiling
        w.addCeiling = null
        w.ceilingTimer = setTimeout(add, 1400)
      }
    } else if (!inView && w.running) {
      Runner.stop(w.runner)
      w.running = false
    }
  }, [inView, items, reduced])

  const shake = () => {
    const w = world.current
    if (!w) return
    setShakes((n) => n + 1)
    w.bodies.forEach((b) => {
      Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.07 * b.mass, y: -(0.04 + Math.random() * 0.05) * b.mass })
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.35)
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
        className="relative h-[280px] overflow-hidden rounded-lg border border-hairline bg-surface/50 [touch-action:pan-y] md:h-[320px]"
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
        <span className="pointer-events-none absolute bottom-3 left-4 text-caption uppercase text-muted">
          <span className="hidden md:inline">arraste e jogue · </span>
          {items.length} itens
        </span>
        <button
          type="button"
          onClick={shake}
          className="absolute bottom-3 right-3 inline-flex h-11 items-center gap-2 rounded-sm border border-hairline-strong bg-surface px-4 text-small text-ink transition-colors hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          <Icon name="layers" size={16} />
          Sacudir
        </button>
      </div>
    </div>
  )
}
