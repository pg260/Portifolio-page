/** Container de 1200px com os gutters do DESIGN.md §4. */
export function Container({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`mx-auto w-full max-w-[1200px] px-5 md:px-8 xl:px-12 ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
