// Lê os tokens de src/index.css para uso fora do CSS (cena 3D, SVG).
// Os fallbacks repetem DESIGN.md v2 para o caso de a folha ainda não ter carregado.

const BASE = {
  canvas: '#0b0e14',
  surface: '#141924',
  'surface-elevated': '#1c2230',
  ink: '#f4f2ec',
  body: '#c9cbd1',
  muted: '#8b91a0',
  hairline: '#262d3b',
  'hairline-strong': '#343c4d',
  'on-accent': '#0b0e14',
}

export const MODE_COLORS = {
  games: { accent: '#ffb224', 'accent-2': '#ff4d8d' },
  fullstack: { accent: '#38e1d6', 'accent-2': '#a3e635' },
}

export function color(name, mode = 'games') {
  if (name === 'accent' || name === 'accent-2') return MODE_COLORS[mode][name]
  if (typeof document === 'undefined') return BASE[name]
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
  return value || BASE[name]
}

const FONTS = {
  display: '"Clash Display", "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
  body: '"Satoshi", "Instrument Sans", ui-sans-serif, system-ui, sans-serif',
  code: 'ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace',
}

/** Pilha de fontes de um token `--font-*` (textos desenhados em canvas na cena 3D). */
export function font(name) {
  if (typeof document === 'undefined') return FONTS[name]
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--font-${name}`).trim()
  return value || FONTS[name]
}

export function colors(mode = 'games') {
  const base = Object.fromEntries(Object.keys(BASE).map((k) => [k, color(k)]))
  return { ...base, ...MODE_COLORS[mode] }
}
