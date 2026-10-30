---
name: pedro-gustavo-portfolio-design-system
version: 2
---

# Portfólio Pedro Gustavo — Design System v2

Fonte única de verdade visual. Todo valor usado no código (cor, fonte, raio, duração) precisa existir aqui.
Tokens em inglês, texto em PT-BR. A v1 (grafite quieto, uma Scene View) foi descartada por ser contida demais.

## 1. Identidade

Landing page de uma página com **dois modos**: **Jogos** (Unity, C#, mobile, VR/AR, Glitch Fish Studio) e
**Fullstack** (empresas em que trabalhou: Poncetech, Agroplay Kids, Bugaboo Studio, ReBuild! Studio, NeoCode Solutions,
IFCE; e os clientes atendidos por meio delas: Sebrae, Senai, Unimed Fortaleza, CVT Fortaleza, m7 Soluções Financeiras).
Quem olha: recrutadores de estúdios e de empresas de software, clientes. O trabalho da página é impressionar
em segundos e deixar claro que Pedro entrega nas duas frentes.

**O elemento memorável:** o interruptor Jogos / Fullstack. Trocar de modo muda a paleta (crossfade), a cena 3D
do hero (objetos trocam com spring), o headline, os cards de trabalhos e os chips de stack, numa única transição
orquestrada. A URL guarda o modo (`#jogos`, `#fullstack`).

**Mood:** cinematográfico, escuro profundo com luz colorida, 3D low-poly flutuando, HUD discreto nos cantos.
Ousadia distribuída: hero 3D full-bleed, cards com tilt, cursor com halo, contadores, reveals de scroll.
O que fica quieto: a tipografia do corpo, o grid, o rodapé. Nada de roxo, nada de gradiente roxo-azul.

## 2. Tokens de cor

Base (igual nos dois modos), em `@theme`:

| Token | Hex | Uso | Contraste sobre canvas |
|---|---|---|---|
| canvas | `#0B0E14` | fundo (com vinheta radial e fog do 3D) | — |
| surface | `#141924` | cards, painéis, nav | — |
| surface-elevated | `#1C2230` | hover de card, menu mobile | — |
| ink | `#F4F2EC` | títulos | 17:1 |
| body | `#C9CBD1` | parágrafos | 12:1 |
| muted | `#8B91A0` | metadados, HUD | 6.2:1 |
| hairline | `#262D3B` | bordas 1px | — |
| hairline-strong | `#343C4D` | bordas em hover/focus | — |
| on-accent | `#0B0E14` | texto sobre accent | ≥ 10:1 nos dois modos |
| focus-ring | = accent do modo | anel de foco 2px + offset 2px | — |

Por modo (`:root[data-mode="…"]` sobrescreve, com `transition: color/background 400ms`):

| Token | Jogos | Fullstack | Uso |
|---|---|---|---|
| accent | `#FFB224` âmbar (10.9:1) | `#38E1D6` ciano-menta (12.6:1) | CTA primário, interruptor, luz 3D, progresso |
| accent-2 | `#FF4D8D` magenta (6.1:1) | `#A3E635` lima (13:1) | detalhes HUD, segundo brilho, hover |
| glow | accent a 28% | accent a 28% | halos radiais atrás do 3D e dos cards |
| accent-soft | accent a 12% | accent a 12% | fundo de chips, pill ativa |

Regras: `accent` em no máximo um CTA por viewport além de foco, interruptor e luz. `accent-2` só em detalhes
pequenos (HUD, segundo brilho, sublinhado). Cores do 3D vêm dos mesmos tokens via `src/lib/tokens.js`.

## 3. Tipografia

Fontshare (gratuitas), carregadas com `display=swap`:

```
https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&f[]=satoshi@400,500,700&display=swap
```

| Token | Família | Uso |
|---|---|---|
| `--font-display` | Clash Display | h1, h2, h3, interruptor, números dos contadores, e-mail |
| `--font-body` | Satoshi | corpo, nav, botões, chips, HUD (`tabular-nums`) |
| `--font-code` | mono do sistema (`ui-monospace`, SF Mono, Cascadia Code, Consolas) | só código dentro da cena 3D (janela do minigame Fullstack); nada baixado |

| Papel | Tamanho | Peso | Line-height | Tracking |
|---|---|---|---|---|
| display (h1) | `clamp(2.75rem, 1.6rem + 5.2vw, 6rem)` = 44 → 96px | 600 | 0.98 | -0.03em |
| h2 | `clamp(2rem, 1.4rem + 2.6vw, 3.5rem)` = 32 → 56px | 600 | 1.04 | -0.02em |
| h3 | `1.5rem` = 24px | 600 | 1.15 | -0.01em |
| stat (contadores) | `clamp(2rem, 1.5rem + 2vw, 3rem)` | 600 | 1 | -0.02em |
| lead | `clamp(1.0625rem, 1rem + 0.45vw, 1.25rem)` | 400 | 1.5 | 0 |
| body | `1.0625rem` = 17px | 400 | 1.55 | 0 |
| small | `0.875rem` = 14px | 500 | 1.4 | 0 |
| caption / HUD | `0.75rem` = 12px | 500 | 1.3 | 0.08em (HUD é a única exceção em caixa alta) |
| contact | `clamp(1.75rem, 1rem + 3vw, 3.5rem)` | 600 | 1.05 | -0.02em |

Linhas: parágrafos `max-w-[60ch]`, lead `max-w-[36ch]`, h1 `max-w-[12ch]`. Sentence case em tudo exceto o HUD.

## 4. Layout

- Container `max-w-[1240px]`, gutters `px-5` (360px) → `px-8` (768px) → `px-12` (1280px). Grid de 12 colunas em `lg`.
- Nav fixa 72px, `surface` a 80% com `backdrop-blur-md` (blur permitido na v2 só na nav e no menu mobile).
- Hero `min-h-[100svh]`, cena 3D absoluta ocupando o hero inteiro; texto à esquerda (colunas 1–7), HUD nos quatro cantos (`caption`), interruptor grande abaixo do lead.
- Trabalhos: jogos agrupados pelo estúdio em que foram feitos, um card por estúdio (Bugaboo, Agroplay Kids, ReBuild!), em `md:grid-cols-2` abaixo de `lg` e em pilha sticky no desktop; no Fullstack, dois níveis: as empresas em que trabalhou em `sm:grid-cols-2 xl:grid-cols-3` (6 cards 4:3) e, abaixo, "Clientes atendidos" em `grid-cols-2 md:grid-cols-3 xl:grid-cols-5` (5 cards compactos).
- Sobre: texto (colunas 1–6) e chips + contadores (colunas 7–12).
- Ritmo vertical: `py-20` mobile, `py-28` md, `py-36` lg. Espaçamento: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 144.
- Breakpoints: 640, 768, 1024, 1280. Testar 360, 390, 768, 1024, 1440, 1920. Alvos ≥ 44px.

## 5. Forma, elevação, luz

| Token | Valor | Onde |
|---|---|---|
| `--radius-sm` | 6px | botões, chips, interruptor interno |
| `--radius-md` | 14px | cards, painéis, menu mobile |
| `--radius-lg` | 24px | cards de trabalho, pôster |
| `--radius-full` | 9999px | interruptor externo, cursor, pontos HUD |

- Bordas 1px `hairline`; em hover `hairline-strong` + brilho: `box-shadow: 0 0 0 1px accent/40, 0 20px 60px -20px glow`.
- Glow radial atrás do hero e de cada card ativo: `radial-gradient(circle at var(--mx) var(--my), glow, transparent 60%)`,
  coordenadas do cursor via CSS vars. Vinheta radial no canvas (`#0B0E14` → 60% preto nas bordas).
- Sem sombra cinza difusa em repouso; profundidade = luz colorida + hairline.

## 6. Motion

`<MotionConfig reducedMotion="user">` na raiz. Só `transform`, `opacity`, `filter` em elementos pequenos.

| Token | Valor |
|---|---|
| `--duration-fast` / `base` / `slow` / `mode` | 150ms / 280ms / 700ms / 400ms |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-spring` (Motion) | `{ type: "spring", stiffness: 260, damping: 24 }` |
| `--ease-tilt` (Motion) | `{ type: "spring", stiffness: 180, damping: 20, mass: 0.6 }` |

**Load (intro + uma sequência):** intro de 1.1s na primeira visita da sessão (brand, contador 0→100, linha de progresso; sobe com
`cubic-bezier(0.76,0,0.24,1)` em 700ms; pulada com reduced motion) → objeto 3D entra com spring (200ms) → headline sobe palavra a
palavra (clip + y, stagger 70ms) → lead, interruptor e CTAs (fade + y) → HUD liga os cantos (opacity).

**Camadas globais:** grão de filme (SVG `feTurbulence`, opacidade 7%, `overlay`, animado em steps; estático com reduced motion),
cursor customizado (ponto 8px + anel 36px que cresce 1.8× sobre links/botões/canvas + halo 320px `screen`; só `pointer: fine`,
cursor nativo oculto), barra de progresso, títulos fantasma (palavra contornada a 22vw atrás de cada seção, parallax ±120px),
faixa marquee entre hero e trabalhos (42s linear, pausa no hover, estática com reduced motion).

**Trabalhos no desktop (≥ 1024px):** cards de estúdio grudam no topo (`sticky`, 112px + 18px por índice) e encolhem até 3,5% por
card conforme o próximo chega (`useScroll` do container). Abaixo disso, grid com tilt.

**Troca de modo (≤ 700ms):** tokens de cor fazem crossfade 400ms → objetos do modo antigo encolhem (spring) enquanto os novos crescem →
headline e cards trocam com `AnimatePresence mode="wait"` (saída 150ms, entrada escalonada) → contadores recontam.

**Scroll-linked (scrub):** texto do hero sobe 160px e some até 55% do hero; parágrafos do Sobre acendem palavra a palavra
(opacidade 0.18 → 1, janela de 1,6 palavra); títulos h2 se escrevem da esquerda (`clip-path inset` + x -24px) entre 95% e 55% da
viewport; marquee acelera e inverte com a velocidade do scroll (`useVelocity`, fator até 4×); títulos fantasma ±120px.

**Clique e arrasto no hero:** cada modo tem seu minigame (ver "Estação 0" em §7). Clique e arrasto se separam por 6px; arrastar gira
a Terra (Jogos, só ponteiro fino) ou move a div (Fullstack, também com o dedo: a página não rola enquanto a div está presa). Nada usa
`OrbitControls`, que brigaria com a câmera em trilha. O hero inteiro é `user-select: none` para o arrasto não selecionar o título.

**Troca de modo (dramática, 1150ms):** cortina na cor do modo novo entra em wipe diagonal do canto inferior esquerdo (420ms,
`cubic-bezier(0.76,0,0.24,1)`) com scanlines, três barras de glitch em `accent-2`, rótulo gigante com scramble e o HUD do modo;
aos 380ms o conteúdo troca por baixo e o 3D explode (pulso 1.6, quatro ondas, kick de câmera com tremor); aos 520ms a cortina sai
para o canto superior direito com um flash `ink` (0.85 → 0 em 450ms); durante tudo `main` e `header` tremem (`mode-shake`) e os
elementos `[data-glitch]` (h1, h2, brand, e-mail) sofrem RGB split. Com reduced motion a troca é instantânea.

**Física no Sobre:** chips de stack são corpos rígidos (matter-js, chanfro = altura/2) num contêiner de 300/320px; arrastar e
atirar com ponteiro fino, botão "Sacudir" para toque e teclado. **Jogos (espaço): gravidade zero**, restituição 0.9: flutuam a
~20px/s, quicam nas bordas e uns nos outros e balançam até ±0,25 rad em volta da horizontal (choques e arremessos giram o chip,
depois ele se endireita); "Sacudir" dá um empurrão de 6–12px por passo em direção aleatória; trocar para Jogos faz o conjunto
nascer espalhado dentro da caixa. **Fullstack: gravidade 1.2**, restituição 0.35: os chips caem de cima da caixa e se empilham
(o teto fecha a caixa quando todos já caíram dentro dela); "Sacudir" joga a pilha para cima. Nos dois, o botão fica com opacidade 0.4 quando um chip passa por
trás dele (colisão exata com a área do botão + 4px); volta inteiro no foco e no hover, menos enquanto se arrasta um chip. **Contato** não tem interação própria: o fundo é o mundo 3D (a galáxia no Jogos, o globo de rede no Fullstack), sem nada
por cima. **Fundo de Trabalhos:** canvas 2D com estrelas que fogem do cursor
(Jogos) ou rede de nós atraídos pelo cursor (Fullstack). **Cards de jogo:** cópia da imagem fatiada em glitch (500ms, steps) e
varredura de scanline no hover. **Rastro do cursor:** partículas na cor do modo (canvas 2D, `screen`).

**Cards de empresa:** viram no clique/Enter (rotateY 180°, spring 160/20) mostrando descrição, stack e os clientes atendidos por ela; "ver mais" aparece no hover.
**Chips de stack:** sobem 3px e escalam 1,04 no hover. **Brand na nav:** scramble de 420ms no hover e ao trocar de modo.
**Rodapé:** "voltar ao topo" com texto circular girando (18s, linear) e seta magnética.

**Resposta ao usuário:** objetos 3D seguem o ponteiro (±0.25 rad) e a câmera desce 0.8 unidade com o scroll do hero; cards com
tilt (±8°) e brilho que segue o cursor; botões primários magnéticos (até 6px); cursor com halo de 280px `mix-blend-mode: screen`
(só `pointer: fine`); interruptor com pill que desliza (`layoutId`); nav com sublinhado que desliza; barra de progresso de scroll
no topo (2px, accent, `scaleX`).

**Scroll:** cada seção faz um reveal uma única vez (`whileInView`, `once`, stagger 60ms entre filhos). Sem reveal por card individual além do stagger.

**Reduced motion:** troca de modo sem transições, 3D estático (sem float, parallax ou pointer), sem tilt, sem cursor custom,
contadores já no valor final, reveals só em opacidade. O mundo 3D vira uma tela parada no topo (rola junto com o hero, `frameloop`
`demand`), a câmera não viaja, scroll nativo sem Lenis e links âncora saltam direto.

**Performance:** um único canvas WebGL para a página toda (ver §8), `three` fora do bundle inicial (o mundo é `lazy`), níveis de
qualidade por GPU com queda automática quando o fps degrada; sem WebGL, o hero cai para o fundo estático (grid CSS + glow).

## 7. Componentes

**Nav** — brand (display 600, 18px) · `ModeSwitch` compacto · links Trabalhos, Sobre, Contato (small) · CTA secundário com o estúdio (`links.studioLabel`, hoje "Glitch Fish Studio").
Mobile: brand, `ModeSwitch` compacto, botão de ícone; menu em `surface` com blur.

**ModeSwitch** — segmented control: trilho `surface` com borda `hairline`, `radius-full`; pill em `accent` com `layoutId`;
rótulos "Jogos" / "Fullstack" em display 600; ícone pequeno em cada (gamepad / code). Tamanhos: compacto 40px (nav) e grande 56px (hero).
`role="tablist"`, setas do teclado trocam, `aria-selected`.

**Hero** — h1 por modo ("Faço jogos que as pessoas realmente jogam." / "Construo sistemas que empresas usam todo dia."),
lead por modo, `ModeSwitch` grande, CTAs (primário "Ver trabalhos", secundário "Glitch Fish Studio" ou "LinkedIn"), HUD nos cantos
(`SCENE 01 · JOGOS`, fps, `PLAYER · PEDRO GUSTAVO`, dica do minigame, coordenadas do ponteiro, placar). Atrás: a estação 0 do
mundo 3D. No celular o headline desce para o pé do hero (`justify-end`, `pb-28`) e o HUD inferior empilha (dica em cima, placar
embaixo).

**Estação 0 (minigames do hero)** — um jogo por modo, no mundo 3D. **Jogos:** Terra com Lua. Clicar (ou tocar) lança um
meteoro que passa pelo ponto clicado, vindo sempre do mesmo radiante (alto, à direita, à frente) a 4,5 unidades/s: na Terra ele
cai exatamente ali; no espaço segue em linha reta por 3,5s e some (encolhe nos últimos 0,5s). Pool fixo de 12 meteoros (as rochas
com crateras do cinturão, textura da Lua); passou disso, o mais antigo é reciclado. Arrastar a Terra a gira (clique e arrasto se
separam por 6px): 0,003 rad por px na horizontal, metade na vertical (inclinação limitada a ±0,6 rad), e a Terra alcança o ponteiro
com taxa 12/s, para o arrasto ter peso. A Lua fica presa à órbita (0,12 rad/s): clique soma 2,4 rad/s; segurar a controla (ela
segue o ponto da órbita mais perto do ponteiro, com a mesma taxa 12/s e no máximo 3,5 rad/s; mouse parado = Lua parada); soltar em
movimento a arremessa com 60% da velocidade do gesto (até 5 rad/s), que volta ao normal com taxa 0,55/s. A órbita acende (opacidade 0,3 → 0,75) com a Lua na mão ou fora do ritmo. Área de toque da
Lua com o dobro do raio. HUD: impactos, meteoros no céu, maior impacto. **Fullstack:** "centralize a div". Janela de navegador de vidro
(3,6 × 2,5 unidades; compacta com 1,95 de altura no celular): `meshPhysicalMaterial` `surface` a 72% com clearcoat, aro de 0,018
em `accent` ×1,5 sem tone mapping (brilha no bloom), halo aditivo atrás, bolinhas de semáforo (`#ff5f57`, `#febc2e`, `#28c840`),
barra de endereço e atalhos em `--font-code`. Área de conteúdo com grade de 20px, linhas de centro tracejadas e alvo fantasma
pulsando; guias inteligentes rosa `#ff4da6` (cor de guia de ferramenta de design, só aqui) acendem no eixo alinhado. A div (`accent-2`,
80 × 50px de "CSS", 1 unidade = 100px) nasce no canto, com a margin padrão do body. Arrastar a leva (gruda no eixo a 5px do centro,
8,5px no toque); soltar em movimento a arremessa. Clicar (na janela ou na própria div) a empurra até o ponto clicado sobre gelo:
atrito 2,2/s (distância = v0/2,2), erro de ±30% e ±11°, quique 0,55 nas bordas; o ímã só pega a div quase parada (< 0,2 un/s).
Atalhos: `display: flex` estica a div na altura toda e volta (falta o `align-items`), `left: 50%` põe a borda esquerda no centro
(falta o `translateX(-50%)`), `place-items: center` centraliza mas não vale recorde. Centralizou (0px): confete de 56 peças nas cores
do modo, toast, pulso 0,6; 1,6s depois o caos desfaz (nunca o mesmo duas vezes): DevTools abre/fecha à direita (centro anda 55px),
scrollbar aparece/some (7,5px), uma div irmã empurra a nossa, o cliente pede "só 1px" e ela voa 109px, `float: left` a joga no canto;
cada caos pisca o glitch da página por 380ms (`html.sys-glitch`) com tranco de câmera 0,25. HUD: desvio (px), centralizadas (só
rodadas abertas pelo caos ou pelo começo) e recorde (s até reconsertar). Entrar no modo recarrega o layout; o placar fica. Os jogos só rodam com o
hero na tela e só aceitam ponteiro vindo da zona `data-world-zone="hero"`. Posição e tamanho ancorados na tela (ver §8).

**Card de estúdio (jogos)** — `radius-lg`; capa do projeto selecionado (16:10 no celular e tablet, 7 colunas no desktop) com zoom
lento no hover (ícones quadrados ficam centralizados, com `radius-lg`, sobre a própria imagem desfocada, única exceção de blur fora da nav; projeto
sem imagem mostra o título em display `h2` sobre um brilho `accent-soft`). Ao lado ou abaixo: nome do estúdio (h3 em `caption`
maiúsculo `accent`) e período, cargo em small muted, abas de miniatura (48px abaixo de `lg`, 56px no desktop, `radius-md`; a
selecionada com borda `accent` e `glow`, as outras a 60%; setas, Home e End movem entre elas) com contador "1 / 4", e o painel do
projeto: pill de categoria, meta em small muted (downloads), título h4, descrição e links de loja (botões de 44px). Trocar de
aba faz crossfade da capa (500ms) e do texto (saída 120ms, entrada 300ms); sem animação com reduced motion. Estúdio com um projeto
não mostra abas. Tilt ±8° e glow que segue o cursor. Índice "01" só aqui, porque é uma seleção de fases.

**Card de empresa** — `radius-lg`, `surface`, logo (44px de altura e até 160px de largura, então os compridos ficam mais baixos; `ink`, vira `accent` no hover) ou, sem logo, ícone em `accent-soft` e período no topo, nome em display 600 grande e cargo em small muted;
no verso, descrição, chips e "Clientes · …" (derivado do `via` de cada cliente). O nome fica sempre em tipografia, mesmo com logo.
**Card de cliente** — `radius-lg`, `surface`, borda `hairline`, sem clique: logo (40px, `ink`) ou ícone do setor, nome em `h3`, setor em small muted, o que foi feito
em small e "via <empresa>" em caption `accent` quando `via` estiver preenchido.

**Chip de stack** — `accent-soft` fundo, texto `ink`, `radius-sm`, 36px. **Contador** — display `stat`, sobe de 0 em 1.2s uma vez; sufixo (" mil+") a 0,5em na mesma linha.

**Botão primário** — `accent`, `on-accent`, 48px, `radius-sm`, magnético, hover com brilho `glow`. **Secundário** — borda `hairline-strong`,
`ink`, hover `surface-elevated`. **Ícone** — 44px. Todos com foco visível.

**Contato** — e-mail em `contact`, sublinhado `accent` em hover (texto selecionável); três botões secundários; sem campo
interativo, o fundo é o mundo 3D. **Rodapé** — caption muted.

## 8. Imagens e mundo 3D

Jogos em `public/images/` (WebP + SVG), alt descritivo, `loading="lazy"`, dimensões declaradas. Logos de empresas e clientes em
`public/images/empresas/<id>` (SVG, ou PNG com transparência), monocromáticos (todo branco, vazados de verdade, recortados no conteúdo): entram como
máscara CSS e são pintados com os tokens, então nunca aparecem nas cores da marca. `ratio` (largura/altura) vai em `companies.js`. Texturas 3D em `public/textures/` (WebP). Ícones Lucide; LinkedIn inline.

**Um mundo, uma câmera.** Um canvas R3F fixo atrás da página inteira (`-z-10`, sem eventos próprios); os eventos vêm do `#root`
(`eventPrefix="client"`) e cada interação 3D só aceita ponteiro que nasce na sua zona DOM (`data-world-zone`). O scroll é a câmera.

| Parte | Regra |
|---|---|
| Scroll | Lenis (lerp 0.085, sem `syncTouch`); links âncora em 1.6s respeitando `scroll-margin-top` 88px e focando o destino |
| Estações | 0 hero, 1 trabalhos, 2 sobre, 3 contato. Em cada seção a câmera fica parada nos primeiros 12% e voa (smootherstep) na última ≤ 0,9 viewport antes da próxima âncora |
| Trilhas | Catmull-Rom centrípeta por modo, com waypoints entre estações. Jogos sobe e serpenteia pelo cinturão de asteroides; Fullstack desce rente ao grid de dados |
| Câmera | amortecimento 0.28 (posição) / 0.32 (alvo); parallax de ponteiro fora do hero (0.45 x, 0.25 y); roll pela velocidade lateral até ±0.12 rad; kick na troca de modo (1.8 unidades + tremor, decai 1.6/s) |
| Céu | nebulosa em shader de tela cheia que gira com yaw/pitch da câmera, cores do modo, grid 0.25 (Jogos) / 1 (Fullstack); manchas de cor a 40% no Jogos e 55% no Fullstack (a cor vem dos marcos: nebulosas e astros no Jogos, infraestrutura no Fullstack) |
| Nebulosa do hero (Jogos) | textura pintada uma vez na GPU (half float, 1024px; 512 em telas < 1024px) em dois passos com `compileAsync`: campos de ruído, depois luz de um aglomerado no miolo (marcha de 8 amostras: bordas viradas para a luz acendem, costas na sombra). Paleta: corpo `#3b6cf6` → `#8b5cf6` → `accent-2`, borda acesa `accent-2` → `accent` → `#ffe2b8`, poeira escura que tapa o fundo. Billboard de 95 × 70 unidades a 130 da câmera, atrás da Terra (celular: 60 × 48, brilho 0.8); gira 0,004 rad/s; acende quando a textura fica pronta e apaga entre as estações 0.35 e 0.85 |
| Marcos da viagem (Jogos) | ancorados na tela por estação (posição NDC + profundidade), sempre longe do texto: gigante gasoso com anéis em Trabalhos (−0.72, −0.32; raio 8, faixas `#f1dcb7` `#d29a62` `#9c4f2e` `#5a3a4a`, atmosfera `#ffb27a`, sombra no anel); sistema binário em Sobre (0.58, 0.52; `#fff1d6` e companheira `#ff9ec4`, coroa com raios); nuvem de 18 billboards que a câmera atravessa entre Sobre e Contato (só entre as estações 2.05 e 2.85, brilho 0.1–0.18 por billboard); galáxia espiral de partículas à direita no Contato (0.5, 0.3; três braços, miolo `#ffd9a0`). Raios encolhem em telas em retrato. Somem no Fullstack (fade 0,25s) |
| Marcos da viagem (Fullstack) | "infraestrutura viva", tudo em vidro escuro `#07131a` com arestas e luzes em `accent`/`accent-2`/`#e6fdff` acima do limiar do bloom, névoa `#10303a`; nada de caixa chapada. **Skyline** no horizonte do hero (z −140 a −260): prédios de janelas em grade com colunas de dados subindo ou pele de vidro com lajes e varreduras, recuos e antenas piscando, código caindo em colunas (células de 1.6, duas gotas por coluna) pela maior parte das fachadas em `accent-2` com a cabeça em `#e6fdff`; quase nenhum à esquerda (título), sobe atrás da janela do minigame; o topo nunca passa de y 0.55 NDC (tablet: 0.3, baixo e à direita; celular: sem skyline); apaga entre 0.35 e 0.85. **Datacenter** em Trabalhos: fileiras de racks de vidro (1.1 × 4.2 × 1.0) dos dois lados da trilha (estação 0.58 a 1.68), unidades de servidor com LEDs piscando e varredura de atividade, arcos de luz nos vãos e bandejas de cabos com pulsos; aparece 0.25–0.6, apaga 1.7–2.0 (brilho 0.6 em telas < 1024px). **Núcleo de banco de dados** em Sobre (0.6, 0.5; raio 2.4; telas estreitas: ao lado do título, 0.55, 0.62, raio 1.1): quatro discos de vidro com blocos de dados girando, anéis tracejados e espiral de partículas entrando e saindo; aparece 1.3–1.85, apaga 2.2–2.45. **Paredões de código** no fundo, aditivos e com bordas que somem no escuro (62% chuva Matrix densa com duas gotas por coluna, 38% listagens de código numeradas subindo uma linha por vez com a linha atual acesa; caracteres maiores quanto mais longe): um cânion dos dois lados da viagem de Trabalhos em diante (paredões de 22–38 × 40–74 a 20–34 unidades da trilha, de z −14 a −250, voltados para ela e um pouco para quem chega) e dois de frente para a câmera no fundo de cada estação (hero: atrás do skyline a 320–340; demais: 150–180). Parada numa estação, uma máscara das zonas de texto (borrada, 96 × 64 por estação) apaga 96% deles atrás do texto; nos voos aparecem inteiros. **Chuva de código** (Matrix) pela viagem inteira: 440 colunas de glifos (atlas 8 × 8, mono 600) que sempre encaram a câmera, rastro em `accent` (30% em `accent-2`) com a cabeça em `#e6fdff` acima do bloom, 6–16 células/s; metade perto das estações (colunas curtas, 6–20 células) e metade pelos voos (10–36); somem perto da câmera e depois de 85 unidades. **Painéis de código** de vidro quase opaco (90%) com semáforo e título: trechos sendo digitados (0,035s por caractere, cursor em bloco piscando, 5s parado, apaga e recomeça; `modes.fullstack.world.code`: Java, React, SQL, Node.js, C#, Angular, Git, REST, TypeScript, Docker, CSS, Spring, CI, Jest) alternados com terminais de log rolando com a linha nova acesa (`world.logs`: api, deploy, banco, testes); reordenados de trás para frente a cada frame e somem perto da câmera. Onde ficam: dos lados do voo hero → Trabalhos, pendurados no alto do corredor de racks, monitores na meia altura dos racks (acendem quando a parada de Trabalhos acaba), no voo para o Sobre, um túnel de 36 entre Sobre e Contato (estação 2.12 a 2.92) e parados nos vãos livres de cada estação em duas camadas: perto (até 2 em Trabalhos e Sobre, 3 no Contato; largura 24% da tela, 240–460px, a 13–20 unidades) e janelas menores ao fundo (até 3 por estação, hero incluído; 55% disso, mínimo 150px, a 26–36 unidades). **Zonas de texto:** a página mede onde cada texto passa durante a parada de cada estação (`world.zones`, da chegada até o voo começar, mais a nav; somados a janela do minigame, o núcleo e o globo); colunas de chuva e painéis parados que cairiam em cima delas ficam de fora, então nas paradas o código só ocupa os vãos e nos voos passa por todo lado. **Globo de rede** no Contato (0.5, 0.12; raio 8): terra em 16000 pontos, arcos de Fortaleza para 10 cidades com pacotes correndo, marcador de Fortaleza com onda; telas estreitas: raio 3.4 no vão entre os links e o rodapé (celular 0.35, −0.45; tablet 0.62, −0.45) e acende mais tarde (2.55–2.95). Os shaders compilam quando o navegador fica ocioso depois do load (`usePrecompile`, também no Jogos), para a primeira passagem por cada marco não travar. Somem no Jogos (fade 0,25s) |
| Estrelas | quads instanciados de 1,6–5,2px que viram rastro na direção do voo (exposição 0.05s, máx. 10 unidades); 2/3 num tubo em volta das trilhas; aditivas, sem tone mapping, tom puxado para `accent`/`accent-2` |
| Asteroides (Jogos) | 3 rochas geradas (fbm + 5 crateras com borda, normais suaves), textura da Lua triplanar com tom `#c9bca8`; ao longo da trilha fora do hero; encolhem rente à câmera |
| Grid de dados (Fullstack) | plano 240×240 em y −6.5, linhas a cada 2 e 10 unidades com pacotes correndo, some com a distância |
| Pós | high: Bloom (limiar 0.85, intensidade 0.9) + aberração cromática ligada à velocidade (até 0.004) + vinheta; mid: só Bloom; low e telas < 1024px: nenhum |

**Níveis de qualidade** (detect-gpu, benchmarks servidos de `/gpu-benchmarks`; `?quality=high|mid|low|off` força):

| Nível | dpr | Estrelas | Rochas | Galáxia | Infra |
|---|---|---|---|---|---|
| high | 1–1.75 | 9000 | 140 | 40000 | 1 |
| mid | 1–1.25 | 5500 | 90 | 24000 | 0.75 |
| low | 1 | 3000 | 45 | 12000 | 0.5 |
| off | sem WebGL: fundo estático no hero | — | — | — | — |

Infra é a fração das contagens dos marcos do Fullstack (150 prédios, 600 partículas do núcleo, 440 colunas de chuva, painéis dos voos
com mínimo de 60%, paredões do cânion com mínimo de 55%, 16000 pontos do globo); no celular ela cai a 65%. Telas < 1024px usam 60% das estrelas, rochas e partículas da galáxia. O monitor de fps desce um nível quando degrada; se cair a `off`, tenta `low` uma vez
após 12s.

**Enquadramento do hero:** o minigame é posicionado pela tela, não pelo mundo. Desktop: centro em 72% da largura e 47% da altura,
raio 17% da altura. Celular (< 768px): centrado, a max(170px, 23,5% da altura), raio min(62px, 7,5% da altura). Tablet: 70% / 65%,
raio 92px. Em todos, o raio encolhe (passos de 5%) até a órbita da Lua projetada em perspectiva caber a 16px das bordas.
A janela do Fullstack usa o mesmo ponto: 92% do tamanho da Terra fora do celular (virada 0,2 rad para o centro); no celular, em versão
compacta, encaixada na faixa livre entre o rótulo do HUD e o bloco de texto (medida pelo Hero em `world.view.free`, 10px/14px de
folga), limitada à largura menos 32px. Sem faixa útil (escala < 0,75, celulares baixos em que o título começa sob o HUD) ela some.

## 9. Voz

PT-BR, sentence case, frases curtas, verbos ativos. Primeira pessoa no hero e no Sobre. Trabalhos descritos resultado primeiro.
CTAs dizem o que acontece ("Ver trabalhos", "Abrir no itch.io", "Enviar e-mail"). HUD em caixa alta curta é a única exceção.

## 10. Não fazer

- Roxo, gradiente roxo-azul, blobs desfocados soltos. Fundo slate.
- Blur fora da nav, do menu mobile e do backdrop de ícone nos cards. Sombra cinza difusa em repouso.
- Pulsos e loops decorativos além da marquee, do grão e das órbitas 3D. Reveal por item fora do stagger da seção.
- Mais de um CTA primário por viewport. Caixa alta fora do HUD.
- Valor visual solto no JSX. Conteúdo fora de `src/data/`.
- Segundo canvas WebGL fixo ou `OrbitControls` no mundo: cenas novas entram como estações da trilha da câmera.
