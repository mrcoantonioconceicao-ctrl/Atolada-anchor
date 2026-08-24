import React, { useState, useEffect } from 'react';
import {
  Compass,
  Code2,
  ShieldCheck,
  Terminal,
  FileCode,
  Cpu,
  BookOpen,
  Cloud,
  Github,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  ExternalLink,
  Zap,
  Play,
  Layers,
  ArrowRight,
  Lock,
  Boxes,
  Wrench,
  Rocket,
  Search,
  Check,
} from 'lucide-react';

interface SystemTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tab: 'editor' | 'pda' | 'simulator' | 'sdk' | 'guide' | 'rust_engine') => void;
  onOpenGithub?: () => void;
  onOpenCloud?: () => void;
  onOpenAi?: () => void;
}

interface TourStep {
  id: string;
  tabTarget?: 'editor' | 'pda' | 'simulator' | 'sdk' | 'guide' | 'rust_engine';
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  summary: string;
  description: string;
  keyFeatures: string[];
  proTip: string;
  interactiveActionLabel?: string;
  interactiveAction?: () => void;
}

export const SystemTourModal: React.FC<SystemTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  onOpenGithub,
  onOpenCloud,
  onOpenAi,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  const steps: TourStep[] = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao Solana Architect & Anchor Security Studio',
      badge: 'Visão Geral do Sistema',
      icon: Compass,
      iconColor: 'text-[#14F195]',
      summary: 'IDE de alta performance para desenvolvimento, auditoria AST de smart contracts Anchor, motor nativo em Rust, Auto-Fix e simulação SVM.',
      description:
        'O Solana Architect foi projetado para desenvolvedores, auditores e estudantes dominarem a segurança na Solana. Ele combina análise estática em tempo real, cálculo visual de PDAs, inspeção de memória de contas, motor de correção automática em 1 clique e geradores de código para produção.',
      keyFeatures: [
        'Análise de Segurança AST semântica com detecção de falhas críticas de controle de acesso',
        'Motor de Correção Automática (Auto-Fix Engine) para aplicar patches de segurança instantaneamente',
        'Visualizador determinístico de derivação de PDA (Canonical Bumps e Ed25519)',
        'Sandbox SVM localnet com inspetor de layout de 49 bytes e simulação de ataques (Alice vs Bob)',
        'Workspace Rust puro nativo (crates/solana-architect-core) e CLI executável',
        'Simulador de Dry-Run de Deploy no Solana Devnet com BPF Loader Upgradeable',
        'Persistência em Nuvem via Firebase Firestore e exportação direta de repositórios para o GitHub',
      ],
      proTip: 'Você pode navegar pelos passos com as setas do teclado (← e →) ou pular diretamente para qualquer módulo pelo menu lateral.',
    },
    {
      id: 'editor',
      tabTarget: 'editor',
      title: '1. IDE Rust & Auditoria de Segurança AST',
      badge: 'Módulo: IDE Rust e Auditoria',
      icon: Code2,
      iconColor: 'text-[#d2a8ff]',
      summary: 'Editor Anchor com templates pré-configurados e detecção instantânea de vulnerabilidades.',
      description:
        'Escreva e edite smart contracts Anchor com suporte a múltiplos templates (User Counter, Token Vault, Staking PDA e Unsecure Counter). O motor AST analisa a sintaxe, avalia penalidades de segurança em tempo real e calcula o score de 0 a 100.',
      keyFeatures: [
        'Validação sintática com balanceamento de chaves e preludes Anchor',
        'Detecção automática de ausência de "has_one = authority" em structs de conta mutáveis',
        'Validação de armazenamento e reutilização de Bumps Canônicos (bump = counter.bump)',
        'Detecção de operações aritméticas desprotegidas contra Overflow e Underflow',
        'Cálculo de Nota de Segurança (0 a 100) e verificação de prontidão para Mainnet',
      ],
      proTip: 'Clique em "Templates" no topo do editor para carregar o contrato vulnerável e veja as vulnerabilidades surgirem no painel direito.',
      interactiveActionLabel: 'Abrir IDE e Auditoria',
      interactiveAction: () => {
        onNavigateToTab('editor');
        onClose();
      },
    },
    {
      id: 'autofix',
      tabTarget: 'editor',
      title: '2. Motor de Correção Automática (Auto-Fix Engine)',
      badge: 'Novidade: Auto-Fix em 1 Clique',
      icon: Wrench,
      iconColor: 'text-[#7ee787]',
      summary: 'Reescreva e corrija vulnerabilidades no código de forma determinística e programática.',
      description:
        'Com o novo Auto-Fix Engine, você não precisa corrigir falhas manualmente. O motor mapeia as coordenadas no AST e injeta as restrições Anchor canônicas, elevando notas baixas (ex: 45/100) diretamente para 95-100/100 com banner explicativo de diffs.',
      keyFeatures: [
        'Botão "Auto-Fix" individual em cada recomendação de segurança detectada',
        'Botão global "Corrigir Todas" para sanar todas as falhas de uma só vez',
        'Injeção precisa de "has_one = authority", seeds determinísticas e "bump = counter.bump"',
        'Substituição de aritmética direta por "checked_add" com inserção de enum #[error_code]',
        'Ajuste automático de espaço de rent para o layout alinhado de 49 bytes',
      ],
      proTip: 'Experimente carregar o template "Unsecure Counter" e clicar no botão verde "Corrigir Todas" para ver o código se transformar em código seguro de produção instantaneamente.',
      interactiveActionLabel: 'Testar Auto-Fix no Editor',
      interactiveAction: () => {
        onNavigateToTab('editor');
        onClose();
      },
    },
    {
      id: 'pda',
      tabTarget: 'pda',
      title: '3. Visualizador Criptográfico de PDAs',
      badge: 'Módulo: Visualizador de PDA',
      icon: ShieldCheck,
      iconColor: 'text-[#58a6ff]',
      summary: 'Entenda como sementes e bumps canônicos derivam endereços fora da curva elíptica Ed25519.',
      description:
        'As Program Derived Addresses (PDAs) são a espinha dorsal da arquitetura da Solana. Este visualizador desmistifica a busca iterativa do canonical bump (de 255 a 0) e mostra como as sementes garantem contas únicas e determinísticas.',
      keyFeatures: [
        'Pipeline visual passo a passo: Sementes → Hash SHA-256 → Verificação Ed25519',
        'Alternância entre autoridades (Alice, Bob, Charlie) para ver a mutação das chaves',
        'Inspeção hexadecimal e ASCII de sementes (ex: b"counter" + Pubkey)',
        'Explicação detalhada do porquê PDAs não possuem chave privada associada',
      ],
      proTip: 'Sempre armazene o bump na inicialização da conta para economizar Compute Units (CU) em chamadas futuras.',
      interactiveActionLabel: 'Abrir Visualizador de PDA',
      interactiveAction: () => {
        onNavigateToTab('pda');
        onClose();
      },
    },
    {
      id: 'simulator',
      tabTarget: 'simulator',
      title: '4. Simulador SVM & Inspetor de Memória (49 Bytes)',
      badge: 'Módulo: Simulador de Execução',
      icon: Terminal,
      iconColor: 'text-[#7ee787]',
      summary: 'Simule a execução de instruções no ledger e inspecione os bytes gravados na conta.',
      description:
        'Teste chamadas de instrução (initialize, increment, decrement, reset, close) e veja exatamente como os dados são serializados via Borsh no livro de registros da Solana em blocos de memória.',
      keyFeatures: [
        'Layout exato de 49 Bytes: Discriminador (8B) + Autoridade (32B) + Contador (8B) + Bump (1B)',
        'Cálculo automático de isenção de aluguel (Rent Exemption) em SOL e Lamports',
        'Simulador de Ataque: Tente manipular a conta da Alice usando a carteira do Bob e veja o erro ConstraintHasOne',
        'Terminal de logs de transação com consumo de Compute Units (CU) e assinaturas',
      ],
      proTip: 'Alterne a carteira ativa para "Bob (Invasor)" e tente executar um incremento para testar a barreira de segurança de controle de acesso.',
      interactiveActionLabel: 'Abrir Simulador SVM',
      interactiveAction: () => {
        onNavigateToTab('simulator');
        onClose();
      },
    },
    {
      id: 'tests',
      tabTarget: 'editor',
      title: '5. Suíte de Testes Unitários em Rust (solana-program-test)',
      badge: 'Submódulo: Testes Rust',
      icon: Boxes,
      iconColor: 'text-[#7ee787]',
      summary: 'Gere código de teste automatizado e execute simulações de cargo test diretamente na IDE.',
      description:
        'Crie suítes completas de testes assíncronos em Rust com solana-program-test e tokio, cobrindo cenários de sucesso, ataques de autoridade não autorizada e proteção de underflow.',
      keyFeatures: [
        'Testes de Happy Path (Inicialização e mutações de estado)',
        'Testes de Segurança (Validação de rejeição de signatários maliciosos)',
        'Testes Aritméticos (Garantia de que decrementos abaixo de zero falham com segurança)',
        'Terminal embutido para simular a execução de "cargo test-sbf" com resultados coloridos',
      ],
      proTip: 'Na aba IDE Rust, role até a seção "Suíte de Testes Unitários em Rust" para copiar ou testar o código da suíte.',
      interactiveActionLabel: 'Ver Gerador de Testes',
      interactiveAction: () => {
        onNavigateToTab('editor');
        onClose();
      },
    },
    {
      id: 'sdk_deploy',
      tabTarget: 'sdk',
      title: '6. Anchor IDL, SDKs & Devnet Deployment Dry-Run',
      badge: 'Módulo: IDL, SDK & Deploy',
      icon: FileCode,
      iconColor: 'text-[#ffa657]',
      summary: 'Gere especificação IDL JSON, clientes para TypeScript/Rust/Python e simule o deploy no Devnet.',
      description:
        'Exporte a interface do seu smart contract para integração com aplicações front-end ou scripts de backend e utilize o simulador de Dry-Run de Implantação no cluster Solana Devnet com o pipeline BPF Loader Upgradeable.',
      keyFeatures: [
        'Geração de IDL JSON no formato canônico @coral-xyz/anchor',
        'Exemplos de clientes prontos para TypeScript (Mocha), Rust (solana-client) e Python (AnchorPy)',
        'Simulador de Deploy no Devnet com estimativa de tamanho de ELF em KB e custos em SOL',
        'Pipeline BPF Loader Upgradeable com upload de chunks e registro de IDL on-chain',
      ],
      proTip: 'Clique na aba "Devnet Dry-Run" para ver o cálculo de taxas de rent e o log RPC da simulação de implantação.',
      interactiveActionLabel: 'Abrir IDL & Deploy Dry-Run',
      interactiveAction: () => {
        onNavigateToTab('sdk');
        onClose();
      },
    },
    {
      id: 'rust_engine',
      tabTarget: 'rust_engine',
      title: '7. Rust Core Engine & CLI Standalone',
      badge: 'Módulo: Rust Core Engine',
      icon: Cpu,
      iconColor: 'text-[#58a6ff]',
      summary: 'Motor nativo em Rust puro 2021 com módulos de auditoria, criptografia e CLI executável.',
      description:
        'Explore toda a arquitetura de código-fonte do crate "crates/solana-architect-core". Todos os algoritmos de auditoria, derivação de PDA, cálculo de rent e auto-fix foram estruturados para compilação nativa em Rust.',
      keyFeatures: [
        'src/audit.rs: Motor de auditoria estática com modelo de penalidades e auto-fix nativo',
        'src/pda.rs: Algoritmo de derivação determinística de chaves Ed25519',
        'src/memory.rs: Layout de 49 bytes e cálculo canônico de Rent Exemption',
        'src/bin/cli.rs: Binário standalone executável ("solana-architect audit|pda|idl|tests")',
        'Terminal CLI interativo para testar comandos Rust em tempo real',
      ],
      proTip: 'Você pode baixar arquivos individuais em Rust (.rs) ou o manifesto Cargo.toml para compilar no seu terminal.',
      interactiveActionLabel: 'Explorar Rust Core Engine',
      interactiveAction: () => {
        onNavigateToTab('rust_engine');
        onClose();
      },
    },
    {
      id: 'guide',
      tabTarget: 'guide',
      title: '8. Guia Interativo de Segurança Anchor',
      badge: 'Módulo: Guia Educacional',
      icon: BookOpen,
      iconColor: 'text-[#14F195]',
      summary: 'Base de conhecimento aprofundada com padrões vulneráveis versus seguros e cheat sheet de macros.',
      description:
        'Guia completo para desenvolvedores entenderem as vulnerabilidades mais comuns em programas Solana e como preveni-las com as melhores práticas de auditoria e macros do Anchor.',
      keyFeatures: [
        'Explicação detalhada sobre Canonical Bump Seeds e ataque de colisão de contas',
        'Matriz de Controle de Acesso (has_one = authority e Signer)',
        'Diagrama visual de alinhamento de memória de 49 bytes',
        'Cheat Sheet completo de restrições Anchor (init, mut, seeds, bump, close, payer)',
        'Guia de Aritmética Segura com checked_add/sub e tratamento de erro customizado',
      ],
      proTip: 'Use o Guia Interativo como referência rápida durante o desenvolvimento de novos smart contracts.',
      interactiveActionLabel: 'Abrir Guia de Segurança',
      interactiveAction: () => {
        onNavigateToTab('guide');
        onClose();
      },
    },
    {
      id: 'cloud_github',
      title: '9. Nuvem Firebase & Exportação para o GitHub',
      badge: 'Integrações Cloud & DevOps',
      icon: Cloud,
      iconColor: 'text-[#7ee787]',
      summary: 'Sincronize projetos na nuvem com autenticação Google e exporte repositórios Anchor completos.',
      description:
        'Salve suas versões de smart contracts no Firebase Firestore com segurança e crie repositórios prontos para produção no GitHub em poucos cliques com estrutura completa de workspace Anchor.',
      keyFeatures: [
        'Autenticação segura via Google Auth e regras Firestore com isolamento por usuário',
        'Histórico persistido de auditorias de segurança executadas',
        'Push to GitHub: Exportação com lib.rs, Cargo.toml, Anchor.toml, testes e README com selo de auditoria',
        'Assistente de IA integrado com Google Gemini para análise de código e sugestão de melhorias',
      ],
      proTip: 'Clique em "Cloud Projects" para salvar o contrato atual ou em "Push GitHub" para criar um novo repositório.',
      interactiveActionLabel: 'Abrir Cloud Projects',
      interactiveAction: () => {
        if (onOpenCloud) onOpenCloud();
        onClose();
      },
    },
  ];

  const currentStep = steps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length, onClose]);

  if (!isOpen) return null;

  const StepIcon = currentStep.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-4 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-gradient-to-tr from-[#9945FF]/20 to-[#14F195]/20 border border-[#14F195]/40 text-[#14F195]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Guia Interativo & Tour Completo do Sistema
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#1f6feb26] text-[#58a6ff] rounded border border-[#1f6feb]/40">
                  Passo {currentStepIndex + 1} de {steps.length}
                </span>
              </div>
              <p className="text-xs text-[#8b949e]">
                Explore todos os módulos de auditoria AST, Auto-Fix, PDAs, simulador SVM, testes Rust e deploy.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#8b949e] hover:text-white rounded hover:bg-[#21262d] transition-colors"
            title="Fechar Guia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#21262d] h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#9945FF] via-[#58a6ff] to-[#14F195] h-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar: Step Selector */}
          <div className="w-full md:w-64 bg-[#0d1117] border-r border-[#30363d] p-3 overflow-y-auto shrink-0 space-y-1">
            <div className="text-[11px] font-mono font-bold text-[#8b949e] uppercase px-2 py-1 flex items-center justify-between">
              <span>Etapas do Tour</span>
              <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span>
            </div>

            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isCurrent = idx === currentStepIndex;
              const isCompleted = idx < currentStepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-all ${
                    isCurrent
                      ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#1f6feb]/50 font-bold'
                      : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-mono ${
                        isCompleted
                          ? 'bg-[#238636]/30 text-[#7ee787] border border-[#238636]/60'
                          : isCurrent
                          ? 'bg-[#1f6feb] text-white'
                          : 'bg-[#21262d] text-[#8b949e]'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <span className="truncate">{step.title.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                  {isCurrent && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#58a6ff]" />}
                </button>
              );
            })}
          </div>

          {/* Right Content Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 bg-[#161b22]">
            {/* Step Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-[#0d1117] border border-[#30363d] ${currentStep.iconColor}`}>
                  <StepIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-[#21262d] text-[#8b949e] rounded border border-[#30363d]">
                    {currentStep.badge}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                    {currentStep.title}
                  </h3>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#c9d1d9] leading-relaxed">
                {currentStep.summary}
              </p>
            </div>

            {/* In-depth Description */}
            <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs text-[#8b949e] leading-relaxed">
              {currentStep.description}
            </div>

            {/* Key Features Bullet Points */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#c9d1d9] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#e3b341]" />
                <span>Principais Funcionalidades e Destaques</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {currentStep.keyFeatures.map((feat, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-[#0d1117] border border-[#30363d]/80 rounded-md text-xs text-[#c9d1d9] flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7ee787] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tip Box */}
            <div className="p-3 bg-[#1f6feb15] border border-[#1f6feb]/30 rounded-lg text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#58a6ff] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#58a6ff]">Dica de Especialista: </span>
                <span className="text-[#c9d1d9]">{currentStep.proTip}</span>
              </div>
            </div>

            {/* Optional Interactive Shortcut Button */}
            {currentStep.interactiveAction && (
              <div className="pt-1 flex items-center justify-between border-t border-[#30363d]/60">
                <span className="text-xs text-[#8b949e]">Deseja testar este módulo agora?</span>
                <button
                  onClick={currentStep.interactiveAction}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#58a6ff] bg-[#1f6feb26] hover:bg-[#1f6feb40] border border-[#1f6feb]/50 rounded transition-colors"
                >
                  <span>{currentStep.interactiveActionLabel || 'Ir para o Módulo'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="p-4 bg-[#0d1117] border-t border-[#30363d] flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (currentStep.tabTarget) {
                onNavigateToTab(currentStep.tabTarget);
              }
              onClose();
            }}
            className="text-xs text-[#8b949e] hover:text-[#c9d1d9] underline transition-colors"
          >
            Pular Tour
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={isFirst}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] disabled:opacity-40 border border-[#30363d] rounded transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            {isLast ? (
              <button
                onClick={() => {
                  onNavigateToTab('editor');
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] border border-[#30363d] rounded transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Concluir e Começar</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#1f6feb] hover:bg-[#388bfd] border border-[#30363d] rounded transition-colors shadow-sm"
              >
                <span>Próximo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
