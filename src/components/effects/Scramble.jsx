import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/{}[]=+*#'

/** Texto que embaralha os caracteres ao passar o mouse (ou quando `trigger` muda) e volta ao original. */
export function Scramble({ text, trigger, className = '', as: Tag = 'span' }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(text)
  const raf = useRef(0)

  const run = () => {
    if (reduced) return
    cancelAnimationFrame(raf.current)
    const start = performance.now()
    const dur = 420
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur)
      const settled = Math.floor(p * text.length)
      let out = ''
      for (let i = 0; i < text.length; i++) {
        const ch = text[i]
        out += i < settled || ch === ' ' ? ch : CHARS[Math.floor(Math.random() * CHARS.length)]
      }
      setShown(out)
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else setShown(text)
    }
    raf.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    setShown(text)
    if (trigger !== undefined) run()
    return () => cancelAnimationFrame(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, trigger])

  return (
    <Tag onPointerEnter={run} className={`inline-block tabular-nums ${className}`} aria-label={text}>
      {shown}
    </Tag>
  )
}
