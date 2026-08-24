import React, { useState } from 'react';
import { FileDown, Check, Loader2, FileText, Shield } from 'lucide-react';
import { AuditIssue, AutoFixResult } from '../types/solana';
import { generateAuditPdfReport } from '../utils/pdfReportGenerator';

interface ExportPdfButtonProps {
  contractTitle?: string;
  code?: string;
  auditScore: number;
  auditIssues: AuditIssue[];
  autoFixResult?: AutoFixResult | null;
  programId?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'compact';
  className?: string;
  label?: string;
}

export const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({
  contractTitle = 'solana_sandbox_counter (lib.rs)',
  code = '',
  auditScore,
  auditIssues,
  autoFixResult,
  programId = 'CtsZ1...4Kp9',
  variant = 'primary',
  className = '',
  label,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExportPdf = () => {
    try {
      setIsGenerating(true);
      setTimeout(() => {
        generateAuditPdfReport({
          contractTitle,
          code,
          auditScore,
          auditIssues,
          autoFixResult,
          programId,
        });
        setIsGenerating(false);
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
      }, 300);
    } catch (err) {
      console.error('Erro ao gerar relatório PDF:', err);
      setIsGenerating(false);
      alert('Falha ao gerar o relatório PDF. Verifique o console.');
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#1f6feb] hover:bg-[#388bfd] text-white border border-[#30363d] shadow-sm font-semibold';
      case 'secondary':
        return 'bg-[#238636] hover:bg-[#2ea043] text-white border border-[#30363d] shadow-sm font-semibold';
      case 'outline':
        return 'bg-[#0d1117] hover:bg-[#21262d] text-[#58a6ff] border border-[#1f6feb]/50 font-medium';
      case 'compact':
        return 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white border border-[#30363d] text-xs';
      default:
        return 'bg-[#1f6feb] hover:bg-[#388bfd] text-white border border-[#30363d] shadow-sm';
    }
  };

  return (
    <button
      onClick={handleExportPdf}
      disabled={isGenerating}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-all disabled:opacity-50 text-xs ${getVariantStyles()} ${className}`}
      title="Exportar Relatório Executivo de Auditoria em PDF"
    >
      {isGenerating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
      ) : isSuccess ? (
        <Check className="w-3.5 h-3.5 text-[#7ee787]" />
      ) : (
        <FileDown className="w-3.5 h-3.5 text-current shrink-0" />
      )}

      <span>
        {isGenerating
          ? 'Gerando PDF...'
          : isSuccess
          ? 'Relatório Baixado!'
          : label || 'Exportar Relatório PDF'}
      </span>
    </button>
  );
};
