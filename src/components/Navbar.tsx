import React, { useState } from 'react';
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
  Menu,
  X,
  User,
  ExternalLink,
  ChevronRight,
  Zap,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const criticalIssues = auditIssues.filter((i) => i.severity === 'critical');
  const highIssues = auditIssues.filter((i) => i.severity === 'high');
  const criticalCount = criticalIssues.length;
  const highCount = highIssues.length;
  const totalHighPriority = criticalCount + highCount;

  const getScoreBadgeStyles = () => {
    if (criticalCount > 0) {
      return 'text-[#ff7b72] bg-[#f85149]/15 border-[#f85149]/50 hover:bg-[#f85149]/25 hover:border-[#f85149]/70';
    }
    if (highCount > 0) {
      return 'text-[#f0883e] bg-[#d29922]/15 border-[#d29922]/50 hover:bg-[#d29922]/25 hover:border-[#d29922]/70';
    }
    if (auditScore >= 85) {
      return 'text-[#7ee787] bg-[#238636]/15 border-[#238636]/50 hover:bg-[#238636]/25 hover:border-[#238636]/70';
    }
    return 'text-[#58a6ff] bg-[#1f6feb]/15 border-[#1f6feb]/50 hover:bg-[#1f6feb]/25 hover:border-[#1f6feb]/70';
  };

  const navItems = [
    {
      id: 'editor' as const,
      label: 'IDE Rust & Auditoria',
      description: 'Editor AST, Análise Estática & Auto-Fix',
      icon: Code2,
      iconColor: 'text-[#d2a8ff]',
    },
    {
      id: 'pda' as const,
      label: 'Visualizador de PDA',
      description: 'Seeds, Bumps Canônicos & Derivação',
      icon: ShieldCheck,
      iconColor: 'text-[#58a6ff]',
    },
    {
      id: 'simulator' as const,
      label: 'Simulador de Execução',
      description: 'Testes de Instruções & Signers',
      icon: Terminal,
      iconColor: 'text-[#7ee787]',
    },
    {
      id: 'sdk' as const,
      label: 'IDL & SDK Client',
      description: 'TypeScript SDK & Schema JSON',
      icon: FileCode,
      iconColor: 'text-[#ffa657]',
    },
    {
      id: 'rust_engine' as const,
      label: 'Rust Core Engine',
      description: 'Compilador Virtual BPF & LLVM',
      icon: Cpu,
      iconColor: 'text-[#58a6ff]',
    },
    {
      id: 'guide' as const,
      label: 'Guia de Segurança',
      description: 'Top 10 Vulnerabilidades Solana',
      icon: BookOpen,
      iconColor: 'text-[#a5d6ff]',
    },
  ];

  const handleTabClick = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#161b22] border-r border-[#30363d] text-[#c9d1d9] select-none">
      {/* 1. Sidebar Brand Header */}
      <div className="p-4 border-b border-[#30363d] bg-[#0d1117]/80 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-0.5 shadow-md shrink-0">
              <div className="w-full h-full bg-[#0d1117] rounded-[6px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#14F195]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-white text-sm tracking-tight leading-tight">
                  Solana Architect
                </h1>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-medium uppercase bg-[#1f6feb]/20 text-[#58a6ff] rounded border border-[#1f6feb]/40">
                  Anchor v0.30
                </span>
                <span className="text-[10px] text-[#8b949e] font-mono">Devnet</span>
              </div>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-[#8b949e] hover:text-white rounded-md hover:bg-[#21262d]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Body: Audit Widget, Nav Items, Quick Actions */}
      <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-4">
        {/* Security Audit Score Card Widget */}
        <div
          onClick={() => {
            handleTabClick('editor');
            onRunAudit();
          }}
          className={`p-3 rounded-lg border cursor-pointer transition-all shadow-sm ${getScoreBadgeStyles()}`}
          title="Clique para auditar o Smart Contract no Editor"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              {criticalCount > 0 ? (
                <AlertCircle className="w-4 h-4 text-[#ff7b72] animate-pulse shrink-0" />
              ) : highCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-[#f0883e] shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#7ee787] shrink-0" />
              )}
              <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                Auditoria de Segurança
              </span>
            </div>
            <span className="font-mono font-black text-sm tracking-tight">
              {auditScore}/100
            </span>
          </div>

          {totalHighPriority > 0 ? (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-current/20">
              {criticalCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#f85149]/30 text-[#ff7b72] rounded border border-[#f85149]/50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f85149]" />
                  {criticalCount} {criticalCount === 1 ? 'Crítica' : 'Críticas'}
                </span>
              )}
              {highCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#d29922]/30 text-[#f0883e] rounded border border-[#d29922]/50 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f0883e]" />
                  {highCount} {highCount === 1 ? 'Alta' : 'Altas'}
                </span>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-[#7ee787] font-mono flex items-center justify-between mt-1">
              <span>Nenhuma vulnerabilidade crítica</span>
              <ChevronRight className="w-3 h-3 opacity-70" />
            </div>
          )}
        </div>

        {/* AI Anchor Assistant Quick Launch Banner */}
        <button
          onClick={() => {
            setIsMobileMenuOpen(false);
            onOpenAi();
          }}
          className="w-full p-2.5 bg-gradient-to-r from-[#238636]/90 to-[#2ea043]/90 hover:from-[#238636] hover:to-[#2ea043] text-white rounded-lg shadow-sm border border-[#2ea043]/40 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-black/20 rounded-md">
              <Sparkles className="w-4 h-4 text-[#7ee787] group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold leading-tight flex items-center gap-1">
                <span>Assistente IA Anchor</span>
                <span className="px-1 py-0.2 text-[8px] bg-white/20 rounded font-mono uppercase">Gemini</span>
              </div>
              <div className="text-[10px] text-white/80 leading-tight">Auditoria & Geração</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Navigation Group */}
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b949e] px-2 mb-1.5">
            Módulos do Sistema
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-[#1f6feb]/20 text-white border border-[#1f6feb]/50 font-semibold shadow-xs'
                      : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-[#58a6ff]' : item.iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs leading-tight ${isActive ? 'text-[#58a6ff]' : 'text-[#c9d1d9]'}`}>
                      {item.label}
                    </div>
                    <div className="text-[10px] text-[#8b949e] truncate leading-tight mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] self-center shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tools & Integrations Group */}
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8b949e] px-2 mb-1.5">
            Ferramentas & Integrações
          </div>

          <div className="space-y-1">
            {onOpenGithub && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenGithub('import');
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs text-[#c9d1d9] hover:text-white hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-all group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Github className="w-4 h-4 text-white shrink-0" />
                  <div className="truncate">
                    <div className="text-xs text-[#c9d1d9] group-hover:text-white font-medium truncate">
                      GitHub (URL & Push)
                    </div>
                    <div className="text-[10px] text-[#8b949e] truncate">
                      Abrir Repositórios Públicos
                    </div>
                  </div>
                </div>
                <span className="px-1.5 py-0.2 text-[9px] font-mono bg-[#238636]/20 text-[#7ee787] rounded border border-[#238636]/40 shrink-0">
                  Livre
                </span>
              </button>
            )}

            {onOpenCloud && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenCloud();
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs text-[#c9d1d9] hover:text-white hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-all group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Cloud className="w-4 h-4 text-[#58a6ff] shrink-0" />
                  <div className="truncate">
                    <div className="text-xs text-[#c9d1d9] group-hover:text-white font-medium truncate">
                      Cloud Projects
                    </div>
                    <div className="text-[10px] text-[#8b949e] truncate">
                      Firebase Firestore Sync
                    </div>
                  </div>
                </div>
                {user ? (
                  <span className="w-2 h-2 rounded-full bg-[#7ee787] shrink-0" title="Conectado ao Firebase" />
                ) : (
                  <span className="text-[10px] font-mono text-[#8b949e] shrink-0">Off</span>
                )}
              </button>
            )}

            {onOpenTour && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenTour();
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs text-[#c9d1d9] hover:text-[#14F195] hover:bg-[#14F195]/10 border border-transparent hover:border-[#14F195]/30 transition-all group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Compass className="w-4 h-4 text-[#14F195] shrink-0" />
                  <div className="truncate">
                    <div className="text-xs text-[#c9d1d9] group-hover:text-[#14F195] font-medium truncate">
                      Tour do Sistema
                    </div>
                    <div className="text-[10px] text-[#8b949e] truncate">
                      Guia Interativo Passo a Passo
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#8b949e] group-hover:text-[#14F195] shrink-0" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Sidebar Footer / User Account Status */}
      <div className="p-3 border-t border-[#30363d] bg-[#0d1117] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {user ? (
              <div className="w-7 h-7 rounded-full bg-[#238636]/20 border border-[#238636] flex items-center justify-center text-[#7ee787] font-bold text-xs shrink-0">
                {user.email ? user.email.slice(0, 2).toUpperCase() : 'U'}
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-[#8b949e] shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-medium text-white truncate">
                {user ? user.email || 'Conta Conectada' : 'Modo Convidado'}
              </div>
              <div className="text-[10px] text-[#8b949e] font-mono flex items-center gap-1 leading-none mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7ee787]" />
                <span>Solana Devnet Live</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. Desktop Left Sidebar (Visible on lg: screens and above)                 */}
      {/* ========================================================================= */}
      <aside className="hidden lg:block w-64 xl:w-72 h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* ========================================================================= */}
      {/* 2. Mobile / Tablet Top Header with Drawer Trigger                         */}
      {/* ========================================================================= */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#161b22] border-b border-[#30363d] px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-md transition-colors"
            title="Abrir Menu de Navegação e Ferramentas"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-0.5 shadow-sm">
              <div className="w-full h-full bg-[#0d1117] rounded-[4px] flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-[#14F195]" />
              </div>
            </div>
            <span className="font-bold text-white text-xs tracking-tight">
              Solana Architect
            </span>
          </div>
        </div>

        {/* Quick Actions for Mobile Top Bar */}
        <div className="flex items-center gap-2">
          {/* Quick Score */}
          <div
            onClick={() => {
              setActiveTab('editor');
              onRunAudit();
            }}
            className={`px-2 py-1 rounded border font-mono text-[11px] font-bold cursor-pointer ${getScoreBadgeStyles()}`}
          >
            {auditScore}/100
          </div>

          {/* Quick AI Button */}
          <button
            onClick={onOpenAi}
            className="p-1.5 bg-[#238636] hover:bg-[#2ea043] text-white rounded border border-[#30363d]"
            title="Assistente IA Anchor"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. Mobile Slide-Over Drawer                                               */}
      {/* ========================================================================= */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-slideRight">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};


