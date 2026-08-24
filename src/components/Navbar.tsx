import React from 'react';
import { ShieldCheck, Code2, Cpu, Terminal, FileCode, BookOpen, Sparkles, CheckCircle2, Github } from 'lucide-react';

interface NavbarProps {
  activeTab: 'editor' | 'pda' | 'simulator' | 'sdk' | 'guide' | 'rust_engine';
  setActiveTab: (tab: 'editor' | 'pda' | 'simulator' | 'sdk' | 'guide' | 'rust_engine') => void;
  auditScore: number;
  onOpenAi: () => void;
  onRunAudit: () => void;
  onOpenGithub?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  auditScore,
  onOpenAi,
  onRunAudit,
  onOpenGithub,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#7ee787] bg-[#238636]/20 border-[#238636]/60';
    if (score >= 50) return 'text-[#d2a8ff] bg-[#1f6feb]/20 border-[#1f6feb]/60';
    return 'text-[#ff7b72] bg-[#f85149]/20 border-[#f85149]/60';
  };

  const navItems = [
    { id: 'editor' as const, label: 'IDE Rust e Auditoria', icon: Code2, iconColor: 'text-[#d2a8ff]' },
    { id: 'pda' as const, label: 'Visualizador de PDA', icon: ShieldCheck, iconColor: 'text-[#58a6ff]' },
    { id: 'simulator' as const, label: 'Simulador de Execução', icon: Terminal, iconColor: 'text-[#7ee787]' },
    { id: 'sdk' as const, label: 'IDL e SDK Client', icon: FileCode, iconColor: 'text-[#ffa657]' },
    { id: 'rust_engine' as const, label: 'Rust Core Engine', icon: Cpu, iconColor: 'text-[#58a6ff]' },
    { id: 'guide' as const, label: 'Guia de Segurança', icon: BookOpen, iconColor: 'text-[#a5d6ff]' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#161b22] border-b border-[#30363d]">
      {/* Primary Header Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-0.5 shadow-sm">
            <div className="w-full h-full bg-[#0d1117] rounded-[5px] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#14F195]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-semibold text-[#c9d1d9] text-xs sm:text-sm tracking-tight">
                Solana Architect <span className="text-[#8b949e] font-normal hidden sm:inline">/ counter_sandbox</span>
              </span>
              <span className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-medium uppercase bg-[#1f6feb26] text-[#58a6ff] rounded border border-[#30363d]">
                Anchor v0.30
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#8b949e] font-normal leading-none mt-0.5">
              Auditor de Segurança & PDAs Solana
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs for Desktop/Notebook */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#0d1117] p-1 rounded-md border border-[#30363d]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  activeTab === item.id
                    ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d]'
                    : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions & Audit Score */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenGithub && (
            <button
              onClick={onOpenGithub}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] rounded transition-colors border border-[#30363d] shrink-0 whitespace-nowrap"
              title="Salvar/Exportar Smart Contract para o GitHub"
            >
              <Github className="w-3.5 h-3.5 text-white" />
              <span className="hidden md:inline">Push GitHub</span>
              <span className="md:hidden">GitHub</span>
            </button>
          )}

          <div
            className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded border font-mono text-xs font-semibold cursor-pointer transition-all ${getScoreColor(
              auditScore
            )}`}
            onClick={() => {
              setActiveTab('editor');
              onRunAudit();
            }}
            title="Clique para ver detalhes da auditoria de segurança"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Nota: {auditScore}/100</span>
          </div>

          <button
            onClick={onOpenAi}
            className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium text-white bg-[#238636] hover:bg-[#2ea043] rounded transition-colors border border-[#30363d] shrink-0 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Assistente IA Anchor</span>
            <span className="sm:hidden">IA</span>
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Sub-nav Bar for Mobile and Small Notebook Screens */}
      <div className="lg:hidden border-t border-[#30363d]/80 bg-[#0d1117] px-2 py-1.5 overflow-x-auto scrollbar-none flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] bg-[#161b22]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

