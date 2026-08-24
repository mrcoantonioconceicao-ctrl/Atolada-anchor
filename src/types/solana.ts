/**
//! Definições de Tipos e Interfaces do Solana Architect Core
//! Sincronizado com os structs do crate Rust `crates/solana-architect-core`
*/

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';

export interface AutoFixModification {
  startLine: number;
  endLine: number;
  oldSnippet: string;
  newSnippet: string;
  description: string;
}

export interface AutoFixResult {
  success: boolean;
  updatedCode: string;
  ruleApplied: string;
  vulnerabilityId: string;
  modifiedLines: AutoFixModification[];
  auditLog: string[];
  previousScore: number;
  newScore: number;
  error?: string;
}

export interface FixAction {
  label: string;
  patchCode: string;
  vulnerabilityId?: string;
}

export interface AuditIssue {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  line?: number;
  codeSnippet?: string;
  recommendation: string;
  category:
    | 'PDA & Bump Canônico'
    | 'Controle de Acesso'
    | 'Validação de Conta'
    | 'Matemática / Overflow'
    | 'Rent / Espaço'
    | 'Encerramento & Reembolso'
    | 'Verificação de Assinante'
    | 'Boas Práticas Anchor'
    | string;
  fixAction?: FixAction;
}

export interface AuditReport {
  score: number;
  totalRulesEvaluated: number;
  passedChecks: number;
  issues: AuditIssue[];
  isProductionReady: boolean;
}

export interface VirtualWallet {
  id: string;
  name: string;
  pubkey: string;
  role:
    | 'Owner (Authority)'
    | 'Proprietária (Autoridade)'
    | 'Attacker / Impersonator'
    | 'Atacante / Impostor'
    | 'Standard User'
    | 'Usuário Padrão'
    | string;
  balanceSol: number;
}

export interface UserCounterAccountState {
  isInitialized: boolean;
  address: string;
  authority: string;
  count: number;
  bump: number;
  lamports: number;
  spaceBytes: number;
  discriminatorHex: string;
}

export interface TxLogEntry {
  id: string;
  timestamp: string;
  signature: string;
  signer: string;
  instruction: string;
  status: 'success' | 'error';
  computeUnitsUsed: number;
  logs: string[];
  errorMessage?: string;
  stateDelta?: string;
}

export interface PdaDerivationResult {
  success: boolean;
  pdaAddress: string;
  bump: number;
  seed1Hex: string;
  seed1String: string;
  seed2Base58: string;
  seed2Hex: string;
  isOffCurve: boolean;
  iterationsCount?: number;
  error?: string;
}

export interface CodeTemplate {
  id: string;
  title: string;
  description: string;
  code: string;
}

export interface DeploymentDryRunStep {
  name: string;
  status: 'pending' | 'in_progress' | 'success' | 'warning' | 'error';
  details: string;
  txSignature?: string;
  computeUnits?: number;
  lamportsDelta?: number;
}

export interface DeploymentSimulationResult {
  success: boolean;
  programId: string;
  programName: string;
  cluster: 'devnet' | 'testnet' | 'mainnet-beta' | 'localnet';
  deployerPubkey: string;
  upgradeAuthorityPubkey: string;
  estimatedBinarySizeBytes: number;
  bufferAccountPubkey: string;
  programDataPubkey: string;
  rentExemptionLamports: number;
  rentExemptionSol: number;
  estimatedTxFeesLamports: number;
  estimatedTxFeesSol: number;
  totalCostLamports: number;
  totalCostSol: number;
  auditScore: number;
  isAuditPassed: boolean;
  steps: DeploymentDryRunStep[];
  logs: string[];
  generatedIdl: any;
  deployedAt: string;
  errorMessage?: string;
}
