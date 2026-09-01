"use client";
import { useRef, useState, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import LoginForm from "../components/LoginForm";
import { Scale, FileText, Users, ArrowRight, Activity, Shield, Zap, Sparkles, ChevronRight, Gavel, FileCheck, ArrowUp } from "lucide-react";

// Landing trazida de volta do demo-agentes-juridicos (era a tela real do
// projeto antes do repo virar a plataforma multi-tenant - ficou pra trás no
// force push, sem querer). Cores próprias (lime sobre "deep space", em vez
// do dark+dourado do resto do app) isoladas via custom properties no
// wrapper abaixo - só essa página muda de cara, /dashboard e o resto
// continuam iguais. Rebrandado de "Orbyn Solution" pra "Plataforma
// Jurídica" (nome real do produto, usado em todo o resto do app - manter o
// nome antigo só aqui ia destoar do Sidebar/título/etc.), e "Acesso VIP"/
// "Conta VIP" viraram termos neutros (não existe tier pago nessa versão).
const CORES_LANDING = {
  "--bg": "#030509",
  "--panel": "rgba(13, 17, 28, 0.6)",
  "--border": "rgba(255, 255, 255, 0.08)",
  "--border-strong": "rgba(99, 102, 241, 0.4)",
  "--text": "#F8FAFC",
  "--text-dim": "#94A3B8",
  "--accent": "#CCFF00",
  "--accent-rgb": "204 255 0",
  "--accent-hover": "#B2E600",
  "--accent-glow": "rgba(204, 255, 0, 0.4)",
  "--danger": "#EF4444",
  "--danger-rgb": "239 68 68",
  "--danger-glow": "rgba(239, 68, 68, 0.15)",
  "--radius": "16px",
};

export default function Home() {
  const container = useRef(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Sem ScrollTrigger de propósito - a versão original usava scroll/scrub
  // pesado (parallax do mockup, reveal por seção, contagem dos números)
  // que dependia de medir a altura real do documento (imagens/fontes
  // carregadas) pra calcular onde cada trigger começa/termina. Qualquer
  // desalinhamento nessa conta (fonte ainda carregando, StrictMode do dev
  // rodando o efeito 2x) fazia seções inteiras ficarem sobrepostas na
  // tela - bug real, reproduzido de verdade, não hipotético. Fica só a
  // entrada simples do hero (roda 1x no carregamento, não depende de
  // posição de scroll nenhuma) - menos "wow", mas não quebra.
  useGSAP(
    () => {
      gsap.from(".hero-badge", { y: -20, opacity: 0, duration: 1, ease: "power3.out" });
      gsap.from(".hero-title", { y: 30, opacity: 0, duration: 1.2, ease: "power4.out", delay: 0.2 });
      gsap.from(".hero-desc", { y: 20, opacity: 0, duration: 1, ease: "power3.out", delay: 0.4 });
      gsap.from(".hero-btn", { y: 20, opacity: 0, duration: 1, ease: "power3.out", delay: 0.6 });

      gsap.from(".hero-float-1", { y: 40, x: -30, opacity: 0, duration: 1.5, ease: "elastic.out(1, 0.75)", delay: 1.2 });
      gsap.from(".hero-float-2", { y: -40, x: 30, opacity: 0, duration: 1.5, ease: "elastic.out(1, 0.75)", delay: 1.4 });
    },
    { scope: container }
  );

  return (
    <main ref={container} className="min-h-screen flex flex-col bg-bg relative overflow-hidden" style={CORES_LANDING}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] z-0 pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <nav className="absolute top-0 left-0 right-0 w-full max-w-[1400px] mx-auto pt-12 px-[5%] flex justify-between items-center z-[100]">
        <div
          className="flex items-center gap-3 text-text cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setShowLogin(false)}
        >
          <Scale className="w-8 h-8 text-accent" />
          <span className="font-sans font-bold text-2xl tracking-wide text-white drop-shadow-md">Plataforma Jurídica</span>
        </div>

        {showLogin ? (
          <button onClick={() => setShowLogin(false)} className="text-sm font-semibold text-text-dim hover:text-white transition-colors">
            Voltar
          </button>
        ) : (
          <div className="hidden md:flex items-center gap-10">
            <a href="#solucao" className="text-sm font-semibold text-white/70 hover:text-white transition-colors">
              A Solução
            </a>
            <button
              onClick={() => setShowLogin(true)}
              className="bg-accent hover:bg-accent-hover text-bg font-bold text-sm md:text-base px-7 py-3 rounded-full transition-all hover:shadow-[0_0_20px_var(--accent-glow)] hover:-translate-y-0.5"
            >
              Entrar
            </button>
          </div>
        )}
      </nav>

      {showLogin ? (
        <section className="flex-1 w-full min-h-screen grid lg:grid-cols-2 relative">
          {/* Coluna esquerda - showcase/branding, some em telas pequenas pra
              não empurrar o form pra baixo do fold no mobile. Reaproveita o
              mesmo mockup/gradiente do hero pra manter a mesma identidade
              visual, só que agora ocupando a tela toda em vez de um card
              solto no meio do vazio. */}
          <div className="hidden lg:flex flex-col justify-center relative overflow-hidden border-r border-white/5 px-16 xl:px-24 py-24">
            <div className="absolute inset-0 z-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mockup.jpg"
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover object-[50%_78%] scale-110 opacity-[0.18] blur-[3px]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--bg)_0%,transparent_55%,var(--bg)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--bg)_0%,transparent_30%,transparent_70%,var(--bg)_100%)]" />
            </div>
            <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[140px] opacity-70 pointer-events-none z-0" />

            <div className="relative z-10 max-w-lg">
              <div className="w-14 h-14 bg-accent text-bg rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_30px_var(--accent-glow)]">
                <Scale size={26} />
              </div>
              <h2 className="text-4xl xl:text-5xl font-bold text-white tracking-tight leading-[1.1] mb-6">
                O futuro da advocacia já chegou.
              </h2>
              <p className="text-lg text-text-dim leading-relaxed mb-12">
                Petições geradas por IA, acompanhamento processual autônomo e isolamento total dos dados do seu
                escritório - tudo num único lugar.
              </p>

              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-accent shrink-0">
                    <Zap size={18} />
                  </div>
                  <span className="text-sm text-text-dim">Busca processual automática no DataJud/CNJ</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                    <Shield size={18} />
                  </div>
                  <span className="text-sm text-text-dim">Dados isolados por escritório, garantido no banco</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-amber-500 shrink-0">
                    <FileCheck size={18} />
                  </div>
                  <span className="text-sm text-text-dim">Minutas de petição no estilo do seu escritório</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna direita - formulário, centralizado e ocupando a altura
              inteira da viewport em vez do card pequeno perdido no meio de
              área escura vazia que tinha antes. */}
          <div className="flex flex-col items-center justify-center px-[5%] py-24 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] h-[500px] bg-accent/10 rounded-full blur-[140px] opacity-60 pointer-events-none z-0 lg:hidden" />

            <div className="relative w-full max-w-[420px] z-10">
              <div className="lg:hidden w-14 h-14 bg-accent text-bg rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_var(--accent-glow)]">
                <Scale size={26} />
              </div>
              <h2 className="text-3xl font-semibold text-white tracking-tight mb-2 text-center lg:text-left">Entrar</h2>
              <p className="text-sm text-text-dim text-center lg:text-left mb-10">
                Acesse com o e-mail e senha do seu escritório.
              </p>
              <LoginForm />
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="hero-section flex-1 flex flex-col items-center container-wide text-center pt-32 pb-12 relative z-10 min-h-screen overflow-hidden">
            {/* Mockup do produto como pano de fundo, atrás do título - bem
                escurecido/desfocado de propósito: além de dar textura visual
                sem competir com o texto, esconde a marca antiga ("ORBYN")
                que ficou gravada nos pixels do jpg (não dá pra editar isso
                sem gerar um asset novo). object-[50%_78%] joga a metade de
                cima da imagem, onde tá o logo grande, pra fora do corte. */}
            <div className="absolute inset-0 z-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mockup.jpg"
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover object-[50%_78%] scale-110 opacity-[0.22] blur-[3px]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--bg)_0%,transparent_32%,transparent_68%,var(--bg)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--bg)_0%,transparent_22%,transparent_78%,var(--bg)_100%)]" />
            </div>

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-50 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center w-full">
              <div className="hero-badge flex items-center gap-2 text-[11px] font-bold text-accent uppercase tracking-[0.2em] bg-accent/10 border border-accent/20 px-4 py-2 rounded-full mb-8 backdrop-blur-md">
                <Sparkles size={14} /> O Próximo Salto da Advocacia
              </div>

              <h1 className="hero-title text-5xl md:text-6xl lg:text-[4.25rem] leading-[1.05] max-w-[1100px] mb-10 font-bold tracking-tight text-white">
                O Primeiro Agente Jurídico <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-accent to-indigo-400">
                  Autônomo do Brasil
                </span>
              </h1>

              <p className="hero-desc text-lg md:text-xl text-text-dim max-w-[700px] mb-10 font-sans font-light leading-relaxed">
                Deixe a IA trabalhar enquanto você advoga. A Plataforma Jurídica vasculha os tribunais, lê sentenças de
                centenas de páginas e elabora peças complexas em segundos.
              </p>

              <div className="hero-btn flex flex-col sm:flex-row gap-4 items-center mb-20">
                <button
                  className="bg-white hover:bg-gray-100 text-[#050914] font-bold py-4 px-10 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-3 text-lg w-full sm:w-auto"
                  onClick={() => setShowLogin(true)}
                >
                  Conhecer a Plataforma <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => document.getElementById("solucao")?.scrollIntoView({ behavior: "smooth" })}
                  className="bg-transparent border border-white/20 hover:border-white/40 text-white font-bold py-4 px-10 rounded-xl transition-all flex items-center justify-center gap-3 text-lg w-full sm:w-auto backdrop-blur-md"
                >
                  Ver Demonstração
                </button>
              </div>

              <div className="relative w-full max-w-[900px] mx-auto flex flex-col sm:flex-row gap-6 justify-center">
                <div className="hero-float-1 bg-[#11192b]/90 border border-white/10 p-5 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-xl text-left">
                  <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shrink-0">
                    <Activity size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] text-text-dim font-bold uppercase tracking-wider mb-1">Processos Mapeados</div>
                    <div className="text-2xl font-bold text-white">+14.592</div>
                  </div>
                </div>

                <div className="hero-float-2 bg-[#11192b]/90 border border-accent/30 p-5 rounded-2xl shadow-[0_0_30px_var(--accent-glow)] backdrop-blur-xl max-w-[320px] text-left">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-bg shrink-0 mt-1">
                      <Gavel size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-text-dim font-bold tracking-wider mb-1">Alerta Estratégico</div>
                      <div className="text-sm font-bold text-white leading-snug">Sentença favorável publicada no processo 000123-45...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="partner-banner border-y border-white/5 bg-white/[0.02] py-10 relative z-10 overflow-hidden mt-20">
            <div className="container-wide flex flex-col md:flex-row items-center justify-center gap-12 text-text-dim/60 font-semibold text-sm uppercase tracking-widest">
              <span className="text-center">Integrado aos Maiores Tribunais</span>
              <div className="flex gap-12 items-center opacity-70 flex-wrap justify-center">
                <span className="text-2xl font-bold font-serif tracking-normal">STF</span>
                <span className="text-2xl font-bold font-serif tracking-normal">STJ</span>
                <span className="text-2xl font-bold font-serif tracking-normal">TJSP</span>
                <span className="text-2xl font-bold font-serif tracking-normal">TRT2</span>
                <span className="text-2xl font-bold font-serif tracking-normal">TRF3</span>
              </div>
            </div>
          </section>

          <section className="container-wide py-24 relative z-10 stats-section">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="flex flex-col items-center text-center p-6">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  <span className="stat-number">90</span>+
                </div>
                <div className="text-sm font-semibold text-text-dim uppercase tracking-widest">Tribunais Cobertos</div>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  <span className="stat-number">99</span>%
                </div>
                <div className="text-sm font-semibold text-text-dim uppercase tracking-widest">Precisão na Leitura</div>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  <span className="stat-number">10</span>x
                </div>
                <div className="text-sm font-semibold text-text-dim uppercase tracking-widest">Mais Produtividade</div>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">Zero</div>
                <div className="text-sm font-semibold text-text-dim uppercase tracking-widest">Falhas Manuais</div>
              </div>
            </div>
          </section>

          <section id="solucao" className="container-wide section-spacing relative z-10">
            <div className="section-title-wrapper mb-20 text-center max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 text-white">Arquitetura de Alta Performance</h2>
              <p className="text-text-dim text-lg leading-relaxed">
                Não é apenas um sistema de gestão. É uma máquina de produtividade desenhada para escritórios que não
                aceitam perder tempo.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bento-grid">
              <div className="bento-card group glass-panel lg:col-span-8 min-h-[380px] p-10 flex flex-col justify-between relative overflow-hidden transition-all duration-700 hover:shadow-[0_20px_60px_-15px_rgba(99,102,241,0.3)] hover:border-accent/50">
                <div className="absolute right-0 bottom-0 w-2/3 h-2/3 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />
                <div className="relative z-10 max-w-lg">
                  <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mb-8 text-accent shadow-inner group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-500">
                    <Zap size={28} />
                  </div>
                  <h3 className="text-3xl font-bold mb-4 tracking-tight text-white">Busca Processual Autônoma</h3>
                  <p className="text-text-dim leading-relaxed text-lg">
                    Integração direta com o <strong className="text-white font-medium">DataJud/CNJ</strong>. A
                    Plataforma Jurídica acompanha o Diário Oficial e os andamentos em background e te avisa quando há
                    algo que exige sua ação.
                  </p>
                </div>
                <div className="absolute -right-20 top-20 w-80 h-64 bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl rotate-12 group-hover:rotate-6 transition-transform duration-700 hidden md:block">
                  <div className="flex flex-col gap-4">
                    <div className="h-8 w-1/3 bg-white/10 rounded" />
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      <div className="h-4 w-3/4 bg-white/5 rounded" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                      <div className="h-4 w-2/3 bg-white/5 rounded" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                      <div className="h-4 w-5/6 bg-white/5 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bento-card group glass-panel lg:col-span-4 min-h-[380px] p-10 flex flex-col relative overflow-hidden transition-all duration-700 hover:shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2)] hover:border-emerald-500/50">
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mb-8 text-emerald-400 shadow-inner group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                    <Shield size={28} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 tracking-tight text-white">Isolamento por Escritório</h3>
                  <p className="text-text-dim leading-relaxed">
                    Cada escritório vê só os próprios dados - petições, prazos e clientes isolados por linha, garantido
                    no banco (RLS), não só na interface.
                  </p>
                </div>
              </div>

              <div className="bento-card group glass-panel lg:col-span-5 min-h-[380px] p-10 flex flex-col justify-between relative overflow-hidden transition-all duration-700 hover:shadow-[0_20px_60px_-15px_rgba(245,158,11,0.2)] hover:border-amber-500/50">
                <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mb-8 text-amber-500 shadow-inner group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                    <FileCheck size={28} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 tracking-tight text-white">Geração de Petições por IA</h3>
                  <p className="text-text-dim leading-relaxed text-lg">
                    A IA aprende o "jeito de escrever" do escritório a partir de petições reais já cadastradas e gera
                    minutas novas nesse mesmo estilo - sempre pra revisão, nunca produto final automático.
                  </p>
                </div>
              </div>

              <div className="bento-card group glass-panel lg:col-span-7 min-h-[380px] p-10 flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden transition-all duration-700 hover:shadow-[0_20px_60px_-15px_rgba(99,102,241,0.3)] hover:border-accent/50">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                <div className="flex-1 relative z-10 w-full">
                  <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mb-6 text-accent shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <Users size={28} />
                  </div>
                  <h3 className="text-3xl font-bold mb-4 tracking-tight text-white">Board e Notificações</h3>
                  <p className="text-text-dim leading-relaxed text-lg mb-8">
                    Acompanhe petições passando por Criação, Revisão e Protocolo, com notificação automática por
                    e-mail ou WhatsApp pro responsável de cada fase.
                  </p>
                  <button
                    className="flex items-center gap-2 text-sm font-bold text-accent uppercase tracking-widest hover:text-white transition-colors group-hover:translate-x-2 duration-300"
                    onClick={() => setShowLogin(true)}
                  >
                    Ver na Prática <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="cta-wrapper container-wide section-spacing pb-12 relative z-10">
            <div className="cta-section relative overflow-hidden rounded-[32px] p-[1px]">
              <div className="absolute inset-0 bg-gradient-to-b from-accent/50 via-accent/10 to-bg" />
              <div className="relative glass-panel rounded-[31px] p-16 md:p-28 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden">
                <div className="cta-bg-glow absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-accent/30 rounded-full blur-[120px] opacity-100 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-accent text-bg rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_40px_var(--accent-glow)]">
                    <Scale size={32} />
                  </div>
                  <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 text-white">
                    O futuro chegou.
                    <br />
                    Eleve o seu escritório.
                  </h2>
                  <p className="text-xl text-text-dim max-w-2xl mx-auto mb-12 leading-relaxed">
                    Cadastre seu escritório e comece a usar hoje mesmo.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <a
                      href="/onboarding"
                      className="bg-white hover:bg-gray-200 text-[#050914] font-bold py-5 px-12 rounded-xl transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-3 text-lg hover:-translate-y-1 w-full sm:w-auto"
                    >
                      Criar Cadastro Grátis <ArrowRight size={20} />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <footer className="mt-24 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold text-text-dim uppercase tracking-[0.2em]">
              <p className="flex items-center gap-2">
                <Scale size={14} className="text-accent" /> &copy; {new Date().getFullYear()} Plataforma Jurídica
              </p>
              <div className="flex gap-8 mt-6 md:mt-0">
                <a href="#" className="hover:text-white transition-colors">
                  Política de Privacidade
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  Termos de Uso
                </a>
              </div>
            </footer>
          </section>
        </>
      )}

      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 w-12 h-12 bg-black/60 border border-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:bg-accent hover:text-bg hover:border-accent hover:shadow-[0_0_20px_var(--accent-glow)] transition-all duration-300 z-[100] ${
          showScrollTop ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-10 pointer-events-none"
        }`}
        aria-label="Voltar ao topo"
      >
        <ArrowUp size={20} />
      </button>
    </main>
  );
}
