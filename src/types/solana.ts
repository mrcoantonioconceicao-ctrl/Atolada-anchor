export interface AuditIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'pass';
  title: string;
  description: string;
  line?: number;
  codeSnippet?: string;
  recommendation: string;
  category:
    | 'PDA'
    | 'Access Control'
    | 'Controle de Acesso'
    | 'Account Validation'
    | 'Validação de Conta'
    | 'Math / Overflow'
    | 'Matemática / Overflow'
    | 'Rent / Space'
    | 'Rent / Espaço'
    | 'Best Practice'
    | 'Boas Práticas'
    | string;
  fixAction?: {
    label: string;
    patchCode: string;
  };
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

export interface ParsedAnchorContract {
  programName: string;
  programId: string;
  instructions: {
    name: string;
    args: { name: string; type: string }[];
    accountsContextName: string;
  }[];
  accountsStructs: {
    name: string;
    fields: { name: string; type: string; isPubkey: boolean }[];
    constraints: {
      accountName: string;
      isInit?: boolean;
      isMut?: boolean;
      seeds?: string[];
      bump?: string;
      hasOne?: string;
      spaceExpr?: string;
      calculatedSpace?: number;
    }[];
  }[];
}

export interface CodeTemplate {
  id: string;
  title: string;
  description: string;
  code: string;
}
