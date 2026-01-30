import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Smartphone,
  Glasses,
  ExternalLink,
  Linkedin,
  Mail,
  ChevronDown,
  Play,
  Apple,
  Menu,
  X,
  Code2,
  Cpu,
  Globe,
  Layers,
  Wifi
} from 'lucide-react';

// --- Componentes UI Reutilizáveis ---

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colors[color]} backdrop-blur-sm`}>
      {children}
    </span>
  );
};

const ProjectCard = ({ project, index }) => {
  return (
    <div
      className="group relative bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col h-full"     
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Imagem / Placeholder */}
      <div className="relative h-48 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 opacity-60" />

        <div className="w-full h-full flex items-center justify-center bg-slate-800 group-hover:scale-105 transition-transform duration-700">
          {project.image ? (
            <img
              src={project.image}
              alt={project.title}
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            />
          ) : (
            project.icon
          )}
        </div>

        <div className="absolute bottom-4 left-4 z-20">
          <Badge color={project.categoryColor}>{project.category}</Badge>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-6 flex-grow flex flex-col">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
          {project.title}
        </h3>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed flex-grow">
          {project.description}
        </p>

        {/* Links / Botões */}
        <div className="flex flex-wrap gap-3 mt-auto">
          {project.links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-purple-600 text-white text-xs font-medium transition-all duration-300 hover:scale-105"
            >
              {link.icon}
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

const SkillPill = ({ icon, label }) => (
  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 text-slate-300 hover:text-white transition-all duration-300 hover:-translate-y-1">
    {icon}
    <span className="font-medium">{label}</span>
  </div>
);

// --- Dados do Portfólio ---

const projectsData = [
  {
    title: "Mundo IEL",
    category: "Mobile Game",
    categoryColor: "blue",
    image: "/images/mundo-iel.webp", // ✅ Imagem adicionada!
    description: "Um jogo educacional e interativo desenvolvido para plataformas móveis. Explore desafios e aprenda jogando neste universo gamificado.",
    icon: <Smartphone size={64} className="text-blue-500 opacity-50" />,
    links: [
      { label: "Google Play", url: "https://play.google.com/store/apps/details?id=com.IEL.MundoIEL&hl=pt_BR", icon: <Play size={14} /> },
      { label: "App Store", url: "https://apps.apple.com/br/app/mundo-iel/id6471497859", icon: <Apple size={14} /> }
    ]
  },
  {
    title: "Configurador Nesher",
    category: "App Comercial",
    categoryColor: "green",
    image: "/images/nesher.webp", // ✅ Imagem adicionada!
    description: "Ferramenta de visualização e configuração de produtos desenvolvida para a Bugaboo Studio. Permite personalização em tempo real.",
    icon: <Code2 size={64} className="text-emerald-500 opacity-50" />,
    links: [
      { label: "Google Play", url: "https://play.google.com/store/apps/details?id=com.BugabooStudio.ConfiguradorNesher", icon: <Play size={14} /> },
      { label: "App Store", url: "https://apps.apple.com/br/app/configurador-nesher/id6746758821", icon: <Apple size={14} /> }
    ]
  },
  {
    title: "Fóssil Vivo - Museu Goeldi",
    category: "VR / AR Experience",
    categoryColor: "purple",
    image: "/images/fossil-vivo.webp", // ✅ Imagem adicionada!
    description: "Experiência imersiva de Realidade Virtual e Aumentada criada para exposição no Museu Goeldi. Trazendo a pré-história à vida através da tecnologia.",
    icon: <Glasses size={64} className="text-purple-500 opacity-50" />,
    links: [
      { label: "Ver Notícia Oficial", url: "https://www.gov.br/museugoeldi/pt-br/arquivos/noticias/museu-goeldi-recebe-exposicao-fossil-vivo", icon: <ExternalLink size={14} /> }
    ]
  },
  {
    title: "Projetos Indie (Itch.io)",
    category: "Game Design",
    categoryColor: "orange",
    image: "/images/indie-games.webp", // ✅ Imagem adicionada!
    description: "Coletânea de jogos experimentais, game jams e protótipos pessoais. Onde a criatividade encontra a programação pura.",
    icon: <Gamepad2 size={64} className="text-orange-500 opacity-50" />,
    links: [
      { label: "Jogar no Itch.io", url: "https://pedro-gustavo-pgzim.itch.io/", icon: <Gamepad2 size={14} /> }
    ]
  }
];

// --- Componente Principal ---

export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-purple-500 selection:text-white font-sans">

      {/* Background Decorativo */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-900/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-emerald-900/10 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-slate-950/90 backdrop-blur-md border-b border-slate-800 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            Pedro <span className="text-slate-500">Gustavo</span>.
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8 items-center">
            {['Início', 'Projetos', 'Sobre', 'Contato'].map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))}
                className="text-sm font-medium hover:text-purple-400 transition-colors"
              >
                {item}
              </button>
            ))}
            <a
              href="https://www.rebuildstudio.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25"
            >
              Rebuild Studio
            </a>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-slate-900 border-b border-slate-800 p-6 flex flex-col gap-4 shadow-xl">
            {['Início', 'Projetos', 'Sobre', 'Contato'].map((item) => (
              <button
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))}
                className="text-left text-lg font-medium py-2 border-b border-slate-800/50"
              >
                {item}
              </button>
            ))}
             <a
              href="https://www.rebuildstudio.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-center px-5 py-3 rounded-xl bg-purple-600 text-white font-semibold"
            >
              Visitar Rebuild Studio
            </a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="relative z-10 pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">

            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              Game Developer & <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 animate-gradient">
                Unity Specialist
              </span>
            </h1>

            <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
              Olá, sou Pedro Gustavo. Desenvolvedor Unity com 4 anos de experiência criando jogos e experiências interativas. Especializado em C#, sistemas multiplayer com Photon, desenvolvimento mobile e experiências imersivas em AR/VR. Da prototipagem rápida à otimização de performance, transformo ideias em jogos jogáveis.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => scrollToSection('projetos')}
                className="px-8 py-4 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                Ver Meus Jogos <ChevronDown size={18} />
              </button>
              <div className="flex gap-2">
                <a href="https://pedro-gustavo-pgzim.itch.io/" target="_blank" rel="noopener" className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all hover:border-orange-500/50 group">   
                  <Gamepad2 className="text-slate-400 group-hover:text-orange-400" />
                </a>
                <a href="https://www.rebuildstudio.com.br/" target="_blank" rel="noopener" className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all hover:border-purple-500/50 group">      
                  <ExternalLink className="text-slate-400 group-hover:text-purple-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Hero Visual Abstract */}
          <div className="relative h-[400px] md:h-[500px] w-full flex items-center justify-center">
             <div className="relative w-full h-full bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden backdrop-blur-sm flex items-center justify-center group">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

                <div className="relative z-10 bg-gradient-to-br from-purple-600 to-blue-600 p-8 rounded-2xl shadow-2xl shadow-purple-500/20 group-hover:scale-105 transition-transform duration-500">
                    <Code2 size={80} className="text-white" />
                </div>

                <div className="absolute top-1/4 left-1/4 p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>
                    <Smartphone size={32} className="text-blue-400" />
                </div>
                <div className="absolute bottom-1/3 right-1/4 p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                    <Wifi size={32} className="text-emerald-400" />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Marquee */}
      <div className="border-y border-slate-800 bg-slate-900/50 py-8 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-center gap-6 md:gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
          <span className="flex items-center gap-2 text-xl font-bold hover:text-white transition-colors"><Cpu size={20}/> Unity 3D</span>
          <span className="flex items-center gap-2 text-xl font-bold hover:text-white transition-colors"><Code2 size={20}/> C#</span>
          <span className="flex items-center gap-2 text-xl font-bold hover:text-white transition-colors"><Wifi size={20}/> Photon</span>
          <span className="flex items-center gap-2 text-xl font-bold hover:text-white transition-colors"><Smartphone size={20}/> Mobile</span>
          <span className="flex items-center gap-2 text-xl font-bold hover:text-white transition-colors"><Globe size={20}/> Web</span>
          <span className="flex items-center gap-2 text-xl font-bold hover:text-white transition-colors"><Layers size={20}/> AR/VR</span>
        </div>
      </div>

      {/* Projetos Section */}
      <section id="projetos" className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Meus Jogos & Projetos</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Uma seleção dos meus trabalhos mais recentes, de jogos mobile publicados a experiências imersivas em VR/AR e protótipos experimentais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {projectsData.map((project, index) => (
              <ProjectCard key={index} project={project} index={index} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <a
              href="https://pedro-gustavo-pgzim.itch.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition-colors border-b border-purple-500/30 pb-1 hover:border-purple-400"
            >
              Ver todos os protótipos no Itch.io <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* Sobre Mim */}
      <section id="sobre" className="py-24 px-6 bg-slate-900/30 relative z-10 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Por trás dos pixels</h2>
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <p>
                Jogos sempre foram minha paixão e a Unity minha ferramenta para dar vida a eles. Como fundador e líder técnico da <strong>Rebuild Studio</strong>, transformo conceitos em experiências jogáveis que combinam mecânicas envolventes com código limpo e otimizado.
              </p>
              <p>
                Do jogo educacional <strong>Mundo IEL</strong> publicado nas lojas mobile, às experiências de realidade virtual no <strong>Museu Goeldi</strong>, até protótipos experimentais em game jams. Cada projeto é uma oportunidade de explorar novas mecânicas, otimizar performance e criar memórias interativas.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <SkillPill icon={<Gamepad2 size={18} className="text-blue-400"/>} label="Unity 3D / 2D" />
              <SkillPill icon={<Wifi size={18} className="text-purple-400"/>} label="Photon Multiplayer" />
              <SkillPill icon={<Smartphone size={18} className="text-emerald-400"/>} label="Mobile Games" />
              <SkillPill icon={<Glasses size={18} className="text-orange-400"/>} label="AR / VR Experiences" />
            </div>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl transform rotate-3 blur-lg opacity-20"></div>
             <div className="relative bg-slate-800 rounded-3xl p-8 border border-slate-700">
               <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                 Rebuild Studio
               </h3>
               <p className="text-slate-400 mb-6 text-sm">
                 Game studio independente especializada em jogos mobile, experiências VR/AR e aplicações gamificadas. Do conceito ao lançamento.
               </p>
               <a
                 href="https://www.rebuildstudio.com.br/"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="block w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-center text-white font-medium transition-colors"
               >
                 Visitar Site Oficial
               </a>
             </div>
          </div>
        </div>
      </section>

      {/* Footer / Contato */}
      <footer id="contato" className="py-16 px-6 border-t border-slate-800 bg-slate-950 relative z-10">
        <div className="max-w-4xl mx-auto text-center">

          <div className="flex justify-center gap-6 mb-12">
            <a href="mailto:spg2616@gmail.com" className="p-4 rounded-full bg-slate-800 hover:bg-purple-600 text-white transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/25">
              <Mail size={24} />
            </a>
            <a href="https://www.linkedin.com/in/pedro-gustavo-frança-de-castro" target="_blank" rel="noopener noreferrer" className="p-4 rounded-full bg-slate-800 hover:bg-blue-600 text-white transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/25">
              <Linkedin size={24} />
            </a>
          </div>

          <div className="text-slate-600 text-sm">
            <p>&copy; 2026 Pedro Gustavo.</p>
            <p className="mt-2">Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
