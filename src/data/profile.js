// Textos e links do site. Conteúdo em PT-BR (versão EN planejada: duplicar este arquivo).

export const links = {
  email: 'spg2616@gmail.com',
  linkedin: 'https://www.linkedin.com/in/pedro-gustavo-frança-de-castro',
  itch: 'https://pedro-gustavo-pgzim.itch.io/',
  studio: 'https://glitchfish.studio/',
  studioLabel: 'Glitch Fish Studio',
}

export const profile = {
  name: 'Pedro Gustavo',
  years: 4,
  about: [
    `Jogos sempre foram minha paixão e a Unity, minha ferramenta para dar vida a eles. Como fundador e líder técnico da ${links.studioLabel}, transformo conceitos em experiências jogáveis que combinam mecânicas envolventes com código limpo e otimizado.`,
    'No fullstack, construo sistemas web que empresas usam todos os dias: do banco de dados à interface, passando por APIs, integrações e deploy. Já entreguei para instituições de ensino, saúde, apoio a negócios e finanças em Fortaleza.',
  ],
}

// Conteúdo que muda com o interruptor Jogos / Fullstack
export const modes = {
  games: {
    id: 'games',
    label: 'Jogos',
    icon: 'gamepad',
    hudLabel: 'SCENE 01 · JOGOS',
    hud: {
      stats: ['impactos', 'no céu', 'maior'],
      hint: 'clique para lançar um meteoro · arraste a Lua pela órbita · arraste a Terra para girá-la',
      hintTouch: 'toque para lançar um meteoro · toque na Lua para acelerar',
    },
    headline: 'Faço jogos que as pessoas realmente jogam.',
    lead: `Desenvolvedor Unity há 4 anos. Mobile, multiplayer com Photon e experiências VR/AR. Fundador da ${links.studioLabel}.`,
    cta: { label: 'Ver jogos', href: '#trabalhos' },
    ctaSecondary: { label: links.studioLabel, href: links.studio, icon: 'arrow-up-right' },
    workTitle: 'Jogos e experiências',
    workSummary: '3 estúdios · 8 projetos · 170 mil+ downloads',
    stack: ['Unity 2D/3D', 'C#', 'Photon', 'Android', 'iOS', 'VR/AR', 'Shader Graph', 'Addressables'],
    stats: [
      { value: 4, label: 'anos com Unity' },
      { value: 7, label: 'projetos lançados' },
      { value: 170, suffix: ' mil+', label: 'downloads na Google Play' },
    ],
  },
  fullstack: {
    id: 'fullstack',
    label: 'Fullstack',
    icon: 'code',
    hudLabel: 'SCENE 02 · FULLSTACK',
    hud: {
      stats: ['desvio', 'centralizadas', 'recorde'],
      hint: 'arraste a <div> até o centro · clique na janela para empurrá-la · ou tente um atalho de CSS',
      hintTouch: 'arraste a <div> até o centro · ou toque num atalho de CSS',
    },
    // Minigame "centralize a div" (textos desenhados dentro da janela 3D)
    game: {
      url: 'localhost:5173',
      div: '<div>',
      chips: [
        { id: 'flex', label: 'display: flex' },
        { id: 'half', label: 'left: 50%' },
        { id: 'grid', label: 'place-items: center' },
      ],
      centered: ['centralizado', '0px de desvio', 'o CSS venceu hoje', 'pode subir pra produção'],
      cheated: 'o grid resolveu · não vale recorde',
      flex: 'display: flex… e o align-items?',
      half: 'faltou o translateX(-50%)',
      chaos: {
        devtoolsOn: 'abriram o DevTools',
        devtoolsOff: 'fecharam o DevTools',
        scrollbarOn: 'apareceu uma scrollbar',
        scrollbarOff: 'a scrollbar sumiu',
        sibling: 'chegou uma <div> irmã',
        client: 'cliente: “só 1px pra esquerda?”',
        float: 'alguém pôs float: left',
      },
      devtools: {
        tabs: ['Elements', 'Console'],
        lines: ['<body>', '  <main class="app">', '    <div>…</div>', '  </main>', '</body>'],
      },
    },
    headline: 'Construo sistemas que empresas usam todo dia.',
    lead: 'Desenvolvedor fullstack em Java, Angular, React, Node.js e .NET. Sistemas para IFCE, Sebrae, Senai, Unimed, CVT e m7.',
    cta: { label: 'Ver empresas', href: '#trabalhos' },
    ctaSecondary: { label: 'LinkedIn', href: links.linkedin, icon: 'linkedin' },
    workTitle: 'Empresas com que trabalhei',
    workSummary: '6 empresas · ensino, saúde, negócios e finanças',
    stack: ['Java', 'Angular', 'React', 'Node.js', '.NET', 'C#', 'APIs REST', 'SQL', 'Git'],
    stats: [
      { value: 6, label: 'empresas atendidas' },
      { value: 4, label: 'setores diferentes' },
      { value: 4, label: 'anos programando' },
    ],
  },
}

export const contact = {
  title: 'Vamos construir algo?',
  hint: 'mova o mouse pelo fundo',
}

export const nav = [
  { label: 'Trabalhos', href: '#trabalhos' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Contato', href: '#contato' },
]
