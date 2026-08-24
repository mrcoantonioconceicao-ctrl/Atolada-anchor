/**
//! Definições de Tipos e Interfaces do Solana Architect Core
//! Sincronizado com os structs do crate Rust `crates/solana-architect-core`
*/

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';

export interface FixAction {
  label: string;
  patchCode: string;
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
