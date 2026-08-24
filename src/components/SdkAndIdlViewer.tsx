import React, { useState } from 'react';
import { generateAnchorIdl, generateTypeScriptClientCode } from '../utils/solanaUtils';
import { FileCode, Copy, Download, CheckCircle2, Code2, Terminal, Layers, Github } from 'lucide-react';

interface SdkAndIdlViewerProps {
  code: string;
  onOpenGithub?: () => void;
}

export const SdkAndIdlViewer: React.FC<SdkAndIdlViewerProps> = ({ code, onOpenGithub }) => {
  const [programId] = useState<string>('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
  const [activeTab, setActiveTab] = useState<'idl' | 'ts' | 'rust' | 'python'>('ts');
  const [copied, setCopied] = useState<boolean>(false);

  const idl = generateAnchorIdl(code, programId);
  const tsCode = generateTypeScriptClientCode(programId, '2X7m...pda');

  const rustClientSnippet = `use anchor_client::{
    solana_sdk::{
        commitment_config::CommitmentConfig,
        pubkey::Pubkey,
        signature::{Keypair, Signer},
    },
    Client, Cluster,
};
use std::rc::Rc;
use std::str::FromStr;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let program_id = Pubkey::from_str("${programId}")?;
    let payer = Keypair::new();
    
    let client = Client::new_with_options(
        Cluster::Localnet,
        Rc::new(payer),
        CommitmentConfig::confirmed(),
    );

    let program = client.program(program_id)?;

    // Derive PDA on Rust Client
    let (counter_pda, bump) = Pubkey::find_program_address(
        &[b"counter", program.payer().as_ref()],
        &program_id,
    );

    println!("Derived PDA: {}", counter_pda);

    Ok(())
}
`;

  const pythonSnippet = `from anchorpy import Provider, Program, Wallet
from solana.rpc.api import Client
from solders.pubkey import Pubkey

# Connect to Solana Devnet / Localnet
client = Client("http://127.0.0.1:8899")
wallet = Wallet.local()
provider = Provider(client, wallet)

program_id = Pubkey.from_string("${programId}")

# Find PDA
seeds = [bytes("counter", "utf-8"), bytes(wallet.public_key)]
counter_pda, bump = Pubkey.find_program_address(seeds, program_id)

print(f"Counter PDA: {counter_pda}, Bump: {bump}")
`;

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'idl':
        return JSON.stringify(idl, null, 2);
      case 'ts':
        return tsCode;
      case 'rust':
        return rustClientSnippet;
      case 'python':
        return pythonSnippet;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getCurrentContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const content = getCurrentContent();
    let filename = 'solana_counter_sdk.ts';
    if (activeTab === 'idl') filename = 'solana_sandbox_counter.json';
    if (activeTab === 'rust') filename = 'client.rs';
    if (activeTab === 'python') filename = 'client.py';

    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#0d1117] text-[#c9d1d9] p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#30363d]">
          <div>
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-[#ffa657]" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#c9d1d9]">
                Anchor IDL & Client SDK Generator
              </h1>
            </div>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Production-ready TypeScript `@coral-xyz/anchor` integration, unit tests, and JSON Interface Definition Language (IDL).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenGithub && (
              <button
                onClick={onOpenGithub}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors"
                title="Exportar IDL e Workspace para o GitHub"
              >
                <Github className="w-3.5 h-3.5 text-white" />
                <span>Exportar para GitHub</span>
              </button>
            )}

            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-[#7ee787]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Code'}</span>
            </button>

            <button
              onClick={downloadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] border border-[#30363d] rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* TAB HEADERS */}
        <div className="flex items-center gap-1 bg-[#161b22] p-1 rounded-md border border-[#30363d] w-fit font-mono text-xs">
          <button
            onClick={() => setActiveTab('ts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'ts'
                ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d] font-semibold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>TypeScript SDK</span>
          </button>

          <button
            onClick={() => setActiveTab('idl')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'idl'
                ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d] font-semibold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#ffa657]" />
            <span>IDL JSON</span>
          </button>

          <button
            onClick={() => setActiveTab('rust')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'rust'
                ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d] font-semibold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#d2a8ff]" />
            <span>Rust Client</span>
          </button>

          <button
            onClick={() => setActiveTab('python')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'python'
                ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d] font-semibold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#7ee787]" />
            <span>Python AnchorPy</span>
          </button>
        </div>

        {/* CODE DISPLAY BOX */}
        <div className="relative bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs font-mono text-[#8b949e]">
            <span>
              {activeTab === 'ts' && 'tests/solana_sandbox_counter.ts'}
              {activeTab === 'idl' && 'target/idl/solana_sandbox_counter.json'}
              {activeTab === 'rust' && 'client/src/main.rs'}
              {activeTab === 'python' && 'client.py'}
            </span>
            <span className="text-[10px] text-[#7ee787] font-medium uppercase">Ready for Deployment</span>
          </div>

          <pre className="p-4 sm:p-6 font-mono text-xs text-[#c9d1d9] leading-relaxed overflow-x-auto max-h-[550px]">
            {getCurrentContent()}
          </pre>
        </div>
      </div>
    </div>
  );
};
