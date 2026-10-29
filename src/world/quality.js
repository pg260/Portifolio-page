import { getGPUTier } from 'detect-gpu'

/**
 * Níveis de qualidade do mundo 3D. "off" = sem WebGL (fundo estático).
 * dpr: resolução; stars/rocks/galaxy: densidade (partículas da galáxia); post: pós-processamento (full = bloom + aberração + vinheta).
 */
export const QUALITY = {
  high: { dpr: [1, 1.75], stars: 9000, rocks: 140, galaxy: 40000, post: 'full' },
  mid: { dpr: [1, 1.25], stars: 5500, rocks: 90, galaxy: 24000, post: 'bloom' },
  low: { dpr: 1, stars: 3000, rocks: 45, galaxy: 12000, post: null },
}
export const TIERS = ['high', 'mid', 'low', 'off']
export const lowerTier = (tier) => TIERS[Math.min(TIERS.length - 1, TIERS.indexOf(tier) + 1)]

export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** Nível inicial pela GPU (benchmarks do detect-gpu servidos em /gpu-benchmarks). `?quality=` força um nível. */
export async function detectTier() {
  const forced = new URLSearchParams(window.location.search).get('quality')
  if (TIERS.includes(forced)) return forced
  if (!supportsWebGL()) return 'off'
  try {
    const gpu = await getGPUTier({ benchmarksURL: '/gpu-benchmarks' })
    if (gpu.tier === 0) return 'low'
    if (gpu.isMobile) return gpu.tier >= 3 ? 'mid' : 'low'
    return gpu.tier >= 3 ? 'high' : gpu.tier === 2 ? 'mid' : 'low'
  } catch {
    return 'mid'
  }
}
