import React, { useState } from 'react';
import { VirtualWallet, UserCounterAccountState, TxLogEntry } from '../types/solana';
import { deriveCounterPda, calculateAnchorDiscriminator, calculateRentLamports } from '../utils/solanaUtils';
import { Terminal, Play, ShieldAlert, Cpu, Database, Wallet, Layers, CheckCircle2, XCircle, RotateCcw, AlertTriangle, ArrowRight } from 'lucide-react';

interface ExecutionSandboxProps {
  code: string;
}

const INITIAL_WALLETS: VirtualWallet[] = [
  {
    id: 'alice',
    name: 'Alice (Owner / Authority)',
    pubkey: '5x39H1K7M2p4Q8v6L9x2Y1Z3W4V5U6T7S8R9Q1P2O3N4',
    role: 'Owner (Authority)',
    balanceSol: 10.0,
  },
  {
    id: 'bob',
    name: 'Bob (Attacker / Unpermitted)',
    pubkey: '8y22J9L3N1m7P5v9R2x4Z6A8B0C1D2E3F4G5H6I7J8K9',
    role: 'Attacker / Impersonator',
    balanceSol: 5.0,
  },
  {
    id: 'charlie',
    name: 'Charlie (User 2)',
    pubkey: '3kP71M8N2p9Q4v6L8x1Y2Z3W5V6U7T8S9R0Q2P3O4N5',
    role: 'Standard User',
    balanceSol: 5.0,
  },
];

