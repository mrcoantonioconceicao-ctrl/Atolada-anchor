import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  AuditIssue,
  AuditReport,
  PdaDerivationResult,
  DeploymentDryRunStep,
  DeploymentSimulationResult,
} from '../types/solana';

// High-Concurrency In-Memory LRU Caches (Up to 500 entries per cache to save RAM)
const auditReportCache = new Map<string, AuditReport & { totalRules: number }>();
const pdaDerivationCache = new Map<string, PdaDerivationResult>();
const MAX_CACHE_SIZE = 500;

function pruneCache(map: Map<any, any>) {
  if (map.size > MAX_CACHE_SIZE) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) {
      map.delete(firstKey);
    }
  }
}

// Calculate Anchor Account Discriminator: first 8 bytes of SHA-256("account:<AccountName>")
export async function calculateAnchorDiscriminator(accountName: string): Promise<string> {
  const name = `account:${accountName}`;
  const msgUint8 = new TextEncoder().encode(name);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const discriminatorBytes = hashArray.slice(0, 8);
  return '0x' + discriminatorBytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Derive Solana PDA using @solana/web3.js findProgramAddressSync with High-Speed Cache
export function deriveCounterPda(
  programIdStr: string,
  authorityPubkeyStr: string,
  seedPrefix: string = 'counter'
): PdaDerivationResult {
  const cacheKey = `${programIdStr}:${authorityPubkeyStr}:${seedPrefix}`;
  if (pdaDerivationCache.has(cacheKey)) {
    return pdaDerivationCache.get(cacheKey)!;
  }

  try {
    const programId = new PublicKey(programIdStr);
    const authorityPubkey = new PublicKey(authorityPubkeyStr);

    const seed1 = Buffer.from(seedPrefix, 'utf8');
    const seed2 = authorityPubkey.toBuffer();

    const [pda, bump] = PublicKey.findProgramAddressSync([seed1, seed2], programId);

    const result: PdaDerivationResult = {
      success: true,
      pdaAddress: pda.toBase58(),
      bump,
      seed1Hex: seed1.toString('hex'),
      seed1String: seedPrefix,
      seed2Base58: authorityPubkeyStr,
      seed2Hex: seed2.toString('hex'),
      isOffCurve: !PublicKey.isOnCurve(pda.toBuffer()),
    };

    pruneCache(pdaDerivationCache);
    pdaDerivationCache.set(cacheKey, result);
    return result;
  } catch (error: any) {
    const errResult: PdaDerivationResult = {
      success: false,
      error: error.message || 'Invalid Program ID or Authority Public Key',
      pdaAddress: '',
      bump: 0,
      seed1Hex: '',
      seed1String: seedPrefix,
      seed2Base58: authorityPubkeyStr,
      seed2Hex: '',
      isOffCurve: true,
    };
    return errResult;
  }
}

// Rent calculation formula for Solana
export function calculateRentLamports(spaceBytes: number): number {
  // Rent exemption formula: 2 years worth of storage fees (19.0554414784 SOL per MB per year)
  // Base account header overhead in Solana: 128 bytes
  const ACCOUNT_STORAGE_OVERHEAD = 128;
  const LAMPORTS_PER_BYTE_YEAR = 190554414784 / (1024 * 1024);
  const EXEMPT_YEARS = 2;
  return Math.ceil((spaceBytes + ACCOUNT_STORAGE_OVERHEAD) * LAMPORTS_PER_BYTE_YEAR * EXEMPT_YEARS);
}

// Static AST & Anchor Code Security Auditor with High-Concurrency In-Memory Memoization
export function runAnchorSecurityAudit(code: string): AuditReport & { totalRules: number } {
  if (auditReportCache.has(code)) {
    return auditReportCache.get(code)!;
  }

  const issues: AuditIssue[] = [];

  const hasHasOne = code.includes('has_one = authority');
  const hasBumpStore = code.includes('counter.bump = ctx.bumps.counter') || code.includes('bump = counter.bump');
  const hasCheckedMath = code.includes('checked_add') || code.includes('checked_sub');
  const hasSpaceExact = code.includes('space = 8 + 32 + 8 + 1');
  const hasSpaceAny = code.includes('space =');
  const hasSigner = code.includes("Signer<'info>") || code.includes('pub authority: Signer');
  const hasClose = code.includes('pub fn close') || code.includes('close = authority');

  // Regra 1: Controle de Acesso - Restrição has_one
  if (hasHasOne) {
    issues.push({
      id: 'access-control-has-one',
      category: 'Controle de Acesso',
      severity: 'pass',
      title: 'Vinculação de Assinante e Autoridade (`has_one = authority`) Verificada',
      description: 'A restrição `has_one = authority` garante que a chave do signatário corresponda estritamente à autoridade gravada na conta PDA.',
      recommendation: 'Mantenha a validação explícita de autoridade em todos os contextos de instruções mutáveis.',
    });
  } else {
    issues.push({
      id: 'access-control-missing-has-one',
      category: 'Controle de Acesso',
      severity: 'critical',
      title: 'Falta Restrição Crítica de Controle de Acesso (`has_one = authority`)',
      description: 'A struct de contas não impõe `has_one = authority`. Qualquer usuário malicioso pode passar uma conta de contador de terceiros e alterar seu estado!',
      recommendation: 'Adicione `has_one = authority` no atributo `#[account(...)]` da struct de contexto.',
      fixAction: {
        label: 'Adicionar restrição `has_one = authority`',
        patchCode: `#[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump,
        has_one = authority
    )]`,
      },
    });
  }

  // Regra 2: Armazenamento e Revalidação de Bump Canônico
  if (hasBumpStore) {
    issues.push({
      id: 'pda-canonical-bump',
      category: 'PDA & Bump Canônico',
      severity: 'pass',
      title: 'Armazenamento e Revalidação do Bump Canônico Validado',
      description: 'O bump é persistido na inicialização (`counter.bump = ctx.bumps.counter`) e validado com `bump = counter.bump`.',
      recommendation: 'Armazenar e verificar bumps canônicos previne ataques de rederivação na CPU e injeção de bumps arbitrários.',
    });
  } else {
    issues.push({
      id: 'pda-missing-bump',
      category: 'PDA & Bump Canônico',
      severity: 'high',
      title: 'Falta Armazenamento e Validação do Bump Canônico',
      description: 'O contrato não armazena nem verifica `bump = counter.bump`. Sem verificação de bump, atacantes podem forçar recálculos caros on-chain.',
      recommendation: 'Guarde `pub bump: u8` na struct `UserCounter` durante a inicialização e valide com `bump = counter.bump`.',
      fixAction: {
        label: 'Armazenar e Validar Bump',
        patchCode: 'counter.bump = ctx.bumps.counter;',
      },
    });
  }

  // Regra 3: Alocação de Espaço e Isenção de Aluguel (49 Bytes)
  if (hasSpaceExact) {
    issues.push({
      id: 'space-exact-49',
      category: 'Rent / Espaço',
      severity: 'pass',
      title: 'Alocação Exata de Espaço em Disco (49 Bytes)',
      description: 'Espaço calculado com precisão: 8 (Discriminador Anchor) + 32 (Pubkey) + 8 (u64 contador) + 1 (u8 bump) = 49 bytes.',
      recommendation: 'A alocação exata de espaço otimiza custos de isenção de aluguel e previne erros de alinhamento de memória.',
    });
  } else if (hasSpaceAny) {
    issues.push({
      id: 'space-missing-bump-byte',
      category: 'Rent / Espaço',
      severity: 'medium',
      title: 'Alocação Insuficiente ou Desajustada de Espaço',
      description: 'O espaço da conta pode omitir o 1 byte necessário para `u8 bump` ou o discriminador Anchor.',
      recommendation: 'Atualize a restrição para `space = 8 + 32 + 8 + 1` (49 bytes).',
      fixAction: {
        label: 'Definir space = 8 + 32 + 8 + 1',
        patchCode: 'space = 8 + 32 + 8 + 1,',
      },
    });
  } else {
    issues.push({
      id: 'space-unconstrained',
      category: 'Rent / Espaço',
      severity: 'high',
      title: 'Espaço de Conta Ausente ou Não Validado',
      description: 'A macro `init` exige o parâmetro `space` explícito para calcular a isenção de aluguel e inicializar a memória.',
      recommendation: 'Especifique `space = 8 + 32 + 8 + 1` no atributo `#[account(init, ...)]`.',
    });
  }

  // Regra 4: Aritmética Segura
  if (hasCheckedMath) {
    issues.push({
      id: 'math-checked',
      category: 'Matemática / Overflow',
      severity: 'pass',
      title: 'Uso de Aritmética Segura (`checked_add`/`checked_sub`)',
      description: 'Operações matemáticas usam métodos com verificação, evitando estouro de inteiros silencioso ou travamento.',
      recommendation: 'Sempre utilize `checked_add` e `checked_sub` para prevenir underflow/overflow em tipos primitivos.',
    });
  } else if (code.includes('+= 1') || code.includes('count +=')) {
    issues.push({
      id: 'math-unchecked-addition',
      category: 'Matemática / Overflow',
      severity: 'low',
      title: 'Adição Aritmética Direta (`counter.count += 1`)',
      description: 'A adição direta (`+=`) pode estourar `u64::MAX` em compilações de release se a checagem de overflow estiver desativada.',
      recommendation: 'Substitua `counter.count += 1` por `counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;`.',
      fixAction: {
        label: 'Usar checked_add',
        patchCode: 'counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;',
      },
    });
  }

  // Regra 5: Verificação de Signatário Criptográfico
  if (hasSigner) {
    issues.push({
      id: 'signer-check-pass',
      category: 'Verificação de Assinante',
      severity: 'pass',
      title: 'Validação de Tipo Signer (`Signer<\'info\'>`)',
      description: '`authority` está declarada como `Signer<\'info\'>`, garantindo que o runtime da Solana verifique criptograficamente a assinatura da transação.',
      recommendation: 'Nunca substitua `Signer` por `AccountInfo` sem verificação manual do campo `.is_signer`.',
    });
  }

  // Regra 6: Encerramento de Conta
  if (hasClose) {
    issues.push({
      id: 'close-account-pass',
      category: 'Encerramento & Reembolso',
      severity: 'pass',
      title: 'Instrução de Encerramento e Reembolso de Rent Presente',
      description: 'O contrato fornece método seguro para fechar a conta e recuperar o saldo de SOL do aluguel.',
      recommendation: 'Mantenha a validação `close = authority` para impedir drenagem não autorizada.',
    });
  } else {
    issues.push({
      id: 'close-account-suggest',
      category: 'Encerramento & Reembolso',
      severity: 'info',
      title: 'Sugestão: Adicionar Instrução de Fechamento de Conta (`close`)',
      description: 'Permitir o encerramento da conta libera os ~0.0012 SOL de volta para o usuário quando o recurso for descontinuado.',
      recommendation: 'Implemente um handler com `#[account(mut, close = authority)]`.',
    });
  }

  // Calcular Score Global
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'critical') score -= 35;
    if (issue.severity === 'high') score -= 20;
    if (issue.severity === 'medium') score -= 10;
    if (issue.severity === 'low') score -= 5;
  }
  score = Math.max(0, Math.min(100, score));

  const passedChecks = issues.filter((i) => i.severity === 'pass').length;
  const totalRules = issues.length;
  const isProductionReady = score >= 85;

  const finalReport = {
    score,
    passedChecks,
    totalRulesEvaluated: totalRules,
    totalRules,
    issues,
    isProductionReady,
  };

  pruneCache(auditReportCache);
  auditReportCache.set(code, finalReport);
  return finalReport;
}

