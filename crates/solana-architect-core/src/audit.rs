//! Motor de Auditoria Estática de Segurança e Verificação de Regras Anchor em Rust puro.

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

    // =========================================================================
    // REGRA 1: Controle de Acesso - Restrição has_one
    // =========================================================================
    if has_has_one {
        issues.push(AuditIssue {
            id: "access-control-has-one".to_string(),
            severity: Severity::Pass,
            category: AuditCategory::AccessControl.as_str().to_string(),
            title: "Vinculação de Assinante e Autoridade (`has_one = authority`) Verificada".to_string(),
            description: "A restrição `has_one = authority` garante que a chave do signatário corresponda estritamente à autoridade gravada na conta PDA.".to_string(),
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
            title: "Falta Restrição Crítica de Controle de Acesso (`has_one = authority`)".to_string(),
            description: "A struct de contas não impõe verificação de propriedade entre quem assina e quem é a autoridade da conta. Qualquer invasor pode passar uma conta de terceiros e manipular o estado!".to_string(),
            line: None,
            code_snippet: Some("#[account(mut)]".to_string()),
            recommendation: "Adicione `has_one = authority` no macro de atributos `#[account(...)]`.".to_string(),
            fix_action: Some(FixAction {
                label: "Adicionar has_one = authority".to_string(),
                patch_code: "#[account(\n    mut,\n    seeds = [b\"counter\", authority.key().as_ref()],\n    bump = counter.bump,\n    has_one = authority\n)]".to_string(),
            }),
        });
    }

    // =========================================================================
    // REGRA 2: PDA & Revalidação do Bump Canônico
    // =========================================================================
    if has_bump_cache {
        issues.push(AuditIssue {
            id: "pda-canonical-bump-check".to_string(),
            severity: Severity::Pass,
            category: AuditCategory::PdaCanonicalBump.as_str().to_string(),
            title: "Armazenamento e Revalidação do Bump Canônico Validado".to_string(),
            description: "O bump é persistido na inicialização (`counter.bump = ctx.bumps.counter`) e validado em invocações subsequentes com `bump = counter.bump`.".to_string(),
            line: None,
            code_snippet: Some("bump = counter.bump".to_string()),
            recommendation: "Revalidar o bump armazenado economiza computação e impede injeção de bumps não-canônicos.".to_string(),
            fix_action: None,
        });
    } else {
        issues.push(AuditIssue {
            id: "pda-missing-canonical-bump".to_string(),
            severity: Severity::High,
            category: AuditCategory::PdaCanonicalBump.as_str().to_string(),
            title: "Falta Armazenamento e Validação do Bump Canônico".to_string(),
            description: "Sem a validação de `bump = counter.bump`, um invasor pode forçar cálculos redundantes ou explorar bumps fora da curva padrão.".to_string(),
            line: None,
            code_snippet: None,
            recommendation: "Guarde `pub bump: u8` na struct da conta e declare `bump = counter.bump` nos handlers.".to_string(),
            fix_action: Some(FixAction {
                label: "Armazenar Bump Canônico".to_string(),
                patch_code: "counter.bump = ctx.bumps.counter;".to_string(),
            }),
        });
    }

    // =========================================================================
    // REGRA 3: Rent & Alocação Exata de Espaço em Disco (49 Bytes)
    // =========================================================================
    if has_space_exact {
        issues.push(AuditIssue {
            id: "rent-exact-space-49".to_string(),
            severity: Severity::Pass,
            category: AuditCategory::RentSpace.as_str().to_string(),
            title: "Alocação Exata de Espaço em Memória (49 Bytes)".to_string(),
            description: "Alocação precisa calculada: 8 (Discriminador) + 32 (Pubkey) + 8 (u64 contador) + 1 (u8 bump) = 49 bytes.".to_string(),
            line: None,
            code_snippet: Some("space = 8 + 32 + 8 + 1".to_string()),
            recommendation: "A alocação exata garante rent-exemption sem desperdício de SOL e previne erros de tamanho de conta.".to_string(),
            fix_action: None,
        });
    } else if source_code.contains("space =") {
        issues.push(AuditIssue {
            id: "rent-insufficient-space".to_string(),
            severity: Severity::Medium,
            category: AuditCategory::RentSpace.as_str().to_string(),
            title: "Alocação de Espaço Incompleta ou Desajustada".to_string(),
            description: "O espaço configurado pode não comportar todos os campos da struct `UserCounter` (faltando 1 byte do bump ou discriminador).".to_string(),
            line: None,
            code_snippet: None,
            recommendation: "Atualize para `space = 8 + 32 + 8 + 1` (49 bytes).".to_string(),
            fix_action: Some(FixAction {
                label: "Definir space = 8 + 32 + 8 + 1".to_string(),
                patch_code: "space = 8 + 32 + 8 + 1,".to_string(),
            }),
        });
    } else {
        issues.push(AuditIssue {
            id: "rent-missing-space".to_string(),
            severity: Severity::High,
            category: AuditCategory::RentSpace.as_str().to_string(),
            title: "Parâmetro 'space' Ausente na Inicialização".to_string(),
            description: "A macro `init` exige o tamanho da conta para o System Program alocar memória e cobrar a isenção de aluguel.".to_string(),
            line: None,
            code_snippet: None,
            recommendation: "Especifique `space = 8 + 32 + 8 + 1` no atributo `#[account(init, ...)]`.".to_string(),
            fix_action: None,
        });
    }

    // =========================================================================
    // REGRA 4: Aritmética e Proteção contra Overflow/Underflow
    // =========================================================================
    if has_checked_math {
        issues.push(AuditIssue {
            id: "math-checked-arithmetic".to_string(),
            severity: Severity::Pass,
            category: AuditCategory::MathOverflow.as_str().to_string(),
            title: "Aritmética Segura com Verificação (`checked_add`/`checked_sub`)".to_string(),
            description: "Operações matemáticas utilizam métodos com verificação de overflow/underflow, prevenindo travamentos ou corrupção de saldo.".to_string(),
            line: None,
            code_snippet: Some("checked_add(1).ok_or(...)".to_string()),
            recommendation: "Mantenha o uso de checked_add e checked_sub em todas as mutações numéricas.".to_string(),
            fix_action: None,
        });
    } else if source_code.contains("+= 1") || source_code.contains("count +=") {
        issues.push(AuditIssue {
            id: "math-direct-addition-warning".to_string(),
            severity: Severity::Low,
            category: AuditCategory::MathOverflow.as_str().to_string(),
            title: "Adição Aritmética Direta (`counter.count += 1`)".to_string(),
            description: "A adição direta sem checked math pode causar panic ou estouro silencioso dependendo das flags do Cargo.toml.".to_string(),
            line: None,
            code_snippet: Some("counter.count += 1;".to_string()),
            recommendation: "Substitua por `counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;`.".to_string(),
            fix_action: Some(FixAction {
                label: "Usar checked_add".to_string(),
                patch_code: "counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;".to_string(),
            }),
        });
    }

    // =========================================================================
    // REGRA 5: Verificação Criptográfica de Assinatura (Signer)
    // =========================================================================
    if has_signer_struct {
        issues.push(AuditIssue {
            id: "signer-type-enforced".to_string(),
            severity: Severity::Pass,
            category: AuditCategory::SignerCheck.as_str().to_string(),
            title: "Validação Criptográfica de Assinatura (`Signer<'info>`)".to_string(),
            description: "O tipo `Signer<'info>` faz o runtime do Anchor e Solana garantirem a assinatura da transação pelo proprietário.".to_string(),
            line: None,
            code_snippet: Some("pub authority: Signer<'info>".to_string()),
            recommendation: "Nunca use `AccountInfo` genérico no lugar de `Signer` para contas com privilégios.".to_string(),
            fix_action: None,
        });
    }

    // =========================================================================
    // REGRA 6: Encerramento de Conta e Recuperação de Rent
    // =========================================================================
    if has_close_instruction {
        issues.push(AuditIssue {
            id: "close-account-present".to_string(),
            severity: Severity::Pass,
            category: AuditCategory::AccountClose.as_str().to_string(),
            title: "Instrução de Encerramento de Conta e Reembolso de SOL".to_string(),
            description: "O contrato implementa mecanismo para fechar a conta e devolver os lamports alocados de rent para a autoridade.".to_string(),
            line: None,
            code_snippet: Some("pub fn close(...)".to_string()),
            recommendation: "Sempre forneça uma forma segura para os usuários desalocarem contas obsoletas.".to_string(),
            fix_action: None,
        });
    } else {
        issues.push(AuditIssue {
            id: "close-account-missing".to_string(),
            severity: Severity::Info,
            category: AuditCategory::AccountClose.as_str().to_string(),
            title: "Sugestão: Adicionar Instrução de Encerramento de Conta (`close`)".to_string(),
            description: "Adicionar uma instrução com a restrição `close = authority` permite que o usuário recupere os ~0.0012 SOL alocados como aluguel quando não precisar mais do contador.".to_string(),
            line: None,
            code_snippet: None,
            recommendation: "Implemente `pub fn close` com a restrição `#[account(mut, close = authority)]`.".to_string(),
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
    let total_eval = issues.len();

    AuditReport {
        score: final_score,
        total_rules_evaluated: total_eval,
        passed_checks: passed_count,
        issues,
        is_production_ready: final_score >= 85,
    }
}
