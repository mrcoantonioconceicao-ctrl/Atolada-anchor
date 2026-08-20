import React from 'react';
import { ShieldCheck, Code2, Cpu, Terminal, FileCode, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  activeTab: 'editor' | 'pda' | 'simulator' | 'sdk' | 'guide';
  setActiveTab: (tab: 'editor' | 'pda' | 'simulator' | 'sdk' | 'guide') => void;
  auditScore: number;
  onOpenAi: () => void;
  onRunAudit: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  auditScore,
  onOpenAi,
  onRunAudit,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#7ee787] bg-[#238636]/20 border-[#238636]/60';
    if (score >= 50) return 'text-[#d2a8ff] bg-[#1f6feb]/20 border-[#1f6feb]/60';
    return 'text-[#ff7b72] bg-[#f85149]/20 border-[#f85149]/60';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#161b22] border-b border-[#30363d] px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-0.5 shadow-sm">
            <div className="w-full h-full bg-[#0d1117] rounded-[5px] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#14F195]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#c9d1d9] text-sm tracking-tight">
                Solana Architect <span className="text-[#8b949e] font-normal">/ counter_sandbox</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium uppercase bg-[#1f6feb26] text-[#58a6ff] rounded border border-[#30363d]">
                Anchor v0.30
              </span>
            </div>
            <p className="text-[11px] text-[#8b949e] font-normal leading-none mt-0.5">
              PDA & Smart Contract Security Auditor
            </p>
          </div>
        </div>

        {/* Zone 2: Navigation Tabs (Single-line contract) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#0d1117] p-1 rounded-md border border-[#30363d]">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'editor'
                ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-[#d2a8ff]" />
            <span>Rust IDE & Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('pda')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'pda'
                ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>PDA Visualizer</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#7ee787]" />
            <span>Execution Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab('sdk')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'sdk'
                ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-[#ffa657]" />
            <span>IDL & SDK</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#a5d6ff]" />
            <span>Security Masterclass</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions & Audit Score */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-xs font-semibold cursor-pointer transition-all ${getScoreColor(
              auditScore
            )}`}
            onClick={() => {
              setActiveTab('editor');
              onRunAudit();
            }}
            title="Click to view security audit breakdown"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Score: {auditScore}/100</span>
          </div>

          <button
            onClick={onOpenAi}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#238636] hover:bg-[#2ea043] rounded transition-colors border border-[#30363d] shrink-0 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Anchor AI Assistant</span>
            <span className="sm:hidden">AI</span>
          </button>
        </div>
      </div>
    </header>
  );
};