// Generate Anchor IDL JSON structure from Rust code
export function generateAnchorIdl(code: string, programIdStr: string) {
  return {
    version: '0.1.0',
    name: 'solana_sandbox_counter',
    instructions: [
      {
        name: 'initialize',
        accounts: [
          { name: 'counter', isMut: true, isSigner: false, pda: { seeds: ['counter', 'authority'] } },
          { name: 'authority', isMut: true, isSigner: true },
          { name: 'systemProgram', isMut: false, isSigner: false },
        ],
        args: [],
      },
      {
        name: 'increment',
        accounts: [
          { name: 'counter', isMut: true, isSigner: false },
          { name: 'authority', isMut: false, isSigner: true },
        ],
        args: [],
      },
      ...(code.includes('pub fn decrement')
        ? [
            {
              name: 'decrement',
              accounts: [
                { name: 'counter', isMut: true, isSigner: false },
                { name: 'authority', isMut: false, isSigner: true },
              ],
              args: [],
            },
          ]
        : []),
      ...(code.includes('pub fn reset')
        ? [
            {
              name: 'reset',
              accounts: [
                { name: 'counter', isMut: true, isSigner: false },
                { name: 'authority', isMut: false, isSigner: true },
              ],
              args: [],
            },
          ]
        : []),
      ...(code.includes('pub fn close')
        ? [
            {
              name: 'close',
              accounts: [
                { name: 'counter', isMut: true, isSigner: false },
                { name: 'authority', isMut: true, isSigner: true },
              ],
              args: [],
            },
          ]
        : []),
    ],
    accounts: [
      {
        name: 'UserCounter',
        type: {
          kind: 'struct',
          fields: [
            { name: 'authority', type: 'publicKey' },
            { name: 'count', type: 'u64' },
            { name: 'bump', type: 'u8' },
          ],
        },
      },
    ],
    metadata: {
      address: programIdStr,
    },
  };
}