export const ExecutionSandbox: React.FC<ExecutionSandboxProps> = ({ code }) => {
  const [wallets, setWallets] = useState<VirtualWallet[]>(INITIAL_WALLETS);
  const [activeWalletId, setActiveWalletId] = useState<string>('alice');
  const [programId] = useState<string>('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

  // Account State for Alice's Counter PDA
  const alicePda = deriveCounterPda(programId, INITIAL_WALLETS[0].pubkey, 'counter');
  const rentLamports = calculateRentLamports(49);

  const [counterState, setCounterState] = useState<UserCounterAccountState>({
    isInitialized: false,
    address: alicePda.pdaAddress,
    authority: INITIAL_WALLETS[0].pubkey,
    count: 0,
    bump: alicePda.bump,
    lamports: 0,
    spaceBytes: 49,
    discriminatorHex: '0x2ba771a39fbc85c4',
  });

  // Transaction History Logs
  const [txLogs, setTxLogs] = useState<TxLogEntry[]>([
    {
      id: 'tx-0',
      timestamp: new Date().toLocaleTimeString(),
      signature: '5kJ8xP2...v9Z4',
      signer: INITIAL_WALLETS[0].pubkey,
      instruction: 'SystemProgram::CreateAccount (Pending)',
      status: 'success',
      computeUnitsUsed: 150,
      logs: [
        `Program ${programId} invoke [1]`,
        'Program log: Virtual Solana Localnet cluster ready',
        'Program log: Rent-exempt account space: 49 bytes (1,238,400 lamports)',
      ],
    },
  ]);

  const activeWallet = wallets.find((w) => w.id === activeWalletId) || wallets[0];

  const handleExecuteInstruction = (instructionName: 'initialize' | 'increment' | 'decrement' | 'reset' | 'close') => {
    const timestamp = new Date().toLocaleTimeString();
    const mockSig = Math.random().toString(36).substring(2, 10) + '...' + Math.random().toString(36).substring(2, 6);

    // Security Constraint Validation Engine based on current code
    const codeHasHasOne = code.includes('has_one = authority');
    const isOwnerSigning = activeWallet.pubkey === counterState.authority;

    if (instructionName === 'initialize') {
      if (counterState.isInitialized) {
        // Anchor initialization error
        const newLog: TxLogEntry = {
          id: `tx-${Date.now()}`,
          timestamp,
          signature: mockSig,
          signer: activeWallet.pubkey,
          instruction: 'initialize',
          status: 'error',
          computeUnitsUsed: 1200,
          logs: [
            `Program ${programId} invoke [1]`,
            `Program log: Instruction: Initialize`,
            `AnchorError: Account ${counterState.address} is already initialized`,
            `Program ${programId} consumed 1200 of 200000 compute units`,
            `Program ${programId} failed: custom program error: 0x0`,
          ],
          errorMessage: 'AccountAlreadyInitialized: Account is already in use.',
        };
        setTxLogs((prev) => [newLog, ...prev]);
        return;
      }

      // Successful Initialize
      const updatedState: UserCounterAccountState = {
        ...counterState,
        isInitialized: true,
        count: 0,
        lamports: rentLamports,
      };
      setCounterState(updatedState);

      // Deduct rent from wallet
      setWallets((prev) =>
        prev.map((w) =>
          w.id === activeWallet.id ? { ...w, balanceSol: w.balanceSol - rentLamports / 1e9 } : w
        )
      );

      const newLog: TxLogEntry = {
        id: `tx-${Date.now()}`,
        timestamp,
        signature: mockSig,
        signer: activeWallet.pubkey,
        instruction: 'initialize',
        status: 'success',
        computeUnitsUsed: 3840,
        logs: [
          `Program ${programId} invoke [1]`,
          'Program log: Instruction: Initialize',
          `Program log: Created PDA ${counterState.address} with bump ${counterState.bump}`,
          `Program log: Assigned authority to ${activeWallet.pubkey}`,
          `Program ${programId} consumed 3840 of 200000 compute units`,
          `Program ${programId} success`,
        ],
        stateDelta: `Created UserCounter PDA (49 bytes, ${rentLamports} lamports)`,
      };
      setTxLogs((prev) => [newLog, ...prev]);
      return;
    }

    // Require initialized state for other instructions
    if (!counterState.isInitialized) {
      const newLog: TxLogEntry = {
        id: `tx-${Date.now()}`,
        timestamp,
        signature: mockSig,
        signer: activeWallet.pubkey,
        instruction: instructionName,
        status: 'error',
        computeUnitsUsed: 800,
        logs: [
          `Program ${programId} invoke [1]`,
          `Program log: Instruction: ${instructionName}`,
          `AnchorError: AccountNotInitialized for PDA ${counterState.address}`,
          `Program ${programId} consumed 800 of 200000 compute units`,
          `Program ${programId} failed: AccountNotInitialized`,
        ],
        errorMessage: 'AccountNotInitialized: Could not deserialize account state.',
      };
      setTxLogs((prev) => [newLog, ...prev]);
      return;
    }

    // Check Access Control (has_one = authority)
    if (codeHasHasOne && !isOwnerSigning) {
      // ANCHOR CONSTRAINT ERROR FAILURE!
      const newLog: TxLogEntry = {
        id: `tx-${Date.now()}`,
        timestamp,
        signature: mockSig,
        signer: activeWallet.pubkey,
        instruction: instructionName,
        status: 'error',
        computeUnitsUsed: 1450,
        logs: [
          `Program ${programId} invoke [1]`,
          `Program log: Instruction: ${instructionName}`,
          `AnchorError: ConstraintHasOne violated by signer ${activeWallet.pubkey}`,
          `Expected authority: ${counterState.authority}`,
          `Program ${programId} consumed 1450 of 200000 compute units`,
          `Program ${programId} failed: ConstraintHasOneMismatch`,
        ],
        errorMessage: 'ConstraintHasOne: A has_one constraint was violated. Signer is not the account authority.',
      };
      setTxLogs((prev) => [newLog, ...prev]);
      return;
    }

    // Execute instruction state changes
    if (instructionName === 'increment') {
      setCounterState((prev) => ({ ...prev, count: prev.count + 1 }));
      const newLog: TxLogEntry = {
        id: `tx-${Date.now()}`,
        timestamp,
        signature: mockSig,
        signer: activeWallet.pubkey,
        instruction: 'increment',
        status: 'success',
        computeUnitsUsed: 2150,
        logs: [
          `Program ${programId} invoke [1]`,
          'Program log: Instruction: Increment',
          `Program log: Count updated from ${counterState.count} to ${counterState.count + 1}`,
          `Program ${programId} consumed 2150 of 200000 compute units`,
          `Program ${programId} success`,
        ],
        stateDelta: `Count updated to ${counterState.count + 1}`,
      };
      setTxLogs((prev) => [newLog, ...prev]);
    } else if (instructionName === 'decrement') {
      if (counterState.count === 0) {
        const newLog: TxLogEntry = {
          id: `tx-${Date.now()}`,
          timestamp,
          signature: mockSig,
          signer: activeWallet.pubkey,
          instruction: 'decrement',
          status: 'error',
          computeUnitsUsed: 1100,
          logs: [
            `Program ${programId} invoke [1]`,
            'Program log: Instruction: Decrement',
            'Program log: Error: Counter underflow attempt (count is 0)',
            `Program ${programId} consumed 1100 of 200000 compute units`,
            'Program failed: Custom program error 0x1',
          ],
          errorMessage: 'Underflow: Counter cannot be decremented below 0.',
        };
        setTxLogs((prev) => [newLog, ...prev]);
        return;
      }
      setCounterState((prev) => ({ ...prev, count: prev.count - 1 }));
      const newLog: TxLogEntry = {
        id: `tx-${Date.now()}`,
        timestamp,
        signature: mockSig,
        signer: activeWallet.pubkey,
        instruction: 'decrement',
        status: 'success',
        computeUnitsUsed: 2100,
        logs: [
          `Program ${programId} invoke [1]`,
          'Program log: Instruction: Decrement',
          `Program log: Count updated to ${counterState.count - 1}`,
          `Program ${programId} consumed 2100 of 200000 compute units`,
          `Program ${programId} success`,
        ],
        stateDelta: `Count updated to ${counterState.count - 1}`,
      };
      setTxLogs((prev) => [newLog, ...prev]);
    } else if (instructionName === 'reset') {
      setCounterState((prev) => ({ ...prev, count: 0 }));
      const newLog: TxLogEntry = {
        id: `tx-${Date.now()}`,
        timestamp,
        signature: mockSig,
        signer: activeWallet.pubkey,
        instruction: 'reset',
        status: 'success',
        computeUnitsUsed: 1900,
        logs: [
          `Program ${programId} invoke [1]`,
          'Program log: Instruction: Reset',
          'Program log: Counter state reset to 0',
          `Program ${programId} consumed 1900 of 200000 compute units`,
          `Program ${programId} success`,
        ],
        stateDelta: 'Count reset to 0',
      };
      setTxLogs((prev) => [newLog, ...prev]);
    } else if (instructionName === 'close') {
      setCounterState((prev) => ({ ...prev, isInitialized: false, count: 0, lamports: 0 }));
      // Refund lamports back to active wallet
      setWallets((prev) =>
        prev.map((w) =>
          w.id === activeWallet.id ? { ...w, balanceSol: w.balanceSol + rentLamports / 1e9 } : w
        )
      );
      const newLog: TxLogEntry = {
        id: `tx-${Date.now()}`,
        timestamp,
        signature: mockSig,
        signer: activeWallet.pubkey,
        instruction: 'close',
        status: 'success',
        computeUnitsUsed: 2900,
        logs: [
          `Program ${programId} invoke [1]`,
          'Program log: Instruction: CloseAccount',
          `Program log: Closed PDA ${counterState.address}`,
          `Program log: Refunded ${rentLamports} lamports to ${activeWallet.pubkey}`,
          `Program ${programId} consumed 2900 of 200000 compute units`,
          `Program ${programId} success`,
        ],
        stateDelta: 'Account closed & rent refunded',
      };
      setTxLogs((prev) => [newLog, ...prev]);
    }
  };

  const resetSimulator = () => {
    setWallets(INITIAL_WALLETS);
    setCounterState({
      isInitialized: false,
      address: alicePda.pdaAddress,
      authority: INITIAL_WALLETS[0].pubkey,
      count: 0,
      bump: alicePda.bump,
      lamports: 0,
      spaceBytes: 49,
      discriminatorHex: '0x2ba771a39fbc85c4',
    });
    setTxLogs([]);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#0d1117] text-[#c9d1d9] p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#30363d]">
          <div>
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#7ee787]" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#c9d1d9]">
                Solana Instruction Execution & Security Sandbox
              </h1>
            </div>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Test Anchor instruction handlers, state transitions, byte deserialization, and multi-wallet access control in real time.
            </p>
          </div>

          <button
            onClick={resetSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors shrink-0 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Localnet State</span>
          </button>
        </div>

        {/* TOP ROW: WALLETS & CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Selector Column */}
          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-3">
            <span className="text-xs font-mono font-bold uppercase text-[#d2a8ff] flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>Select Active Signer Wallet</span>
            </span>

            <div className="space-y-2">
              {wallets.map((w) => (
                <div
                  key={w.id}
                  onClick={() => setActiveWalletId(w.id)}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    activeWalletId === w.id
                      ? 'bg-[#1f6feb26] border-[#58a6ff] text-[#58a6ff]'
                      : 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9] hover:border-[#8b949e]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{w.name}</span>
                    <span className="font-mono text-xs text-[#7ee787] font-semibold">
                      {w.balanceSol.toFixed(3)} SOL
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#8b949e] truncate mt-1">
                    {w.pubkey}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instruction Execution Panel */}
          <div className="lg:col-span-2 p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-xs font-mono font-bold uppercase text-[#7ee787] flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-[#7ee787]" />
                <span>Execute Anchor Instruction</span>
              </span>
              <span className="text-xs font-mono text-[#8b949e]">
                Signer: <strong className="text-[#d2a8ff]">{activeWallet.name}</strong>
              </span>
            </div>

            {/* Instruction Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleExecuteInstruction('initialize')}
                disabled={counterState.isInitialized}
                className={`p-2.5 text-xs font-semibold rounded border transition-all flex flex-col items-center gap-1 ${
                  counterState.isInitialized
                    ? 'bg-[#0d1117]/50 border-[#30363d] text-[#8b949e] cursor-not-allowed'
                    : 'bg-[#238636] hover:bg-[#2ea043] border-[#30363d] text-white'
                }`}
              >
                <span>initialize()</span>
                <span className="text-[10px] opacity-80 font-normal">Creates PDA (49B)</span>
              </button>

              <button
                onClick={() => handleExecuteInstruction('increment')}
                disabled={!counterState.isInitialized}
                className={`p-2.5 text-xs font-semibold rounded border transition-all flex flex-col items-center gap-1 ${
                  !counterState.isInitialized
                    ? 'bg-[#0d1117]/50 border-[#30363d] text-[#8b949e] cursor-not-allowed'
                    : 'bg-[#1f6feb] hover:bg-[#388bfd] border-[#30363d] text-white'
                }`}
              >
                <span>increment()</span>
                <span className="text-[10px] opacity-80 font-normal">count += 1</span>
              </button>

              <button
                onClick={() => handleExecuteInstruction('decrement')}
                disabled={!counterState.isInitialized}
                className={`p-2.5 text-xs font-semibold rounded border transition-all flex flex-col items-center gap-1 ${
                  !counterState.isInitialized
                    ? 'bg-[#0d1117]/50 border-[#30363d] text-[#8b949e] cursor-not-allowed'
                    : 'bg-[#21262d] hover:bg-[#30363d] border-[#30363d] text-[#c9d1d9]'
                }`}
              >
                <span>decrement()</span>
                <span className="text-[10px] opacity-80 font-normal">count -= 1</span>
              </button>

              <button
                onClick={() => handleExecuteInstruction('reset')}
                disabled={!counterState.isInitialized}
                className={`p-2.5 text-xs font-semibold rounded border transition-all flex flex-col items-center gap-1 ${
                  !counterState.isInitialized
                    ? 'bg-[#0d1117]/50 border-[#30363d] text-[#8b949e] cursor-not-allowed'
                    : 'bg-[#d29922]/20 hover:bg-[#d29922]/30 border-[#d29922]/50 text-[#ffa657]'
                }`}
              >
                <span>reset()</span>
                <span className="text-[10px] opacity-80 font-normal">count = 0</span>
              </button>

              <button
                onClick={() => handleExecuteInstruction('close')}
                disabled={!counterState.isInitialized}
                className={`p-2.5 text-xs font-semibold rounded border transition-all flex flex-col items-center gap-1 ${
                  !counterState.isInitialized
                    ? 'bg-[#0d1117]/50 border-[#30363d] text-[#8b949e] cursor-not-allowed'
                    : 'bg-[#f85149]/20 hover:bg-[#f85149]/30 border-[#f85149]/50 text-[#ff7b72]'
                }`}
              >
                <span>close()</span>
                <span className="text-[10px] opacity-80 font-normal">Refund Rent SOL</span>
              </button>
            </div>

            {/* Quick Attack Simulator Alert */}
            <div className="p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#ff7b72] shrink-0" />
                <span className="text-xs text-[#c9d1d9]">
                  <strong>Access Control Test:</strong> Select <em>Bob (Attacker)</em> and click <em>increment()</em> to test if Anchor rejects unauthorized signers with <code className="text-[#ff7b72]">HasOneMismatch</code>.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: ACCOUNT STATE INSPECTOR & LOG TERMINAL */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* On-Chain PDA Account Inspector */}
          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-xs font-mono font-bold uppercase text-[#58a6ff] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>On-Chain Account Byte Inspector</span>
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded ${counterState.isInitialized ? 'bg-[#238636]/20 text-[#7ee787] border border-[#238636]/60' : 'bg-[#0d1117] text-[#8b949e] border border-[#30363d]'}`}>
                {counterState.isInitialized ? 'Active (Rent Exempt)' : 'Uninitialized (0B)'}
              </span>
            </div>

            {/* Account Metadata */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded border border-[#30363d]">
                <span className="text-[#8b949e]">PDA Address:</span>
                <span className="text-[#d2a8ff] font-bold truncate max-w-[220px]">{counterState.address}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded border border-[#30363d]">
                <span className="text-[#8b949e]">Owner Authority:</span>
                <span className="text-[#58a6ff] font-bold truncate max-w-[220px]">{counterState.authority}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded border border-[#30363d]">
                <span className="text-[#8b949e]">Current Count (u64):</span>
                <span className="text-[#ffa657] text-sm font-bold">{counterState.count}</span>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#0d1117] rounded border border-[#30363d]">
                <span className="text-[#8b949e]">Bump Seed (u8):</span>
                <span className="text-[#7ee787] font-bold">{counterState.bump}</span>
              </div>
            </div>

            {/* Account Byte Memory Layout */}
            <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2 font-mono text-[11px]">
              <span className="text-[#8b949e] font-bold uppercase block border-b border-[#30363d] pb-1">
                49-Byte Memory Layout Mapping
              </span>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-1.5 bg-[#161b22] border border-[#30363d] rounded">
                  <span className="text-[#d2a8ff] font-semibold">Bytes 0..8 (8B): Discriminator</span>
                  <span className="text-[#8b949e]">{counterState.discriminatorHex}</span>
                </div>

                <div className="flex items-center justify-between p-1.5 bg-[#161b22] border border-[#30363d] rounded">
                  <span className="text-[#58a6ff] font-semibold">Bytes 8..40 (32B): Authority</span>
                  <span className="text-[#8b949e] truncate max-w-[150px]">{counterState.authority}</span>
                </div>

                <div className="flex items-center justify-between p-1.5 bg-[#161b22] border border-[#30363d] rounded">
                  <span className="text-[#ffa657] font-semibold">Bytes 40..48 (8B): Count (u64)</span>
                  <span className="text-[#ffa657] font-bold">0x{counterState.count.toString(16).padStart(16, '0')}</span>
                </div>

                <div className="flex items-center justify-between p-1.5 bg-[#161b22] border border-[#30363d] rounded">
                  <span className="text-[#7ee787] font-semibold">Byte 48 (1B): Bump (u8)</span>
                  <span className="text-[#7ee787] font-bold">0x{counterState.bump.toString(16)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Logs Output Stream */}
          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-lg flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="text-xs font-mono font-bold uppercase text-[#7ee787] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>Solana Transaction Terminal Output</span>
              </span>
              <span className="text-[10px] font-mono text-[#8b949e]">Live Log Stream</span>
            </div>

            <div className="flex-1 max-h-[360px] overflow-y-auto space-y-3 font-mono text-xs bg-[#0d1117] p-3 rounded border border-[#30363d]">
              {txLogs.length === 0 ? (
                <div className="text-[#8b949e] text-center py-8">
                  No transactions executed yet. Click an instruction button above.
                </div>
              ) : (
                txLogs.map((tx) => (
                  <div key={tx.id} className="border-b border-[#30363d] pb-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8b949e]">{tx.timestamp}</span>
                      <span className={`font-bold flex items-center gap-1 ${tx.status === 'success' ? 'text-[#7ee787]' : 'text-[#ff7b72]'}`}>
                        {tx.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {tx.instruction.toUpperCase()} {tx.status === 'success' ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </div>

                    <div className="text-[10px] text-[#8b949e]">
                      Sig: {tx.signature} | CU: {tx.computeUnitsUsed}
                    </div>

                    {tx.logs.map((log, i) => (
                      <div key={i} className={`text-[11px] pl-2 border-l-2 ${log.includes('AnchorError') || log.includes('failed') ? 'border-[#f85149] text-[#ff7b72]' : 'border-[#30363d] text-[#c9d1d9]'}`}>
                        {log}
                      </div>
                    ))}

                    {tx.errorMessage && (
                      <div className="p-1.5 text-[11px] bg-[#f85149]/20 border border-[#f85149]/50 text-[#ff7b72] rounded font-semibold mt-1">
                        ⚠️ {tx.errorMessage}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
