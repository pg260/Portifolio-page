/** Pill de categoria: uma cor só para todas as categorias (DESIGN.md §7). */
export function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-hairline px-2.5 py-1 text-small text-body">
      {children}
    </span>
  )
}
