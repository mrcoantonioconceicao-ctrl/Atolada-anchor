//! Gerador de Anchor IDL (Interface Definition Language) e bindings em Rust puro.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnchorIdlAccountField {
    pub name: String,
    pub is_mut: bool,
    pub is_signer: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnchorIdlInstruction {
    pub name: String,
    pub accounts: Vec<AnchorIdlAccountField>,
    pub args: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnchorIdlStructField {
    pub name: String,
    #[serde(rename = "type")]
    pub field_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnchorIdlAccountType {
    pub name: String,
    #[serde(rename = "type")]
    pub type_def: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnchorIdl {
    pub version: String,
    pub name: String,
    pub instructions: Vec<AnchorIdlInstruction>,
    pub accounts: Vec<AnchorIdlAccountType>,
    pub metadata: serde_json::Value,
}

/// Gera a representação oficial do IDL JSON a partir do código do programa Anchor
pub fn generate_anchor_idl(program_id: &str, has_reset: bool, has_close: bool) -> AnchorIdl {
    let mut instructions = vec![
        AnchorIdlInstruction {
            name: "initialize".to_string(),
            accounts: vec![
                AnchorIdlAccountField {
                    name: "counter".to_string(),
                    is_mut: true,
                    is_signer: false,
                },
                AnchorIdlAccountField {
                    name: "authority".to_string(),
                    is_mut: true,
                    is_signer: true,
                },
                AnchorIdlAccountField {
                    name: "systemProgram".to_string(),
                    is_mut: false,
                    is_signer: false,
                },
            ],
            args: vec![],
        },
        AnchorIdlInstruction {
            name: "increment".to_string(),
            accounts: vec![
                AnchorIdlAccountField {
                    name: "counter".to_string(),
                    is_mut: true,
                    is_signer: false,
                },
                AnchorIdlAccountField {
                    name: "authority".to_string(),
                    is_mut: false,
                    is_signer: true,
                },
            ],
            args: vec![],
        },
        AnchorIdlInstruction {
            name: "decrement".to_string(),
            accounts: vec![
                AnchorIdlAccountField {
                    name: "counter".to_string(),
                    is_mut: true,
                    is_signer: false,
                },
                AnchorIdlAccountField {
                    name: "authority".to_string(),
                    is_mut: false,
                    is_signer: true,
                },
            ],
            args: vec![],
        },
    ];

    if has_reset {
        instructions.push(AnchorIdlInstruction {
            name: "reset".to_string(),
            accounts: vec![
                AnchorIdlAccountField {
                    name: "counter".to_string(),
                    is_mut: true,
                    is_signer: false,
                },
                AnchorIdlAccountField {
                    name: "authority".to_string(),
                    is_mut: false,
                    is_signer: true,
                },
            ],
            args: vec![],
        });
    }

    if has_close {
        instructions.push(AnchorIdlInstruction {
            name: "close".to_string(),
            accounts: vec![
                AnchorIdlAccountField {
                    name: "counter".to_string(),
                    is_mut: true,
                    is_signer: false,
                },
                AnchorIdlAccountField {
                    name: "authority".to_string(),
                    is_mut: true,
                    is_signer: true,
                },
            ],
            args: vec![],
        });
    }

    AnchorIdl {
        version: "0.1.0".to_string(),
        name: "solana_sandbox_counter".to_string(),
        instructions,
        accounts: vec![AnchorIdlAccountType {
            name: "UserCounter".to_string(),
            type_def: serde_json::json!({
                "kind": "struct",
                "fields": [
                    { "name": "authority", "type": "publicKey" },
                    { "name": "count", "type": "u64" },
                    { "name": "bump", "type": "u8" }
                ]
            }),
        }],
        metadata: serde_json::json!({
            "address": program_id
        }),
    }
}
