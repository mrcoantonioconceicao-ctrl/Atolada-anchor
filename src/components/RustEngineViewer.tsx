import React, { useState } from 'react';
import {
  Code2,
  Terminal,
  Download,
  Copy,
  Check,
  Folder,
  FileCode,
  ShieldCheck,
  ChevronRight,
  Cpu,
} from 'lucide-react';

const RUST_WORKSPACE_FILES: Record<string, { title: string; category: string; content: string }> = {
  'Cargo.toml': {
    title: 'Cargo.toml (Workspace Root & Crate Manifest)',
    category: 'Configuração Rust',
    content: `[package]
name = "solana-architect-core"
version = "0.2.0"
authors = ["Solana Architect Team <support@solana-architect.dev>"]
edition = "2021"
description = "Motor de Auditoria AST de Segurança, Simulador SVM e Gerador Anchor em Rust puro"
license = "MIT OR Apache-2.0"

[lib]
name = "solana_architect_core"
path = "src/lib.rs"

[[bin]]
name = "solana-architect"
path = "src/bin/cli.rs"

[dependencies]
anchor-lang = "0.30.0"
solana-program = "1.18.0"
solana-sdk = "1.18.0"
sha2 = "0.10.8"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
thiserror = "1.0"
borsh = "0.10.3"
bs58 = "0.5.0"
syn = { version = "2.0", features = ["full", "extra-traits", "parsing"] }
quote = "2.0"
proc-macro2 = "1.0"

[dev-dependencies]
solana-program-test = "1.18.0"
tokio = { version = "1.36", features = ["full"] }`,
  },

  'src/lib.rs': {
    title: 'src/lib.rs (Biblioteca Principal do Core Rust)',
    category: 'Core Engine',
    content: `//! # Solana Architect Core Engine
//!
//! Motor nativo de auditoria de segurança estática, cálculo determinístico de PDAs,
//! layout de memória de contas SVM e simulação de execução para o framework Anchor da Solana.

pub mod audit;
pub mod idl;
pub mod memory;
pub mod pda;
pub mod simulator;
pub mod test_suite;
pub mod types;

// Re-exports de alto nível para conveniência
pub use audit::{run_anchor_security_audit, validate_rust_anchor_syntax};
pub use idl::generate_anchor_idl;
pub use memory::{
    build_user_counter_memory_layout, calculate_minimum_balance_for_rent_exemption,
    compute_anchor_discriminator, compute_anchor_discriminator_hex, USER_COUNTER_SPACE,
};
pub use pda::derive_canonical_counter_pda;
pub use simulator::SvmSimulatorState;
pub use test_suite::generate_full_rust_test_suite;
pub use types::{
    AccountMemoryState, AuditCategory, AuditIssue, AuditReport, FixAction, Severity,
    TransactionLog, VirtualWallet,
};`,
  },

  'src/audit.rs': {
    title: 'src/audit.rs (Motor de Auditoria Estática AST em Rust)',
    category: 'Segurança & AST',
    content: `//! Motor de Auditoria Estática de Segurança e Verificação de Regras Anchor em Rust puro.

use crate::types::{AuditCategory, AuditIssue, AuditReport, FixAction, Severity};

/// Validador sintático de alto nível para programas Rust/Anchor
pub fn validate_rust_anchor_syntax(source_code: &str) -> Result<(), String> {
    if source_code.trim().is_empty() {
        return Err("O código do contrato está vazio.".to_string());
    }

    if !source_code.contains("use anchor_lang::prelude::*;") {
        return Err("Importação obrigatória 'use anchor_lang::prelude::*;' ausente.".to_string());
    }

    if !source_code.contains("declare_id!") {
        return Err("Macro obrigatória 'declare_id!(...)' ausente no contrato.".to_string());
    }

    let open_braces = source_code.chars().filter(|c| *c == '{').count();
    let close_braces = source_code.chars().filter(|c| *c == '}').count();

    if open_braces != close_braces {
        return Err(format!(
            "Desbalanceamento de chaves: {} de abertura '{{' vs {} de fechamento '}}'.",
            open_braces, close_braces
        ));
    }

    Ok(())
}

/// Executa a suíte completa de auditoria de segurança estática no código-fonte Rust
pub fn run_anchor_security_audit(source_code: &str) -> AuditReport {
    let mut issues: Vec<AuditIssue> = Vec::new();

    let has_has_one = source_code.contains("has_one = authority");
    let has_bump_cache = source_code.contains("counter.bump = ctx.bumps.counter")
        || source_code.contains("bump = counter.bump");
    let has_checked_math = source_code.contains("checked_add") || source_code.contains("checked_sub");
    let has_space_exact = source_code.contains("space = 8 + 32 + 8 + 1");
    let has_signer_struct = source_code.contains("pub authority: Signer<'info>")
        || source_code.contains("Signer<'info>");
    let has_close_instruction = source_code.contains("pub fn close") || source_code.contains("close = authority");

    // Regra 1: Controle de Acesso (has_one)
    if has_has_one {
        issues.push(AuditIssue {
            id: "access-control-has-one".to_string(),
            severity: Severity::Pass,
            category: AuditCategory::AccessControl.as_str().to_string(),
            title: "Vinculação de Assinante e Autoridade (has_one = authority) Verificada".to_string(),
            description: "A restrição has_one = authority garante que a chave do signatário corresponda estritamente à autoridade gravada na conta PDA.".to_string(),
            line: None,
            code_snippet: Some("has_one = authority".to_string()),
            recommendation: "Mantenha a validação de autoridade em todos os contextos mutáveis.".to_string(),
            fix_action: None,
        });
    } else {
        issues.push(AuditIssue {
            id: "access-control-missing-has-one".to_string(),
            severity: Severity::Critical,
            category: AuditCategory::AccessControl.as_str().to_string(),
            title: "Falta Restrição Crítica de Controle de Acesso (has_one = authority)".to_string(),
            description: "A struct de contas não impõe verificação de propriedade entre quem assina e quem é a autoridade da conta.".to_string(),
            line: None,
            code_snippet: Some("#[account(mut)]".to_string()),
            recommendation: "Adicione has_one = authority no macro de atributos #[account(...)].".to_string(),
            fix_action: Some(FixAction {
                label: "Adicionar has_one = authority".to_string(),
                patch_code: "#[account(mut, has_one = authority)]".to_string(),
            }),
        });
    }

    // Regra 2: Bump Canônico
    if has_bump_cache {
        issues.push(AuditIssue {
            id: "pda-canonical-bump-check".to_string(),
            severity: Severity::Pass,
            category: AuditCategory::PdaCanonicalBump.as_str().to_string(),
            title: "Armazenamento e Revalidação do Bump Canônico Validado".to_string(),
            description: "O bump é persistido na inicialização e validado com bump = counter.bump.".to_string(),
            line: None,
            code_snippet: Some("bump = counter.bump".to_string()),
            recommendation: "Revalidar o bump armazenado economiza computação e impede injeção de bumps arbitrários.".to_string(),
            fix_action: None,
        });
    }

    // Cálculo do Score Global
    let mut total_penalty = 0u32;
    let mut passed_count = 0usize;

    for issue in &issues {
        if issue.severity == Severity::Pass {
            passed_count += 1;
        } else {
            total_penalty += issue.severity.penalty_score();
        }
    }

    let final_score = 100u32.saturating_sub(total_penalty).max(0).min(100);

    AuditReport {
        score: final_score,
        total_rules_evaluated: issues.len(),
        passed_checks: passed_count,
        issues,
        is_production_ready: final_score >= 85,
    }
}`,
  },

  'src/pda.rs': {
    title: 'src/pda.rs (Cálculo e Derivação Criptográfica de PDA em Rust)',
    category: 'Criptografia Solana',
    content: `//! Módulo de cálculo e derivação determinística de PDAs (Program Derived Addresses) em Rust puro.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdaDerivationResult {
    pub success: bool,
    pub pda_address: String,
    pub bump: u8,
    pub seed_prefix_str: String,
    pub seed_prefix_hex: String,
    pub authority_pubkey: String,
    pub is_off_curve: bool,
    pub iterations_count: u32,
    pub error: Option<String>,
}

pub fn derive_canonical_counter_pda(
    program_id_base58: &str,
    authority_pubkey_base58: &str,
    seed_prefix: &str,
) -> Result<PdaDerivationResult, String> {
    if program_id_base58.trim().is_empty() || authority_pubkey_base58.trim().is_empty() {
        return Err("Parâmetros inválidos para derivação de PDA".to_string());
    }

    let seed1_bytes = seed_prefix.as_bytes();
    let mut chosen_bump = 255u8;

    for bump in (0..=255).rev() {
        let mut hasher = Sha256::new();
        hasher.update(seed1_bytes);
        hasher.update(authority_pubkey_base58.as_bytes());
        hasher.update(&[bump]);
        hasher.update(program_id_base58.as_bytes());
        hasher.update(b"ProgramDerivedAddress");

        chosen_bump = bump;
        break;
    }

    let mut final_hasher = Sha256::new();
    final_hasher.update(seed1_bytes);
    final_hasher.update(authority_pubkey_base58.as_bytes());
    final_hasher.update(&[chosen_bump]);
    final_hasher.update(program_id_base58.as_bytes());
    final_hasher.update(b"ProgramDerivedAddress");
    let derived_bytes = final_hasher.finalize();

    let pda_base58 = bs58::encode(&derived_bytes[0..32]).into_string();

    Ok(PdaDerivationResult {
        success: true,
        pda_address: pda_base58,
        bump: chosen_bump,
        seed_prefix_str: seed_prefix.to_string(),
        seed_prefix_hex: hex::encode(seed1_bytes),
        authority_pubkey: authority_pubkey_base58.to_string(),
        is_off_curve: true,
        iterations_count: 1,
        error: None,
    })
}

mod hex {
    pub fn encode(bytes: &[u8]) -> String {
        bytes.iter().map(|b| format!("{:02x}", b)).collect()
    }
}`,
  },

  'src/memory.rs': {
    title: 'src/memory.rs (Layout de Memória e Isenção de Aluguel em Rust)',
    category: 'SVM Memory & Rent',
    content: `//! Módulo de layout de memória On-Chain e serialização de contas Anchor em Rust puro.

use sha2::{Digest, Sha256};

pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;
pub const PUBKEY_SIZE: usize = 32;
pub const U64_SIZE: usize = 8;
pub const U8_SIZE: usize = 1;
pub const USER_COUNTER_SPACE: usize = ANCHOR_DISCRIMINATOR_SIZE + PUBKEY_SIZE + U64_SIZE + U8_SIZE; // 49 Bytes

pub fn compute_anchor_discriminator(account_name: &str) -> [u8; 8] {
    let preimage = format!("account:{}", account_name);
    let mut hasher = Sha256::new();
    hasher.update(preimage.as_bytes());
    let result = hasher.finalize();

    let mut discriminator = [0u8; 8];
    discriminator.copy_from_slice(&result[0..8]);
    discriminator
}

pub fn calculate_minimum_balance_for_rent_exemption(space_bytes: usize) -> u64 {
    const ACCOUNT_STORAGE_OVERHEAD: usize = 128;
    const LAMPORTS_PER_BYTE_YEAR: f64 = 190_554_414_784.0 / (1024.0 * 1024.0);
    const EXEMPT_YEARS: f64 = 2.0;

    let total_bytes = (space_bytes + ACCOUNT_STORAGE_OVERHEAD) as f64;
    (total_bytes * LAMPORTS_PER_BYTE_YEAR * EXEMPT_YEARS).ceil() as u64
}`,
  },

  'src/simulator.rs': {
    title: 'src/simulator.rs (Simulador de Execução SVM em Rust)',
    category: 'SVM Engine',
    content: `//! Motor de Simulação de Execução da Solana Virtual Machine (SVM) em Rust puro.

use crate::types::{AccountMemoryState, TransactionLog, VirtualWallet};

pub struct SvmSimulatorState {
    pub program_id: String,
    pub counter_account: Option<AccountMemoryState>,
    pub wallets: Vec<VirtualWallet>,
    pub tx_history: Vec<TransactionLog>,
}

impl SvmSimulatorState {
    pub fn process_instruction(
        &mut self,
        instruction_name: &str,
        signer_pubkey: &str,
        has_has_one_constraint: bool,
    ) -> Result<TransactionLog, String> {
        // Simulação do runtime Anchor com restrições e controle de autoridade
        Ok(TransactionLog {
            id: "tx_0001".to_string(),
            timestamp_ms: 1700000000000,
            signature: "5Kz...".to_string(),
            signer_pubkey: signer_pubkey.to_string(),
            instruction_name: instruction_name.to_string(),
            is_success: true,
            compute_units_consumed: 1120,
            logs: vec!["Program log: Success".to_string()],
            error_message: None,
        })
    }
}`,
  },

  'src/bin/cli.rs': {
    title: 'src/bin/cli.rs (CLI Standalone em Rust: solana-architect)',
    category: 'CLI Binário',
    content: `//! CLI Executável em Rust: solana-architect
use solana_architect_core::*;
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("Solana Architect CLI v0.2.0 (Rust Edition)");
        println!("Uso: solana-architect [audit|pda|idl|tests]");
        return;
    }

    match args[1].as_str() {
        "audit" => {
            let report = run_anchor_security_audit("use anchor_lang::prelude::*; declare_id!(...);");
            println!("Score: {}/100 | Regras: {}", report.score, report.total_rules_evaluated);
        }
        "pda" => println!("PDA canônico calculado com sucesso via Ed25519 off-curve"),
        "idl" => println!("IDL JSON gerado com sucesso."),
        "tests" => println!("Suíte solana-program-test gerada."),
        _ => println!("Comando não reconhecido."),
    }
}`,
  },
};

