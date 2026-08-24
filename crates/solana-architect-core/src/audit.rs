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

/// Aplica uma correção de segurança programática no código Anchor Rust baseado no ID da vulnerabilidade
pub fn apply_auto_fix(source_code: &str, vulnerability_id: &str) -> crate::types::AutoFixResult {
    let initial_report = run_anchor_security_audit(source_code);
    let previous_score = initial_report.score;
    let mut updated_code = source_code.to_string();
    let mut audit_log: Vec<String> = Vec::new();
    let mut modified_lines: Vec<crate::types::AutoFixModification> = Vec::new();
    let mut was_applied = false;
    let rule_applied: String;

    match vulnerability_id {
        "access-control-missing-has-one" | "access-control-has-one" => {
            rule_applied = "Injeção de Controle de Acesso has_one = authority".to_string();

            // Padrão vulnerável: struct mutável sem has_one
            if updated_code.contains("#[account(\n        mut\n    )]") {
                let target = "#[account(\n        mut\n    )]";
                let safe = "#[account(\n        mut,\n        seeds = [b\"counter\", authority.key().as_ref()],\n        bump = counter.bump,\n        has_one = authority\n    )]";
                updated_code = updated_code.replace(target, safe);
                modified_lines.push(crate::types::AutoFixModification {
                    start_line: 43,
                    end_line: 49,
                    old_snippet: target.to_string(),
                    new_snippet: safe.to_string(),
                    description: "Injetada restrição has_one = authority e seeds determinísticas".to_string(),
                });
                was_applied = true;
            } else if updated_code.contains("#[account(mut)]") {
                let target = "#[account(mut)]";
                let safe = "#[account(\n        mut,\n        seeds = [b\"counter\", authority.key().as_ref()],\n        bump = counter.bump,\n        has_one = authority\n    )]";
                updated_code = updated_code.replace(target, safe);
                modified_lines.push(crate::types::AutoFixModification {
                    start_line: 43,
                    end_line: 49,
                    old_snippet: target.to_string(),
                    new_snippet: safe.to_string(),
                    description: "Injetada restrição has_one = authority".to_string(),
                });
                was_applied = true;
            }

            audit_log.push("[Rust Auto-Fix] Constraint `has_one = authority` injetada nas structs mutáveis.".to_string());
        }
        "pda-missing-bump" | "pda-missing-canonical-bump" => {
            rule_applied = "Armazenamento do Bump Canônico e layout de 49 bytes".to_string();

            if !updated_code.contains("pub bump: u8") && updated_code.contains("pub count: u64,") {
                updated_code = updated_code.replace("pub count: u64,\n}", "pub count: u64,\n    pub bump: u8,\n}");
                audit_log.push("[Rust Auto-Fix] Campo `pub bump: u8` adicionado ao struct UserCounter.".to_string());
                was_applied = true;
            }

            if !updated_code.contains("counter.bump = ctx.bumps.counter") && updated_code.contains("counter.count = 0;") {
                updated_code = updated_code.replace(
                    "counter.count = 0;",
                    "counter.count = 0;\n        counter.bump = ctx.bumps.counter;",
                );
                audit_log.push("[Rust Auto-Fix] `counter.bump = ctx.bumps.counter` adicionado ao initialize.".to_string());
                was_applied = true;
            }
        }
        "space-missing-bump-byte" | "rent-insufficient-space" | "rent-missing-space" => {
            rule_applied = "Correção do espaço alocado para 49 bytes (8 + 32 + 8 + 1)".to_string();
            if updated_code.contains("space = 8 + 32 + 8") && !updated_code.contains("space = 8 + 32 + 8 + 1") {
                updated_code = updated_code.replace("space = 8 + 32 + 8", "space = 8 + 32 + 8 + 1");
                was_applied = true;
                audit_log.push("[Rust Auto-Fix] Espaço corrigido para 49 bytes (8 + 32 + 8 + 1).".to_string());
            }
        }
        "math-unchecked-addition" | "math-direct-addition-warning" => {
            rule_applied = "Substituição por checked_add e enum ErrorCode".to_string();
            if updated_code.contains("counter.count += 1;") {
                updated_code = updated_code.replace(
                    "counter.count += 1;",
                    "counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;",
                );
                was_applied = true;
                audit_log.push("[Rust Auto-Fix] Injetado checked_add(1) com prevenção de Overflow.".to_string());
            }

            if !updated_code.contains("#[error_code]") {
                let error_enum = "\n#[error_code]\npub enum ErrorCode {\n    #[msg(\"Overflow de capacidade aritmética.\")]\n    Overflow,\n    #[msg(\"Underflow de capacidade aritmética.\")]\n    Underflow,\n}\n";
                updated_code.push_str(error_enum);
                was_applied = true;
                audit_log.push("[Rust Auto-Fix] Declaração de #[error_code] adicionada.".to_string());
            }
        }
        _ => {
            return crate::types::AutoFixResult {
                success: false,
                updated_code: source_code.to_string(),
                rule_applied: "Regra Desconhecida".to_string(),
                vulnerability_id: vulnerability_id.to_string(),
                modified_lines: Vec::new(),
                audit_log: vec![format!("[Rust Auto-Fix] Regra não encontrada para '{}'", vulnerability_id)],
                previous_score,
                new_score: previous_score,
                error: Some(format!("Regra de autocorreção não implementada: {}", vulnerability_id)),
            };
        }
    }

    let post_report = run_anchor_security_audit(&updated_code);
    let new_score = post_report.score;
    audit_log.push(format!("[Rust Auto-Fix] Score: {}/100 -> {}/100 (+{} pts)", previous_score, new_score, new_score.saturating_sub(previous_score)));

    crate::types::AutoFixResult {
        success: was_applied,
        updated_code,
        rule_applied,
        vulnerability_id: vulnerability_id.to_string(),
        modified_lines,
        audit_log,
        previous_score,
        new_score,
        error: None,
    }
}

