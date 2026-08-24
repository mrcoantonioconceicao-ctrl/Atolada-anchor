//! Gerador de Suítes de Testes Unitários em Rust puro usando `solana-program-test`.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RustTestCase {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub assertions: Vec<String>,
    pub expected_result: String,
    pub code_snippet: String,
}

/// Gera dinamicamente o código-fonte de `tests/unit_tests.rs` com base nos recursos detectados no contrato
pub fn generate_full_rust_test_suite(source_code: &str) -> String {
    let has_initialize = source_code.contains("pub fn initialize");
    let has_increment = source_code.contains("pub fn increment");
    let has_decrement = source_code.contains("pub fn decrement");
    let has_has_one = source_code.contains("has_one = authority");

    let mut tests_code = String::new();

    if has_initialize {
        tests_code.push_str(
            r#"
    #[tokio::test]
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

        assert!(context.banks_client.process_transaction(tx).await.is_ok());

        let account = context.banks_client.get_account(counter_pda).await.unwrap().unwrap();
        let counter: UserCounter = UserCounter::try_deserialize(&mut account.data.as_slice()).unwrap();

        assert_eq!(counter.count, 0);
        assert_eq!(counter.authority, authority.pubkey());
        assert_eq!(counter.bump, bump);
    }
"#,
        );
    }

    if has_increment {
        tests_code.push_str(
            r#"
    #[tokio::test]
    async fn test_increment_counter_success() {
        let (mut context, counter_pda, authority) = setup_initialized_counter().await;

        let ix = solana_sandbox_counter::instruction::increment(
            &solana_sandbox_counter::id(),
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

        let account = context.banks_client.get_account(counter_pda).await.unwrap().unwrap();
        let counter: UserCounter = UserCounter::try_deserialize(&mut account.data.as_slice()).unwrap();

        assert_eq!(counter.count, 1, "O contador deve ser incrementado para 1");
    }
"#,
        );
    }

    if has_has_one {
        tests_code.push_str(
            r#"
    #[tokio::test]
    async fn test_unauthorized_signer_fails_has_one() {
        let (mut context, counter_pda, _authority) = setup_initialized_counter().await;
        let attacker = Keypair::new();

        let ix = solana_sandbox_counter::instruction::increment(
            &solana_sandbox_counter::id(),
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
        assert!(result.is_err(), "Transação assinada por impostor DEVE falhar com erro ConstraintHasOne");
    }
"#,
        );
    }

    if has_decrement {
        tests_code.push_str(
            r#"
    #[tokio::test]
    async fn test_decrement_underflow_protection() {
        let (mut context, counter_pda, authority) = setup_initialized_counter().await;

        let ix = solana_sandbox_counter::instruction::decrement(
            &solana_sandbox_counter::id(),
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
        assert!(result.is_err(), "Decremento de contador zerado deve retornar erro para evitar underflow");
    }
"#,
        );
    }

    format!(
        r#"// =========================================================================
// SUÍTE DE TESTES UNITÁRIOS ANCHOR EM RUST (solana-program-test)
// Gerado via Solana Architect Core v0.2.0
// =========================================================================

use anchor_lang::prelude::*;
use anchor_lang::InstructionData;
use solana_program_test::*;
use solana_sdk::{{
    account::Account,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{{Keypair, Signer}},
    transaction::Transaction,
}};

use solana_sandbox_counter::state::UserCounter;

#[cfg(test)]
mod tests {{
    use super::*;

    async fn setup_initialized_counter() -> (ProgramTestContext, Pubkey, Keypair) {{
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
    }}
{}
}}
"#,
        tests_code
    )
}
