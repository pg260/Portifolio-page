import { motion } from 'motion/react'
import { links } from '../data/profile.js'
import { useMode } from '../mode/ModeContext.jsx'
import { Container } from './ui/Container.jsx'
import { Button } from './ui/Button.jsx'
import { Magnetic } from './effects/Magnetic.jsx'
import { Reveal, RevealItem } from './effects/Reveal.jsx'
import { GhostTitle } from './effects/GhostTitle.jsx'
import { ScrubReveal } from './effects/ScrubReveal.jsx'

/** Contato: sem interação própria; o fundo é o mundo 3D (no modo Jogos, a galáxia à direita). O título muda com o modo. */
export function Contact() {
  const { data } = useMode()
  return (
    <section id="contato" aria-labelledby="contato-title" className="relative overflow-hidden py-24 md:py-32 lg:py-44">
      <GhostTitle text="Contato" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_100%,var(--color-glow),transparent_70%)] mode-transition" aria-hidden="true" />
      <Container className="relative">
        <Reveal amount={0.3} className="flex flex-col gap-6 md:gap-8">
          <ScrubReveal id="contato-title" className="text-h2">
            {data.contactTitle}
          </ScrubReveal>
          <RevealItem className="w-fit">
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
          <RevealItem as={motion.ul} className="flex w-fit flex-wrap gap-3">
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
        </Reveal>
      </Container>
    </section>
  )
}