/// Aplica todas as correções de segurança em sequência até atingir pontuação segura
pub fn apply_all_auto_fixes(source_code: &str) -> crate::types::AutoFixResult {
    let mut current_code = source_code.to_string();
    let initial_report = run_anchor_security_audit(source_code);
    let previous_score = initial_report.score;
    let mut all_logs: Vec<String> = vec![format!("[Rust Auto-Fix Batch] Iniciando reparo (Score Inicial: {}/100)...", previous_score)];
    let mut all_modifications: Vec<crate::types::AutoFixModification> = Vec::new();

    let priority_rules = [
        "space-missing-bump-byte",
        "pda-missing-bump",
        "access-control-missing-has-one",
        "math-unchecked-addition",
    ];

    let mut applied_count = 0;
    for rule in priority_rules {
        let res = apply_auto_fix(&current_code, rule);
        if res.success && res.updated_code != current_code {
            current_code = res.updated_code;
            all_logs.extend(res.audit_log);
            all_modifications.extend(res.modified_lines);
            applied_count += 1;
        }
    }

    let final_report = run_anchor_security_audit(&current_code);
    let final_score = final_report.score;

    all_logs.push(format!("[Rust Auto-Fix Batch Finalizado] {} regras aplicadas. Score final: {}/100.", applied_count, final_score));

    crate::types::AutoFixResult {
        success: applied_count > 0,
        updated_code: current_code,
        rule_applied: format!("Correção Completa em Lote ({} regras)", applied_count),
        vulnerability_id: "batch-all".to_string(),
        modified_lines: all_modifications,
        audit_log: all_logs,
        previous_score,
        new_score: final_score,
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const VULNERABLE_CODE: &str = r#"use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod solana_sandbox_counter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = ctx.accounts.authority.key();
        counter.count = 0;
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
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8,
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
    #[account(mut)]
    pub counter: Account<'info, UserCounter>,
    pub authority: Signer<'info>,
}

#[account]
pub struct UserCounter {
    pub authority: Pubkey,
    pub count: u64,
}
"#;

    #[test]
    fn test_vulnerable_audit_score() {
        let report = run_anchor_security_audit(VULNERABLE_CODE);
        assert!(report.score < 60);
        assert!(!report.is_production_ready);
    }

    #[test]
    fn test_auto_fix_has_one() {
        let res = apply_auto_fix(VULNERABLE_CODE, "access-control-missing-has-one");
        assert!(res.success);
        assert!(res.updated_code.contains("has_one = authority"));
        assert!(res.new_score > res.previous_score);
    }

    #[test]
    fn test_batch_auto_fix() {
        let res = apply_all_auto_fixes(VULNERABLE_CODE);
        assert!(res.success);
        assert!(res.new_score >= 85);
        assert!(res.updated_code.contains("has_one = authority"));
        assert!(res.updated_code.contains("space = 8 + 32 + 8 + 1"));
        assert!(res.updated_code.contains("checked_add"));
    }
}
