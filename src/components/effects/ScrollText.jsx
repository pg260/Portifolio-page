import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

function Word({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.18, 1])
  const y = useTransform(progress, range, [6, 0])
  return (
    <motion.span style={{ opacity, y }} className="inline-block will-change-[opacity,transform]">
      {children}&nbsp;
    </motion.span>
  )
}

// Ponto do scroll (0 = topo do parágrafo entrando por baixo, 1 = parágrafo inteiro na tela) em que a primeira palavra
// começa a acender; as outras se espalham daí até 1.
const LEAD = 0.6

/**
 * Parágrafo cujas palavras acendem uma a uma conforme a página rola (scrubbed pelo scroll). A última palavra acende no
 * instante em que o fim do parágrafo entra na tela, então nada fica apagado com o texto todo visível, nem no celular,
 * onde o parágrafo é alto e a estação do Sobre deixa o fim dele rente à borda de baixo.
 */
export function ScrollText({ text, className = '', as: Tag = motion.p }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const words = text.split(' ')
  if (reduced) {
    return (
      <Tag ref={ref} className={className}>
        {text}
      </Tag>
    )
  }
  return (
    <Tag ref={ref} className={className}>
      {words.map((word, i) => {
        const start = LEAD + ((1 - LEAD) * i) / words.length
        const end = Math.min(1, start + ((1 - LEAD) * 1.6) / words.length)
        return (
          <Word key={`${word}-${i}`} progress={scrollYProgress} range={[start, end]}>
            {word}
          </Word>
        )
      })}
    </Tag>
  )
}
