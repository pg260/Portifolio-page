import {
  Apple,
  ArrowUpRight,
  Briefcase,
  Building2,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  Gamepad2,
  Glasses,
  GraduationCap,
  HeartPulse,
  Landmark,
  Layers,
  Mail,
  Menu,
  Play,
  Server,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react'

// O lucide 1.x não traz mais o ícone do LinkedIn; desenhado aqui no mesmo grid 24px.
function LinkedIn(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

const ICONS = {
  apple: Apple,
  'arrow-up-right': ArrowUpRight,
  briefcase: Briefcase,
  building: Building2,
  code: Code2,
  cpu: Cpu,
  database: Database,
  'external-link': ExternalLink,
  gamepad: Gamepad2,
  glasses: Glasses,
  'graduation-cap': GraduationCap,
  'heart-pulse': HeartPulse,
  landmark: Landmark,
  layers: Layers,
  linkedin: LinkedIn,
  mail: Mail,
  menu: Menu,
  play: Play,
  server: Server,
  smartphone: Smartphone,
  wifi: Wifi,
  x: X,
}

/** Ícone Lucide por nome. Decorativo por padrão (aria-hidden); passe `label` para torná-lo significativo. */
export function Icon({ name, size = 18, label, className = '' }) {
  const Component = ICONS[name]
  if (!Component) return null
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false }
  return <Component width={size} height={size} strokeWidth={1.75} className={`shrink-0 ${className}`} {...a11y} />
}
