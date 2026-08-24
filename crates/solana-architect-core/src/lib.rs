//! # Solana Architect Core Engine
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
};
