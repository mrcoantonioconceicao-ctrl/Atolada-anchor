import React from 'react';
import {
  ShieldCheck,
  Code2,
  Cpu,
  Terminal,
  FileCode,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Github,
  Cloud,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuditIssue } from '../types/solana';

interface NavbarProps {
  activeTab: 'editor' | 'pda' | 'simulator' | 'sdk' | 'guide' | 'rust_engine';
  setActiveTab: (tab: 'editor' | 'pda' | 'simulator' | 'sdk' | 'guide' | 'rust_engine') => void;
  auditScore: number;
  auditIssues?: AuditIssue[];
  onOpenAi: () => void;
  onRunAudit: () => void;
  onOpenGithub?: (tab?: 'import' | 'export') => void;
  onOpenCloud?: () => void;
  onOpenTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  auditScore,
  auditIssues = [],
  onOpenAi,
  onRunAudit,
  onOpenGithub,
  onOpenCloud,
  onOpenTour,
}) => {
  const { user } = useAuth();

  const criticalIssues = auditIssues.filter((i) => i.severity === 'critical');
  const highIssues = auditIssues.filter((i) => i.severity === 'high');
  const criticalCount = criticalIssues.length;
  const highCount = highIssues.length;
  const totalHighPriority = criticalCount + highCount;

  const getScoreBadgeStyles = () => {
    if (criticalCount > 0) {
      return 'text-[#ff7b72] bg-[#f85149]/10 border-[#f85149]/50 hover:bg-[#f85149]/20 hover:border-[#f85149]/70';
    }
    if (highCount > 0) {
      return 'text-[#f0883e] bg-[#d29922]/10 border-[#d29922]/50 hover:bg-[#d29922]/20 hover:border-[#d29922]/70';
    }
    if (auditScore >= 85) {
      return 'text-[#7ee787] bg-[#238636]/10 border-[#238636]/50 hover:bg-[#238636]/20 hover:border-[#238636]/70';
    }
    return 'text-[#58a6ff] bg-[#1f6feb]/10 border-[#1f6feb]/50 hover:bg-[#1f6feb]/20 hover:border-[#1f6feb]/70';
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

        {/* Zone 3: Primary Actions & Audit Score with High-Priority Vulnerability Breakdown */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenTour && (
            <button
              onClick={onOpenTour}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium text-[#14F195] bg-[#14F195]/10 hover:bg-[#14F195]/20 border border-[#14F195]/30 rounded transition-colors shrink-0 whitespace-nowrap shadow-xs"
              title="Tour Completo e Tutorial do Sistema"
            >
              <Compass className="w-3.5 h-3.5 text-[#14F195]" />
              <span className="hidden md:inline font-semibold">Tour & Guia</span>
              <span className="md:hidden font-semibold">Tour</span>
            </button>
          )}

          {onOpenCloud && (
            <button
              onClick={onOpenCloud}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] rounded transition-colors border border-[#30363d] shrink-0 whitespace-nowrap"
              title="Firebase Cloud Sync e Contratos Salvos"
            >
              <Cloud className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span className="hidden md:inline">Cloud Projects</span>
              <span className="md:hidden">Cloud</span>
              {user && (
                <span className="w-2 h-2 rounded-full bg-[#7ee787] ml-0.5" />
              )}
            </button>
          )}

          {onOpenGithub && (
            <button
              onClick={() => onOpenGithub('import')}
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] rounded transition-colors border border-[#30363d] shrink-0 whitespace-nowrap shadow-xs"
              title="Abrir Repositório Público do GitHub por URL ou Exportar"
            >
              <Github className="w-3.5 h-3.5 text-white" />
              <span className="hidden md:inline">GitHub (URL)</span>
              <span className="md:hidden">GitHub</span>
            </button>
          )}

          {/* Interactive Audit Summary Badge with High-Priority Indicators */}
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md border font-mono text-xs cursor-pointer transition-all shadow-xs ${getScoreBadgeStyles()}`}
            onClick={() => {
              setActiveTab('editor');
              onRunAudit();
            }}
            title={`Auditoria: ${auditScore}/100 • ${criticalCount} Críticas, ${highCount} Altas. Clique para inspecionar no Editor.`}
          >
            {criticalCount > 0 ? (
              <AlertCircle className="w-3.5 h-3.5 text-[#ff7b72] shrink-0 animate-pulse" />
            ) : highCount > 0 ? (
              <AlertTriangle className="w-3.5 h-3.5 text-[#f0883e] shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#7ee787] shrink-0" />
            )}

            <span className="font-bold whitespace-nowrap">
              {auditScore}/100
            </span>

            {/* High-Priority Vulnerability Summary Badges */}
            {totalHighPriority > 0 ? (
              <div className="flex items-center gap-1 shrink-0">
                {criticalCount > 0 && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#f85149]/25 text-[#ff7b72] border border-[#f85149]/40 leading-none whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f85149] shrink-0" />
                    {criticalCount} <span className="hidden sm:inline">{criticalCount === 1 ? 'Crit' : 'Crits'}</span>
                  </span>
                )}
                {highCount > 0 && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d29922]/25 text-[#f0883e] border border-[#d29922]/40 leading-none whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#f0883e] shrink-0" />
                    {highCount} <span className="hidden sm:inline">{highCount === 1 ? 'Alta' : 'Altas'}</span>
                  </span>
                )}
              </div>
            ) : (
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#238636]/25 text-[#7ee787] border border-[#238636]/40 leading-none whitespace-nowrap">
                0 Falhas
              </span>
            )}
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

