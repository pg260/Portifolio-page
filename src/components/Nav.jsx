import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { nav, profile, links } from '../data/profile.js'
import { Container } from './ui/Container.jsx'
import { Button } from './ui/Button.jsx'
import { ModeSwitch } from './ModeSwitch.jsx'
import { Scramble } from './effects/Scramble.jsx'
import { useMode } from '../mode/ModeContext.jsx'

/** Observa as seções e devolve o id da que ocupa o meio da viewport. */
function useActiveSection(ids) {
  const [active, setActive] = useState(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])
  return active
}

// o hero também é observado: voltar ao topo limpa o destaque do nav
const SECTION_IDS = ['inicio', ...nav.map((item) => item.href.slice(1))]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const active = useActiveSection(SECTION_IDS)
  const { mode } = useMode()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 h-[72px] border-b backdrop-blur-md transition-[border-color,background-color] duration-(--duration-base) ${
        scrolled || open ? 'border-hairline bg-surface/80' : 'border-transparent bg-transparent'
      }`}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-accent focus:px-4 focus:py-2 focus:text-small focus:text-on-accent"
      >
        Pular para o conteúdo
      </a>
      <Container className="flex h-full items-center justify-between gap-3">
        <a href="#inicio" data-glitch="" className="shrink-0 rounded-sm font-display text-[18px] font-semibold tracking-[-0.01em] text-ink">
          <Scramble text={profile.name} trigger={mode} />
        </a>

        <ModeSwitch size="compact" id="nav" className="mx-auto md:mx-0" />

        <nav aria-label="Principal" className="hidden items-center gap-7 md:flex">
          <ul className="flex items-center gap-7">
            {nav.map((item) => {
              const isActive = active === item.href.slice(1)
              return (
                <li key={item.href} className="relative">
                  <a
                    href={item.href}
                    aria-current={isActive ? 'location' : undefined}
                    className={`inline-flex min-h-11 items-center rounded-sm text-small transition-colors duration-(--duration-fast) hover:text-ink ${
                      isActive ? 'text-ink' : 'text-body'
                    }`}
                  >
                    {item.label}
                  </a>
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-1.5 h-0.5 bg-accent mode-transition"
                      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                    />
                  )}
                </li>
              )
            })}
          </ul>
          <Button variant="secondary" href={links.studio} icon="arrow-up-right" className="max-lg:hidden">
            {links.studioLabel}
          </Button>
        </nav>

        <Button
          variant="icon"
          className="md:hidden"
          icon={open ? 'x' : 'menu'}
          label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((v) => !v)}
        />
      </Container>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            id="menu-mobile"
            aria-label="Principal"
            key="menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 top-full border-b border-hairline bg-surface/95 backdrop-blur-md md:hidden"
          >
            <Container as="ul" className="flex flex-col py-2">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-12 items-center rounded-sm text-body hover:text-ink"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li className="py-3">
                <Button variant="secondary" href={links.studio} icon="arrow-up-right" className="w-full">
                  {links.studioLabel}
                </Button>
              </li>
            </Container>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
