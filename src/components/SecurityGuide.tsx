import React from 'react';
import { BookOpen, ShieldCheck, Lock, Key, AlertTriangle, Cpu, CheckCircle2 } from 'lucide-react';

export const SecurityGuide: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#0d1117] text-[#c9d1d9] p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-[#30363d]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#58a6ff]" />
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#c9d1d9]">
              Solana Anchor Smart Contract Security Guide
            </h1>
          </div>
          <p className="text-xs text-[#8b949e] mt-0.5">
            Deep technical guide on Anchor constraints, Program Derived Addresses (PDAs), account discriminators, and access control audit patterns.
          </p>
        </div>

        {/* SECTION 1: PDA CANONICAL BUMP SECURITY */}
        <div className="p-5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#7ee787]" />
            <h2 className="text-sm font-bold text-[#c9d1d9]">
              1. Canonical Bump Seeds & Storage
            </h2>
          </div>

          <p className="text-xs text-[#8b949e] leading-relaxed">
            In Solana, <code className="text-[#d2a8ff]">find_program_address</code> iterates bump seeds starting from <code className="text-[#7ee787]">255</code> downwards until it finds an off-curve address. The highest valid bump is called the <strong>Canonical Bump</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-2">
              <span className="text-xs font-mono font-bold text-[#ff7b72] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Vulnerable Pattern
              </span>
              <p className="text-[11px] text-[#8b949e]">
                Passing an arbitrary bump provided in instruction arguments without checking if it matches the canonical bump derived on-chain. Attackers can pass non-canonical bumps to create duplicate accounts.
              </p>
            </div>

            <div className="p-3.5 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-2">
              <span className="text-xs font-mono font-bold text-[#7ee787] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Secure Anchor Pattern
              </span>
              <p className="text-[11px] text-[#8b949e]">
                Cache bump in account state during <code className="text-[#d2a8ff]">initialize</code> (<code className="text-[#7ee787]">counter.bump = ctx.bumps.counter</code>) and validate with <code className="text-[#7ee787]">bump = counter.bump</code> in subsequent context structs.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: ACCESS CONTROL (has_one) */}
        <div className="p-5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#58a6ff]" />
            <h2 className="text-sm font-bold text-[#c9d1d9]">
              2. Signer Validation & Authority Enforcing (<code className="text-[#58a6ff]">has_one</code>)
            </h2>
          </div>

          <p className="text-xs text-[#8b949e] leading-relaxed">
            Solana account validation requires explicitly verifying that the account field holding authority matches the signer passing the instruction. Anchor provides the <code className="text-[#58a6ff]">has_one</code> constraint macro:
          </p>

          <pre className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] text-xs font-mono text-[#c9d1d9]">
{`#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump = counter.bump,
        has_one = authority // <--- Verifies counter.authority == authority.key()
    )]
    pub counter: Account<'info, UserCounter>,
    pub authority: Signer<'info>, // <--- Ensures runtime cryptographic signature
}`}
          </pre>
        </div>

        {/* SECTION 3: ACCOUNT DISCRIMINATOR & SPACE MATH */}
        <div className="p-5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#ffa657]" />
            <h2 className="text-sm font-bold text-[#c9d1d9]">
              3. Anchor Account Discriminator & Space Calculation
            </h2>
          </div>

          <p className="text-xs text-[#8b949e] leading-relaxed">
            Every account created with Anchor starts with an <strong>8-byte discriminator</strong>. It is computed as the first 8 bytes of <code className="text-[#ffa657]">SHA-256(&quot;account:&lt;AccountName&gt;&quot;)</code>. This prevents account type confusion attacks.
          </p>

          <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] font-mono text-xs space-y-2">
            <div className="font-bold text-[#c9d1d9] border-b border-[#30363d] pb-1">
              UserCounter Exact Memory Alignment (49 Bytes):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
              <div className="p-2 bg-[#161b22] border border-[#30363d] rounded">
                <div className="font-bold text-[#d2a8ff]">8 Bytes</div>
                <div className="text-[#8b949e]">Anchor Discriminator</div>
              </div>

              <div className="p-2 bg-[#161b22] border border-[#30363d] rounded">
                <div className="font-bold text-[#58a6ff]">32 Bytes</div>
                <div className="text-[#8b949e]">Pubkey (authority)</div>
              </div>

              <div className="p-2 bg-[#161b22] border border-[#30363d] rounded">
                <div className="font-bold text-[#ffa657]">8 Bytes</div>
                <div className="text-[#8b949e]">u64 (count)</div>
              </div>

              <div className="p-2 bg-[#161b22] border border-[#30363d] rounded">
                <div className="font-bold text-[#7ee787]">1 Byte</div>
                <div className="text-[#8b949e]">u8 (bump)</div>
              </div>
            </div>
            <div className="text-center text-[#8b949e] pt-1">
              Total Space = 8 + 32 + 8 + 1 = <strong>49 Bytes</strong> (~0.0012384 SOL Rent Exemption)
            </div>
          </div>
        </div>

        {/* SECTION 4: MACRO CHEAT SHEET */}
        <div className="p-5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#d2a8ff]" />
            <h2 className="text-sm font-bold text-[#c9d1d9]">
              4. Anchor Macro Constraint Cheat Sheet
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
              <span className="text-[#d2a8ff] font-bold">init</span>
              <p className="text-[#8b949e] font-sans text-[11px]">Creates account via SystemProgram and writes 8-byte discriminator.</p>
            </div>

            <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
              <span className="text-[#58a6ff] font-bold">payer = authority</span>
              <p className="text-[#8b949e] font-sans text-[11px]">Designates who pays rent lamports for account creation.</p>
            </div>

            <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
              <span className="text-[#ffa657] font-bold">seeds = [...]</span>
              <p className="text-[#8b949e] font-sans text-[11px]">Derives PDA address on-chain using byte seeds.</p>
            </div>

            <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] space-y-1">
              <span className="text-[#7ee787] font-bold">close = authority</span>
              <p className="text-[#8b949e] font-sans text-[11px]">Closes account, zeroes data bytes, and refunds lamports to target pubkey.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
