//! Motor de Simulação de Execução da Solana Virtual Machine (SVM) e Processamento de Instruções em Rust.

use crate::memory::{
    calculate_minimum_balance_for_rent_exemption, compute_anchor_discriminator_hex,
    USER_COUNTER_SPACE,
};
use crate::pda::derive_canonical_counter_pda;
use crate::types::{AccountMemoryState, TransactionLog, VirtualWallet};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SvmSimulatorState {
    pub program_id: String,
    pub counter_account: Option<AccountMemoryState>,
    pub wallets: Vec<VirtualWallet>,
    pub tx_history: Vec<TransactionLog>,
    pub next_tx_id: u64,
}

impl SvmSimulatorState {
    pub fn new(program_id: &str) -> Self {
        let wallets = vec![
            VirtualWallet {
                id: "alice".to_string(),
                name: "Alice (Autoridade / Proprietária)".to_string(),
                pubkey: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R".to_string(),
                role: "Proprietária (Autoridade)".to_string(),
                balance_lamports: 5_000_000_000, // 5 SOL
            },
            VirtualWallet {
                id: "bob".to_string(),
                name: "Bob (Atacante / Impostor)".to_string(),
                pubkey: "8rA4wJkC3mGk4rK2k7B5tE1X9yZ6wL8vN3mQ5pS7tU9V".to_string(),
                role: "Atacante / Impostor".to_string(),
                balance_lamports: 2_000_000_000, // 2 SOL
            },
            VirtualWallet {
                id: "carol".to_string(),
                name: "Carol (Usuária Padrão)".to_string(),
                pubkey: "3mK8vN2pS5tU7wL9xZ1yB4tE6rK8mG2k4k3Dyjzvzp8e".to_string(),
                role: "Usuário Padrão".to_string(),
                balance_lamports: 1_500_000_000, // 1.5 SOL
            },
        ];

        Self {
            program_id: program_id.to_string(),
            counter_account: None,
            wallets,
            tx_history: Vec::new(),
            next_tx_id: 1,
        }
    }

