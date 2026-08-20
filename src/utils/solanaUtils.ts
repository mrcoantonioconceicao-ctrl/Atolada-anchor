import { PublicKey } from '@solana/web3.js';
import { AuditIssue, ParsedAnchorContract } from '../types/solana';

// Calculate Anchor Account Discriminator: first 8 bytes of SHA-256("account:<AccountName>")
export async function calculateAnchorDiscriminator(accountName: string): Promise<string> {
  const name = `account:${accountName}`;
  const msgUint8 = new TextEncoder().encode(name);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const discriminatorBytes = hashArray.slice(0, 8);
  return '0x' + discriminatorBytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Derive Solana PDA using @solana/web3.js findProgramAddressSync
export function deriveCounterPda(programIdStr: string, authorityPubkeyStr: string, seedPrefix: string = 'counter') {
  try {
    const programId = new PublicKey(programIdStr);
    const authorityPubkey = new PublicKey(authorityPubkeyStr);
    
    const seed1 = Buffer.from(seedPrefix, 'utf8');
    const seed2 = authorityPubkey.toBuffer();

    const [pda, bump] = PublicKey.findProgramAddressSync([seed1, seed2], programId);

    return {
      success: true,
      pdaAddress: pda.toBase58(),
      bump,
      seed1Hex: seed1.toString('hex'),
      seed1String: seedPrefix,
      seed2Base58: authorityPubkeyStr,
      seed2Hex: seed2.toString('hex'),
      isOffCurve: !PublicKey.isOnCurve(pda.toBuffer()),
    };
  } catch (error: any) {
    return {
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

// Static AST & Anchor Code Security Auditor
export function runAnchorSecurityAudit(code: string): { score: number; issues: AuditIssue[] } {
  const issues: AuditIssue[] = [];

  const hasHasOne = code.includes('has_one = authority');
  const hasBumpStore = code.includes('counter.bump = ctx.bumps.counter') || code.includes('bump = counter.bump');
  const hasCheckedMath = code.includes('checked_add') || code.includes('checked_sub');
  const hasSpace = code.includes('space = 8 + 32 + 8 + 1') || code.includes('space =');
  const isVulnerableTemplate = code.includes('VULNERABILIDADE') || code.includes('VULNERABILITY');

  // Check 1: Access Control - has_one constraint
  if (hasHasOne) {
    issues.push({
      id: 'access-control-has-one',
      category: 'Controle de Acesso',
      severity: 'pass',
      title: 'Vinculação de Assinante e Autoridade (`has_one = authority`) Verificada',
      description: 'A struct `Increment` especifica `has_one = authority`. O Anchor verifica automaticamente se `counter.authority == authority.key()`.',
      recommendation: 'Mantenha a validação explícita de autoridade em todos os contextos de instruções mutáveis.',
    });
  } else {
    issues.push({
      id: 'access-control-missing-has-one',
      category: 'Controle de Acesso',
      severity: 'critical',
      title: 'Falta Restrição de Controle de Acesso (`has_one = authority`)',
      description: 'A struct de instrução não impõe `has_one = authority` nem `constraint = counter.authority == authority.key()`. Qualquer usuário malicioso pode passar uma conta de contador de terceiros e alterar seu estado!',
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

  // Check 2: PDA Seeds & Canonical Bump Verification
  if (hasBumpStore) {
    issues.push({
      id: 'pda-canonical-bump',
      category: 'PDA',
      severity: 'pass',
      title: 'Armazenamento e Revalidação do Bump Canônico',
      description: 'A seed do bump é salva em cache no `initialize` (`counter.bump = ctx.bumps.counter`) e rechecada em chamadas subsequentes com `bump = counter.bump`.',
      recommendation: 'Armazenar e verificar bumps canônicos previne ataques de rederivação na CPU e injeção de bumps arbitrários.',
    });
  } else {
    issues.push({
      id: 'pda-missing-bump',
      category: 'PDA',
      severity: 'high',
      title: 'Falta Armazenamento e Verificação do Bump Canônico',
      description: 'O contrato não armazena nem verifica `bump = counter.bump`. Sem verificação de bump, atacantes podem enviar seeds não-canônicas ou forçar recálculos caros on-chain.',
      recommendation: 'Guarde `pub bump: u8` na struct `UserCounter` durante a inicialização e valide com `bump = counter.bump`.',
      fixAction: {
        label: 'Armazenar e Validar Bump',
        patchCode: 'counter.bump = ctx.bumps.counter;',
      },
    });
  }

  // Check 3: Account Space & Rent Allocation
  if (code.includes('space = 8 + 32 + 8 + 1')) {
    issues.push({
      id: 'space-exact-49',
      category: 'Rent / Espaço',
      severity: 'pass',
      title: 'Alocação Exata de Espaço em Disco (49 Bytes)',
      description: 'Espaço calculado com precisão: 8 (Discriminador Anchor) + 32 (Pubkey) + 8 (u64 contador) + 1 (u8 bump) = 49 bytes.',
      recommendation: 'A alocação exata de espaço otimiza custos de isenção de aluguel e previne erros de alinhamento de memória.',
    });
  } else if (hasSpace && !code.includes('+ 1')) {
    issues.push({
      id: 'space-missing-bump-byte',
      category: 'Rent / Espaço',
      severity: 'medium',
      title: 'Alocação Insuficiente de Espaço (Faltando Byte do Bump)',
      description: 'O espaço da conta omite o 1 byte necessário para `u8 bump`. A criação da conta falhará com erro `AccountDataTooSmall` ao tentar gravar o bump.',
      recommendation: 'Atualize a restrição para `space = 8 + 32 + 8 + 1` (49 bytes).',
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

  // Check 4: Integer Math / Overflow
  if (hasCheckedMath) {
    issues.push({
      id: 'math-checked',
      category: 'Matemática / Overflow',
      severity: 'pass',
      title: 'Uso de Aritmética Segura (`checked_add`)',
      description: 'Operações matemáticas usam aritmética checked (`checked_add`), evitando estouro de inteiros silencioso ou travamento do programa.',
      recommendation: 'Sempre utilize `checked_add` ou configure `OverflowHandlers` no arquivo Cargo.toml.',
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

  // Check 5: Reentrancy & Signer Checks
  if (code.includes('pub authority: Signer<\'info\'>')) {
    issues.push({
      id: 'signer-check-pass',
      category: 'Controle de Acesso',
      severity: 'pass',
      title: 'Validação de Tipo Signer (`Signer<\'info\'>`)',
      description: '`authority` está declarada como `Signer<\'info\'>`, garantindo que o runtime da Solana verifique criptograficamente a assinatura da transação.',
      recommendation: 'Nunca substitua `Signer` por `AccountInfo` sem verificação manual do campo `.is_signer`.',
    });
  }

  // Calculate overall score
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'critical') score -= 35;
    if (issue.severity === 'high') score -= 20;
    if (issue.severity === 'medium') score -= 10;
    if (issue.severity === 'low') score -= 5;
  }
  score = Math.max(0, Math.min(100, score));

  return { score, issues };
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
