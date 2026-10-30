import { motion } from 'motion/react'

const EASE = [0.22, 1, 0.36, 1]

export const revealParent = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}
export const revealChild = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

/** Seção que revela os filhos (marcados com <RevealItem>) uma única vez ao entrar na viewport. */
export function Reveal({ as: Tag = motion.div, className = '', amount = 0.2, children, ...rest }) {
  return (
    <Tag
      variants={revealParent}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function RevealItem({ as: Tag = motion.div, className = '', children, ...rest }) {
  return (
    <Tag variants={revealChild} className={className} {...rest}>
      {children}
    </Tag>
  )
}