    /// Processa uma instrução do contrato Anchor simulando as restrições da SVM
    pub fn process_instruction(
        &mut self,
        instruction_name: &str,
        signer_pubkey: &str,
        has_has_one_constraint: bool,
    ) -> Result<TransactionLog, String> {
        let pda_result = derive_canonical_counter_pda(&self.program_id, signer_pubkey, "counter")?;
        let pda_address = pda_result.pda_address;
        let bump = pda_result.bump;

        let tx_id = format!("tx_{:04}", self.next_tx_id);
        self.next_tx_id += 1;
        let now_ms = 1_700_000_000_000 + (self.next_tx_id * 1000);
        let signature = format!("5Kz...{:04x}", self.next_tx_id * 739);

        let mut logs = vec![
            format!("Program {} invoke [1]", self.program_id),
            format!("Program log: Instruction: {}", instruction_name),
        ];

        match instruction_name {
            "initialize" => {
                let rent_lamports = calculate_minimum_balance_for_rent_exemption(USER_COUNTER_SPACE);
                let disc_hex = compute_anchor_discriminator_hex("UserCounter");

                // Deduz o aluguel do assinante
                if let Some(w) = self.wallets.iter_mut().find(|w| w.pubkey == signer_pubkey) {
                    if w.balance_lamports < rent_lamports + 5000 {
                        return Err("Saldo insuficiente para pagar o aluguel de rent-exemption.".to_string());
                    }
                    w.balance_lamports -= rent_lamports + 5000; // Aluguel + taxa de tx de 5000 lamports
                }

                self.counter_account = Some(AccountMemoryState {
                    is_initialized: true,
                    address: pda_address.clone(),
                    authority: signer_pubkey.to_string(),
                    count: 0,
                    bump,
                    lamports: rent_lamports,
                    space_bytes: USER_COUNTER_SPACE,
                    discriminator_hex: disc_hex,
                    raw_data_bytes: vec![0u8; USER_COUNTER_SPACE],
                });

                logs.push(format!("Program log: PDA {} criado com sucesso.", pda_address));
                logs.push(format!("Program log: Autoridade vinculada: {}", signer_pubkey));
                logs.push(format!("Program log: Espaço alocado: 49 bytes | Isenção de aluguel: {} lamports", rent_lamports));
                logs.push(format!("Program {} consumed 4230 of 200000 compute units", self.program_id));
                logs.push(format!("Program {} success", self.program_id));

                let tx_log = TransactionLog {
                    id: tx_id,
                    timestamp_ms: now_ms,
                    signature,
                    signer_pubkey: signer_pubkey.to_string(),
                    instruction_name: "initialize".to_string(),
                    is_success: true,
                    compute_units_consumed: 4230,
                    logs,
                    error_message: None,
                };
                self.tx_history.push(tx_log.clone());
                Ok(tx_log)
            }

            "increment" => {
                let counter = self.counter_account.as_mut().ok_or_else(|| {
                    "A conta do contador não foi inicializada ainda. Execute initialize primeiro.".to_string()
                })?;

                // Verificação de Restrição has_one
                if has_has_one_constraint && counter.authority != signer_pubkey {
                    logs.push(format!(
                        "Program log: AnchorError thrown in programs/solana_sandbox_counter/src/lib.rs:47. Error Code: ConstraintHasOne."
                    ));
                    logs.push(format!(
                        "Program log: Uma restrição 'has_one' foi violada. Esperado: {}, Fornecido: {}",
                        counter.authority, signer_pubkey
                    ));
                    logs.push(format!("Program {} consumed 1850 of 200000 compute units", self.program_id));
                    logs.push(format!("Program {} failed: custom program error: 0x7d1 (ConstraintHasOne)", self.program_id));

                    let tx_log = TransactionLog {
                        id: tx_id,
                        timestamp_ms: now_ms,
                        signature,
                        signer_pubkey: signer_pubkey.to_string(),
                        instruction_name: "increment".to_string(),
                        is_success: false,
                        compute_units_consumed: 1850,
                        logs,
                        error_message: Some("AnchorError: ConstraintHasOne - Assinante não autorizado!".to_string()),
                    };
                    self.tx_history.push(tx_log.clone());
                    return Ok(tx_log);
                }

                counter.count = counter.count.saturating_add(1);

                logs.push(format!("Program log: Contador incrementado para {}", counter.count));
                logs.push(format!("Program {} consumed 1120 of 200000 compute units", self.program_id));
                logs.push(format!("Program {} success", self.program_id));

                let tx_log = TransactionLog {
                    id: tx_id,
                    timestamp_ms: now_ms,
                    signature,
                    signer_pubkey: signer_pubkey.to_string(),
                    instruction_name: "increment".to_string(),
                    is_success: true,
                    compute_units_consumed: 1120,
                    logs,
                    error_message: None,
                };
                self.tx_history.push(tx_log.clone());
                Ok(tx_log)
            }

            "decrement" => {
                let counter = self.counter_account.as_mut().ok_or_else(|| {
                    "A conta do contador não foi inicializada ainda.".to_string()
                })?;

                if has_has_one_constraint && counter.authority != signer_pubkey {
                    let tx_log = TransactionLog {
                        id: tx_id,
                        timestamp_ms: now_ms,
                        signature,
                        signer_pubkey: signer_pubkey.to_string(),
                        instruction_name: "decrement".to_string(),
                        is_success: false,
                        compute_units_consumed: 1850,
                        logs: vec![
                            format!("Program {} invoke [1]", self.program_id),
                            "Program log: ConstraintHasOne violada.".to_string(),
                            format!("Program {} failed: 0x7d1", self.program_id),
                        ],
                        error_message: Some("ConstraintHasOne violada.".to_string()),
                    };
                    self.tx_history.push(tx_log.clone());
                    return Ok(tx_log);
                }

                if counter.count == 0 {
                    let tx_log = TransactionLog {
                        id: tx_id,
                        timestamp_ms: now_ms,
                        signature,
                        signer_pubkey: signer_pubkey.to_string(),
                        instruction_name: "decrement".to_string(),
                        is_success: false,
                        compute_units_consumed: 950,
                        logs: vec![
                            format!("Program {} invoke [1]", self.program_id),
                            "Program log: Error Code: Underflow (Contador já está em 0)".to_string(),
                            format!("Program {} failed: Underflow", self.program_id),
                        ],
                        error_message: Some("Erro de Underflow: Não é possível decrementar abaixo de zero em u64.".to_string()),
                    };
                    self.tx_history.push(tx_log.clone());
                    return Ok(tx_log);
                }

                counter.count -= 1;
                logs.push(format!("Program log: Contador decrementado para {}", counter.count));
                logs.push(format!("Program {} consumed 1080 compute units", self.program_id));
                logs.push(format!("Program {} success", self.program_id));

                let tx_log = TransactionLog {
                    id: tx_id,
                    timestamp_ms: now_ms,
                    signature,
                    signer_pubkey: signer_pubkey.to_string(),
                    instruction_name: "decrement".to_string(),
                    is_success: true,
                    compute_units_consumed: 1080,
                    logs,
                    error_message: None,
                };
                self.tx_history.push(tx_log.clone());
                Ok(tx_log)
            }

            "reset" => {
                let counter = self.counter_account.as_mut().ok_or_else(|| {
                    "A conta do contador não foi inicializada.".to_string()
                })?;

                if has_has_one_constraint && counter.authority != signer_pubkey {
                    let tx_log = TransactionLog {
                        id: tx_id,
                        timestamp_ms: now_ms,
                        signature,
                        signer_pubkey: signer_pubkey.to_string(),
                        instruction_name: "reset".to_string(),
                        is_success: false,
                        compute_units_consumed: 1850,
                        logs: vec!["ConstraintHasOne violada.".to_string()],
                        error_message: Some("Assinante não autorizado.".to_string()),
                    };
                    self.tx_history.push(tx_log.clone());
                    return Ok(tx_log);
                }

                counter.count = 0;
                logs.push("Program log: Contador zerado para 0 pela autoridade.".to_string());
                logs.push(format!("Program {} success", self.program_id));

                let tx_log = TransactionLog {
                    id: tx_id,
                    timestamp_ms: now_ms,
                    signature,
                    signer_pubkey: signer_pubkey.to_string(),
                    instruction_name: "reset".to_string(),
                    is_success: true,
                    compute_units_consumed: 990,
                    logs,
                    error_message: None,
                };
                self.tx_history.push(tx_log.clone());
                Ok(tx_log)
            }

            "close" => {
                let counter = self.counter_account.as_mut().ok_or_else(|| {
                    "A conta não existe para ser fechada.".to_string()
                })?;

                if has_has_one_constraint && counter.authority != signer_pubkey {
                    let tx_log = TransactionLog {
                        id: tx_id,
                        timestamp_ms: now_ms,
                        signature,
                        signer_pubkey: signer_pubkey.to_string(),
                        instruction_name: "close".to_string(),
                        is_success: false,
                        compute_units_consumed: 1850,
                        logs: vec!["Apenas a autoridade pode fechar a conta.".to_string()],
                        error_message: Some("Apenas a autoridade pode fechar a conta.".to_string()),
                    };
                    self.tx_history.push(tx_log.clone());
                    return Ok(tx_log);
                }

                let refund_lamports = counter.lamports;
                if let Some(w) = self.wallets.iter_mut().find(|w| w.pubkey == signer_pubkey) {
                    w.balance_lamports += refund_lamports;
                }
                self.counter_account = None;

                logs.push(format!("Program log: Conta encerrada. {} lamports devolvidos para {}.", refund_lamports, signer_pubkey));
                logs.push(format!("Program {} success", self.program_id));

                let tx_log = TransactionLog {
                    id: tx_id,
                    timestamp_ms: now_ms,
                    signature,
                    signer_pubkey: signer_pubkey.to_string(),
                    instruction_name: "close".to_string(),
                    is_success: true,
                    compute_units_consumed: 2100,
                    logs,
                    error_message: None,
                };
                self.tx_history.push(tx_log.clone());
                Ok(tx_log)
            }

            _ => Err(format!("Instrução desconhecida: {}", instruction_name)),
        }
    }
}
