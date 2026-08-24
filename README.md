# Solana Architect & Anchor Security Studio

![Solana Anchor Security Auditor](https://img.shields.io/badge/Solana-Anchor%20v0.30-purple?style=for-the-badge&logo=solana)
![Rust](https://img.shields.io/badge/Rust-2021%20Edition-DEA584?style=for-the-badge&logo=rust)
![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?style=for-the-badge&logo=firebase)
![GitHub REST API](https://img.shields.io/badge/GitHub%20API-Integration-black?style=for-the-badge&logo=github)

O **Solana Architect** é uma IDE de engenharia de software e estúdio de auditoria de segurança estática AST nativa em **Rust** (`crates/solana-architect-core`), equipada com **Motor de Correção Automática (Auto-Fix Engine)** em 1 clique, simulador SVM de execução On-Chain localnet, gerador de testes unitários (`solana-program-test`), simulador de dry-run de deploy no Solana Devnet, e exportador de repositórios completos para o **GitHub**.

Projetado para desenvolvedores Web3, pesquisadores de segurança, auditores de smart contracts e engenheiros de protocolo inspecionarem restrições de contas, validarem a derivação criptográfica de PDAs (*Program Derived Addresses*), corrigirem vulnerabilidades automaticamente e implantarem programas seguros na Solana.

---

## 📸 Recursos Principais

### ⚡ 1. Motor de Correção Automática (Auto-Fix AST Engine)
- **Correção em 1 Clique (Single & Batch Auto-Fix)**:
  - **Injeção de Controle de Acesso**: Injeta automaticamente `has_one = authority` e validação de `seeds` nas structs de contexto mutáveis (`Increment`, `Decrement`, `Reset`).
  - **Bump Canônico**: Armazena e reutiliza `counter.bump = ctx.bumps.counter` e insere `pub bump: u8` na struct `UserCounter`.
  - **Alinhamento de Memória Exato (49 Bytes)**: Corrige definições de `space = 8 + 32 + 8 + 1` evitando falhas de `AccountDataTooSmall`.
  - **Aritmética Segura**: Substitui operadores aritméticos diretos (`+=`, `-=`) por `checked_add` e `checked_sub`, adicionando a macro `#[error_code]` com enums tipados.
  - **Encerramento de Conta**: Adiciona o handler e a struct `CloseAccount` com `close = authority` para reembolso integral de lamports de aluguel (*Rent Exemption*).
- **Banner de Diff & Logs de Auditoria**: Visualização das linhas alteradas no AST e delta de pontuação instantâneo (ex: 45/100 ➔ 100/100).

### 🦀 2. Rust Core Engine & CLI Standalone (`solana-architect-core`)
- **Motor 100% Nativo em Rust (Edição 2021)**:
  - `src/audit.rs`: Motor de auditoria estática com modelo de penalidades e funções `apply_auto_fix` / `apply_all_auto_fixes` nativas.
  - `src/pda.rs`: Algoritmo determinístico de derivação de PDA e busca de bump canônico (255..0) fora da curva elíptica Ed25519.
  - `src/memory.rs`: Layout de memória SVM para contas de 49 bytes com cálculo de discriminador Anchor (`SHA-256("account:UserCounter")[..8]`) e fórmula canônica de isenção de aluguel (*Rent Exemption*).
  - `src/simulator.rs`: Simulador de máquina de estados SVM com contabilidade de *Compute Units (CU)* e controle de acesso.
  - `src/test_suite.rs`: Gerador dinâmico de testes assíncronos em Rust com `solana-program-test` e `tokio`.
  - `src/bin/cli.rs`: CLI standalone executável (`solana-architect audit|pda|idl|tests`).
- **Aba Interativa "Rust Core Engine"**: Navegue na árvore de arquivos do crate Rust, copie ou baixe os módulos e execute comandos no terminal CLI simulado em tempo real.

### 🛠️ 3. Rust IDE Web & Auditoria AST Interativa
- **Editor de Código Rust com Syntax Highlighting**: Suporte a templates de contratos Anchor (`user_counter`, `token_vault`, `staking_pda`, `unsecure_counter`).
- **Análise AST em Tempo Real**: Mapeamento de `declare_id!`, handlers de instrução (`initialize`, `increment`, `decrement`, `reset`, `close`), e verificação de estruturas de conta.
- **Validador Sintático Pré-Auditoria**: Verificação de balanceamento de chaves, presença de imports de preludes e macros obrigatórias do Anchor.

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

### 📄 7. Gerador de IDL, SDKs & Devnet Deployment Dry-Run
- **Gerador de IDL JSON**: Especificação no padrão `@coral-xyz/anchor`.
- **SDKs Prontos para Uso**:
  - **TypeScript**: `@coral-xyz/anchor` com exemplos em Mocha/Chai.
  - **Rust**: Cliente completo usando `solana-client` e `solana-sdk`.
  - **Python**: Integração pronta com `anchorpy` e `solana-py`.
- **Simulador de Deploy no Devnet**: Dry-run do pipeline `BPF Loader Upgradeable` com estimativa de tamanho de ELF, taxas de rent e transações RPC simuladas.

### 📚 8. Guia Interativo de Segurança & Tour do Sistema
- **Guia Interativo de Segurança Anchor**:
  - Comparações visuais lado a lado (Antes vs Depois) de códigos vulneráveis e seguros.
  - Diagrama de alinhamento de 49 bytes e Calculadora de Rent Exemption dinâmica.
  - Tabela de referência rápida (Cheat Sheet) de macros Anchor v0.30 (`init`, `payer`, `space`, `seeds`, `bump`, `close`, `has_one`).
- **Tour Completo do Sistema (9 Etapas)**:
  - Navegação guiada passo a passo por todos os módulos com atalhos diretos e dicas de especialistas.

### 🐙 9. Exportação Direta para o GitHub ("Push to GitHub") & Cloud Firestore
- **Integração nativa com a REST API do GitHub**:
  - Suporte completo para repositórios **Públicos** e **Privados**.
  - Criação automática de **Novo Repositório** ou atualização de **Repositório Existente**.
  - **Pacote Workspace Anchor Completo**: Exporta estrutura pronta para produção com `programs/.../lib.rs`, `Anchor.toml`, `Cargo.toml`, `target/idl/*.json`, `client/index.ts` e `README.md` com selo de pontuação da auditoria.
- **Firebase Firestore & Auth**: Autenticação com Google e salvamento persistente de versões de projetos na nuvem.

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
- **Frontend**: React 18, TypeScript 5, Vite
- **Estilização**: Tailwind CSS (Tema Dark - Anti-AI Minimalist)
- **Ícones**: Lucide React
- **Nuvem & Auth**: Firebase Firestore e Firebase Authentication
- **Integração GitHub**: GitHub REST API v3
- **IA**: Google Gemini API SDK (`@google/genai`)

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js**: v18.0.0 ou superior
- **Rust & Cargo**: v1.75.0 ou superior (Para compilação nativa do crate)

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
├── crates/solana-architect-core/        # Motor nativo em Rust (2021 Edition)
│   ├── Cargo.toml                       # Manifesto do crate e dependências Solana/Anchor
│   ├── src/
│   │   ├── lib.rs                       # Ponto de entrada da biblioteca Rust
│   │   ├── audit.rs                     # Motor de auditoria estática AST e Auto-Fix nativo
│   │   ├── pda.rs                       # Algoritmo de derivação determinística de PDA
│   │   ├── memory.rs                    # Layout de memória SVM (49B) e cálculo de Rent
│   │   ├── simulator.rs                 # Simulador de máquina de estados SVM em Rust
│   │   ├── test_suite.rs                # Gerador de testes solana-program-test
│   │   ├── types.rs                     # Tipos, Enums de Severidade e DTOs de Auto-Fix
│   │   └── bin/
│   │       └── cli.rs                   # CLI executável solana-architect
├── src/                                 # Aplicação Frontend React + TypeScript
│   ├── components/
│   │   ├── Navbar.tsx                   # Barra de navegação com seletor de módulos e pontuação
│   │   ├── CodeEditor.tsx               # IDE Rust + Análise AST + Auto-Fix Engine + Auditoria
│   │   ├── RustEngineViewer.tsx         # Explorador do Crate Rust & Terminal CLI Simulator
│   │   ├── ExecutionSandbox.tsx         # Simulador On-Chain localnet, inspetor de bytes e logs
│   │   ├── RustUnitTestGenerator.tsx    # Gerador e executor de testes unitários (cargo test)
│   │   ├── PdaVisualizer.tsx            # Engine de derivação de PDA e fluxo criptográfico
│   │   ├── SdkAndIdlViewer.tsx          # Gerador de IDL JSON, SDKs e Devnet Dry-Run
│   │   ├── SecurityGuide.tsx            # Guia interativo de segurança e calculadora de Rent
│   │   ├── SystemTourModal.tsx          # Tour interativo guiado (9 etapas completas)
│   │   ├── GithubPushModal.tsx          # Modal de exportação para GitHub
│   │   ├── CloudProjectsModal.tsx       # Gerenciador de projetos Firebase Firestore
│   │   └── AiAssistantModal.tsx         # Assistente de IA para refatoração e auditoria
│   ├── utils/
│   │   ├── solanaAuditEngine.ts         # Engine de auditoria AST, Auto-Fix e validação sintática
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

## 📜 Licença

Este projeto está sob a licença [MIT](LICENSE).
