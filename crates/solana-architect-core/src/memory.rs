//! Módulo de layout de memória On-Chain e serialização de contas Anchor em Rust puro.

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;
pub const PUBKEY_SIZE: usize = 32;
pub const U64_SIZE: usize = 8;
pub const U8_SIZE: usize = 1;
pub const USER_COUNTER_SPACE: usize = ANCHOR_DISCRIMINATOR_SIZE + PUBKEY_SIZE + U64_SIZE + U8_SIZE; // 49 Bytes

/// Calcula o discriminador de conta de 8 bytes de acordo com o padrão do Anchor:
/// `first_8_bytes(SHA-256("account:<AccountName>"))`
pub fn compute_anchor_discriminator(account_name: &str) -> [u8; 8] {
    let preimage = format!("account:{}", account_name);
    let mut hasher = Sha256::new();
    hasher.update(preimage.as_bytes());
    let result = hasher.finalize();

    let mut discriminator = [0u8; 8];
    discriminator.copy_from_slice(&result[0..8]);
    discriminator
}

/// Retorna a representação hexadecimal do discriminador Anchor (ex: 0xaf12...)
pub fn compute_anchor_discriminator_hex(account_name: &str) -> String {
    let disc = compute_anchor_discriminator(account_name);
    format!(
        "0x{}",
        disc.iter().map(|b| format!("{:02x}", b)).collect::<String>()
    )
}

/// Fórmula oficial da Solana para cálculo de isenção de aluguel (Rent Exemption)
/// Considera a sobrecarga base de cabeçalho da conta Solana de 128 bytes e 2 anos de armazenamento.
pub fn calculate_minimum_balance_for_rent_exemption(space_bytes: usize) -> u64 {
    const ACCOUNT_STORAGE_OVERHEAD: usize = 128;
    const LAMPORTS_PER_BYTE_YEAR: f64 = 190_554_414_784.0 / (1024.0 * 1024.0);
    const EXEMPT_YEARS: f64 = 2.0;

    let total_bytes = (space_bytes + ACCOUNT_STORAGE_OVERHEAD) as f64;
    (total_bytes * LAMPORTS_PER_BYTE_YEAR * EXEMPT_YEARS).ceil() as u64
}

/// Estrutura do layout em bytes da conta UserCounter na memória da SVM
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySegment {
    pub name: String,
    pub offset: usize,
    pub size_bytes: usize,
    pub type_name: String,
    pub hex_representation: String,
    pub description: String,
}

/// Gera o mapeamento detalhado dos 49 bytes de uma conta UserCounter
pub fn build_user_counter_memory_layout(
    authority_pubkey: &str,
    count: u64,
    bump: u8,
) -> Vec<MemorySegment> {
    let disc = compute_anchor_discriminator("UserCounter");
    let disc_hex = disc.iter().map(|b| format!("{:02x}", b)).collect::<String>();

    let count_le_bytes = count.to_le_bytes();
    let count_hex = count_le_bytes
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>();

    vec![
        MemorySegment {
            name: "Discriminator Anchor".to_string(),
            offset: 0,
            size_bytes: 8,
            type_name: "[u8; 8]".to_string(),
            hex_representation: format!("0x{}", disc_hex),
            description: "Primeiros 8 bytes de SHA256(\"account:UserCounter\"). Valida o tipo de conta.".to_string(),
        },
        MemorySegment {
            name: "Authority".to_string(),
            offset: 8,
            size_bytes: 32,
            type_name: "Pubkey".to_string(),
            hex_representation: format!("32 bytes ({})", authority_pubkey),
            description: "Chave pública de 32 bytes do proprietário/autoridade da conta.".to_string(),
        },
        MemorySegment {
            name: "Count".to_string(),
            offset: 40,
            size_bytes: 8,
            type_name: "u64 (Little-Endian)".to_string(),
            hex_representation: format!("0x{} (valor: {})", count_hex, count),
            description: "Valor do contador inteiro sem sinal de 64 bits em formato little-endian.".to_string(),
        },
        MemorySegment {
            name: "Bump".to_string(),
            offset: 48,
            size_bytes: 1,
            type_name: "u8".to_string(),
            hex_representation: format!("0x{:02x} (valor: {})", bump, bump),
            description: "Semente canônica (canonical bump seed) da derivação do PDA.".to_string(),
        },
    ]
}
