import { AnimatePresence, motion } from 'motion/react'
import { profile } from '../data/profile.js'
import { useMode } from '../mode/ModeContext.jsx'
import { Container } from './ui/Container.jsx'
import { Counter } from './effects/Counter.jsx'
import { Reveal, RevealItem } from './effects/Reveal.jsx'
import { GhostTitle } from './effects/GhostTitle.jsx'
import { ScrollText } from './effects/ScrollText.jsx'
import { ScrubReveal } from './effects/ScrubReveal.jsx'
import { PhysicsChips } from './effects/PhysicsChips.jsx'

export function About() {
  const { mode, data } = useMode()
  return (
    <section id="sobre" aria-labelledby="sobre-title" className="relative py-20 md:py-28 lg:py-36">
      <GhostTitle text="Sobre" align="left" />
      <Container className="relative">
        <ScrubReveal id="sobre-title" className="mb-10 text-h2 md:mb-14">
          Sobre
        </ScrubReveal>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="flex flex-col gap-8 lg:col-span-6">
            {profile.about.map((paragraph) => (
              <ScrollText key={paragraph.slice(0, 24)} text={paragraph} className="max-w-[60ch] text-lead text-body" />
            ))}
          </div>
          <Reveal amount={0.2} className="flex flex-col gap-10 lg:col-span-6">
            <RevealItem>
              <AnimatePresence mode="wait" initial={false}>
                <motion.dl
                  key={mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="grid grid-cols-3 gap-4 border-y border-hairline py-6"
                >
                  {data.stats.map((stat) => (
                    <div key={stat.label} className="group flex cursor-default flex-col gap-1">
                      <dd className="order-1 transition-transform duration-(--duration-base) ease-(--ease-out) group-hover:-translate-y-1">
                        <Counter value={stat.value} suffix={stat.suffix} />
                      </dd>
                      <dt className="order-2 text-small text-muted">{stat.label}</dt>
                    </div>
                  ))}
                </motion.dl>
              </AnimatePresence>
            </RevealItem>
            <RevealItem>
              <h3 className="mb-4 text-small text-muted">Stack · {data.label}</h3>
              <PhysicsChips items={data.stack} label={`Stack ${data.label}`} />
            </RevealItem>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
