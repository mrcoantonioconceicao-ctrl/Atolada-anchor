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
  const hasSeedsInIncrement = code.includes('seeds = [b"counter"') || code.includes('seeds =');
  const isVulnerableTemplate = code.includes('VULNERABILITY');

  // Check 1: Access Control - has_one constraint
  if (hasHasOne) {
    issues.push({
      id: 'access-control-has-one',
      category: 'Access Control',
      severity: 'pass',
      title: 'Signer & Authority Binding (`has_one = authority`) Verified',
      description: 'The `Increment` struct specifies `has_one = authority`. Anchor automatically checks that `counter.authority == authority.key()`.',
      recommendation: 'Maintain explicit authority validation on all mutating instruction contexts.',
    });
  } else {
    issues.push({
      id: 'access-control-missing-has-one',
      category: 'Access Control',
      severity: 'critical',
      title: 'Missing Access Control Constraint (`has_one = authority`)',
      description: 'The instruction struct does not enforce `has_one = authority` or `constraint = counter.authority == authority.key()`. Any malicious user can pass a foreign counter account and mutate state!',
      recommendation: 'Add `has_one = authority` to the `#[account(...)]` attribute macro in the context struct.',
      fixAction: {
        label: 'Add `has_one = authority` constraint',
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
      title: 'Canonical Bump Storage & Re-validation',
      description: 'The bump seed is cached during `initialize` (`counter.bump = ctx.bumps.counter`) and re-checked during subsequent calls using `bump = counter.bump`.',
      recommendation: 'Storing and verifying canonical bumps prevents CPU re-derivation attacks and rogue bump injections.',
    });
  } else {
    issues.push({
      id: 'pda-missing-bump',
      category: 'PDA',
      severity: 'high',
      title: 'Missing Canonical Bump Caching & Verification',
      description: 'The contract does not cache or check `bump = counter.bump`. Without bump verification, attackers could submit non-canonical bump seeds or force expensive on-chain re-derivations.',
      recommendation: 'Store `pub bump: u8` inside `UserCounter` during init and validate with `bump = counter.bump`.',
      fixAction: {
        label: 'Store & Validate Bump',
        patchCode: 'counter.bump = ctx.bumps.counter;',
      },
    });
  }

  // Check 3: Account Space & Rent Allocation
  if (code.includes('space = 8 + 32 + 8 + 1')) {
    issues.push({
      id: 'space-exact-49',
      category: 'Rent / Space',
      severity: 'pass',
      title: 'Exact Space Allocation (49 Bytes)',
      description: 'Space calculated precisely: 8 (Discriminator) + 32 (Pubkey) + 8 (u64 counter) + 1 (u8 bump) = 49 bytes.',
      recommendation: 'Exact space allocation optimizes rent costs and prevents memory alignment bugs.',
    });
  } else if (hasSpace && !code.includes('+ 1')) {
    issues.push({
      id: 'space-missing-bump-byte',
      category: 'Rent / Space',
      severity: 'medium',
      title: 'Insufficient Space Allocation (Missing Bump Byte)',
      description: 'Account space appears to omit the 1-byte allocation for `u8 bump`. Account creation will fail with `AccountDataTooSmall` when setting bump.',
      recommendation: 'Update space constraint to `space = 8 + 32 + 8 + 1` (49 bytes).',
    });
  } else {
    issues.push({
      id: 'space-unconstrained',
      category: 'Rent / Space',
      severity: 'high',
      title: 'Missing or Unvalidated Account Space',
      description: '`init` macro requires an explicit `space` parameter to calculate rent exemption and initialize memory.',
      recommendation: 'Specify `space = 8 + 32 + 8 + 1` in `#[account(init, ...)]`.',
    });
  }

  // Check 4: Integer Math / Overflow
  if (hasCheckedMath) {
    issues.push({
      id: 'math-checked',
      category: 'Math / Overflow',
      severity: 'pass',
      title: 'Checked Arithmetic Used (`checked_add`)',
      description: 'Mathematical operations use checked arithmetic (`checked_add`), preventing silent integer overflow or panic.',
      recommendation: 'Always use `checked_add` or configure `OverflowHandlers` in Cargo.toml.',
    });
  } else if (code.includes('+= 1') || code.includes('count +=')) {
    issues.push({
      id: 'math-unchecked-addition',
      category: 'Math / Overflow',
      severity: 'low',
      title: 'Direct Arithmetic Addition (`counter.count += 1`)',
      description: 'Direct addition (`+=`) can overflow `u64::MAX` in release builds if overflow checks are disabled in Cargo.toml.',
      recommendation: 'Replace `counter.count += 1` with `counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;`.',
      fixAction: {
        label: 'Use checked_add',
        patchCode: 'counter.count = counter.count.checked_add(1).ok_or(ErrorCode::Overflow)?;',
      },
    });
  }

  // Check 5: Reentrancy & Signer Checks
  if (code.includes('pub authority: Signer<\'info\'>')) {
    issues.push({
      id: 'signer-check-pass',
      category: 'Access Control',
      severity: 'pass',
      title: 'Signer Type Validation (`Signer<\'info\'>`)',
      description: '`authority` is declared as `Signer<\'info\'>`, ensuring Solana runtime cryptographically verifies the transaction signature.',
      recommendation: 'Never replace `Signer` with unvalidated `AccountInfo` for authority checks.',
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
