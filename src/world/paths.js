import * as THREE from 'three'

/**
 * Trilhas da câmera por modo. `s` é a coordenada de estação (0 hero, 1 trabalhos, 2 sobre, 3 contato);
 * pontos com `s` fracionário são waypoints do voo entre estações. `pos` = câmera, `look` = alvo.
 * O hero (s = 0) mantém o enquadramento do minigame; o resto do mundo fica em z negativo.
 */
const RAW = {
  games: [
    { s: 0, pos: [0, 0.6, 7.5], look: [0, 0.2, 0] },
    { s: 0.55, pos: [-2.8, -0.4, 1.2], look: [-4.5, -1.8, -14] },
    { s: 1, pos: [-5, -2.4, -16], look: [-8, -3.6, -34] },
    { s: 1.5, pos: [-1.5, 0.4, -34], look: [4, 1, -52] },
    { s: 2, pos: [6, 2, -50], look: [10, 1.6, -70] },
    { s: 2.5, pos: [5, 4, -72], look: [0, 4, -95] },
    { s: 3, pos: [0, 5, -90], look: [0, 4.5, -115] },
  ],
  fullstack: [
    { s: 0, pos: [0, 0.6, 7.5], look: [0, 0.2, 0] },
    { s: 0.55, pos: [1.8, -1.2, 1.5], look: [0, -4, -14] },
    { s: 1, pos: [0, -3.2, -14], look: [0, -5.2, -32] },
    { s: 1.5, pos: [-3, -3, -30], look: [-8, -4.5, -48] },
    { s: 2, pos: [-7, -2.6, -46], look: [-11, -4, -64] },
    { s: 2.5, pos: [-3, -2, -66], look: [0, -3, -88] },
    { s: 3, pos: [0, -1.4, -84], look: [0, -2.2, -110] },
  ],
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))

function build(points) {
  const pos = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p.pos)), false, 'centripetal')
  const look = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p.look)), false, 'centripetal')
  const ss = points.map((p) => p.s)
  const n = ss.length
  return {
    points,
    pos,
    /** Posição e alvo da câmera para a coordenada de estação `s`. */
    sample(s, outPos, outLook) {
      let k = 0
      while (k < n - 2 && s > ss[k + 1]) k++
      const f = clamp01((s - ss[k]) / (ss[k + 1] - ss[k]))
      const u = clamp01((k + f) / (n - 1))
      pos.getPoint(u, outPos)
      look.getPoint(u, outLook)
    },
  }
}

/** Em telas estreitas o minigame fica acima do headline, então o hero mira mais alto. */
export function buildPaths(narrow) {
  const adapt = (list) => list.map((p) => (p.s === 0 && narrow ? { ...p, look: [0, 1.6, 0] } : p))
  return { games: build(adapt(RAW.games)), fullstack: build(adapt(RAW.fullstack)) }
}
