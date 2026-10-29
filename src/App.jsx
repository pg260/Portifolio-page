import { Nav } from './components/Nav.jsx'
import { Hero } from './components/Hero.jsx'
import { Marquee } from './components/Marquee.jsx'
import { Work } from './components/Work.jsx'
import { About } from './components/About.jsx'
import { Contact } from './components/Contact.jsx'
import { Footer } from './components/Footer.jsx'
import { Intro } from './components/effects/Intro.jsx'
import { ModeTransition } from './components/effects/ModeTransition.jsx'
import { ScrollProgress } from './components/effects/ScrollProgress.jsx'
import { Cursor } from './components/effects/Cursor.jsx'
import { CursorTrail } from './components/effects/CursorTrail.jsx'
import { Grain } from './components/effects/Grain.jsx'
import { WorldLayer } from './world/WorldContext.jsx'

export default function App() {
  return (
    <Intro>
      <WorldLayer />
      <ModeTransition />
      <ScrollProgress />
      <CursorTrail />
      <Cursor />
      <Grain />
      <Nav />
      <main id="conteudo">
        <Hero />
        <Marquee />
        <Work />
        <About />
        <Contact />
      </main>
      <Footer />
    </Intro>
  )
}
