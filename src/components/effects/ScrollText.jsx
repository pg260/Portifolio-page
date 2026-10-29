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

/** Parágrafo cujas palavras acendem uma a uma conforme a página rola (scrubbed pelo scroll). */
export function ScrollText({ text, className = '', as: Tag = motion.p }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.92', 'end 0.45'] })
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
        const start = i / words.length
        const end = Math.min(1, start + 1.6 / words.length)
        return (
          <Word key={`${word}-${i}`} progress={scrollYProgress} range={[start, end]}>
            {word}
          </Word>
        )
      })}
    </Tag>
  )
}
