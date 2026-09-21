# Solana Architect & Anchor Security Studio

![Solana Anchor Security Auditor](https://img.shields.io/badge/Solana-Anchor%20v0.30.0+-purple?style=for-the-badge&logo=solana)
![Trilingual](https://img.shields.io/badge/Languages-PT%20|%20EN%20|%20ES-58a6ff?style=for-the-badge)
![Junior & Advanced Modes](https://img.shields.io/badge/UX-Dual%20Mode%20DX-7ee787?style=for-the-badge)
![Rust](https://img.shields.io/badge/Rust-2021%20Edition-DEA584?style=for-the-badge&logo=rust)
![DevSecOps](https://img.shields.io/badge/DevSecOps-Automated%20CI%2FCD-00C853?style=for-the-badge&logo=githubactions)
![React](https://img.shields.io/badge/React-19.x-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)

O **Solana Architect** é uma plataforma integrada de engenharia de software, auditoria estática AST e automação DevSecOps para smart contracts da **Solana (Anchor v0.30.0+)**. Equipada com um núcleo nativo em **Rust (`crates/solana-architect-core`)**, suporte **Trilíngue (PT, EN, ES)**, sistema de **Modos Duplos (Júnior / Guiado vs Engenheiro / Avançado)**, motor de **Correção Automática (Auto-Fix)** em 1 clique, **Tradutor Amigável de Erros da Solana**, automação de **Pull Requests no GitHub com Laudo de Segurança**, esteira de **CI/CD em GitHub Actions**, simulador de máquina de estados SVM on-chain (localnet), gerador de testes unitários (`solana-program-test`), e exportação de **Laudos Executivos em PDF**.

---

## 🌟 Principais Recursos & Inovações DX/DevSecOps

### 🌍 1. Suporte Trilíngue Global (PT-BR, EN-US, ES)
- Seletor de idioma integrado com salvamento automático no `localStorage`.
- Interface, laudos, dicas de segurança e wizards totalmente traduzidos em **Português**, **Inglês** e **Espanhol**.

### 🎓 2. Sistema de Modos Duplos (Júnior vs. Engenheiro Avançado)
- **Modo Júnior (Guiado)**: Ativa assistentes visuais passo a passo (`JuniorEducationalWizard`), dicas interativas sobre PDAs, `has_one` e rent exemption, com linguagem acessível e foco em aprendizado.
- **Modo Avançado (Engenheiro Sênior)**: Libera acesso completo a layouts de memória de 49 bytes, inspeção raw de registradores BPF, discriminadores Anchor e geradores de cliente TypeScript.

### 🔎 3. Tradutor Amigável de Erros da Solana (`ErrorTranslatorModal`)
- Decodifica erros crípticos do Anchor e SVM (ex: `ConstraintHasOne`, `0x7d1`, `AccountNotInitialized`, erros de `Base58`, `Overflow/Underflow`).
- Apresenta explicação clara da causa raiz em linguagem humana com sugestões práticas e botão de **"Aplicar Correção em 1-Clique"**.

### 🛡️ 4. As 6 Regras Canônicas de Auditoria Estática AST
O motor de auditoria AST valida obrigatoriamente 6 regras de segurança fundamentais antes de autorizar a implantação:

1. **Validação do Program ID**: Declaração explícita e válida do `declare_id!("...")` sincronizado com o cluster de destino.
2. **Bump Canônico e Seeds Determinísticas**: Validação de sementes determinísticas e persistência do bump no estado da conta (`counter.bump = ctx.bumps.counter`) durante a inicialização, evitando *account collisions* e economizando ~1.500 CUs.
3. **Validação de Assinatura Ed25519**: Obrigatoriedade do tipo `Signer<'info>` em contas pagadoras e autoridades mutáveis.
4. **Vínculo de Proprietário (Owner Constraint)**: Aplicação da restrição `#[account(has_one = authority)]` para impedir mutações não autorizadas.
5. **Alinhamento Exato de Memória**: Cálculo rigoroso de espaço (`space = 8 + 32 + 8 + 1`), considerando 8 bytes do discriminador Anchor, tipos Borsh e 1 byte para o bump.
6. **Aritmética Segura (Safe Math)**: Substituição de operações aritméticas diretas (`+`, `-`, `*`) por métodos checados contra overflow/underflow (`checked_add`, `checked_sub`).

---

## 📑 Sumário

- [Visão Geral & Arquitetura](#-visão-geral--arquitetura)
- [Recursos DevSecOps & Automação GitHub](#-recursos-devsecops--automação-github)
  - [1. Automação de Pull Request com Laudo de Auditoria](#1-automação-de-pull-request-com-laudo-de-auditoria)
  - [2. Esteira Dinâmica de CI/CD (GitHub Actions)](#2-esteira-dinâmica-de-cicd-github-actions)
  - [3. Motor de Correção Automática (Auto-Fix AST Engine)](#3-motor-de-correção-automática-auto-fix-ast-engine)
  - [4. Relatório Executivo em PDF & Laudo Técnico](#4-relatório-executivo-em-pdf--laudo-técnico)
  - [5. Rust Core Engine & CLI Standalone](#5-rust-core-engine--cli-standalone)
  - [6. Simulador SVM On-Chain & Inspeção de Memória (49 Bytes)](#6-simulador-svm-on-chain--inspeção-de-memória-49-bytes)
- [Layout de Memória Borsh (49 Bytes)](#-layout-de-memória-borsh-49-bytes)
- [Como Executar o Projeto](#-como-executar-o-projeto)
- [Licença](#-licença)

---

## 🚀 Recursos DevSecOps & Automação GitHub

### 1. Automação de Pull Request com Laudo de Auditoria
- **Abertura Automática de PR**: Cria uma branch isolada (`solana-architect-pr-XXXXXX`) e abre o PR formal no GitHub.
- **Laudo Executivo Injetado no PR**: O corpo do Pull Request inclui o resumo do Security Score, matriz de conformidade das 6 regras de segurança e contagem de vulnerabilidades.

### 2. Esteira Dinâmica de CI/CD (GitHub Actions)
Todo repositório exportado inclui o arquivo `.github/workflows/anchor-ci-cd.yml` operando em duas rotas:
- **Rota PR (`pull_request`)**: Executa análise de formatação (`cargo fmt`), compilação isolada (`anchor build`) e suíte de testes unitários (`anchor test`).
- **Rota Merge (`push` em `main`)**: Dispara a implantação automática no cluster de destino (Devnet/Mainnet) via Anchor CLI.

### 3. Motor de Correção Automática (Auto-Fix AST Engine)
- Correção instantânea com 1 clique para injeção de controle de acesso (`has_one`), bump canônico, cálculo de memória de 49 bytes e métodos de aritmética segura (`checked_add`).

---

## 💾 Layout de Memória Borsh (49 Bytes)

| Offset (Bytes) | Tamanho | Campo | Tipo Rust | Descrição |
|---|---|---|---|---|
| `0..8` | 8 Bytes | `discriminator` | `[u8; 8]` | `SHA-256("account:CounterAccount")[..8]` |
| `8..40` | 32 Bytes | `authority` | `Pubkey` | Chave pública da autoridade proprietária |
| `40..48` | 8 Bytes | `count` | `u64` | Valor do contador em Little-Endian |
| `48..49` | 1 Byte | `bump` | `u8` | Canonical Bump (255..0) |
| **Total** | **49 Bytes** | — | — | **Isenção Mínima de Rent: ~0.00123888 SOL** |

---

## 🚀 Como Executar o Projeto

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Executar linter e testes de build
npm run lint
npm run build
```

---

## 📜 Licença

Este projeto está distribuído sob a licença [MIT](LICENSE).
