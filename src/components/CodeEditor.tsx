import React, { useState } from 'react';
import { CODE_TEMPLATES } from '../data/defaultContracts';
import { AuditIssue } from '../types/solana';
import { Play, RotateCcw, Shield, Layers, Key, Lock, CheckCircle2, AlertTriangle, XCircle, Code, FileText, ChevronRight } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  auditIssues: AuditIssue[];
  auditScore: number;
  onRunAudit: () => void;
  onResetCode: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  setCode,
  auditIssues,
  auditScore,
  onRunAudit,
  onResetCode,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('user_counter');
  const [activeRightTab, setActiveRightTab] = useState<'ast' | 'audit'>('audit');

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const found = CODE_TEMPLATES.find((t) => t.id === templateId);
    if (found) {
      setCode(found.code);
    }
  };

  // AST Structure Analysis Extraction
  const hasInitialize = code.includes('pub fn initialize');
  const hasIncrement = code.includes('pub fn increment');
  const hasDecrement = code.includes('pub fn decrement');
  const hasReset = code.includes('pub fn reset');
  const hasClose = code.includes('pub fn close');
  const hasHasOne = code.includes('has_one = authority');
  const hasSeeds = code.includes('seeds = [b"counter"');

  const getSeverityBadge = (sev: AuditIssue['severity']) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#f85149]/20 text-[#ff7b72] border border-[#f85149]/50 flex items-center gap-1"><XCircle className="w-3 h-3" /> Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#d29922]/20 text-[#ffa657] border border-[#d29922]/50 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> High Risk</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#e3b341]/20 text-[#e3b341] border border-[#e3b341]/50">Warning</span>;
      case 'low':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/50">Low</span>;
      case 'pass':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#238636]/20 text-[#7ee787] border border-[#238636]/50 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Secure</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)] bg-[#0d1117] text-[#c9d1d9] overflow-hidden">
      {/* LEFT: Code Editor Pane */}
      <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-[#30363d] min-w-0">
        {/* Editor Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-xs text-[#c9d1d9] bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
              <FileText className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>programs/solana_sandbox_counter/src/lib.rs</span>
            </div>

            {/* Template Selector */}
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="bg-[#0d1117] text-xs font-mono text-[#c9d1d9] border border-[#30363d] rounded px-2.5 py-1 focus:outline-none focus:border-[#58a6ff]"
            >
              {CODE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  Template: {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetCode}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors"
              title="Reset to provided Anchor contract code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Code</span>
            </button>

            <button
              onClick={onRunAudit}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] border border-[#30363d] rounded transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 text-white fill-white" />
              <span>Analyze & Audit</span>
            </button>
          </div>
        </div>

        {/* Code Input & Line Numbers */}
        <div className="flex-1 relative font-mono text-xs overflow-auto bg-[#0d1117] flex">
          {/* Line Numbers */}
          <div className="py-3 px-3 text-right text-[#8b949e] select-none bg-[#161b22]/50 border-r border-[#30363d] font-mono text-xs min-w-[40px] leading-relaxed">
            {code.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Rust Syntax Editor */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 p-3 bg-transparent text-[#c9d1d9] font-mono text-xs leading-relaxed focus:outline-none resize-none tab-4 whitespace-pre font-normal border-none"
            placeholder="// Paste or edit your Rust Anchor smart contract code here..."
          />
        </div>

        {/* Bottom Status bar */}
        <div className="px-4 py-1.5 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between text-[11px] font-mono text-[#8b949e]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#7ee787] animate-pulse"></span>
              Anchor Environment: Modern Solana v1.18+
            </span>
            <span>Lines: {code.split('\n').length}</span>
            <span>Space: 49 Bytes (Rent Exempt)</span>
          </div>
          <div>Language: Rust / Anchor Framework</div>
        </div>
      </div>

      {/* RIGHT: AST Inspector & Audit Panel */}
      <div className="w-full lg:w-[420px] flex flex-col bg-[#0d1117] border-t lg:border-t-0 border-[#30363d] shrink-0">
        {/* Tab Headers */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveRightTab('audit')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
                activeRightTab === 'audit'
                  ? 'bg-[#21262d] text-[#58a6ff] border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Security Audit</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[#1f6feb26] text-[#58a6ff] font-mono border border-[#30363d]">
                {auditIssues.length}
              </span>
            </button>

            <button
              onClick={() => setActiveRightTab('ast')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
                activeRightTab === 'ast'
                  ? 'bg-[#21262d] text-[#58a6ff] border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#d2a8ff]" />
              <span>AST & PDA Seeds</span>
            </button>
          </div>

          <div className="font-mono text-xs font-bold text-[#c9d1d9] flex items-center gap-1 bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">
            <span>Score:</span>
            <span className={auditScore >= 80 ? 'text-[#7ee787]' : 'text-[#ffa657]'}>
              {auditScore}/100
            </span>
          </div>
        </div>

        {/* TAB 1: AUDIT BREAKDOWN */}
        {activeRightTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {auditIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2 hover:border-[#8b949e]/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-xs text-[#c9d1d9] flex items-center gap-1.5">
                    {issue.title}
                  </span>
                  {getSeverityBadge(issue.severity)}
                </div>

                <p className="text-xs text-[#8b949e] leading-relaxed">
                  {issue.description}
                </p>

                <div className="pt-1 border-t border-[#30363d] flex flex-col gap-1.5">
                  <div className="text-[11px] text-[#a5d6ff] font-mono bg-[#0d1117] p-2 rounded border border-[#30363d]">
                    <span className="font-bold text-[#58a6ff]">Recommendation:</span> {issue.recommendation}
                  </div>

                  {issue.fixAction && (
                    <button
                      onClick={() => {
                        if (issue.fixAction?.patchCode) {
                          alert(`Suggested fix snippet:\n\n${issue.fixAction.patchCode}`);
                        }
                      }}
                      className="text-[11px] font-semibold text-[#7ee787] hover:text-white bg-[#238636]/30 hover:bg-[#238636] px-2.5 py-1 rounded border border-[#238636]/60 transition-colors self-start flex items-center gap-1"
                    >
                      <Code className="w-3 h-3" />
                      <span>{issue.fixAction.label}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: AST & CONTRACT STRUCTURE */}
        {activeRightTab === 'ast' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {/* Program Identifier */}
            <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
              <div className="text-xs font-bold text-[#d2a8ff] uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>Program Declaration</span>
              </div>
              <div className="text-[#c9d1d9] text-[11px] bg-[#0d1117] p-2 rounded border border-[#30363d] break-all">
                declare_id!(&quot;Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS&quot;);
              </div>
              <p className="text-[11px] text-[#8b949e] font-sans">
                Matches current program ID deployed on localnet/devnet simulator.
              </p>
            </div>

            {/* Instruction Handlers */}
            <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
              <div className="text-xs font-bold text-[#58a6ff] uppercase tracking-wider flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" />
                <span>Instruction Handlers</span>
              </div>
              <div className="space-y-1.5">
                <div className={`p-2 rounded border text-[11px] flex items-center justify-between ${hasInitialize ? 'bg-[#0d1117] border-[#238636]/60 text-[#7ee787]' : 'bg-[#0d1117]/50 border-[#30363d] text-[#8b949e]'}`}>
                  <span>fn initialize(ctx: Context&lt;Initialize&gt;)</span>
                  <span className="text-[10px] font-bold uppercase">{hasInitialize ? 'Found' : 'Missing'}</span>
                </div>
                <div className={`p-2 rounded border text-[11px] flex items-center justify-between ${hasIncrement ? 'bg-[#0d1117] border-[#238636]/60 text-[#7ee787]' : 'bg-[#0d1117]/50 border-[#30363d] text-[#8b949e]'}`}>
                  <span>fn increment(ctx: Context&lt;Increment&gt;)</span>
                  <span className="text-[10px] font-bold uppercase">{hasIncrement ? 'Found' : 'Missing'}</span>
                </div>
                {hasDecrement && (
                  <div className="p-2 rounded border text-[11px] flex items-center justify-between bg-[#0d1117] border-[#238636]/60 text-[#7ee787]">
                    <span>fn decrement(ctx: Context&lt;Decrement&gt;)</span>
                    <span className="text-[10px] font-bold uppercase">Found</span>
                  </div>
                )}
                {hasReset && (
                  <div className="p-2 rounded border text-[11px] flex items-center justify-between bg-[#0d1117] border-[#238636]/60 text-[#7ee787]">
                    <span>fn reset(ctx: Context&lt;Reset&gt;)</span>
                    <span className="text-[10px] font-bold uppercase">Found</span>
                  </div>
                )}
                {hasClose && (
                  <div className="p-2 rounded border text-[11px] flex items-center justify-between bg-[#0d1117] border-[#238636]/60 text-[#7ee787]">
                    <span>fn close(ctx: Context&lt;CloseAccount&gt;)</span>
                    <span className="text-[10px] font-bold uppercase">Found</span>
                  </div>
                )}
              </div>
            </div>

            {/* Account Structures & Constraints */}
            <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
              <div className="text-xs font-bold text-[#ffa657] uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Account PDA Constraints</span>
              </div>
              <div className="bg-[#0d1117] p-2.5 rounded border border-[#30363d] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-[#c9d1d9] font-bold border-b border-[#30363d] pb-1">
                  <span>Constraint Parameter</span>
                  <span>Validation Status</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b949e]">seeds = [b&quot;counter&quot;, authority]</span>
                  <span className={hasSeeds ? 'text-[#7ee787] font-bold' : 'text-[#ff7b72]'}>
                    {hasSeeds ? 'Valid Seed Array' : 'Missing / Invalid'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b949e]">has_one = authority</span>
                  <span className={hasHasOne ? 'text-[#7ee787] font-bold' : 'text-[#ff7b72]'}>
                    {hasHasOne ? 'Access Control Set' : 'Missing Check'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b949e]">space = 8 + 32 + 8 + 1</span>
                  <span className="text-[#7ee787] font-bold">49 Bytes Allocated</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
