import { useEffect, useRef } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'

/**
 * Número que sobe de 0 até `value` em 1.2s quando entra na tela; reconta ao trocar de modo.
 * O sufixo (" mil+") fica na metade do tamanho, ao lado do número, para caber na coluna do celular.
 */
export function Counter({ value, suffix = '', className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced || !inView) {
      el.textContent = String(value)
      return
    }
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, inView, reduced])

  return (
    <span className={`whitespace-nowrap font-display text-stat text-ink tabular-nums ${className}`}>
      <span ref={ref}>{reduced ? value : 0}</span>
      {suffix && <span className="text-[0.5em]">{suffix}</span>}
    </span>
  )
}
