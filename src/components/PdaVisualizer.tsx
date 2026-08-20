import React, { useState } from 'react';
import { deriveCounterPda } from '../utils/solanaUtils';
import { ShieldCheck, Key, Hash, Layers, CheckCircle2, Copy, RefreshCw, Cpu, HelpCircle, ArrowRight } from 'lucide-react';

export const PdaVisualizer: React.FC = () => {
  const [programId, setProgramId] = useState<string>('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
  const [authorityKey, setAuthorityKey] = useState<string>('5x39H1K7M2p4Q8v6L9x2Y1Z3W4V5U6T7S8R9Q1P2O3N4');
  const [seedPrefix, setSeedPrefix] = useState<string>('counter');
  const [copied, setCopied] = useState<boolean>(false);

  // Derive PDA dynamically
  const pdaResult = deriveCounterPda(programId, authorityKey, seedPrefix);

  const handlePresetWallet = (pubkey: string) => {
    setAuthorityKey(pubkey);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#0d1117] text-[#c9d1d9] p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#30363d]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#58a6ff]" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#c9d1d9]">
                Solana PDA (Program Derived Address) Engine
              </h1>
            </div>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Visualize deterministic, off-curve address derivation using program IDs, seeds, and canonical bump finding.
            </p>
          </div>

          <button
            onClick={() => {
              setProgramId('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
              setAuthorityKey('5x39H1K7M2p4Q8v6L9x2Y1Z3W4V5U6T7S8R9Q1P2O3N4');
              setSeedPrefix('counter');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Inputs</span>
          </button>
        </div>

        {/* INPUTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Input 1: Seed Prefix */}
          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
            <label className="text-xs font-mono font-semibold text-[#d2a8ff] flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              <span>Seed 1: Hardcoded Prefix</span>
            </label>
            <input
              type="text"
              value={seedPrefix}
              onChange={(e) => setSeedPrefix(e.target.value)}
              className="w-full bg-[#0d1117] text-xs font-mono text-[#c9d1d9] border border-[#30363d] rounded p-2 focus:outline-none focus:border-[#58a6ff]"
              placeholder='e.g. "counter"'
            />
            <p className="text-[11px] text-[#8b949e]">
              Rust expression: <code className="text-[#a5d6ff]">b&quot;counter&quot;</code>
            </p>
          </div>

          {/* Input 2: Authority Pubkey */}
          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-semibold text-[#58a6ff] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>Seed 2: Authority Public Key</span>
              </label>
            </div>
            <input
              type="text"
              value={authorityKey}
              onChange={(e) => setAuthorityKey(e.target.value)}
              className="w-full bg-[#0d1117] text-xs font-mono text-[#c9d1d9] border border-[#30363d] rounded p-2 focus:outline-none focus:border-[#58a6ff]"
              placeholder="Base58 Pubkey..."
            />
            {/* Quick Wallet Switcher */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-[#8b949e]">Presets:</span>
              <button
                onClick={() => handlePresetWallet('5x39H1K7M2p4Q8v6L9x2Y1Z3W4V5U6T7S8R9Q1P2O3N4')}
                className="px-1.5 py-0.5 text-[10px] bg-[#0d1117] hover:bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded"
              >
                Alice (Owner)
              </button>
              <button
                onClick={() => handlePresetWallet('8y22J9L3N1m7P5v9R2x4Z6A8B0C1D2E3F4G5H6I7J8K9')}
                className="px-1.5 py-0.5 text-[10px] bg-[#0d1117] hover:bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded"
              >
                Bob (Attacker)
              </button>
            </div>
          </div>

          {/* Input 3: Program ID */}
          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
            <label className="text-xs font-mono font-semibold text-[#ffa657] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>Program ID (Owner)</span>
            </label>
            <input
              type="text"
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="w-full bg-[#0d1117] text-xs font-mono text-[#c9d1d9] border border-[#30363d] rounded p-2 focus:outline-none focus:border-[#58a6ff]"
              placeholder="Program ID Base58..."
            />
            <p className="text-[11px] text-[#8b949e]">
              Matches <code className="text-[#ffa657]">declare_id!</code> macro.
            </p>
          </div>
        </div>

        {/* DERIVATION RESULT DISPLAY */}
        <div className="p-5 bg-[#161b22] border border-[#30363d] rounded-lg space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-3">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#58a6ff]">
                Cryptographic Derivation Output
              </span>
              <h2 className="text-base font-bold text-[#c9d1d9] flex items-center gap-2 mt-0.5">
                <span>Calculated PDA Address</span>
                {pdaResult.success && (
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-[#238636]/20 text-[#7ee787] border border-[#238636]/60 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Off-Curve Verified
                  </span>
                )}
              </h2>
            </div>

            {pdaResult.success && (
              <button
                onClick={() => copyToClipboard(pdaResult.pdaAddress)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#58a6ff] bg-[#1f6feb]/20 hover:bg-[#1f6feb]/30 border border-[#1f6feb]/60 rounded transition-colors self-start md:self-auto"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy Address'}</span>
              </button>
            )}
          </div>

          {pdaResult.success ? (
            <div className="space-y-5">
              {/* PDA & Bump Output Badges */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 p-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-1">
                  <span className="text-[11px] font-mono text-[#8b949e] uppercase">Program Derived Address (Base58)</span>
                  <div className="font-mono text-sm sm:text-base font-bold text-[#58a6ff] break-all">
                    {pdaResult.pdaAddress}
                  </div>
                </div>

                <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-1 flex flex-col justify-center">
                  <span className="text-[11px] font-mono text-[#8b949e] uppercase">Canonical Bump</span>
                  <div className="font-mono text-2xl font-bold text-[#7ee787]">
                    {pdaResult.bump} <span className="text-xs font-sans text-[#8b949e]">(0x{pdaResult.bump.toString(16)})</span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Pipeline Flowchart */}
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-3 font-mono text-xs">
                <div className="text-xs font-bold text-[#c9d1d9] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#d2a8ff]" />
                  <span>Anchor Derivation Pipeline Flow</span>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left bg-[#161b22] p-3 rounded border border-[#30363d]">
                  <div className="p-2 bg-[#0d1117] rounded border border-[#30363d] text-[11px]">
                    <div className="text-[#d2a8ff] font-bold">Seeds</div>
                    <div className="text-[#8b949e] text-[10px] mt-0.5">
                      [&quot;{pdaResult.seed1String}&quot;, {pdaResult.seed2Base58.slice(0, 8)}...]
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#8b949e] shrink-0 hidden md:block" />

                  <div className="p-2 bg-[#0d1117] rounded border border-[#30363d] text-[11px]">
                    <div className="text-[#58a6ff] font-bold">SHA-256 + Program ID</div>
                    <div className="text-[#8b949e] text-[10px] mt-0.5">
                      Program: {programId.slice(0, 8)}...
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#8b949e] shrink-0 hidden md:block" />

                  <div className="p-2 bg-[#0d1117] rounded border border-[#30363d] text-[11px]">
                    <div className="text-[#ffa657] font-bold">Bump Search</div>
                    <div className="text-[#8b949e] text-[10px] mt-0.5">
                      Iterate 255 down to find off-curve
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#8b949e] shrink-0 hidden md:block" />

                  <div className="p-2 bg-[#0d1117] rounded border border-[#30363d] text-[11px]">
                    <div className="text-[#7ee787] font-bold">Derived PDA</div>
                    <div className="text-[#8b949e] text-[10px] mt-0.5">
                      Bump {pdaResult.bump} (Verified)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#f85149]/20 border border-[#f85149]/50 text-[#ff7b72] rounded-lg text-xs font-mono">
              Error deriving PDA: {pdaResult.error}
            </div>
          )}
        </div>

        {/* EDUCATIONAL PDA CHEAT SHEET */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
            <h3 className="text-sm font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#d2a8ff]" />
              <span>Why do PDAs not have Private Keys?</span>
            </h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Program Derived Addresses are generated using seeds and a program ID that deliberately force the resulting key off the Ed25519 elliptic curve. Because no private key exists on the curve for this address, no external user can sign for it. Only the owner program can programmatically sign for its PDAs during Cross-Program Invocations (CPIs).
            </p>
          </div>

          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-2">
            <h3 className="text-sm font-bold text-[#c9d1d9] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#7ee787]" />
              <span>Anchor Macro Best Practice</span>
            </h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Always store the derived bump seed inside your account struct during initialization (<code className="text-[#d2a8ff]">counter.bump = ctx.bumps.counter</code>). In subsequent instructions, specify <code className="text-[#7ee787]">bump = counter.bump</code> to skip expensive on-chain re-derivations and prevent bump injection vulnerabilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
