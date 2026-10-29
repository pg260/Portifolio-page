import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { contact, links } from '../data/profile.js'
import { useMode } from '../mode/ModeContext.jsx'
import { Container } from './ui/Container.jsx'
import { Button } from './ui/Button.jsx'
import { Magnetic } from './effects/Magnetic.jsx'
import { Reveal, RevealItem } from './effects/Reveal.jsx'
import { GhostTitle } from './effects/GhostTitle.jsx'
import { ScrubReveal } from './effects/ScrubReveal.jsx'

const ReactiveField = lazy(() => import('./scene/ReactiveField.jsx'))

export function Contact() {
  const { mode } = useMode()
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { amount: 0.2 })
  const [webgl, setWebgl] = useState(false)
  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      setWebgl(Boolean(c.getContext('webgl2') || c.getContext('webgl')))
    } catch {
      setWebgl(false)
    }
  }, [])

  return (
    <section ref={ref} id="contato" aria-labelledby="contato-title" className="relative overflow-hidden py-24 md:py-32 lg:py-44">
      <GhostTitle text="Contato" />
      {/* Campo de esferas que reage ao cursor; o texto fica acima sem capturar o ponteiro, só os links */}
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]" aria-hidden="true">
        {webgl && (
          <Suspense fallback={null}>
            <ReactiveField mode={mode} active={inView} reduced={Boolean(reduced)} />
          </Suspense>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_100%,var(--color-glow),transparent_70%)] mode-transition" />
      </div>
      <Container className="pointer-events-none relative">
        <Reveal amount={0.3} className="flex flex-col gap-6 md:gap-8">
          <ScrubReveal id="contato-title" className="text-h2">
            {contact.title}
          </ScrubReveal>
          <RevealItem className="pointer-events-auto w-fit">
            <Magnetic strength={4}>
              <a
                href={`mailto:${links.email}`}
                data-glitch=""
                className="inline-block w-fit break-all rounded-sm font-display text-contact text-ink decoration-accent decoration-[3px] underline-offset-8 transition-colors duration-(--duration-fast) hover:text-accent hover:underline focus-visible:underline mode-transition"
              >
                {links.email}
              </a>
            </Magnetic>
          </RevealItem>
          <RevealItem as={motion.ul} className="pointer-events-auto flex w-fit flex-wrap gap-3">
            <li>
              <Button variant="secondary" href={links.linkedin} icon="linkedin">
                LinkedIn
              </Button>
            </li>
            <li>
              <Button variant="secondary" href={links.itch} icon="gamepad">
                itch.io
              </Button>
            </li>
            <li>
              <Button variant="secondary" href={links.studio} icon="arrow-up-right">
                {links.studioLabel}
              </Button>
            </li>
          </RevealItem>
          {/* o campo segue o mouse; em tela de toque a dica não se aplica */}
          <RevealItem as={motion.p} className="text-caption uppercase text-muted pointer-coarse:hidden">
            {contact.hint}
          </RevealItem>
        </Reveal>
      </Container>
    </section>
  )
}
