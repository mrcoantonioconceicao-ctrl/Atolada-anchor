import React, { useState } from 'react';
import {
  generateAnchorIdl,
  generateTypeScriptClientCode,
  simulateAnchorDevnetDeployment,
  calculateDevnetDeploymentCost,
  estimateContractBytecodeSize,
  extractAnchorProgramMetadata,
} from '../utils/solanaUtils';
import { DeploymentSimulationResult } from '../types/solana';
import {
  FileCode,
  Copy,
  Download,
  CheckCircle2,
  Code2,
  Terminal,
  Layers,
  Github,
  Rocket,
  ShieldCheck,
  Cpu,
  Coins,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';

interface SdkAndIdlViewerProps {
  code: string;
  onOpenGithub?: () => void;
}

export const SdkAndIdlViewer: React.FC<SdkAndIdlViewerProps> = ({ code, onOpenGithub }) => {
  const [programId] = useState<string>('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
  const [activeTab, setActiveTab] = useState<'idl' | 'ts' | 'rust' | 'python' | 'deploy'>('ts');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<DeploymentSimulationResult | null>(null);

  const idl = generateAnchorIdl(code, programId);
  const tsCode = generateTypeScriptClientCode(programId, '2X7m...pda');
  const metadata = extractAnchorProgramMetadata(code);
  const estimatedBytes = estimateContractBytecodeSize(code);
  const costEstimate = calculateDevnetDeploymentCost(estimatedBytes);

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
    let program_id = Pubkey::from_str("${metadata.programId}")?;
    let payer = Keypair::new();
    
    let client = Client::new_with_options(
        Cluster::Devnet,
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

# Connect to Solana Devnet
client = Client("https://api.devnet.solana.com")
wallet = Wallet.local()
provider = Provider(client, wallet)

program_id = Pubkey.from_string("${metadata.programId}")

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
      case 'deploy':
        return simulationResult ? simulationResult.logs.join('\n') : '// Clique em "Executar Dry-Run no Devnet" para simular a implantação.';
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
    if (activeTab === 'deploy') filename = 'devnet_deployment_report.log';

    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleRunDeploymentDryRun = async () => {
    setIsSimulating(true);
    try {
      const result = await simulateAnchorDevnetDeployment(code, { cluster: 'devnet' });
      setSimulationResult(result);
      setActiveTab('deploy');
    } catch (err) {
      console.error('Deployment dry run failed:', err);
    } finally {
      setIsSimulating(false);
    }
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
                Anchor IDL, SDKs & Devnet Deployment Dry-Run
              </h1>
            </div>
            <p className="text-xs text-[#8b949e] mt-0.5">
              Especificação IDL, SDKs clientes em TypeScript/Rust/Python e simulador de implantação no Solana Devnet via Anchor BPF Loader Upgradeable.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRunDeploymentDryRun}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1f6feb] hover:bg-[#388bfd] disabled:opacity-50 border border-[#30363d] rounded transition-colors shadow-sm"
              title="Simular e auditar a implantação no Solana Devnet"
            >
              {isSimulating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Simulando...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-3.5 h-3.5 text-white" />
                  <span>Simular Deploy no Devnet</span>
                </>
              )}
            </button>

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
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={downloadFile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#238636] hover:bg-[#2ea043] border border-[#30363d] rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-white" />
              <span>Baixar Arquivo</span>
            </button>
          </div>
        </div>

        {/* TAB HEADERS */}
        <div className="flex items-center gap-1 bg-[#161b22] p-1 rounded-md border border-[#30363d] w-fit font-mono text-xs flex-wrap">
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

          <button
            onClick={() => {
              setActiveTab('deploy');
              if (!simulationResult) {
                handleRunDeploymentDryRun();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
              activeTab === 'deploy'
                ? 'bg-[#1f6feb26] text-[#58a6ff] border border-[#30363d] font-semibold'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Devnet Dry-Run</span>
          </button>
        </div>

        {/* SPECIAL DEVNET DEPLOYMENT TAB VIEW */}
        {activeTab === 'deploy' ? (
          <div className="space-y-4">
            {/* Deployment Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
                <div className="text-[11px] text-[#8b949e] font-mono flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#58a6ff]" />
                  Tamanho Binário ELF
                </div>
                <div className="text-sm font-bold text-white mt-1 font-mono">
                  {(estimatedBytes / 1024).toFixed(1)} KB
                </div>
                <div className="text-[10px] text-[#8b949e]">{costEstimate.chunkCount} transações em blocos</div>
              </div>

              <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
                <div className="text-[11px] text-[#8b949e] font-mono flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#7ee787]" />
                  Custo Exigido no Devnet
                </div>
                <div className="text-sm font-bold text-[#7ee787] mt-1 font-mono">
                  ~{costEstimate.totalCostSol.toFixed(4)} SOL
                </div>
                <div className="text-[10px] text-[#8b949e]">Isenção de Aluguel + Taxas</div>
              </div>

              <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
                <div className="text-[11px] text-[#8b949e] font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#d2a8ff]" />
                  Auditoria Pre-Flight
                </div>
                <div className="text-sm font-bold text-white mt-1 font-mono">
                  {simulationResult ? `${simulationResult.auditScore}/100` : 'Pendente'}
                </div>
                <div className="text-[10px] text-[#7ee787]">
                  {simulationResult?.isAuditPassed ? 'Aprovado para Devnet ✅' : 'Requer Atenção'}
                </div>
              </div>

              <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg">
                <div className="text-[11px] text-[#8b949e] font-mono flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-[#ffa657]" />
                  Cluster & Loader
                </div>
                <div className="text-sm font-bold text-white mt-1 font-mono truncate">
                  BPF Loader Upgradeable
                </div>
                <div className="text-[10px] text-[#58a6ff]">Cluster: Devnet</div>
              </div>
            </div>

            {/* Step by Step Execution Timeline */}
            {simulationResult && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#7ee787]" />
                    Pipeline de Dry-Run & Implantação
                  </span>
                  <button
                    onClick={handleRunDeploymentDryRun}
                    disabled={isSimulating}
                    className="flex items-center gap-1 text-[11px] text-[#58a6ff] hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reexecutar Simulação</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {simulationResult.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-[#0d1117] border border-[#30363d] rounded text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{step.name}</span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] rounded font-mono ${
                            step.status === 'success'
                              ? 'bg-[#238636]/20 text-[#7ee787] border border-[#238636]/50'
                              : step.status === 'warning'
                              ? 'bg-[#d29922]/20 text-[#d29922] border border-[#d29922]/50'
                              : 'bg-[#da3633]/20 text-[#f85149] border border-[#da3633]/50'
                          }`}
                        >
                          {step.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8b949e]">{step.details}</p>
                      {step.txSignature && (
                        <div className="text-[10px] font-mono text-[#58a6ff] truncate">
                          Tx Sig: {step.txSignature} {step.computeUnits && `(${step.computeUnits} CU)`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terminal RPC Logs */}
            <div className="relative bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs font-mono text-[#8b949e]">
                <span>logs/solana_devnet_deployment.log</span>
                <span className="text-[10px] text-[#7ee787] font-medium uppercase">RPC Dry-Run Active</span>
              </div>
              <pre className="p-4 sm:p-6 font-mono text-xs text-[#c9d1d9] leading-relaxed overflow-x-auto max-h-[350px]">
                {simulationResult ? simulationResult.logs.join('\n') : '// Executando simulação...'}
              </pre>
            </div>
          </div>
        ) : (
          /* CODE DISPLAY BOX */
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
        )}
      </div>
    </div>
  );
};
