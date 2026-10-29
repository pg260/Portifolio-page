import { profile } from '../data/profile.js'
import { Container } from './ui/Container.jsx'
import { BackToTop } from './effects/BackToTop.jsx'

export function Footer() {
  return (
    <footer className="border-t border-hairline py-10">
      <Container className="flex items-center justify-between gap-6">
        <p className="text-caption text-muted">
          © {new Date().getFullYear()} {profile.name}. Todos os direitos reservados.
        </p>
        <BackToTop />
      </Container>
    </footer>
  )
}
