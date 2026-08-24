import React, { useState } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Lock,
  Key,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  Code2,
  Wrench,
  Search,
  Sparkles,
  Zap,
  Layers,
  FileCode,
  Coins,
  ChevronRight,
  Terminal,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface SecurityTopic {
  id: string;
  title: string;
  category: 'access' | 'pda' | 'memory' | 'math' | 'lifecycle' | 'autofix';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
  icon: React.ComponentType<{ className?: string }>;
  summary: string;
  vulnerableSnippet: string;
  vulnerableExplanation: string;
  secureSnippet: string;
  secureExplanation: string;
  anchorMacro: string;
  solanaRule: string;
}

export const SecurityGuide: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Interactive Rent Calculator State
  const [calcBytes, setCalcBytes] = useState<number>(49);

  const calculateRentSol = (bytes: number): number => {
    // Solana canonical rent exemption formula: (128 + bytes) * 6.960 lamports/byte/year * 2 years
    const ACCOUNT_STORAGE_OVERHEAD = 128;
    const LAMPORTS_PER_BYTE_YEAR = 3480; // approximate
    const lamports = (ACCOUNT_STORAGE_OVERHEAD + bytes) * (LAMPORTS_PER_BYTE_YEAR * 2);
    return lamports / 1_000_000_000;
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const topics: SecurityTopic[] = [
    {
      id: 'has-one-authority',
      title: 'Controle de Acesso com has_one = authority',
      category: 'access',
      severity: 'CRITICAL',
      icon: Lock,
      summary: 'Garante que apenas o proprietário registrado nos dados da conta possa assinar transações que alteram seu estado.',
      anchorMacro: '#[account(mut, has_one = authority)]',
      solanaRule: 'Validação de Signatário vs Campo de Dados',
      vulnerableSnippet: `// ❌ VULNERÁVEL: Qualquer carteira pode assinar e mutar a conta de outro usuário!
#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub counter: Account<'info, UserCounter>,
    pub authority: Signer<'info>, // Assina, mas não valida se counter.authority == authority.key()
}`,
      vulnerableExplanation:
        'O invasor (Bob) pode passar sua própria assinatura como `authority` e enviar a conta pública da Alice como `counter`. Como não há vínculo, o contrato aceitará a transação.',
      secureSnippet: `// ✅ SEGURO: Anchor valida counter.authority == authority.key() em tempo de execução
#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump,
        has_one = authority // <--- Verificação criptográfica automática
    )]
    pub counter: Account<'info, UserCounter>,
    pub authority: Signer<'info>,
}`,
      secureExplanation:
        'A restrição `has_one = authority` gera código Rust que compara `counter.authority == authority.key()`, retornando o erro `ConstraintHasOne` caso um terceiro tente assinar.',
    },
    {
      id: 'canonical-bump-seeds',
      title: 'Canonical Bump Seeds & Armazenamento em Estado',
      category: 'pda',
      severity: 'HIGH',
      icon: ShieldCheck,
      summary: 'Prevenção de ataques de colisão de PDAs e economia de Compute Units (CU) pelo caching do bump.',
      anchorMacro: '#[account(seeds = [...], bump = counter.bump)]',
      solanaRule: 'Derivação Determinística Ed25519',
      vulnerableSnippet: `// ❌ VULNERÁVEL: O contrato recalcula find_program_address toda vez (desperdiça CU)
// Ou aceita bump arbitrário sem verificar se é canônico (255..0)
pub fn increment(ctx: Context<Increment>, _bump: u8) -> Result<()> {
    // Aceitar bump do usuário permite criar contas irmãs não-canônicas
    Ok(())
}`,
      vulnerableExplanation:
        'Sem validar o bump canônico, invasores podem derivar chaves secundárias válidas para as mesmas sementes. Além disso, chamar `find_program_address` em todas as instruções consome ~2.500 Compute Units extras por chamada.',
      secureSnippet: `// ✅ SEGURO: Armazena o bump canônico na inicialização e valida na struct
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    let counter = &mut ctx.accounts.counter;
    counter.authority = ctx.accounts.authority.key();
    counter.count = 0;
    counter.bump = ctx.bumps.counter; // <--- Salva bump canônico oficial
    Ok(())
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump // <--- Usa o bump já salvo com create_program_address (rápido & seguro)
    )]
    pub counter: Account<'info, UserCounter>,
}`,
      secureExplanation:
        'O Anchor usa `create_program_address` com o bump persistido, garantindo custo O(1) de CPU e impossibilitando colisões de contas.',
    },
    {
      id: 'memory-layout-discriminator',
      title: 'Discriminador Anchor de 8 Bytes & Layout de Memória',
      category: 'memory',
      severity: 'HIGH',
      icon: Cpu,
      summary: 'Como o Anchor previne Account Type Confusion e garante alinhamento exato de 49 bytes.',
      anchorMacro: '#[account] pub struct UserCounter',
      solanaRule: 'Prevenção de Injeção de Tipo de Conta',
      vulnerableSnippet: `// ❌ VULNERÁVEL: Alocação insuficiente de espaço omite o byte do bump
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 // Faltou + 1 para o bump! Causará estouro de buffer (AccountDataTooSmall)
    )]
    pub counter: Account<'info, UserCounter>,
}`,
      vulnerableExplanation:
        'Se o tamanho da conta no `space` for menor que a soma de todos os campos serializados via Borsh, a transação falhará ou corromperá bytes adjacentes no ledger da Solana.',
      secureSnippet: `// ✅ SEGURO: Espaço exato de 49 Bytes (8 + 32 + 8 + 1)
#[account]
pub struct UserCounter {
    pub authority: Pubkey, // 32 Bytes
    pub count: u64,        // 8 Bytes
    pub bump: u8,          // 1 Byte
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 1, // 8 (Discriminador) + 32 (Pubkey) + 8 (u64) + 1 (u8) = 49 Bytes
        seeds = [b"counter", authority.key().as_ref()],
        bump
    )]
    pub counter: Account<'info, UserCounter>,
}`,
      secureExplanation:
        'O discriminador (primeiros 8 bytes de SHA-256("account:UserCounter")) impede que uma conta de outro tipo seja lida como UserCounter.',
    },
    {
      id: 'safe-math-checked',
      title: 'Aritmética Segura (checked_add & checked_sub)',
      category: 'math',
      severity: 'MEDIUM',
      icon: Zap,
      summary: 'Proteção contra Overflow e Underflow de inteiros u64 com tratamento explícito de erro.',
      anchorMacro: 'checked_add(1).ok_or(ErrorCode::Overflow)?',
      solanaRule: 'Integridade Aritmética e Tratamento de Erros',
      vulnerableSnippet: `// ❌ VULNERÁVEL: Adição direta em Rust pode causar panic ou overflow silencioso
pub fn increment(ctx: Context<Increment>) -> Result<()> {
    let counter = &mut ctx.accounts.counter;
    counter.count += 1; // Risco de estouro se count == u64::MAX
    Ok(())
}

pub fn decrement(ctx: Context<Decrement>) -> Result<()> {
    let counter = &mut ctx.accounts.counter;
    counter.count -= 1; // Se count == 0, causará underflow e panic
    Ok(())
}`,
      vulnerableExplanation:
        'Operadores aritméticos simples (`+=`, `-=`) em Rust compilado para SBF/BPF podem causar pânico não tratado, abortando a transação sem mensagem de erro compreensível.',
      secureSnippet: `// ✅ SEGURO: Uso de checked math com retorno de ErrorCode amigável
pub fn increment(ctx: Context<Increment>) -> Result<()> {
    let counter = &mut ctx.accounts.counter;
    counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;
    Ok(())
}

#[error_code]
pub enum ErrorCode {
    #[msg("Estouro de capacidade aritmética (Overflow).")]
    Overflow,
    #[msg("Subfluxo de capacidade aritmética (Underflow).")]
    Underflow,
}`,
      secureExplanation:
        'Retorna um código de erro tipado do Anchor (`ErrorCode::Overflow`) que pode ser tratado no SDK do cliente TypeScript.',
    },
    {
      id: 'close-account-refund',
      title: 'Fechamento Seguro de Contas & Reembolso de Rent (close)',
      category: 'lifecycle',
      severity: 'HIGH',
      icon: Key,
      summary: 'Encerramento de conta com limpeza completa de dados em memória e devolução de SOL ao usuário.',
      anchorMacro: '#[account(mut, close = authority)]',
      solanaRule: 'Ciclo de Vida e Reivindicação de Lamports',
      vulnerableSnippet: `// ❌ VULNERÁVEL: Apenas zerar os campos mantém a conta viva e consome rent permanentemente
pub fn close_manual(ctx: Context<ManualClose>) -> Result<()> {
    let counter = &mut ctx.accounts.counter;
    counter.count = 0; // A conta continua existindo e o aluguel fica bloqueado
    Ok(())
}`,
      vulnerableExplanation:
        'Contas inativas não fechadas continuam ocupando espaço e retendo lamports de aluguel. Se o proprietário não limpar a conta, os fundos ficam travados para sempre.',
      secureSnippet: `// ✅ SEGURO: A macro close zera os dados da conta e transfere os lamports de volta
#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump,
        has_one = authority,
        close = authority // <--- Reembolsa 100% dos lamports para authority
    )]
    pub counter: Account<'info, UserCounter>,
    #[account(mut)]
    pub authority: Signer<'info>,
}`,
      secureExplanation:
        'O Anchor transfere todos os lamports da conta para a autoridade e atribui o proprietário ao `SystemProgram` com tamanho zero.',
    },
    {
      id: 'autofix-ast-rules',
      title: 'Motor de Correção Automática (Auto-Fix AST Engine)',
      category: 'autofix',
      severity: 'INFO',
      icon: Wrench,
      summary: 'Como o Solana Architect analisa e reescreve programaticamente contratos Anchor vulneráveis.',
      anchorMacro: 'solanaAuditEngine::applyAutoFix()',
      solanaRule: 'Refatoração Determinística e AST Safe',
      vulnerableSnippet: `// Motor AST analisa as penalidades no código:
// 1. Ausência de has_one: -25 pontos
// 2. Ausência de bump canônico: -20 pontos
// 3. Aritmética não verificada: -10 pontos
// 4. Espaço incorreto: -15 pontos
// Nota Inicial: 45/100 (Inseguro para Mainnet)`,
      vulnerableExplanation:
        'O motor identifica os tokens das macros `#[account(...)]` e structs correspondentes sem quebrar a formatação ou alterar os 49 bytes calculados.',
      secureSnippet: `// Após clicar em "Corrigir Todas" (Auto-Fix Batch):
// 1. Injeta has_one = authority
// 2. Injeta bump = counter.bump e salva ctx.bumps
// 3. Substitui += por checked_add com #[error_code]
// 4. Ajusta space = 8 + 32 + 8 + 1 (49 bytes)
// Nota Final: 100/100 (✅ Aprovado para Produção)`,
      secureExplanation:
        'O motor opera tanto no frontend (TypeScript) quanto no crate nativo Rust (`crates/solana-architect-core/src/audit.rs`).',
    },
  ];

  const filteredTopics = topics.filter((t) => {
    const matchesCategory = activeCategory === 'all' || t.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.anchorMacro.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#0d1117] text-[#c9d1d9] p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-[#30363d] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#14F195]" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Guia Interativo de Segurança Anchor & Solana SVM
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#8b949e] mt-1">
              Referência técnica definitiva sobre controle de acesso, derivação de PDAs, alinhamento de memória (49 Bytes) e auditoria estática.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-center">
              <span className="text-[#8b949e] text-[10px] block">Anchor Spec</span>
              <span className="text-[#14F195] font-bold">v0.30.1</span>
            </div>
            <div className="px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded-lg text-center">
              <span className="text-[#8b949e] text-[10px] block">Padrões Auditados</span>
              <span className="text-[#58a6ff] font-bold">{topics.length} Regras</span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE CALCULATOR & MEMORY DIAGRAM CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Memory Alignment Card */}
          <div className="lg:col-span-2 p-4 sm:p-5 bg-[#161b22] border border-[#30363d] rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#ffa657]" />
                <h2 className="text-sm font-bold text-white">
                  Layout de Memória Exato no Ledger da Solana (49 Bytes)
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#ffa657]/15 text-[#ffa657] border border-[#ffa657]/30 rounded">
                Borsh Serialized
              </span>
            </div>

            <p className="text-xs text-[#8b949e]">
              Cada conta Solana gerada com Anchor segue um alinhamento rígido em bytes. Se a struct <code className="text-[#d2a8ff]">UserCounter</code> for modificada, os bytes devem ser recalculados.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono pt-1">
              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
                <div className="text-[10px] text-[#8b949e] uppercase">Discriminador</div>
                <div className="text-base font-bold text-[#d2a8ff] mt-0.5">8 Bytes</div>
                <div className="text-[10px] text-[#8b949e] mt-1">SHA-256(&quot;account:UserCounter&quot;)</div>
              </div>

              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
                <div className="text-[10px] text-[#8b949e] uppercase">Autoridade</div>
                <div className="text-base font-bold text-[#58a6ff] mt-0.5">32 Bytes</div>
                <div className="text-[10px] text-[#8b949e] mt-1">Pubkey (Ed25519)</div>
              </div>

              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
                <div className="text-[10px] text-[#8b949e] uppercase">Contador</div>
                <div className="text-base font-bold text-[#ffa657] mt-0.5">8 Bytes</div>
                <div className="text-[10px] text-[#8b949e] mt-1">u64 Little-Endian</div>
              </div>

              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
                <div className="text-[10px] text-[#8b949e] uppercase">Canonical Bump</div>
                <div className="text-base font-bold text-[#7ee787] mt-0.5">1 Byte</div>
                <div className="text-[10px] text-[#8b949e] mt-1">u8 (ex: 254)</div>
              </div>
            </div>

            <div className="p-2.5 bg-[#0d1117] rounded-lg border border-[#30363d] flex items-center justify-between text-xs font-mono">
              <span className="text-[#8b949e]">Equação de Espaço:</span>
              <span className="text-[#14F195] font-bold">
                space = 8 + 32 + 8 + 1 = 49 Bytes
              </span>
            </div>
          </div>

          {/* Interactive Rent Calculator */}
          <div className="p-4 sm:p-5 bg-[#161b22] border border-[#30363d] rounded-xl space-y-3 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-[#14F195]" />
                <h2 className="text-sm font-bold text-white">Calculadora de Rent Exemption</h2>
              </div>
              <p className="text-xs text-[#8b949e] mt-1">
                Calcule o depósito mínimo de SOL para isenção permanente de aluguel on-chain.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <label htmlFor="bytes-input" className="text-[#8b949e]">Tamanho da Conta (Bytes):</label>
                <input
                  id="bytes-input"
                  type="number"
                  min="0"
                  max="10240"
                  value={calcBytes}
                  onChange={(e) => setCalcBytes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 px-2 py-1 bg-[#0d1117] border border-[#30363d] rounded text-white text-right font-mono"
                />
              </div>

              <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1 font-mono">
                <div className="flex justify-between text-[11px] text-[#8b949e]">
                  <span>Overhead Base:</span>
                  <span>128 Bytes</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#8b949e]">
                  <span>Total Alocado:</span>
                  <span>{128 + calcBytes} Bytes</span>
                </div>
                <div className="pt-1 border-t border-[#30363d] flex justify-between text-xs">
                  <span className="font-bold text-white">Depósito de Rent:</span>
                  <span className="font-bold text-[#14F195]">
                    ~{calculateRentSol(calcBytes).toFixed(6)} SOL
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-[#8b949e]">
              * Os lamports são devolvidos 100% à autoridade ao executar a instrução <code className="text-[#58a6ff]">close</code>.
            </div>
          </div>
        </div>

        {/* SEARCH & CATEGORY FILTER BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#161b22] p-3 rounded-lg border border-[#30363d]">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto font-mono text-xs">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-[#1f6feb] text-white font-bold'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              Todas ({topics.length})
            </button>
            <button
              onClick={() => setActiveCategory('access')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeCategory === 'access'
                  ? 'bg-[#1f6feb] text-white font-bold'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              Controle de Acesso
            </button>
            <button
              onClick={() => setActiveCategory('pda')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeCategory === 'pda'
                  ? 'bg-[#1f6feb] text-white font-bold'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              PDAs & Bumps
            </button>
            <button
              onClick={() => setActiveCategory('memory')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeCategory === 'memory'
                  ? 'bg-[#1f6feb] text-white font-bold'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              Memória & Rent
            </button>
            <button
              onClick={() => setActiveCategory('math')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeCategory === 'math'
                  ? 'bg-[#1f6feb] text-white font-bold'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              Aritmética
            </button>
            <button
              onClick={() => setActiveCategory('autofix')}
              className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                activeCategory === 'autofix'
                  ? 'bg-[#1f6feb] text-white font-bold'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
              }`}
            >
              Auto-Fix AST
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar regra, macro ou falha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded text-xs text-[#c9d1d9] placeholder-[#8b949e] focus:outline-hidden focus:border-[#58a6ff]"
            />
          </div>
        </div>

        {/* SECURITY TOPICS LIST (BEFORE VS AFTER CARDS) */}
        <div className="space-y-6">
          {filteredTopics.map((topic, idx) => {
            const Icon = topic.icon;

            return (
              <div
                key={topic.id}
                className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-sm space-y-4 p-4 sm:p-6"
              >
                {/* Topic Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#30363d]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#14F195]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#8b949e]">
                          #{idx + 1}
                        </span>
                        <h3 className="text-base font-bold text-white">{topic.title}</h3>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                            topic.severity === 'CRITICAL'
                              ? 'bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/50'
                              : topic.severity === 'HIGH'
                              ? 'bg-[#ffa657]/20 text-[#ffa657] border border-[#ffa657]/50'
                              : 'bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/50'
                          }`}
                        >
                          {topic.severity}
                        </span>
                      </div>
                      <p className="text-xs text-[#8b949e] mt-0.5">{topic.summary}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="text-[11px] font-mono bg-[#0d1117] text-[#7ee787] px-2.5 py-1 rounded border border-[#30363d]">
                      {topic.anchorMacro}
                    </code>
                  </div>
                </div>

                {/* Side by Side: Vulnerable vs Secure Anchor Pattern */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Vulnerable Column */}
                  <div className="p-4 bg-[#0d1117] border border-[#da3633]/40 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#f85149] flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Padrão Vulnerável
                      </span>
                      <button
                        onClick={() => handleCopy(topic.vulnerableSnippet, `vuln-${topic.id}`)}
                        className="text-[11px] font-mono text-[#8b949e] hover:text-white flex items-center gap-1"
                        title="Copiar Código"
                      >
                        {copiedId === `vuln-${topic.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-[#7ee787]" />
                            <span className="text-[#7ee787]">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3 bg-[#161b22] rounded border border-[#30363d] text-xs font-mono text-[#ff7b72] overflow-x-auto leading-relaxed max-h-56">
                      {topic.vulnerableSnippet}
                    </pre>

                    <p className="text-[11px] text-[#8b949e] leading-relaxed pt-1">
                      <strong className="text-[#f85149]">Impacto de Segurança:</strong>{' '}
                      {topic.vulnerableExplanation}
                    </p>
                  </div>

                  {/* Secure Column */}
                  <div className="p-4 bg-[#0d1117] border border-[#238636]/60 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#7ee787] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Padrão Seguro Anchor
                      </span>
                      <button
                        onClick={() => handleCopy(topic.secureSnippet, `sec-${topic.id}`)}
                        className="text-[11px] font-mono text-[#8b949e] hover:text-white flex items-center gap-1"
                        title="Copiar Código"
                      >
                        {copiedId === `sec-${topic.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-[#7ee787]" />
                            <span className="text-[#7ee787]">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3 bg-[#161b22] rounded border border-[#30363d] text-xs font-mono text-[#7ee787] overflow-x-auto leading-relaxed max-h-56">
                      {topic.secureSnippet}
                    </pre>

                    <p className="text-[11px] text-[#8b949e] leading-relaxed pt-1">
                      <strong className="text-[#7ee787]">Mecanismo de Proteção:</strong>{' '}
                      {topic.secureExplanation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ANCHOR CONSTRAINT MACROS CHEAT SHEET */}
        <div className="p-5 bg-[#161b22] border border-[#30363d] rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#d2a8ff]" />
            <h2 className="text-base font-bold text-white">
              Tabela de Referência Rápida: Macros e Restrições Anchor v0.30
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
              <span className="text-[#d2a8ff] font-bold">init</span>
              <p className="text-[#8b949e] font-sans text-[11px]">
                Cria a conta via SystemProgram, aloca o espaço e escreve o discriminador de 8 bytes.
              </p>
            </div>

            <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
              <span className="text-[#58a6ff] font-bold">payer = authority</span>
              <p className="text-[#8b949e] font-sans text-[11px]">
                Designa a conta que pagará os lamports necessários para a isenção permanente de aluguel.
              </p>
            </div>

            <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
              <span className="text-[#ffa657] font-bold">space = 8 + 32 + 8 + 1</span>
              <p className="text-[#8b949e] font-sans text-[11px]">
                Define a capacidade exata em bytes reservada no livro de registros para a conta.
              </p>
            </div>

            <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
              <span className="text-[#14F195] font-bold">seeds = [b&quot;...&quot;, ...]</span>
              <p className="text-[#8b949e] font-sans text-[11px]">
                Deriva o endereço determinístico PDA fora da curva Ed25519 usando sementes constantes ou chaves.
              </p>
            </div>

            <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
              <span className="text-[#7ee787] font-bold">bump = counter.bump</span>
              <p className="text-[#8b949e] font-sans text-[11px]">
                Valida a PDA em O(1) usando o bump canônico salvo, economizando ~2.500 Compute Units.
              </p>
            </div>

            <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
              <span className="text-[#ff7b72] font-bold">close = authority</span>
              <p className="text-[#8b949e] font-sans text-[11px]">
                Zera os dados da conta, encerra o registro e transfere 100% dos lamports de volta para o signatário.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
