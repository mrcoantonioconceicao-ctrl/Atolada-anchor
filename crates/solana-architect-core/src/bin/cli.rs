//! CLI Executável em Rust: `solana-architect`
//! Permite executar auditorias, derivar PDAs, simular transações e gerar testes via linha de comando.

use solana_architect_core::{
    derive_canonical_counter_pda, generate_anchor_idl, generate_full_rust_test_suite,
    run_anchor_security_audit, validate_rust_anchor_syntax,
};
use std::env;
use std::fs;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.len() < 2 {
        print_help();
        return;
    }

    match args[1].as_str() {
        "audit" => {
            let file_path = if args.len() > 2 {
                &args[2]
            } else {
                "programs/solana_sandbox_counter/src/lib.rs"
            };

            println!("🦀 [Solana Architect CLI] Executando auditoria em: {}", file_path);

            let code = match fs::read_to_string(file_path) {
                Ok(content) => content,
                Err(_) => {
                    println!("⚠️ Arquivo local não encontrado. Usando template padrão de verificação...");
                    default_counter_code().to_string()
                }
            };

            if let Err(err) = validate_rust_anchor_syntax(&code) {
                eprintln!("❌ Erro de Sintaxe: {}", err);
                std::process::exit(1);
            }

            let report = run_anchor_security_audit(&code);
            println!("\n=======================================================");
            println!("   RELATÓRIO DE AUDITORIA DE SEGURANÇA (ANCHOR RUST)  ");
            println!("=======================================================");
            println!("⭐ Pontuação Geral: {}/100", report.score);
            println!("📊 Regras Avaliadas: {}", report.total_rules_evaluated);
            println!("✅ Checagens Aprovadas: {}", report.passed_checks);
            println!("🛡️ Pronto para Produção: {}\n", if report.is_production_ready { "SIM ✅" } else { "NÃO ❌" });

            for issue in &report.issues {
                println!(
                    "[{}] ({}) {}",
                    issue.severity.to_str(),
                    issue.category,
                    issue.title
                );
                println!("    📝 {}", issue.description);
                println!("    💡 Recomendação: {}\n", issue.recommendation);
            }
        }

        "pda" => {
            let program_id = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";
            let authority = "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R";
            println!("🦀 [Solana Architect CLI] Derivando PDA...");
            println!("   Program ID: {}", program_id);
            println!("   Autoridade: {}", authority);

            match derive_canonical_counter_pda(program_id, authority, "counter") {
                Ok(res) => {
                    println!("✅ PDA Derivado: {}", res.pda_address);
                    println!("🔑 Canonical Bump: {}", res.bump);
                    println!("📦 Off-Curve Validado: {}", res.is_off_curve);
                }
                Err(err) => eprintln!("❌ Erro ao derivar PDA: {}", err),
            }
        }

        "idl" => {
            let program_id = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";
            let idl = generate_anchor_idl(program_id, true, true);
            let json_output = serde_json::to_string_pretty(&idl).unwrap();
            println!("{}", json_output);
        }

        "tests" => {
            let code = default_counter_code();
            let test_suite = generate_full_rust_test_suite(code);
            println!("{}", test_suite);
        }

        _ => print_help(),
    }
}

fn print_help() {
    println!(
        r#"
🦀 Solana Architect CLI v0.2.0 (Rust Edition)
Uso: solana-architect <COMANDO> [OPÇÕES]

Comandos:
  audit [caminho_arquivo]   Executa auditoria estática completa no código Anchor
  pda                       Deriva o PDA canônico e bump para o programa
  idl                       Gera a especificação Anchor IDL em formato JSON
  tests                     Gera a suíte de testes unitários com solana-program-test
  help                      Exibe esta mensagem de ajuda
"#
    );
}

fn default_counter_code() -> &'static str {
    r#"use anchor_lang::prelude::*;
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod solana_sandbox_counter {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = ctx.accounts.authority.key();
        counter.count = 0;
        counter.bump = ctx.bumps.counter;
        Ok(())
    }
    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 1,
        seeds = [b"counter", authority.key().as_ref()],
        bump
    )]
    pub counter: Account<'info, UserCounter>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump,
        has_one = authority
    )]
    pub counter: Account<'info, UserCounter>,
    pub authority: Signer<'info>,
}

#[account]
pub struct UserCounter {
    pub authority: Pubkey,
    pub count: u64,
    pub bump: u8,
}
"#
}
