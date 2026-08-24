//! Tipos de dados e definições de domínio do Solana Architect Core em Rust.

use serde::{Deserialize, Serialize};

/// Nível de severidade de um apontamento de segurança da auditoria estática.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
    Info,
    Pass,
}

impl Severity {
    pub fn penalty_score(&self) -> u32 {
        match self {
            Severity::Critical => 35,
            Severity::High => 20,
            Severity::Medium => 10,
            Severity::Low => 5,
            Severity::Info => 0,
            Severity::Pass => 0,
        }
    }

    pub fn to_str(&self) -> &'static str {
        match self {
            Severity::Critical => "CRITICAL",
            Severity::High => "HIGH",
            Severity::Medium => "MEDIUM",
            Severity::Low => "LOW",
            Severity::Info => "INFO",
            Severity::Pass => "PASS",
        }
    }
}

/// Categorias de auditoria e conformidade técnica no Solana/Anchor.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AuditCategory {
    AccessControl,
    PdaCanonicalBump,
    AccountValidation,
    MathOverflow,
    RentSpace,
    AccountClose,
    SignerCheck,
    BestPractices,
}

impl AuditCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuditCategory::AccessControl => "Controle de Acesso",
            AuditCategory::PdaCanonicalBump => "PDA & Bump Canônico",
            AuditCategory::AccountValidation => "Validação de Conta",
            AuditCategory::MathOverflow => "Matemática / Overflow",
            AuditCategory::RentSpace => "Rent / Espaço",
            AuditCategory::AccountClose => "Encerramento & Reembolso",
            AuditCategory::SignerCheck => "Verificação de Assinante",
            AuditCategory::BestPractices => "Boas Práticas Anchor",
        }
    }
}

/// Ação de correção automática sugerida pelo motor de auditoria.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixAction {
    pub label: String,
    pub patch_code: String,
}

/// Relatório de um apontamento emitido pelo motor de auditoria estática AST.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditIssue {
    pub id: String,
    pub severity: Severity,
    pub category: String,
    pub title: String,
    pub description: String,
    pub line: Option<usize>,
    pub code_snippet: Option<String>,
    pub recommendation: String,
    pub fix_action: Option<FixAction>,
}

/// Resultado completo da auditoria de segurança estática.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditReport {
    pub score: u32,
    pub total_rules_evaluated: usize,
    pub passed_checks: usize,
    pub issues: Vec<AuditIssue>,
    pub is_production_ready: bool,
}

/// Representação de uma carteira virtual para simulações SVM.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VirtualWallet {
    pub id: String,
    pub name: String,
    pub pubkey: String,
    pub role: String,
    pub balance_lamports: u64,
}

impl VirtualWallet {
    pub fn balance_sol(&self) -> f64 {
        self.balance_lamports as f64 / 1_000_000_000.0
    }
}

/// Estado em memória de uma conta On-Chain inspecionada.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountMemoryState {
    pub is_initialized: bool,
    pub address: String,
    pub authority: String,
    pub count: u64,
    pub bump: u8,
    pub lamports: u64,
    pub space_bytes: usize,
    pub discriminator_hex: String,
    pub raw_data_bytes: Vec<u8>,
}

/// Entrada de log e evento de transação na SVM.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionLog {
    pub id: String,
    pub timestamp_ms: u64,
    pub signature: String,
    pub signer_pubkey: String,
    pub instruction_name: String,
    pub is_success: bool,
    pub compute_units_consumed: u32,
    pub logs: Vec<String>,
    pub error_message: Option<String>,
}