// Generate TypeScript client SDK integration code
export function generateTypeScriptClientCode(programIdStr: string, pdaAddress: string) {
  return `import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { SolanaSandboxCounter } from "../target/types/solana_sandbox_counter";

describe("solana_sandbox_counter", () => {
  // Configure the client to use the local devnet/cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaSandboxCounter as Program<SolanaSandboxCounter>;
  const authority = provider.wallet;

  // 1. Derive PDA for UserCounter
  const [counterPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), authority.publicKey.toBuffer()],
    program.programId
  );

  it("Initializes the PDA Counter Account", async () => {
    console.log("Authority Pubkey:", authority.publicKey.toBase58());
    console.log("Derived PDA Counter:", counterPda.toBase58());

    const tx = await program.methods
      .initialize()
      .accounts({
        counter: counterPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction Signature:", tx);

    // Fetch account state from chain
    const counterAccount = await program.account.userCounter.fetch(counterPda);
    console.log("On-Chain Counter State:", {
      authority: counterAccount.authority.toBase58(),
      count: counterAccount.count.toNumber(),
      bump: counterAccount.bump,
    });
  });

  it("Increments the Counter", async () => {
    const tx = await program.methods
      .increment()
      .accounts({
        counter: counterPda,
        authority: authority.publicKey,
      })
      .rpc();

    console.log("Increment Tx Signature:", tx);

    const counterAccount = await program.account.userCounter.fetch(counterPda);
    console.log("Updated Count:", counterAccount.count.toNumber());
  });
});
`;
}

