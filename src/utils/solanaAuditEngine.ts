import { AuditIssue, AuditReport } from '../types/solana';
import { runAnchorSecurityAudit } from './solanaUtils';

/**
 * Interface para o resultado da validação sintática pré-auditoria (Rust Anchor AST).
 */
export interface SyntaxValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida a sintaxe básica de um contrato Rust escrito para o framework Anchor
 * antes de executar a análise AST e a auditoria de segurança pesada.
 * Equivalente a `validate_rust_anchor_syntax` no crate Rust `solana-architect-core`.
 *
 * @param code Código-fonte em Rust/Anchor
 * @returns { isValid: boolean, error?: string }
 */
export function validateRustSyntax(code: string): SyntaxValidationResult {
  if (!code || code.trim().length === 0) {
    return {
      isValid: false,
      error: 'O código do contrato está vazio. Forneça o código Rust para analisar.',
    };
  }

  // 1. Verifica a presença do import essencial do prelude do Anchor
  const normalizedCode = code.replace(/\s+/g, ' ');
  if (!code.includes('use anchor_lang::prelude::*;') && !normalizedCode.includes('use anchor_lang::prelude::*;')) {
    return {
      isValid: false,
      error: "Importação essencial 'use anchor_lang::prelude::*;' não encontrada no topo do contrato.",
    };
  }

  // 2. Verifica a declaração do ID do programa
  if (!code.includes('declare_id!')) {
    return {
      isValid: false,
      error: "Macro obrigatória 'declare_id!(...)' não encontrada. Todo contrato Anchor exige a declaração do ID de programa.",
    };
  }

  // 3. Contagem e verificação de chaves balanceadas ({ e })
  let openBraces = 0;
  let closeBraces = 0;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    if (char === '{') {
      openBraces++;
    } else if (char === '}') {
      closeBraces++;
    }
  }

  if (openBraces !== closeBraces) {
    return {
      isValid: false,
      error: `Desbalanceamento de chaves ({ e }) detectado. O código possui ${openBraces} chave(s) de abertura '{' e ${closeBraces} de fechamento '}'.`,
    };
  }

  return { isValid: true };
}

// Re-exporta a função principal de auditoria estática para manter o módulo unificado
export { runAnchorSecurityAudit };
