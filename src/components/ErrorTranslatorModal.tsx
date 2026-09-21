import React, { useState } from 'react';
import {
  HelpCircle,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Wrench,
  X,
  Code2,
  Terminal,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ErrorTranslatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawErrorText?: string;
  onApplyFix?: () => void;
}

export const ErrorTranslatorModal: React.FC<ErrorTranslatorModalProps> = ({
  isOpen,
  onClose,
  rawErrorText = '',
  onApplyFix,
}) => {
  const { language, t } = useLanguage();
  const [inputError, setInputError] = useState<string>(rawErrorText);

  if (!isOpen) return null;

  const getDecodedExplanation = (err: string) => {
    const text = err.toLowerCase();

    if (text.includes('has_one') || text.includes('constrainthasone') || text.includes('0x7d1')) {
      return {
        title: '🛡️ ConstraintHasOne (Violacão de Autoridade)',
        summary: 'Um usuário não autorizado tentou executar uma instrução destinada apenas ao proprietário do contrato.',
        cause: 'A conta passada como autoridade na instrução não corresponde ao campo "authority" salvo dentro da conta no momento da inicialização.',
        solution: 'Certifique-se de que a transação seja assinada pela chave pública correta da autoridade ou verifique se a macro #[account(has_one = authority)] está apontando para o campo correto.',
        canAutoFix: true,
      };
    }

    if (text.includes('accountnotinitialized') || text.includes('0xbc4')) {
      return {
        title: '📦 AccountNotInitialized (Conta Não Inicializada)',
        summary: 'A instrução tentou ler ou alterar uma conta PDA que ainda não foi criada na blockchain.',
        cause: 'A conta precisa ser inicializada através da instrução "initialize" com a macro init antes que qualquer contador ou dados possam ser alterados.',
        solution: 'Execute a instrução initialize primeiro na guia Simulador de Execução para alocar os 49 bytes e pagar o aluguel (rent-exempt).',
        canAutoFix: false,
      };
    }

    if (text.includes('accountalreadyinitialized') || text.includes('0x0')) {
      return {
        title: '⚠️ AccountAlreadyInitialized (Conta Já Inicializada)',
        summary: 'Tentativa de criar ou reinicializar um PDA que já existe na rede.',
        cause: 'Você chamou a instrução "initialize" novamente para a mesma chave pública e seeds.',
        solution: 'Cada PDA com a mesma combinação de seeds só pode ser inicializado uma única vez.',
        canAutoFix: false,
      };
    }

    if (text.includes('base58') || text.includes('pubkey')) {
      return {
        title: '🔑 Erro de Formato de Chave Pública (Base58)',
        summary: 'Uma chave pública inserida contém caracteres inválidos.',
        cause: 'Chaves públicas da Solana devem conter entre 32 e 44 caracteres na codificação Base58 (sem os caracteres 0, O, I, l).',
        solution: 'Verifique se não há espaços em branco, aspas ou caracteres especiais na chave pública inserida.',
        canAutoFix: true,
      };
    }

    if (text.includes('underflow') || text.includes('overflow') || text.includes('arithmetic')) {
      return {
        title: '🔢 Erro Aritmético (Underflow / Overflow)',
        summary: 'Operação matemática tentou decrementar abaixo de zero ou ultrapassar o limite numérico.',
        cause: 'O contador atual é 0 e a instrução "decrement" tentou subtrair 1 sem verificar se o valor é positivo.',
        solution: 'Substitua operações aritméticas diretas por checked_add / checked_sub ou adicione a instrução require!(counter.count > 0, ...).',
        canAutoFix: true,
      };
    }

    return {
      title: '🔎 Diagnóstico Geral do Erro Anchor',
      summary: 'Erro detectado durante a compilação ou simulação de instrução.',
      cause: 'O contrato encontrou uma incoerência no contexto de contas ou nos parâmetros passados.',
      solution: 'Consulte os logs do terminal ou use o Assistente IA para analisar o trecho exato do código.',
      canAutoFix: false,
    };
  };

  const currentError = inputError || rawErrorText;
  const decoded = getDecodedExplanation(currentError);

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#f85149]/20 text-[#ff7b72] rounded-lg">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t('error.decoder.title', '🔎 Tradutor Amigável de Erros da Solana')}</h2>
              <p className="text-xs text-[#8b949e]">Tradução em linguagem natural e orientações práticas de correção</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-white rounded-md hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Input Error Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-[#8b949e] uppercase">
              Mensagem de Erro do Terminal
            </label>
            <textarea
              value={inputError}
              onChange={(e) => setInputError(e.target.value)}
              placeholder="Cole o log de erro do Anchor ou terminal aqui..."
              className="w-full h-20 bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-xs font-mono text-[#ff7b72] focus:outline-none focus:border-[#58a6ff] resize-none"
            />
          </div>

          {/* Decoded Explanation Card */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
              <span className="text-sm font-bold text-[#58a6ff] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7ee787]" />
                {decoded.title}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#1f6feb]/20 text-[#58a6ff] rounded border border-[#1f6feb]/40">
                Interpretado pelo IDE
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="font-semibold text-white">Resumo: </span>
                <span className="text-[#c9d1d9]">{decoded.summary}</span>
              </div>

              <div>
                <span className="font-semibold text-[#ffa657]">Causa Raiz: </span>
                <span className="text-[#8b949e]">{decoded.cause}</span>
              </div>

              <div className="p-3 bg-[#238636]/15 border border-[#238636]/40 rounded-lg text-[#7ee787]">
                <span className="font-bold block mb-0.5">💡 Como Resolver:</span>
                <p className="leading-relaxed">{decoded.solution}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] text-xs font-semibold rounded-lg transition-colors"
          >
            {t('btn.close', 'Fechar')}
          </button>

          {decoded.canAutoFix && onApplyFix && (
            <button
              onClick={() => {
                onApplyFix();
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold rounded-lg transition-all shadow-md"
            >
              <Wrench className="w-4 h-4" />
              <span>{t('btn.autofix', 'Aplicar Correção Automática')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
