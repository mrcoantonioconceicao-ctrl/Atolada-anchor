//! Testes de integração em Rust puro para o crate `solana-architect-core`.

use solana_architect_core::*;

const SECURE_CODE: &str = r#"use anchor_lang::prelude::*;
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

    pub fn close(ctx: Context<CloseAccount>) -> Result<()> {
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

#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(
        mut,
        close = authority,
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
"#;

const INSECURE_CODE: &str = r#"use anchor_lang::prelude::*;
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod unsecure_counter {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 40)]
    pub counter: Account<'info, UserCounter>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub counter: Account<'info, UserCounter>,
}

#[account]
pub struct UserCounter {
    pub authority: Pubkey,
    pub count: u64,
}
"#;

#[test]
fn test_syntax_validator_success() {
    let res = validate_rust_anchor_syntax(SECURE_CODE);
    assert!(res.is_ok(), "Código Anchor válido deve passar na validação sintática");
}

#[test]
fn test_syntax_validator_empty_fails() {
    let res = validate_rust_anchor_syntax("");
    assert!(res.is_err(), "Código vazio deve retornar erro");
}

#[test]
fn test_secure_contract_audit_score() {
    let report = run_anchor_security_audit(SECURE_CODE);
    assert_eq!(report.score, 100, "Código seguro deve obter pontuação 100");
    assert!(report.is_production_ready);
}

#[test]
fn test_insecure_contract_audit_penalties() {
    let report = run_anchor_security_audit(INSECURE_CODE);
    assert!(
        report.score < 50,
        "Código vulnerável sem has_one deve sofrer penalidade pesada"
    );
    assert!(!report.is_production_ready);

    let has_critical = report.issues.iter().any(|i| i.severity == Severity::Critical);
    assert!(has_critical, "Deve conter apontamento crítico de has_one");
}

#[test]
fn test_pda_canonical_derivation() {
    let program_id = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS";
    let authority = "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R";
    let res = derive_canonical_counter_pda(program_id, authority, "counter").unwrap();

    assert!(res.success);
    assert!(!res.pda_address.is_empty());
    assert!(res.is_off_curve);
}

#[test]
fn test_anchor_discriminator_and_space() {
    assert_eq!(USER_COUNTER_SPACE, 49);
    let disc_hex = compute_anchor_discriminator_hex("UserCounter");
    assert!(disc_hex.starts_with("0x"));
    assert_eq!(disc_hex.len(), 18); // "0x" + 16 caracteres hex (8 bytes)

    let rent = calculate_minimum_balance_for_rent_exemption(USER_COUNTER_SPACE);
    assert_eq!(rent, 1_238_400); // 1.238.400 lamports para 49B
}

#[test]
fn test_svm_simulation_happy_path() {
    let mut sim = SvmSimulatorState::new("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
    let alice_pubkey = "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R";

    // 1. Initialize
    let init_tx = sim.process_instruction("initialize", alice_pubkey, true).unwrap();
    assert!(init_tx.is_success);
    assert!(sim.counter_account.is_some());
    assert_eq!(sim.counter_account.as_ref().unwrap().count, 0);

    // 2. Increment
    let inc_tx = sim.process_instruction("increment", alice_pubkey, true).unwrap();
    assert!(inc_tx.is_success);
    assert_eq!(sim.counter_account.as_ref().unwrap().count, 1);
}

#[test]
fn test_svm_simulation_attacker_blocked_by_has_one() {
    let mut sim = SvmSimulatorState::new("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
    let alice_pubkey = "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R";
    let bob_attacker = "8rA4wJkC3mGk4rK2k7B5tE1X9yZ6wL8vN3mQ5pS7tU9V";

    sim.process_instruction("initialize", alice_pubkey, true).unwrap();

    // Bob tenta incrementar a conta da Alice com has_one ativo
    let attack_tx = sim.process_instruction("increment", bob_attacker, true).unwrap();
    assert!(!attack_tx.is_success, "Ataque deve ser bloqueado");
    assert!(attack_tx.error_message.unwrap().contains("ConstraintHasOne"));
}
