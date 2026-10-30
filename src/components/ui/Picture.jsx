/** Imagem WebP com fallback SVG e dimensões declaradas (sem layout shift). */
export function Picture({ image, alt, className = '', sizes, loading = 'lazy' }) {
  return (
    <picture>
      <source type="image/webp" srcSet={image.webp} sizes={sizes} />
      <img
        src={image.fallback}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={loading}
        decoding="async"
        className={className}
      />
    </picture>
  )
}