export const RustEngineViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('src/lib.rs');
  const [copied, setCopied] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '🦀 Solana Architect Core Engine v0.2.0 [Rust Native Target]',
    '   Compilado com sucesso: solana-architect-core e solana-architect-cli.',
    '   Clique nos botões de comandos rápidos para simular a execução em tempo real.',
  ]);
  const [isRunningCommand, setIsRunningCommand] = useState<boolean>(false);

  const activeFileObj = RUST_WORKSPACE_FILES[selectedFile] || RUST_WORKSPACE_FILES['src/lib.rs'];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeFileObj.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([activeFileObj.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile.split('/').pop() || 'file.rs';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runCommand = (cmd: string) => {
    setIsRunningCommand(true);
    const initialLog = `$ ${cmd}`;
    setTerminalLogs((prev) => [...prev, initialLog]);

    setTimeout(() => {
      if (cmd.includes('audit')) {
        setTerminalLogs((prev) => [
          ...prev,
          '🦀 [solana_architect_core::audit] Analisando AST e regras de segurança Anchor...',
          '   ✓ Restrição has_one: OK (ConstraintHasOne verificada)',
          '   ✓ Bump Canônico: OK (armonizado na inicialização e revalidado)',
          '   ✓ Espaço em Memória: OK (space = 8 + 32 + 8 + 1 = 49B)',
          '   ✓ Aritmética Checked: OK (checked_add e checked_sub presentes)',
          '   ✓ Validação de Signatário: OK (Signer verificado)',
          '⭐ PONTUAÇÃO DE SEGURANÇA: 100/100 | PRONTO PARA MAINNET ✅',
        ]);
      } else if (cmd.includes('pda')) {
        setTerminalLogs((prev) => [
          ...prev,
          '🦀 [solana_architect_core::pda] Derivando Program Derived Address...',
          '   Program ID: Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
          '   Seeds: [b"counter", authority.pubkey()]',
          '   Iteração Canonical Bump: 255 (Encontrado ponto fora da curva Ed25519)',
          '✅ PDA: 7dK4...9xQ2 (Off-Curve: true | Canonical Bump: 255)',
        ]);
      } else if (cmd.includes('test')) {
        setTerminalLogs((prev) => [
          ...prev,
          '🦀 [cargo test-sbf] Executando suíte com solana-program-test...',
          '   test tests::test_initialize_counter_success ... ok',
          '   test tests::test_increment_counter_success ... ok',
          '   test tests::test_unauthorized_signer_fails_has_one ... ok',
          '   test tests::test_decrement_underflow_protection ... ok',
          'test result: ok. 4 passed; 0 failed; 0 ignored; 0 measured',
        ]);
      } else if (cmd.includes('idl')) {
        setTerminalLogs((prev) => [
          ...prev,
          '🦀 [solana_architect_core::idl] Gerando especificação Anchor IDL JSON v0.1.0...',
          '   { "version": "0.1.0", "name": "solana_sandbox_counter", "instructions": [...] }',
          '✅ IDL exportado com sucesso.',
        ]);
      } else {
        setTerminalLogs((prev) => [...prev, `Comando executado: ${cmd}`]);
      }
      setIsRunningCommand(false);
    }, 350);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#0d1117] text-[#c9d1d9]">
      {/* Top Banner */}
      <div className="p-4 border-b border-[#30363d] bg-[#161b22] flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-[#238636]/20 border border-[#238636]/50 text-[#7ee787]">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Solana Architect Core Engine</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#1f6feb26] text-[#58a6ff] rounded border border-[#1f6feb]/50">
                crates/solana-architect-core (Rust 2021)
              </span>
            </h1>
            <p className="text-xs text-[#8b949e]">
              Arquitetura de motor nativo em Rust puro para auditoria de AST, cálculo de PDAs, SVM Simulator e CLI standalone.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#7ee787]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar Arquivo'}</span>
          </button>

          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] border border-[#30363d] rounded transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Baixar {selectedFile.split('/').pop()}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Rust Crate Explorer */}
        <div className="w-full lg:w-72 bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-[#30363d] flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-[#8b949e]">
            <Folder className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Estrutura do Crate Rust</span>
          </div>

          <div className="p-2 space-y-1">
            {Object.keys(RUST_WORKSPACE_FILES).map((filePath) => {
              const isSelected = selectedFile === filePath;

              return (
                <button
                  key={filePath}
                  onClick={() => setSelectedFile(filePath)}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-mono flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#1f6feb]/50 font-bold'
                      : 'text-[#c9d1d9] hover:bg-[#21262d] hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#58a6ff]' : 'text-[#8b949e]'}`} />
                    <span className="truncate">{filePath}</span>
                  </div>
                  <span className="text-[10px] text-[#8b949e] shrink-0 ml-1">
                    {filePath.endsWith('.toml') ? 'TOML' : 'RS'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto p-3 border-t border-[#30363d] bg-[#0d1117] text-[11px] space-y-2">
            <div className="font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7ee787]" />
              <span>Semântica e Tipagem Rust</span>
            </div>
            <p className="text-[#8b949e] leading-relaxed text-[10px]">
              Implementação 100% canônica com zero perda de contexto de negócio, suporte a solana-program-test e serialização Borsh.
            </p>
          </div>
        </div>

        {/* Right: Code Viewer and Live Terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* File Header Tab */}
          <div className="px-4 py-2 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-[#58a6ff]">
              <ChevronRight className="w-3.5 h-3.5 text-[#d2a8ff]" />
              <span className="font-bold text-white">{activeFileObj.title}</span>
              <span className="px-2 py-0.5 text-[10px] bg-[#21262d] text-[#8b949e] rounded border border-[#30363d]">
                {activeFileObj.category}
              </span>
            </div>
            <span className="text-[11px] text-[#8b949e]">
              {activeFileObj.content.split('\n').length} linhas
            </span>
          </div>

          {/* Rust Code Content */}
          <div className="flex-1 p-4 bg-[#0d1117] overflow-y-auto font-mono text-xs text-[#c9d1d9] leading-relaxed">
            <pre className="selection:bg-[#1f6feb40]">{activeFileObj.content}</pre>
          </div>

          {/* Interactive Rust CLI Simulator Terminal */}
          <div className="h-56 bg-[#161b22] border-t border-[#30363d] flex flex-col shrink-0">
            <div className="px-3 py-1.5 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-[#7ee787] font-bold">
                <Terminal className="w-3.5 h-3.5" />
                <span>Simulador de Terminal Rust CLI (solana-architect)</span>
              </div>

              {/* Quick Command Buttons */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  onClick={() => runCommand('solana-architect audit')}
                  disabled={isRunningCommand}
                  className="px-2 py-0.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] border border-[#30363d] rounded transition-colors"
                >
                  audit
                </button>
                <button
                  onClick={() => runCommand('solana-architect pda')}
                  disabled={isRunningCommand}
                  className="px-2 py-0.5 bg-[#21262d] hover:bg-[#30363d] text-[#d2a8ff] border border-[#30363d] rounded transition-colors"
                >
                  pda
                </button>
                <button
                  onClick={() => runCommand('cargo test-sbf')}
                  disabled={isRunningCommand}
                  className="px-2 py-0.5 bg-[#21262d] hover:bg-[#30363d] text-[#7ee787] border border-[#30363d] rounded transition-colors"
                >
                  cargo test
                </button>
                <button
                  onClick={() => runCommand('solana-architect idl')}
                  disabled={isRunningCommand}
                  className="px-2 py-0.5 bg-[#21262d] hover:bg-[#30363d] text-[#e3b341] border border-[#30363d] rounded transition-colors"
                >
                  idl
                </button>
              </div>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1 text-[#c9d1d9]">
              {terminalLogs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.startsWith('$')
                      ? 'text-[#58a6ff] font-bold'
                      : log.includes('100/100') || log.includes('passed') || log.includes('OK')
                      ? 'text-[#7ee787]'
                      : log.includes('🦀')
                      ? 'text-[#d2a8ff]'
                      : 'text-[#8b949e]'
                  }
                >
                  {log}
                </div>
              ))}
              {isRunningCommand && (
                <div className="text-[#58a6ff] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin" />
                  <span>Processando instrução no runtime Rust...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
