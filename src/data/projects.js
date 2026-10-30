// Jogos agrupados pelo estúdio em que foram feitos (um card por estúdio, projetos em abas).
// Ícones são nomes resolvidos pelo componente que renderiza.
// Imagens em public/images/ (WebP + fallback SVG), ver COMO-ADICIONAR-IMAGENS.md. Projeto sem `image`
// mostra o título em tipografia no lugar da capa.

const play = (id) => ({ label: 'Google Play', url: `https://play.google.com/store/apps/details?id=${id}`, icon: 'play' })
const itch = (slug) => ({ label: 'Baixar no itch.io', url: `https://pedro-gustavo-pgzim.itch.io/${slug}`, icon: 'gamepad' })

export const studios = [
  {
    id: 'bugaboo',
    name: 'Bugaboo Studio',
    role: 'Desenvolvedor Unity',
    period: '2024–2026',
    projects: [
      {
        id: 'fossil-vivo',
        title: 'Fóssil Vivo, Museu Goeldi',
        category: 'VR / AR',
        featured: true,
        image: { webp: '/images/fossil-vivo.webp', fallback: '/images/fossil-vivo.svg', width: 1080, height: 1350 },
        alt: 'Pôster da exposição Fóssil Vivo: crânio fossilizado sobre fundo azul-petróleo com recifes',
        description:
          'Realidade virtual e aumentada para uma exposição do Museu Goeldi, em Belém, que mostra de perto como era a Amazônia pré-histórica.',
        links: [
          {
            label: 'Ver notícia',
            url: 'https://www.gov.br/museugoeldi/pt-br/arquivos/noticias/museu-goeldi-recebe-exposicao-fossil-vivo',
            icon: 'external-link',
          },
        ],
      },
      {
        id: 'mundo-iel',
        title: 'Mundo IEL',
        category: 'Jogo mobile',
        image: { webp: '/images/mundo-iel.webp', fallback: '/images/mundo-iel.svg', width: 240, height: 240 },
        alt: 'Ícone do jogo Mundo IEL: letras brancas sobre fundo azul-claro',
        description:
          'Jogo educativo para celular feito para o IEL (Instituto Euvaldo Lodi), publicado na Google Play e na App Store.',
        links: [
          { label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.IEL.MundoIEL&hl=pt_BR', icon: 'play' },
          { label: 'App Store', url: 'https://apps.apple.com/br/app/mundo-iel/id6471497859', icon: 'apple' },
        ],
      },
      {
        id: 'nesher',
        title: 'IA Nesher Projetta',
        category: 'App comercial',
        image: { webp: '/images/nesher.webp', fallback: '/images/nesher.svg', width: 240, height: 240 },
        alt: 'Ícone do IA Nesher Projetta: letra n amarela sobre fundo grafite',
        description: 'App em que o cliente configura o produto e vê o resultado em tempo real. Está na Google Play e na App Store.',
        links: [
          play('com.BugabooStudio.ConfiguradorNesher'),
          { label: 'App Store', url: 'https://apps.apple.com/br/app/configurador-nesher/id6746758821', icon: 'apple' },
        ],
      },
    ],
  },
  {
    id: 'agroplay',
    name: 'Agroplay Kids',
    role: 'Desenvolvedor Unity',
    period: '2026',
    projects: [
      {
        id: 'correndo-com-o-blake',
        title: 'Correndo com o Blake',
        image: { webp: '/images/correndo-com-o-blake.webp', fallback: '/images/correndo-com-o-blake.svg', width: 480, height: 480 },
        alt: 'Ícone do Correndo com o Blake: menina de chapéu de vaqueira rosa montada no cavalo Blake, que sorri de olhos fechados',
        category: 'Educativo · letras',
        meta: '100 mil+ downloads',
        description:
          'Corrida pela fazenda com o cavalo Blake: desviar de fardos e poças de lama e coletar letras para formar palavras. Feito para crianças em alfabetização.',
        links: [play('com.agroplaykids.correndocomoblake')],
      },
      {
        id: 'cuidando-dos-dentinhos',
        title: 'Cuidando dos Dentinhos',
        image: { webp: '/images/cuidando-dos-dentinhos.webp', fallback: '/images/cuidando-dos-dentinhos.svg', width: 480, height: 480 },
        alt: 'Ícone do Cuidando dos Dentinhos: menina de cabelo comprido escovando os dentes com uma escova amarela',
        category: 'Educativo · higiene',
        meta: '50 mil+ downloads',
        description:
          'A criança vira a dentista da turma e aprende a escovar os dentes dos personagens com movimentos circulares do dedo.',
        links: [play('com.agroplaykids.cuidandodosdentinhos')],
      },
      {
        id: 'desafio-da-algodao-doce',
        title: 'Desafio da Algodão Doce',
        image: { webp: '/images/desafio-da-algodao-doce.webp', fallback: '/images/desafio-da-algodao-doce.svg', width: 480, height: 480 },
        alt: 'Ícone do Desafio da Algodão Doce: ovelha de óculos redondos e chapéu de vaqueiro sob um céu estrelado',
        category: 'Educativo · números',
        meta: '10 mil+ downloads',
        description:
          'Contar carneirinhos pela fazenda ao entardecer, sozinho ou em dupla, para ligar quantidades aos números.',
        links: [play('com.agroplaykids.desafiodaalgodaodoce')],
      },
      {
        id: 'ninho-do-pierre',
        title: 'Ninho do Pierre',
        image: { webp: '/images/ninho-do-pierre.webp', fallback: '/images/ninho-do-pierre.svg', width: 480, height: 480 },
        alt: 'Ícone do Ninho do Pierre: pintinho amarelo de óculos escuros deitado no ninho com um copo azul',
        category: 'Educativo · formas',
        meta: '10 mil+ downloads',
        description:
          'Quebra-cabeça de formas geométricas: arrastar, girar e encaixar peças para montar o caminho do ovo de volta ao ninho.',
        links: [play('com.agroplaykids.ninhodopierre')],
      },
    ],
  },
  {
    id: 'rebuild',
    name: 'ReBuild! Studio',
    role: 'Desenvolvedor fullstack e Unity',
    period: '2024–2026',
    projects: [
      {
        id: 'fortalstep',
        title: 'FortalStep',
        category: 'Ritmo · protótipo',
        image: { webp: '/images/indie-games.webp', fallback: '/images/indie-games.svg', width: 320, height: 320 },
        alt: 'Capa do FortalStep: dois personagens em pixel art diante de um muro roxo',
        description:
          'Primeira versão jogável de um jogo de ritmo para Windows. Programação em Unity, com game design e arte 2D e 3D da equipe da ReBuild.',
        links: [itch('fortalstep')],
      },
    ],
  },
]
