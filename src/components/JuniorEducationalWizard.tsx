import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Code2,
  Key,
  Database,
  Layers,
  Zap,
  Wrench,
  X,
  FileCode,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface JuniorEducationalWizardProps {
  topic?: 'pda' | 'accounts' | 'has_one' | 'audit' | 'general';
  onClose?: () => void;
}

export const JuniorEducationalWizard: React.FC<JuniorEducationalWizardProps> = ({
  topic = 'general',
  onClose,
}) => {
  const { language, t } = useLanguage();
  const [activeStep, setActiveStep] = useState<number>(1);

  const guides = {
    pda: {
      title: t('wizard.pda.title', '🧙‍♂️ Assistente Guiado: O que é um PDA?'),
      subtitle: 'Program Derived Address (Endereço Derivado do Programa)',
      steps: [
        {
          num: 1,
          title: t('wizard.pda.step1', 'Passo 1: Chave Pública da Autoridade'),
          desc: 'Uma conta padrão da Solana (como a sua carteira Phantom ou Solflare) possui uma chave privada Ed25519.',
          tip: 'Dica Júnior: Qualquer pessoa que tenha a chave privada pode assinar transações e sacar fundos.',
        },
        {
          num: 2,
          title: t('wizard.pda.step2', 'Passo 2: Definir as Seeds (Sementes)'),
          desc: 'Seeds são cadeias de texto ou bytes que você define no código Rust (ex: b"counter", a chave do usuário).',
          tip: 'Exemplo Anchor: seeds = [b"counter", authority.key().as_ref()]',
        },
        {
          num: 3,
          title: t('wizard.pda.step3', 'Passo 3: Derivar o Bump Canônico (Fora da Curva)'),
          desc: 'A Solana força a combinação das seeds com o ID do programa para encontrar um endereço que NÃO possua chave privada na curva elíptica.',
          tip: t('wizard.pda.why_bump', '💡 Por que usá-lo? Como ninguém tem a chave privada, apenas o seu Smart Contract pode assinar por este PDA de forma programática!'),
        },
      ],
    },
    has_one: {
      title: t('wizard.has_one.title', '🛡️ Guia de Segurança: Por que usar `has_one = authority`?'),
      subtitle: 'Prevenção contra Personificação e Injeção de Contas',
      steps: [
        {
          num: 1,
          title: 'A Vulnerabilidade (Ataque de Substituição)',
          desc: 'Se você não validar se a conta pertence ao usuário correto, um hacker pode passar a sua própria conta no campo de autoridade e alterar os dados do seu contrato.',
          tip: 'Aviso Júnior: Nunca confie em contas passadas pelo cliente sem validação explícita!',
        },
        {
          num: 2,
          title: 'A Solução Automática do Anchor',
          desc: 'Adicionar #[account(mut, has_one = authority)] faz o Anchor checar automaticamente se counter.authority == authority.key().',
          tip: t('wizard.has_one.desc', 'Essa restrição impede que um hacker passe a própria conta como autoridade.'),
        },
        {
          num: 3,
          title: 'Correção em 1-Clique',
          desc: 'Nosso IDE possui o botão "Correção Automática em 1-Clique" no Editor Rust para adicionar essa macro automaticamente.',
          tip: 'Resultado: O Anchor retorna o erro ConstraintHasOne se alguém tentar burlar a verificação.',
        },
      ],
    },
    accounts: {
      title: '📦 Como Funciona o Armazenamento de Contas na Solana',
      subtitle: 'Discriminador de 8 bytes, Aluguel (Rent-Exempt) e Tamanho',
      steps: [
        {
          num: 1,
          title: 'Passo 1: O Discriminador Anchor (8 bytes)',
          desc: 'Toda conta criada pelo Anchor recebe um prefixo único de 8 bytes no início da sua memória (SHA256("account:NomeDaStruct")).',
          tip: 'Motivo: Garante que um hacker não passe uma conta de outro tipo ou outro programa.',
        },
        {
          num: 2,
          title: 'Passo 2: Isenção de Aluguel (Rent-Exempt)',
          desc: 'Para uma conta existir permanentemente na blockchain da Solana, ela precisa manter um saldo mínimo em lamports equivalente ao seu tamanho.',
          tip: 'Dica: Nosso simulador calcula automaticamente os 1.238.400 lamports necessários para 49 bytes!',
        },
        {
          num: 3,
          title: 'Passo 3: Encerramento de Conta e Reembolso',
          desc: 'A macro close = authority transfere todos os lamports de volta para o usuário e limpa a memória da conta.',
          tip: 'Sempre encerre contas que não são mais necessárias para recuperar seu SOL!',
        },
      ],
    },
    general: {
      title: '🎓 Guia de Aprendizado Rápido para Desenvolvedores Juniores',
      subtitle: 'Aprenda os Pilares do Desenvolvimento Solana Anchor',
      steps: [
        {
          num: 1,
          title: '1. Escreva o Contrato Rust no Editor',
          desc: 'Defina suas instruções (initialize, increment) e estruturas de contas com as macros #[derive(Accounts)].',
          tip: 'Clique em "Auditar Agora" para checar o score de segurança de 0 a 100.',
        },
        {
          num: 2,
          title: '2. Simule Transações na Localnet Virtual',
          desc: 'Teste como Alice (proprietária) e Bob (atacante) interagem com o contrato sem gastar SOL real.',
          tip: 'Veja o inspetor de memória de 49 bytes atualizar os contadores em tempo real.',
        },
        {
          num: 3,
          title: '3. Exporte e Envie para o GitHub com CI/CD',
          desc: 'Gere o projeto Anchor completo com testes em TypeScript e esteira automatizada no GitHub Actions.',
          tip: 'Use o botão "Baixar CI/CD Resiliente" para obter o arquivo .github/workflows/anchor-ci-cd.yml.',
        },
      ],
    },
  };

  const currentGuide = guides[topic] || guides.general;

  return (
    <div className="bg-[#161b22] border border-[#1f6feb]/40 rounded-xl p-4 sm:p-5 shadow-lg relative my-4 animate-fadeIn">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-[#8b949e] hover:text-white rounded-md hover:bg-[#21262d] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="p-2 bg-[#1f6feb]/20 text-[#58a6ff] rounded-lg shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white leading-snug">{currentGuide.title}</h3>
          <p className="text-xs text-[#8b949e]">{currentGuide.subtitle}</p>
        </div>
      </div>

      {/* Steps Navigation Bar */}
      <div className="flex items-center gap-1.5 mb-4 border-b border-[#30363d] pb-3 overflow-x-auto">
        {currentGuide.steps.map((s) => (
          <button
            key={s.num}
            onClick={() => setActiveStep(s.num)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all shrink-0 ${
              activeStep === s.num
                ? 'bg-[#1f6feb] text-white shadow-sm'
                : 'bg-[#0d1117] text-[#8b949e] hover:text-[#c9d1d9] border border-[#30363d]'
            }`}
          >
            <span>Etapa {s.num}</span>
          </button>
        ))}
      </div>

      {/* Step Detail Card */}
      {currentGuide.steps
        .filter((s) => s.num === activeStep)
        .map((s) => (
          <div key={s.num} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#58a6ff]">
              <Sparkles className="w-4 h-4 text-[#7ee787]" />
              <span>{s.title}</span>
            </div>

            <p className="text-xs text-[#c9d1d9] leading-relaxed">{s.desc}</p>

            <div className="p-2.5 bg-[#1f6feb]/10 border border-[#1f6feb]/30 rounded text-xs text-[#a5d6ff] font-sans flex items-start gap-2">
              <BookOpen className="w-4 h-4 text-[#58a6ff] shrink-0 mt-0.5" />
              <span>{s.tip}</span>
            </div>
          </div>
        ))}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#30363d]/60 text-xs text-[#8b949e]">
        <span>
          Passo {activeStep} de {currentGuide.steps.length}
        </span>
        <div className="flex items-center gap-2">
          {activeStep > 1 && (
            <button
              onClick={() => setActiveStep(activeStep - 1)}
              className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] rounded border border-[#30363d]"
            >
              Anterior
            </button>
          )}
          {activeStep < currentGuide.steps.length && (
            <button
              onClick={() => setActiveStep(activeStep + 1)}
              className="px-2.5 py-1 bg-[#1f6feb] hover:bg-[#388bfd] text-white font-semibold rounded"
            >
              Próximo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
