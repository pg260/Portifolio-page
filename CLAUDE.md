# Portfolio — Pedro Gustavo (Game Developer / Unity)

Landing page de portfólio, uma página só, em React + Vite + Tailwind. Está passando por um redesign completo.
Leia `ai-kit/README.md` para o kit de skills/MCPs e o fluxo de trabalho (rode `npm run ai-kit:install` uma vez por clone para o Claude Code carregar as skills); leia `DESIGN.md` (quando existir) antes de estilizar qualquer coisa.

## Comandos

- `npm run dev` — servidor local (http://localhost:5173)
- `npm run build` / `npm run preview`

## Regras do projeto

- Idioma do conteúdo: PT-BR (versão EN planejada). Código e tokens em inglês.
- Todo valor visual (cor, fonte, raio, duração) vem de `DESIGN.md`; não inventar valores soltos no JSX.
- Animações: respeitar `prefers-reduced-motion` sempre (`<MotionConfig reducedMotion="user">`). Uma única sequência orquestrada no load; o resto responde ao usuário.
- Acessibilidade mínima: foco visível, `aria-label` em links só com ícone, `alt` nas imagens, landmarks semânticos, alvos de toque ≥ 44px.
- Responsivo de 360px a 1920px; verificar com screenshot antes de entregar.
- Imagens em `public/images/` (WebP + fallback SVG); ver `COMO-ADICIONAR-IMAGENS.md`.
- Antes de cada entrega: rodar a revisão da skill `web-design-guidelines`.

## Dados do portfólio

Projetos, links de lojas, contatos e textos ficam em `src/data/` (`projects.js`, `profile.js`). Nunca escrever conteúdo direto no JSX.
