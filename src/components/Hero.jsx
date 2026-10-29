import { useEffect, useMemo, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { profile } from '../data/profile.js'
import { useMode } from '../mode/ModeContext.jsx'
import { Container } from './ui/Container.jsx'
import { Button } from './ui/Button.jsx'
import { ModeSwitch } from './ModeSwitch.jsx'
import { Magnetic } from './effects/Magnetic.jsx'
import { useIntroReady } from './effects/Intro.jsx'
import { useWorld } from '../world/WorldContext.jsx'
import { world } from '../world/store.js'

const EASE = [0.22, 1, 0.36, 1]

/** Headline revelado palavra a palavra (clip + y), com stagger. */
function Headline({ text, id, ready }) {
  const words = text.split(' ')
  return (
    <motion.h1
      id={id}
      initial="hidden"
      animate={ready ? 'visible' : 'hidden'}
      exit="exit"
      variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } }, exit: { transition: { staggerChildren: 0.02 } } }}
      data-glitch=""
      className="max-w-[12ch] text-display"
    >
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-top">
          <motion.span
            className="inline-block will-change-transform"
            variants={{
              hidden: { y: '110%', opacity: 0 },
              visible: { y: 0, opacity: 1, transition: { duration: 0.75, ease: EASE } },
              exit: { y: '-60%', opacity: 0, transition: { duration: 0.18 } },
            }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </motion.h1>
  )
}

const fade = {
  hidden: { opacity: 0, y: 14 },
  visible: (delay) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay, ease: EASE } }),
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

function Hud({ data, pointerEls, ready }) {
  const telemetry = world.telemetry
  const cls = 'pointer-events-none absolute z-20 flex items-center gap-2 text-caption uppercase text-muted'
  const dot = <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent-2 mode-transition" />
  const stat = (key, label) => (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      <span>{label}</span>
      <span className="text-ink" ref={(el) => (telemetry[key] = el)}>
        00
      </span>
    </span>
  )
  return (
    <motion.div aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: ready ? 1 : 0 }} transition={{ delay: 1, duration: 0.6 }}>
      <div data-hud-top="" className={`${cls} left-5 top-24 md:left-8 xl:left-12`}>
        {dot}
        {data.hudLabel}
      </div>
      <div className={`${cls} right-5 top-24 md:right-8 xl:right-12`}>
        <span ref={(el) => (telemetry.fps = el)}>60</span> fps
      </div>
      <div className={`${cls} bottom-8 left-5 right-5 justify-between max-md:flex-col max-md:items-start md:left-8 md:right-8 xl:left-12 xl:right-12`}>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Player · {profile.name}</span>
          <span className="hidden md:inline text-muted/80">· {data.hud.hint}</span>
          <span className="md:hidden text-muted/80">· {data.hud.hintTouch}</span>
        </span>
        <span className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
          <span className="hidden lg:inline">
            X <span ref={(el) => (pointerEls.x = el)}>0.00</span> Y <span ref={(el) => (pointerEls.y = el)}>0.00</span>
          </span>
          {stat('s1', data.hud.stats[0])}
          {stat('s2', data.hud.stats[1])}
          {stat('s3', data.hud.stats[2])}
        </span>
      </div>
      {/* scanline que pisca nos eventos de caos do minigame Fullstack (classe sys-glitch no html) */}
      <div className="sys-scan pointer-events-none absolute inset-0 z-20 opacity-0" />
    </motion.div>
  )
}

export function Hero() {
  const { mode, data } = useMode()
  const reduced = useReducedMotion()
  const ready = useIntroReady()
  const { tier, on: worldOn } = useWorld()
  const ref = useRef(null)
  const textRef = useRef(null)
  const pointerEls = useMemo(() => ({ x: null, y: null }), [])
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  // Texto do hero sobe mais devagar que a página e some ao sair (parallax ligado ao scroll)
  const textY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, -160])
  const textOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0])

  // o mundo 3D só roda o minigame enquanto o hero está na tela
  useEffect(() => {
    world.view.hero = 1 - scrollYProgress.get()
    return scrollYProgress.on('change', (v) => (world.view.hero = 1 - v))
  }, [scrollYProgress])

  // faixa livre entre o HUD e o texto (sem o parallax: offsetTop ignora transform), para o minigame
  useEffect(() => {
    const section = ref.current
    const text = textRef.current
    if (!section || !text) return
    const measure = () => {
      const label = section.querySelector('[data-hud-top]')
      let bottom = 0
      for (let el = text; el && el !== section; el = el.offsetParent) bottom += el.offsetTop
      world.view.free = { top: label ? label.offsetTop + label.offsetHeight : 112, bottom }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(section)
    ro.observe(text)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (reduced) return
    let raf = 0
    const onMove = (e) => {
      world.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      world.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0
          if (pointerEls.x) pointerEls.x.textContent = world.pointer.x.toFixed(2)
          if (pointerEls.y) pointerEls.y.textContent = world.pointer.y.toFixed(2)
        })
      }
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [reduced, pointerEls])

  return (
    <section ref={ref} id="inicio" aria-labelledby="hero-title" className="relative min-h-[100svh] overflow-hidden select-none">
      {/* Zona de jogo: o canvas do mundo fica atrás da página; os cliques aqui chegam ao minigame */}
      <div className="absolute inset-0 cursor-crosshair touch-pan-y" aria-hidden="true" data-cursor="hot" data-world-zone="hero">
        {tier !== null && !worldOn && <div className="absolute inset-0 hero-static" />}
        <div className="pointer-events-none absolute inset-0 vignette" />
      </div>

      <Hud data={data} pointerEls={pointerEls} ready={ready} />

      <Container className="pointer-events-none relative z-10 flex min-h-[100svh] flex-col justify-end pb-28 pt-28 md:justify-center md:pb-20 md:pt-32">
        <motion.div ref={textRef} style={{ y: textY, opacity: textOpacity }} className="pointer-events-auto max-w-[720px] lg:w-7/12">
          <AnimatePresence mode="wait" initial={true}>
            <Headline key={mode} id="hero-title" text={data.headline} ready={ready} />
          </AnimatePresence>
          <AnimatePresence mode="wait" initial={true}>
            <motion.div key={mode} className="mt-6 flex flex-col gap-6 md:mt-8 md:gap-8">
              <motion.p custom={0.55} variants={fade} initial="hidden" animate={ready ? 'visible' : 'hidden'} exit="exit" className="max-w-[36ch] text-lead text-body">
                {data.lead}
              </motion.p>
              <motion.div custom={0.7} variants={fade} initial="hidden" animate={ready ? 'visible' : 'hidden'} exit="exit">
                <ModeSwitch size="large" id="hero" />
              </motion.div>
              <motion.div custom={0.85} variants={fade} initial="hidden" animate={ready ? 'visible' : 'hidden'} exit="exit" className="flex flex-wrap items-center gap-3">
                <Magnetic>
                  <Button href={data.cta.href}>{data.cta.label}</Button>
                </Magnetic>
                <Button variant="secondary" href={data.ctaSecondary.href} icon={data.ctaSecondary.icon}>
                  {data.ctaSecondary.label}
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </Container>
    </section>
  )
}
