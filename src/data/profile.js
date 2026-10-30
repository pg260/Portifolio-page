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
    // Viagem do mundo 3D: painéis de código (digitados ao vivo) e terminais de log (rolando) espalhados pelo caminho.
    // Decorativos: código até 7 linhas, logs até 12; a fonte encolhe para caber a linha mais longa.
    world: {
      logs: [
        {
          title: 'api · produção',
          lines: [
            'GET    /api/alunos        200  14ms',
            'POST   /api/login         201  38ms',
            'GET    /api/relatorios    200  92ms',
            'PUT    /api/cursos/42     204  21ms',
            'GET    /api/status        200   3ms',
            'POST   /api/matriculas    201  57ms',
            'GET    /api/atendimentos  200  47ms',
            'DELETE /api/sessoes/9f    204  11ms',
            'GET    /api/setores       304   2ms',
            'POST   /api/pagamentos    202 120ms',
            'GET    /api/agenda?dia=3  200  33ms',
            'PATCH  /api/usuarios/7    200  19ms',
          ],
        },
        {
          title: 'deploy',
          lines: [
            '$ git push origin main',
            '▸ pipeline #1842 iniciado',
            '✓ lint · 0 erros',
            '✓ testes · 63 passaram',
            '✓ build · 312 módulos · 4.1s',
            '▸ docker build app:1.8.2',
            '✓ imagem enviada · 142 MB',
            '▸ rollout deploy/app',
            '✓ 3/3 réplicas prontas',
            '✓ health check · 200 OK',
            '✓ deploy concluído em 42s',
            '· aguardando o próximo push',
          ],
        },
        {
          title: 'banco de dados',
          lines: [
            '[db] pool 10/20 conexões',
            'SELECT setores · 12 linhas · 4ms',
            'INSERT atendimentos · 1 linha',
            'UPDATE cursos · 3 linhas · 6ms',
            '[db] índice idx_setor usado',
            'COMMIT · 2ms',
            'SELECT alunos · 240 linhas · 9ms',
            '[db] backup diário ok · 1.2 GB',
            'DELETE sessoes · 18 linhas',
            '[db] vacuum concluído',
            'SELECT relatorio_mensal · 31ms',
            'COMMIT · 1ms',
          ],
        },
        {
          title: 'testes',
          lines: [
            '$ npm test',
            '✓ AlunoService (12) · 0.8s',
            '✓ LoginController (7) · 0.3s',
            '✓ RelatorioRepository (9)',
            '✓ Painel.spec.tsx (5) · 1.1s',
            '✓ cursos.e2e (4) · 6.1s',
            '✓ api/status (2) · 0.1s',
            '✓ PagamentoService (11)',
            'cobertura · 87,4%',
            '63 passaram · 0 falharam',
            '$ npm run lint',
            '✓ sem avisos',
          ],
        },
      ],
      code: [
        { lang: 'Java', lines: ['@RestController', '@RequestMapping("/api/alunos")', 'class AlunoController {', '  @GetMapping("/{id}")', '  Aluno get(@PathVariable Long id) {', '    return service.buscar(id);', '  }'] },
        { lang: 'React', lines: ['export function Painel({ dados }) {', "  const [busca, setBusca] = useState('')", '  return (', '    <Tabela', '      linhas={filtrar(dados, busca)}', '    />', '  )'] },
        { lang: 'SQL', lines: ['SELECT s.nome, COUNT(*) AS total', 'FROM atendimentos a', 'JOIN setores s ON s.id = a.setor_id', 'WHERE a.data >= CURRENT_DATE - 30', 'GROUP BY s.nome', 'ORDER BY total DESC;'] },
        { lang: 'Node.js', lines: ["app.post('/api/login', async (req, res) => {", '  const user = await auth(req.body)', '  if (!user) return res.sendStatus(401)', '  res.json({ token: sign(user) })', '})'] },
        { lang: 'C#', lines: ['[HttpGet("relatorios")]', 'public async Task<IActionResult> Get()', '{', '    var dados = await _repo.ListarAsync();', '    return Ok(dados);', '}'] },
        { lang: 'Angular', lines: ['@Component({', "  selector: 'app-cursos',", "  templateUrl: './cursos.html',", '})', 'export class CursosComponent {', '  cursos$ = this.api.listar()', '}'] },
        { lang: 'Git', lines: ['$ git checkout -b feat/relatorios', '$ git commit -m "feat: exporta CSV"', '$ git push origin feat/relatorios', '// pipeline: build · testes · deploy', '✓ deploy concluído em 42s'] },
        { lang: 'REST', lines: ['GET /api/v1/status', '// 200 OK · 38ms', '{', '  "servicos": 12,', '  "fila": 0,', '  "status": "online"', '}'] },
        { lang: 'TypeScript', lines: ['interface Aluno {', '  id: number', '  nome: string', '  status: "ativo" | "trancado"', '}', 'const ativos = alunos.filter(', '  (a) => a.status === "ativo")'] },
        { lang: 'Docker', lines: ['FROM node:20-alpine', 'WORKDIR /app', 'COPY package*.json ./', 'RUN npm ci --omit=dev', 'COPY . .', 'EXPOSE 3000', 'CMD ["node", "server.js"]'] },
        { lang: 'CSS', lines: ['.janela {', '  display: grid;', '  place-items: center;', '}', '/* finalmente centralizado */'] },
        { lang: 'Spring', lines: ['public interface AlunoRepository', '    extends JpaRepository<Aluno, Long> {', '  List<Aluno> findByCurso(String curso);', '  @Query("SELECT a FROM Aluno a")', '  List<Aluno> listarAtivos();', '}'] },
        { lang: 'CI', lines: ['name: deploy', 'on: [push]', 'jobs:', '  build:', '    runs-on: ubuntu-latest', '    steps:', '      - run: npm ci && npm test'] },
        { lang: 'Jest', lines: ["describe('login', () => {", "  it('recusa senha errada', async () => {", "    const res = await post('/api/login', ruim)", '    expect(res.status).toBe(401)', '  })', '})'] },
      ],
    },
    headline: 'Construo sistemas que empresas usam todo dia.',
    lead: 'Desenvolvedor fullstack em Java, Angular, React, Node.js e .NET, hoje na Poncetech. Já entreguei projetos para Sebrae, Senai, Unimed, CVT e m7.',
    cta: { label: 'Ver empresas', href: '#trabalhos' },
    ctaSecondary: { label: 'LinkedIn', href: links.linkedin, icon: 'linkedin' },
    workTitle: 'Empresas em que trabalhei',
    workSummary: '6 empresas · projetos para 5 clientes',
    clientsTitle: 'Clientes atendidos',
    clientsNote: 'Projetos que entreguei trabalhando nessas empresas.',
    clientsVia: 'via',
    stack: ['Java', 'C#', '.NET', 'Node.js', 'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Angular', 'APIs REST', 'SQL', 'PostgreSQL', 'MongoDB', 'Azure', 'Git'],
    stats: [
      { value: 6, label: 'empresas' },
      { value: 5, label: 'clientes atendidos' },
      { value: 4, label: 'anos programando' },
    ],
  },
}

export const contact = {
  title: 'Vamos construir algo?',
}

export const nav = [
  { label: 'Trabalhos', href: '#trabalhos' },
  { label: 'Sobre', href: '#sobre' },
  { label: 'Contato', href: '#contato' },
]
