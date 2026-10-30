import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { studios } from '../data/projects.js'
import { clients, employers } from '../data/companies.js'
import { useMode } from '../mode/ModeContext.jsx'
import { Container } from './ui/Container.jsx'
import { Button } from './ui/Button.jsx'
import { Pill } from './ui/Pill.jsx'
import { Picture } from './ui/Picture.jsx'
import { Icon } from './ui/Icon.jsx'
import { TiltCard } from './effects/TiltCard.jsx'
import { Reveal, RevealItem, revealChild } from './effects/Reveal.jsx'
import { GhostTitle } from './effects/GhostTitle.jsx'
import { ScrubReveal } from './effects/ScrubReveal.jsx'
import { SectionField } from './effects/SectionField.jsx'

const EASE = [0.22, 1, 0.36, 1]

/** Iniciais das palavras com maiúscula ("Ninho do Pierre" → "NP"), para miniaturas sem imagem. */
const initials = (title) =>
  title
    .split(/\s+/)
    .filter((word) => /^\p{Lu}/u.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join('')

function StoreLinks({ project }) {
  return (
    <ul className="mt-1 flex flex-wrap gap-2">
      {project.links.map((link) => (
        <li key={link.url}>
          <Button variant="store" href={link.url} icon={link.icon} iconPosition="left" label={`${link.label}: ${project.title}`}>
            {link.label}
          </Button>
        </li>
      ))}
    </ul>
  )
}

/**
 * Mídia do projeto selecionado: pôster em cover; ícones quadrados centralizados sobre a própria imagem desfocada;
 * sem imagem, o título em tipografia. Trocar de aba faz crossfade entre as capas.
 */
function GameMedia({ project, index, className = '' }) {
  const reduced = useReducedMotion()
  // pôster preenche a área; ícone quadrado fica centrado com cantos arredondados, como na loja
  const box = project.featured
    ? 'inset-0 h-full w-full object-cover object-top'
    : 'inset-0 m-auto aspect-square h-[calc(100%-5rem)] w-auto max-w-[calc(100%-5rem)] rounded-lg object-cover'
  return (
    <div className={`relative overflow-hidden bg-surface-elevated ${className}`}>
      <AnimatePresence initial={false}>
        <motion.div
          key={project.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.5, ease: EASE }}
          className="absolute inset-0"
        >
          {project.image ? (
            <>
              {!project.featured && (
                <img
                  src={project.image.webp}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full scale-150 object-cover opacity-50 blur-2xl saturate-150"
                />
              )}
              <Picture
                image={project.image}
                alt={project.alt}
                sizes="(min-width: 1024px) 60vw, 100vw"
                className={`absolute transition-transform duration-[1400ms] ease-(--ease-out) group-hover:scale-[1.06] motion-reduce:transform-none ${box} ${
                  project.featured ? '' : 'drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]'
                }`}
              />
              {/* camada de glitch: cópia fatiada que pisca ao entrar com o mouse */}
              <img
                src={project.image.webp}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className={`pointer-events-none absolute opacity-0 mix-blend-screen hue-rotate-[40deg] group-hover:animate-[img-glitch_0.5s_steps(1)_both] motion-reduce:hidden ${box}`}
              />
            </>
          ) : (
            // sem capa ainda: o título vira a capa, sobre um brilho na cor do modo
            <div aria-hidden="true" className="absolute inset-0 grid place-items-center">
              <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_45%,var(--color-accent-soft),transparent)] mode-transition" />
              <p className="relative max-w-[11ch] text-balance px-8 text-center font-display text-h2 text-ink transition-transform duration-[1400ms] ease-(--ease-out) group-hover:scale-[1.06] motion-reduce:transform-none">
                {project.title}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-1 h-[3px] bg-accent opacity-0 shadow-[0_0_18px_var(--color-accent)] group-hover:animate-[scan_0.9s_ease-out_both] motion-reduce:hidden mode-transition"
      />
      <span aria-hidden="true" className="absolute left-5 top-5 font-display text-small font-semibold text-ink/70">
        {String(index + 1).padStart(2, '0')}
      </span>
    </div>
  )
}

/** Aba selecionada de um estúdio; setas, Home e End movem o foco entre as miniaturas (padrão de abas WAI-ARIA). */
function useProjectTabs(count) {
  const [selected, setSelected] = useState(0)
  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key]
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : step ? (selected + step + count) % count : null
    if (next === null) return
    e.preventDefault()
    setSelected(next)
    e.currentTarget.parentElement.children[next].focus()
  }
  return { selected, setSelected, onKeyDown }
}

