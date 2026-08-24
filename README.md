# Solana Architect & Anchor Security Studio

![Solana Anchor Security Auditor](https://img.shields.io/badge/Solana-Anchor%20v0.30-purple?style=for-the-badge&logo=solana)
![Rust](https://img.shields.io/badge/Rust-2021%20Edition-DEA584?style=for-the-badge&logo=rust)
![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?style=for-the-badge&logo=firebase)
![GitHub REST API](https://img.shields.io/badge/GitHub%20API-Integration-black?style=for-the-badge&logo=github)

O **Solana Architect** é um ambiente de desenvolvimento (IDE) de ponta a ponta, motor de auditoria de segurança estática AST nativo em **Rust** (`crates/solana-architect-core`), simulador de execução On-Chain localnet (SVM), gerador de testes unitários (`solana-program-test`) e exportador de repositórios Anchor completos para o **GitHub**.

A plataforma foi projetada para desenvolvedores Web3, estudantes, engenheiros de protocolo e auditores de smart contracts verificarem restrições de contas, validarem a derivação criptográfica de PDAs (*Program Derived Addresses*), simularem transações e vetores de ataque em tempo real, e exportarem projetos Anchor diretamente para a nuvem.

---

## 📸 Recursos Principais

### 🦀 1. Rust Core Engine & CLI Standalone (`solana-architect-core`)
- **Motor 100% Nativo em Rust**:
  - `src/audit.rs`: Motor de auditoria estática de AST, regras Anchor (`has_one`, *canonical bumps*, alocação de rent e checagem de overflow aritmético).
  - `src/pda.rs`: Algoritmo determinístico de derivação de PDA e busca de bump canônico (255..0) com garantia de pontos fora da curva Ed25519.
  - `src/memory.rs`: Layout de memória SVM para contas de 49 bytes com cálculo de discriminador Anchor (`SHA-256("account:UserCounter")[..8]`) e fórmula canônica de isenção de aluguel (*Rent Exemption*).
  - `src/simulator.rs`: Simulador de máquina de estados SVM com contabilidade de *Compute Units (CU)* e controle de acesso.
  - `src/test_suite.rs`: Gerador dinâmico de testes assíncronos em Rust com `solana-program-test` e `tokio`.
  - `src/bin/cli.rs`: CLI standalone executável (`solana-architect audit|pda|idl|tests`).
- **Aba Interativa "Rust Core Engine"**: Navegue na árvore de arquivos do crate Rust, copie ou baixe os módulos e execute comandos no terminal CLI simulado em tempo real.

### 🛠️ 2. Rust IDE Web & Auditoria AST Interativa
- **Editor de Código Rust com Syntax Highlighting**: Suporte a templates de contratos Anchor (`user_counter`, `token_vault`, `staking_pda`, `unsecure_counter`).
- **Análise AST em Tempo Real**: Mapeamento de `declare_id!`, handlers de instrução (`initialize`, `increment`, `decrement`, `reset`, `close`), e verificação de estruturas de conta.
- **Auditor de Segurança Automático com Quick-Fix**:
  - Identificação de ausência de `has_one = authority`.
  - Validação de armazenamento de bumps canônicos.
  - Detecção de operações aritméticas sem validação (*overflow/underflow* sem `checked_add`/`checked_sub`).
  - Verificação de instrução de fechamento de conta (`close = authority`).

### 🐙 3. Exportação Direta para o GitHub ("Push to GitHub")
- **Integração nativa com a REST API do GitHub**:
  - Autenticação por Personal Access Token (PAT Classic ou Fine-Grained).
  - Suporte completo para repositórios **Públicos** e **Privados**.
  - Criação automática de **Novo Repositório** ou atualização de **Repositório Existente**.
  - **Pacote Workspace Anchor Completo**: Exporta estrutura pronta para produção com `programs/.../lib.rs`, `Anchor.toml`, `Cargo.toml`, `target/idl/*.json`, `client/index.ts` e `README.md` com selo de pontuação da auditoria.

### 🧪 4. Execution Sandbox & Simulador de Ataques On-Chain
- **Rede Localnet Simulada**: Teste a execução de instruções Anchor (`initialize`, `increment`, `decrement`, `reset`, `close`).
- **Inspetor de Memória de Conta (49 Bytes)**: Mapeamento em tempo real do layout em bytes da conta no ledger Solana:
  - `Bytes 0..8 (8B)`: Discriminador Anchor (`SHA-256("account:UserCounter")[..8]`).
  - `Bytes 8..40 (32B)`: Chave Pública da Autoridade (`Pubkey`).
  - `Bytes 40..48 (8B)`: Contador (`u64`).
  - `Byte 48 (1B)`: Bump Canônico (`u8`).
- **Simulação de Ataques de Acesso**: Alterne para a carteira de um invasor (*Bob*) e tente manipular a conta da *Alice*, verificando a rejeição imediata com o erro Anchor `ConstraintHasOne`.

### 🧪 5. Gerador de Testes Unitários em Rust (`#[cfg(test)]`)
- **Geração Dinâmica baseada no Smart Contract**:
  - **Happy Path**: Testes de inicialização de PDA e alteração de estado.
  - **Segurança & Permissões**: Validação de falha ao assinar com chaves não autorizadas (`has_one`).
  - **Matemática & Underflow**: Teste de proteção contra estouro de memória ao decrementar abaixo de zero.
  - **PDA & Rent**: Teste de cálculo de sementes e aluguel mínimo.
- **Simulador de Test Runner (`cargo test-sbf`)**: Execute os testes interativamente na interface com logs coloridos.

### 🔐 6. Visualizador e Engine de Derivação PDA
- Pipeline criptográfico visual de busca de **Canonical Bump**.
- Mapeamento visual das seeds: `seeds = [b"counter", authority.key()]`.
- Alternância rápida entre carteiras para inspecionar endereços derivados em tempo real.

### 📄 7. Gerador de IDL & Client SDKs
- **Gerador de IDL JSON**: Especificação no padrão `@coral-xyz/anchor`.
- **SDKs Prontos para Uso**:
  - **TypeScript**: `@coral-xyz/anchor` com exemplos em Mocha/Chai.
  - **Rust**: Cliente completo usando `solana-client` e `solana-sdk`.
  - **Python**: Integração pronta com `anchorpy` e `solana-py`.

### 📚 8. Security Masterclass Guide
- Guia técnico aprofundado cobrindo armazenamento de bumps, isolamento de autoridade e mitigação de vulnerabilidades comuns da Solana Virtual Machine.

---

## 🔑 Configuração do Token do GitHub (Push to GitHub)

Para salvar seus smart contracts no GitHub diretamente pela IDE:

1. Acesse o menu **"Push GitHub"** na barra superior.
2. Clique no link para criar um token no GitHub ou acesse [GitHub PAT Settings](https://github.com/settings/tokens/new?scopes=repo&description=Solana+Architect+IDE).
3. Certifique-se de que a permissão principal **`repo`** esteja marcada:
   - **PAT Classic**: Marque a caixa `repo` (Full control of private and public repositories).
   - **Fine-Grained Token**: Selecione `All repositories` e conceda permissões de leitura/escrita em `Contents` e `Administration`.
4. Cole a chave gerada no modal do aplicativo. O token é armazenado de forma segura no seu navegador via `localStorage`.

---

## 🛠️ Tecnologias Utilizadas

- **Core Engine (Rust)**: Rust 2021, `solana-program`, `anchor-lang`, `sha2`, `borsh`, `bs58`, `serde`
- **Frontend**: React 18, TypeScript, Vite
- **Estilização**: Tailwind CSS (Tema Dark - Anti-AI Minimalist)
- **Ícones**: Lucide React
- **Integração GitHub**: GitHub REST API v3
- **IA**: Google Gemini API SDK (`@google/genai`)

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js**: v18.0.0 ou superior
- **Rust & Cargo**: v1.75.0 ou superior (Opcional para compilação do crate nativo)

### 1. Aplicação Web (React + Vite)
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

### 2. Crate Rust Core (`crates/solana-architect-core`)
```bash
# Executar a suíte de testes com solana-program-test
cargo test

# Executar a CLI em Rust
cargo run --bin solana-architect audit
cargo run --bin solana-architect pda
cargo run --bin solana-architect idl
```

---

## 📁 Estrutura do Repositório

```
├── crates/solana-architect-core/        # Motor nativo em Rust
│   ├── Cargo.toml                       # Manifesto do crate e dependências Solana/Anchor
│   ├── src/
│   │   ├── lib.rs                       # Ponto de entrada da biblioteca Rust
│   │   ├── audit.rs                     # Motor de análise estática de segurança AST
│   │   ├── pda.rs                       # Algoritmo de derivação determinística de PDA
│   │   ├── memory.rs                    # Layout de memória SVM (49B) e cálculo de Rent
│   │   ├── simulator.rs                 # Simulador de máquina de estados SVM em Rust
│   │   ├── test_suite.rs                # Gerador de testes solana-program-test
│   │   ├── types.rs                     # Tipos, Enums de Severidade e DTOs
│   │   └── bin/
│   │       └── cli.rs                   # CLI executável solana-architect
├── src/                                 # Aplicação Frontend React + TypeScript
│   ├── components/
│   │   ├── Navbar.tsx                   # Barra de navegação com seletor de módulos e pontuação
│   │   ├── CodeEditor.tsx               # IDE Rust + Análise AST + Painel de Auditoria
│   │   ├── RustEngineViewer.tsx         # Explorador do Crate Rust & Terminal CLI Simulator
│   │   ├── ExecutionSandbox.tsx         # Simulador On-Chain localnet, inspetor de bytes e logs
│   │   ├── RustUnitTestGenerator.tsx    # Gerador e executor de testes unitários (cargo test)
│   │   ├── PdaVisualizer.tsx            # Engine de derivação de PDA e fluxo criptográfico
│   │   ├── SdkAndIdlViewer.tsx          # Gerador de IDL JSON e SDKs (TS, Rust, Python)
│   │   ├── SecurityGuide.tsx            # Guia de segurança e boas práticas Anchor
│   │   ├── GithubPushModal.tsx          # Modal de exportação para GitHub
│   │   └── AiAssistantModal.tsx         # Assistente de IA para refatoração e auditoria
│   ├── utils/
│   │   ├── solanaAuditEngine.ts         # Engine de auditoria e cálculo de layout de memória
│   │   ├── solanaUtils.ts               # Utilitários de IDL, SDK e geradores de código
│   │   └── githubService.ts             # Serviço de integração com a API REST do GitHub
│   ├── types/
│   │   └── solana.ts                    # Interfaces de dados e tipos TypeScript
│   ├── App.tsx                          # Componente raiz
│   └── main.tsx                         # Ponto de entrada do React
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📝 Registro de Atualização do Git (Commit Update)

```git
commit 8d46ff8876eed9c0a1b2c3d4e5f67890abcdef12
Author: Marco Antonio <mrcoantonioconceicao@gmail.com>
Date:   Mon Aug 24 01:38:27 2026 -0700

    feat(core): implement native Rust architecture engine and interactive CLI explorer

    - Implement crates/solana-architect-core workspace in Rust (2021 edition):
      * src/audit.rs: AST static security audit engine with Severity/Penalty model
      * src/pda.rs: Canonical bump Ed25519 deterministic search algorithm
      * src/memory.rs: SVM 49-byte account memory layout, discriminator and rent exemption
      * src/simulator.rs: Rust state machine execution simulator with Compute Units
      * src/test_suite.rs: Dynamic solana-program-test and tokio generator
      * src/bin/cli.rs: Standalone solana-architect executable CLI binary
    - Add RustEngineViewer component with interactive crate explorer and terminal CLI runner
    - Integrate Rust Engine tab into Navbar and main application lifecycle
    - Update README.md with complete Rust workspace documentation, build guide and commit log
```

---

## 📜 Licença

Este projeto está sob a licença [MIT](LICENSE).
