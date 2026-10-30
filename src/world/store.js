/** Seções que são "estações" da câmera, na ordem da página. */
export const STATIONS = ['inicio', 'trabalhos', 'sobre', 'contato']

/**
 * Estado do mundo 3D compartilhado entre DOM e cena, fora do React: lido e escrito a cada frame
 * sem causar re-render. Sem importar three aqui: este módulo entra no bundle inicial. Quem escreve: scroll.js (scroll/âncoras), Hero (telemetria, visibilidade),
 * CameraRig (velocidade da câmera), minigames (fx).
 */
export const world = {
  pointer: { x: 0, y: 0 },
  scroll: { y: 0, velocity: 0, limit: 1 },
  /** scrollY em que a câmera chega em cada estação (mesma ordem de STATIONS) */
  anchors: [0],
  /**
   * Onde há texto na tela em cada estação (mesma ordem de STATIONS): retângulos [x0, y0, x1, y1] em NDC
   * (−1..1, y para cima) cobrindo tudo o que passa pela tela enquanto a câmera está parada ali. Os marcos
   * decorativos se encaixam fora deles. `version` muda a cada medida.
   */
  zones: { list: [], version: 0 },
  /**
   * hero: fração do hero ainda visível (1 = topo da página, 0 = fora da tela).
   * free: faixa vertical livre do hero (px), entre o rótulo do HUD e o bloco de texto; o minigame do
   * celular se encaixa nela.
   */
  view: { hero: 1, free: { top: 112, bottom: Infinity } },
  /** pulso de energia e tranco de câmera (trocas de modo, impactos) */
  fx: { pulse: 0, kick: 0 },
  /** velocidade da câmera no espaço da vista (rastros das estrelas) e coordenada de estação atual */
  camera: { velView: { x: 0, y: 0, z: 0 }, speed: 0, station: 0 },
  /** elementos do HUD do hero, preenchidos pelo próprio Hero */
  telemetry: { fps: null, s1: null, s2: null, s3: null },
  lenis: null,
}

/** O evento de ponteiro veio de dentro da zona de jogo indicada (e não de um botão/texto por cima)? */
export function fromZone(e, zone) {
  const target = e?.nativeEvent?.target || e?.target
  return Boolean(target?.closest?.(`[data-world-zone="${zone}"]`))
}
