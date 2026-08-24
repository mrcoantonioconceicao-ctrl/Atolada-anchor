# Solana Architect & Anchor Security Studio

![Solana Anchor Security Auditor](https://img.shields.io/badge/Solana-Anchor%20v0.30.1-purple?style=for-the-badge&logo=solana)
![Rust](https://img.shields.io/badge/Rust-2021%20Edition-DEA584?style=for-the-badge&logo=rust)
![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?style=for-the-badge&logo=firebase)
![Scalability](https://img.shields.io/badge/Capacity-10%2C000%2B%20Clients-success?style=for-the-badge&logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

O **Solana Architect** é uma plataforma integrada de engenharia de software e auditoria estática AST para smart contracts da **Solana (Anchor v0.30)**. Equipada com um núcleo nativo em **Rust (`crates/solana-architect-core`)**, motor de **Correção Automática (Auto-Fix)** em 1 clique, simulador de máquina de estados SVM on-chain (localnet), gerador de testes unitários (`solana-program-test`), exportador de **Laudos Executivos em PDF**, e infraestrutura de alta concorrência otimizada para suportar **10.000+ clientes simultâneos**.

---

## 📑 Sumário

- [Visão Geral & Arquitetura](#-visão-geral--arquitetura)
- [Recursos Principais](#-recursos-principais)
  - [1. Motor de Correção Automática (Auto-Fix AST Engine)](#1-motor-de-correção-automática-auto-fix-ast-engine)
  - [2. Exportação de Relatório Executivo em PDF](#2-exportação-de-relatório-executivo-em-pdf)
  - [3. Rust Core Engine & CLI Standalone](#3-rust-core-engine--cli-standalone)
  - [4. IDE Web Rust & Análise Semântica AST](#4-ide-web-rust--análise-semântica-ast)
  - [5. Simulador SVM On-Chain & Testes de Ataque](#5-simulador-svm-on-chain--testes-de-ataque)
  - [6. Gerador de Testes Unitários em Rust](#6-gerador-de-testes-unitários-em-rust)
  - [7. Visualizador & Derivador Criptográfico de PDAs](#7-visualizador--derivador-criptográfico-de-pdas)
  - [8. Gerador de IDL, SDKs & Devnet Dry-Run](#8-gerador-de-idl-sdks--devnet-dry-run)
  - [9. Integração com GitHub & Nuvem Firestore](#9-integração-com-github--nuvem-firestore)
- [Arquitetura de Alta Concorrência (10.000 Clientes)](#-arquitetura-de-alta-concorrência-10000-clientes)
- [Layout de Memória Borsh (49 Bytes)](#-layout-de-memória-borsh-49-bytes)
- [Como Executar o Projeto](#-como-executar-o-projeto)
- [Endpoints da API & Probes](#-endpoints-da-api--probes)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Licença](#-licença)

---

## 🏛️ Visão Geral & Arquitetura

O ecossistema do Solana Architect é dividido em três camadas desacopladas e resilientes:

1. **Rust Core Engine (`crates/solana-architect-core`)**: Implementação 100% nativa em Rust (Edição 2021) do motor de auditoria semântica, cálculo de discriminadores Anchor (`SHA-256`), simulador de execução SVM e gerador de testes `solana-program-test`. Pode ser compilado nativamente via `cargo` ou consumido via CLI.
2. **Frontend React SPA (`src/`)**: Interface rica em TypeScript, Tailwind CSS e Lucide Icons, com espelhamento do AST em memória, editor de código com feedback em tempo real e geração de relatórios gráficos.
3. **Backend Express de Alta Concorrência (`server.ts`)**: Servidor com compressão Gzip/Brotli, rate-limiting por IP, endpoints de telemetria/health probes e proxy de IA do Google Gemini.

---

## ✨ Recursos Principais

### 1. Motor de Correção Automática (Auto-Fix AST Engine)
- **Correção em 1 Clique (Single & Batch Fixes)**:
  - **Injeção de Controle de Acesso**: Adiciona automaticamente `has_one = authority` e validação de `seeds` nas structs de contexto mutáveis (`Increment`, `Decrement`, `Reset`).
  - **Bump Canônico**: Armazena e reutiliza `counter.bump = ctx.bumps.counter` e insere `pub bump: u8` na struct `UserCounter`.
  - **Alinhamento de Memória (49 Bytes)**: Corrige a fórmula de alocação de espaço para `space = 8 + 32 + 8 + 1`, eliminando o erro `AccountDataTooSmall`.
  - **Aritmética Segura**: Substitui operadores aritméticos diretos (`+=`, `-=`) por `checked_add` e `checked_sub`, adicionando a macro `#[error_code]` com enums tipados (`ErrorCode::Overflow`, `ErrorCode::Underflow`).
  - **Encerramento de Conta com Reembolso de Rent**: Injeta a instrução `close_account` com a restrição `close = authority`.
- **Diff Visual & Logs de Transformação**: Rastreamento linha a linha das alterações aplicadas e recálculo instantâneo do Security Score (ex: 45/100 ➔ 100/100).

### 2. Exportação de Relatório Executivo em PDF
- **Geração Corporativa Dinâmica com `jspdf` & `jspdf-autotable`**:
  - **Cabeçalho Institucional**: Logotipo institucional, Program ID auditado, data/hora UTC e ID único do relatório (`AUD-SOL-XXXXXX`).
  - **Sumário Executivo & Status**: Badge visual de Security Score (0 a 100) e atestado de aprovação para produção na Mainnet-Beta/Devnet.
  - **Tabela AST de Mitigações**: Listagem categorizada com severidades (*Crítico, Alto, Médio, Baixo, Seguro*), diagnósticos semânticos e recomendações normativas Anchor.
  - **Trilha de Auto-Fix & Layout de Memória**: Mapeamento do alinhamento Borsh de 49 Bytes e histórico de patches aplicados.
  - **Assinatura Determinística**: Rodapé de conformidade com hash criptográfico simulado e numeração de páginas.

### 3. Rust Core Engine & CLI Standalone
- **Estrutura Modular do Crate (`crates/solana-architect-core`)**:
  - `src/audit.rs`: Motor de auditoria estática e funções `apply_auto_fix` / `apply_all_auto_fixes`.
  - `src/pda.rs`: Algoritmo de derivação determinística e busca de canonical bump (255..0).
  - `src/memory.rs`: Layout de memória Borsh e cálculo de isenção de aluguel (*Rent Exemption*).
  - `src/simulator.rs`: Simulador de máquina de estados SVM com contabilidade de Compute Units (CU).
  - `src/test_suite.rs`: Gerador dinâmico de testes assíncronos com `tokio` e `solana-program-test`.
  - `src/bin/cli.rs`: Linha de comando standalone (`solana-architect audit|pda|idl|tests`).
- **Terminal CLI Integrado**: Aba dedicada para explorar o código-fonte em Rust e simular comandos CLI em tempo real.

### 4. IDE Web Rust & Análise Semântica AST
- Editor completo com syntax highlighting para Rust/Anchor.
- Templates integrados para contratos corporativos (`user_counter`, `token_vault`, `staking_pda`, `unsecure_counter`).
- Validador sintático com detecção de chaves desbalanceadas e macros ausentes antes da auditoria.

### 5. Simulador SVM On-Chain & Testes de Ataque
- Execução localnet das instruções `initialize`, `increment`, `decrement`, `reset` e `close`.
- **Inspetor de Memória de 49 Bytes**: Visualização byte a byte no ledger.
- **Simulação de Ataques**: Teste de falsificação de assinatura (*Bob tentando alterar a conta da Alice*) e verificação do disparo do erro Anchor `ConstraintHasOne`.

### 6. Gerador de Testes Unitários em Rust
- Geração automática de suítes de teste assíncronas com `solana-program-test`:
  - Happy Path (criação e mutação de estado).
  - Testes de Invasão & Controle de Acesso (`has_one`).
  - Testes de Limite Aritmético (Underflow/Overflow).
  - Testes de Validação de Rent e Sementes de PDA.
- Test runner interativo com visualização de logs coloridos do `cargo test-sbf`.

### 7. Visualizador & Derivador Criptográfico de PDAs
- Pipeline interativo de busca de Bump Canônico fora da curva Ed25519.
- Mapeamento das sementes: `seeds = [b"counter", authority.key()]`.
- Alternância instantânea de carteiras para validação de endereços derivados.

### 8. Gerador de IDL, SDKs & Devnet Dry-Run
- **IDL JSON**: Conformidade estrita com o padrão `@coral-xyz/anchor`.
- **Clientes SDK Prontos**:
  - **TypeScript**: Cliente `@coral-xyz/anchor` com exemplos em Mocha/Chai.
  - **Rust**: Cliente completo com `solana-client` e `solana-sdk`.
  - **Python**: Integração com `anchorpy` e `solana-py`.
- **Simulador de Deploy no Devnet**: Dry-run do pipeline `BPF Loader Upgradeable` com estimativa de ELF, taxas de rent e transações RPC simuladas.

### 9. Integração com GitHub & Nuvem Firestore
- **Push to GitHub Nativo**:
  - Exportação direta de repositórios **Públicos** e **Privados** via GitHub REST API v3.
  - Geração de workspace completo com `programs/`, `Anchor.toml`, `Cargo.toml`, `target/idl/`, `client/` e `README.md` com badge de pontuação.
- **Firebase Firestore & Google Auth**:
  - Autenticação sem atritos com controle de concorrência.
  - Armazenamento em nuvem de versões de contratos e histórico de auditorias.

---

## ⚡ Arquitetura de Alta Concorrência (10.000 Clientes)

O sistema foi blindado para operar com alta estabilidade sob tráfego massivo:

| Camada | Tecnologia / Estratégia | Benefício |
|---|---|---|
| **Rede & Servidor** | `compression` (Gzip/Brotli) | Redução de até **75% no payload** de rede |
| **Proteção DDoS** | `express-rate-limit` | Rate-limiting de 1500 req/15min por IP e 40 req/min para IA |
| **RPC Load Balancer** | `SolanaRpcPool` + Circuit Breaker | Failover automático entre Solana Foundation, Ankr e Alchemy |
| **Cache de Resposta RPC** | TTL em Memória (10s) | Elimina chamadas redundantes de rent e discriminadores |
| **Banco de Dados** | In-Memory Debouncing & `limit(50)` | Previne colisões e excesso de quota de escrita no Firestore |
| **Motor AST** | LRU Memoization Cache (500 slots) | Auditoria e derivação de PDA instantâneas em **< 1ms** |
| **Frontend Bundle** | Vite Vendor Chunking | Separação de pacotes para cache agressivo de longa duração no CDN/browser |
| **Observabilidade** | `/api/health` & `/api/metrics` | Probes para Kubernetes HPA e Cloud Run Auto-scaling |

---

## 💾 Layout de Memória Borsh (49 Bytes)

| Offset (Bytes) | Tamanho | Campo | Tipo Rust | Descrição |
|---|---|---|---|---|
| `0..8` | 8 Bytes | `discriminator` | `[u8; 8]` | `SHA-256("account:UserCounter")[..8]` |
| `8..40` | 32 Bytes | `authority` | `Pubkey` | Chave pública da autoridade proprietária |
| `40..48` | 8 Bytes | `count` | `u64` | Valor do contador serializado em Little-Endian |
| `48..49` | 1 Byte | `bump` | `u8` | Canonical Bump (255..0) fora da curva Ed25519 |
| **Total** | **49 Bytes** | — | — | **Isenção Mínima de Rent: ~0.00123888 SOL** |

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- **Node.js**: v18.0.0 ou superior
- **Rust & Cargo**: v1.75.0 ou superior

### 1. Servidor Backend & Frontend (Full-Stack)
```bash
# Instalar dependências do projeto
npm install

# Iniciar servidor Node.js (Porta 3001) e Vite Dev Server (Porta 3000)
npm run dev

# Para compilar a build otimizada de produção
npm run build
npm start
```
Acesse a aplicação em: `http://localhost:3000`

### 2. Crate Rust Core (`crates/solana-architect-core`)
```bash
# Navegar até o crate Rust
cd crates/solana-architect-core

# Executar a suíte de testes unitários e de integração
cargo test

# Executar a ferramenta CLI standalone
cargo run --bin solana-architect audit
cargo run --bin solana-architect pda
cargo run --bin solana-architect idl
```

---

## 📡 Endpoints da API & Probes

- **`GET /api/health`**: Probe de saúde com uso de memória RAM (Heap/RSS), uptime e status operacional.
- **`GET /api/metrics`**: Métricas de capacidade e versão do motor de auditoria.
- **`POST /api/gemini`**: Proxy seguro com rate-limiting para assistência e refatoração de código com IA.

---

## 📁 Estrutura de Pastas

```
├── crates/solana-architect-core/        # Motor Nativo em Rust (2021 Edition)
│   ├── Cargo.toml                       # Manifesto do crate e dependências Solana/Anchor
│   ├── src/
│   │   ├── lib.rs                       # Ponto de entrada da biblioteca Rust
│   │   ├── audit.rs                     # Auditoria estática AST e Auto-Fix nativo em Rust
│   │   ├── pda.rs                       # Algoritmo de derivação determinística de PDA
│   │   ├── memory.rs                    # Layout de memória SVM (49B) e cálculo de Rent
│   │   ├── simulator.rs                 # Simulador de máquina de estados SVM
│   │   ├── test_suite.rs                # Gerador de testes assíncronos solana-program-test
│   │   ├── types.rs                     # DTOs, Enums de severidade e tipos de patches
│   │   └── bin/
│   │       └── cli.rs                   # CLI executável solana-architect
├── src/                                 # Aplicação Frontend React + TypeScript
│   ├── components/
│   │   ├── Navbar.tsx                   # Barra superior com score e seletores de módulo
│   │   ├── CodeEditor.tsx               # IDE Rust + Análise AST + Auto-Fix + Ações de Auditoria
│   │   ├── ExportPdfButton.tsx          # Botão e acionador do relatório executivo em PDF
│   │   ├── RustEngineViewer.tsx         # Explorador do Crate Rust & Terminal CLI Simulator
│   │   ├── ExecutionSandbox.tsx         # Simulador On-Chain localnet, inspetor de bytes e logs
│   │   ├── RustUnitTestGenerator.tsx    # Gerador e executor interativo de testes unitários
│   │   ├── PdaVisualizer.tsx            # Engine de derivação de PDA e fluxo criptográfico
│   │   ├── SdkAndIdlViewer.tsx          # Gerador de IDL JSON, SDKs e Devnet Dry-Run
│   │   ├── SecurityGuide.tsx            # Guia de segurança e calculadora de Rent
│   │   ├── SystemTourModal.tsx          # Tour interativo guiado (9 etapas)
│   │   ├── GithubPushModal.tsx          # Modal de exportação para GitHub
│   │   ├── CloudProjectsModal.tsx       # Gerenciador de projetos Firebase Firestore
│   │   └── AiAssistantModal.tsx         # Assistente de IA para refatoração e auditoria
│   ├── context/
│   │   └── AuthContext.tsx              # Contexto de autenticação e projetos na nuvem
│   ├── utils/
│   │   ├── pdfReportGenerator.ts        # Gerador do Relatório Executivo em PDF (jsPDF)
│   │   ├── solanaRpcPool.ts             # Pool RPC multi-cluster com Failover & Circuit Breaker
│   │   ├── solanaAuditEngine.ts         # Engine de auditoria AST e Auto-Fix
│   │   ├── solanaUtils.ts               # Utilitários de IDL, SDKs e cache LRU
│   │   └── githubService.ts             # Integração com GitHub REST API
│   ├── types/
│   │   └── solana.ts                    # Interfaces de dados e tipos TypeScript
│   ├── firebase.ts                      # Configuração e serviços otimizados do Firebase
│   ├── App.tsx                          # Componente raiz da aplicação
│   └── main.tsx                         # Ponto de entrada do React
├── server.ts                            # Servidor Express de Alta Concorrência (10k ready)
├── firestore.rules                      # Regras de segurança RBAC do Firestore
├── vite.config.ts                       # Configuração do Vite com Vendor Chunking
├── package.json                         # Dependências e scripts do projeto
├── Cargo.toml                           # Workspace Cargo da raiz
└── README.md                            # Documentação técnica detalhada
```

---

## 📜 Licença

Este projeto está distribuído sob a licença [MIT](LICENSE).
