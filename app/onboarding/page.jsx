import Link from "next/link";
import { Scale } from "lucide-react";
import OnboardingForm from "../../components/OnboardingForm";

// Mesma paleta azul da landing/"/" (CORES_LANDING) - reaplicada aqui pra essa
// tela não destoar de onde o usuário veio (link "Criar cadastro" do card de
// login). Como OnboardingForm só usa classes globais (button, input, .badge
// - todas em var(--accent) etc.), só sobrescrever as custom properties no
// wrapper já muda a cara do formulário inteiro, sem editar o componente.
const CORES_LANDING = {
  "--bg": "#030509",
  "--panel": "rgba(13, 17, 28, 0.6)",
  "--border": "rgba(255, 255, 255, 0.08)",
  "--border-strong": "rgba(99, 102, 241, 0.4)",
  "--text": "#F8FAFC",
  "--text-dim": "#94A3B8",
  "--accent": "#3B82F6",
  "--accent-rgb": "59 130 246",
  "--accent-hover": "#2563EB",
  "--accent-glow": "rgba(59, 130, 246, 0.4)",
  "--danger": "#EF4444",
  "--danger-rgb": "239 68 68",
  "--danger-glow": "rgba(239, 68, 68, 0.15)",
  "--radius": "16px",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-bg relative overflow-hidden" style={CORES_LANDING}>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none mix-blend-overlay" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] z-0 pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      <nav className="w-full max-w-[1400px] mx-auto pt-12 px-[5%] flex justify-between items-center z-[100] relative">
        <Link href="/" className="flex items-center gap-3 text-text hover:opacity-80 transition-opacity">
          <Scale className="w-8 h-8 text-accent" />
          <span className="font-sans font-bold text-2xl tracking-wide text-white drop-shadow-md">Plataforma Jurídica</span>
        </Link>
        <Link href="/" className="text-sm font-semibold text-text-dim hover:text-white transition-colors">
          Voltar
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center w-full px-[5%] py-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[700px] h-[560px] bg-accent/10 rounded-full blur-[140px] opacity-60 pointer-events-none z-0" />

        <div className="relative overflow-hidden rounded-[20px] p-[1px] w-full max-w-[560px] z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-white/10 opacity-60" />
          <div className="relative bg-[#0D1424] rounded-[19px] p-8 md:p-12 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.05)] flex flex-col z-10 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/20 rounded-full blur-[40px] opacity-100 z-0 pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/10 rounded-full blur-[40px] opacity-100 z-0 pointer-events-none" />
            <div className="relative z-10">
              <span className="badge mb-4">Novo escritório</span>
              <h1 className="text-3xl font-serif font-semibold text-white tracking-tight mb-2">Criar cadastro</h1>
              <p className="text-sm text-text-dim mb-8 leading-relaxed">
                Cria o escritório e o seu acesso de advogado responsável. Uma senha temporária é gerada — você
                troca no primeiro login.
              </p>
              <OnboardingForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