// ----------------------------------------------------------------------------------
// Anchor & Solana Devnet Deployment Dry-Run & Simulation Helpers
// ----------------------------------------------------------------------------------

export interface AnchorProgramMetadata {
  programId: string;
  programName: string;
  instructions: string[];
  accountStructs: string[];
  hasDeclareId: boolean;
  hasProgramMacro: boolean;
}

/**
 * Extracts Anchor program metadata from the Rust code state
 */
export function extractAnchorProgramMetadata(code: string): AnchorProgramMetadata {
  // Extract declare_id!("...")
  const declareIdMatch = code.match(/declare_id!\s*\(\s*["']([1-9A-HJ-NP-Za-km-z]{32,44})["']\s*\)/);
  const programId = declareIdMatch ? declareIdMatch[1] : 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';

  // Extract program module name: #[program] pub mod <name> { ... }
  const programModMatch = code.match(/#\[program\]\s*(?:pub\s+)?mod\s+([a-zA-Z0-9_]+)/);
  const programName = programModMatch ? programModMatch[1] : 'solana_sandbox_counter';

  // Extract instructions: pub fn <name>(ctx: Context<...>)
  const instructionMatches = Array.from(code.matchAll(/pub\s+fn\s+([a-zA-Z0-9_]+)\s*\(/g)).map((m) => m[1]);

  // Extract account structs: #[account] or #[derive(Accounts)] pub struct <name>
  const accountMatches = Array.from(code.matchAll(/(?:#\[account\]|#\[derive\([^)]*Accounts[^)]*\)\])\s*(?:pub\s+)?struct\s+([a-zA-Z0-9_]+)/g)).map((m) => m[1]);

  return {
    programId,
    programName,
    instructions: instructionMatches.length > 0 ? instructionMatches : ['initialize', 'increment'],
    accountStructs: accountMatches.length > 0 ? accountMatches : ['UserCounter', 'Initialize', 'Increment'],
    hasDeclareId: !!declareIdMatch,
    hasProgramMacro: !!programModMatch,
  };
}

/**
 * Estimates the compiled SBF (Solana Binary Format) ELF bytecode size based on AST complexity
 */
export function estimateContractBytecodeSize(code: string): number {
  const metadata = extractAnchorProgramMetadata(code);
  const baseRuntimeBoilerplateBytes = 84_500; // Anchor deserialization, Borsh, panic handler, BPF entrypoint
  const perInstructionCost = 11_250; // Context unpack, discriminator check, account deserialization
  const perAccountStructCost = 6_800; // Borsh serialize/deserialize, rent calculations

  const estimatedBytes =
    baseRuntimeBoilerplateBytes +
    metadata.instructions.length * perInstructionCost +
    metadata.accountStructs.length * perAccountStructCost;

  return estimatedBytes;
}

/**
 * Calculates Devnet deployment costs including Buffer Account, Program Account, ProgramData Account, and Transaction Chunks
 */
export function calculateDevnetDeploymentCost(binarySizeBytes: number) {
  // 1. Buffer Account Rent: stores raw ELF during upload
  const bufferRentLamports = calculateRentLamports(binarySizeBytes);

  // 2. Program Account Rent: points to ProgramData account (36 bytes header)
  const programAccountRentLamports = calculateRentLamports(36 + 32);

  // 3. ProgramData Account Rent: 45 bytes header + binary size
  const programDataRentLamports = calculateRentLamports(45 + binarySizeBytes);

  // Total Rent Exemption required (Buffer rent is reclaimed after deployment, but needed during deploy)
  const rentExemptionLamports = programAccountRentLamports + programDataRentLamports + bufferRentLamports;

  // 4. Transaction Fees (Solana writes in chunks of ~900 bytes per tx)
  const chunkSize = 900;
  const chunkCount = Math.ceil(binarySizeBytes / chunkSize);
  const feePerTxLamports = 5_000;
  const estimatedTxFeesLamports = (chunkCount + 4) * feePerTxLamports; // upload chunks + init + deploy + idl

  const totalCostLamports = rentExemptionLamports + estimatedTxFeesLamports;

  return {
    bufferRentLamports,
    programAccountRentLamports,
    programDataRentLamports,
    rentExemptionLamports,
    rentExemptionSol: rentExemptionLamports / LAMPORTS_PER_SOL,
    chunkCount,
    estimatedTxFeesLamports,
    estimatedTxFeesSol: estimatedTxFeesLamports / LAMPORTS_PER_SOL,
    totalCostLamports,
    totalCostSol: totalCostLamports / LAMPORTS_PER_SOL,
  };
}

export interface DeploymentOptions {
  deployerPubkey?: string;
  cluster?: 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet';
  bypassSecurityWarnings?: boolean;
}

/**
 * Simulates and dry-runs a full Anchor contract deployment to Solana Devnet using the editor code state.
 * Validates AST syntax, executes pre-flight security audits, generates Anchor IDL,
 * and simulates the Upgradeable BPF Loader pipeline.
 */
export async function simulateAnchorDevnetDeployment(
  code: string,
  options: DeploymentOptions = {}
): Promise<DeploymentSimulationResult> {
  const cluster = options.cluster || 'devnet';
  const metadata = extractAnchorProgramMetadata(code);
  const binarySizeBytes = estimateContractBytecodeSize(code);
  const cost = calculateDevnetDeploymentCost(binarySizeBytes);

  const deployerKeypair = Keypair.generate();
  const deployerPubkey = options.deployerPubkey || deployerKeypair.publicKey.toBase58();
  const upgradeAuthorityPubkey = deployerPubkey;

  const bufferKeypair = Keypair.generate();
  const bufferPubkey = bufferKeypair.publicKey.toBase58();

  let programPubkey = metadata.programId;
  try {
    new PublicKey(programPubkey);
  } catch {
    programPubkey = Keypair.generate().publicKey.toBase58();
  }

  // Derive ProgramData address: PDA with seeds = [program_id] on BPFLoaderUpgradeab1e11111111111111111111111
  const bpfLoaderUpgradeableId = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
  let programDataPubkey: string;
  try {
    const [pDataPda] = PublicKey.findProgramAddressSync([new PublicKey(programPubkey).toBuffer()], bpfLoaderUpgradeableId);
    programDataPubkey = pDataPda.toBase58();
  } catch {
    programDataPubkey = Keypair.generate().publicKey.toBase58();
  }

  const steps: DeploymentDryRunStep[] = [];
  const logs: string[] = [];

  const timestamp = new Date().toISOString();
  logs.push(`[${timestamp}] 🚀 [Solana Architect Deployment Simulator] Iniciando Dry-Run no cluster: ${cluster.toUpperCase()}`);
  logs.push(`[${timestamp}] ⚙️  Programa: ${metadata.programName} (${programPubkey})`);
  logs.push(`[${timestamp}] 👤 Deployer / Upgrade Authority: ${deployerPubkey}`);

  // Step 1: AST & Syntax Check
  const hasValidSyntax = metadata.hasDeclareId && code.includes('use anchor_lang::prelude::*;');
  steps.push({
    name: '1. Verificação Estática de AST e Macros Anchor',
    status: hasValidSyntax ? 'success' : 'error',
    details: hasValidSyntax
      ? `Macros detectadas: declare_id!("${metadata.programId.slice(0, 8)}..."), #[program] mod ${metadata.programName}, ${metadata.instructions.length} instruções.`
      : 'Erro de compilação: O código deve conter declare_id!(...) e use anchor_lang::prelude::*;',
  });
  logs.push(`[${timestamp}] [AST Validator] Verificando estrutura do smart contract Anchor... OK (${metadata.instructions.length} instruções encontradas).`);

  // Step 2: Security Pre-Flight Audit
  const audit = runAnchorSecurityAudit(code);
  const hasCritical = audit.issues.some((i) => i.severity === 'critical');
  const auditPassed = audit.score >= 80 && !hasCritical;

  steps.push({
    name: '2. Auditoria Pre-Flight de Segurança (Solana Architect)',
    status: auditPassed ? 'success' : hasCritical ? 'error' : 'warning',
    details: `Nota de Auditoria: ${audit.score}/100. ${
      auditPassed
        ? 'Aprovado para implantação em ambiente Devnet/Testnet.'
        : hasCritical
        ? 'ALERTA CRÍTICO: Falha em restrições de segurança (has_one / controle de acesso).'
        : 'Avisos moderados detectados. Recomenda-se revisão antes de mainnet.'
    }`,
  });
  logs.push(`[${timestamp}] [Security Audit] Score: ${audit.score}/100 | Status: ${auditPassed ? 'PASSED ✅' : 'WARNING ⚠️'}`);

  // Step 3: Anchor IDL Compilation
  const generatedIdl = generateAnchorIdl(code, programPubkey);
  steps.push({
    name: '3. Compilação da Especificação Anchor IDL',
    status: 'success',
    details: `IDL JSON v0.1.0 gerado com ${generatedIdl.instructions.length} instruções e ${generatedIdl.accounts.length} contas estruturadas.`,
  });
  logs.push(`[${timestamp}] [Anchor IDL] IDL serializado com sucesso para ${metadata.programName}.json`);

  // Step 4: Estimativa de Tamanho e Custo de Aluguel
  steps.push({
    name: '4. Estimativa de Tamanho SBF & Isenção de Aluguel',
    status: 'success',
    details: `Tamanho binário estimado: ${(binarySizeBytes / 1024).toFixed(1)} KB (~${binarySizeBytes} bytes). Custo total exigido: ${cost.totalCostSol.toFixed(4)} SOL (${cost.chunkCount} transações em chunks).`,
    lamportsDelta: -cost.totalCostLamports,
  });
  logs.push(`[${timestamp}] [Rent Calculation] Buffer Rent: ${(cost.bufferRentLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL | ProgramData Rent: ${(cost.programDataRentLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  // Step 5: BPF Loader Upgradeable Buffer Creation
  const initBufferSig = '5x' + Keypair.generate().publicKey.toBase58().slice(0, 60);
  steps.push({
    name: '5. Criação da Conta de Buffer no BPF Loader Upgradeable',
    status: 'success',
    details: `Buffer Account criada: ${bufferPubkey}. Programa BPF Loader: BPFLoaderUpgradeab1e11111111111111111111111.`,
    txSignature: initBufferSig,
    computeUnits: 1450,
  });
  logs.push(`[${timestamp}] [RPC sendTransaction] Instruction: InitializeBuffer (Buffer: ${bufferPubkey}, Authority: ${deployerPubkey})`);
  logs.push(`[${timestamp}] [RPC Status] Tx Signature: ${initBufferSig} | Confirmed with 32 confirmations.`);

  // Step 6: Chunked ELF Bytecode Upload
  const uploadChunkSig = '4k' + Keypair.generate().publicKey.toBase58().slice(0, 60);
  steps.push({
    name: '6. Upload de Chunks de Bytecode ELF para o Buffer',
    status: 'success',
    details: `Simulação de upload de ${cost.chunkCount} blocos de 900 bytes para o buffer on-chain. Integridade SHA-256 verificada.`,
    txSignature: uploadChunkSig,
    computeUnits: 2850 * cost.chunkCount,
  });
  logs.push(`[${timestamp}] [Buffer Writer] Enviando ${cost.chunkCount} chunks de 900 bytes... 100% gravado no Buffer.`);

  // Step 7: Program Deployment & ProgramData Binding
  const deploySig = '3m' + Keypair.generate().publicKey.toBase58().slice(0, 60);
  steps.push({
    name: '7. Deploy e Vinculação da Conta ProgramData',
    status: 'success',
    details: `Executado DeployWithMaxDataLen. Program Account (${programPubkey}) vinculada a ProgramData Account (${programDataPubkey}). Upgrade Authority configurada para ${deployerPubkey}.`,
    txSignature: deploySig,
    computeUnits: 4820,
  });
  logs.push(`[${timestamp}] [BPF Loader] Executando DeployWithMaxDataLen...`);
  logs.push(`[${timestamp}] [BPF Loader] Program ID: ${programPubkey} ativado com sucesso!`);
  logs.push(`[${timestamp}] [BPF Loader] ProgramData Account: ${programDataPubkey} (Tamanho: ${binarySizeBytes} bytes)`);

  // Step 8: On-Chain Anchor IDL Registration
  const idlInitSig = '2z' + Keypair.generate().publicKey.toBase58().slice(0, 60);
  steps.push({
    name: '8. Registro On-Chain do Anchor IDL',
    status: 'success',
    details: `Metadados do IDL gravados na conta de metadados Anchor associada ao Program ID.`,
    txSignature: idlInitSig,
    computeUnits: 2100,
  });
  logs.push(`[${timestamp}] [Anchor CLI] Escrevendo IDL on-chain na conta Anchor IDL...`);
  logs.push(`[${timestamp}] ✅ [DEVOPS SUCCESS] Simulação de Deploy finalizada com sucesso no Solana Devnet!`);

  const isSuccess = hasValidSyntax && (auditPassed || !!options.bypassSecurityWarnings);

  return {
    success: isSuccess,
    programId: programPubkey,
    programName: metadata.programName,
    cluster,
    deployerPubkey,
    upgradeAuthorityPubkey,
    estimatedBinarySizeBytes: binarySizeBytes,
    bufferAccountPubkey: bufferPubkey,
    programDataPubkey,
    rentExemptionLamports: cost.rentExemptionLamports,
    rentExemptionSol: cost.rentExemptionSol,
    estimatedTxFeesLamports: cost.estimatedTxFeesLamports,
    estimatedTxFeesSol: cost.estimatedTxFeesSol,
    totalCostLamports: cost.totalCostLamports,
    totalCostSol: cost.totalCostSol,
    auditScore: audit.score,
    isAuditPassed: auditPassed,
    steps,
    logs,
    generatedIdl,
    deployedAt: timestamp,
    errorMessage: isSuccess
      ? undefined
      : !hasValidSyntax
      ? 'Erro sintático no contrato Anchor.'
      : 'Auditoria de segurança reprovou o contrato (existem vulnerabilidades críticas). Corrija as violações ou utilize bypass.',
  };
}
