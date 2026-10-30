# AI Kit do projeto — skills e MCPs

Tudo que o Claude (Cowork ou Claude Code) usa para redesenhar e manter este portfólio.

As skills vivem em `ai-kit/skills/` (fonte versionada). O Claude Code só carrega skills de `.claude/skills/`,
então, uma vez por clone, rode:

```bash
npm run ai-kit:install
```

Isso copia `ai-kit/skills/*` para `.claude/skills/` e `ai-kit/mcp.json` para `.mcp.json` na raiz
(os dois destinos ficam fora do git — veja `.gitignore`; a fonte versionada é sempre `ai-kit/`).

## Skills

| Skill | Origem | Para quê | Quando usar |
|-------|--------|----------|-------------|
| `frontend-design` | Anthropic (`anthropics/skills`) | Direção visual com identidade própria; evita a cara de "site feito por IA" | Início do redesign e sempre que criar uma seção nova |
| `design-md` | Própria + 3 exemplos de `VoltAgent/awesome-design-md` | Criar e manter o `DESIGN.md` (tokens, tipografia, motion, componentes) | Depois da direção visual; antes de estilizar qualquer componente |
| `ui-ux-pro-max` | NextLevelBuilder (v2.15) | Banco pesquisável de estilos, paletas, fontes, guidelines UX e presets de motion (`python .claude/skills/ui-ux-pro-max/scripts/search.py "..."`) | Explorar opções de paleta/fonte e checar guidelines de UX pontuais |
| `web-design-guidelines` | Vercel (regras vendoradas em `references/`) | Auditoria de acessibilidade, foco, formulários, responsividade e performance em formato `arquivo:linha` | Última etapa antes de cada entrega |
| `motion` | Oficial Motion (`motiondivision/ai-kit`) | Boas práticas de animação (React/CSS), busca na doc via MCP, springs CSS, auditoria de performance | Ao escrever qualquer animação |
| `motion-react` | Própria (condensada da doc) | Cola rápida da API `motion/react` + regras de motion deste projeto; funciona sem MCP | Referência rápida enquanto codifica |
| `react-three-fiber` | Própria + docs oficiais do R3F em `references/` | Hero 3D leve, interação com ponteiro/scroll, regras de performance mobile | Se a direção visual pedir um elemento 3D |
| `threejs-react-three-fiber` | `cloudai-x/threejs-skills` (MIT) | Renderer, frame loop, eventos e performance adaptativa no R3F | Ao mexer no canvas do mundo (`src/world/`) |
| `threejs-shaders` | `cloudai-x/threejs-skills` (MIT) | GLSL, uniforms, instâncias, estender materiais prontos | Céu, estrelas, grid de dados, rochas |
| `threejs-postprocessing` | `cloudai-x/threejs-skills` (MIT) | Bloom, aberração, vinheta e passes próprios | Ao ajustar o pós por nível de qualidade |
| `threejs-performance` | `cloudai-x/threejs-skills` (MIT) | Draw calls, instancing, fill rate, memória | Quando o fps cair ou antes de somar algo ao mundo |
| `threejs-materials` | `cloudai-x/threejs-skills` (MIT) | Escolha e ajuste de materiais (PBR, vidro, unlit) | Objetos novos das estações |
| `threejs-interaction` | `cloudai-x/threejs-skills` (MIT) | Raycast, arrasto, controles de câmera | Minigames e objetos clicáveis |
| `threejs-asset-pipeline` | `cloudai-x/threejs-skills` (MIT) | Otimizar glTF (Draco, meshopt, KTX2) e `gltfjsx` | Quando chegarem modelos exportados da Unity |
| `r3f-physics` | `EnzeD/r3f-skills` (MIT) | Rapier no R3F: corpos, colisores, sensores, juntas | Física 3D nas estações |

Descartadas de propósito (não fazem sentido para uma landing page estática de uma página):
`react-best-practices` (foco em Next.js/RSC), `composition-patterns` (poucos componentes), `superpowers` (cerimônia demais).

## Bibliotecas do mundo 3D

| Pacote | Para quê |
|--------|----------|
| `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` | Canvas único do mundo, helpers e pós |
| `lenis` | Scroll suave que conduz a câmera (desligado com reduced motion) |
| `detect-gpu` | Nível de qualidade inicial; benchmarks servidos localmente em `/gpu-benchmarks` (plugin no `vite.config.js`) |
| `maath` | Amortecimento da câmera (`easing.damp3`) |
| `three-custom-shader-material` | Shader próprio sobre `MeshStandardMaterial` (rochas triplanares) |
| `gsap` | Timelines das transições grandes (portal entre modos) |
| `@react-three/rapier` | Física 3D nas estações |
| `three.quarks` + `quarks.r3f` | Sistemas de partículas (rastros, explosões) |

## MCPs (`ai-kit/mcp.json` → `.mcp.json`)

| Servidor | Para quê |
|----------|----------|
| `context7` | Documentação atualizada de React 19, Vite, Tailwind v4, Motion, three/drei |
| `motion` | Busca na documentação e exemplos do Motion (gratuito, sem conta) |
| `chrome-devtools` | Screenshots, trace de performance, Core Web Vitals, console — verificação visual e de performance |
| `playwright` | Navegação e screenshots em vários viewports (alternativa ao DevTools) |

Os servidores `npx` baixam o pacote na primeira execução; precisam de Node 18+ e Chrome instalado.

## Fluxo de trabalho do redesign

1. **Direção** — `frontend-design` + `ui-ux-pro-max` → plano de design (paleta, tipos, layout, princípios) aprovado pelo Pedro.
2. **Sistema** — `design-md` → escrever `DESIGN.md` na raiz.
3. **Stack** — atualizar para React 19, Vite 7+, Tailwind v4, Motion, (opcional) R3F; usar `context7` para as versões atuais.
4. **Build** — seção por seção, lendo `DESIGN.md`; animações com `motion`/`motion-react`.
5. **Verificação** — `chrome-devtools`/`playwright` em 390px, 768px e 1440px; depois `web-design-guidelines`.

## Licenças

Cada pasta de skill de terceiros traz seu `LICENSE` original (MIT / Apache-2.0).
