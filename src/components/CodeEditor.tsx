import React, { useState } from 'react';
import { CODE_TEMPLATES } from '../data/defaultContracts';
import { AuditIssue, AutoFixResult } from '../types/solana';
import { validateRustSyntax, applyAutoFix, applyAllAutoFixes } from '../utils/solanaAuditEngine';
import { ExportPdfButton } from './ExportPdfButton';
import {
  Play,
  RotateCcw,
  Shield,
  Layers,
  Key,
  Lock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Code,
  FileText,
  ChevronRight,
  Github,
  Wrench,
  Sparkles,
  Zap,
  Check,
  FileDown,
} from 'lucide-react';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  auditIssues: AuditIssue[];
  auditScore: number;
  onRunAudit: () => void;
  onResetCode: () => void;
  onOpenGithub?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  setCode,
  auditIssues,
  auditScore,
  onRunAudit,
  onResetCode,
  onOpenGithub,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('user_counter');
  const [activeRightTab, setActiveRightTab] = useState<'ast' | 'audit'>('audit');
  const [syntaxError, setSyntaxError] = useState<string | null>(null);
  const [auditSuccessMessage, setAuditSuccessMessage] = useState<string | null>(null);
  const [autoFixFeedback, setAutoFixFeedback] = useState<AutoFixResult | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    setSyntaxError(null);
    setAuditSuccessMessage(null);
    setAutoFixFeedback(null);
    const found = CODE_TEMPLATES.find((t) => t.id === templateId);
    if (found) {
      setCode(found.code);
    }
  };

  const handleRunAuditWithValidation = () => {
    const validation = validateRustSyntax(code);
    if (!validation.isValid) {
      setSyntaxError(validation.error || 'Erro de sintaxe Rust/Anchor detectado.');
      setAuditSuccessMessage(null);
      setAutoFixFeedback(null);
      return;
    }
    setSyntaxError(null);
    setIsAuditing(true);
    setActiveRightTab('audit');

    setTimeout(() => {
      onRunAudit();
      setIsAuditing(false);
      setAuditSuccessMessage(`Auditoria concluída! Nota de Segurança: ${auditScore}/100 (${auditIssues.length} verificações)`);
      setTimeout(() => {
        setAuditSuccessMessage(null);
      }, 5000);
    }, 300);
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (syntaxError) setSyntaxError(null);
    if (auditSuccessMessage) setAuditSuccessMessage(null);
  };

  const handleSingleAutoFix = (vulnerabilityId: string) => {
    const result = applyAutoFix(code, vulnerabilityId);
    if (result.success) {
      setCode(result.updatedCode);
      setAutoFixFeedback(result);
      setTimeout(() => {
        onRunAudit();
      }, 100);
    } else {
      alert(`Não foi possível aplicar a autocorreção: ${result.error || 'Regra incompatível com a estrutura atual do contrato'}`);
    }
  };

  const handleBatchAutoFix = () => {
    const result = applyAllAutoFixes(code);
    if (result.success) {
      setCode(result.updatedCode);
      setAutoFixFeedback(result);
      setTimeout(() => {
        onRunAudit();
      }, 100);
    } else {
      alert('Nenhuma vulnerabilidade pendente de autocorreção foi encontrada no código.');
    }
  };

  // Verificação se há vulnerabilidades passíveis de correção
  const hasFixableVulnerabilities = auditIssues.some(
    (i) => i.severity !== 'pass' && (i.fixAction !== undefined || i.id.includes('missing') || i.id.includes('unchecked'))
  );

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
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#f85149]/20 text-[#ff7b72] border border-[#f85149]/50 flex items-center gap-1"><XCircle className="w-3 h-3" /> Crítico</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#d29922]/20 text-[#ffa657] border border-[#d29922]/50 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Risco Alto</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#e3b341]/20 text-[#e3b341] border border-[#e3b341]/50">Alerta</span>;
      case 'low':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/50">Baixo</span>;
      case 'pass':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-[#238636]/20 text-[#7ee787] border border-[#238636]/50 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Seguro</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-100px)] lg:h-[calc(100vh-65px)] bg-[#0d1117] text-[#c9d1d9] overflow-y-auto lg:overflow-hidden">
      {/* LEFT: Code Editor Pane */}
      <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-[#30363d] min-w-0">
        {/* Editor Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs text-[#c9d1d9] bg-[#0d1117] px-2 py-1 rounded border border-[#30363d] max-w-full truncate">
              <FileText className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" />
              <span className="truncate">programs/solana_sandbox_counter/src/lib.rs</span>
            </div>

            {/* Template Selector */}
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="bg-[#0d1117] text-[11px] sm:text-xs font-mono text-[#c9d1d9] border border-[#30363d] rounded px-2 py-1 focus:outline-none focus:border-[#58a6ff] max-w-[220px] sm:max-w-xs truncate"
            >
              {CODE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  Modelo: {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ExportPdfButton
              contractTitle={CODE_TEMPLATES.find((t) => t.id === selectedTemplate)?.title || 'solana_sandbox_counter (lib.rs)'}
              code={code}
              auditScore={auditScore}
              auditIssues={auditIssues}
              autoFixResult={autoFixFeedback}
              variant="outline"
              label="Relatório PDF"
            />

            {onOpenGithub && (
              <button
                onClick={onOpenGithub}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors"
                title="Salvar/Exportar Smart Contract para o GitHub"
              >
                <Github className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Push para GitHub</span>
                <span className="sm:hidden">Push</span>
              </button>
            )}

            <button
              onClick={onResetCode}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors"
              title="Restaurar código do contrato Anchor fornecido"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restaurar Código</span>
              <span className="sm:hidden">Reset</span>
            </button>

            <button
              onClick={handleRunAuditWithValidation}
              disabled={isAuditing}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] border border-[#30363d] rounded transition-all shadow-sm disabled:opacity-60"
            >
              {isAuditing ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Play className="w-3.5 h-3.5 text-white fill-white" />
              )}
              <span>{isAuditing ? 'Analisando...' : 'Analisar e Auditar'}</span>
            </button>
          </div>
        </div>

        {/* Syntax Error Visual Alert Banner */}
        {syntaxError && (
          <div className="mx-3 my-2 p-3 bg-[#f85149]/15 border border-[#f85149]/60 text-[#ff7b72] rounded-md text-xs flex items-start justify-between gap-2 shadow-md shrink-0 animate-fadeIn">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-[#ff7b72] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-white text-[12px]">Erro de Sintaxe (Pré-Auditoria Bloqueada):</span>
                <p className="mt-0.5 leading-relaxed text-[#ff7b72] font-mono text-[11px]">{syntaxError}</p>
              </div>
            </div>
            <button
              onClick={() => setSyntaxError(null)}
              className="text-[#8b949e] hover:text-white px-1.5 py-0.5 text-xs bg-[#21262d] hover:bg-[#30363d] rounded border border-[#30363d] shrink-0"
              title="Fechar alerta"
            >
              ✕
            </button>
          </div>
        )}

        {/* Auto-Fix Feedback Toast & Diff Banner */}
        {autoFixFeedback && (
          <div className="mx-3 my-2 p-3 bg-[#1f6feb]/15 border border-[#1f6feb]/60 text-[#c9d1d9] rounded-md text-xs space-y-2 shadow-lg shrink-0 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Sparkles className="w-4 h-4 text-[#58a6ff]" />
                <span>Auto-Fix Aplicado: {autoFixFeedback.ruleApplied}</span>
              </div>
              <button
                onClick={() => setAutoFixFeedback(null)}
                className="text-[#8b949e] hover:text-white px-1.5 py-0.5 text-xs bg-[#21262d] hover:bg-[#30363d] rounded border border-[#30363d]"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-[#8b949e]">
                Score Anterior: <strong className="text-[#ffa657]">{autoFixFeedback.previousScore}/100</strong>
              </span>
              <span className="text-white">➔</span>
              <span className="text-[#7ee787] font-bold">
                Novo Score: {autoFixFeedback.newScore}/100 (+{autoFixFeedback.newScore - autoFixFeedback.previousScore} pts)
              </span>
            </div>

            {autoFixFeedback.modifiedLines.length > 0 && (
              <div className="p-2 bg-[#0d1117] rounded border border-[#30363d] text-[10px] font-mono text-[#8b949e] space-y-1 max-h-24 overflow-y-auto">
                <span className="text-[#58a6ff] block font-bold">Modificações Realizadas no AST:</span>
                {autoFixFeedback.modifiedLines.map((mod, idx) => (
                  <div key={idx} className="text-[#c9d1d9]">
                    • Linhas {mod.startLine}-{mod.endLine}: {mod.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Success Toast Banner */}
        {auditSuccessMessage && (
          <div className="mx-3 my-2 p-3 bg-[#238636]/15 border border-[#238636]/60 text-[#7ee787] rounded-md text-xs flex items-center justify-between gap-2 shadow-md shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#7ee787] shrink-0" />
              <span className="font-medium text-[12px]">{auditSuccessMessage}</span>
            </div>
            <button
              onClick={() => setAuditSuccessMessage(null)}
              className="text-[#8b949e] hover:text-white px-1.5 py-0.5 text-xs bg-[#21262d] hover:bg-[#30363d] rounded border border-[#30363d] shrink-0"
              title="Fechar alerta"
            >
              ✕
            </button>
          </div>
        )}

        {/* Code Input & Line Numbers */}
        <div className="flex-1 relative font-mono text-xs overflow-auto bg-[#0d1117] flex min-h-[350px] lg:min-h-0">
          {/* Line Numbers */}
          <div className="py-3 px-2.5 text-right text-[#8b949e] select-none bg-[#161b22]/50 border-r border-[#30363d] font-mono text-xs min-w-[36px] sm:min-w-[40px] leading-relaxed">
            {code.split('\n').map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Rust Syntax Editor */}
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            spellCheck={false}
            className="flex-1 p-3 bg-transparent text-[#c9d1d9] font-mono text-xs leading-relaxed focus:outline-none resize-none tab-4 whitespace-pre font-normal border-none"
            placeholder="// Cole ou edite o código do seu smart contract Rust Anchor aqui..."
          />
        </div>

        {/* Bottom Status bar */}
        <div className="px-3 sm:px-4 py-1.5 bg-[#161b22] border-t border-[#30363d] flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono text-[#8b949e]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#7ee787] animate-pulse"></span>
              Ambiente Anchor: Solana v1.18+ Moderno
            </span>
            <span>Linhas: {code.split('\n').length}</span>
            <span className="hidden sm:inline">Espaço: 49 Bytes (Isento de Aluguel)</span>
          </div>
          <div>Linguagem: Rust / Framework Anchor</div>
        </div>
      </div>

      {/* RIGHT: AST Inspector & Audit Panel */}
      <div className="w-full lg:w-[420px] flex flex-col bg-[#0d1117] border-t lg:border-t-0 border-[#30363d] shrink-0 max-h-[500px] lg:max-h-none overflow-y-auto">
        {/* Tab Headers */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d] sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveRightTab('audit')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                activeRightTab === 'audit'
                  ? 'bg-[#21262d] text-[#58a6ff] border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Auditoria</span>
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[#1f6feb26] text-[#58a6ff] font-mono border border-[#30363d]">
                {auditIssues.length}
              </span>
            </button>

            <button
              onClick={() => setActiveRightTab('ast')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
                activeRightTab === 'ast'
                  ? 'bg-[#21262d] text-[#58a6ff] border border-[#30363d]'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#d2a8ff]" />
              <span>Estrutura AST</span>
            </button>
          </div>

          <div className="font-mono text-xs font-bold text-[#c9d1d9] flex items-center gap-1 bg-[#0d1117] px-2 py-0.5 rounded border border-[#30363d]">
            <span>Nota:</span>
            <span className={auditScore >= 80 ? 'text-[#7ee787]' : 'text-[#ffa657]'}>
              {auditScore}/100
            </span>
          </div>
        </div>

        {/* TAB 1: AUDIT BREAKDOWN */}
        {activeRightTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {/* Executive PDF Export Banner */}
            <div className="p-3 bg-[#161b22] border border-[#1f6feb]/40 rounded-lg flex items-center justify-between gap-2 shadow-xs">
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#58a6ff]" />
                  Laudo Executivo de Auditoria (PDF)
                </span>
                <p className="text-[11px] text-[#8b949e] mt-0.5">
                  Gere o PDF com selo de pontuação ({auditScore}/100) e atestado de conformidade Anchor.
                </p>
              </div>
              <ExportPdfButton
                contractTitle={CODE_TEMPLATES.find((t) => t.id === selectedTemplate)?.title || 'solana_sandbox_counter (lib.rs)'}
                code={code}
                auditScore={auditScore}
                auditIssues={auditIssues}
                autoFixResult={autoFixFeedback}
                variant="primary"
                label="Baixar PDF"
                className="shrink-0 font-bold"
              />
            </div>

            {/* Auto-Fix All Global CTA if vulnerabilities exist */}
            {hasFixableVulnerabilities && (
              <div className="p-3 bg-gradient-to-r from-[#1f6feb26] to-[#23863626] border border-[#1f6feb]/40 rounded-lg flex items-center justify-between gap-2 shadow-xs">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#58a6ff]" />
                    Correção Automática Disponível
                  </span>
                  <p className="text-[11px] text-[#8b949e] mt-0.5">
                    Aplique todas as restrições Anchor recomendadas em 1 clique.
                  </p>
                </div>
                <button
                  onClick={handleBatchAutoFix}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#238636] hover:bg-[#2ea043] border border-[#30363d] rounded transition-all shrink-0 shadow-sm"
                  title="Aplicar todas as correções de segurança recomendadas"
                >
                  <Wrench className="w-3.5 h-3.5 text-white" />
                  <span>Corrigir Todas</span>
                </button>
              </div>
            )}

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
                    <span className="font-bold text-[#58a6ff]">Recomendação:</span> {issue.recommendation}
                  </div>

                  {issue.fixAction && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        onClick={() => handleSingleAutoFix(issue.id)}
                        className="text-[11px] font-semibold text-white bg-[#238636] hover:bg-[#2ea043] px-2.5 py-1 rounded border border-[#30363d] transition-colors self-start flex items-center gap-1.5 shadow-xs"
                        title="Aplicar correção automaticamente no código"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#7ee787]" />
                        <span>Auto-Fix: {issue.fixAction.label}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: AST & CONTRACT STRUCTURE */}
        {activeRightTab === 'ast' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 font-mono text-xs">
            {/* Program Identifier */}
            <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
              <div className="text-xs font-bold text-[#d2a8ff] uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>Declaração do Programa</span>
              </div>
              <div className="text-[#c9d1d9] text-[11px] bg-[#0d1117] p-2 rounded border border-[#30363d] break-all">
                declare_id!(&quot;Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS&quot;);
              </div>
              <p className="text-[11px] text-[#8b949e] font-sans">
                Corresponde ao ID de programa atual implantado no simulador de localnet/devnet.
              </p>
            </div>

            {/* Instruction Handlers */}
            <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
              <div className="text-xs font-bold text-[#58a6ff] uppercase tracking-wider flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" />
                <span>Manipuladores de Instrução</span>
              </div>
              <div className="space-y-1.5">
                <div className={`p-2 rounded border text-[11px] flex items-center justify-between ${hasInitialize ? 'bg-[#0d1117] border-[#238636]/60 text-[#7ee787]' : 'bg-[#0d1117]/50 border-[#30363d] text-[#8b949e]'}`}>
                  <span>fn initialize(ctx: Context&lt;Initialize&gt;)</span>
                  <span className="text-[10px] font-bold uppercase">{hasInitialize ? 'Encontrado' : 'Ausente'}</span>
                </div>
                <div className={`p-2 rounded border text-[11px] flex items-center justify-between ${hasIncrement ? 'bg-[#0d1117] border-[#238636]/60 text-[#7ee787]' : 'bg-[#0d1117]/50 border-[#30363d] text-[#8b949e]'}`}>
                  <span>fn increment(ctx: Context&lt;Increment&gt;)</span>
                  <span className="text-[10px] font-bold uppercase">{hasIncrement ? 'Encontrado' : 'Ausente'}</span>
                </div>
                {hasDecrement && (
                  <div className="p-2 rounded border text-[11px] flex items-center justify-between bg-[#0d1117] border-[#238636]/60 text-[#7ee787]">
                    <span>fn decrement(ctx: Context&lt;Decrement&gt;)</span>
                    <span className="text-[10px] font-bold uppercase">Encontrado</span>
                  </div>
                )}
                {hasReset && (
                  <div className="p-2 rounded border text-[11px] flex items-center justify-between bg-[#0d1117] border-[#238636]/60 text-[#7ee787]">
                    <span>fn reset(ctx: Context&lt;Reset&gt;)</span>
                    <span className="text-[10px] font-bold uppercase">Encontrado</span>
                  </div>
                )}
                {hasClose && (
                  <div className="p-2 rounded border text-[11px] flex items-center justify-between bg-[#0d1117] border-[#238636]/60 text-[#7ee787]">
                    <span>fn close(ctx: Context&lt;CloseAccount&gt;)</span>
                    <span className="text-[10px] font-bold uppercase">Encontrado</span>
                  </div>
                )}
              </div>
            </div>

            {/* Account Structures & Constraints */}
            <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
              <div className="text-xs font-bold text-[#ffa657] uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Restrições PDA da Conta</span>
              </div>
              <div className="bg-[#0d1117] p-2.5 rounded border border-[#30363d] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-[#c9d1d9] font-bold border-b border-[#30363d] pb-1">
                  <span>Parâmetro de Restrição</span>
                  <span>Status de Validação</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[#8b949e] truncate">seeds = [b&quot;counter&quot;, authority]</span>
                  <span className={hasSeeds ? 'text-[#7ee787] font-bold shrink-0' : 'text-[#ff7b72] shrink-0'}>
                    {hasSeeds ? 'Vetor de Seeds Válido' : 'Inválido / Ausente'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[#8b949e] truncate">has_one = authority</span>
                  <span className={hasHasOne ? 'text-[#7ee787] font-bold shrink-0' : 'text-[#ff7b72] shrink-0'}>
                    {hasHasOne ? 'Controle de Acesso OK' : 'Falta Checagem'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[#8b949e] truncate">space = 8 + 32 + 8 + 1</span>
                  <span className="text-[#7ee787] font-bold shrink-0">49 Bytes Alocados</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
