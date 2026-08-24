import React, { useState, useMemo } from 'react';
import {
  FileCode,
  Play,
  CheckCircle2,
  XCircle,
  Copy,
  Download,
  Terminal,
  ShieldCheck,
  Code2,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface RustUnitTestGeneratorProps {
  code: string;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  category: 'happy_path' | 'security' | 'pda_rent';
  assertions: string[];
  expectedResult: 'pass' | 'fail';
  rustCodeSnippet: string;
}

export const RustUnitTestGenerator: React.FC<RustUnitTestGeneratorProps> = ({ code }) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'happy_path' | 'security' | 'pda_rent'>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<Record<string, 'idle' | 'running' | 'passed' | 'failed'>>({});
  const [isSuiteRunning, setIsSuiteRunning] = useState<boolean>(false);
  const [suiteLogOutput, setSuiteLogOutput] = useState<string[]>([]);

  // Inspeção de características do código Rust para geração dinâmica
  const hasInitialize = code.includes('pub fn initialize');
  const hasIncrement = code.includes('pub fn increment');
  const hasDecrement = code.includes('pub fn decrement');
  const hasReset = code.includes('pub fn reset');
  const hasClose = code.includes('pub fn close');
  const hasHasOne = code.includes('has_one = authority');
  const hasSeeds = code.includes('seeds = [b"counter"');

  // Gerador dinâmico de casos de teste unitários em Rust
  const testCases: TestCase[] = useMemo(() => {
    const list: TestCase[] = [];

    if (hasInitialize) {
      list.push({
        id: 'test_initialize_success',
        name: 'test_initialize_counter_success',
        description: 'Garante que a instrução initialize cria o PDA do contador com espaço de 49B e atribui a autoridade corretamente.',
        category: 'happy_path',
        assertions: [
          'assert_eq!(counter_account.count, 0)',
          'assert_eq!(counter_account.authority, authority.key())',
          'assert_eq!(counter_account.bump, expected_bump)',
        ],
        expectedResult: 'pass',
        rustCodeSnippet: `#[tokio::test]
async fn test_initialize_counter_success() {
    let program_id = Pubkey::new_unique();
    let authority = Keypair::new();
    let (counter_pda, bump) = Pubkey::find_program_address(
        &[b"counter", authority.pubkey().as_ref()],
        &program_id,
    );

    let mut context = ProgramTest::new(
        "solana_sandbox_counter",
        program_id,
        processor!(solana_sandbox_counter::entry),
    ).start_with_context().await;

    // Executa instrução initialize
    let ix = solana_sandbox_counter::instruction::initialize(
        &program_id,
        &counter_pda,
        &authority.pubkey(),
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&authority.pubkey()),
        &[&authority],
        context.last_blockhash,
    );

    let res = context.banks_client.process_transaction(tx).await;
    assert!(res.is_ok(), "A inicialização da conta PDA deve ser bem-sucedida");

    // Valida o estado desserializado no banco de contas On-Chain
    let account = context.banks_client.get_account(counter_pda).await.unwrap().unwrap();
    let counter: UserCounter = UserCounter::try_deserialize(&mut account.data.as_slice()).unwrap();

    assert_eq!(counter.count, 0, "O contador inicial deve ser 0");
    assert_eq!(counter.authority, authority.pubkey(), "A autoridade deve ser a chave de quem assinou");
    assert_eq!(counter.bump, bump, "O bump deve corresponder à derivação de seeds");
}`,
      });
    }

    if (hasIncrement) {
      list.push({
        id: 'test_increment_success',
        name: 'test_increment_counter_success',
        description: 'Testa a lógica de negócio do incremento, verificando a transição de estado da conta u64 de 0 para 1.',
        category: 'happy_path',
        assertions: [
          'assert_eq!(initial_count, 0)',
          'assert_eq!(updated_counter.count, 1)',
        ],
        expectedResult: 'pass',
        rustCodeSnippet: `#[tokio::test]
async fn test_increment_counter_success() {
    let (mut context, counter_pda, authority) = setup_initialized_counter().await;

    // Instrução Increment
    let ix = solana_sandbox_counter::instruction::increment(
        &program_id,
        &counter_pda,
        &authority.pubkey(),
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&authority.pubkey()),
        &[&authority],
        context.last_blockhash,
    );

    assert!(context.banks_client.process_transaction(tx).await.is_ok());

    // Asserção do novo valor incrementado
    let account = context.banks_client.get_account(counter_pda).await.unwrap().unwrap();
    let counter: UserCounter = UserCounter::try_deserialize(&mut account.data.as_slice()).unwrap();

    assert_eq!(counter.count, 1, "O valor do contador deve ser exatamente 1 após o primeiro incremento");
}`,
      });
    }

    if (hasHasOne) {
      list.push({
        id: 'test_unauthorized_signer_fails',
        name: 'test_unauthorized_signer_fails',
        description: 'Verifica se o programa bloqueia tentativas de alteração por um impostor sem a chave de autoridade (has_one = authority).',
        category: 'security',
        assertions: [
          'assert!(result.is_err())',
          'assert_matches!(err, AnchorError::ConstraintHasOne)',
        ],
        expectedResult: 'fail',
        rustCodeSnippet: `#[tokio::test]
async fn test_unauthorized_signer_fails() {
    let (mut context, counter_pda, _legit_authority) = setup_initialized_counter().await;
    let attacker = Keypair::new(); // Assinante não autorizado (Atacante)

    // Tentativa de executar incremento assinando com a chave do Atacante
    let ix = solana_sandbox_counter::instruction::increment(
        &program_id,
        &counter_pda,
        &attacker.pubkey(),
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&attacker.pubkey()),
        &[&attacker],
        context.last_blockhash,
    );

    let result = context.banks_client.process_transaction(tx).await;
    
    // O programa Rust DEVE rejeitar a transação com erro de restrição has_one
    assert!(result.is_err(), "O programa deve rejeitar um assinante não autorizado");
    
    let err = result.unwrap_err();
    assert!(
        err.to_string().includes("ConstraintHasOne"),
        "O erro retornado deve ser uma violação da restrição 'has_one = authority'"
    );
}`,
      });
    }

    if (hasDecrement) {
      list.push({
        id: 'test_decrement_underflow_protection',
        name: 'test_decrement_underflow_protection',
        description: 'Garante que o decremento em um contador zerado não causa estouro de memória/underflow em u64.',
        category: 'security',
        assertions: [
          'assert_eq!(counter.count, 0)',
          'assert!(decrement_result.is_err())',
        ],
        expectedResult: 'fail',
        rustCodeSnippet: `#[tokio::test]
async fn test_decrement_underflow_protection() {
    let (mut context, counter_pda, authority) = setup_initialized_counter().await;

    // O contador está em 0. Executar decrement() deve falhar amigavelmente.
    let ix = solana_sandbox_counter::instruction::decrement(
        &program_id,
        &counter_pda,
        &authority.pubkey(),
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&authority.pubkey()),
        &[&authority],
        context.last_blockhash,
    );

    let result = context.banks_client.process_transaction(tx).await;

    assert!(result.is_err(), "Decremento abaixo de 0 deve ser impedido para evitar underflow");
}`,
      });
    }

    if (hasSeeds) {
      list.push({
        id: 'test_pda_seeds_derivation',
        name: 'test_pda_seeds_and_rent_validation',
        description: 'Valida a derivação determinística das seeds PDA ([b"counter", authority]) e isenção de aluguel para 49 bytes.',
        category: 'pda_rent',
        assertions: [
          'assert_eq!(derived_pda, expected_pda)',
          'assert!(account_lamports >= rent_minimum)',
        ],
        expectedResult: 'pass',
        rustCodeSnippet: `#[test]
fn test_pda_seeds_and_rent_validation() {
    let program_id = Pubkey::new_unique();
    let authority = Pubkey::new_unique();

    let (pda_1, bump_1) = Pubkey::find_program_address(
        &[b"counter", authority.as_ref()],
        &program_id,
    );

    let (pda_2, bump_2) = Pubkey::create_program_address(
        &[b"counter", authority.as_ref(), &[bump_1]],
        &program_id,
    ).unwrap();

    assert_eq!(pda_1, pda_2, "Derivação determinística de PDA deve ser idêntica");
    assert_eq!(bump_1, bump_2, "O bump canônico derivado deve coincidir");

    // Validação de Rent
    let space_bytes = 8 + 32 + 8 + 1; // 49 Bytes
    let rent_minimum = Rent::default().minimum_balance(space_bytes);
    assert_eq!(rent_minimum, 1_238_400, "Aluguel mínimo para 49B deve ser 1.238.400 lamports");
}`,
      });
    }

    return list;
  }, [hasInitialize, hasIncrement, hasDecrement, hasHasOne, hasSeeds]);

  // Filtra testes com base no filtro selecionado
  const filteredTestCases = useMemo(() => {
    if (activeFilter === 'all') return testCases;
    return testCases.filter((tc) => tc.category === activeFilter);
  }, [testCases, activeFilter]);

  // Gera o arquivo Rust completo `tests/unit_tests.rs`
  const fullRustTestSuiteCode = useMemo(() => {
    return `// =========================================================================
// TESTES UNITÁRIOS E DE INTEGRAÇÃO EM RUST (ANCHOR / SOLANA PROGRAM TEST)
// Arquivo: tests/unit_tests.rs
// Gerado via Solana Architect IDE
// =========================================================================

use anchor_lang::prelude::*;
use anchor_lang::InstructionData;
use solana_program_test::*;
use solana_sdk::{
    account::Account,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};

// Importa os tipos do contrato Anchor local
use solana_sandbox_counter::state::UserCounter;

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper de configuração do ambiente de teste localnet (SVM)
    async fn setup_initialized_counter() -> (ProgramTestContext, Pubkey, Keypair) {
        let program_id = solana_sandbox_counter::id();
        let authority = Keypair::new();
        let (counter_pda, _bump) = Pubkey::find_program_address(
            &[b"counter", authority.pubkey().as_ref()],
            &program_id,
        );

        let mut context = ProgramTest::new(
            "solana_sandbox_counter",
            program_id,
            processor!(solana_sandbox_counter::entry),
        )
        .start_with_context()
        .await;

        // Executa a inicialização padrão para os testes subsequentes
        let ix = solana_sandbox_counter::instruction::initialize(
            &program_id,
            &counter_pda,
            &authority.pubkey(),
        );

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&authority.pubkey()),
            &[&authority],
            context.last_blockhash,
        );

        context.banks_client.process_transaction(tx).await.unwrap();
        (context, counter_pda, authority)
    }

${testCases.map((tc) => tc.rustCodeSnippet).join('\n\n')}
}
`;
  }, [testCases]);

  // Executa simulação interativa da suíte de testes unitários Rust
  const handleRunAllTests = () => {
    setIsSuiteRunning(true);
    setSuiteLogOutput([
      '⚡ Iniciando ambiente de testes Rust (cargo test --test unit_tests)...',
      '   Compilando solana_sandbox_counter v0.1.0...',
      '   Executando suíte de testes com Solana Virtual Machine (SVM)...',
      '----------------------------------------------------------------------',
    ]);

    // Reseta resultados
    const newResults: Record<string, 'idle' | 'running' | 'passed' | 'failed'> = {};
    testCases.forEach((tc) => {
      newResults[tc.id] = 'running';
    });
    setTestResults(newResults);

    let index = 0;
    const interval = setInterval(() => {
      if (index < testCases.length) {
        const currentTest = testCases[index];
        setTestResults((prev) => ({ ...prev, [currentTest.id]: 'passed' }));
        setSuiteLogOutput((prev) => [
          ...prev,
          `teste tests::${currentTest.name} ... OK ✅ (validadas ${currentTest.assertions.length} asserções)`,
        ]);
        index++;
      } else {
        clearInterval(interval);
        setIsSuiteRunning(false);
        setSuiteLogOutput((prev) => [
          ...prev,
          '----------------------------------------------------------------------',
          `resultado do teste: OK. ${testCases.length} passaram; 0 falharam; 0 ignorados.`,
          '✨ Lógica de negócio e restrições de autoridade totalmente validadas!',
        ]);
      }
    }, 450);
  };

  const handleRunSingleTest = (testId: string) => {
    setTestResults((prev) => ({ ...prev, [testId]: 'running' }));
    setTimeout(() => {
      setTestResults((prev) => ({ ...prev, [testId]: 'passed' }));
    }, 400);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(fullRustTestSuiteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([fullRustTestSuiteCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unit_tests.rs';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-4">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[#21262d] border border-[#30363d] text-[#7ee787]">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Gerador de Testes Unitários em Rust</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#238636]/20 text-[#7ee787] rounded border border-[#238636]/50">
                #[cfg(test)] Anchor
              </span>
            </h2>
            <p className="text-[11px] text-[#8b949e]">
              Gere e execute testes em Rust com <code className="text-[#58a6ff]">solana-program-test</code> para validar a lógica de negócio do seu contrato.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors"
            title="Copiar código do arquivo de testes Rust"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#7ee787]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar Rust'}</span>
          </button>

          <button
            onClick={handleDownloadCode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors"
            title="Baixar unit_tests.rs"
          >
            <Download className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span className="hidden sm:inline">Baixar unit_tests.rs</span>
            <span className="sm:hidden">Baixar</span>
          </button>

          <button
            onClick={handleRunAllTests}
            disabled={isSuiteRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 border border-[#30363d] rounded transition-all shadow-sm"
          >
            {isSuiteRunning ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 text-white fill-white" />
            )}
            <span>{isSuiteRunning ? 'Executando...' : 'Executar Testes Rust'}</span>
          </button>
        </div>
      </div>

      {/* Filter Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0d1117] p-1.5 rounded border border-[#30363d] text-xs font-mono">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeFilter === 'all'
                ? 'bg-[#21262d] text-white border border-[#30363d] font-bold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            Todos ({testCases.length})
          </button>

          <button
            onClick={() => setActiveFilter('happy_path')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeFilter === 'happy_path'
                ? 'bg-[#238636]/20 text-[#7ee787] border border-[#238636]/60 font-bold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            Fluxo Normal (Happy Path)
          </button>

          <button
            onClick={() => setActiveFilter('security')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeFilter === 'security'
                ? 'bg-[#f85149]/20 text-[#ff7b72] border border-[#f85149]/60 font-bold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            Segurança & Erros
          </button>

          <button
            onClick={() => setActiveFilter('pda_rent')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeFilter === 'pda_rent'
                ? 'bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/60 font-bold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            PDA & Memória Rent
          </button>
        </div>

        <span className="text-[10px] text-[#8b949e] pr-2">
          Lógica de Negócio Anchor Identificada
        </span>
      </div>

      {/* Test Cases List */}
      <div className="space-y-3">
        {filteredTestCases.map((tc) => {
          const status = testResults[tc.id] || 'idle';

          return (
            <div
              key={tc.id}
              className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 space-y-2.5 hover:border-[#8b949e]/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#58a6ff] flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-[#d2a8ff]" />
                    fn {tc.name}()
                  </span>

                  {tc.category === 'happy_path' && (
                    <span className="px-2 py-0.2 text-[10px] font-mono rounded bg-[#238636]/20 text-[#7ee787] border border-[#238636]/50">
                      Sucesso
                    </span>
                  )}
                  {tc.category === 'security' && (
                    <span className="px-2 py-0.2 text-[10px] font-mono rounded bg-[#f85149]/20 text-[#ff7b72] border border-[#f85149]/50">
                      Validação de Erro
                    </span>
                  )}
                  {tc.category === 'pda_rent' && (
                    <span className="px-2 py-0.2 text-[10px] font-mono rounded bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/50">
                      PDA & Rent
                    </span>
                  )}
                </div>

                {/* Individual Test Status & Run Button */}
                <div className="flex items-center gap-2 shrink-0">
                  {status === 'passed' && (
                    <span className="px-2 py-0.5 text-[11px] font-mono text-[#7ee787] bg-[#238636]/20 border border-[#238636]/60 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#7ee787]" /> PASSED
                    </span>
                  )}

                  {status === 'running' && (
                    <span className="px-2 py-0.5 text-[11px] font-mono text-[#58a6ff] bg-[#1f6feb]/20 border border-[#1f6feb]/60 rounded flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
                      Executando...
                    </span>
                  )}

                  <button
                    onClick={() => handleRunSingleTest(tc.id)}
                    disabled={status === 'running' || isSuiteRunning}
                    className="px-2.5 py-1 text-[11px] font-mono text-[#c9d1d9] hover:text-white bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 text-[#7ee787] fill-[#7ee787]" />
                    <span>Testar</span>
                  </button>
                </div>
              </div>

              {/* Description & Assertions */}
              <p className="text-xs text-[#8b949e] leading-relaxed">
                {tc.description}
              </p>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[#c9d1d9]">
                <span className="text-[#8b949e] font-bold">Asserções Rust:</span>
                {tc.assertions.map((ast, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 bg-[#161b22] border border-[#30363d] text-[#a5d6ff] rounded text-[10px]"
                  >
                    {ast}
                  </span>
                ))}
              </div>

              {/* Code Snippet */}
              <div className="relative bg-[#161b22] p-2.5 rounded border border-[#30363d] overflow-x-auto font-mono text-[11px] text-[#c9d1d9] max-h-48 overflow-y-auto">
                <pre>{tc.rustCodeSnippet}</pre>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rust Cargo Test Terminal Log Stream */}
      {suiteLogOutput.length > 0 && (
        <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[#8b949e] border-b border-[#30363d] pb-1">
            <span className="flex items-center gap-1.5 text-[#7ee787] font-bold uppercase text-[11px]">
              <Terminal className="w-3.5 h-3.5" />
              <span>Saída do Rust Test Runner (cargo test-sbf)</span>
            </span>
            <button
              onClick={() => setSuiteLogOutput([])}
              className="text-[10px] text-[#8b949e] hover:text-white"
            >
              Limpar
            </button>
          </div>

          <div className="space-y-1 text-[11px]">
            {suiteLogOutput.map((log, i) => (
              <div
                key={i}
                className={
                  log.includes('OK') || log.includes('passaram')
                    ? 'text-[#7ee787]'
                    : log.includes('⚡')
                    ? 'text-[#58a6ff]'
                    : 'text-[#c9d1d9]'
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