function StudioHeader({ studio, titleId }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={titleId} translate="no" className="text-caption uppercase text-accent mode-transition">
          {studio.name}
        </h3>
        <span className="text-caption uppercase tabular-nums text-muted">{studio.period}</span>
      </div>
      <p className="mt-1 text-small text-muted">{studio.role}</p>
    </div>
  )
}

/** Miniaturas dos projetos do estúdio (só com mais de um projeto): 48px abaixo do desktop para quatro caberem numa linha (360px e cards de 2 colunas no tablet). */
function ProjectTabs({ studio, idBase, tabs }) {
  return (
    <div className="flex items-center gap-3">
      <div role="tablist" aria-label={`Projetos na ${studio.name}`} className="flex flex-wrap gap-2">
        {studio.projects.map((project, i) => {
          const on = i === tabs.selected
          return (
            <button
              key={project.id}
              type="button"
              role="tab"
              id={`${idBase}-tab-${i}`}
              aria-selected={on}
              aria-controls={`${idBase}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => tabs.setSelected(i)}
              onKeyDown={tabs.onKeyDown}
              className={`relative grid h-12 w-12 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border bg-surface-elevated transition-[border-color,box-shadow,opacity] duration-(--duration-base) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring lg:h-14 lg:w-14 ${
                on ? 'border-accent shadow-glow mode-transition' : 'border-hairline opacity-60 hover:border-accent/40 hover:opacity-100'
              }`}
            >
              {project.image ? (
                <img src={project.image.webp} alt="" width={56} height={56} loading="lazy" className={`h-full w-full object-cover ${project.featured ? 'object-top' : ''}`} />
              ) : (
                <span aria-hidden="true" className="font-display text-small font-semibold text-ink">
                  {initials(project.title)}
                </span>
              )}
              <span className="sr-only">{project.title}</span>
            </button>
          )
        })}
      </div>
      <span aria-hidden="true" className="whitespace-nowrap text-caption tabular-nums text-muted">
        {tabs.selected + 1} / {studio.projects.length}
      </span>
    </div>
  )
}

/** Texto do projeto selecionado (painel das abas quando o estúdio tem mais de um projeto). */
function ProjectInfo({ project, idBase, tabs, tabbed, large }) {
  const reduced = useReducedMotion()
  const panel = tabbed ? { role: 'tabpanel', id: `${idBase}-panel`, 'aria-labelledby': `${idBase}-tab-${tabs.selected}` } : {}
  return (
    <div {...panel}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={project.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6, transition: { duration: reduced ? 0 : 0.12 } }}
          transition={reduced ? { duration: 0 } : { duration: 0.3, ease: EASE }}
          className={`flex flex-col ${large ? 'gap-5' : 'gap-3'}`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Pill>{project.category}</Pill>
            {project.meta && <span className="text-small text-muted">{project.meta}</span>}
          </div>
          <h4
            translate="no"
            className={`text-balance font-display text-ink ${
              large ? 'text-[clamp(1.75rem,1.2rem+1.6vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.02em]' : 'text-h3'
            }`}
          >
            {project.title}
          </h4>
          <p className={large ? 'max-w-[46ch] text-lead text-body' : 'max-w-[60ch] text-body text-body'}>{project.description}</p>
          <StoreLinks project={project} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/** Card de estúdio (mobile e tablet): capa do projeto selecionado em cima, abas e texto embaixo. */
function StudioCard({ studio, index }) {
  const tabs = useProjectTabs(studio.projects.length)
  const project = studio.projects[tabs.selected]
  const tabbed = studio.projects.length > 1
  const idBase = `work-${studio.id}`
  return (
    <TiltCard as={motion.li} variants={revealChild} className="list-none">
      <article
        aria-labelledby={`${idBase}-title`}
        className="relative h-full overflow-hidden rounded-lg border border-hairline bg-surface transition-[border-color,box-shadow] duration-(--duration-base) group-hover:border-accent/40 group-hover:shadow-glow group-focus-within:border-accent/40"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-(--duration-base) glow-follow group-hover:opacity-100" />
        <GameMedia project={project} index={index} className="aspect-[16/10]" />
        <div className="relative z-20 flex flex-col gap-5 p-5 md:p-6">
          <StudioHeader studio={studio} titleId={`${idBase}-title`} />
          {tabbed && <ProjectTabs studio={studio} idBase={idBase} tabs={tabs} />}
          <ProjectInfo project={project} idBase={idBase} tabs={tabs} tabbed={tabbed} />
        </div>
      </article>
    </TiltCard>
  )
}

/** Desktop: um card grande por estúdio, que gruda no topo e se empilha, encolhendo conforme o próximo chega. */
function StackCard({ studio, index, total, progress }) {
  const reduced = useReducedMotion()
  const tabs = useProjectTabs(studio.projects.length)
  const project = studio.projects[tabs.selected]
  const tabbed = studio.projects.length > 1
  const start = index / total
  const scale = useTransform(progress, [start, 1], [1, reduced ? 1 : 1 - (total - index) * 0.035])
  const idBase = `work-${studio.id}-stack`
  return (
    <motion.li style={{ scale, top: 112 + index * 18 }} className="sticky mb-10 origin-top list-none">
      <article
        aria-labelledby={`${idBase}-title`}
        className="group grid min-h-[560px] grid-cols-12 overflow-hidden rounded-lg border border-hairline bg-surface shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.8)] transition-[border-color,box-shadow] duration-(--duration-base) hover:border-accent/40 hover:shadow-glow focus-within:border-accent/40"
      >
        <GameMedia project={project} index={index} className="col-span-7" />
        <div className="col-span-5 flex flex-col justify-center gap-6 p-10 xl:p-14">
          <StudioHeader studio={studio} titleId={`${idBase}-title`} />
          {tabbed && <ProjectTabs studio={studio} idBase={idBase} tabs={tabs} />}
          <ProjectInfo project={project} idBase={idBase} tabs={tabs} tabbed={tabbed} large />
        </div>
      </article>
    </motion.li>
  )
}

function StackedGames() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 112px', 'end end'] })
  return (
    <ul ref={ref} className="hidden lg:block">
      {studios.map((studio, i) => (
        <StackCard key={studio.id} studio={studio} index={i} total={studios.length} progress={scrollYProgress} />
      ))}
    </ul>
  )
}

/**
 * Logo da empresa como máscara CSS: o SVG só dá a forma, a cor vem do tema (`bg-*` em `className`), então todos ficam
 * no mesmo tom e acompanham o modo. Decorativo: o nome está sempre escrito ao lado.
 */
function Logo({ logo, className = '' }) {
  const mask = `url(${logo.src})`
  return (
    <span
      aria-hidden="true"
      className={`block min-w-0 [mask-position:left_center] [mask-repeat:no-repeat] [mask-size:contain] ${className}`}
      style={{ aspectRatio: logo.ratio, maskImage: mask, WebkitMaskImage: mask }}
    />
  )
}

/**
 * Card de empresa: vira no clique (ou Enter/Espaço) mostrando o que foi feito, a stack e os clientes atendidos por ela.
 * O botão é uma camada transparente por cima das faces, para o título continuar sendo um h3 de verdade (botão só aceita
 * texto simples dentro).
 */
function EmployerCard({ employer }) {
  const [flipped, setFlipped] = useState(false)
  const reduced = useReducedMotion()
  const titleId = `work-${employer.id}`
  const served = clients.filter((client) => client.via.includes(employer.id))
  const face = 'absolute inset-0 flex flex-col justify-between rounded-lg border border-hairline bg-surface p-5 md:p-6 [backface-visibility:hidden]'
  return (
    <TiltCard as={motion.li} variants={revealChild} max={6} className="list-none">
      <div className="group/flip relative aspect-[4/3] w-full [perspective:1400px]">
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 160, damping: 20 }}
          className="relative h-full w-full [transform-style:preserve-3d]"
        >
          {/* frente */}
          <div className={`${face} transition-[border-color,box-shadow] duration-(--duration-base) group-hover:border-accent/40 group-hover:shadow-glow`}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-(--duration-base) glow-follow group-hover:opacity-100" />
            <div className="relative flex items-start justify-between gap-3">
              {employer.logo ? (
                // até 160px de largura: logos compridos (NeoCode, Bugaboo) ficam mais baixos, e não mais pesados que os outros
                <Logo logo={employer.logo} className="h-11 max-w-40 bg-ink mode-transition group-hover:bg-accent" />
              ) : (
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-accent-soft text-accent mode-transition">
                  <Icon name={employer.icon} size={20} />
                </span>
              )}
              <span className="shrink-0 text-caption uppercase tabular-nums text-muted">{employer.period}</span>
            </div>
            <div className="relative">
              <h3 id={titleId} translate="no" className="font-display text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)] font-semibold leading-none tracking-[-0.02em] text-ink">
                {employer.name}
              </h3>
              <p className="mt-2 flex items-center justify-between gap-3 text-small text-muted">
                {employer.role}
                {/* sem hover (celular), a dica fica sempre à mostra; no teclado, aparece com o foco */}
                <span className="inline-flex shrink-0 items-center gap-1 text-caption uppercase text-accent opacity-0 transition-opacity duration-(--duration-base) group-hover:opacity-100 group-has-focus-visible/flip:opacity-100 [@media(hover:none)]:opacity-100 mode-transition">
                  ver mais <Icon name="arrow-up-right" size={14} />
                </span>
              </p>
            </div>
          </div>
          {/* verso */}
          <div id={`${titleId}-back`} className={`${face} border-accent/40 bg-surface-elevated [transform:rotateY(180deg)]`}>
            <div className="flex items-start justify-between gap-3">
              <span translate="no" className="font-display text-h3 text-ink">
                {employer.name}
              </span>
              <span className="shrink-0 text-caption uppercase tabular-nums text-muted">{employer.period}</span>
            </div>
            <div>
              <p className="text-body text-body">{employer.description}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {employer.stack.map((item) => (
                  <li key={item} className="rounded-sm bg-accent-soft px-2.5 py-1 text-small text-ink mode-transition">
                    {item}
                  </li>
                ))}
              </ul>
              {served.length > 0 && (
                <p className="mt-3 text-caption uppercase text-accent mode-transition">
                  <span className="text-muted">Clientes ·</span> {served.map((client) => client.name).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </motion.div>
        <button
          type="button"
          aria-pressed={flipped}
          aria-labelledby={titleId}
          aria-describedby={`${titleId}-back`}
          onClick={() => setFlipped((v) => !v)}
          className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
        />
      </div>
    </TiltCard>
  )
}

/** Cliente atendido por meio de uma das empresas; "via" aparece quando a empresa está preenchida nos dados. */
function ClientCard({ client, viaLabel }) {
  const via = employers.filter((employer) => client.via.includes(employer.id)).map((employer) => employer.name)
  return (
    <motion.li variants={revealChild} className="flex list-none flex-col gap-4 rounded-lg border border-hairline bg-surface p-4 md:p-5">
      {client.logo ? (
        <Logo logo={client.logo} className="h-10 max-w-full self-start bg-ink" />
      ) : (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-accent-soft text-accent mode-transition">
          <Icon name={client.icon} size={18} />
        </span>
      )}
      <div>
        <h4 translate="no" className="text-balance font-display text-h3 text-ink">
          {client.name}
        </h4>
        <p className="mt-1 text-small text-muted">{client.sector}</p>
      </div>
      <p className="text-small text-body">{client.description}</p>
      {via.length > 0 && (
        <p translate="no" className="mt-auto text-caption uppercase text-accent mode-transition">
          {viaLabel} {via.join(' · ')}
        </p>
      )}
    </motion.li>
  )
}

/** Segundo nível do Fullstack: os clientes dos projetos feitos dentro das empresas acima. */
function Clients({ data }) {
  return (
    <Reveal amount={0.2} className="mt-16 md:mt-24">
      {/* nota logo abaixo do título e em `body`: à direita, em `muted`, sumia sobre os racks acesos do fundo 3D */}
      <header className="mb-8 flex flex-col gap-2">
        <RevealItem as={motion.h3} className="font-display text-h3 text-ink">
          {data.clientsTitle}
        </RevealItem>
        <RevealItem as={motion.p} className="text-small text-body">
          {data.clientsNote}
        </RevealItem>
      </header>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-5">
        {clients.map((client) => (
          <ClientCard key={client.id} client={client} viaLabel={data.clientsVia} />
        ))}
      </ul>
    </Reveal>
  )
}

export function Work() {
  const { mode, data } = useMode()
  const isGames = mode === 'games'
  return (
    <section id="trabalhos" aria-labelledby="trabalhos-title" className="relative py-20 md:py-28 lg:py-36">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <SectionField key={mode} variant={isGames ? 'stars' : 'network'} mode={mode} count={isGames ? 200 : 130} />
      </div>
      <GhostTitle text={isGames ? 'Jogos' : 'Empresas'} />
      <Container className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.15 } }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Reveal amount={0.1}>
              <header className="mb-10 flex flex-col gap-2 md:mb-14 md:flex-row md:items-end md:justify-between">
                <ScrubReveal id="trabalhos-title" className="text-h2">
                  {data.workTitle}
                </ScrubReveal>
                <RevealItem as={motion.p} className="text-small text-muted">
                  {data.workSummary}
                </RevealItem>
              </header>
              {isGames ? (
                <>
                  <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:hidden">
                    {studios.map((studio, i) => (
                      <StudioCard key={studio.id} studio={studio} index={i} />
                    ))}
                  </ul>
                  <StackedGames />
                </>
              ) : (
                <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
                  {employers.map((employer) => (
                    <EmployerCard key={employer.id} employer={employer} />
                  ))}
                </ul>
              )}
            </Reveal>
            {!isGames && <Clients data={data} />}
          </motion.div>
        </AnimatePresence>
      </Container>
    </section>
  )
}
