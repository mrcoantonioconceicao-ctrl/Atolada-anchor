import { AuditIssue, AuditReport, AutoFixResult, AutoFixModification } from '../types/solana';
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
 * antes de executar a análise AST e a auditoria de segurança.
 * Equivalente a `validate_rust_anchor_syntax` no crate Rust `solana-architect-core`.
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

/**
 * Utilitário para mapear índices de caracteres para números de linha (1-indexed)
 */
function getLineFromIndex(source: string, index: number): number {
  return source.substring(0, Math.max(0, index)).split('\n').length;
}

/**
 * ============================================================================
 * MOTOR DE CORREÇÃO AUTOMÁTICA (AUTO-FIX ENGINE)
 * ============================================================================
 *
 * Mapeia e injeta programaticamente correções de segurança no código Anchor Rust
 * garantindo alinhamento de 49 bytes, integridade sintática e preservação de AST.
 */

/**
 * Aplica uma correção de segurança específica com base no ID da vulnerabilidade.
 *
 * @param sourceCode Código-fonte Rust/Anchor original
 * @param vulnerabilityId Identificador da vulnerabilidade (ex: 'access-control-missing-has-one')
 * @returns AutoFixResult com o código refatorado, logs de auditoria e variação de score
 */
export function applyAutoFix(sourceCode: string, vulnerabilityId: string): AutoFixResult {
  const initialAudit = runAnchorSecurityAudit(sourceCode);
  const previousScore = initialAudit.score;
  const auditLogs: string[] = [];
  const modifiedLines: AutoFixModification[] = [];

  let updatedCode = sourceCode;
  let ruleApplied = '';
  let wasApplied = false;

  switch (vulnerabilityId) {
    // ------------------------------------------------------------------------
    // REGRA 1: Injeção de Controle de Acesso (`has_one = authority`)
    // ------------------------------------------------------------------------
    case 'access-control-missing-has-one':
    case 'access-control-has-one': {
      ruleApplied = 'Injeção de Restrição has_one = authority e Validação de Seeds PDA';

      // 1. Procura structs mutáveis como Increment, Decrement, Reset que faltam has_one
      // Padrão 1: #[account(mut)] pub counter: Account<'info, UserCounter>
      const vulnerableAttrRegex = /#\[account\(\s*mut\s*(?:,\s*seeds\s*=\s*\[[^\]]+\])?(?:\s*,\s*bump(?:\s*=\s*[^,)]+)?)?\s*\)\]\s*\n\s*pub counter:\s*Account<'info,\s*UserCounter>/g;

      // Padrão 2: #[account(\n mut\n ... )] pub counter: Account<'info, UserCounter>
      const genericAccountBlockRegex = /#\[account\(([\s\S]*?)\)\]\s*\n(\s*)pub counter:\s*Account<'info,\s*UserCounter>/g;

      if (genericAccountBlockRegex.test(updatedCode)) {
        updatedCode = updatedCode.replace(
          genericAccountBlockRegex,
          (match, innerAttributes: string, indentation: string, offset: number) => {
            if (innerAttributes.includes('init')) {
              // Não modificar struct de Initialize
              return match;
            }

            const startLine = getLineFromIndex(sourceCode, offset);
            const endLine = startLine + match.split('\n').length - 1;

            const safeConstraint = `#[account(
${indentation}    mut,
${indentation}    seeds = [b"counter", authority.key().as_ref()],
${indentation}    bump = counter.bump,
${indentation}    has_one = authority
${indentation})]
${indentation}pub counter: Account<'info, UserCounter>`;

            modifiedLines.push({
              startLine,
              endLine,
              oldSnippet: match,
              newSnippet: safeConstraint,
              description: 'Injetado has_one = authority, seeds determinísticas e bump = counter.bump.',
            });

            wasApplied = true;
            return safeConstraint;
          }
        );
      }

      auditLogs.push('[Auto-Fix] Injetada restrição `has_one = authority` em todas as structs mutáveis.');
      auditLogs.push('[Auto-Fix] Vinculado o proprietário da conta PDA ao signatário `authority: Signer<\'info\'>`.');
      break;
    }

    // ------------------------------------------------------------------------
    // REGRA 2: Armazenamento e Revalidação de Bump Canônico
    // ------------------------------------------------------------------------
    case 'pda-missing-bump':
    case 'pda-canonical-bump': {
      ruleApplied = 'Armazenamento do Bump Canônico no Initialize e no Struct UserCounter';

      // 1. Garante que `pub bump: u8` exista na struct UserCounter
      if (!updatedCode.includes('pub bump: u8')) {
        const userCounterStructRegex = /(pub struct UserCounter\s*\{[\s\S]*?pub count:\s*u64,?\s*\n)(\s*)(\})/;
        if (userCounterStructRegex.test(updatedCode)) {
          const match = updatedCode.match(userCounterStructRegex);
          if (match && match.index !== undefined) {
            const startLine = getLineFromIndex(updatedCode, match.index);
            updatedCode = updatedCode.replace(
              userCounterStructRegex,
              `$1$2    pub bump: u8,\n$2$3`
            );
            modifiedLines.push({
              startLine,
              endLine: startLine + 3,
              oldSnippet: match[0],
              newSnippet: `pub struct UserCounter {\n    pub authority: Pubkey,\n    pub count: u64,\n    pub bump: u8,\n}`,
              description: 'Adicionado campo `pub bump: u8` na struct `UserCounter` (49 bytes alinhados).',
            });
            wasApplied = true;
          }
        }
      }

      // 2. Insere `counter.bump = ctx.bumps.counter;` no handler da função initialize
      if (!updatedCode.includes('counter.bump = ctx.bumps.counter') && updatedCode.includes('fn initialize')) {
        const initFnRegex = /(pub fn initialize\s*\([^)]*\)\s*->\s*Result<\(\)>\s*\{[\s\S]*?counter\.count\s*=\s*0;\s*\n)(\s*)([\s\S]*?Ok\(\(\))/;
        if (initFnRegex.test(updatedCode)) {
          const match = updatedCode.match(initFnRegex);
          if (match && match.index !== undefined) {
            const startLine = getLineFromIndex(updatedCode, match.index);
            updatedCode = updatedCode.replace(
              initFnRegex,
              `$1$2counter.bump = ctx.bumps.counter;\n$2$3`
            );
            modifiedLines.push({
              startLine,
              endLine: startLine + 4,
              oldSnippet: 'counter.count = 0;\n        Ok(())',
              newSnippet: 'counter.count = 0;\n        counter.bump = ctx.bumps.counter;\n        Ok(())',
              description: 'Persistência do bump canônico derivada pelo Anchor durante a inicialização.',
            });
            wasApplied = true;
          }
        }
      }

      auditLogs.push('[Auto-Fix] Campo `pub bump: u8` inserido no layout de memória da struct UserCounter.');
      auditLogs.push('[Auto-Fix] Persistência do bump canônico `counter.bump = ctx.bumps.counter` adicionada ao `initialize`.');
      break;
    }

    // ------------------------------------------------------------------------
    // REGRA 3: Correção de Espaço de Alocação (49 Bytes Exatos)
    // ------------------------------------------------------------------------
    case 'space-missing-bump-byte':
    case 'space-unconstrained':
    case 'rent-insufficient-space': {
      ruleApplied = 'Correção de Alocação de Espaço em Disco para 49 Bytes (8 + 32 + 8 + 1)';

      const spaceRegex = /space\s*=\s*8\s*\+\s*32\s*\+\s*8(?!\s*\+\s*1)/;
      const genericSpaceRegex = /space\s*=\s*[^,\n]+/;

      if (spaceRegex.test(updatedCode)) {
        const match = updatedCode.match(spaceRegex);
        if (match && match.index !== undefined) {
          const startLine = getLineFromIndex(updatedCode, match.index);
          updatedCode = updatedCode.replace(spaceRegex, 'space = 8 + 32 + 8 + 1');
          modifiedLines.push({
            startLine,
            endLine: startLine,
            oldSnippet: match[0],
            newSnippet: 'space = 8 + 32 + 8 + 1',
            description: 'Ajustado cálculo de espaço para incluir 1 byte do bump (Total: 49 bytes).',
          });
          wasApplied = true;
        }
      } else if (genericSpaceRegex.test(updatedCode)) {
        const match = updatedCode.match(genericSpaceRegex);
        if (match && match.index !== undefined) {
          const startLine = getLineFromIndex(updatedCode, match.index);
          updatedCode = updatedCode.replace(genericSpaceRegex, 'space = 8 + 32 + 8 + 1');
          modifiedLines.push({
            startLine,
            endLine: startLine,
            oldSnippet: match[0],
            newSnippet: 'space = 8 + 32 + 8 + 1',
            description: 'Redefinido espaço para o padrão 49 bytes rent-exempt.',
          });
          wasApplied = true;
        }
      }

      auditLogs.push('[Auto-Fix] Parâmetro `space` corrigido para `8 + 32 + 8 + 1` (49 bytes).');
      break;
    }

    // ------------------------------------------------------------------------
    // REGRA 4: Aritmética Segura (checked_add e checked_sub com ErrorCode)
    // ------------------------------------------------------------------------
    case 'math-unchecked-addition':
    case 'math-direct-addition-warning': {
      ruleApplied = 'Substituição de Aritmética Direta por checked_add e ErrorCode Seguro';

      // 1. Substitui `counter.count += 1;` por checked_add
      if (updatedCode.includes('counter.count += 1;')) {
        const index = updatedCode.indexOf('counter.count += 1;');
        const startLine = getLineFromIndex(updatedCode, index);
        updatedCode = updatedCode.replace(
          'counter.count += 1;',
          'counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;'
        );
        modifiedLines.push({
          startLine,
          endLine: startLine,
          oldSnippet: 'counter.count += 1;',
          newSnippet: 'counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;',
          description: 'Substituído operador += desprotegido pelo método seguro checked_add com tratamento de erro.',
        });
        wasApplied = true;
      }

      // 2. Se houver `counter.count -= 1;`, substitui por checked_sub
      if (updatedCode.includes('counter.count -= 1;')) {
        const index = updatedCode.indexOf('counter.count -= 1;');
        const startLine = getLineFromIndex(updatedCode, index);
        updatedCode = updatedCode.replace(
          'counter.count -= 1;',
          'counter.count = counter.count.checked_sub(1).ok_or(ErrorCode::Underflow)?;'
        );
        modifiedLines.push({
          startLine,
          endLine: startLine,
          oldSnippet: 'counter.count -= 1;',
          newSnippet: 'counter.count = counter.count.checked_sub(1).ok_or(ErrorCode::Underflow)?;',
          description: 'Substituído operador -= desprotegido pelo método seguro checked_sub com prevenção de underflow.',
        });
        wasApplied = true;
      }

      // 3. Adiciona a declaração do enum `ErrorCode` se ainda não existir
      if (!updatedCode.includes('#[error_code]') && !updatedCode.includes('pub enum ErrorCode')) {
        const errorCodeSnippet = `\n#[error_code]
pub enum ErrorCode {
    #[msg("Ocorreu estouro de capacidade aritmética (Overflow).")]
    Overflow,
    #[msg("Ocorreu subfluxo de capacidade aritmética (Underflow).")]
    Underflow,
}
`;
        updatedCode += errorCodeSnippet;
        const totalLines = updatedCode.split('\n').length;
        modifiedLines.push({
          startLine: totalLines - 8,
          endLine: totalLines,
          oldSnippet: '',
          newSnippet: errorCodeSnippet.trim(),
          description: 'Inserido enum `ErrorCode` com mensagens de erro canônicas do Anchor.',
        });
        wasApplied = true;
      }

      auditLogs.push('[Auto-Fix] Injetado `checked_add(1).ok_or(ErrorCode::Overflow)?` com proteção contra estouro de inteiros.');
      auditLogs.push('[Auto-Fix] Declaração de `#[error_code]` enum adicionada ao final do arquivo.');
      break;
    }

    // ------------------------------------------------------------------------
    // REGRA 5: Instrução de Encerramento e Reembolso de Rent (close)
    // ------------------------------------------------------------------------
    case 'close-account-missing': {
      ruleApplied = 'Implementação da Instrução close com Restrição close = authority';

      // 1. Insere o handler `pub fn close` dentro do módulo #[program]
      const programModRegex = /(pub mod \w+\s*\{[\s\S]*?)(\n\}\n)/;
      if (programModRegex.test(updatedCode) && !updatedCode.includes('pub fn close')) {
        const closeHandler = `
    pub fn close(_ctx: Context<CloseAccount>) -> Result<()> {
        msg!("Conta de contador encerrada com sucesso. Rent devolvido.");
        Ok(())
    }`;
        updatedCode = updatedCode.replace(programModRegex, `$1${closeHandler}$2`);
        wasApplied = true;
      }

      // 2. Insere a struct `CloseAccount` antes de `UserCounter`
      const userCounterDefRegex = /(#\[account\]\s*\npub struct UserCounter)/;
      if (userCounterDefRegex.test(updatedCode) && !updatedCode.includes('pub struct CloseAccount')) {
        const closeStruct = `#[derive(Accounts)]
pub struct CloseAccount<'info> {
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump,
        has_one = authority,
        close = authority
    )]
    pub counter: Account<'info, UserCounter>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

`;
        updatedCode = updatedCode.replace(userCounterDefRegex, `${closeStruct}$1`);
        wasApplied = true;
      }

      auditLogs.push('[Auto-Fix] Adicionada instrução `close` e struct `CloseAccount` com `close = authority`.');
      break;
    }

    default: {
      return {
        success: false,
        updatedCode: sourceCode,
        ruleApplied: 'Regra Desconhecida',
        vulnerabilityId,
        modifiedLines: [],
        auditLog: [`[Auto-Fix Erro] Nenhuma estratégia de autocorreção registrada para '${vulnerabilityId}'.`],
        previousScore,
        newScore: previousScore,
        error: `Regra de autocorreção não implementada para o ID: ${vulnerabilityId}`,
      };
    }
  }

  // Avalia o novo relatório e pontuação após o patch
  const postAudit = runAnchorSecurityAudit(updatedCode);
  const newScore = postAudit.score;

  auditLogs.push(`[Auto-Fix Concluído] Score anterior: ${previousScore}/100 ➔ Novo Score: ${newScore}/100 (Ganho: +${newScore - previousScore} pts).`);

  return {
    success: wasApplied,
    updatedCode,
    ruleApplied,
    vulnerabilityId,
    modifiedLines,
    auditLog: auditLogs,
    previousScore,
    newScore,
  };
}

/**
 * Executa uma rodada completa de correção em lote (Batch Auto-Fix), aplicando
 * sequencialmente todas as correções necessárias até que o contrato atinja pontuação máxima.
 *
 * @param sourceCode Código original
 * @returns AutoFixResult consolidado com todas as modificações e logs
 */
export function applyAllAutoFixes(sourceCode: string): AutoFixResult {
  let currentCode = sourceCode;
  const initialAudit = runAnchorSecurityAudit(sourceCode);
  const previousScore = initialAudit.score;
  const allLogs: string[] = [`[Auto-Fix Batch] Iniciando reparo automático de todas as vulnerabilidades (Score Inicial: ${previousScore}/100)...`];
  const allModifications: AutoFixModification[] = [];

  // Ordem prioritária de correções de segurança
  const priorityVulnerabilities = [
    'space-missing-bump-byte',
    'space-unconstrained',
    'pda-missing-bump',
    'access-control-missing-has-one',
    'math-unchecked-addition',
    'close-account-missing',
  ];

  let appliedCount = 0;

  for (const vulnId of priorityVulnerabilities) {
    const singleFix = applyAutoFix(currentCode, vulnId);
    if (singleFix.success && singleFix.updatedCode !== currentCode) {
      currentCode = singleFix.updatedCode;
      allLogs.push(...singleFix.auditLog);
      allModifications.push(...singleFix.modifiedLines);
      appliedCount++;
    }
  }

  const finalAudit = runAnchorSecurityAudit(currentCode);
  const finalScore = finalAudit.score;

  const isProductionReady = finalScore >= 85;

  allLogs.push(
    `[Auto-Fix Batch Finalizado] ${appliedCount} regra(s) aplicadas. Score final: ${finalScore}/100 (${
      isProductionReady ? '✅ Aprovado para Produção' : '⚠️ Requer Revisão Manual'
    }).`
  );

  return {
    success: appliedCount > 0,
    updatedCode: currentCode,
    ruleApplied: `Correção Completa em Lote (${appliedCount} vulnerabilidades sanadas)`,
    vulnerabilityId: 'batch-all-vulnerabilities',
    modifiedLines: allModifications,
    auditLog: allLogs,
    previousScore,
    newScore: finalScore,
  };
}

// Re-exporta utilitários principais
export { runAnchorSecurityAudit };
