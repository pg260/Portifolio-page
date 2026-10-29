import { motion } from 'motion/react'
import { Icon } from './Icon.jsx'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-sm text-small whitespace-nowrap cursor-pointer select-none ' +
  'transition-[color,background-color,border-color,box-shadow,filter] duration-(--duration-fast) ease-(--ease-out) ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'

const VARIANTS = {
  primary: 'h-12 px-6 bg-accent text-on-accent mode-transition hover:shadow-glow hover:brightness-110',
  secondary: 'h-12 px-5 border border-hairline-strong text-ink hover:bg-surface-elevated hover:border-accent/40',
  // Botão de loja: mesmo desenho do secundário, altura mínima de toque (44px)
  store: 'h-11 px-3.5 border border-hairline-strong text-ink hover:bg-surface-elevated hover:border-accent/40',
  icon: 'h-11 w-11 text-body hover:text-ink hover:bg-surface-elevated',
}

/**
 * Botão ou link com a mesma aparência.
 * - `href` renderiza <a>; links externos ganham target/rel automaticamente.
 * - `icon` (nome Lucide) à direita por padrão; `iconPosition="left"` para botões de loja.
 */
export function Button({
  variant = 'primary',
  href,
  icon,
  iconPosition = 'right',
  external,
  label,
  className = '',
  children,
  ...rest
}) {
  const isExternal = external ?? (href ? /^https?:/.test(href) : false)
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`
  const iconSize = variant === 'icon' ? 20 : 18
  const content = (
    <>
      {icon && iconPosition === 'left' && <Icon name={icon} size={iconSize} />}
      {children}
      {icon && iconPosition === 'right' && <Icon name={icon} size={iconSize} />}
    </>
  )
  const tap = { whileTap: { scale: 0.98 } }

  if (href) {
    return (
      <motion.a
        href={href}
        className={classes}
        aria-label={label}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...tap}
        {...rest}
      >
        {content}
      </motion.a>
    )
  }
  return (
    <motion.button type="button" className={classes} aria-label={label} {...tap} {...rest}>
      {content}
    </motion.button>
  )
}
